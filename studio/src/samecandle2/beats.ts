// Every annotation in the film, on one timeline. The HUD draws from this list and scripts/samecandle2-timing
// prints the timing report from it, so what is checked is exactly what is drawn.
//
// Timing rules (the report checks every one):
//   - an annotation tied to a keyword starts 4–8 frames before the voice reaches it (default 6)
//   - fully drawn, a plain annotation stays at least 24 frames, a card at least 36
//   - layout changes start at least 18 frames after the last line of the shot ends (director.ts T)
import { E, Lc } from "./cue";
import { HERO, HERO_BAR, LANES, MID, RES_HI, RES_LO, BASE_HI, BASE_LO, changePct, volRatio, avgVol, type LaneId } from "./data";
import { T, TR } from "./director";

export type Pt = [number, number]; // [bar index, price]
type Common = {
  id: string;
  a: number; // first frame
  b: number; // last frame (fade-out ends here)
  kw?: [string, number]; // the word it waits for: [line id, char index]
  card?: boolean; // complex card: 36-frame minimum
  inF?: number; // draw-in frames (default 9)
  lane?: LaneId;
  layer: "main" | "aux";
};
export type Beat = Common &
  (
    | { kind: "marker"; lane: LaneId; at: Pt; text: string; sub?: string; dx: number; dy: number; tone?: Tone }
    | { kind: "box"; lane: LaneId; i0: number; i1: number; p0: number; p1: number; text: string; side: "top" | "bottom"; tone?: Tone; dashed?: boolean }
    | { kind: "hline"; lane: LaneId; p: number; text: string; tone?: Tone; i0?: number; side?: "above" | "below"; vol?: boolean }
    | { kind: "band"; lane: LaneId; p0: number; p1: number; i0: number; i1: number; grow?: [number, number]; text: string; text2?: string; at2?: number }
    | { kind: "arrow"; lane: LaneId; from: Pt; to: Pt; text?: string; tone?: Tone }
    | { kind: "bracket"; lane: LaneId; i: number; p0: number; p1: number; text: string; side: "left" | "right"; mid?: boolean; tone?: Tone }
    | { kind: "fill"; lane: LaneId; i: number; p0: number; p1: number; text: string; sub?: string }
    | { kind: "card"; lane: LaneId; at: Pt; x: number; y: number; w: number; title: string; lines: { t: string; at: number }[] }
    | { kind: "chip"; lane: LaneId; lines: { t: string; at: number }[] }
    | { kind: "ratio"; lane: LaneId; value: string; word: string }
    | { kind: "stamp"; lane: LaneId; text: string }
    | { kind: "cond"; lane: LaneId; k: number; label: string; value: string }
    | { kind: "condHead"; lane: LaneId }
    | { kind: "result"; lane: LaneId }
    | { kind: "unknown"; lane: LaneId }
    | { kind: "answer"; lane: LaneId }
  );
export type Tone = "gold" | "white" | "up" | "down" | "warn";

const at = (line: string, char: number, off = -6) => Lc(line, char) + off;
const kw = (line: string, char: number): [string, number] => [line, char];
const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(1)}%`;
const times = (x: number) => `×${x.toFixed(1)}`;
const bar = (id: LaneId, i: number) => LANES[id][i];
const LIDS: LaneId[] = ["A", "B", "C"];

// ---------------------------------------------------------------- derived facts (all from data.ts)
const A_PULL = [1, 2, 3, 4, 5].map((k) => HERO + k).reduce((m, i) => (bar("A", i).l < bar("A", m).l ? i : m), HERO + 1);
const B_RALLY = (bar("B", HERO - 1).c / bar("B", 0).c - 1) * 100;
const B_NEXT = bar("B", HERO + 1);
const C_NEXT = bar("C", HERO + 1);
const C_BREAK = HERO + 6; // first close back under the open (99.3)
const ERASED = ((HERO_BAR.c - B_NEXT.c) / (HERO_BAR.c - HERO_BAR.o)) * 100;
const last = (id: LaneId) => LANES[id].length - 1;
export const FACTS = { A_PULL, B_RALLY, ERASED, C_BREAK, base: 28, rally: HERO };
export const NAME: Record<LaneId, string> = { A: "起飞", B: "见顶", C: "打回原形" };
export const PCT: Record<LaneId, string> = { A: pct(changePct("A")), B: pct(changePct("B")), C: pct(changePct("C")) };
export const RATIO: Record<LaneId, string> = { A: times(volRatio("A")), B: times(volRatio("B")), C: times(volRatio("C")) };
export const AVG: Record<LaneId, number> = { A: avgVol("A"), B: avgVol("B"), C: avgVol("C") };

// ---------------------------------------------------------------- hook
const HOOK_OUT = E("rewind") + 20;
const hook: Beat[] = [
  { id: "hookArrowA", kind: "arrow", lane: "A", layer: "aux", a: E("laneA") + 9, b: HOOK_OUT, from: [HERO + 2, 112], to: [last("A"), 133], tone: "up" },
  { id: "hookTurnA", kind: "marker", lane: "A", layer: "main", a: E("laneA") + 3, b: HOOK_OUT, kw: kw("h2", 5), at: [A_PULL, bar("A", A_PULL).l], text: "回踩不破", dx: 34, dy: 64 },
  { id: "hookResA", kind: "result", lane: "A", layer: "aux", a: E("laneA") + 15, b: T.solo },
  { id: "hookArrowB", kind: "arrow", lane: "B", layer: "aux", a: E("laneB") + 7, b: HOOK_OUT, from: [HERO + 3, 101], to: [last("B"), 80], tone: "down" },
  { id: "hookTurnB", kind: "marker", lane: "B", layer: "main", a: E("laneB") + 0, b: HOOK_OUT, kw: kw("h2", 13), at: [HERO + 1, B_NEXT.h], text: "次日见顶", dx: 40, dy: -40 },
  { id: "hookResB", kind: "result", lane: "B", layer: "aux", a: E("laneB") + 13, b: T.solo },
  { id: "hookArrowC", kind: "arrow", lane: "C", layer: "aux", a: E("laneC") + 9, b: HOOK_OUT, from: [HERO + 3, 102], to: [last("C"), 90], tone: "down" },
  { id: "hookTurnC", kind: "marker", lane: "C", layer: "main", a: E("laneC") + 1, b: HOOK_OUT, kw: kw("h3", 5), at: [HERO + 1, C_NEXT.h], text: "冲高被拒", dx: 40, dy: -40 },
  { id: "hookResC", kind: "result", lane: "C", layer: "aux", a: E("laneC") + 15, b: T.solo },
];

// ---------------------------------------------------------------- why
const Q_AT = at("w3", 5);
const why: Beat[] = [
  {
    id: "whyCard",
    kind: "card",
    lane: "B",
    layer: "main",
    card: true,
    a: E("result"),
    b: Q_AT + 6,
    kw: kw("w2", 9),
    at: [HERO, HERO_BAR.c],
    x: 544,
    y: 852,
    w: 500,
    title: "大阳线 = 一个结果",
    lines: [{ t: "这段时间里，买方赢了", at: at("w2", 14) }],
  },
  ...LIDS.map((id): Beat => ({ id: `whyBody${id}`, kind: "bracket", lane: id, layer: "aux", a: at("w2", 18), b: Q_AT + 6, kw: kw("w2", 18), i: HERO, p0: HERO_BAR.o, p1: HERO_BAR.c, text: "+8%", side: "left" })),
  ...LIDS.map((id): Beat => ({ id: `whyQ${id}`, kind: "unknown", lane: id, layer: "aux", a: Q_AT, b: T.solo, kw: kw("w3", 5) })),
];

// ---------------------------------------------------------------- 01 position
const pos: Beat[] = [
  { id: "posHeroA", kind: "marker", lane: "A", layer: "main", a: at("p1", 3), b: E("posA"), kw: kw("p1", 3), at: [HERO, HERO_BAR.h], text: "这根大阳线", dx: -60, dy: -110 },
  { id: "posBaseA", kind: "box", lane: "A", layer: "aux", a: at("p2", 0), b: T.soloB, kw: kw("p2", 0), i0: 12, i1: HERO - 1, p0: BASE_LO, p1: BASE_HI, text: `横盘 ${FACTS.base} 根`, side: "bottom" },
  { id: "posBreakA", kind: "marker", lane: "A", layer: "main", a: E("posA"), b: T.soloB, kw: kw("p2", 7), at: [HERO, BASE_HI], text: "第一次突破", sub: "横盘上沿 100", dx: -230, dy: -150, tone: "gold" },
  { id: "posTrendA", kind: "arrow", lane: "A", layer: "aux", a: E("posA2"), b: T.soloB, kw: kw("p2", 15), from: [HERO + 2, 113], to: [last("A"), 134], text: `新趋势起点 ${PCT.A}`, tone: "up" },

  { id: "posRallyB", kind: "arrow", lane: "B", layer: "aux", a: T.soloB + TR + 2, b: T.soloC, from: [0, 57.5], to: [HERO - 1, 96], text: `连涨 ${FACTS.rally} 根 +${B_RALLY.toFixed(0)}%`, tone: "white" },
  { id: "posHeroB", kind: "marker", lane: "B", layer: "main", a: at("p3", 8), b: at("p3", 16), kw: kw("p3", 8), at: [HERO, HERO_BAR.h], text: "高位再拉大阳", dx: -300, dy: -40 },
  {
    id: "posCardB",
    kind: "card",
    lane: "B",
    layer: "main",
    card: true,
    a: at("p3", 16),
    b: T.soloC,
    kw: kw("p3", 16),
    at: [HERO, HERO_BAR.h],
    x: 92,
    y: 520,
    w: 520,
    title: "最后一批买家",
    lines: [{ t: "冲了进来 → 买盘见底", at: E("posB2") }],
  },
  { id: "posFallB", kind: "arrow", lane: "B", layer: "aux", a: E("posB2"), b: T.soloC, kw: kw("p3", 20), from: [HERO + 3, 103], to: [last("B"), 82], text: `见顶 ${PCT.B}`, tone: "down" },

  { id: "posDownC", kind: "arrow", lane: "C", layer: "aux", a: T.soloC + TR + 2, b: at("p4", 8), from: [12, 113], to: [HERO - 6, 91], text: "下跌途中", tone: "white" },
  { id: "posBandC", kind: "band", lane: "C", layer: "aux", a: at("p4", 6), b: T.vol, kw: kw("p4", 6), p0: RES_LO, p1: RES_HI, i0: 0, i1: 10, grow: [at("p4", 8), at("p4", 8) + 12], text: "前期支撑", text2: "支撑变压力 108–111", at2: at("p4", 8) },
  { id: "posHitC", kind: "marker", lane: "C", layer: "main", a: E("posC2"), b: T.vol, kw: kw("p4", 8), at: [HERO + 1, C_NEXT.h], text: "撞上压力", sub: "被打回", dx: 60, dy: -150 },
  {
    id: "posCardC",
    kind: "card",
    lane: "C",
    layer: "main",
    card: true,
    a: at("p4", 13),
    b: T.vol,
    kw: kw("p4", 13),
    at: [HERO, HERO_BAR.c],
    x: 84,
    y: 1030,
    w: 420,
    title: "空头在回补",
    lines: [{ t: "不是新买盘", at: at("p4", 13) + 10 }],
  },
];

// ---------------------------------------------------------------- 02 volume
const volW = at("v1", 3);
const VOL_OUT = T.holdA;
const vol: Beat[] = [
  ...LIDS.map((id): Beat => ({ id: `volAvg${id}`, kind: "hline", lane: id, layer: "aux", a: Math.max(volW, T.vol + TR + 26), b: VOL_OUT, p: AVG[id], vol: true, text: id === "A" ? "前20根均量" : "", tone: "white" })),
  { id: "volRatioA", kind: "ratio", lane: "A", layer: "aux", a: E("volA"), b: VOL_OUT, kw: kw("v2", 3), value: RATIO.A, word: "放量" },
  { id: "volChipA", kind: "chip", lane: "A", layer: "main", a: at("v2", 9), b: VOL_OUT, kw: kw("v2", 9), lines: [{ t: "新资金进场", at: at("v2", 9) }, { t: "高处继续买", at: E("volA2") }] },
  { id: "volRatioB", kind: "ratio", lane: "B", layer: "aux", a: E("volB"), b: VOL_OUT, kw: kw("v3", 7), value: RATIO.B, word: "天量" },
  { id: "volChipB", kind: "chip", lane: "B", layer: "main", a: E("volB2"), b: VOL_OUT, kw: kw("v3", 13), lines: [{ t: "买盘一次", at: E("volB2") }, { t: "被用完", at: E("volB2") + 12 }] },
  { id: "volRatioC", kind: "ratio", lane: "C", layer: "aux", a: E("volC"), b: VOL_OUT, kw: kw("v4", 3), value: RATIO.C, word: "缩量" },
  { id: "volChipC", kind: "chip", lane: "C", layer: "main", a: E("volC2"), b: VOL_OUT, kw: kw("v4", 13), lines: [{ t: "没多少人跟", at: E("volC2") }] },
];

// ---------------------------------------------------------------- 03 hold
const settle = (t: number) => t + TR;
const hold: Beat[] = [
  { id: "holdOpenA", kind: "hline", lane: "A", layer: "aux", a: at("c1", 8), b: T.holdB, kw: kw("c1", 8), p: HERO_BAR.o, i0: HERO - 0.5, text: "开 100", tone: "white", side: "below" },
  { id: "holdCloseA", kind: "hline", lane: "A", layer: "aux", a: at("c1", 8) + 8, b: T.holdB, p: HERO_BAR.c, i0: HERO - 0.5, text: "收 108", tone: "white" },
  { id: "holdBodyA", kind: "bracket", lane: "A", layer: "main", a: at("c2", 7), b: E("holdGrowA"), kw: kw("c2", 7), i: HERO, p0: HERO_BAR.o, p1: HERO_BAR.c, text: "实体的一半", side: "left", mid: true, tone: "gold" },
  { id: "holdMidA", kind: "hline", lane: "A", layer: "aux", a: E("laser"), b: T.holdB, kw: kw("c2", 12), p: MID, text: "一半线 104", tone: "gold" },
  { id: "holdPullA", kind: "marker", lane: "A", layer: "aux", a: at("c3", 6), b: T.holdB, kw: kw("c3", 6), at: [A_PULL, bar("A", A_PULL).l], text: "回踩不破", dx: 70, dy: 120 },
  { id: "holdChipA", kind: "chip", lane: "A", layer: "main", a: E("holdA"), b: T.holdB, kw: kw("c3", 11), lines: [{ t: "守在线上 → 买方掌控", at: E("holdA") }] },

  { id: "holdMidB", kind: "hline", lane: "B", layer: "aux", a: settle(T.holdB), b: T.holdC, p: MID, text: "一半线 104", tone: "gold" },
  { id: "holdBreakB", kind: "marker", lane: "B", layer: "aux", a: E("breakB") - 2, b: T.holdC, kw: kw("c4", 2), at: [HERO + 1, B_NEXT.c], text: `次日收 ${B_NEXT.c.toFixed(1)}`, sub: "跌破一半", dx: 70, dy: 150, tone: "down" },
  { id: "holdErasedB", kind: "fill", lane: "B", layer: "main", a: at("c4", 7), b: T.holdC, kw: kw("c4", 7), i: HERO, p0: B_NEXT.c, p1: HERO_BAR.c, text: `涨幅被抹掉 ${ERASED.toFixed(0)}%`, sub: "108 → 103.5" },

  { id: "holdMidC", kind: "hline", lane: "C", layer: "aux", a: settle(T.holdC), b: T.recap, p: MID, text: "一半线 104", tone: "gold" },
  { id: "holdOpenC", kind: "hline", lane: "C", layer: "aux", a: at("c5", 3), b: T.recap, kw: kw("c5", 3), p: HERO_BAR.o, text: "开盘价 100", tone: "white", side: "below" },
  { id: "holdBreakC", kind: "marker", lane: "C", layer: "main", a: E("breakC"), b: T.recap, kw: kw("c5", 8), at: [C_BREAK, bar("C", C_BREAK).c], text: `收 ${bar("C", C_BREAK).c.toFixed(1)}`, sub: "跌回开盘价下方", dx: -40, dy: 170, tone: "down" },
  { id: "holdTrapC", kind: "stamp", lane: "C", layer: "main", a: E("trap") - 6, b: T.recap, inF: 5, kw: kw("c5", 16), text: "陷阱" },
];

// ---------------------------------------------------------------- recap
const RECAP_OUT = T.end;
const COND: Record<LaneId, { v: string[]; line: string; chars: number[] }> = {
  A: { v: ["低位", "放量", "守住一半"], line: "r2", chars: [4, 7, 10] },
  B: { v: ["高位", "天量", "次日跌破"], line: "r3", chars: [4, 7, 10] },
  C: { v: ["压力位", "缩量", "没人接"], line: "r4", chars: [5, 9, 12] },
};
export const COND_LABELS = ["位置", "量能", "承接"];
const recap: Beat[] = [
  ...LIDS.map((id): Beat => ({ id: `recRes${id}`, kind: "result", lane: id, layer: "aux", a: settle(T.recap), b: T.end + 40 })),
  ...LIDS.map((id): Beat => ({ id: `recHead${id}`, kind: "condHead", lane: id, layer: "aux", a: at("r1", 5), b: RECAP_OUT, kw: kw("r1", 5) })),
  ...LIDS.flatMap((id) =>
    COND[id].v.map((v, k): Beat => ({ id: `rec${id}${k}`, kind: "cond", lane: id, layer: "main", a: at(COND[id].line, COND[id].chars[k]), b: RECAP_OUT, kw: kw(COND[id].line, COND[id].chars[k]), k, label: COND_LABELS[k], value: v })),
  ),
];

// ---------------------------------------------------------------- end
const end: Beat[] = LIDS.map((id): Beat => ({ id: `endAns${id}`, kind: "answer", lane: id, layer: "aux", a: E("answer"), b: 99999, kw: kw("e3", 0) }));

export const BEATS: Beat[] = [...hook, ...why, ...pos, ...vol, ...hold, ...recap, ...end];

/** visibility of a beat at frame f: [drawn 0..1, alpha 0..1] */
export const OUT_F = 6;
export const IN_F = 9;
export const vis = (b: Beat, f: number): [number, number] => {
  const inF = b.inF ?? IN_F;
  const k = Math.min(1, Math.max(0, (f - b.a) / inF));
  const o = Math.min(1, Math.max(0, (b.b - f) / OUT_F));
  return [k, Math.min(Math.min(1, k * 2.2), o)];
};

/** Chapter headers (fixed in the top safe area). */
export const CHAPTERS = [
  { a: 8, b: E("rewind") - 6, n: "", t: "同一根大阳线", s: "三种图 · 三种命运" },
  { a: E("rewind") - 6, b: E("three") - 2, n: "", t: "为什么？", s: "同样开 100、收 108" },
  { a: E("three") - 2, b: T.solo, n: "", t: "真正决定后面的", s: "", three: true },
  { a: T.solo, b: T.vol, n: "01", t: "位置", s: "它出现在哪里" },
  { a: T.vol, b: T.holdA, n: "02", t: "量能", s: "谁在买" },
  { a: T.holdA, b: T.recap, n: "03", t: "承接", s: "之后有没有人接" },
  { a: T.recap, b: T.end, n: "", t: "复盘", s: "三种结局 · 三个条件" },
];
export const THREE_ITEMS = [
  { n: "01", t: "位置", at: at("w3", 14, -6) },
  { n: "02", t: "量能", at: at("w3", 14, 6) },
  { n: "03", t: "承接", at: at("w3", 14, 18) },
];
export const END_TEXT = {
  l1: { t: "大阳线不是答案", a: at("e1", 3) },
  l2: { t: "而是一个问题", a: at("e2", 2) },
  l3: { t: "答案，写在它后面的K线里", a: E("answer") },
  note: { t: "数据为示意 · 教育科普，不构成投资建议", a: E("answer") + 30 },
};

export const allBeatText = () => JSON.stringify({ BEATS, CHAPTERS, THREE_ITEMS, END_TEXT, NAME, PCT, RATIO, COND_LABELS });
