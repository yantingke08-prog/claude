// Every annotation in v4, on one timeline. Each one is bound to a chart that is on screen, and every text
// box sits in a fixed slot inside its chart's own area, pointing at its target with a leader line or a
// bracket. scripts/samecandle4-timing.ts checks timing, slots, overlaps and centring against this list.
import { E, Lc } from "./cue";
import { HERO, HERO_BAR, LANES, MID, POS, POSMAP, avgVol, changePct, volRatio, type LaneId } from "./data";
import { type Box, type Line, type Slot, boxAt, linesSize, textW } from "./geometry";
import { CUT, IDS, type Chart, HOLD_CHART, POS_CHART, ROW, ROW_H, ROW_Y, VCOL_W, VCOL_X, VOL_BARS, WHY, cx, cy, holdPost, rowChart, rowPost, volBars, volPost, volPrice } from "./layout";

export type ChartKey = "rowA" | "rowB" | "rowC" | "why" | "pos" | "volA" | "volB" | "volC" | "vbarA" | "vbarB" | "vbarC" | "hold";
export const chartOf = (k: ChartKey): Chart => {
  if (k.startsWith("row")) return rowChart(IDS.indexOf(k.slice(-1) as LaneId));
  if (k.startsWith("vbar")) return volBars(IDS.indexOf(k.slice(-1) as LaneId));
  if (k.startsWith("vol")) return volPrice(IDS.indexOf(k.slice(-1) as LaneId));
  return { why: WHY, pos: POS_CHART, hold: HOLD_CHART }[k as "why" | "pos" | "hold"];
};
/** the area a chart owns: its labels must stay inside it */
export const areaOf = (k: ChartKey): Box => {
  const pad = 14;
  if (k.startsWith("row")) {
    const y = ROW_Y[IDS.indexOf(k.slice(-1) as LaneId)];
    return { x: ROW.badgeX, y, w: ROW.right - ROW.badgeX, h: ROW_H };
  }
  if (k.startsWith("vol") || k.startsWith("vbar")) {
    const x = VCOL_X[IDS.indexOf(k.slice(-1) as LaneId)];
    return { x: x - pad, y: 390, w: VCOL_W + pad * 2, h: 1500 - 390 };
  }
  const r = chartOf(k).r;
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
};
export const sceneOfChart = (k: ChartKey): [number, number] => {
  if (k === "why") return [CUT.why, CUT.three];
  if (k === "pos") return [CUT.pos, CUT.vol];
  if (k.startsWith("vol") || k.startsWith("vbar")) return [CUT.vol, CUT.hold];
  if (k === "hold") return [CUT.hold, CUT.recap];
  return [CUT.rows, 99999];
};
export const barShown = (k: ChartKey, lane: LaneId | undefined, i: number, f: number) => {
  if (i <= HERO) return true;
  const n = i - HERO;
  if (k.startsWith("row")) return f >= CUT.recap || rowPost(k.slice(-1) as LaneId, f) >= n;
  if (k.startsWith("vol") || k.startsWith("vbar")) return volPost(k.slice(-1) as LaneId, f) >= n;
  if (k === "hold") return holdPost(lane ?? "A", f) >= n;
  return true;
};

export type Pt = [number, number];
export type Tone = "gold" | "white" | "up" | "down" | "warn" | "A" | "B" | "C";
/** a text box: its lines and the slot it sits in; `at` = when each line appears (defaults to the beat start) */
export type Label = { lines: (Line & { at?: number })[]; slot: Slot; tone?: Tone; card?: boolean; plain?: boolean; leaderTo?: Pt };
type Common = { id: string; ch: ChartKey; a: number; b: number; kw?: [string, number]; card?: boolean; main?: boolean; inF?: number; lane?: LaneId; anchors?: number[]; label?: Label };
export type Beat = Common &
  (
    | { kind: "marker"; at: Pt; tone?: Tone }
    | { kind: "ring"; at: Pt }
    | { kind: "box"; i0: number; i1: number; p0: number; p1: number }
    | { kind: "hline"; p: number; tone?: Tone; i0?: number; vol?: boolean; strong?: boolean }
    | { kind: "band"; p0: number; p1: number; i0: number }
    | { kind: "arrow"; from: Pt; to: Pt; tone?: Tone }
    | { kind: "bracket"; i: number; p0: number; p1: number; side: "left" | "right"; mid?: boolean; tone?: Tone }
    | { kind: "fill"; i: number; p0: number; p1: number }
    | { kind: "card"; at: Pt }
    | { kind: "chip" }
    | { kind: "ratio" }
    | { kind: "stamp" }
    | { kind: "path"; lane: LaneId; n: number }
    | { kind: "text" }
    | { kind: "unknown"; i0: number }
    | { kind: "answer" }
  );

const at = (line: string, char: number, off = -6) => Lc(line, char) + off;
const kw = (line: string, char: number): [string, number] => [line, char];
const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(1)}%`;
const times = (x: number) => `×${x.toFixed(1)}`;
const bar = (id: LaneId, i: number) => LANES[id][i];
const last = (id: LaneId) => LANES[id].length - 1;
const L = (t: string, size = 42, w: 500 | 700 | 900 = 900, extra: Partial<Line & { at: number }> = {}) => ({ t, size, w, ...extra });
const S = (t: string, size = 34) => L(t, size, 700, { color: "soft" });

// ---------------------------------------------------------------- facts
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
const OUT = CUT.why;
const rr = (id: LaneId) => rowChart(IDS.indexOf(id)).r;
const corner = (id: LaneId, top: boolean): Slot => ({ x: rr(id).x + rr(id).w - 8, y: top ? rr(id).y + 8 : rr(id).y + rr(id).h - 8, ax: 1, ay: top ? 0 : 1 });
const opening: Beat[] = [
  { id: "openTurnA", ch: "rowA", kind: "marker", a: Lc("h2", 5), b: OUT, kw: kw("h2", 5), anchors: [A_PULL], at: [A_PULL, bar("A", A_PULL).l], label: { lines: [L("回踩不破")], slot: corner("A", false) } },
  { id: "openArrowA", ch: "rowA", kind: "arrow", a: G("A") + 11, b: OUT, anchors: [HERO + 2], from: [HERO + 2, 113], to: [last("A"), 132], tone: "up" },
  { id: "openTurnB", ch: "rowB", kind: "marker", a: Lc("h2", 13, -4), b: OUT, kw: kw("h2", 13), anchors: [HERO + 1], at: [HERO + 1, B_NEXT.h], label: { lines: [L("次日见顶")], slot: corner("B", true) } },
  { id: "openArrowB", ch: "rowB", kind: "arrow", a: G("B") + 11, b: OUT, anchors: [HERO + 3], from: [HERO + 3, 101], to: [last("B"), 81], tone: "down" },
  { id: "openTurnC", ch: "rowC", kind: "marker", a: Lc("h3", 5, -4), b: OUT, kw: kw("h3", 5), anchors: [HERO + 1], at: [HERO + 1, C_NEXT.h], label: { lines: [L("冲高被拒")], slot: corner("C", true) } },
  { id: "openArrowC", ch: "rowC", kind: "arrow", a: G("C") + 11, b: OUT, anchors: [HERO + 3], from: [HERO + 3, 102], to: [last("C"), 90], tone: "down" },
];
/** result column of a row: name + percentage (fixed slots, identical in the opening and the recap) */
export const resultLabels = (id: LaneId): Label[] => {
  const y = ROW_Y[IDS.indexOf(id)];
  return [
    { lines: [L(NAME[id], 46)], slot: { x: ROW.colX, y: y + 14 }, plain: true },
    { lines: [{ t: PCT[id], size: 60, w: 700, num: true, color: PCT[id].startsWith("+") ? "up" : "down" }], slot: { x: ROW.colX, y: y + 82 }, plain: true },
  ];
};
const results = (from: number, to: number, tag: string): Beat[] =>
  IDS.map((id) => ({ id: `${tag}Res${id}`, ch: `row${id}` as ChartKey, kind: "text", lane: id, a: from === -1 ? G(id) + 9 : from, b: to }));

// ---------------------------------------------------------------- why: one candle
const W = WHY.r;
const Q = at("w3a", 5);
const wy = (p: number) => cy(WHY, p);
const why: Beat[] = [
  { id: "whyOpen", ch: "why", kind: "hline", a: CUT.why + 8, b: CUT.three, p: HERO_BAR.o, tone: "white", label: { lines: [L("开 100")], slot: { x: W.x + 12, y: wy(100) - 8, ay: 1 }, plain: true } },
  { id: "whyClose", ch: "why", kind: "hline", a: CUT.why + 14, b: CUT.three, p: HERO_BAR.c, tone: "white", label: { lines: [L("收 108")], slot: { x: W.x + 12, y: wy(108) - 8, ay: 1 }, plain: true } },
  { id: "whyCard", ch: "why", kind: "card", main: true, card: true, a: E("result"), b: Q, kw: kw("w2", 9), at: [HERO, HERO_BAR.h], label: { lines: [L("只是一个结果", 48), L("这段时间买方赢了", 40, 900, { color: "gold", at: at("w2", 18) })], slot: { x: W.x + W.w - 16, y: W.y + 20, ax: 1 }, card: true } },
  { id: "whyBody", ch: "why", kind: "bracket", a: at("w2", 14), b: Q, kw: kw("w2", 14), i: HERO, p0: HERO_BAR.o, p1: HERO_BAR.c, side: "left", tone: "gold", label: { lines: [L("+8%", 44, 900, { color: "gold" })], slot: { x: cx(WHY, HERO) - 92, y: wy(104), ax: 1, ay: 0.5 }, plain: true } },
  { id: "whyNext", ch: "why", kind: "unknown", a: Q, b: CUT.three, kw: kw("w3a", 5), i0: HERO + 1, label: { lines: [L("接下来？", 64)], slot: { x: (cx(WHY, HERO + 1) - 76 + W.x + W.w) / 2, y: wy(104), ax: 0.5, ay: 0.5 }, plain: true } },
];

// ---------------------------------------------------------------- the 三件事 page (its own chart layer; see Stage)
export const THREE_ITEMS = [
  { n: "01", t: "位置", d: "它出现在哪里", at: at("w3b", 2), kw: kw("w3b", 2) },
  { n: "02", t: "量能", d: "是谁在买", at: at("w3b", 6), kw: kw("w3b", 6) },
  { n: "03", t: "承接", d: "之后有没有人接", at: at("w3b", 8), kw: kw("w3b", 8) },
];

// ---------------------------------------------------------------- 01 position
const PR = POS_CHART.r;
const P2_OUT = Lc("p3", 0) + 4;
const P3_OUT = Lc("p4", 0) + 4;
const py = (p: number) => cy(POS_CHART, p);
const TL_SLOT = (y: number): Slot => ({ x: PR.x + 40, y });
const pos: Beat[] = [
  ...POS.hero.map((i, k): Beat => ({ id: `posRing${k}`, ch: "pos", kind: "ring", a: at("p1", 3), b: CUT.vol, kw: kw("p1", 3), anchors: [i], at: [i, P(i).c - 4] })),
  { id: "posBase", ch: "pos", kind: "box", a: at("p2", 0), b: P2_OUT, kw: kw("p2", 0), i0: POS.base[0], i1: POS.base[1], p0: POS.baseBox[0], p1: POS.baseBox[1], label: { lines: [L(`横盘 ${BASE_N} 根`)], slot: { x: cx(POS_CHART, H1) - 12, y: py(POS.baseBox[1]) - 12, ax: 1, ay: 1 } } },
  { id: "posBreak", ch: "pos", kind: "marker", main: true, a: E("posA"), b: P2_OUT, kw: kw("p2", 7), anchors: [H1], at: [H1, P(H1).c], tone: "gold", label: { lines: [L("第一次突破")], slot: { x: cx(POS_CHART, H1) + 40, y: PR.y + PR.h - 10, ay: 1 }, tone: "gold" } },
  { id: "posTrend", ch: "pos", kind: "arrow", a: at("p2", 15), b: P2_OUT, kw: kw("p2", 15), anchors: [H1 + 2], from: [H1 + 2, 118], to: [POS.shelf[0] - 1, 140], tone: "up", label: { lines: [L("新趋势起点")], slot: TL_SLOT(760), leaderTo: [POS.shelf[0] - 1, 140] } },

  { id: "posRally", ch: "pos", kind: "arrow", a: at("p3", 2), b: P3_OUT, kw: kw("p3", 2), anchors: [POS.rally[0]], from: [POS.rally[0], 103], to: [H2 - 2, 150], tone: "white", label: { lines: [L(`连涨 ${RALLY_N} 根`)], slot: TL_SLOT(660), leaderTo: [POS.rally[0] + 11, 126] } },
  { id: "posLate", ch: "pos", kind: "marker", main: true, a: at("p3", 7), b: E("posB"), kw: kw("p3", 7), anchors: [H2], at: [H2, P(H2).o], label: { lines: [L("高位再拉大阳")], slot: TL_SLOT(500) } },
  { id: "posLast", ch: "pos", kind: "card", main: true, card: true, a: E("posB"), b: P3_OUT, kw: kw("p3", 16), at: [H2, P(H2).h], label: { lines: [L("最后一批买家", 48), L("冲了进来", 40, 900, { color: "gold", at: E("posB") + 10 })], slot: TL_SLOT(490), card: true } },

  { id: "posDown", ch: "pos", kind: "arrow", a: at("p4", 2), b: E("posC"), kw: kw("p4", 2), anchors: [H2 + 2], from: [H2 + 1, 170], to: [H3 - 6, 126], tone: "down", label: { lines: [L("下跌途中")], slot: { x: PR.x + PR.w - 10, y: PR.y + 10, ax: 1 } } },
  { id: "posBand", ch: "pos", kind: "band", a: at("p4", 4), b: CUT.vol, kw: kw("p4", 4), anchors: [POS.shelf[0]], p0: POS.band[0], p1: POS.band[1], i0: POS.shelf[0], label: { lines: [L("支撑变压力")], slot: { x: PR.x + PR.w - 10, y: PR.y + 100, ax: 1 }, leaderTo: [86, POS.band[1]] } },
  { id: "posShort", ch: "pos", kind: "card", main: true, card: true, a: E("posC"), b: CUT.vol, kw: kw("p4", 13), at: [H3, P(H3).l], label: { lines: [L("空头在回补", 48), L("不是新买盘", 40, 900, { color: "gold", at: E("posC") + 10 })], slot: { x: PR.x + PR.w - 10, y: PR.y + PR.h - 10, ax: 1, ay: 1 }, card: true } },
];

// ---------------------------------------------------------------- 02 volume
const colMid = (k: number) => VCOL_X[k] + VCOL_W / 2;
const vol: Beat[] = [
  ...IDS.map((id, k): Beat => ({ id: `volAvg${id}`, ch: `vbar${id}` as ChartKey, kind: "hline", a: E("volRise"), b: CUT.hold, kw: kw("v1", 4), p: avgVol(id), vol: true, tone: "white", label: k === 0 ? { lines: [L("前20根均量", 34, 900)], slot: { x: VCOL_X[0] + 8, y: VOL_BARS.y + 10 }, plain: true, leaderTo: [HERO - 9, avgVol("A")] } : undefined })),
  ...IDS.map((id, k): Beat => ({
    id: `volRatio${id}`,
    ch: `vbar${id}` as ChartKey,
    kind: "ratio",
    lane: id,
    a: E(`vol${id}`),
    b: CUT.hold,
    kw: kw(["v2", "v3", "v4"][k], [3, 7, 3][k]),
    anchors: [HERO],
    label: { lines: [{ t: RATIO[id], size: 64, w: 700, num: true, color: "gold" }, L(["放量", "天量", "缩量"][k], 40)], slot: { x: colMid(k), y: VOL_BARS.y + VOL_BARS.h + 22, ax: 0.5 }, plain: true },
  })),
  { id: "volChipA", ch: "vbarA", kind: "chip", main: true, a: at("v2", 9), b: E("volB"), kw: kw("v2", 9), label: { lines: [L("新资金进场", 40), L("高处继续买", 40, 900, { at: E("volA2") })], slot: { x: colMid(0), y: 1352, ax: 0.5 }, tone: "gold" } },
  { id: "volChipB", ch: "vbarB", kind: "chip", main: true, a: E("volB2"), b: E("volC"), kw: kw("v3", 13), label: { lines: [L("买盘一次", 40), L("被用完", 40, 900, { at: E("volB2") + 12 })], slot: { x: colMid(1), y: 1352, ax: 0.5 }, tone: "gold" } },
  { id: "volChipC", ch: "vbarC", kind: "chip", main: true, a: E("volC2"), b: CUT.hold, kw: kw("v4", 13), label: { lines: [L("没多少人跟", 40)], slot: { x: colMid(2), y: 1352, ax: 0.5 }, tone: "gold" } },
];

// ---------------------------------------------------------------- 03 hold
const HR = HOLD_CHART.r;
const hy = (p: number) => cy(HOLD_CHART, p);
const A_DONE = Lc("c4", 0) - 4;
const B_DONE = Lc("c5", 0) - 4;
export const PATHS = { A: A_DONE, B: B_DONE };
const LEFT = (p: number, lines: Label["lines"], below = false): Slot => ({ x: HR.x + 10, y: below ? hy(p) + 8 : hy(p) - 8, ay: below ? 0 : 1 });
const hold: Beat[] = [
  { id: "holdOpen", ch: "hold", kind: "hline", a: at("c1", 8), b: at("c5", 3), kw: kw("c1", 8), p: HERO_BAR.o, i0: HERO - 0.5, tone: "white", label: { lines: [L("开 100")], slot: LEFT(100, []), plain: true } },
  { id: "holdClose", ch: "hold", kind: "hline", a: at("c1", 8) + 10, b: CUT.recap, p: HERO_BAR.c, i0: HERO - 0.5, tone: "white", label: { lines: [L("收 108")], slot: LEFT(108, []), plain: true } },
  { id: "holdBody", ch: "hold", kind: "bracket", main: true, a: at("c2", 7), b: E("holdGrowA"), kw: kw("c2", 7), i: HERO, p0: HERO_BAR.o, p1: HERO_BAR.c, side: "right", mid: true, tone: "gold", label: { lines: [L("实体的一半", 42, 900, { color: "gold" })], slot: { x: cx(HOLD_CHART, HERO) + 64, y: (hy(108) + hy(104)) / 2, ay: 0.5 }, plain: true } },
  { id: "holdMid", ch: "hold", kind: "hline", a: E("laser"), b: CUT.recap, kw: kw("c2", 12), p: MID, tone: "gold", label: { lines: [L("一半线", 42, 900, { color: "gold" }), { t: "104", size: 40, w: 700, num: true, color: "gold" }], slot: LEFT(104, []), plain: true } },
  { id: "holdPullA", ch: "hold", kind: "marker", lane: "A", a: at("c3", 6), b: A_DONE, kw: kw("c3", 6), anchors: [A_PULL], at: [A_PULL, bar("A", A_PULL).l], label: { lines: [L("回踩不破")], slot: { x: cx(HOLD_CHART, A_PULL) + 50, y: hy(104) + 40 } } },
  { id: "holdChipA", ch: "hold", kind: "chip", main: true, a: E("holdA"), b: A_DONE, kw: kw("c3", 11), label: { lines: [L("守在线上", 40), L("买方仍在掌控", 40, 900, { at: E("holdA") + 10 })], slot: { x: HR.x + HR.w - 10, y: HR.y + HR.h - 10, ax: 1, ay: 1 }, tone: "gold" } },
  { id: "holdPathA", ch: "hold", kind: "path", lane: "A", a: A_DONE, b: CUT.recap, n: 6, label: { lines: [L("A 守住", 40, 900, { color: "A" })], slot: { x: HR.x + HR.w - 10, y: HR.y + 10, ax: 1 }, tone: "A", leaderTo: [HERO + 6, bar("A", HERO + 6).c] } },
  { id: "holdBreakB", ch: "hold", kind: "marker", lane: "B", a: at("c4", 2), b: at("c4", 8), kw: kw("c4", 2), anchors: [HERO + 1], at: [HERO + 1, B_NEXT.c], tone: "down", label: { lines: [L("次日收 103.5"), S("跌破一半")], slot: { x: cx(HOLD_CHART, HERO + 1) + 20, y: HR.y + HR.h - 10, ay: 1 }, tone: "down" } },
  { id: "holdErased", ch: "hold", kind: "fill", main: true, a: at("c4", 8), b: B_DONE, kw: kw("c4", 8), i: HERO, p0: B_NEXT.c, p1: HERO_BAR.c, label: { lines: [L(`涨幅抹掉 ${ERASED.toFixed(0)}%`), S("108 → 103.5")], slot: { x: cx(HOLD_CHART, HERO) + 60, y: HR.y + 16 }, tone: "warn" } },
  { id: "holdPathB", ch: "hold", kind: "path", lane: "B", a: B_DONE, b: CUT.recap, n: 6, label: { lines: [L("B 跌破", 40, 900, { color: "B" })], slot: { x: HR.x + HR.w - 10, y: HR.y + 86, ax: 1 }, tone: "B", leaderTo: [HERO + 6, bar("B", HERO + 6).c] } },
  { id: "holdOpenC", ch: "hold", kind: "hline", a: at("c5", 3), b: CUT.recap, kw: kw("c5", 3), p: HERO_BAR.o, i0: HERO - 0.5, tone: "gold", strong: true, label: { lines: [L("开盘价", 42, 900, { color: "gold" }), { t: "100", size: 40, w: 700, num: true, color: "gold" }], slot: LEFT(100, []), plain: true } },
  { id: "holdBreakC", ch: "hold", kind: "marker", main: true, lane: "C", a: at("c5", 8), b: E("trap"), kw: kw("c5", 8), anchors: [C_BREAK], at: [C_BREAK, bar("C", C_BREAK).c], tone: "down", label: { lines: [L("收 99.3"), S("跌回开盘价下")], slot: { x: HR.x + 10, y: HR.y + HR.h - 10, ay: 1 }, tone: "down" } },
  { id: "holdTrap", ch: "hold", kind: "stamp", main: true, a: E("trap"), b: CUT.recap, inF: 5, kw: kw("c5", 16), label: { lines: [L("陷阱", 110)], slot: { x: cx(HOLD_CHART, HERO + 3.4), y: HR.y + 14, ax: 0.5 }, tone: "warn" } },
];

// ---------------------------------------------------------------- recap rows
const COND: Record<LaneId, { v: string[]; line: string; chars: number[] }> = {
  A: { v: ["低位", "放量", "守住一半"], line: "r2", chars: [4, 7, 10] },
  B: { v: ["高位", "天量", "次日跌破"], line: "r3", chars: [4, 7, 10] },
  C: { v: ["压力位", "缩量", "没人接"], line: "r4", chars: [5, 9, 12] },
};
const condY = (id: LaneId, k: number) => ROW_Y[IDS.indexOf(id)] + 172 + k * 60;
const recap: Beat[] = [
  ...IDS.flatMap((id) =>
    COND_LABELS.map((t, k): Beat => ({ id: `recHead${id}${k}`, ch: `row${id}` as ChartKey, kind: "text", lane: id, a: at("r1", 5), b: CUT.end, kw: kw("r1", 5), label: { lines: [S(t, 34)], slot: { x: ROW.colX, y: condY(id, k) + 4 }, plain: true } })),
  ),
  ...IDS.flatMap((id) => COND[id].v.map((v, k): Beat => ({ id: `rec${id}${k}`, ch: `row${id}` as ChartKey, kind: "text", lane: id, a: at(COND[id].line, COND[id].chars[k]), b: CUT.end, kw: kw(COND[id].line, COND[id].chars[k]), label: { lines: [L(v, 40, 900, { color: id })], slot: { x: ROW.colX + 92, y: condY(id, k) }, plain: true } }))),
  ...IDS.map((id): Beat => ({ id: `endAns${id}`, ch: `row${id}` as ChartKey, kind: "answer", lane: id, a: E("answer"), b: 99999, kw: kw("e3", 0), label: { lines: [L("答案在这里", 36, 900, { color: "gold" })], slot: corner(id, id !== "A"), plain: true } })),
];

/** text beats for the result columns: opening (after each ending grows) and recap */
const resultBeats: Beat[] = [
  ...IDS.flatMap((id) => resultLabels(id).map((label, j): Beat => ({ id: `openRes${id}${j}`, ch: `row${id}` as ChartKey, kind: "text", lane: id, a: G(id) + 9, b: OUT, label }))),
  ...IDS.flatMap((id) => resultLabels(id).map((label, j): Beat => ({ id: `recRes${id}${j}`, ch: `row${id}` as ChartKey, kind: "text", lane: id, a: CUT.recap + 6, b: 99999, label }))),
];
void results;

export const BEATS: Beat[] = [...opening, ...why, ...pos, ...vol, ...hold, ...recap, ...resultBeats];

export const IN_F = 9;
export const OUT_F = 6;
export const vis = (b: Beat, f: number): [number, number] => {
  const k = Math.min(1, Math.max(0, (f - b.a) / (b.inF ?? IN_F)));
  const o = Math.min(1, Math.max(0, (b.b - f) / OUT_F));
  return [k, Math.min(Math.min(1, k * 2.2), o)];
};

/** the box a label is drawn in (shared with the layout check) */
export const labelBox = (l: Label): Box => {
  const pad = l.card ? { x: 26, y: 18 } : l.plain ? { x: 10, y: 4 } : { x: 18, y: 10 };
  const s = linesSize(l.lines, pad);
  return boxAt(l.slot, s.w + (l.card ? 0 : 0), s.h);
};
export const labelPad = (l: Label) => (l.card ? { x: 26, y: 18 } : l.plain ? { x: 10, y: 4 } : { x: 18, y: 10 });

/** Fixed chapter titles (centred on x = 540). */
export const CHAPTERS = [
  { a: 8, b: CUT.why, n: "", t: "同一根大阳线", s: "三种图 · 三种命运" },
  { a: CUT.why, b: CUT.three, n: "", t: "为什么？", s: "同样开100 收108" },
  { a: CUT.three, b: CUT.pos, n: "", t: "三件事", s: "决定它后面怎么走" },
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
/** emphasis on "真正" / "最关键": short dim of the page, the word underlined in gold, the related area outlined */
export const EMPH = [
  { id: "emphTrue", word: "真正", line: "w3b", at: E("emphTrue"), len: 34, scene: "three" as const },
  { id: "emphKey", word: "最关键", line: "c1", at: E("emphKey"), len: 40, scene: "hold" as const },
];
export const rowFocus = (id: LaneId, f: number) => {
  if (f < CUT.recap) return 1;
  const on = [E("recA"), E("recB"), E("recC")];
  const k = IDS.indexOf(id);
  if (f < on[0] || f >= CUT.end - 30) return 1;
  return f >= on[k] && (k === 2 || f < on[k + 1]) ? 1 : 0.38;
};
export const allText = () => JSON.stringify({ BEATS, CHAPTERS, END_TEXT, NAME, PCT, RATIO, COND_LABELS, THREE_ITEMS });
void textW;
void volPrice;
