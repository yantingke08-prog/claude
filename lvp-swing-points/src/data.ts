// Deterministic example data (fixed seed + hand-placed legs). 示意图 · 模拟数据.
// Every pivot the film points at is a real isolated high/low by the film's own rule —
// scripts/check.mts proves it.

export type Bar = { o: number; h: number; l: number; c: number };

/** 孤立高点: middle high above both neighbours' highs AND middle low above both neighbours' lows. */
export const isSwingHigh = (b: Bar[], i: number) =>
  i > 0 && i < b.length - 1 && b[i].h > b[i - 1].h && b[i].h > b[i + 1].h && b[i].l > b[i - 1].l && b[i].l > b[i + 1].l;
/** 孤立低点: the mirror image. */
export const isSwingLow = (b: Bar[], i: number) =>
  i > 0 && i < b.length - 1 && b[i].l < b[i - 1].l && b[i].l < b[i + 1].l && b[i].h < b[i - 1].h && b[i].h < b[i + 1].h;

const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Builds candles leg by leg. Legs are monotonic, so only the turns become isolated highs/lows. */
class Builder {
  bars: Bar[] = [];
  private c: number;
  private dir = 0;
  private rnd: () => number;
  constructor(start: number, seed: number) {
    this.c = start;
    this.rnd = mulberry(seed);
  }
  /** continue after a bar that moved in `dir` (so the first bar knows whether it is a turn) */
  after(dir: 1 | -1) {
    this.dir = dir;
    return this;
  }
  private j = (a: number, b: number) => a + (b - a) * this.rnd();
  private bar(dir: 1 | -1, s: number) {
    const turn = this.dir !== 0 && this.dir !== dir;
    const o = this.c + (turn ? dir * 0.32 * s : 0);
    const c = o + dir * s * this.j(0.92, 1.08);
    const w = s * this.j(0.1, 0.15);
    this.bars.push({ o, c, h: Math.max(o, c) + w, l: Math.min(o, c) - w });
    this.c = c;
    this.dir = dir;
  }
  /** n bars in one direction ending near `target` (close) */
  leg(target: number, n: number) {
    const dir = target > this.c ? 1 : -1;
    const s = Math.abs(target - this.c) / n;
    for (let k = 0; k < n; k++) this.bar(dir, s);
    return this.last;
  }
  /** a small opposite-coloured bar inside the previous bar's range (does not create a pivot) */
  inside() {
    const p = this.bars[this.bars.length - 1];
    const body = Math.abs(p.c - p.o);
    const d = this.dir;
    const o = p.c - d * 0.1 * body;
    const c = p.c - d * 0.4 * body;
    this.bars.push({ o, c, h: Math.max(o, c) + 0.05 * body, l: Math.min(o, c) - 0.05 * body });
    this.c = c;
    return this.last;
  }
  /** one big candle (e.g. the 大阳线) */
  big(target: number) {
    return this.leg(target, 1);
  }
  get last() {
    return this.bars.length - 1;
  }
}

// ---------------------------------------------------------------- hook (0–24 s)
const hb = new Builder(118, 7);
hb.leg(104, 7); // green down leg (already on screen at frame 0)
const HOOK_PRE = hb.last;
const HOOK_ENTRY = hb.leg(106, 1); // the low red candle where you buy (B)
hb.leg(112, 5);
hb.inside();
hb.leg(119, 6);
hb.inside();
const HOOK_TOP = hb.leg(126, 6); // 连涨好几天
const HOOK_DROP = hb.leg(116.5, 8); // 一波回调砸了下来
hb.leg(119.5, 3); // 冲高
const HOOK_DOUBT = hb.leg(115, 3); // 回落 — 走还是不走
const HOOK_TRAP = hb.leg(105, 7); // 不走：被套，利润吐回去
export const HOOK = { bars: hb.bars, PRE: HOOK_PRE, ENTRY: HOOK_ENTRY, TOP: HOOK_TOP, DROP: HOOK_DROP, DOUBT: HOOK_DOUBT, TRAP: HOOK_TRAP };

// 走 → 一卖就飞: a hypothetical branch, drawn as outlines from HOOK_DOUBT
const flyB = new Builder(hb.bars[HOOK_DOUBT].c, 11).after(-1);
flyB.leg(131, 7);
export const HOOK_FLY = flyB.bars;

// mini charts for the "怕 / 猜" comparison cards
const m1 = new Builder(100, 3);
m1.leg(104, 4);
m1.leg(101, 2);
m1.leg(112, 6);
export const MINI_FEAR = { bars: m1.bars, sellAt: 5 }; // 一卖就飞
const m2 = new Builder(112, 5);
m2.leg(104, 3);
m2.leg(107, 2);
m2.leg(96, 7);
export const MINI_GUESS = { bars: m2.bars, holdAt: 3 }; // 死扛被套

// ---------------------------------------------------------------- concept (28–41 s): a line path
export const CONCEPT = {
  // closes of a simple path: entry → rally → isolated high → pullback → second test
  p: [100, 99, 101.5, 103, 102.4, 105, 107.5, 110, 112.5, 115, 112, 109.5, 108, 106.5, 108.5, 111, 113, 114.6, 115.3, 113.6],
  ENTRY: 1,
  HIGH: 9,
  RETEST: 18,
};

// ---------------------------------------------------------------- define (41–65 s): two 3-candle groups
export const TRIO_HIGH: Bar[] = [
  { o: 103, c: 99.8, h: 104, l: 99.2 }, // 绿阴
  { o: 101.5, c: 107.5, h: 109, l: 100.8 }, // 红阳 (middle)
  { o: 100, c: 104, h: 105, l: 99.6 }, // 红阳
];
export const TRIO_LOW: Bar[] = [
  { o: 103, c: 107.4, h: 108, l: 102.2 }, // 红阳
  { o: 104.5, c: 99, h: 105, l: 97.5 }, // 绿阴 (middle)
  { o: 106, c: 102, h: 106.8, l: 101.2 }, // 绿阴
];

// a short chart for "压力 / 支撑 跟着一起挪"
const db = new Builder(100, 21);
db.leg(108, 6);
const DEF_H1 = db.last;
db.leg(103, 4);
const DEF_L1 = db.last;
db.leg(112, 6);
const DEF_H2 = db.last;
db.leg(106, 4);
const DEF_L2 = db.last;
db.leg(110, 3);
export const DEFINE_CHART = { bars: db.bars, H1: DEF_H1, L1: DEF_L1, H2: DEF_H2, L2: DEF_L2 };

// ---------------------------------------------------------------- case (65–137 s): one chart, grown with the voice
const cb = new Builder(100, 42);
cb.leg(104, 4);
cb.inside();
const C_H1 = cb.leg(110, 5); // 孤立高点 → 压力
const C_DOWN = cb.leg(105.5, 3);
cb.inside();
const C_L1 = cb.leg(101, 4); // 孤立低点 → 支撑
const C_APPROACH = cb.leg(108.6, 6); // 往回走，逼近压力
const C_BREAK = cb.leg(113, 2); // 干脆地突破
const C_H2 = cb.leg(115, 2); // 新的孤立高点
const C_DOWN2 = cb.leg(103.6, 6); // 继续向下，逼近支撑
const C_L2 = cb.leg(101.9, 1); // 没有跌破：又一个孤立低点
const C_UP2 = cb.leg(108, 3); // 重新往上
const C_NEAR = cb.leg(113.6, 3); // 逼近高点
cb.inside();
const C_HOLD = cb.leg(114.4, 1); // 在高点下方不被压回
const C_BIG = cb.big(121); // 一根大阳线冲过压力
const C_RUN = cb.leg(126, 3); // 多单安心拿着
const C_TOP = cb.leg(127.2, 1);
const C_SHORT = cb.leg(122, 2); // 做空视角：空
cb.inside();
const C_L3 = cb.leg(117, 3); // 孤立低点
const C_BOUNCE = cb.leg(120, 2);
const C_SLAM = cb.leg(116.6, 1);
const C_BREAKDOWN = cb.leg(108, 3); // 干脆利落地砸穿
cb.leg(106, 2);
export const CASE = {
  bars: cb.bars,
  H1: C_H1,
  DOWN: C_DOWN,
  L1: C_L1,
  APPROACH: C_APPROACH,
  BREAK: C_BREAK,
  H2: C_H2,
  DOWN2: C_DOWN2,
  L2: C_L2,
  UP2: C_UP2,
  NEAR: C_NEAR,
  HOLD: C_HOLD,
  BIG: C_BIG,
  RUN: C_RUN,
  TOP: C_TOP,
  SHORT: C_SHORT,
  L3: C_L3,
  BOUNCE: C_BOUNCE,
  SLAM: C_SLAM,
  BREAKDOWN: C_BREAKDOWN,
  END: cb.last,
};

// counter-example (假突破): outlines drawn from C_BIG's slot onward — poke above, fall back below
const fk = new Builder(cb.bars[C_HOLD].c, 51).after(1);
fk.leg(116.4, 1);
fk.leg(112, 2);
fk.leg(108.5, 2);
export const CASE_FAKE = { bars: fk.bars, from: C_BIG };

// short view, "始终不破": outlines that hold above L3, from C_SLAM's slot onward
const nb = new Builder(cb.bars[C_BOUNCE].c, 61).after(1);
nb.leg(118.4, 2);
nb.leg(120.4, 2);
export const CASE_HOLD = { bars: nb.bars, from: C_SLAM };

// ---------------------------------------------------------------- advanced (137–174 s): uptrend, two failed breaks of a low
const ab = new Builder(100, 77);
ab.leg(106, 5);
ab.inside();
ab.leg(110, 3);
ab.leg(106.5, 3);
ab.leg(113, 4);
const A_ENTRY = ab.leg(114.5, 1); // 你在这里进了场
ab.leg(117, 2);
const A_LOW = ab.leg(110.5, 4); // the isolated low (support)
ab.leg(115, 3);
const A_T1 = ab.leg(111.4, 3); // 第一次没砸穿
ab.leg(114.6, 2);
const A_T2 = ab.leg(111.7, 2); // 第二次没砸穿
const A_ADD = ab.leg(116, 2); // 加仓 / 建仓
ab.leg(121, 4);
const A_TOP = ab.leg(123, 2);
ab.leg(120, 2);
export const ADV = { bars: ab.bars, ENTRY: A_ENTRY, LOW: A_LOW, T1: A_T1, T2: A_T2, ADD: A_ADD, TOP: A_TOP, END: ab.last };

/** every chart the film annotates, with the pivots it claims — used by scripts/check.mts */
export const CLAIMS: { name: string; bars: Bar[]; highs: number[]; lows: number[]; above?: [number, number][] }[] = [
  { name: "hook", bars: HOOK.bars, highs: [HOOK.TOP], lows: [] },
  { name: "define-chart", bars: DEFINE_CHART.bars, highs: [DEF_H1, DEF_H2], lows: [DEF_L1, DEF_L2] },
  { name: "trio-high", bars: TRIO_HIGH, highs: [1], lows: [] },
  { name: "trio-low", bars: TRIO_LOW, highs: [], lows: [1] },
  { name: "case", bars: CASE.bars, highs: [C_H1, C_H2], lows: [C_L1, C_L2, C_L3] },
  { name: "advanced", bars: ADV.bars, highs: [], lows: [A_LOW, A_T1, A_T2] },
];
