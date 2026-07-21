import type { CapturedKeyEvent } from "@/lib/live-feature-extraction";

type Pair = { code: string; key: string; down: number; up: number };

function pair(events: CapturedKeyEvent[]) {
  const active = new Map<string, CapturedKeyEvent>();
  const pairs: Pair[] = [];
  for (const event of events) {
    const id = event.code || event.key;
    if (event.type === "down") active.set(id, event);
    else {
      const press = active.get(id);
      if (!press) continue;
      pairs.push({ code: id, key: press.key, down: press.time, up: event.time });
      active.delete(id);
    }
  }
  return pairs.sort((a, b) => a.down - b.down);
}

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function summarizeLiveSignal(events: CapturedKeyEvent[]) {
  const pairs = pair(events);
  const recent = pairs.slice(-65);
  const holds = recent.map((item) => item.up - item.down);
  const flights = recent.slice(1).map((item, index) => item.down - recent[index].up);
  const cadence = recent.slice(1).map((item, index) => item.down - recent[index].down);
  const counts = new Map<string, number>();
  recent.forEach((item) => counts.set(item.code, (counts.get(item.code) ?? 0) + 1));
  const dominantShare = recent.length ? Math.max(0, ...counts.values()) / recent.length : 0;
  const distinctKeys = counts.size;
  const correctionCount = recent.filter((item) => item.code === "Backspace" || item.code === "Delete").length;
  const overlapRate = flights.length ? flights.filter((value) => value < 0).length / flights.length : 0;
  const pauseCount = flights.filter((value) => value > 200).length;
  const meanCadence = average(cadence);

  let quality: "collecting" | "low" | "limited" | "good" = "collecting";
  let message = "Follow the passage naturally—pauses and corrections are part of the signal.";
  if (pairs.length >= 12 && (distinctKeys < 4 || dominantShare > 0.65)) {
    quality = "low";
    message = "Repeated-key pattern detected. Its timing is visible, but it does not resemble the varied training passages.";
  } else if (pairs.length >= 65 && (distinctKeys < 8 || dominantShare > 0.45)) {
    quality = "limited";
    message = "The window is complete, but key diversity is too limited for a responsible model comparison.";
  } else if (pairs.length >= 65) {
    quality = "good";
    message = "Natural variation detected. This window can now enter the experimental closed-set comparison.";
  }

  const last = recent.at(-1);
  const before = recent.at(-2);
  return {
    completed: pairs.length,
    quality,
    message,
    canCompare: quality === "good",
    current: {
      key: last ? (last.key === " " ? "SPACE" : last.key.toUpperCase()) : "—",
      hold: last ? last.up - last.down : 0,
      flight: last && before ? last.down - before.up : 0,
      cadence: last && before ? last.down - before.down : 0,
    },
    rhythm: cadence.slice(-30),
    metrics: {
      meanHold: average(holds),
      meanFlight: average(flights),
      meanCadence,
      keysPerMinute: meanCadence > 0 ? 60000 / meanCadence : 0,
      overlapRate,
      pauseCount,
      correctionCount,
      distinctKeys,
      dominantShare,
    },
  };
}
