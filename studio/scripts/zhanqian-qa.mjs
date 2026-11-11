// Layout QA for 战前觉醒: renders the HUD (no WebGL) every Nth frame, collects the screen box of every visible
// label (see src/zhanqian/qa.tsx) and checks the layout rules:
//   safe area  x 40–1040, y 120–1740            caption band  y 1460–1590 is for captions only
//   20 px between any two labels                 at most 2 explanation cards (kind "card") at once
// Usage: node scripts/zhanqian-qa.mjs [everyNth=4] [from] [to]    → prints issues grouped by shot, exits 1 if any
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [nth = "4", from, to] = process.argv.slice(2);
const SAFE = { x0: 40, x1: 1040, y0: 120, y1: 1740 };
const CAP = [1460, 1590];
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
    if (it.x0 < SAFE.x0 || it.x1 > SAFE.x1 || it.y0 < SAFE.y0 || it.y1 > SAFE.y1) note(f, `safe ${it.id}`, `outside safe area: ${it.id} ${r(it)}`);
    if (it.kind !== "cap" && it.y1 > CAP[0] && it.y0 < CAP[1]) note(f, `cap ${it.id}`, `in caption band: ${it.id} ${r(it)}`);
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
for (const e of list) console.log(`${tc(e.f0)}–${tc(e.f1)}  ${e.lay.padEnd(18)} ${e.msg}`);
console.log(`\n${frames.size} frames checked, ${list.length} issues`);
process.exit(list.length ? 1 : 0);
