import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/onnxruntime-web/dist");
const destination = resolve(root, "public/ort");
const files = ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

await mkdir(destination, { recursive: true });
await Promise.all(files.map((file) => copyFile(resolve(source, file), resolve(destination, file))));
console.log(`Copied ${files.length} ONNX Runtime WASM assets to public/ort.`);
