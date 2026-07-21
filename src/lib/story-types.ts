export type PreviewPoint = {
  i: number; h: number; ud: number; dd: number; uu: number; speed: number;
  pause: number; backspace: number; overlap: number; keyPair: number;
};

export type ReplayEvent = {
  i: number; key: string; char: string; downOffset: number; upOffset: number;
  h: number; ud: number; dd: number; uu: number;
  pause: number; overlap: number; backspace: number;
};

export type StoryUser = {
  id: string; cohort: "baseline" | "rotation"; events: number;
  mean: Record<string, number>; preview: PreviewPoint[]; previewStart?: number;
  replay: { source: string; sourcePassage: string; rawFile: string; events: ReplayEvent[] };
};

export type StoryData = {
  dataset: { name: string; users: number; sessions: number; processedEvents: number; features: number; keyPairBuckets: number };
  users: StoryUser[];
};

export type ModelAdapter = { status: "awaiting-artifacts" | "ready"; predict: (window: PreviewPoint[]) => Promise<never> };
export const modelAdapter: ModelAdapter = {
  status: "awaiting-artifacts",
  predict: async () => { throw new Error("Model artifacts have not been connected yet."); },
};


export type ModelUserResult = {
  id: string; predicted: string; correct: boolean; confidence: number; windows: number;
  windowAccuracy: number; top5: Array<{ id: string; probability: number }>; embeddingPreview: number[];
};

export type ModelEvaluation = {
  windowAccuracy: number; userAccuracy: number; totalWindows: number; users: ModelUserResult[];
};
