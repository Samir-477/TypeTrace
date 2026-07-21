from __future__ import annotations

import argparse
import json
import math
import os
import re
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F


FEATURE_COLS = [
    "H", "UD", "DD", "UU", "speed", "acceleration", "jerk", "norm_H", "pause", "is_backspace",
    "ud_ratio", "h_ratio", "digraph_DD", "digraph_UU", "rhythm_var", "key_cat", "consec_same",
    "hold_norm_prev", "flight_balance", "trigraph_flight", "overlap", "hold_speed_ratio",
    "inter_session_norm", "bigram_h_sum", "modifier_context",
]
LOG_COLS = ["H", "UD", "DD", "UU", "digraph_DD", "digraph_UU", "trigraph_flight", "bigram_h_sum"]
SEQ_LEN = 64
STRIDE = 16
NUM_KEY_BUCKETS = 128


def preprocess_frame(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    keys = np.clip(df["key_pair_id"].to_numpy(dtype=np.int64), 0, NUM_KEY_BUCKETS - 1)
    cont = df[FEATURE_COLS].copy().replace([np.inf, -np.inf], np.nan).clip(-1e6, 1e6)
    for col in LOG_COLS:
        values = cont[col].to_numpy(dtype=np.float64)
        cont[col] = np.log1p(np.abs(values)) * np.sign(values)
    cont = cont.clip(-50, 50).fillna(0)
    return cont.to_numpy(dtype=np.float32), keys


def window_weights(length: int) -> np.ndarray:
    weights = np.zeros(length + 1, dtype=np.int64)
    for start in range(0, length - SEQ_LEN + 1, STRIDE):
        weights[start] += 1
        weights[start + SEQ_LEN] -= 1
    return np.cumsum(weights[:-1])


def reconstruct_scaler(files: list[Path]) -> tuple[np.ndarray, np.ndarray, int]:
    total_weight = 0
    weighted_sum = np.zeros(len(FEATURE_COLS), dtype=np.float64)
    weighted_sq = np.zeros(len(FEATURE_COLS), dtype=np.float64)
    for file in files:
        cont, _ = preprocess_frame(pd.read_csv(file))
        train_end = int(len(cont) * .70)
        train = cont[:train_end].astype(np.float64)
        weights = window_weights(len(train)).astype(np.float64)
        total_weight += int(weights.sum())
        weighted_sum += (train * weights[:, None]).sum(axis=0, dtype=np.float64)
        weighted_sq += (train * train * weights[:, None]).sum(axis=0, dtype=np.float64)
    mean = weighted_sum / total_weight
    variance = np.maximum(weighted_sq / total_weight - mean * mean, 0)
    scale = np.sqrt(variance)
    scale[scale == 0] = 1.0
    return mean, scale, total_weight


class DropPath(nn.Module):
    def __init__(self, p: float = 0.0):
        super().__init__()
        self.p = p

    def forward(self, x):
        return x


class TCNBlock(nn.Module):
    def __init__(self, channels: int, kernel: int = 3, dilation: int = 1, dropout: float = .1):
        super().__init__()
        pad = (kernel - 1) * dilation
        self.net = nn.Sequential(
            nn.Conv1d(channels, channels, kernel, dilation=dilation, padding=pad, groups=channels),
            nn.Conv1d(channels, channels, 1), nn.BatchNorm1d(channels), nn.GELU(), nn.Dropout(dropout),
        )

    def forward(self, x):
        h = self.net(x)
        return h[:, :, :x.size(2)] + x


class TCNStem(nn.Module):
    def __init__(self, in_feat: int, d_model: int, n_key_buckets: int, dropout: float = .1):
        super().__init__()
        self.input_proj = nn.Sequential(nn.Linear(in_feat, d_model), nn.LayerNorm(d_model))
        self.key_pair_embed = nn.Embedding(n_key_buckets, d_model)
        self.tcn = nn.Sequential(
            TCNBlock(d_model, dilation=1, dropout=dropout),
            TCNBlock(d_model, dilation=2, dropout=dropout),
            TCNBlock(d_model, dilation=4, dropout=dropout),
        )
        self.norm = nn.LayerNorm(d_model)

    def forward(self, x_cont, x_key):
        h = self.input_proj(x_cont) + self.key_pair_embed(x_key)
        return self.norm(self.tcn(h.transpose(1, 2)).transpose(1, 2))


class Backbone(nn.Module):
    def __init__(self):
        super().__init__()
        d_model = 192
        self.stem = TCNStem(25, d_model, 128, dropout=.2)
        self.cls_token = nn.Parameter(torch.zeros(1, 1, d_model))
        self.pos_embed = nn.Embedding(513, d_model)
        self.drop = nn.Dropout(.2)
        self.layers = nn.ModuleList([
            nn.TransformerEncoderLayer(d_model, 8, 768, .2, batch_first=True, norm_first=True, activation="gelu")
            for _ in range(6)
        ])
        self.dp = nn.ModuleList([DropPath(float(value)) for value in torch.linspace(0, .1, 6)])
        self.norm = nn.LayerNorm(d_model)

    def forward(self, x_cont, x_key):
        batch, length, _ = x_cont.shape
        h = self.stem(x_cont, x_key)
        h = torch.cat([self.cls_token.expand(batch, -1, -1), h], dim=1)
        positions = torch.arange(length + 1, device=h.device).unsqueeze(0)
        h = self.drop(h + self.pos_embed(positions))
        for layer, drop_path in zip(self.layers, self.dp):
            h = h + drop_path(layer(h) - h)
        h = self.norm(h)
        return h[:, 0], h[:, 1:]


class GatedPooling(nn.Module):
    def __init__(self):
        super().__init__()
        self.attn = nn.Sequential(nn.Linear(192, 64), nn.Tanh(), nn.Linear(64, 1))
        self.gate = nn.Sequential(nn.Linear(576, 3), nn.Softmax(dim=-1))
        self.proj = nn.Linear(192, 192)

    def forward(self, cls_out, seq_out):
        mean_out = seq_out.mean(dim=1)
        attention = torch.softmax(self.attn(seq_out), dim=1)
        attention_out = (seq_out * attention).sum(dim=1)
        gates = self.gate(torch.cat([cls_out, mean_out, attention_out], dim=1)).unsqueeze(-1)
        pooled = (gates * torch.stack([cls_out, mean_out, attention_out], dim=1)).sum(dim=1)
        return self.proj(pooled)


class KeyFormerV4(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = Backbone()
        self.pool = GatedPooling()
        self.arcface = nn.Module()
        self.arcface.weight = nn.Parameter(torch.empty(148, 192))

    def forward(self, x_cont, x_key):
        cls_out, seq_out = self.backbone(x_cont, x_key)
        pooled = self.pool(cls_out, seq_out)
        embedding = F.normalize(pooled, dim=1)
        weights = F.normalize(self.arcface.weight, dim=1)
        logits = embedding @ weights.t() * 30.0
        return logits, embedding


def test_windows(cont: np.ndarray, keys: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    test_start = int(len(cont) * .80)
    test_cont, test_keys = cont[test_start:], keys[test_start:]
    starts = range(0, len(test_cont) - SEQ_LEN + 1, STRIDE)
    return np.stack([test_cont[s:s + SEQ_LEN] for s in starts]), np.stack([test_keys[s:s + SEQ_LEN] for s in starts])


def evaluate(model: KeyFormerV4, files: list[Path], mean: np.ndarray, scale: np.ndarray, output: Path):
    users = []
    total_windows = 0
    correct_windows = 0
    correct_users = 0
    with torch.inference_mode():
        for label, file in enumerate(files):
            cont, keys = preprocess_frame(pd.read_csv(file))
            windows, key_windows = test_windows(cont, keys)
            probabilities = []
            predictions = []
            embeddings = []
            for start in range(0, len(windows), 128):
                batch = ((windows[start:start + 128] - mean) / scale).astype(np.float32)
                x_cont = torch.from_numpy(batch)
                x_key = torch.from_numpy(key_windows[start:start + 128].astype(np.int64))
                logits, embedding = model(x_cont, x_key)
                probabilities.append(torch.softmax(logits, dim=1).cpu().numpy())
                predictions.append(logits.argmax(dim=1).cpu().numpy())
                embeddings.append(embedding.cpu().numpy())
            probs = np.concatenate(probabilities)
            preds = np.concatenate(predictions)
            emb = np.concatenate(embeddings)
            total_windows += len(preds)
            correct_windows += int((preds == label).sum())
            aggregate = probs.sum(axis=0)
            aggregate /= aggregate.sum()
            predicted = int(aggregate.argmax())
            correct_users += int(predicted == label)
            top = aggregate.argsort()[-5:][::-1]
            users.append({
                "id": file.stem[-3:], "predicted": f"{predicted + 1:03d}", "correct": predicted == label,
                "confidence": float(aggregate[predicted]), "windows": int(len(preds)),
                "windowAccuracy": float((preds == label).mean()),
                "top5": [{"id": f"{int(index) + 1:03d}", "probability": float(aggregate[index])} for index in top],
                "embeddingPreview": [float(value) for value in emb.mean(axis=0)[:12]],
            })
            print(f"[{label + 1:03d}/148] user {file.stem[-3:]} -> {predicted + 1:03d} ({aggregate[predicted]:.2%})")
    payload = {
        "windowAccuracy": correct_windows / total_windows,
        "userAccuracy": correct_users / len(files),
        "totalWindows": total_windows,
        "users": users,
    }
    output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf8")
    print(f"Window accuracy: {payload['windowAccuracy']:.4f}")
    print(f"User accuracy: {payload['userAccuracy']:.4f}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--public", type=Path, required=True)
    args = parser.parse_args()
    files = sorted(args.data.glob("user_*.csv"))
    if len(files) != 148:
        raise RuntimeError(f"Expected 148 processed users, found {len(files)}")
    model_dir = args.public / "model"
    data_dir = args.public / "data"
    model_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    print("Reconstructing StandardScaler from overlapping training windows...")
    mean, scale, samples = reconstruct_scaler(files)
    scaler = {"features": FEATURE_COLS, "mean": mean.tolist(), "scale": scale.tolist(), "weightedSamples": samples}
    (model_dir / "scaler.json").write_text(json.dumps(scaler, separators=(",", ":")), encoding="utf8")

    model = KeyFormerV4().eval()
    state = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    model.load_state_dict(state, strict=True)
    print("Checkpoint loaded strictly.")

    evaluate(model, files, mean, scale, data_dir / "model-results.json")

    dummy_cont = torch.zeros(1, SEQ_LEN, len(FEATURE_COLS), dtype=torch.float32)
    dummy_key = torch.zeros(1, SEQ_LEN, dtype=torch.int64)
    onnx_path = model_dir / "keyformer-v4.onnx"
    torch.onnx.export(
        model, (dummy_cont, dummy_key), onnx_path,
        input_names=["continuous", "key_pair"], output_names=["logits", "embedding"],
        dynamic_axes={"continuous": {0: "batch"}, "key_pair": {0: "batch"}, "logits": {0: "batch"}, "embedding": {0: "batch"}},
        opset_version=17, do_constant_folding=True,
    )
    print(f"Exported {onnx_path} ({onnx_path.stat().st_size / 1_000_000:.2f} MB)")


if __name__ == "__main__":
    main()
