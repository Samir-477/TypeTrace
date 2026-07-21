# TypeTrace

TypeTrace is an interactive visual explanation of a keystroke-biometric model. It follows a real University at Buffalo typing session from raw press and release events through feature extraction, preprocessing, temporal modeling, identity embedding, and the final user prediction.

The experience is designed for viewers who are new to machine learning: the technical pipeline remains faithful to the implementation, while each stage explains the purpose in plain language.

## What the experience shows

1. **Recorded keystrokes** — replay a selected user's authentic typing timing.
2. **Feature extraction** — explore 25 measurements such as hold time, transition time, pauses, overlaps, and corrections.
3. **Preprocessing** — see signed-log transformation, training-only standardization, overlapping windows, and tensor routing.
4. **Local patterns** — understand how the causal TCN expands its view from 3 to 7 to 15 events.
5. **Whole-window context** — see how the Transformer connects information across all 64 events.
6. **Identity fingerprint** — follow gated pooling into a normalized 192-dimensional embedding and enrolled-profile comparison.
7. **Model result** — inspect genuine held-out evaluation results and aggregated window predictions.
8. **Live timing lab** — type a passage, inspect locally extracted timing features, and optionally run the exported model in the browser.

## Pipeline

```text
Raw key events
      ↓
25 continuous timing features + key-pair category
      ↓
Signed log → standardization → 64-event overlapping windows
      ↓
Causal TCN → Transformer encoder → gated pooling
      ↓
192D normalized embedding → enrolled-user comparison
      ↓
Window predictions → final user result
```

## Technology

- Next.js 16 and React 19
- TypeScript
- Motion for interface animation
- Recharts for evaluation visualizations
- ONNX Runtime Web for local browser inference
- Lucide React icons
- CSS Modules and custom responsive styling

No database, authentication service, or server-side inference API is required for the current deployment. The story data, evaluation results, scaler, and ONNX model are served as static assets.

## Run locally

Requirements:

- Node.js 20.9 or newer
- npm

```bash
git clone https://github.com/Samir-477/TypeTrace.git
cd TypeTrace
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm ci` automatically copies the required ONNX Runtime WebAssembly files into `public/ort` through the `postinstall` script.

## Validation

```bash
npm run lint
npm run build
```

To run the optimized build locally:

```bash
npm start
```

## Deploy to Vercel

1. Push this folder to `Samir-477/TypeTrace` on GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep **Next.js** as the detected framework.
4. Use the repository root as the root directory.
5. Keep the default install and build commands (`npm install` and `npm run build`).
6. Deploy. No environment variables are currently required.

The `postinstall` command generates the browser runtime assets before Vercel builds the application.

## Important interpretation note

The live comparison is a **closed-set demonstration**. The exported model must rank one of the 148 enrolled UB users and does not contain an “unknown person” class. Therefore, its closest-profile result is not proof that a new visitor is that person.

## Data and privacy

- The visual replay is derived from the University at Buffalo keystroke-dynamics dataset supplied for this project.
- Live keystrokes are processed locally in the browser and are not uploaded by this application.
- The website explains timing behavior; it does not need to preserve the semantic meaning of a visitor's text.

## Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create the production build |
| `npm run start` | Serve the production build |
| `npm run data:build` | Rebuild the visual story data from local source files |
| `npm run model:export` | Export the PyTorch checkpoint to ONNX |
| `npm run model:validate` | Compare ONNX and PyTorch outputs |
| `npm run assets:ort` | Copy browser WASM runtime assets into `public/ort` |

## Repository structure

```text
src/app/          Next.js application shell and global styling
src/components/   Interactive pipeline stages
src/lib/          Feature extraction and browser inference utilities
public/data/      Prepared story and evaluation data
public/model/     ONNX model and scaler
scripts/          Data preparation, export, validation, and asset utilities
```

