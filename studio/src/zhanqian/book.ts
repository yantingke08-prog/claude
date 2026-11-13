// The order book as data. Everything that happens to it is written down once, as a schedule keyed to
// the narration, and read as a pure function of the frame. The 3D walls, the 2D ladder, the tape, the
// volume bars and the score all read this one schedule. Illustrative numbers only.
import { mulberry32 } from "../lib/rng";
import { L, Lc } from "./cue";

export const LV = 1.1; // world height of one price level
export const BW = 0.7; // spacing of the resting orders on a level
export const ky = (k: number) => k * LV;
export const TICK = 0.25;
export const price = (k: number) => 5000 + k * TICK;
export const px = (k: number) => price(k).toFixed(2);

export type Side = "bid" | "ask";
export type Level = { side: Side; k: number; n: number; at: number };
const NS = [9, 7, 10, 8, 6, 5, 4, 5, 8, 11];

/** when the walls go up (each level lands a little after the one nearer the middle). Kept quick so both
 *  walls are standing ~2 s before "两堵墙" ends: bids done ≈ 14.2 s, asks done ≈ 15.6 s, a3 starts 17.8 s */
export const bidAt = (k: number) => Lc("a2", "买方") + 3 + -k * 3;
export const askAt = (k: number) => Lc("a2", "卖方") + 2 + k * 2.2;
/** frames between bricks on one wall level, and how long one brick takes to drop in */
export const WALL_STAG = 0.6;
export const WALL_DROP = 8;
export const LEVELS: Level[] = [
  ...[-1, -2, -3, -4, -5, -6].map((k) => ({ side: "bid" as const, k, n: [10, 8, 11, 7, 9, 10][-k - 1], at: bidAt(k) })),
  ...NS.map((n, i) => ({ side: "ask" as const, k: i + 1, n, at: askAt(i + 1) })),
];
/** lots carried by brick j of level k (seeded, 3–10 lots) */
export const lots = (k: number, j: number) => 3 + Math.floor(mulberry32(k * 131 + j * 17 + 7)() * 8);

/** who eats what, when: bricks j0..j1-1 of ask level k are hit between frames f0 and f1 */
type Eat = { k: number; j0: number; j1: number; f0: number; f1: number; stop?: boolean };
export const FIRST_HIT = Lc("a5", "每一笔") + 10;
const a6 = Lc("a6", "不看");
const o3 = Lc("o3", "直接吃掉");
export const GONE = Lc("o4", "被吃光");
export const JUMP = Lc("o4", "跳到");
const o5 = L("o5");
export const JUMP2 = Lc("o5", "再跳");
export const ARMED = Lc("s3", "触发价");
export const CONVERT = Lc("s3", "变成");
export const CHAIN = L("s4");
const STEP = 15;
export const EATS: Eat[] = [
  { k: 1, j0: 0, j1: 1, f0: FIRST_HIT, f1: FIRST_HIT },
  { k: 1, j0: 1, j1: 4, f0: a6, f1: a6 + 36 },
  { k: 1, j0: 4, j1: 8, f0: o3, f1: GONE - 10 },
  { k: 1, j0: 8, j1: 9, f0: GONE, f1: GONE },
  { k: 2, j0: 0, j1: 7, f0: o5 - 2, f1: JUMP2 - 6 },
  { k: 3, j0: 0, j1: 10, f0: L("s3") + 2, f1: ARMED + 2 },
  { k: 4, j0: 0, j1: 8, f0: CONVERT, f1: CONVERT + 14, stop: true },
  { k: 5, j0: 0, j1: 6, f0: CHAIN, f1: CHAIN + 10, stop: true },
  { k: 6, j0: 0, j1: 5, f0: CHAIN + STEP, f1: CHAIN + STEP + 9, stop: true },
  { k: 7, j0: 0, j1: 4, f0: CHAIN + STEP * 2, f1: CHAIN + STEP * 2 + 7, stop: true },
];
/** the frame each ask level is cleared, which is when the price steps onto it */
export const HOPS: Record<number, number> = { 1: JUMP, 2: JUMP2, 3: ARMED + 6, 4: CONVERT + 18, 5: CHAIN + 13, 6: CHAIN + STEP + 12, 7: CHAIN + STEP * 2 + 10 };
/** hops driven by stops (they shake the camera and flash) */
export const STOP_HOPS = [4, 5, 6, 7].map((k) => HOPS[k]);

/** buy stops hidden behind the wall: level → the frame it detonates (the price has just reached it) */
export const MINES: { k: number; at: number; n: number }[] = [
  { k: 4, at: CONVERT - 4, n: 4 },
  { k: 5, at: CHAIN - 2, n: 4 },
  { k: 6, at: CHAIN + STEP - 2, n: 3 },
  { k: 7, at: CHAIN + STEP * 2 - 2, n: 3 },
];
export const MINES_IN = L("o6");
export const TRIGGER_K = 4;

/** hit frame of brick j on ask level k (Infinity if it survives the film) */
export const hitAt = (k: number, j: number) => {
  for (const e of EATS) {
    if (e.k === k && j >= e.j0 && j < e.j1) return e.j1 - e.j0 <= 1 ? e.f0 : e.f0 + ((j - e.j0) / (e.j1 - e.j0 - 1)) * (e.f1 - e.f0);
  }
  return Infinity;
};
export const isStop = (k: number) => EATS.some((e) => e.k === k && e.stop);

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
/** the price, in levels above the start (fractional while it hops) */
export const beadK = (f: number) => Object.values(HOPS).reduce((s, at) => s + ease((f - at) / 8), 0);
/** last traded level (integer) */
export const lastK = (f: number) => Object.values(HOPS).filter((a) => f >= a).length;

/** new resting bids filling in under the price as it climbs (only the slow steps get any) */
export const REFILLS = [
  { k: 0, n: 7, at: HOPS[1] + 8 },
  { k: 1, n: 5, at: HOPS[2] + 8 },
];
/** extra passive orders that land while the narration explains them */
export const PASSIVE_AT = Lc("o2", "它挂着");
export const PASSIVE = [
  { k: -1, n: 3, at: PASSIVE_AT },
  { k: -2, n: 2, at: PASSIVE_AT + 10 },
];

// ------------------------------------------------------------------ the tape, as derived data
export type Trade = { f: number; k: number; q: number; stop: boolean };
export const TRADES: Trade[] = EATS.flatMap((e) => Array.from({ length: e.j1 - e.j0 }, (_, i) => ({ f: Math.round(hitAt(e.k, e.j0 + i)), k: e.k, q: lots(e.k, e.j0 + i), stop: !!e.stop }))).sort((a, b) => a.f - b.f);
/** resting size on a level at frame f (0 when it has not landed yet) */
export const sizeAt = (f: number, side: Side, k: number) => {
  let q = 0;
  for (const l of LEVELS) {
    if (l.side !== side || l.k !== k) continue;
    for (let j = 0; j < l.n; j++) if (f >= l.at + j * WALL_STAG && f < hitAt(k, j)) q += lots(k, j);
  }
  if (side === "bid") {
    for (const r of [...REFILLS, ...PASSIVE].filter((r) => r.k === k)) for (let j = 0; j < r.n; j++) if (f >= r.at + j * 1.4) q += lots(k + 40, j);
  }
  return q;
};
/** traded volume between two frames */
export const volIn = (a: number, b: number) => TRADES.reduce((s, t) => (t.f >= a && t.f < b ? s + t.q : s), 0);
export const volTo = (f: number) => volIn(-1, f + 1);
