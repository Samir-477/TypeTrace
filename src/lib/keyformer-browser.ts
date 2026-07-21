"use client";

import type * as Ort from "onnxruntime-web/wasm";

export const FEATURE_NAMES = [
  "H","UD","DD","UU","speed","acceleration","jerk","norm_H","pause","is_backspace",
  "ud_ratio","h_ratio","digraph_DD","digraph_UU","rhythm_var","key_cat","consec_same",
  "hold_norm_prev","flight_balance","trigraph_flight","overlap","hold_speed_ratio",
  "inter_session_norm","bigram_h_sum","modifier_context",
] as const;

const LOG_FEATURES = new Set(["H","UD","DD","UU","digraph_DD","digraph_UU","trigraph_flight","bigram_h_sum"]);
type Runtime = { ort: typeof Ort; session: Ort.InferenceSession; mean: number[]; scale: number[] };
let runtimePromise: Promise<Runtime> | null = null;

async function loadRuntime(): Promise<Runtime> {
  if (runtimePromise) return runtimePromise;
  runtimePromise = (async () => {
    const ort = await import("onnxruntime-web/wasm");
    ort.env.wasm.wasmPaths = "/ort/";
    ort.env.wasm.numThreads = 1;
    const [session, scaler] = await Promise.all([
      ort.InferenceSession.create("/model/keyformer-v4.onnx", { executionProviders: ["wasm"] }),
      fetch("/model/scaler.json").then((response) => response.json() as Promise<{ mean: number[]; scale: number[] }>),
    ]);
    return { ort, session, mean: scaler.mean, scale: scaler.scale };
  })();
  return runtimePromise;
}

function softmax(values: Float32Array | number[]) {
  const max = Math.max(...values);
  const exp = Array.from(values, (value) => Math.exp(value - max));
  const total = exp.reduce((sum, value) => sum + value, 0);
  return exp.map((value) => value / total);
}

export async function inferKeyformer(rawWindow: number[][], keyPairs: number[]) {
  if (rawWindow.length !== 64 || rawWindow.some((row) => row.length !== 25) || keyPairs.length !== 64) {
    throw new Error("TypeTrace requires exactly 64 rows × 25 features and 64 key-pair IDs.");
  }
  const { ort, session, mean, scale } = await loadRuntime();
  const normalized = new Float32Array(64 * 25);
  rawWindow.forEach((row, rowIndex) => row.forEach((raw, featureIndex) => {
    let value = Number.isFinite(raw) ? Math.max(-1e6, Math.min(1e6, raw)) : 0;
    if (LOG_FEATURES.has(FEATURE_NAMES[featureIndex])) value = Math.sign(value) * Math.log1p(Math.abs(value));
    value = Math.max(-50, Math.min(50, value));
    normalized[rowIndex * 25 + featureIndex] = (value - mean[featureIndex]) / scale[featureIndex];
  }));
  const keys = new BigInt64Array(keyPairs.map((value) => BigInt(Math.max(0, Math.min(127, Math.trunc(value))))));
  const outputs = await session.run({
    continuous: new ort.Tensor("float32", normalized, [1, 64, 25]),
    key_pair: new ort.Tensor("int64", keys, [1, 64]),
  });
  const logits = outputs.logits.data as Float32Array;
  const probabilities = softmax(logits);
  const top5 = probabilities.map((probability, index) => ({ id: String(index + 1).padStart(3, "0"), probability }))
    .sort((a, b) => b.probability - a.probability).slice(0, 5);
  return {
    predicted: top5[0].id,
    confidence: top5[0].probability,
    top5,
    embedding: Array.from(outputs.embedding.data as Float32Array),
  };
}

export async function warmKeyformer() {
  await loadRuntime();
}
