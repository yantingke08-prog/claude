// Illustrative, hand-shaped OHLCV for 《红三兵》 (教学示意: not real market data).
export type Bar = { o: number; h: number; l: number; c: number; v: number };
const B = (o: number, h: number, l: number, c: number, v: number): Bar => ({ o, h, l, c, v });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpBar = (a: Bar, b: Bar, t: number): Bar => ({ o: lerp(a.o, b.o, t), h: lerp(a.h, b.h, t), l: lerp(a.l, b.l, t), c: lerp(a.c, b.c, t), v: lerp(a.v, b.v, t) });

// ---------------------------------------------------------------- definition chart: a soft decline, a base, three soldiers
const CTX: Bar[] = [
  B(112, 113, 108, 109, 60),
  B(109, 111, 107.5, 110, 52),
  B(110, 110.5, 106, 106.5, 66),
  B(106.5, 107.5, 104, 105, 58),
  B(105, 105.6, 102.4, 103.2, 62),
  B(103.2, 104.6, 102.2, 103.9, 48),
  B(103.9, 104.2, 101.8, 102.6, 50),
  B(102.6, 103.6, 101.9, 103.0, 44),
];
export const SOL = [8, 9, 10]; // the three soldiers on the definition chart
/** textbook: closes step up, each open inside the previous body, full bodies, short upper wicks, volume rising gently */
export const STRONG: Bar[] = [...CTX, B(102.9, 106.6, 102.5, 106.2, 62), B(105.4, 109.9, 105.0, 109.4, 74), B(108.6, 113.1, 108.2, 112.6, 86)];
/** stage 1: bodies shrink */
const SHRUNK: Bar[] = [...CTX, B(102.9, 106.6, 102.5, 106.2, 62), B(105.8, 108.2, 105.4, 107.8, 74), B(107.6, 109.9, 107.2, 109.6, 86)];
/** stage 2: upper wicks grow */
const WICKY: Bar[] = [...CTX, B(102.9, 107.0, 102.5, 106.2, 62), B(105.8, 109.9, 105.4, 107.8, 74), B(107.6, 111.8, 107.2, 109.6, 86)];
/** stage 3: volume dries up */
const DRY: Bar[] = WICKY.map((b, i) => (i === 9 ? { ...b, v: 50 } : i === 10 ? { ...b, v: 38 } : b));
/** stage 4a: the third bar spikes; 4b: it gives the move back (long upper wick, small body) */
const SPIKE: Bar[] = DRY.map((b, i) => (i === 10 ? { ...b, h: 113.8, c: 113.2 } : b));
export const WEAK: Bar[] = DRY.map((b, i) => (i === 10 ? { ...b, h: 113.8, c: 108.5 } : b));
export const DEF_STAGES = { STRONG, SHRUNK, WICKY, DRY, SPIKE, WEAK };

// ---------------------------------------------------------------- hook chart: textbook soldiers, then the move fails
export const HOOK: Bar[] = [
  ...STRONG.slice(0, 10),
  B(108.6, 115.6, 108.2, 112.6, 92),
  B(112.4, 112.8, 109.2, 109.6, 88),
  B(109.6, 110.2, 106.4, 106.9, 80),
  B(106.9, 107.6, 104.2, 104.6, 76),
  B(104.6, 105.4, 102.6, 103.2, 70),
];

// ---------------------------------------------------------------- position map: prior high → decline → base → A → trend → B → reversal
const rnd = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const PATH: [number, number][] = [
  [0, 152], [2, 159], [4, 157], [5, 160], [8, 149], [12, 136], [16, 121], [20, 108], [23, 101], [26, 105], [28, 100], [31, 106], [34, 103],
  [35, 107], [38, 121], [42, 129], [45, 126], [49, 136], [52, 134], [56, 145],
];
const target = (i: number) => {
  for (let k = 0; k < PATH.length - 1; k++) {
    const [a, pa] = PATH[k];
    const [b, pb] = PATH[k + 1];
    if (i >= a && i <= b) return lerp(pa, pb, (i - a) / (b - a));
  }
  return PATH[PATH.length - 1][1];
};
const gen = (): Bar[] => {
  const r = rnd(20261116);
  const out: Bar[] = [];
  let prev = 150;
  for (let i = 0; i < 57; i++) {
    const c = target(i) + (r() - 0.5) * 3.2;
    const o = prev + (r() - 0.5) * 0.8;
    const h = Math.max(o, c) + 0.4 + r() * 1.6;
    const l = Math.min(o, c) - 0.4 - r() * 1.6;
    out.push(B(o, h, l, c, 40 + r() * 30));
    prev = c;
  }
  return out;
};
const base = gen();
export const POS_A = [35, 36, 37];
export const POS_B = [57, 58, 59];
export const POS_BARS: Bar[] = [
  ...base.slice(0, 35),
  // A: low, out of a sideways base, early in a new trend
  B(103.6, 107.6, 103.0, 107.2, 70),
  B(106.4, 111.4, 106.0, 110.9, 80),
  B(110.2, 115.6, 109.8, 115.0, 92),
  ...base.slice(38, 57),
  // B: after a long run, accelerating straight into the prior-high zone
  B(145.2, 150.6, 144.8, 150.0, 96),
  B(149.4, 155.4, 149.0, 154.8, 108),
  B(154.4, 161.2, 154.0, 158.4, 120),
  // what came next (illustrative): the push is sold
  B(158.2, 159.0, 152.6, 153.2, 110),
  B(153.2, 154.6, 149.4, 150.2, 96),
  B(150.2, 152.0, 147.0, 147.6, 90),
  B(147.6, 149.4, 143.6, 144.4, 88),
  B(144.4, 146.0, 141.2, 142.0, 80),
  B(142.0, 144.6, 140.6, 143.6, 70),
];
export const POS_RANGE = { i0: 23, i1: 34, lo: 99.5, hi: 108.4 }; // the sideways base A breaks out of
export const POS_RES = { lo: 157, hi: 163 }; // prior-high zone (bars 0–5)
export const POS_SUP = 133; // nearest support under B (last swing low)

// ---------------------------------------------------------------- confirmation chart: soldiers under a key level → break → retest holds → volume follows
export const RES = 120;
export const CONF_SOL = [10, 11, 12];
export const CONF: Bar[] = [
  B(112.0, 115.2, 111.4, 114.5, 46),
  B(114.5, 119.8, 114.0, 118.6, 58),
  B(118.6, 119.9, 115.4, 116.0, 52),
  B(116.0, 116.5, 112.8, 113.4, 48),
  B(113.4, 114.0, 110.5, 111.2, 50),
  B(111.2, 113.0, 110.4, 112.4, 40),
  B(112.4, 112.8, 109.6, 110.4, 44),
  B(110.4, 111.0, 108.6, 109.4, 42),
  B(109.4, 110.8, 108.8, 110.2, 38),
  B(110.2, 110.6, 108.5, 109.3, 40),
  B(109.0, 113.2, 106.6, 112.8, 54),
  B(112.2, 116.4, 111.8, 116.0, 62),
  B(115.6, 119.8, 115.2, 119.4, 70),
  B(119.6, 124.8, 119.2, 124.2, 108), // breakout through 120 on volume
  B(124.2, 124.6, 121.6, 122.4, 52), // retest on lighter volume
  B(122.4, 122.8, 120.3, 121.0, 42),
  B(121.0, 123.0, 120.4, 122.6, 46),
  B(122.6, 125.6, 122.2, 125.2, 74), // volume follows through
  B(125.2, 128.1, 124.8, 127.6, 80),
  B(127.6, 130.0, 127.2, 129.4, 84),
];
