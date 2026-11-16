// Fixed mock market data for the order-flow film (no API). One 5-minute series, 50 bars:
//   0–12  upper balance (the earlier value area: POC / VAH / liquidity above)
//  13–20  sell-off
//  21–35  base
//  36–38  the three big green candles
//  39–42  pullback into the absorption zone (sellers hit the bid, price holds)
//  43–49  confirmation: price turns up, Delta positive, CVD rises
// Variants of bars 36–38 for the counter-example (exhaustion) and the gap chapter morph from the same bars.
export type Bar = { o: number; h: number; l: number; c: number; v: number; d: number };
/** footprint level: price, bid-side (sell market orders) and ask-side (buy market orders) volume */
export type Level = { p: number; bid: number; ask: number };

const rnd = (() => {
  let s = 20261116;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
})();

const mk = (o: number, c: number, wu: number, wd: number, v: number, d: number): Bar => ({ o, c, h: Math.max(o, c) + wu, l: Math.min(o, c) - wd, v, d });

const build = (): Bar[] => {
  const bars: Bar[] = [];
  let p = 4864;
  // 0–12 balance around 4864 (range 4857–4872)
  const bal = [2, -3, 4, -2, 3, -4, 1, 3, -3, 2, -1, -3, -2];
  for (const step of bal) {
    const c = Math.min(4870, Math.max(4858, p + step));
    bars.push(mk(p, c, 1 + rnd() * 2.5, 1 + rnd() * 2.5, 900 + rnd() * 500, Math.round((c - p) * 70 + (rnd() - 0.5) * 120)));
    p = c;
  }
  // 13–20 sell-off to ~4813
  const drop = [-5, -7, 2, -8, -6, 3, -9, -4];
  for (const step of drop) {
    const c = p + step;
    bars.push(mk(p, c, 1 + rnd() * 2, 1.5 + rnd() * 2.5, 1300 + rnd() * 700, Math.round(step * 85 + (rnd() - 0.5) * 150)));
    p = c;
  }
  // 21–35 base 4807–4822
  const base = [-3, 4, -2, 3, -4, 2, 3, -2, -3, 4, 1, -3, 3, 2, -1];
  for (const step of base) {
    const c = Math.min(4821, Math.max(4808, p + step));
    bars.push(mk(p, c, 1 + rnd() * 2, 1 + rnd() * 2, 700 + rnd() * 400, Math.round((c - p) * 60 + (rnd() - 0.5) * 100)));
    p = c;
  }
  return bars;
};

const HIST = build();
HIST[4] = { ...HIST[4], h: 4876.5 }; // the old balance's spike high: buy-stop liquidity sits above it
const LAST = HIST[HIST.length - 1].c;

// the three big green candles: full bodies, short upper wicks, each opening inside the previous body
export const S_OPEN = LAST; // candle 1 open (entry reference)
export const SOLDIERS: Bar[] = [
  mk(S_OPEN, S_OPEN + 11, 1.2, 1.5, 2600, 1480),
  mk(S_OPEN + 9, S_OPEN + 21, 1.4, 1.0, 2900, 1620),
  mk(S_OPEN + 19, S_OPEN + 31, 1.6, 1.1, 3100, 1150),
];
// absorption zone: where the pullback's footprint stacks bid volume (upper half of candle 1)
export const ZONE = { lo: S_OPEN + 4, hi: S_OPEN + 7 };
const z = ZONE.lo;
const PULL: Bar[] = [
  mk(S_OPEN + 31, S_OPEN + 25, 0.8, 1.2, 2100, -880),
  mk(S_OPEN + 25, S_OPEN + 17, 0.6, 1.5, 2400, -1050),
  mk(S_OPEN + 17, z + 1.5, 0.8, 1.5, 3300, -1380), // big negative delta, lands on the zone
  mk(z + 1.5, z + 2.5, 1.2, 1.0, 3500, -1240), // still negative delta, but price does not fall: absorption
];
const CONF: Bar[] = [
  mk(z + 2.5, S_OPEN + 16, 0.8, 0.6, 2800, 1420),
  mk(S_OPEN + 15, S_OPEN + 24, 1.0, 0.8, 2500, 1160),
  mk(S_OPEN + 23, S_OPEN + 30, 1.4, 1.0, 2200, 820),
  mk(S_OPEN + 29, S_OPEN + 36, 1.2, 1.2, 2400, 960),
  mk(S_OPEN + 35, S_OPEN + 41, 1.6, 0.8, 2300, 880),
  mk(S_OPEN + 40, S_OPEN + 47, 1.4, 1.2, 2500, 1010),
  mk(S_OPEN + 46, S_OPEN + 50, 1.8, 1.0, 2100, 640),
];

export const BARS: Bar[] = [...HIST, ...SOLDIERS, ...PULL, ...CONF];
export const S1 = HIST.length; // index of candle 1 (36)
export const S3 = S1 + 2;
export const PB0 = S1 + 3; // first pullback bar
export const ABS = [S1 + 5, S1 + 6]; // absorption bars
export const CF0 = S1 + 7; // first confirmation bar
export const N = BARS.length;

/** counter-example: candle 3 with huge volume, huge Delta, small body, long upper wick (absorption at the top) */
export const EXHAUST: Bar[] = BARS.map((b, i) => (i === S3 ? mk(S_OPEN + 19, S_OPEN + 22, 10, 1.1, 6800, 3400) : b));
/** gap chapter: candles 2 and 3 gap above the previous high and run too fast */
export const GAPPED: Bar[] = BARS.map((b, i) => {
  if (i === S1 + 1) return mk(S_OPEN + 15, S_OPEN + 27, 1.4, 0.8, 3300, 1700);
  if (i === S3) return mk(S_OPEN + 31, S_OPEN + 44, 1.6, 0.8, 3600, 1500);
  return b;
});
export const GAP1 = { lo: SOLDIERS[0].h, hi: S_OPEN + 15 - 0.8 }; // gap between candle 1 and 2
export const GAP2 = { lo: S_OPEN + 27 + 1.4, hi: S_OPEN + 31 - 0.8 };

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpBar = (a: Bar, b: Bar, t: number): Bar => ({ o: lerp(a.o, b.o, t), h: lerp(a.h, b.h, t), l: lerp(a.l, b.l, t), c: lerp(a.c, b.c, t), v: lerp(a.v, b.v, t), d: lerp(a.d, b.d, t) });
export const mix = (a: Bar[], b: Bar[], t: number) => (t <= 0 ? a : t >= 1 ? b : a.map((x, i) => lerpBar(x, b[i], t)));

/** cumulative Delta, from bar 0 */
export const cvd = (bars: Bar[]) => {
  let s = 0;
  return bars.map((b) => (s += b.d));
};

// ---------------------------------------------------------------- footprint (1-point levels)
/** Footprint for bar i: volume spread over its range, split bid/ask by the bar's Delta; absorption bars stack bid
 *  volume in the zone. Deterministic per bar. */
export const footprint = (bars: Bar[], i: number): Level[] => {
  const b = bars[i];
  const lo = Math.floor(b.l);
  const hi = Math.ceil(b.h);
  const n = hi - lo + 1;
  const body = (p: number) => p >= Math.min(b.o, b.c) - 0.5 && p <= Math.max(b.o, b.c) + 0.5;
  const w = Array.from({ length: n }, (_, k) => {
    const p = lo + k;
    const stack = ABS.includes(i) && p >= ZONE.lo && p <= ZONE.hi ? 4.2 : 1;
    const shape = body(p) ? 1 : 0.35;
    const jitter = 0.75 + 0.5 * ((Math.sin(i * 12.9898 + p * 78.233) * 43758.5453) % 1 + 1) % 1;
    return shape * stack * jitter;
  });
  const sw = w.reduce((a, x) => a + x, 0);
  const sellShare = 0.5 - b.d / b.v / 2; // bid share of volume implied by Delta
  return w.map((x, k) => {
    const p = lo + k;
    const vol = (b.v * x) / sw;
    const inZone = ABS.includes(i) && p >= ZONE.lo && p <= ZONE.hi;
    const sh = inZone ? Math.min(0.9, sellShare + 0.15) : sellShare;
    return { p, bid: Math.round(vol * sh), ask: Math.round(vol * (1 - sh)) };
  });
};

// ---------------------------------------------------------------- the earlier value area (bars 0–12)
const profile = () => {
  const m = new Map<number, number>();
  for (let i = 0; i <= 12; i++) {
    const b = BARS[i];
    for (let p = Math.floor(b.l); p <= Math.ceil(b.h); p++) {
      const inBody = p >= Math.min(b.o, b.c) && p <= Math.max(b.o, b.c);
      m.set(p, (m.get(p) ?? 0) + b.v * (inBody ? 1 : 0.3));
    }
  }
  const rows = [...m.entries()].sort((a, b) => a[0] - b[0]);
  const tot = rows.reduce((a, r) => a + r[1], 0);
  const poc = rows.reduce((a, r) => (r[1] > a[1] ? r : a))[0];
  // value area: grow from POC until 70% of volume
  let lo = rows.findIndex((r) => r[0] === poc);
  let hi = lo;
  let acc = rows[lo][1];
  while (acc < 0.7 * tot) {
    const up = hi + 1 < rows.length ? rows[hi + 1][1] : -1;
    const dn = lo - 1 >= 0 ? rows[lo - 1][1] : -1;
    if (up >= dn) acc += rows[++hi][1];
    else acc += rows[--lo][1];
  }
  return { rows, poc, val: rows[lo][0], vah: rows[hi][0], max: Math.max(...rows.map((r) => r[1])) };
};
export const PROFILE = profile();
export const PRIOR_HIGH = SOLDIERS[2].h; // the three candles' high
export const LIQ = Math.max(...BARS.slice(0, 13).map((b) => b.h)); // buy-stop liquidity above the old balance
export const STRUCT_LOW = Math.min(...BARS.slice(PB0, CF0).map((b) => b.l));
export const STOP = Math.min(ZONE.lo, STRUCT_LOW) - 2;
