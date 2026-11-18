// Spot-check stills for the 放量不涨 film from one bundle (no full render on machines without a GPU).
// Usage: node scripts/volnorise2-stills.mjs <outDir> <scale> <frame|event[+-off]>...   e.g.  out/vnr2 0.5 0 cd2 punch+10 cover
// Events resolve exactly like src/volnorise2/cue.ts (line + word -> the frame that word is spoken).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [outDir, scaleArg, ...picks] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync("src/volnorise2/timeline.json", "utf8"));
const ev = JSON.parse(fs.readFileSync("src/volnorise2/events.json", "utf8"));
const lines = Object.fromEntries(tl.lines.map((l) => [l.id, l]));
const E = (name) => {
  const e = ev[name];
  if (!e) throw new Error(`no event ${name}`);
  if (e.after) return lines[e.after].to + (e.off ?? 0);
  const l = lines[e.line];
  if (!e.word) return l.from + (e.off ?? 0);
  const i = l.text.indexOf(e.word);
  return (e.at === "end" ? l.ch[i + e.word.length - 1][1] : l.ch[i][0]) + (e.off ?? 0);
};
const resolve = (s) => {
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^([A-Za-z0-9]+)([+-]\d+)?$/);
  return Math.round(E(m[1]) + Number(m[2] ?? 0));
};

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = { muted: true };
const scale = Number(scaleArg || 0.5);
fs.mkdirSync(outDir, { recursive: true });
for (const p of picks) {
  const id = p === "cover" ? "VolNoRise2Cover" : "VolNoRise2";
  const composition = await selectComposition({ serveUrl, id, inputProps, chromiumOptions: { gl: "swangle" } });
  const f = p === "cover" ? 0 : resolve(p);
  const t = Date.now();
  const name = p === "cover" ? "cover" : `${String(f).padStart(4, "0")}-${p.replace(/[^A-Za-z0-9+-]/g, "")}`;
  await renderStill({ serveUrl, composition, frame: f, output: path.join(outDir, `${name}.jpg`), imageFormat: "jpeg", jpegQuality: 85, scale, inputProps, chromiumOptions: { gl: "swangle" }, timeoutInMilliseconds: 240000 });
  console.log(`${name} ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
