// Renders several stills of one composition from a single bundle (remotion still re-bundles every call).
// Usage: node scripts/breakout-stills.mjs <compId> <outDir> <frame> [frame...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [id, outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = { muted: true, ...JSON.parse(process.env.PROPS ?? "{}") };
const composition = await selectComposition({ serveUrl, id, inputProps, chromiumOptions: { gl: "swangle" } });
for (const f of frames.map(Number)) {
  const t = Date.now();
  await renderStill({ serveUrl, composition, frame: f, output: path.join(outDir, `f${String(f).padStart(4, "0")}.jpg`), imageFormat: "jpeg", jpegQuality: 88, inputProps, chromiumOptions: { gl: "swangle" }, timeoutInMilliseconds: 120000 });
  console.log(`frame ${f} ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
