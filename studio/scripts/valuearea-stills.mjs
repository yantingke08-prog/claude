// Spot-check stills for 《价值区怎么用？只看3个数》 from one bundle, by event name (local use only).
//   node scripts/valuearea-stills.mjs [outDir] [scale] [event[+-off] | frame | cover]...
//   e.g.  node scripts/valuearea-stills.mjs out/valuearea/stills 0.5 L06_价值区+20 L26_站住+10 cover
// With no picks it takes one still per key moment (list below). Events resolve exactly like src/valuearea/cue.ts.
// Uses SwiftShader (no GPU needed); writes JPEGs into outDir (default out/valuearea/stills, git-ignored).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const DEFAULT = [
  "L01_撑住+12", "L01_一碰就穿+20", "L02_三个数+12", "L04_成交量分布+30", "L06_价值区+24", "L08_一笔一笔+12", "L09_最认的价+20",
  "L11_成交量+20", "L12_上沿+20", "L13_下沿+20", "L15_碰到下沿就多+10", "L16_一堵墙+10", "L18_来回震+10", "L19_边缘+16", "L21_等确认+10",
  "L25_成交继续放大+20", "L26_站住+10", "L26_接受+24", "L27_缩回来+14", "L28_往下也一样+30", "L31_中间+14", "L33_站住了+20", "L34_站不住+24",
  "L35_旧价值+24", "L36_买卖按钮+12", "L37_地图+40", "L39_稀薄+14", "L42_认不认+14", "L44_边缘+10", "L47_磁铁+40", "cover",
];
const args = process.argv.slice(2);
const outDir = args[0] && !/^L\d\d_|^\d+$|^cover$/.test(args[0]) ? args.shift() : "out/valuearea/stills";
const scale = args[0] && /^\d*\.?\d+$/.test(args[0]) && Number(args[0]) <= 1 ? Number(args.shift()) : 0.5;
const picks = args.length ? args : DEFAULT;

const tl = JSON.parse(fs.readFileSync("src/valuearea/timeline.json", "utf8"));
const ev = JSON.parse(fs.readFileSync("src/valuearea/events.json", "utf8"));
const lines = Object.fromEntries(tl.lines.map((l) => [l.id, l]));
const E = (name) => {
  const e = ev[name];
  if (!e || name.startsWith("_")) throw new Error(`no event ${name}`);
  if (e.after) return lines[e.after].to + (e.off ?? 0);
  const l = lines[e.line];
  if (!e.word) return l.from + (e.off ?? 0);
  let i = -1;
  for (let k = 0; k < (e.nth ?? 1); k++) i = l.text.indexOf(e.word, i + 1);
  return (e.at === "end" ? l.ch[i + e.word.length - 1][1] : l.ch[i][0]) + (e.off ?? 0);
};
const resolve = (s) => {
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^(.+?)([+-]\d+)?$/);
  return Math.max(0, Math.min(tl.frames - 1, Math.round(E(m[1]) + Number(m[2] ?? 0))));
};

console.log(`timeline: ${tl.source}`);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = { muted: true };
fs.mkdirSync(outDir, { recursive: true });
for (const p of picks) {
  const id = p === "cover" ? "ValueAreaCover" : "ValueArea";
  const composition = await selectComposition({ serveUrl, id, inputProps, chromiumOptions: { gl: "swangle" } });
  const f = p === "cover" ? 0 : resolve(p);
  const t = Date.now();
  const name = p === "cover" ? "cover" : `${String(f).padStart(4, "0")}-${p.replace(/[^\p{L}\p{N}+_-]/gu, "")}`;
  await renderStill({ serveUrl, composition, frame: f, output: path.join(outDir, `${name}.jpg`), imageFormat: "jpeg", jpegQuality: 85, scale, inputProps, chromiumOptions: { gl: "swangle" }, timeoutInMilliseconds: 240000 });
  console.log(`${name} ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
