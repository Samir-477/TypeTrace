import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const processedDir = path.resolve(process.cwd(), "..", "Processed_Sequences_v4");
const rawRoot = path.resolve(process.cwd(), "..", "UB_keystroke_dataset", "s0");
const outputDir = path.resolve(process.cwd(), "public", "data");
const sourcePassage = "I am honored to be with you today at your commencement from one of the finest universities in the world.";
const summaryFeatures = ["H", "UD", "DD", "UU", "speed", "rhythm_var", "pause", "is_backspace", "overlap"];
const files = (await readdir(processedDir)).filter((name) => /^user_\d{3}\.csv$/.test(name)).sort();
const users = [];
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value, places = 2) => Number(value.toFixed(places));

function representativeStart(rows, at) {
  let bestStart = 0, bestScore = -Infinity;
  for (let start = 0; start <= rows.length - 64; start += 16) {
    let score = 0;
    for (let offset = 0; offset < 64; offset += 1) {
      const values = rows[start + offset];
      const h = Math.abs(number(values[at.H])), ud = Math.abs(number(values[at.UD])), dd = Math.abs(number(values[at.DD]));
      if (h >= 25 && h <= 550) score += 1;
      if (dd >= 35 && dd <= 950) score += 1.4;
      if (ud <= 750) score += 1;
      if (!number(values[at.pause])) score += .15;
    }
    if (score > bestScore) { bestScore = score; bestStart = start; }
  }
  return bestStart;
}

function characterFor(key, shifted) {
  if (/^[A-Z]$/.test(key)) return shifted ? key : key.toLowerCase();
  if (key === "Space") return " ";
  if (key === "Back") return "\b";
  if (key === "OemPeriod" || key === "Decimal") return ".";
  if (key === "OemComma") return ",";
  if (key === "OemQuestion") return shifted ? "?" : "/";
  if (key === "OemQuotes") return shifted ? '"' : "'";
  if (key === "OemMinus") return shifted ? "_" : "-";
  if (/^D\d$/.test(key)) return key.slice(1);
  return null;
}

async function compileRawReplay(id, cohort) {
  const cohortFiles = await readdir(path.join(rawRoot, cohort));
  const rawName = cohortFiles.filter((name) => name.startsWith(id) && name.endsWith("0.txt")).sort()[0];
  if (!rawName) throw new Error(`No Session One transcription log for user ${id}`);
  const rawFile = path.join(rawRoot, cohort, rawName);
  const lines = (await readFile(rawFile, "utf8")).trim().split(/\r?\n/);
  const active = new Map();
  const presses = [];
  let shift = false;

  for (const line of lines) {
    const [key, direction, stampText] = line.trim().split(/\s+/);
    const stamp = number(stampText);
    if (!key || !direction || !stamp) continue;
    if (key === "LShiftKey" || key === "RShiftKey") {
      shift = direction === "KeyDown";
      continue;
    }
    if (direction === "KeyDown") {
      const char = characterFor(key, shift);
      if (char === null) continue;
      const event = { key, char, down: stamp, up: null };
      presses.push(event);
      if (!active.has(key)) active.set(key, []);
      active.get(key).push(event);
    } else if (direction === "KeyUp" && active.has(key)) {
      const event = active.get(key).shift();
      if (event) event.up = stamp;
    }
  }

  const paired = presses.filter((event) => event.up !== null);
  const start = Math.max(0, paired.findIndex((event) => event.char.toLowerCase() === "i"));
  const passage = [];
  for (const event of paired.slice(start)) {
    passage.push(event);
    if (event.char === "." && passage.length >= 45) break;
    if (passage.length >= 140) break;
  }
  const base = passage[0]?.down ?? 0;
  const events = passage.map((event, index) => {
    const next = passage[index + 1] ?? event;
    const h = event.up - event.down;
    const ud = next.down - event.up;
    const dd = next.down - event.down;
    const uu = next.up - event.up;
    return {
      i: index + 1, key: event.key, char: event.char,
      downOffset: event.down - base, upOffset: event.up - base,
      h, ud, dd, uu,
      pause: ud >= 1000 ? 1 : 0,
      overlap: ud < 0 ? 1 : 0,
      backspace: event.char === "\b" ? 1 : 0,
    };
  });
  return { source: "UB Session One · raw transcription log", sourcePassage, rawFile: path.basename(rawFile), events };
}

for (const file of files) {
  const text = await readFile(path.join(processedDir, file), "utf8");
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  const at = Object.fromEntries(headers.map((header, index) => [header, index]));
  const rows = lines.map((row) => row.split(","));
  const totals = Object.fromEntries(summaryFeatures.map((name) => [name, 0]));
  for (const values of rows) summaryFeatures.forEach((name) => { totals[name] += number(values[at[name]]); });
  const start = representativeStart(rows, at);
  const preview = rows.slice(start, start + 64).map((values, index) => ({
    i: index + 1, h: round(number(values[at.H]), 1), ud: round(number(values[at.UD]), 1),
    dd: round(number(values[at.DD]), 1), uu: round(number(values[at.UU]), 1),
    speed: round(number(values[at.speed]), 6), pause: number(values[at.pause]),
    backspace: number(values[at.is_backspace]), overlap: number(values[at.overlap]), keyPair: number(values[at.key_pair_id]),
  }));
  const id = file.match(/\d{3}/)?.[0] ?? "000";
  const cohort = Number(id) <= 75 ? "baseline" : "rotation";
  users.push({ id, cohort, events: rows.length, previewStart: start,
    mean: Object.fromEntries(summaryFeatures.map((name) => [name, round(totals[name] / rows.length)])),
    preview, replay: await compileRawReplay(id, cohort),
  });
}

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "story.json"), JSON.stringify({
  dataset: { name: "University at Buffalo Keystroke Dynamics Dataset", users: users.length, sessions: 3,
    processedEvents: users.reduce((total, user) => total + user.events, 0), features: 25, keyPairBuckets: 128 }, users,
}));
console.log(`Compiled ${users.length} authentic raw transcription replays.`);
