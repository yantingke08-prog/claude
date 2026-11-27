// 抽帧审片（只出静帧，不渲染整片）：npm run stills [-- 帧号 ...]
// 默认每页取“最后一句开始后 1.6 秒”和“页末前 3 帧”两张，写到 out/stills/。
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTimeline } from "../src/timeline.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nums = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "TradingSchoolRanking" });
const tl = buildTimeline((composition.props as { timing: never }).timing ?? null, (composition.props as { audioSeconds: number | null }).audioSeconds ?? null);
const frames = nums.length
  ? nums
  : tl.scenes.flatMap((s) => [Math.min(s.to - 3, s.from + s.cues[s.cues.length - 1] + 48), s.to - 3]).filter((v, i, a) => a.indexOf(v) === i);
console.log(`${composition.durationInFrames} frames (${tl.source}); stills: ${frames.join(", ")}`);
for (const frame of frames) {
  const sc = tl.scenes.find((s) => frame >= s.from && frame < s.to);
  const output = path.join(root, "out/stills", `f${String(frame).padStart(4, "0")}-${sc?.id ?? "x"}.jpg`);
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 88 });
  console.log(`f${frame} -> ${path.relative(root, output)}`);
}
