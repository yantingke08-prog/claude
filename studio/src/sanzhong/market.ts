// Seeded synthetic data (教学示意). Math.random is banned: every render tab must draw the same chart.
import { mulberry32 } from "../lib/rng";
import type { Candle } from "./kit";

/** Random-walk candles following a list of drifts (ticks per bar), with body noise and short wicks. */
export const walk = (seed: number, start: number, drifts: number[], noise = 1.6, wick = 0.9): Candle[] => {
  const r = mulberry32(seed);
  let p = start;
  return drifts.map((d) => {
    const o = p;
    const c = o + d + (r() - 0.5) * noise;
    const h = Math.max(o, c) + r() * wick;
    const l = Math.min(o, c) - r() * wick;
    p = c;
    return { o, h, l, c };
  });
};

export const range = (ks: Candle[]) => ({ min: Math.min(...ks.map((k) => k.l)), max: Math.max(...ks.map((k) => k.h)) });

/** Stable sizes for book rows. */
export const sizes = (seed: number, n: number, lo: number, hi: number) => {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => Math.round(lo + (hi - lo) * r()));
};

// Hook / who: a steady climb, the chase bar, then the turn.
export const HOOK_BASE = walk(11, 0, [1.2, 0.8, -0.6, 1.4, 0.9, -0.4, 1.1, 1.3, -0.8, 1.0, 1.5, 0.6, -0.5, 1.2, 1.7, 0.9], 1.4, 0.8);
const hb = HOOK_BASE[HOOK_BASE.length - 1].c;
export const HOOK_CHASE: Candle = { o: hb, c: hb + 6.5, h: hb + 7.2, l: hb - 0.3 };
export const HOOK_TURN: Candle = { o: hb + 6.4, c: hb - 2.2, h: hb + 7.6, l: hb - 2.8 };
export const HOOK_ALL = [...HOOK_BASE, HOOK_CHASE, HOOK_TURN];

// Absorb: a tight range on heavy volume.
export const ABSORB = walk(23, 0, [0.4, -0.5, 0.3, -0.2, 0.5, -0.4, 0.2, -0.3, 0.1, -0.2], 0.9, 1.1);
export const ABSORB_VOL = sizes(29, ABSORB.length, 55, 100);

// Forced / cascade: drift above a key level, then the break.
export const PRE_BREAK = walk(31, 8.6, [-0.6, 0.8, -1.1, 0.5, -0.9, 0.6, -0.8, -0.4, 0.6, -1.2], 1.8, 1.0);
export const KEY_LEVEL = 3.2;

// Accept: a base, a breakout over the level, two endings.
export const ACC_BASE = walk(41, 0, [0.4, -0.3, 0.5, -0.4, 0.3, -0.2, 0.4, -0.3], 0.9, 0.6);
export const ACC_LEVEL = 2.2;

// Next: volume profile (bell-ish, seeded bumps).
export const PROFILE = (() => {
  const r = mulberry32(53);
  const n = 17;
  return Array.from({ length: n }, (_, i) => {
    const x = (i - 8.5) / 4.2;
    return Math.round(100 * Math.exp(-x * x) * (0.82 + 0.3 * r()) + 6);
  });
})();
