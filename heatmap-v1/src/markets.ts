// Illustrative order-book "markets": a liquidity field (COLS x ROWS, 0..1) plus a traded-price path.
// Everything is synthetic and deterministic — 教学示意，非实盘数据.
import { COLS, ROWS, clamp, hash, lerp, smooth, vnoise } from "./config.ts";

export type Wall = {
  row: number;
  c0: number;
  c1: number;
  amp: number;
  /** row spread (sigma) */
  w?: number;
  /** hard edges = the wall is pulled / placed in one snapshot */
  hardStart?: boolean;
  hardEnd?: boolean;
};
export type Hole = { r0: number; r1: number; c0: number; c1: number; depth: number };

export type Market = {
  id: string;
  field: Float32Array; // index c * ROWS + r
  path: Float32Array; // price row per column
  walls: Wall[];
  holes: Hole[];
};

const buildPath = (keys: [number, number][], seed: number, jitter: number) => {
  const p = new Float32Array(COLS);
  for (let c = 0; c < COLS; c++) {
    let k = 0;
    while (k < keys.length - 2 && c > keys[k + 1][0]) k++;
    const [c0, r0] = keys[k];
    const [c1, r1] = keys[k + 1];
    const t = clamp((c - c0) / Math.max(1e-6, c1 - c0));
    // jitter is damped on fast legs so breaks stay clean
    const speed = Math.abs(r1 - r0) / Math.max(1, c1 - c0);
    const j = (vnoise(c * 0.9, seed) - 0.5) * 2 * jitter * (1 - smooth(0.8, 2.5, speed));
    p[c] = clamp(lerp(r0, r1, t) + j, 1, ROWS - 2);
  }
  return p;
};

const make = (opts: {
  id: string;
  seed: number;
  keys: [number, number][];
  jitter?: number;
  walls?: Wall[];
  holes?: Hole[];
  base?: number;
}): Market => {
  const { id, seed, keys, jitter = 0.7, walls = [], holes = [], base = 1 } = opts;
  const path = buildPath(keys, seed, jitter);
  const field = new Float32Array(COLS * ROWS);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      // resting liquidity: some price levels are habitually heavier (horizontal streaks over time)
      const lvl = Math.pow(hash(r, seed, 7), 3.2);
      const streak = 0.55 + 0.45 * vnoise(c / 9 + r * 17.3, seed + r);
      const fine = (hash(c, r, seed) - 0.5) * 0.05;
      const dist = Math.abs(r - path[c]);
      const away = 0.45 + 0.55 * smooth(0.5, 12, dist); // books are thinner right at the price
      let v = (0.05 + 0.5 * lvl * streak) * away * base + fine + 0.02;
      for (const h of holes) {
        const inR = smooth(h.r0 - 1.2, h.r0 + 0.6, r) * (1 - smooth(h.r1 - 0.6, h.r1 + 1.2, r));
        const inC = smooth(h.c0 - 2, h.c0 + 1, c) * (1 - smooth(h.c1 - 1, h.c1 + 2, c));
        v *= 1 - (1 - h.depth) * inR * inC;
      }
      for (const w of walls) {
        const s = w.w ?? 0.7;
        const dr = r - w.row;
        const g = Math.exp(-(dr * dr) / (2 * s * s));
        const on = (w.hardStart ? (c >= w.c0 ? 1 : 0) : smooth(w.c0 - 2, w.c0 + 1.5, c)) * (w.hardEnd ? (c <= w.c1 ? 1 : 0) : 1 - smooth(w.c1 - 1.5, w.c1 + 2, c));
        const life = 0.88 + 0.12 * vnoise(c * 0.6, seed + 99);
        v += w.amp * g * on * life;
      }
      // liquidity at the traded price is being eaten
      if (dist < 1.2) v *= 0.35 + 0.65 * (dist / 1.2);
      field[c * ROWS + r] = clamp(v);
    }
  }
  return { id, field, path, walls, holes };
};

/** Hook + pitfall replay: a thick bid wall under the price, pulled the moment price arrives. */
export const HOOK_WALL: Wall = { row: 20, c0: 0, c1: 61, amp: 1.0, w: 0.72, hardEnd: true };
export const HOOK = make({
  id: "hook",
  seed: 11,
  keys: [
    [0, 41],
    [16, 38],
    [30, 33],
    [44, 27],
    [55, 22.8],
    [61, 22.3],
    [63, 19],
    [68, 10],
    [78, 7.5],
    [89, 9],
  ],
  walls: [HOOK_WALL, { row: 47, c0: 0, c1: 89, amp: 0.35, w: 0.9 }],
});

/** A calm, typical book — used to explain what a heatmap is and how to read it. */
export const INTRO = make({
  id: "intro",
  seed: 23,
  keys: [
    [0, 28],
    [12, 30],
    [25, 27.5],
    [38, 31],
    [50, 33],
    [62, 29.5],
    [75, 26.5],
    [89, 28.5],
  ],
  walls: [
    { row: 42, c0: 0, c1: 89, amp: 0.72, w: 0.75 },
    { row: 14, c0: 0, c1: 89, amp: 0.5, w: 0.8 },
    { row: 36, c0: 30, c1: 60, amp: 0.36, w: 0.7 },
  ],
});

/** Three things you can see: a wall (row 48), a liquidity hole (rows 23–36, early), a pulled band (row 29). */
export const THREE_WALL: Wall = { row: 48, c0: 0, c1: 89, amp: 1.0, w: 0.8 };
export const THREE_HOLE: Hole = { r0: 23, r1: 36, c0: 0, c1: 32, depth: 0.1 };
export const THREE_PULL: Wall = { row: 29, c0: 32, c1: 66, amp: 0.6, w: 0.68, hardEnd: true };
export const THREE = make({
  id: "three",
  seed: 37,
  keys: [
    [0, 39.5],
    [9, 38],
    [15, 39.5],
    [20, 37.8],
    [23, 28],
    [26, 21],
    [31, 19.5],
    [42, 21.5],
    [52, 22.5],
    [60, 24.5],
    [66, 26.6],
    [69, 27.3],
    [72, 29.4],
    [76, 31],
    [82, 30],
    [89, 31],
  ],
  walls: [THREE_WALL, THREE_PULL, { row: 8, c0: 0, c1: 89, amp: 0.38, w: 0.9 }],
  holes: [THREE_HOLE],
});

/** A wall that blinks: placed for a few snapshots, gone, placed again — far from the price. */
export const SPOOF_SEGS: [number, number][] = [
  [12, 18],
  [27, 32],
  [41, 46],
  [56, 60],
  [70, 75],
];
export const SPOOF_ROW = 40;
export const SPOOF = make({
  id: "spoof",
  seed: 51,
  keys: [
    [0, 22],
    [30, 24.5],
    [60, 21.5],
    [89, 23.5],
  ],
  walls: SPOOF_SEGS.map(([c0, c1]) => ({ row: SPOOF_ROW, c0, c1, amp: 0.95, w: 0.7, hardStart: true, hardEnd: true })),
});

export const MARKETS = { HOOK, INTRO, THREE, SPOOF };
