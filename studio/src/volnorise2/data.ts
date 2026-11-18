// Fixed illustrative market data and the layout of the stage. Teaching sketch only, not real quotes.
// Two sets along x: the hook chart (one long chart + volume), and the comparison set: A (the same "heavy volume,
// no rise" candle low in a trend) and B (the same candle after a long rally) standing SIDE BY SIDE, each normalised
// to the same box so the two can be read at a glance in the wide shot and filled edge to edge in the close-ups.

export const FLOOR_Y = -6.2;

export const X = { hook: 0, ab: 22 } as const;
/** A and B stand at X.ab -/+ AB_DX */
export const AB_DX = 3.9;

export type Bar = { o: number; h: number; l: number; c: number; v: number };
/** a chart standing in the world: x0/xs = first bar x and spacing, p0/ys/y0 = price -> world y, vb = volume base, vk = volume scale */
export type Chart = { x0: number; xs: number; p0: number; ys: number; y0: number; vb: number; vk: number; bars: Bar[] };
const B = (o: number, h: number, l: number, c: number, v: number): Bar => ({ o, h, l, c, v });

export const cx = (ch: Chart, i: number) => ch.x0 + i * ch.xs;
export const cy = (ch: Chart, p: number) => ch.y0 + (p - ch.p0) * ch.ys;
export const vy = (ch: Chart, v: number) => ch.vb + v * ch.vk;
/** world-space box of a chart: candles (price) and the volume panel */
export const box = (ch: Chart) => {
  const lo = Math.min(...ch.bars.map((b) => b.l));
  const hi = Math.max(...ch.bars.map((b) => b.h));
  const vmax = Math.max(...ch.bars.map((b) => b.v));
  return { x0: cx(ch, 0) - ch.xs * 0.5, x1: cx(ch, ch.bars.length - 1) + ch.xs * 0.5, pLo: cy(ch, lo), pHi: cy(ch, hi), vLo: ch.vb, vHi: vy(ch, vmax) };
};

// ---------------------------------------------------------------- hook: a full chart whose last candle is the question
export const HOOK: Chart = {
  x0: X.hook - 5.25,
  xs: 0.3,
  p0: 9.8,
  ys: 1.38,
  y0: -1.45,
  vb: -3.45,
  vk: 0.4,
  bars: [
    B(10.02, 10.12, 9.9, 10.06, 0.9), B(10.06, 10.15, 9.96, 9.99, 0.8), B(9.99, 10.1, 9.92, 10.08, 0.8), B(10.08, 10.2, 10.0, 10.16, 1.0),
    B(10.16, 10.22, 10.04, 10.07, 0.8), B(10.07, 10.18, 10.0, 10.14, 0.7), B(10.14, 10.32, 10.1, 10.28, 1.2), B(10.28, 10.36, 10.18, 10.22, 0.9),
    B(10.22, 10.42, 10.18, 10.38, 1.1), B(10.38, 10.56, 10.32, 10.52, 1.3), B(10.52, 10.6, 10.4, 10.45, 0.9), B(10.45, 10.62, 10.4, 10.58, 1.0),
    B(10.58, 10.78, 10.52, 10.74, 1.3), B(10.74, 10.82, 10.6, 10.66, 1.0), B(10.66, 10.76, 10.56, 10.7, 0.8), B(10.7, 10.92, 10.66, 10.88, 1.2),
    B(10.88, 11.08, 10.82, 11.02, 1.4), B(11.02, 11.1, 10.9, 10.96, 1.0), B(10.96, 11.04, 10.86, 10.92, 0.9), B(10.92, 11.12, 10.88, 11.08, 1.1),
    B(11.08, 11.3, 11.02, 11.26, 1.5), B(11.26, 11.36, 11.14, 11.2, 1.1), B(11.2, 11.44, 11.16, 11.4, 1.3), B(11.4, 11.62, 11.34, 11.58, 1.6),
    B(11.58, 11.66, 11.44, 11.5, 1.1), B(11.5, 11.6, 11.4, 11.56, 0.9), B(11.56, 11.78, 11.5, 11.74, 1.4), B(11.74, 11.96, 11.68, 11.92, 1.7),
    B(11.92, 12.02, 11.8, 11.86, 1.2), B(11.86, 12.06, 11.82, 12.02, 1.4), B(12.02, 12.24, 11.96, 12.2, 1.8), B(12.2, 12.3, 12.08, 12.14, 1.2),
    B(12.14, 12.36, 12.1, 12.32, 1.6), B(12.32, 12.46, 12.24, 12.4, 1.5),
    // the question: heavy volume, long upper wick, close barely above the open
    B(12.4, 12.98, 12.3, 12.46, 3.4),
  ],
};
export const HOOK_H = HOOK.bars.length - 1;

// ---------------------------------------------------------------- A and B share one box: price 4.0 high, volume <= 1.1, 0.45 apart
const XS = 0.26;
const VB = -3.0; // volume base of both charts
const P_LO = VB + 1.1 + 0.45; // where each chart's lowest price sits
const P_H = 4.0;

// A: low in the trend (a hand-over: more likely a shakeout)
export const A_H = 13;
const A_BARS = [
  // base platform
  B(10.1, 10.22, 9.98, 10.04, 0.8), B(10.04, 10.18, 9.96, 10.14, 0.7), B(10.14, 10.26, 10.04, 10.08, 0.8), B(10.08, 10.2, 10.0, 10.16, 0.7),
  B(10.16, 10.28, 10.06, 10.1, 0.6), B(10.1, 10.24, 10.02, 10.2, 0.8), B(10.2, 10.3, 10.1, 10.16, 0.7),
  // first leg up
  B(10.16, 10.42, 10.12, 10.38, 1.2), B(10.38, 10.6, 10.32, 10.56, 1.3), B(10.56, 10.66, 10.44, 10.5, 1.0), B(10.5, 10.8, 10.46, 10.76, 1.4),
  B(10.76, 11.08, 10.7, 11.02, 1.5), B(11.02, 11.52, 10.98, 11.48, 1.7),
  // A_H: heavy volume, no rise
  B(11.5, 11.98, 11.38, 11.55, 3.0),
  // pullback on shrinking volume
  B(11.55, 11.62, 11.42, 11.47, 1.6), B(11.47, 11.53, 11.41, 11.44, 1.2), B(11.44, 11.49, 11.4, 11.42, 0.9), B(11.42, 11.47, 11.39, 11.41, 0.7),
  // tests the heavy candle's low and holds it (a long lower wick, closes back above)
  B(11.41, 11.45, 11.3, 11.4, 0.8),
  // back up, higher lows, then through the heavy candle's high
  B(11.4, 11.58, 11.36, 11.54, 1.1), B(11.54, 11.7, 11.48, 11.66, 1.2), B(11.66, 11.9, 11.6, 11.85, 1.4), B(11.85, 12.14, 11.8, 12.08, 1.8),
];
// B: after a long rally (watch for distribution)
export const B_H = 15;
const B_BARS = [
  B(10.0, 10.3, 9.92, 10.24, 1.0), B(10.24, 10.7, 10.18, 10.64, 1.1), B(10.64, 10.8, 10.4, 10.5, 0.9), B(10.5, 11.1, 10.46, 11.04, 1.2),
  B(11.04, 11.6, 10.98, 11.52, 1.3), B(11.52, 11.7, 11.2, 11.3, 1.0), B(11.3, 12.1, 11.26, 12.02, 1.4), B(12.02, 12.7, 11.96, 12.62, 1.5),
  B(12.62, 13.2, 12.5, 13.12, 1.5), B(13.12, 13.3, 12.8, 12.92, 1.1), B(12.92, 13.7, 12.88, 13.62, 1.6), B(13.62, 14.3, 13.56, 14.22, 1.7),
  B(14.22, 14.9, 14.1, 14.8, 1.8), B(14.8, 15.2, 14.5, 14.62, 1.3), B(14.62, 15.5, 14.56, 15.42, 1.9),
  // B_H: the same heavy volume, no rise, far above where the rally started
  B(15.5, 16.4, 15.0, 15.56, 3.4),
  // down on heavy volume
  B(15.54, 15.62, 15.12, 15.2, 2.4),
  // through the heavy candle's low, short lower wick, volume up again
  B(15.2, 15.26, 14.66, 14.72, 2.8),
  // a weak rebound on low volume that cannot get back above the line
  B(14.72, 14.96, 14.64, 14.9, 1.0), B(14.9, 15.06, 14.84, 14.92, 0.9),
  // and lower
  B(14.92, 14.98, 14.5, 14.56, 2.2), B(14.56, 14.7, 14.06, 14.16, 2.5), B(14.16, 14.3, 13.84, 13.92, 2.0),
];

const fit = (bars: Bar[], x: number): Chart => {
  const lo = Math.min(...bars.map((b) => b.l));
  const hi = Math.max(...bars.map((b) => b.h));
  const vmax = Math.max(...bars.map((b) => b.v));
  return { x0: x - ((bars.length - 1) * XS) / 2, xs: XS, p0: lo, ys: P_H / (hi - lo), y0: P_LO, vb: VB, vk: 1.1 / vmax, bars };
};
export const A = fit(A_BARS, X.ab - AB_DX);
export const Bc = fit(B_BARS, X.ab + AB_DX);

/** the key line on both charts: the heavy candle's low */
export const A_LEVEL = A.bars[A_H].l;
export const B_LEVEL = Bc.bars[B_H].l;
/** where each rally started */
export const A_START = 10.16;
export const B_START = 10.0;
/** % from the start of the move to the heavy candle's close */
export const pct = (from: number, to: number) => Math.round(((to - from) / from) * 100);
