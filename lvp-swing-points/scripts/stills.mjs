// npm run stills [-- 2.5 66 104.2 ...]  — bundles once, renders PNG stills at the given seconds
// (default: one or two per section) into out/stills/. Cheap enough for a CPU-only machine.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).map(Number).filter(Number.isFinite);
const seconds = args.length ? args : [2.2, 4.6, 8.4, 11.5, 16, 19.5, 23, 26, 34, 39, 44, 49, 54.2, 56.0, 62.5, 69.8, 74.5, 82.6, 97.5, 106, 110.3, 117.5, 124.6, 129.8, 135.8, 139.6, 149.8, 153.5, 163.9, 172.8, 176.5, 181, 185, 187.5, 190.2];
const out = path.join(root, "out", "stills");
mkdirSync(out, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
const composition = await selectComposition({ serveUrl, id: "LvpSwingPoints", inputProps: {} });
console.log(`composition ${composition.width}x${composition.height} ${composition.durationInFrames}f`);
for (const s of seconds) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const file = path.join(out, `t${s.toFixed(1).padStart(5, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output: file, inputProps: composition.props });
  console.log("wrote", path.relative(root, file));
}
