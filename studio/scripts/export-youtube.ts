// Writes the YouTube upload kit for the expectancy video:
//   publish/expectancy/subtitles.zh-Hans.srt  - same captions as burned into the video
//   publish/expectancy/youtube.md             - title, description with chapter timestamps, tags
// Numbers come from the same seeded simulation the video renders, so they always match.
//
// Usage: node --no-warnings scripts/export-youtube.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getSim } from "../src/expectancy/sim.ts";
import { fill, plain } from "../src/expectancy/text.ts";

type Script = {
  title: string;
  fps: number;
  transition: number;
  scenes: { id: string; frames: number; chapter: { title: string; index: string } | null; captions: { from: number; to: number; text: string }[] }[];
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script: Script = JSON.parse(readFileSync(join(root, "src/expectancy/script.json"), "utf-8"));
const stats = getSim().stats;
const out = join(root, "publish/expectancy");
mkdirSync(out, { recursive: true });

const starts: Record<string, number> = {};
let t = 0;
for (const s of script.scenes) {
  starts[s.id] = t;
  t += s.frames - script.transition;
}

const srtTime = (frame: number) => {
  const ms = Math.round((frame / script.fps) * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const clock = (frame: number) => {
  const s = Math.floor(frame / script.fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// ---- subtitles ----
const cues = script.scenes.flatMap((s) => s.captions.map((c) => ({ from: starts[s.id] + c.from, to: starts[s.id] + c.to, text: plain(fill(c.text, stats)) })));
const srt = cues.map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to)}\n${c.text}\n`).join("\n");
writeFileSync(join(out, "subtitles.zh-Hans.srt"), srt, "utf-8");

// ---- description with chapters ----
const chapterName = (s: Script["scenes"][number]) => (s.chapter ? `${s.chapter.index}：${s.chapter.title}` : s.id === "hook" ? "开场：两个交易者" : "结语");
// the cold-open cover is part of the opening chapter
const chapters = script.scenes.filter((s) => s.id !== "cover").map((s) => `${clock(s.id === "hook" ? 0 : starts[s.id] + script.transition / 2)} ${chapterName(s)}`);

const md = `# YouTube 上传资料

## 标题

${script.title}｜正期望 · 大数法则 · 仓位 · 纪律

## 简介（直接粘贴）

\`\`\`
胜率 70% 的人为什么会爆仓，胜率 40% 的人为什么反而能赚钱？
这期用 1000 个模拟交易者、10000 场抛硬币实验，把交易里最重要的四道关讲清楚：
正期望、大数法则、仓位管理、执行纪律。

本期关键数字（全部来自可复现的蒙特卡洛模拟）：
· B 策略（胜率 40%，盈亏比 2.5:1）每笔期望 +0.4
· 1000 笔交易里遇到 10 连亏的概率：${stats.streak10}%
· 每笔冒 40% 风险：${stats.r40}% 的人亏掉九成以上；每笔冒 2%：中位数资金 ×${stats.m2}
· +50% / −40% 抛硬币 100 把：理论平均 ×${stats.ergoMean}，但 ${stats.ergoLose}% 的人亏钱

章节：
${chapters.join("\n")}

⚠ 风险提示：本视频仅为概率知识科普，所有策略与数据均为教学用的简化模型和模拟结果，
不构成任何投资建议。期货、杠杆及股票交易风险极高，可能损失全部本金。

#交易 #期望值 #大数法则 #仓位管理 #交易心理
\`\`\`

## 标签

交易, 期货, 股票, 期望值, 正期望, 大数法则, 仓位管理, 凯利公式, 交易心理, 交易纪律, 蒙特卡洛, 概率, 风险管理

## 字幕

上传 \`subtitles.zh-Hans.srt\`，语言选“中文（简体）”。画面里已烧录同样的字幕，这份用于 YouTube 的 CC 字幕和自动翻译。

## 缩略图

渲染：\`npx remotion still ExpectancyThumbnail publish/expectancy/thumbnail.png\`（1280×720）
`;
writeFileSync(join(out, "youtube.md"), md, "utf-8");
console.log(`wrote ${cues.length} subtitles and youtube.md to ${out}`);
console.log(chapters.join("\n"));
