// npm run check — audits the timeline without rendering:
//  · at most 2 tags on screen at any frame (one main visual + two annotations)
//  · captions never overlap each other
//  · every tag anchor projects inside the safe area and above the caption band
//  · fonts were regenerated after the last text change
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DURATION } from "../src/config.ts";
import { cellTop, pathPoint, project } from "../src/geom.ts";
import { CAPTIONS, CARDS, SECTIONS, TAGS, camAt, worldAt } from "../src/timeline.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors: string[] = [];
const warn: string[] = [];

if (SECTIONS[SECTIONS.length - 1].to !== DURATION) errors.push(`sections end at ${SECTIONS[SECTIONS.length - 1].to}, DURATION is ${DURATION}`);

const caps = [...CAPTIONS].sort((a, b) => a.f0 - b.f0);
for (let i = 1; i < caps.length; i++) if (caps[i].f0 < caps[i - 1].f1) errors.push(`captions overlap: "${caps[i - 1].head}" / "${caps[i].head}"`);

let maxTags = 0;
for (let f = 0; f < DURATION; f++) {
  const live = TAGS.filter((t) => f >= t.f0 && f < t.f1);
  maxTags = Math.max(maxTags, live.length);
  if (live.length > 2) errors.push(`f${f}: ${live.length} tags (${live.map((t) => t.text).join(", ")})`);
  const s = worldAt(f);
  const v = camAt(f);
  for (const t of live) {
    if ((f - t.f0) % 3) continue;
    const [c, r] = t.at(f);
    const [x, y] = project(v, t.onPath ? pathPoint(s, c) : cellTop(s, c, r, t.ladderEnd));
    if (x < 60 || x > 1020 || y < 220 || y > 1420) errors.push(`f${f}: tag "${t.text}" at (${x.toFixed(0)}, ${y.toFixed(0)}) is outside the safe area`);
  }
}
// cards that use the centre of the frame must not share it with a tag
for (const [name, card] of Object.entries(CARDS)) {
  const k = card as { f0: number; f1: number };
  if (name === "axes" || name === "legend") continue;
  const clash = TAGS.filter((t) => t.f0 < k.f1 && t.f1 > k.f0);
  if (clash.length) errors.push(`card ${name} overlaps tags ${clash.map((t) => t.text).join(", ")}`);
}

const fontFile = path.join(root, "public/fonts/heatmap-sans.woff2");
const textFile = path.join(root, "src/timeline.ts");
if (!fs.existsSync(fontFile)) errors.push("fonts missing — run npm run fonts");
else if (fs.statSync(textFile).mtimeMs > fs.statSync(fontFile).mtimeMs + 1000) warn.push("src/timeline.ts is newer than the font subset — run npm run fonts if on-screen text changed");

console.log(`frames ${DURATION} (${(DURATION / 30).toFixed(1)} s) · sections ${SECTIONS.length} · captions ${CAPTIONS.length} · tags ${TAGS.length} · max tags at once ${maxTags}`);
for (const w of warn) console.log(`WARN  ${w}`);
for (const e of errors.slice(0, 40)) console.log(`FAIL  ${e}`);
if (errors.length) {
  console.log(`${errors.length} problem(s)`);
  process.exit(1);
}
console.log("check OK");
