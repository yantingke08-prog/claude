// npm run sz:qa — layout check over the whole film (no full render, half-size PNGs only).
// Renders every Nth frame in QA mode (only tag + caption boxes, each 50 % red), then
// scripts/sanzhong_qa.py scans the pixels: two overlapping boxes → brighter red; any box pixel
// outside the safe area (top 110, bottom 260, sides 64) → failure.
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const every = Number((process.argv.find((a) => a.startsWith("--every=")) ?? "--every=6").split("=")[1]);
const OUT = path.resolve("out/sanzhong/qa");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/sanzhong/index.ts"), publicDir: path.resolve("public") });
const inputProps = { qa: true };
const comp = await selectComposition({ serveUrl, id: "SanzhongLVP", inputProps });
await renderFrames({
  composition: comp,
  serveUrl,
  inputProps,
  outputDir: OUT,
  imageFormat: "png",
  scale: 0.5,
  everyNthFrame: every,
  concurrency: 2,
  chromiumOptions: { gl: "swangle" },
  onStart: ({ frameCount }) => console.log(`[sz:qa] ${frameCount} frames (every ${every})`),
  onFrameUpdate: () => {},
});
execFileSync("python", [path.resolve("scripts/sanzhong_qa.py"), OUT, String(comp.fps), "0.5", String(every)], { stdio: "inherit" });
