// Spot-check stills (never the full film): node scripts/stills.mjs [frame ...] [--gl=swangle|angle] [--lite]
// Writes out/stills/f<frame>.jpg. Default frames cover every shot.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const gl = (args.find((a) => a.startsWith("--gl=")) ?? "--gl=swangle").slice(5);
const lite = args.includes("--lite");
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const frames = nums.length ? nums : [40, 130, 230, 340, 440, 560, 700, 780, 840, 905, 960, 1120, 1290, 1480, 1600, 1700, 1760, 1850, 1980, 2060];

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const inputProps = { lite };
const composition = await selectComposition({ serveUrl, id: "HeatmapWalls", inputProps, chromiumOptions: { gl } });
for (const frame of frames) {
  const output = path.join(root, "out/stills", `f${String(frame).padStart(4, "0")}.jpg`);
  const t = Date.now();
  await renderStill({ serveUrl, composition, frame, output, inputProps, imageFormat: "jpeg", jpegQuality: 88, chromiumOptions: { gl } });
  console.log(`f${frame} -> ${path.relative(root, output)} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
}
