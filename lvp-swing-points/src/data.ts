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

// ---------------------------------------------------------------- hook (0–24 s): realistic, mixed candles
// Each leg drifts toward a target but mixes in counter candles, random body sizes, long upper /
// lower wicks and the odd doji; no more than 5 candles of one colour in a row. The entry candle
// (探底回升, long lower wick) and the top (冲高回落, long upper wick) are placed by hand.
// The seed is the first one that passes realismProblems(); scripts/check.mts re-checks it.

/** max same-colour run (dojis break a run), used by the realism rules */
export const maxRun = (bars: Bar[]) => {
  let best = 0;
  let run = 0;
  let prev = 0;
  for (const b of bars) {
    const d = isDoji(b) ? 0 : b.c > b.o ? 1 : -1;
    run = d !== 0 && d === prev ? run + 1 : d !== 0 ? 1 : 0;
    prev = d;
    best = Math.max(best, run);
  }
  return best;
};
/** a doji: body under 10 % of the range — drawn grey */
export const isDoji = (b: Bar) => Math.abs(b.c - b.o) < 0.1 * Math.max(1e-9, b.h - b.l);

/** candle character of a leg: body size range (× the leg's average step), wick habits */
export type LegStyle = { counter?: number; doji?: number; body?: [number, number]; upWick?: number; dnWick?: number };

export const walk = (rnd: () => number, from: number, to: number, n: number, opts: LegStyle = {}): Bar[] => {
  const out: Bar[] = [];
  const dir = to >= from ? 1 : -1;
  const avg = Math.abs(to - from) / n;
  const [m0, m1] = opts.body ?? [0.55, 1.6];
  let c = from;
  let run = 0;
  for (let k = 0; k < n; k++) {
    const left = n - k;
    const need = (to - c) / left; // what is still owed per bar
    const counter = k > 0 && k < n - 1 && (run >= 3 + Math.floor(rnd() * 2) || rnd() < (opts.counter ?? 0.25));
    const doji = !counter && k > 0 && k < n - 1 && rnd() < (opts.doji ?? 0.08);
    const o = c + (rnd() - 0.5) * avg * 0.15;
    let body: number;
    if (doji) body = (rnd() - 0.5) * avg * 0.06;
    else if (counter) body = -dir * avg * (0.25 + rnd() * 0.55);
    else body = need * (m0 + (m1 - m0) * rnd());
    if (!doji && !counter && Math.sign(body) !== dir) body = dir * avg * (0.4 + rnd() * 0.4);
    if (k === n - 1) body = to - o;
    const cc = o + body;
    const range = avg * (0.8 + rnd() * 0.6);
    const longUp = rnd() < (opts.upWick ?? 0.14);
    const longDn = rnd() < (opts.dnWick ?? 0.14);
    const h = Math.max(o, cc) + range * (longUp ? 0.9 + rnd() * 0.7 : 0.06 + rnd() * 0.28);
    const l = Math.min(o, cc) - range * (longDn ? 0.9 + rnd() * 0.7 : 0.06 + rnd() * 0.28);
    out.push({ o, h, l, c: cc });
    run = counter || doji ? 0 : run + 1;
    c = cc;
  }
  return out;
};

// The opening, one sentence per leg, each leg with its own candle character:
//   当你在这里进场      → a fall of mid-size candles with upper wicks (sellers in charge), then the entry
//   行情已经连涨了好几天 → a climb that starts in small steady steps with lower wicks, then opens up
//   结果一波回调砸了下来 → big heavy green bodies, small red rebounds
const buildHook = (seed: number) => {
  const rnd = mulberry(seed);
  const bars: Bar[] = [];
  const add = (bs: Bar[]) => (bars.push(...bs), bars.length - 1);
  const last = () => bars[bars.length - 1].c;
  add(walk(rnd, 117, 106.6, 9, { counter: 0.28, body: [0.6, 1.4], upWick: 0.32, dnWick: 0.05 }));
  const pre = bars.length - 1;
  // entry: a red candle that probes low and closes up (探底回升) — 在这里进场
  const eo = last() - 0.3;
  const entry = add([{ o: eo, c: eo + 1.5, h: eo + 1.9, l: eo - 2.4 }]);
  add(walk(rnd, last(), 114.6, 6, { counter: 0.2, body: [0.45, 0.9], upWick: 0.04, dnWick: 0.4, doji: 0.15 }));
  add(walk(rnd, last(), 121.4, 6, { counter: 0.22, body: [0.9, 2.2], upWick: 0.18, dnWick: 0.1, doji: 0.05 }));
  // top: a red candle that spikes and fades (冲高回落)
  const to = last() + 0.2;
  const top = add([{ o: to, c: to + 1.1, h: to + 4.2, l: to - 0.5 }]);
  const drop = add(walk(rnd, last(), 113.5, 7, { counter: 0.24, body: [1.1, 2.0], upWick: 0.1, dnWick: 0.22, doji: 0.02 }));
  add(walk(rnd, last(), 116.8, 2, { counter: 0 }));
  const doubt = add(walk(rnd, last(), 113.2, 3, { counter: 0 }));
  const trap = add(walk(rnd, last(), 105.5, 7, { counter: 0.25 }));
  const fly = walk(rnd, bars[doubt].c, 131, 7, { counter: 0.22 });
  return { bars, pre, entry, top, drop, doubt, trap, fly };
};

/** mean body size of a slice */
export const meanBody = (bs: Bar[]) => bs.reduce((x, b) => x + Math.abs(b.c - b.o), 0) / Math.max(1, bs.length);

export const hookRealismProblems = (hk: ReturnType<typeof buildHook>) => {
  const p: string[] = [];
  const { bars, entry, top, trap, fly } = hk;
  if (maxRun(bars) > 5) p.push(`same-colour run of ${maxRun(bars)}`);
  if (maxRun(fly) > 5) p.push(`fly branch run of ${maxRun(fly)}`);
  if (!bars.some(isDoji)) p.push("no doji");
  const rally = bars.slice(entry + 1, top);
  if (rally.filter((b) => b.c < b.o && !isDoji(b)).length < 2) p.push("rally has fewer than 2 green pullbacks");
  const fall = bars.slice(top + 1, trap + 1);
  if (fall.filter((b) => b.c > b.o && !isDoji(b)).length < 2) p.push("fall has fewer than 2 red rebounds");
  if (bars.slice(0, top).some((b, i) => i !== entry && b.l <= bars[entry].l)) p.push("entry is not the low");
  if (bars.some((b, i) => i !== top && b.h >= bars[top].h)) p.push("top is not the high");
  const longUp = bars.filter((b) => b.h - Math.max(b.o, b.c) > 1.2 * Math.abs(b.c - b.o) && b.h - Math.max(b.o, b.c) > 0.8).length;
  const longDn = bars.filter((b) => Math.min(b.o, b.c) - b.l > 1.2 * Math.abs(b.c - b.o) && Math.min(b.o, b.c) - b.l > 0.8).length;
  if (longUp < 2 || longDn < 2) p.push(`too few long wicks (up ${longUp}, down ${longDn})`);
  const bodies = bars.map((b) => Math.abs(b.c - b.o)).filter((x) => x > 0.05);
  if (Math.max(...bodies) < 3 * Math.min(...bodies)) p.push("bodies too uniform");
  if (bars[trap].c > bars[entry].c + 1.2) p.push("trap does not give the profit back");
  if (fly[fly.length - 1].c <= bars[top].h) p.push("fly branch does not clear the top");
  const fallB = meanBody(bars.slice(0, hk.pre + 1));
  const stepsB = meanBody(bars.slice(entry + 1, entry + 7));
  const openB = meanBody(bars.slice(entry + 7, top));
  const dropB = meanBody(bars.slice(top + 1, hk.drop + 1));
  if (!(openB > stepsB * 1.6)) p.push("the climb does not change character (small steps → big candles)");
  if (!(dropB > fallB * 1.3)) p.push("the pullback is not heavier than the opening fall");
  return p;
};

let HOOK_SEED = 1;
while (hookRealismProblems(buildHook(HOOK_SEED)).length && HOOK_SEED < 5000) HOOK_SEED++;
const hk = buildHook(HOOK_SEED);
export const HOOK = { bars: hk.bars, PRE: hk.pre, ENTRY: hk.entry, TOP: hk.top, DROP: hk.drop, DOUBT: hk.doubt, TRAP: hk.trap, SEED: HOOK_SEED };
export const HOOK_FLY = hk.fly;
export const HOOK_PROBLEMS = hookRealismProblems(hk);

// ---------------------------------------------------------------- realistic builder for every chart
// Same API as the old monotonic Builder (leg / inside / big), but each leg is a realistic walk:
// mixed colours, random bodies and wicks, the odd doji. Claimed pivots are then made exact by
// stretching wicks only (a claimed high gets the highest wick, its neighbours' lows dip below it),
// and the first seed whose chart also satisfies every narrated fact is used.
class RealBuilder {
  bars: Bar[] = [];
  private c: number;
  private rnd: () => number;
  constructor(start: number, rnd: () => number) {
    this.c = start;
    this.rnd = rnd;
  }
  get last() {
    return this.bars.length - 1;
  }
  leg(target: number, n: number, style?: LegStyle) {
    this.bars.push(...walk(this.rnd, this.c, target, n, style));
    this.c = this.bars[this.last].c;
    return this.last;
  }
  /** a small counter candle inside the previous range */
  inside() {
    const p = this.bars[this.last];
    const body = Math.max(0.2, Math.abs(p.c - p.o));
    const d = p.c >= p.o ? 1 : -1;
    const o = p.c - d * 0.1 * body;
    const c = p.c - d * (0.3 + 0.2 * this.rnd()) * body;
    this.bars.push({ o, c, h: Math.max(o, c) + (0.05 + 0.2 * this.rnd()) * body, l: Math.min(o, c) - (0.05 + 0.2 * this.rnd()) * body });
    this.c = c;
    return this.last;
  }
  /** one big candle to `target` with short wicks (e.g. the 大阳线) */
  big(target: number) {
    const o = this.c;
    const span = Math.abs(target - o);
    this.bars.push({ o, c: target, h: Math.max(o, target) + span * 0.05, l: Math.min(o, target) - span * 0.04 });
    this.c = target;
    return this.last;
  }
}

const EPS = 0.06;
const makeHigh = (b: Bar[], i: number) => {
  b[i].h = Math.max(b[i].h, b[i - 1].h + EPS, b[i + 1].h + EPS);
  for (const j of [i - 1, i + 1]) b[j].l = Math.min(b[j].l, b[i].l - EPS);
};
const makeLow = (b: Bar[], i: number) => {
  b[i].l = Math.min(b[i].l, b[i - 1].l - EPS, b[i + 1].l - EPS);
  for (const j of [i - 1, i + 1]) b[j].h = Math.max(b[j].h, b[i].h + EPS);
};

type Built = { bars: Bar[]; highs: number[]; lows: number[]; extra?: Bar[][] };
/** first seed whose chart passes `facts` and the realism rules (≤ 5 same colour in a row) */
const searchSeed = <T extends Built>(build: (rnd: () => number) => T, facts: (r: T) => string[], from = 1): T & { seed: number; problems: string[] } => {
  let lastProblems: string[] = [];
  for (let seed = from; seed < from + 20000; seed++) {
    const r = build(mulberry(seed));
    for (const i of r.highs) makeHigh(r.bars, i);
    for (const i of r.lows) makeLow(r.bars, i);
    const problems = [...facts(r)];
    for (const bs of [r.bars, ...(r.extra ?? [])]) if (maxRun(bs) > 5) problems.push(`run of ${maxRun(bs)}`);
    if (!problems.length) return { ...r, seed, problems };
    lastProblems = problems;
  }
  const r = build(mulberry(from));
  return { ...r, seed: -1, problems: lastProblems };
};

// mini charts for the "怕 / 猜" comparison cards
const MF = searchSeed((rnd) => {
  const m = new RealBuilder(100, rnd);
  m.leg(104, 4);
  m.leg(101, 2);
  m.leg(112, 6);
  return { bars: m.bars, highs: [], lows: [] };
}, () => [], 3);
export const MINI_FEAR = { bars: MF.bars, sellAt: 5 }; // 一卖就飞
const MG = searchSeed((rnd) => {
  const m = new RealBuilder(112, rnd);
  m.leg(104, 3);
  m.leg(107, 2);
  m.leg(96, 7);
  return { bars: m.bars, highs: [], lows: [] };
}, () => [], 5);
export const MINI_GUESS = { bars: MG.bars, holdAt: 3 }; // 死扛被套

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
const DC = searchSeed((rnd) => {
  const d = new RealBuilder(100, rnd);
  const H1 = d.leg(108, 6);
  const L1 = d.leg(103, 4);
  const H2 = d.leg(112, 6);
  const L2 = d.leg(106, 4);
  d.leg(110, 3);
  return { bars: d.bars, highs: [H1, H2], lows: [L1, L2], H1, L1, H2, L2 };
}, (r) => {
  const p: string[] = [];
  if (!(r.bars[r.H2].h > r.bars[r.H1].h && r.bars[r.L2].l > r.bars[r.L1].l)) p.push("levels must step up");
  const all = r.bars;
  if (all.slice(0, r.L2 + 2).some((b, i) => i !== r.H2 && b.h >= all[r.H2].h)) p.push("H2 is not the top");
  return p;
}, 21);
export const DEFINE_CHART = { bars: DC.bars, H1: DC.H1, L1: DC.L1, H2: DC.H2, L2: DC.L2 };

// ---------------------------------------------------------------- case (65–137 s): one chart, grown with the voice
const CS = searchSeed((rnd) => {
  const cb = new RealBuilder(100, rnd);
  cb.leg(104, 4);
  cb.inside();
  const H1 = cb.leg(110, 5); // 孤立高点 → 压力
  const DOWN = cb.leg(105.5, 3);
  cb.inside();
  const L1 = cb.leg(101, 4); // 孤立低点 → 支撑
  const APPROACH = cb.leg(108.6, 6); // 往回走，逼近压力
  const BREAK = cb.leg(113, 2); // 干脆地突破
  const H2 = cb.leg(115, 2); // 新的孤立高点
  const DOWN2 = cb.leg(103.6, 6); // 继续向下，逼近支撑
  const L2 = cb.leg(101.9, 1); // 没有跌破：又一个孤立低点
  const UP2 = cb.leg(108, 3); // 重新往上
  const NEAR = cb.leg(113.6, 3); // 逼近高点
  cb.inside();
  const HOLD = cb.leg(114.4, 1); // 在高点下方不被压回
  const BIG = cb.big(121); // 一根大阳线冲过压力
  const RUN = cb.leg(126, 3); // 多单安心拿着
  const TOP = cb.leg(127.2, 1);
  const SHORT = cb.leg(122, 2); // 做空视角：空
  cb.inside();
  const L3 = cb.leg(117, 3); // 孤立低点
  const BOUNCE = cb.leg(120, 2);
  const SLAM = cb.leg(116.6, 1);
  const BREAKDOWN = cb.leg(108, 3); // 干脆利落地砸穿
  cb.leg(106, 2);
  // counter-example (假突破): outlines drawn from BIG's slot — poke above, fall back below
  const fk = new RealBuilder(cb.bars[HOLD].c, rnd);
  fk.leg(116.4, 1);
  fk.leg(112, 2);
  fk.leg(108.5, 2);
  // short view, "始终不破": outlines that hold above L3, from SLAM's slot
  const nb = new RealBuilder(cb.bars[BOUNCE].c, rnd);
  nb.leg(118.4, 2);
  nb.leg(120.4, 2);
  const idx = { H1, DOWN, L1, APPROACH, BREAK, H2, DOWN2, L2, UP2, NEAR, HOLD, BIG, RUN, TOP, SHORT, L3, BOUNCE, SLAM, BREAKDOWN, END: cb.last };
  return { bars: cb.bars, highs: [H1, H2], lows: [L1, L2, L3], extra: [fk.bars, nb.bars], idx, fake: fk.bars, hold: nb.bars };
}, (r) => {
  const B = r.bars;
  const x = r.idx;
  const p: string[] = [];
  const hiOf = (a: number, b: number) => Math.max(...B.slice(a, b + 1).map((q) => q.h));
  const loOf = (a: number, b: number) => Math.min(...B.slice(a, b + 1).map((q) => q.l));
  if (!(Math.max(B[x.BREAK - 1].c, B[x.BREAK].c) > B[x.H1].h)) p.push("breakout does not close above H1");
  if (!(hiOf(x.H1 + 1, x.APPROACH) < B[x.H1].h)) p.push("H1 touched before the breakout");
  if (!(B[x.L2].l > B[x.L1].l)) p.push("L2 below L1");
  if (!(loOf(x.H2 + 1, x.L2) >= B[x.L1].l)) p.push("L1 broken on the second test");
  if (!(hiOf(x.H2 + 1, x.HOLD) < B[x.H2].h)) p.push("H2 topped before the big candle");
  if (!(B[x.BIG].c > B[x.H2].h && B[x.BIG].o < B[x.H2].h)) p.push("big candle does not cross H2");
  if (!(r.fake[0].h > B[x.H2].h && r.fake[r.fake.length - 1].c < B[x.H2].h - 4)) p.push("fake break wrong");
  if (!(Math.min(...r.hold.map((q) => q.l)) > B[x.L3].l)) p.push("hold branch breaks L3");
  if (!(B[x.BREAKDOWN].c < B[x.L3].l)) p.push("no breakdown below L3");
  if (!(hiOf(0, x.END) === B[x.TOP].h || B[x.TOP].h >= hiOf(x.BIG, x.END))) p.push("TOP is not the top");
  if (!B.some(isDoji)) p.push("no doji");
  return p;
}, 42);
export const CASE = { bars: CS.bars, ...CS.idx };
export const CASE_FAKE = { bars: CS.fake, from: CS.idx.BIG };
export const CASE_HOLD = { bars: CS.hold, from: CS.idx.SLAM };

// ---------------------------------------------------------------- advanced (137–174 s): uptrend, two failed breaks of a low
const AD = searchSeed((rnd) => {
  const ab = new RealBuilder(100, rnd);
  ab.leg(106, 5);
  ab.inside();
  ab.leg(110, 3);
  ab.leg(106.5, 3);
  ab.leg(113, 4);
  const ENTRY = ab.leg(114.5, 1); // 你在这里进了场
  ab.leg(117, 2);
  const LOW = ab.leg(110.5, 4); // the isolated low (support)
  ab.leg(115, 3);
  const T1 = ab.leg(111.4, 3); // 第一次没砸穿
  ab.leg(114.6, 2);
  const T2 = ab.leg(111.7, 2); // 第二次没砸穿
  const ADD = ab.leg(116, 2); // 加仓 / 建仓
  ab.leg(121, 4);
  const TOP = ab.leg(123, 2);
  ab.leg(120, 2);
  return { bars: ab.bars, highs: [], lows: [LOW, T1, T2], ENTRY, LOW, T1, T2, ADD, TOP, END: ab.last };
}, (r) => {
  const B = r.bars;
  const p: string[] = [];
  if (!(B[r.T1].l > B[r.LOW].l + 0.3 && B[r.T2].l > B[r.LOW].l + 0.3)) p.push("tests not clearly above the low");
  if (B.slice(r.LOW + 1).some((b) => b.l <= B[r.LOW].l)) p.push("the low is broken later");
  if (B.slice(0, r.END + 1).some((b, i) => i !== r.TOP && i > r.ADD && b.h > B[r.TOP].h)) p.push("TOP is not the top");
  if (!B.some(isDoji)) p.push("no doji");
  return p;
}, 77);
export const ADV = { bars: AD.bars, ENTRY: AD.ENTRY, LOW: AD.LOW, T1: AD.T1, T2: AD.T2, ADD: AD.ADD, TOP: AD.TOP, END: AD.END };

/** seeds and leftover problems of every searched chart (scripts/check.mts reports them) */
export const SEARCHED = [
  { name: "mini-fear", seed: MF.seed, problems: MF.problems },
  { name: "mini-guess", seed: MG.seed, problems: MG.problems },
  { name: "define-chart", seed: DC.seed, problems: DC.problems },
  { name: "case", seed: CS.seed, problems: CS.problems },
  { name: "advanced", seed: AD.seed, problems: AD.problems },
];

/** every chart the film annotates, with the pivots it claims — used by scripts/check.mts */
export const CLAIMS: { name: string; bars: Bar[]; highs: number[]; lows: number[]; above?: [number, number][] }[] = [
  { name: "define-chart", bars: DEFINE_CHART.bars, highs: [DEFINE_CHART.H1, DEFINE_CHART.H2], lows: [DEFINE_CHART.L1, DEFINE_CHART.L2] },
  { name: "trio-high", bars: TRIO_HIGH, highs: [1], lows: [] },
  { name: "trio-low", bars: TRIO_LOW, highs: [], lows: [1] },
  { name: "case", bars: CASE.bars, highs: [CASE.H1, CASE.H2], lows: [CASE.L1, CASE.L2, CASE.L3] },
  { name: "advanced", bars: ADV.bars, highs: [], lows: [ADV.LOW, ADV.T1, ADV.T2] },
];
