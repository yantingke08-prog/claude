// Single source of truth: narration, captions, chapter timing, keyword colours, sound cues.
// Every chapter's visuals are keyed to line starts computed here, so when the real voice-over
// arrives, adjusting FRAMES_PER_CHAR / per-line `pause` re-times picture and captions together.
import type { Tone } from "./theme";

export type Line = {
  t: string; // narration == caption text
  hi?: string[]; // words drawn in `tone`
  tone?: Tone;
  pause?: number; // extra frames of silence after the line
};

export type SfxKind = "draw" | "tick" | "confirm" | "fail" | "stamp";
export type Cue = [line: number, frac: number, kind: SfxKind];

export type ChapterId =
  | "hook"
  | "delta"
  | "mechanism"
  | "after"
  | "evidence"
  | "risk"
  | "mind"
  | "questions"
  | "layers"
  | "end";

type ChapterDef = {
  id: ChapterId;
  label: string; // shown in the header next to the logo
  slate?: { big: string; small: string; tone: Tone }; // full-screen chapter keyword (sparingly)
  lead?: number; // frames before the first line
  tail?: number; // frames after the last line
  lines: Line[];
  sfx?: Cue[];
};

export const FRAMES_PER_CHAR = 5.6; // ≈ 320 汉字/分钟 at 30fps
const DEFAULT_PAUSE = 9;

const DEFS: ChapterDef[] = [
  {
    id: "hook",
    label: "01 · 反差",
    lead: 18,
    lines: [
      { t: "同样是一大片主动卖单砸下去，", pause: 6 },
      { t: "左边，价格直接破位；", hi: ["直接破位"], tone: "red" },
      { t: "右边，却停在同一个位置，再也砸不动。", hi: ["停在同一个位置"], tone: "amber", pause: 12 },
      { t: "同样的卖压，为什么是两种结局？", hi: ["两种结局"], tone: "amber", pause: 18 },
    ],
    sfx: [[0, 0.05, "draw"], [1, 0.1, "fail"], [2, 0.3, "tick"], [3, 0.4, "stamp"]],
  },
  {
    id: "delta",
    label: "02 · Delta ≠ 方向",
    slate: { big: "Delta ≠ 方向", small: "主动成交压力，不是价格结果", tone: "amber" },
    lead: 44,
    lines: [
      { t: "先说 Delta：主动买减去主动卖的差值。", hi: ["Delta"], tone: "cyan" },
      { t: "它只说明谁更着急，不说明价格往哪走。", hi: ["谁更着急"], tone: "amber", pause: 14 },
      { t: "大卖单打下去，价格立刻破位，", hi: ["立刻破位"], tone: "red" },
      { t: "说明下方没人接，这是卖方控制。", hi: ["没人接"], tone: "red", pause: 14 },
      { t: "可同样的卖压，价格却不创新低，", hi: ["不创新低"], tone: "amber" },
      { t: "说明下面可能有限价买单在承接。", hi: ["承接"], tone: "green", pause: 14 },
    ],
    sfx: [[0, 0.1, "tick"], [2, 0.3, "fail"], [4, 0.2, "draw"], [5, 0.5, "tick"]],
  },
  {
    id: "mechanism",
    label: "03 · 吸收的机制",
    lead: 16,
    lines: [
      { t: "砸盘的是主动盘，决定方向和紧迫程度；", hi: ["主动盘"], tone: "red" },
      { t: "接盘的是响应盘，提供位置和承接。", hi: ["响应盘"], tone: "green", pause: 12 },
      { t: "DOM 上，买单被吃掉，又一次次补回来；", hi: ["补回来"], tone: "green" },
      { t: "Footprint 上，成交挤在一条很窄的价格带。", hi: ["很窄的价格带"], tone: "amber", pause: 12 },
      { t: "卖单在打，价格不走，这就是吸收。", hi: ["吸收"], tone: "amber", pause: 16 },
      { t: "但别急着交易，先看大单之后价格有没有走。", hi: ["价格有没有走"], tone: "amber", pause: 14 },
    ],
    sfx: [[0, 0.05, "draw"], [2, 0.2, "tick"], [3, 0.15, "draw"], [4, 0.6, "stamp"]],
  },
  {
    id: "after",
    label: "04 · 吸收之后",
    lead: 20,
    lines: [
      { t: "吸收只是线索，不是扳机。", hi: ["线索", "扳机"], tone: "amber", pause: 14 },
      { t: "有效的路径：价格站回吸收区上沿，", hi: ["站回"], tone: "green" },
      { t: "回踩不破，Delta 转正，卖压明显衰减。", hi: ["回踩不破"], tone: "green" },
      { t: "证据链走完，这才叫确认。", hi: ["确认"], tone: "green", pause: 16 },
      { t: "失效的路径：价格跌破吸收区下沿，", hi: ["跌破"], tone: "red" },
      { t: "承接被吃穿，原来的吸收逻辑作废。", hi: ["作废"], tone: "red", pause: 14 },
      { t: "两种结果都正常。没有确认，就不交易。", hi: ["没有确认，就不交易"], tone: "amber", pause: 18 },
    ],
    sfx: [[1, 0.2, "draw"], [2, 0.5, "tick"], [3, 0.3, "confirm"], [4, 0.2, "draw"], [5, 0.3, "fail"], [6, 0.55, "stamp"]],
  },
  {
    id: "evidence",
    label: "05 · 三个证据",
    lead: 16,
    lines: [
      { t: "所以做吸收，至少要有三个证据。", hi: ["三个证据"], tone: "amber", pause: 12 },
      { t: "第一，关键位置：POC、价值区边缘、前高前低。", hi: ["关键位置"], tone: "cyan", pause: 12 },
      { t: "第二，订单流异常：DOM 持续成交，价格停住，", hi: ["订单流异常"], tone: "amber" },
      { t: "Footprint 里，成交集中在一条价格带。", pause: 12 },
      { t: "第三，价格确认：站回结构、回踩不破，", hi: ["价格确认"], tone: "green" },
      { t: "或者跌破之后快速收回。", pause: 14 },
      { t: "三个缺一个，只能叫观察，不叫交易。", hi: ["观察"], tone: "amber", pause: 18 },
    ],
    sfx: [[1, 0.1, "tick"], [2, 0.1, "tick"], [4, 0.1, "tick"], [6, 0.05, "confirm"], [6, 0.55, "fail"]],
  },
  {
    id: "risk",
    label: "06 · 风险与失效",
    lead: 16,
    lines: [
      { t: "止损放在结构外两到三个最小跳动，", hi: ["两到三个最小跳动"], tone: "red" },
      { t: "具体跳数，按品种调整。", pause: 12 },
      { t: "没有失效条件的交易，不是交易。", hi: ["失效条件"], tone: "red", pause: 14 },
      { t: "低量环境，不追加仓位。", hi: ["不追加仓位"], tone: "amber", pause: 12 },
      { t: "吸收失败是正常结果，不是意外。", hi: ["正常结果"], tone: "amber", pause: 18 },
    ],
    sfx: [[0, 0.1, "draw"], [2, 0.3, "stamp"], [4, 0.2, "fail"]],
  },
  {
    id: "mind",
    label: "07 · 人性",
    slate: { big: "看懂 ≠ 做到", small: "吸收发生在你最想追的时候", tone: "red" },
    lead: 44,
    lines: [
      { t: "为什么看懂了，还是做不好？", pause: 12 },
      { t: "大单越猛，你越想追；", hi: ["越想追"], tone: "red" },
      { t: "价格越不动，你越容易幻想反转。", hi: ["幻想反转"], tone: "amber", pause: 14 },
      { t: "你缺的不是指标，是一套实时能执行的分支。", hi: ["实时能执行的分支"], tone: "cyan", pause: 16 },
    ],
    sfx: [[1, 0.1, "tick"], [3, 0.4, "draw"]],
  },
  {
    id: "questions",
    label: "08 · 四个问题",
    lead: 16,
    lines: [
      { t: "看到大单，先问四句话。", pause: 12 },
      { t: "位置在哪？", hi: ["位置"], tone: "cyan", pause: 14 },
      { t: "有没有真实成交？", hi: ["真实成交"], tone: "amber", pause: 14 },
      { t: "价格有没有走？", hi: ["价格"], tone: "green", pause: 14 },
      { t: "失效在哪？", hi: ["失效"], tone: "red", pause: 16 },
      { t: "四个问题答不上来，就不确认、不交易。", hi: ["不确认、不交易"], tone: "amber", pause: 18 },
    ],
    sfx: [[1, 0.05, "tick"], [2, 0.05, "tick"], [3, 0.05, "tick"], [4, 0.05, "tick"], [5, 0.5, "stamp"]],
  },
  {
    id: "layers",
    label: "09 · 四层信息",
    lead: 16,
    lines: [
      { t: "最后，记住四层信息：", pause: 10 },
      { t: "Delta 告诉你谁着急，", hi: ["谁着急"], tone: "red" },
      { t: "DOM 告诉你谁在接，", hi: ["谁在接"], tone: "green" },
      { t: "Footprint 告诉你钱堆在哪，", hi: ["钱堆在哪"], tone: "amber" },
      { t: "价格告诉你谁赢了。", hi: ["谁赢了"], tone: "cyan", pause: 16 },
      { t: "订单流不是猜反转，是等市场亮出底牌。", hi: ["亮出底牌"], tone: "amber", pause: 16 },
    ],
    sfx: [[1, 0.05, "tick"], [2, 0.05, "tick"], [3, 0.05, "tick"], [4, 0.05, "confirm"]],
  },
  {
    id: "end",
    label: "LVP订单流",
    lead: 20,
    tail: 84, // last ~2.8 s hold still: no sudden cut to black
    lines: [
      { t: "吸收不是反转，", hi: ["吸收不是反转"], tone: "amber", pause: 8 },
      { t: "吸收之后，才是交易。", hi: ["吸收之后"], tone: "amber" },
    ],
    sfx: [[0, 0.0, "stamp"]],
  },
];

// latin letters/digits read faster than 汉字; punctuation is silent
export const spokenUnits = (s: string) =>
  Array.from(s).reduce((n, ch) => {
    if (/[，。；：？！、—…·\s]/.test(ch)) return n;
    if (/[A-Za-z0-9]/.test(ch)) return n + 0.45;
    return n + 1;
  }, 0);

export const lineFrames = (l: Line) => Math.round(spokenUnits(l.t) * FRAMES_PER_CHAR) + (l.pause ?? DEFAULT_PAUSE);

export type Chapter = ChapterDef & {
  start: number; // global frame
  dur: number;
  lineStart: number[]; // local frames
  lineDur: number[];
  speechDur: number[]; // spoken part only (excl. pause)
};

const build = (): { chapters: Chapter[]; total: number } => {
  let cursor = 0;
  const chapters = DEFS.map((d) => {
    const lead = d.lead ?? 16;
    const tail = d.tail ?? 14;
    let t = lead;
    const lineStart: number[] = [];
    const lineDur: number[] = [];
    const speechDur: number[] = [];
    for (const l of d.lines) {
      lineStart.push(t);
      const f = lineFrames(l);
      lineDur.push(f);
      speechDur.push(Math.round(spokenUnits(l.t) * FRAMES_PER_CHAR));
      t += f;
    }
    const dur = t + tail;
    const ch: Chapter = { ...d, start: cursor, dur, lineStart, lineDur, speechDur };
    cursor += dur;
    return ch;
  });
  return { chapters, total: cursor };
};

const BUILT = build();
export const CHAPTERS = BUILT.chapters;
export const TOTAL_FRAMES = BUILT.total;
export const chapter = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;

// local frame helper: start of line i, plus `frac` of its spoken duration
export const at = (ch: Chapter, i: number, frac = 0) => ch.lineStart[i] + Math.round(ch.speechDur[i] * frac);

export const SFX = CHAPTERS.flatMap((ch) =>
  (ch.sfx ?? []).map(([i, frac, kind]) => ({ frame: ch.start + at(ch, i, frac), kind })),
);

export const CAPTIONS = CHAPTERS.flatMap((ch) =>
  ch.lines.map((l, i) => ({
    from: ch.start + ch.lineStart[i],
    // caption stays through the pause so it never blinks between lines
    to: ch.start + ch.lineStart[i] + ch.lineDur[i],
    line: l,
    chapter: ch.id,
  })),
);
