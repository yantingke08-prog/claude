// Mock price data (teaching illustration, not a real market) and the world mapping shared by the 3D scene and the HUD.
export type Bar = { o: number; h: number; l: number; c: number; v: number };

/** world units: one bar = XS, one price unit = YS, price BASE sits at y = 0 */
export const XS = 0.5;
export const YS = 2.0;
export const BASE = 98.3;
/** each chart stands on its own spot of one long stage; the camera travels between them */
export type Stage = { ox: number; oy: number };
export const SA: Stage = { ox: 0, oy: 0 }; // the range and the sweep
export const SB: Stage = { ox: -40, oy: -2.6 }; // the three checks / the test / the stop hugging the level
export const SC: Stage = { ox: -70, oy: -2.6 }; // same market, stop outside the structure (lateral comparison)
export const LADDER_X = 22; // order-book ladder
export const FLOOR_Y = -6.2;
export const px = (i: number, st: Stage = SA) => st.ox + (i - 24) * XS;
export const py = (p: number, st: Stage = SA) => st.oy + (p - BASE) * YS;

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const path = (keys: [number, number][], n: number) =>
  Array.from({ length: n }, (_, i) => {
    let k = 0;
    while (k < keys.length - 2 && keys[k + 1][0] <= i) k++;
    const [a, pa] = keys[k];
    const [b, pb] = keys[k + 1];
    const t = Math.min(1, Math.max(0, (i - a) / (b - a)));
    return pa + (pb - pa) * (t * t * (3 - 2 * t));
  });
const build = (keys: [number, number][], n: number, seed: number, open0: number) => {
  const r = rng(seed);
  const tgt = path(keys, n);
  const out: Bar[] = [];
  let o = open0;
  for (let i = 0; i < n; i++) {
    const c = tgt[i] + (r() - 0.5) * 0.34;
    const h = Math.max(o, c) + 0.04 + r() * 0.16;
    const l = Math.min(o, c) - 0.04 - r() * 0.16;
    out.push({ o, h, l, c, v: 0.8 + r() * 0.55 });
    o = c + (r() - 0.5) * 0.04;
  }
  return out;
};
const r2 = (x: number) => Math.round(x * 100) / 100;
const tidy = (b: Bar[]) => b.map((x) => ({ o: r2(x.o), h: r2(x.h), l: r2(x.l), c: r2(x.c), v: x.v }));

// ---------------------------------------------------------------- series A: the range and the sweep above its high
export const A_HIGH = 99.62; // prior high (bar A_HI)
export const A_LOW = 96.48; // prior low (bar A_LO)
export const ROUND = 100.0; // round number
export const A_HI = 12;
export const A_LO = 24;
export const HUNT = 42; // the sweep bar
export const A_N = 48;
export const SERIES_A: Bar[] = (() => {
  const b = build(
    [[0, 97.3], [6, 98.4], [11, 99.25], [13, 99.0], [18, 97.6], [23, 96.85], [25, 96.95], [29, 97.7], [34, 98.5], [38, 98.95], [41, 99.2], [42, 99.1], [45, 98.6], [47, 98.35]],
    A_N,
    11,
    97.1,
  );
  for (let i = 0; i < A_N; i++) {
    const x = b[i];
    if (i !== A_HI) x.h = Math.min(x.h, A_HIGH - 0.16 - (i > 30 ? 0 : 0.1)), (x.o = Math.min(x.o, x.h - 0.02)), (x.c = Math.min(x.c, x.h - 0.02));
    if (i !== A_LO) x.l = Math.max(x.l, A_LOW + 0.16), (x.o = Math.max(x.o, x.l + 0.02)), (x.c = Math.max(x.c, x.l + 0.02));
  }
  b[A_HI] = { o: 99.18, h: A_HIGH, l: 99.02, c: 99.3, v: 1.5 };
  b[A_HI + 1].o = 99.28;
  b[A_LO] = { o: 96.92, h: 97.02, l: A_LOW, c: 96.8, v: 1.6 };
  b[A_LO + 1].o = 96.82;
  b[HUNT - 1] = { ...b[HUNT - 1], c: 99.22 };
  b[HUNT] = { o: 99.22, h: 100.18, l: 99.06, c: 99.12, v: 4.4 };
  b[HUNT + 1].o = 99.1;
  return tidy(b);
})();

// ---------------------------------------------------------------- series B: approach a high, then two outcomes
export const B_HIGH = 99.7; // prior high of series B (bar B_HI)
export const B_HI = 10;
export const TOUCH = 28; // first touch of the level
export const B_N = 34;
const B_PRE: Bar[] = (() => {
  const b = build(
    [[0, 98.0], [5, 98.8], [9, 99.45], [11, 99.35], [15, 98.6], [18, 98.25], [22, 98.8], [26, 99.3], [27, 99.42]],
    TOUCH,
    29,
    97.9,
  );
  for (let i = 0; i < TOUCH; i++) {
    const x = b[i];
    if (i !== B_HI) x.h = Math.min(x.h, B_HIGH - 0.18), (x.o = Math.min(x.o, x.h - 0.02)), (x.c = Math.min(x.c, x.h - 0.02));
  }
  b[B_HI] = { o: 99.36, h: B_HIGH, l: 99.26, c: 99.48, v: 1.4 };
  b[B_HI + 1].o = 99.46;
  b[TOUCH - 1] = { ...b[TOUCH - 1], c: 99.44, h: Math.max(b[TOUCH - 1].h, 99.48) };
  return tidy(b);
})();
/** real breakout: volume expands at the first touch, holds above, retest is bought */
export const SERIES_REAL: Bar[] = [
  ...B_PRE,
  { o: 99.44, h: 99.98, l: 99.4, c: 99.92, v: 3.3 },
  { o: 99.92, h: 100.2, l: 99.86, c: 100.14, v: 2.1 },
  { o: 100.14, h: 100.22, l: 99.98, c: 100.04, v: 1.3 },
  { o: 100.04, h: 100.08, l: 99.74, c: 100.0, v: 1.7 }, // retest of the level, long lower wick
  { o: 100.0, h: 100.42, l: 99.96, c: 100.36, v: 1.9 },
  { o: 100.36, h: 100.66, l: 100.3, c: 100.6, v: 1.6 },
];
/** liquidity test: pierce, close straight back inside, nobody follows */
export const SERIES_TEST: Bar[] = [
  ...B_PRE,
  { o: 99.44, h: 99.92, l: 99.36, c: 99.4, v: 1.15 },
  { o: 99.4, h: 99.46, l: 99.12, c: 99.2, v: 0.95 },
  { o: 99.2, h: 99.28, l: 98.98, c: 99.04, v: 0.9 },
  { o: 99.04, h: 99.12, l: 98.8, c: 98.86, v: 0.85 },
  { o: 98.86, h: 98.98, l: 98.66, c: 98.74, v: 0.8 },
  { o: 98.74, h: 98.9, l: 98.62, c: 98.82, v: 0.75 },
];
/** wick high of the test bar: the structure the buffer is measured from */
export const TEST_WICK = 99.92;
export const avgVol = (b: Bar[], i: number, n = 10) => b.slice(Math.max(0, i - n), i).reduce((s, x) => s + x.v, 0) / Math.min(n, i);

export const mixBars = (a: Bar[], b: Bar[], t: number): Bar[] => {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return a.map((x, i) => {
    const y = b[i] ?? x;
    const m = (p: number, q: number) => p + (q - p) * t;
    return { o: m(x.o, y.o), h: m(x.h, y.h), l: m(x.l, y.l), c: m(x.c, y.c), v: m(x.v, y.v) };
  });
};

/** one more probe after the test: sweeps the stops hugging the level, stays below the structure high */
export const SPIKE: Bar = { o: 98.82, h: 99.88, l: 98.76, c: 98.9, v: 1.6 };
export const SERIES_STOP: Bar[] = [...SERIES_TEST, SPIKE];
export const SPIKE_I = SERIES_TEST.length;
export const BAD_STOP = B_HIGH + 0.06;
export const GOOD_STOP = (span: number) => TEST_WICK + span;

// ---------------------------------------------------------------- resting stop orders: a few large, readable bricks
export type Brick = { x: number; y: number; z: number; w: number; h: number; d: number; layer: number; k: number; t: number; price: number };
export const BRICK_H = 0.15;
const GAP_Y = 0.05;
const GAP_X = 0.07;
/**
 * A stack of order bricks on the far side of a level (dir +1 above, -1 below), right-aligned to the latest bars.
 * layers = bricks per layer, nearest the level first. t = order of appearance (bottom layer, oldest first).
 */
export const stack = (st: Stage, level: number, dir: 1 | -1, i0: number, i1: number, layers: number[]): Brick[] => {
  const x0 = px(i0, st);
  const x1 = px(i1, st) + 0.25;
  const w = (x1 - x0) / layers[0] - GAP_X;
  const out: Brick[] = [];
  const total = layers.reduce((a, b) => a + b, 0);
  let n = 0;
  layers.forEach((count, layer) => {
    for (let k = count - 1; k >= 0; k--) {
      const y = py(level, st) + dir * (0.06 + BRICK_H / 2 + layer * (BRICK_H + GAP_Y));
      out.push({ x: x1 - (k + 0.5) * (w + GAP_X), y, z: -0.78, w, h: BRICK_H, d: 0.95, layer, k, t: n++ / total, price: (y - st.oy) / YS + BASE });
    }
  });
  return out;
};
export const STACK_HI = stack(SA, A_HIGH, 1, 28, 41, [6, 5, 4]);
export const STACK_LO = stack(SA, A_LOW, -1, 26, 41, [6, 5, 4]);
export const STACK_RD = stack(SA, ROUND, 1, 31, 41, [4, 3]);
export const STACK_B = stack(SB, B_HIGH, 1, 14, 27, [6, 5, 4]);
export const STACK_C = stack(SC, B_HIGH, 1, 14, 27, [6, 5, 4]);
/** your stop in the opening: one brick of the stack above the high */
export const YOU_BRICK = STACK_HI.find((b) => b.layer === 0 && b.k === 1)!;
