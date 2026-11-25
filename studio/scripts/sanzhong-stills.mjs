// npm run sz:stills — bundle once, render a still ~0.9 s after every beat (tags settled) at half size.
// Output: out/sanzhong/stills/<sec>-<beat>.png. Use --scale=1 for full size, --only=beatA,beatB to filter.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split("=")[1];
const scale = Number(arg("scale", "0.5"));
const only = arg("only", "").split(",").filter(Boolean);
const extra = arg("t", "").split(",").filter(Boolean).map(Number);
const OUT = path.resolve("out/sanzhong/stills");
fs.mkdirSync(OUT, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/sanzhong/index.ts"), publicDir: path.resolve("public") });
const comp = await selectComposition({ serveUrl, id: "SanzhongLVP", inputProps: {} });
const { timeline } = comp.props;
const { BEATS } = await import("../src/sanzhong/script.ts");
const { resolveBeats } = await import("../src/sanzhong/timeline.ts");
const { beats } = resolveBeats(timeline, BEATS);

let jobs = Object.entries(beats).map(([id, s]) => ({ id, s: s + 0.9 }));
if (only.length) jobs = jobs.filter((j) => only.includes(j.id));
for (const s of extra) jobs.push({ id: "t", s });
const last = comp.durationInFrames - 1;
for (const j of jobs) {
  const frame = Math.min(last, Math.round(j.s * comp.fps));
  const file = path.join(OUT, `${j.s.toFixed(1).padStart(5, "0")}-${j.id}.png`);
  await renderStill({ composition: comp, serveUrl, frame, output: file, scale, inputProps: {}, chromiumOptions: { gl: "swangle" } });
  console.log(`${frame}\t${path.basename(file)}`);
}
