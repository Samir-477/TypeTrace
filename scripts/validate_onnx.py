from pathlib import Path

import numpy as np
import onnxruntime as ort
import pandas as pd
import torch

from export_keyformer import KeyFormerV4, preprocess_frame, test_windows


root = Path(__file__).resolve().parents[2]
public = root / "keyformer-story" / "public"
checkpoint = root / "best_keyformer_v4.pt"
data = root / "Processed_Sequences_v4" / "user_001.csv"

scaler = pd.read_json(public / "model" / "scaler.json", typ="series")
mean = np.asarray(scaler["mean"], dtype=np.float64)
scale = np.asarray(scaler["scale"], dtype=np.float64)
cont, keys = preprocess_frame(pd.read_csv(data))
windows, key_windows = test_windows(cont, keys)
x_cont = ((windows[:3] - mean) / scale).astype(np.float32)
x_key = key_windows[:3].astype(np.int64)

model = KeyFormerV4().eval()
model.load_state_dict(torch.load(checkpoint, map_location="cpu", weights_only=True), strict=True)
with torch.inference_mode():
    torch_logits, torch_embedding = model(torch.from_numpy(x_cont), torch.from_numpy(x_key))

session = ort.InferenceSession(str(public / "model" / "keyformer-v4.onnx"), providers=["CPUExecutionProvider"])
onnx_logits, onnx_embedding = session.run(None, {"continuous": x_cont, "key_pair": x_key})
print("LOGIT_MAX_ABS_DIFF", float(np.max(np.abs(torch_logits.numpy() - onnx_logits))))
print("EMBED_MAX_ABS_DIFF", float(np.max(np.abs(torch_embedding.numpy() - onnx_embedding))))
print("PYTORCH_PREDS", torch_logits.argmax(dim=1).numpy().tolist())
print("ONNX_PREDS", onnx_logits.argmax(axis=1).tolist())
