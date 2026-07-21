"use client";

import SparkMD5 from "spark-md5";

export type CapturedKeyEvent = { key: string; code: string; type: "down" | "up"; time: number };
type PairedEvent = { key: string; down: number; up: number };

const MODIFIERS = new Set(["Shift","Control","Alt","Meta","CapsLock","Tab","Backspace","Delete","Return","Enter","Escape","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]);
const browserKeyToUb = (event: CapturedKeyEvent) => {
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (/^Digit\d$/.test(event.code)) return `D${event.code.slice(5)}`;
  const byCode: Record<string,string> = {
    Space:"Space", Backspace:"Back", Enter:"Return", Tab:"Tab", Delete:"Delete",
    ShiftLeft:"LShiftKey", ShiftRight:"RShiftKey", ControlLeft:"LControlKey", ControlRight:"RControlKey",
    AltLeft:"LMenu", AltRight:"RMenu", Period:"OemPeriod", Comma:"OemComma", Slash:"OemQuestion",
    Quote:"OemQuotes", Minus:"OemMinus", Semicolon:"OemSemicolon",
  };
  return byCode[event.code] ?? event.key;
};

function pairEvents(captured: CapturedKeyEvent[]) {
  const active = new Map<string, number>();
  const paired: PairedEvent[] = [];
  for (const event of captured) {
    const key = browserKeyToUb(event);
    if (event.type === "down") active.set(key, event.time);
    else if (active.has(key)) {
      paired.push({ key, down: active.get(key)!, up: event.time });
      active.delete(key);
    }
  }
  return paired;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a,b) => a-b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const keyCategory = (key: string) => {
  if (MODIFIERS.has(key)) return 4;
  if ([" ","space","Space"].includes(key)) return 2;
  if (key.length === 1) return /^[a-z]$/i.test(key) ? 0 : /^\d$/.test(key) ? 1 : 3;
  return 4;
};
const keyPairHash = (first: string, second: string) => BigInt(`0x${SparkMD5.hash(`${first.toLowerCase()}|${second.toLowerCase()}`)}`) % BigInt(128);

export function extractLiveWindow(captured: CapturedKeyEvent[]) {
  const events = pairEvents(captured);
  if (events.length < 65) return { completed: events.length, ready: false as const };
  const relevant = events.slice(-65);
  const ddList = relevant.slice(0,-1).map((event,index) => relevant[index + 1].down - event.down);
  const ddMedian = ddList.map((_,index) => median(ddList.slice(Math.max(0,index - 19),index + 1)));
  const rows: number[][] = [];
  const keyPairs: number[] = [];
  let previousUd = 0, previousAcceleration = 0;
  let previousH = relevant[0].up - relevant[0].down;
  const eps = 1e-6;
  for (let index = 0; index < 64; index += 1) {
    const first = relevant[index], second = relevant[index + 1], third = relevant[index + 2];
    const previousKey = index > 0 ? relevant[index - 1].key : "";
    const h = first.up - first.down, ud = second.down - first.up, dd = second.down - first.down, uu = second.up - first.up;
    const nextH = second.up - second.down, acceleration = ud - previousUd, jerk = acceleration - previousAcceleration;
    const digraphDd = third ? third.down - first.down : dd, digraphUu = third ? third.up - first.up : uu;
    const denominator = Math.abs(ud) + Math.abs(previousUd) + eps;
    rows.push([
      h, ud, dd, uu, 1/(dd+eps), acceleration, jerk, h/(dd+eps), ud > 200 ? 1 : 0,
      ["Backspace","Delete"].includes(first.key) ? 1 : 0, ud/(dd+eps), h/(uu+eps), digraphDd, digraphUu,
      (ud-previousUd)**2, keyCategory(first.key), first.key === second.key ? 1 : 0, h/(Math.abs(previousH)+eps),
      (ud-previousUd)/denominator, third ? third.down-second.up : ud, ud < 0 ? 1 : 0, h/(dd+eps),
      dd/(Math.abs(ddMedian[index])+eps)-1, h+nextH, MODIFIERS.has(previousKey) ? 1 : 0,
    ]);
    keyPairs.push(Number(keyPairHash(first.key, second.key)));
    previousUd = ud; previousAcceleration = acceleration; previousH = h;
  }
  return { completed: events.length, ready: true as const, rows, keyPairs };
}
