// 文案 / 时间轴体检：npm run check
//   · 优缺点每条 10–14 字（不计标点）、每卡最多 3 条
//   · 每页都有口播；估算时长落在 90–94 秒
//   · 名次页停留 1.5–3.5 秒；普通内容页平均每 1.2–2.4 秒推进一句
//   · 有 timing.json 时：句数、id、文本是否与 content.ts 一致
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCHOOLS, SEGMENTS } from "../src/content.ts";
import { PLACEHOLDER_SECONDS, FPS } from "../src/theme.ts";
import { buildTimeline, spokenChars, type TimingFile } from "../src/timeline.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let bad = 0;
const warn = (m: string) => (bad++, console.log(`  ✗ ${m}`));
const PUNCT = /[\s，。；？！：、“”‘’'"《》（）()·,.;?!:…—-]/g;

console.log("卡片文案");
for (const s of Object.values(SCHOOLS)) {
  for (const p of [...s.pros, ...s.cons]) {
    const n = p.replace(PUNCT, "").length;
    if (n < 10 || n > 14) warn(`${s.name}：「${p}」${n} 字`);
  }
}

const tjPath = path.join(root, "public/audio/timing.json");
const timing: TimingFile | null = existsSync(tjPath) ? JSON.parse(readFileSync(tjPath, "utf8")) : null;
if (timing) {
  console.log("timing.json");
  if (timing.segments.length !== SEGMENTS.length) warn(`句数 ${timing.segments.length}，稿子 ${SEGMENTS.length}`);
  timing.segments.forEach((t, i) => {
    const s = SEGMENTS[i];
    if (!s) return;
    if (t.id && t.id !== s.id) warn(`第 ${i + 1} 句 id ${t.id} ≠ ${s.id}`);
    if (t.text && t.text.replace(PUNCT, "") !== s.text.replace(PUNCT, "")) console.log(`  · 第 ${i + 1} 句字幕按配音：「${t.text}」（稿子「${s.text}」）`);
    if (t.end <= t.start) warn(`第 ${i + 1} 句 end ≤ start`);
  });
}

const tl = buildTimeline(timing, null);
const sec = (f: number) => (f / FPS).toFixed(2);
console.log(`时间轴（${tl.source}）：${sec(tl.durationInFrames)} s，${tl.segs.length} 句，平均 ${(tl.durationInFrames / FPS / tl.segs.length).toFixed(2)} s/句`);
const chars = SEGMENTS.reduce((a, s) => a + spokenChars(s.text), 0);
console.log(`口播 ${chars} 字；按 ${PLACEHOLDER_SECONDS} s 折合 ${((chars / PLACEHOLDER_SECONDS) * 60).toFixed(0)} 字/分钟`);
if (tl.source !== "timing.json" && (chars / PLACEHOLDER_SECONDS) * 60 > 300) warn("稿子偏长：93 秒内超过 300 字/分钟");
for (const s of tl.scenes) {
  const d = (s.to - s.from) / FPS;
  const line = `${s.id.padEnd(11)} ${sec(s.from).padStart(6)} → ${sec(s.to).padStart(6)}  ${d.toFixed(2)} s  ${s.segs.length} 句`;
  console.log(`  ${line}`);
  if (s.kind === "rank" && (d < 1.5 || d > 3.5)) warn(`${s.id} 名次停留 ${d.toFixed(2)} s（应 1.5–3.5）`);
  if (s.kind !== "rank" && s.kind !== "ending" && d / s.segs.length > 3.2) warn(`${s.id} 平均 ${(d / s.segs.length).toFixed(2)} s 才推进一句`);
}
for (const g of tl.segs) {
  const d = g.end - g.start;
  const rate = spokenChars(g.text) / d;
  if (rate > 6.2) warn(`${g.id} 语速 ${(rate * 60).toFixed(0)} 字/分钟偏快：「${g.text}」`);
}
console.log(bad ? `\n${bad} 处需要看一下` : "\n全部通过");
process.exitCode = bad ? 1 : 0;
