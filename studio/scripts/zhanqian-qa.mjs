// Layout QA for 战前觉醒: renders the HUD (no WebGL) every Nth frame, collects the screen box of every visible
// label (see src/zhanqian/qa.tsx) and checks the phone-screen rules (v5):
//   safe area  x 60–960 (the right 120 px is platform buttons), y 140–1340; captions own 1360–1500
//   type       nothing under 34 px (captions 56+); descriptive lines at most 12 hanzi
//   spacing    20 px between any two labels; at most 2 explanation cards (kind "card") at once
//   beats      inside each shot something new must land (a label appears, a figure changes) at least
//              every 2.5 s; reported with the longest quiet stretch
// Usage: node scripts/zhanqian-qa.mjs [everyNth=4] [from] [to]    → prints issues grouped by shot, exits 1 if any
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [nth = "4", from, to] = process.argv.slice(2);
const SAFE = { x0: 60, x1: 960, y0: 140, y1: 1340 };
const CAP = [1360, 1500];
const MIN_FONT = 34;
const MAX_HAN = 12;
const QUIET = 75;
const GAP = 20;
const MAX_CARDS = 2;

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = { muted: true, qa: true };
const composition = await selectComposition({ serveUrl, id: "Zhanqian", inputProps });
const shots = JSON.parse(fs.readFileSync("src/zhanqian/cues.json", "utf8")).shots;
const shotAt = (f) => shots.filter((s) => s.at <= f).at(-1);
const frames = new Map();
const out = fs.mkdtempSync(path.join(os.tmpdir(), "zqqa-"));
await renderFrames({
  serveUrl,
  composition,
  inputProps,
  outputDir: out,
  imageFormat: "jpeg",
  jpegQuality: 30,
  everyNthFrame: Number(nth),
  frameRange: from ? [Number(from), Number(to ?? composition.durationInFrames - 1)] : null,
  concurrency: 4,
  onStart: () => {},
  onFrameUpdate: () => {},
  onBrowserLog: (l) => {
    if (l.text.startsWith("QA")) {
      const r = JSON.parse(l.text.slice(2));
      frames.set(r.f, r.items);
    }
  },
});
fs.rmSync(out, { recursive: true, force: true });

const gap = (a, b) => Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);
const inside = (a, b) => a.x0 >= b.x0 - 1 && a.x1 <= b.x1 + 1 && a.y0 >= b.y0 - 1 && a.y1 <= b.y1 + 1;
const issues = new Map();
const note = (f, tag, msg) => {
  const s = shotAt(f);
  const key = `${s.lay}|${tag}`;
  const e = issues.get(key) ?? { lay: s.lay, msg, f0: f, f1: f };
  e.f0 = Math.min(e.f0, f);
  e.f1 = Math.max(e.f1, f);
  issues.set(key, e);
};
const r = (b) => `[${Math.round(b.x0)},${Math.round(b.y0)}–${Math.round(b.x1)},${Math.round(b.y1)}]`;
for (const [f, items] of [...frames.entries()].sort((a, b) => a[0] - b[0])) {
  for (const it of items) {
    if (it.kind !== "cap" && (it.x0 < SAFE.x0 - 1 || it.x1 > SAFE.x1 + 1 || it.y0 < SAFE.y0 - 1 || it.y1 > SAFE.y1 + 1)) note(f, `safe ${it.id}`, `outside safe area: ${it.id} ${r(it)}`);
    if (it.kind !== "cap" && it.y1 > CAP[0] && it.y0 < CAP[1]) note(f, `cap ${it.id}`, `in caption band: ${it.id} ${r(it)}`);
    if (it.minFont < (it.kind === "cap" ? 56 : MIN_FONT)) note(f, `font ${it.id}`, `type too small (${Math.round(it.minFont)} px): ${it.id}`);
    if (it.kind !== "cap" && it.kind !== "type" && it.maxHan > MAX_HAN) note(f, `han ${it.id}`, `line longer than ${MAX_HAN} hanzi (${it.maxHan}): ${it.id}`);
  }
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i],
        b = items[j];
      if (inside(a, b) || inside(b, a)) continue;
      if (a.into?.some((p) => b.id.startsWith(p)) || b.into?.some((p) => a.id.startsWith(p))) continue;
      const g = gap(a, b);
      if (g < GAP) note(f, `pair ${a.id} ${b.id}`, `${g < 0 ? "overlap" : `gap ${Math.round(g)}px`}: ${a.id} ${r(a)} × ${b.id} ${r(b)}`);
    }
  const cards = items.filter((i) => i.kind === "card");
  if (cards.length > MAX_CARDS) note(f, `cards ${cards.map((c) => c.id).join()}`, `${cards.length} cards: ${cards.map((c) => c.id).join(", ")}`);
}
const list = [...issues.values()].sort((a, b) => a.f0 - b.f0);
const tc = (f) => `${Math.floor(f / 30 / 60)}:${((f / 30) % 60).toFixed(2).padStart(5, "0")}`;
// beats: a new label id, or a changed text in an existing one, counts as an event; events closer than 12 frames
// are one beat. Report every shot whose longest stretch without a beat is over QUIET frames.
const beats = new Map();
let prev = new Map();
for (const [f, items] of [...frames.entries()].sort((a, b) => a[0] - b[0])) {
  const cur = new Map(items.filter((i) => i.kind !== "cap" && i.kind !== "chrome").map((i) => [i.id, i.sig]));
  const ev = [...cur].some(([id, sig]) => prev.get(id) !== sig);
  const s = shotAt(f);
  if (!beats.has(s.at)) beats.set(s.at, { ev: [s.at] });
  const b = beats.get(s.at);
  if (ev && f - b.ev[b.ev.length - 1] >= 12) b.ev.push(f);
  prev = cur;
}
const quiet = [];
shots.forEach((s, i) => {
  const b = beats.get(s.at);
  if (!b) return;
  const ts = [...b.ev, i + 1 < shots.length ? shots[i + 1].at : composition.durationInFrames];
  const gaps = ts.slice(1).map((t, j) => t - ts[j]);
  const gap = Math.max(...gaps);
  if (gap > QUIET) quiet.push(`${s.lay.padEnd(12)} ${b.ev.length - 1} beats, longest quiet ${(gap / 30).toFixed(1)} s from ${tc(ts[gaps.indexOf(gap)])}`);
});
for (const e of list) console.log(`${tc(e.f0)}–${tc(e.f1)}  ${e.lay.padEnd(18)} ${e.msg}`);
if (quiet.length) console.log(`\nquiet shots (no new beat for more than ${QUIET / 30} s):\n  ${quiet.join("\n  ")}`);
console.log(`\n${frames.size} frames checked, ${list.length} issues, ${quiet.length} quiet shots`);
process.exit(list.length ? 1 : 0);
