// Every annotation in v3, on one timeline. Each one is bound to a chart that is on screen at that moment
// (the HUD draws from this list; scripts/samecandle3-timing.ts checks it: keyword lead, minimum hold,
// chart visible, anchored bar already drawn, line length, one main card at a time).
import { E, Lc } from "./cue";
import { HERO, HERO_BAR, LANES, MID, POS, POSMAP, avgVol, changePct, volRatio, type LaneId } from "./data";
import { CUT, IDS, type Chart, HOLD_CHART, POS_CHART, WHY, holdPost, rowChart, rowPost, volBars, volPost, volPrice } from "./layout";

export type ChartKey = "rowA" | "rowB" | "rowC" | "why" | "pos" | "volA" | "volB" | "volC" | "vbarA" | "vbarB" | "vbarC" | "hold";
export const chartOf = (k: ChartKey): Chart => {
  if (k.startsWith("row")) return rowChart(IDS.indexOf(k.slice(-1) as LaneId));
  if (k.startsWith("vbar")) return volBars(IDS.indexOf(k.slice(-1) as LaneId));
  if (k.startsWith("vol")) return volPrice(IDS.indexOf(k.slice(-1) as LaneId));
  return { why: WHY, pos: POS_CHART, hold: HOLD_CHART }[k as "why" | "pos" | "hold"];
};
/** the scene each chart belongs to (an annotation may only exist while its chart is on screen) */
export const sceneOfChart = (k: ChartKey): [number, number] => {
  if (k === "why") return [CUT.why, CUT.pos];
  if (k === "pos") return [CUT.pos, CUT.vol];
  if (k.startsWith("vol") || k.startsWith("vbar")) return [CUT.vol, CUT.hold];
  if (k === "hold") return [CUT.hold, CUT.recap];
  return [CUT.rows, 99999]; // rows: opening (until the why cut) and again from the recap cut
};
/** is bar i of this chart already drawn at frame f? (annotations may not point at bars that are not there) */
export const barShown = (k: ChartKey, lane: LaneId | undefined, i: number, f: number) => {
  if (i <= HERO) return true;
  const n = i - HERO;
  if (k.startsWith("row")) return f >= CUT.recap || rowPost(k.slice(-1) as LaneId, f) >= n;
  if (k.startsWith("vol") || k.startsWith("vbar")) return volPost(k.slice(-1) as LaneId, f) >= n;
  if (k === "hold") return holdPost(lane ?? "A", f) >= n;
  return true;
};

export type Pt = [number, number]; // [bar index, price]
export type Tone = "gold" | "white" | "up" | "down" | "warn";
type Common = {
  id: string;
  ch: ChartKey;
  a: number;
  b: number;
  kw?: [string, number];
  card?: boolean; // complex card (36-frame minimum)
  main?: boolean; // main explanation (at most one on screen)
  inF?: number;
  lane?: LaneId;
  anchors?: number[]; // bar indexes it points at (checked against what is drawn)
};
export type Beat = Common &
  (
    | { kind: "marker"; at: Pt; text: string; sub?: string; dx: number; dy: number; tone?: Tone }
    | { kind: "ring"; at: Pt; label?: string; tone?: Tone }
    | { kind: "box"; i0: number; i1: number; p0: number; p1: number; text: string; side: "top" | "bottom"; tone?: Tone }
    | { kind: "hline"; p: number; text: string; tone?: Tone; i0?: number; side?: "above" | "below"; vol?: boolean; strong?: boolean }
    | { kind: "band"; p0: number; p1: number; i0: number; text: string }
    | { kind: "arrow"; from: Pt; to: Pt; text?: string; tone?: Tone; labelAt?: "start" | "end" }
    | { kind: "bracket"; i: number; p0: number; p1: number; text: string; side: "left" | "right"; mid?: boolean; tone?: Tone }
    | { kind: "fill"; i: number; p0: number; p1: number; text: string; sub?: string }
    | { kind: "card"; at: Pt; x: number; y: number; w: number; title: string; lines: { t: string; at: number }[] }
    | { kind: "three"; x: number; y: number }
    | { kind: "chip"; x: number; y: number; align: "left" | "center" | "right"; lines: { t: string; at: number }[] }
    | { kind: "ratio"; value: string; word: string }
    | { kind: "stamp"; at: Pt; text: string }
    | { kind: "path"; lane: LaneId; n: number; text: string }
    | { kind: "cond"; k: number; value: string }
    | { kind: "condHead" }
    | { kind: "result" }
    | { kind: "unknown"; i0: number; text: string }
    | { kind: "answer" }
  );

const at = (line: string, char: number, off = -6) => Lc(line, char) + off;
const kw = (line: string, char: number): [string, number] => [line, char];
const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(1)}%`;
const times = (x: number) => `×${x.toFixed(1)}`;
const bar = (id: LaneId, i: number) => LANES[id][i];
const last = (id: LaneId) => LANES[id].length - 1;

// ---------------------------------------------------------------- facts (from data.ts)
const A_PULL = [1, 2, 3, 4, 5].map((k) => HERO + k).reduce((m, i) => (bar("A", i).l < bar("A", m).l ? i : m), HERO + 1);
const B_NEXT = bar("B", HERO + 1);
const C_NEXT = bar("C", HERO + 1);
const C_BREAK = HERO + 6;
const ERASED = ((HERO_BAR.c - B_NEXT.c) / (HERO_BAR.c - HERO_BAR.o)) * 100;
export const NAME: Record<LaneId, string> = { A: "起飞", B: "见顶", C: "打回原形" };
export const PCT: Record<LaneId, string> = { A: pct(changePct("A")), B: pct(changePct("B")), C: pct(changePct("C")) };
export const RATIO: Record<LaneId, string> = { A: times(volRatio("A")), B: times(volRatio("B")), C: times(volRatio("C")) };
export const COND_LABELS = ["位置", "量能", "承接"];
const [H1, H2, H3] = POS.hero;
const P = (i: number) => POSMAP[i];
const BASE_N = POS.base[1] - POS.base[0] + 1;
const RALLY_N = POS.rally[1] - POS.rally[0] + 1;

// ---------------------------------------------------------------- opening rows
const G = (id: LaneId) => ({ A: E("laneA"), B: E("laneB"), C: E("laneC") })[id];
const OPEN_OUT = CUT.why;
const opening: Beat[] = [
  { id: "openTurnA", ch: "rowA", kind: "marker", a: Lc("h2", 5), b: OPEN_OUT, kw: kw("h2", 5), anchors: [A_PULL], at: [A_PULL, bar("A", A_PULL).l], text: "回踩不破", dx: 26, dy: 74 },
  { id: "openResA", ch: "rowA", kind: "result", lane: "A", a: G("A") + 9, b: OPEN_OUT },
  { id: "openArrowA", ch: "rowA", kind: "arrow", a: G("A") + 11, b: OPEN_OUT, anchors: [HERO + 2], from: [HERO + 2, 113], to: [last("A"), 132], tone: "up" },
  { id: "openTurnB", ch: "rowB", kind: "marker", a: Lc("h2", 13, -4), b: OPEN_OUT, kw: kw("h2", 13), anchors: [HERO + 1], at: [HERO + 1, B_NEXT.h], text: "次日见顶", dx: 30, dy: -44 },
  { id: "openResB", ch: "rowB", kind: "result", lane: "B", a: G("B") + 9, b: OPEN_OUT },
  { id: "openArrowB", ch: "rowB", kind: "arrow", a: G("B") + 11, b: OPEN_OUT, anchors: [HERO + 3], from: [HERO + 3, 101], to: [last("B"), 81], tone: "down" },
  { id: "openTurnC", ch: "rowC", kind: "marker", a: Lc("h3", 5, -4), b: OPEN_OUT, kw: kw("h3", 5), anchors: [HERO + 1], at: [HERO + 1, C_NEXT.h], text: "冲高被拒", dx: 30, dy: -44 },
  { id: "openResC", ch: "rowC", kind: "result", lane: "C", a: G("C") + 9, b: OPEN_OUT },
  { id: "openArrowC", ch: "rowC", kind: "arrow", a: G("C") + 11, b: OPEN_OUT, anchors: [HERO + 3], from: [HERO + 3, 102], to: [last("C"), 90], tone: "down" },
];

// ---------------------------------------------------------------- why: one candle
const Q = at("w3", 5);
const why: Beat[] = [
  { id: "whyOpen", ch: "why", kind: "hline", a: CUT.why + 8, b: CUT.pos, p: HERO_BAR.o, text: "开 100", tone: "white", side: "below" },
  { id: "whyClose", ch: "why", kind: "hline", a: CUT.why + 14, b: CUT.pos, p: HERO_BAR.c, text: "收 108", tone: "white" },
  { id: "whyCard", ch: "why", kind: "card", main: true, card: true, a: E("result"), b: Q, kw: kw("w2", 9), at: [HERO, HERO_BAR.c], x: 580, y: 600, w: 400, title: "只是一个结果", lines: [{ t: "这段时间买方赢了", at: at("w2", 18) }] },
  { id: "whyBody", ch: "why", kind: "bracket", a: at("w2", 14), b: Q, kw: kw("w2", 14), i: HERO, p0: HERO_BAR.o, p1: HERO_BAR.c, text: "+8%", side: "left", tone: "gold" },
  { id: "whyNext", ch: "why", kind: "unknown", a: Q, b: CUT.pos, kw: kw("w3", 5), i0: HERO + 1, text: "接下来？" },
  { id: "whyThree", ch: "why", kind: "three", main: true, card: true, a: at("w3", 12), b: CUT.pos, kw: kw("w3", 12), x: 64, y: 1350 },
];
export const THREE_ITEMS = [
  { n: "01", t: "位置", at: at("w3", 14) },
  { n: "02", t: "量能", at: at("w3", 14, 8) },
  { n: "03", t: "承接", at: at("w3", 14, 22) },
];

// ---------------------------------------------------------------- 01 position: one map, three spots
const P2_OUT = Lc("p3", 0) + 4;
const P3_OUT = Lc("p4", 0) + 4;
const pos: Beat[] = [
  ...POS.hero.map((i, k): Beat => ({ id: `posRing${k}`, ch: "pos", kind: "ring", a: at("p1", 3), b: CUT.vol, kw: kw("p1", 3), anchors: [i], at: [i, P(i).c - 4], label: ["A", "B", "C"][k], tone: "gold" })),
  { id: "posBase", ch: "pos", kind: "box", a: at("p2", 0), b: P2_OUT, kw: kw("p2", 0), i0: POS.base[0], i1: POS.base[1], p0: POS.baseBox[0], p1: POS.baseBox[1], text: `横盘 ${BASE_N} 根`, side: "bottom" },
  { id: "posBreak", ch: "pos", kind: "marker", main: true, a: E("posA"), b: P2_OUT, kw: kw("p2", 7), anchors: [H1], at: [H1, P(H1).c], text: "第一次突破", dx: -40, dy: -170, tone: "gold" },
  { id: "posTrend", ch: "pos", kind: "arrow", a: at("p2", 15), b: P2_OUT, kw: kw("p2", 15), anchors: [H1 + 2], from: [H1 + 2, 118], to: [POS.shelf[0] - 1, 140], text: "新趋势起点", tone: "up", labelAt: "end" },

  { id: "posRally", ch: "pos", kind: "arrow", a: at("p3", 2), b: P3_OUT, kw: kw("p3", 2), anchors: [POS.rally[0]], from: [POS.rally[0], 103], to: [H2 - 2, 150], text: `连涨 ${RALLY_N} 根`, tone: "white", labelAt: "start" },
  { id: "posLate", ch: "pos", kind: "marker", main: true, a: at("p3", 7), b: E("posB"), kw: kw("p3", 7), anchors: [H2], at: [H2, P(H2).o], text: "高位再拉大阳", dx: -60, dy: 100 },
  { id: "posLast", ch: "pos", kind: "card", main: true, card: true, a: E("posB"), b: P3_OUT, kw: kw("p3", 16), at: [H2, P(H2).h], x: 120, y: 520, w: 470, title: "最后一批买家", lines: [{ t: "冲了进来", at: E("posB") + 10 }] },

  { id: "posDown", ch: "pos", kind: "arrow", a: at("p4", 2), b: E("posC"), kw: kw("p4", 2), anchors: [H2 + 2], from: [H2 + 2, 172], to: [H3 - 4, 124], text: "下跌途中", tone: "down", labelAt: "start" },
  { id: "posBand", ch: "pos", kind: "band", a: at("p4", 4), b: CUT.vol, kw: kw("p4", 4), anchors: [POS.shelf[0]], p0: POS.band[0], p1: POS.band[1], i0: POS.shelf[0], text: "前期支撑变压力" },
  { id: "posShort", ch: "pos", kind: "card", main: true, card: true, a: E("posC"), b: CUT.vol, kw: kw("p4", 13), at: [H3, P(H3).h], x: 540, y: 1160, w: 400, title: "空头在回补", lines: [{ t: "不是新买盘", at: E("posC") + 10 }] },
];

// ---------------------------------------------------------------- 02 volume: three columns
const vol: Beat[] = [
  ...IDS.map((id): Beat => ({ id: `volAvg${id}`, ch: `vbar${id}` as ChartKey, kind: "hline", a: E("volRise"), b: CUT.hold, kw: kw("v1", 4), p: avgVol(id), vol: true, text: id === "A" ? "前20根均量" : "", tone: "white" })),
  { id: "volRatioA", ch: "vbarA", kind: "ratio", lane: "A", a: E("volA"), b: CUT.hold, kw: kw("v2", 3), anchors: [HERO], value: RATIO.A, word: "放量" },
  { id: "volChipA", ch: "vbarA", kind: "chip", main: true, a: at("v2", 9), b: E("volB"), kw: kw("v2", 9), x: 44, y: 1330, align: "left", lines: [{ t: "新资金进场", at: at("v2", 9) }, { t: "高处继续买", at: E("volA2") }] },
  { id: "volRatioB", ch: "vbarB", kind: "ratio", lane: "B", a: E("volB"), b: CUT.hold, kw: kw("v3", 7), anchors: [HERO], value: RATIO.B, word: "天量" },
  { id: "volChipB", ch: "vbarB", kind: "chip", main: true, a: E("volB2"), b: E("volC"), kw: kw("v3", 13), x: 344, y: 1330, align: "left", lines: [{ t: "买盘一次", at: E("volB2") }, { t: "被用完", at: E("volB2") + 12 }] },
  { id: "volRatioC", ch: "vbarC", kind: "ratio", lane: "C", a: E("volC"), b: CUT.hold, kw: kw("v4", 3), anchors: [HERO], value: RATIO.C, word: "缩量" },
  { id: "volChipC", ch: "vbarC", kind: "chip", main: true, a: E("volC2"), b: CUT.hold, kw: kw("v4", 13), x: 644, y: 1330, align: "left", lines: [{ t: "没多少人跟", at: E("volC2") }] },
];

// ---------------------------------------------------------------- 03 hold: one chart, the half line, three paths
const A_DONE = Lc("c4", 0) - 4; // A candles collapse into a path line between c3 and c4
const B_DONE = Lc("c5", 0) - 4;
export const PATHS = { A: A_DONE, B: B_DONE };
const hold: Beat[] = [
  { id: "holdOpen", ch: "hold", kind: "hline", a: at("c1", 8), b: CUT.recap, kw: kw("c1", 8), p: HERO_BAR.o, i0: HERO - 0.5, text: "开 100", tone: "white", side: "below" },
  { id: "holdClose", ch: "hold", kind: "hline", a: at("c1", 8) + 10, b: CUT.recap, p: HERO_BAR.c, i0: HERO - 0.5, text: "收 108", tone: "white" },
  { id: "holdBody", ch: "hold", kind: "bracket", main: true, a: at("c2", 7), b: E("holdGrowA"), kw: kw("c2", 7), i: HERO, p0: HERO_BAR.o, p1: HERO_BAR.c, text: "实体的一半", side: "right", mid: true, tone: "gold" },
  { id: "holdMid", ch: "hold", kind: "hline", a: E("laser"), b: CUT.recap, kw: kw("c2", 12), p: MID, text: "一半线 104", tone: "gold" },
  { id: "holdPullA", ch: "hold", kind: "marker", lane: "A", a: at("c3", 6), b: A_DONE, kw: kw("c3", 6), anchors: [A_PULL], at: [A_PULL, bar("A", A_PULL).l], text: "回踩不破", dx: 70, dy: 150 },
  { id: "holdChipA", ch: "hold", kind: "chip", main: true, a: E("holdA"), b: A_DONE, kw: kw("c3", 11), x: 924, y: 1310, align: "right", lines: [{ t: "守在线上", at: E("holdA") }, { t: "买方仍在掌控", at: E("holdA") + 10 }] },
  { id: "holdPathA", ch: "hold", kind: "path", lane: "A", a: A_DONE, b: CUT.recap, n: 6, text: "A 守住" },
  { id: "holdBreakB", ch: "hold", kind: "marker", lane: "B", a: at("c4", 2), b: at("c4", 8), kw: kw("c4", 2), anchors: [HERO + 1], at: [HERO + 1, B_NEXT.c], text: "次日收 103.5", sub: "跌破一半", dx: 80, dy: 170, tone: "down" },
  { id: "holdErased", ch: "hold", kind: "fill", main: true, a: at("c4", 8), b: B_DONE, kw: kw("c4", 8), i: HERO, p0: B_NEXT.c, p1: HERO_BAR.c, text: `涨幅抹掉 ${ERASED.toFixed(0)}%`, sub: "108 → 103.5" },
  { id: "holdPathB", ch: "hold", kind: "path", lane: "B", a: B_DONE, b: CUT.recap, n: 6, text: "B 跌破" },
  { id: "holdOpenC", ch: "hold", kind: "hline", a: at("c5", 3), b: CUT.recap, kw: kw("c5", 3), p: HERO_BAR.o, i0: HERO - 0.5, text: "开盘价 100", tone: "gold", side: "below", strong: true },
  { id: "holdBreakC", ch: "hold", kind: "marker", main: true, lane: "C", a: at("c5", 8), b: E("trap"), kw: kw("c5", 8), anchors: [C_BREAK], at: [C_BREAK, bar("C", C_BREAK).c], text: `收 ${bar("C", C_BREAK).c.toFixed(1)}`, sub: "跌回开盘价下", dx: -60, dy: 190, tone: "down" },
  { id: "holdTrap", ch: "hold", kind: "stamp", main: true, a: E("trap"), b: CUT.recap, inF: 5, kw: kw("c5", 16), at: [HERO + 2.6, 96.2], text: "陷阱" },
];

// ---------------------------------------------------------------- recap rows
const COND: Record<LaneId, { v: string[]; line: string; chars: number[] }> = {
  A: { v: ["低位", "放量", "守住一半"], line: "r2", chars: [4, 7, 10] },
  B: { v: ["高位", "天量", "次日跌破"], line: "r3", chars: [4, 7, 10] },
  C: { v: ["压力位", "缩量", "没人接"], line: "r4", chars: [5, 9, 12] },
};
const recap: Beat[] = [
  ...IDS.map((id): Beat => ({ id: `recRes${id}`, ch: `row${id}` as ChartKey, kind: "result", lane: id, a: CUT.recap + 6, b: CUT.end })),
  ...IDS.map((id): Beat => ({ id: `recHead${id}`, ch: `row${id}` as ChartKey, kind: "condHead", lane: id, a: at("r1", 5), b: CUT.end, kw: kw("r1", 5) })),
  ...IDS.flatMap((id) => COND[id].v.map((v, k): Beat => ({ id: `rec${id}${k}`, ch: `row${id}` as ChartKey, kind: "cond", lane: id, main: false, a: at(COND[id].line, COND[id].chars[k]), b: CUT.end, kw: kw(COND[id].line, COND[id].chars[k]), k, value: v }))),
  ...IDS.map((id): Beat => ({ id: `endAns${id}`, ch: `row${id}` as ChartKey, kind: "answer", lane: id, a: E("answer"), b: 99999, kw: kw("e3", 0) })),
];

export const BEATS: Beat[] = [...opening, ...why, ...pos, ...vol, ...hold, ...recap];

export const IN_F = 9;
export const OUT_F = 6;
/** [drawn 0..1, alpha 0..1] */
export const vis = (b: Beat, f: number): [number, number] => {
  const k = Math.min(1, Math.max(0, (f - b.a) / (b.inF ?? IN_F)));
  const o = Math.min(1, Math.max(0, (b.b - f) / OUT_F));
  return [k, Math.min(Math.min(1, k * 2.2), o)];
};

/** Fixed chapter titles (top-left safe area). */
export const CHAPTERS = [
  { a: 8, b: CUT.why, n: "", t: "同一根大阳线", s: "三种图 · 三种命运" },
  { a: CUT.why, b: CUT.pos, n: "", t: "为什么？", s: "同样开100 收108" },
  { a: CUT.pos, b: CUT.vol, n: "01", t: "位置", s: "它出现在哪里" },
  { a: CUT.vol, b: CUT.hold, n: "02", t: "量能", s: "谁在买" },
  { a: CUT.hold, b: CUT.recap, n: "03", t: "承接", s: "之后有没有人接" },
  { a: CUT.recap, b: CUT.end, n: "", t: "复盘", s: "三种结局 · 三个条件" },
];
export const END_TEXT = {
  l1: { t: "大阳线不是答案", a: at("e1", 3) },
  l2: { t: "而是一个问题", a: at("e2", 2) },
  l3: { t: "答案在它后面的K线里", a: E("answer") },
  note: { t: "数据为示意 · 不构成投资建议", a: E("answer") + 30 },
};
/** recap focus: one row at a time while it is read, all three at the end */
export const rowFocus = (id: LaneId, f: number) => {
  if (f < CUT.recap) return 1;
  const on = [E("recA"), E("recB"), E("recC")];
  const k = IDS.indexOf(id);
  const allOn = Lc("r4", 0) + 0 > 0 ? CUT.end - 30 : 0;
  if (f < on[0]) return 1;
  if (f >= allOn) return 1;
  return f >= on[k] && (k === 2 || f < on[k + 1]) ? 1 : 0.38;
};
export const allText = () => JSON.stringify({ BEATS, CHAPTERS, END_TEXT, NAME, PCT, RATIO, COND_LABELS, THREE_ITEMS });
