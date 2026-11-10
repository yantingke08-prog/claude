// The order book as data. Everything that happens to it is written down once, as a schedule keyed to
// the narration, and read as a pure function of the frame. Illustrative numbers only.
import { L, Lc, Le } from "./cue";

export const LV = 1.1; // world height of one price level
export const BW = 0.7; // spacing of the resting orders on a level
export const ky = (k: number) => k * LV;
export const price = (k: number) => 5000 + k * 0.25;

export type Side = "bid" | "ask";
export type Level = { side: Side; k: number; n: number; at: number };
const NS = [9, 7, 10, 8, 6, 5, 4, 5, 8, 11];

/** when the walls go up (each level lands a little after the one nearer the middle) */
const bidAt = (k: number) => Lc("a2", "想买") + -k * 5;
const askAt = (k: number) => Lc("a2", "想卖") + k * 4;
export const LEVELS: Level[] = [
  ...[-1, -2, -3, -4, -5, -6].map((k) => ({ side: "bid" as const, k, n: [10, 8, 11, 7, 9, 10][-k - 1], at: bidAt(k) })),
  ...NS.map((n, i) => ({ side: "ask" as const, k: i + 1, n, at: askAt(i + 1) })),
];

/** who eats what, when: bricks j0..j1-1 of ask level k are hit between frames f0 and f1 */
type Eat = { k: number; j0: number; j1: number; f0: number; f1: number; stop?: boolean };
const a6 = Lc("a6", "哪一边");
const o3 = Lc("o3", "直接吃掉");
const gone = Lc("o4", "被吃光");
const jump = Lc("o4", "跳到");
const next = Lc("o4", "这就是");
const armed = Lc("o6", "触发价");
const chain = Lc("o6", "一颗");
export const FIRST_HIT = Lc("a5", "买入量") + 8;
const STEP = 16;
export const EATS: Eat[] = [
  { k: 1, j0: 0, j1: 1, f0: FIRST_HIT, f1: FIRST_HIT },
  { k: 1, j0: 1, j1: 4, f0: a6, f1: a6 + 40 },
  { k: 1, j0: 4, j1: 8, f0: o3, f1: Le("o3") - 6 },
  { k: 1, j0: 8, j1: 9, f0: gone, f1: gone },
  { k: 2, j0: 0, j1: 7, f0: next - 6, f1: next + 58 },
  { k: 3, j0: 0, j1: 10, f0: L("o6") + 2, f1: armed + 4 },
  { k: 4, j0: 0, j1: 8, f0: armed + 10, f1: armed + 24, stop: true },
  { k: 5, j0: 0, j1: 6, f0: chain, f1: chain + 12, stop: true },
  { k: 6, j0: 0, j1: 5, f0: chain + STEP, f1: chain + STEP + 10, stop: true },
  { k: 7, j0: 0, j1: 4, f0: chain + STEP * 2, f1: chain + STEP * 2 + 8, stop: true },
];
/** the frame each ask level is cleared, which is when the price steps onto it */
export const HOPS: Record<number, number> = { 1: jump, 2: next + 62, 3: armed + 8, 4: armed + 28, 5: chain + 15, 6: chain + STEP + 13, 7: chain + STEP * 2 + 11 };

/** buy stops hidden behind the wall: level → the frame it detonates (the price has just reached it) */
export const MINES: { k: number; at: number; n: number }[] = [
  { k: 4, at: armed + 8, n: 4 },
  { k: 5, at: chain - 2, n: 4 },
  { k: 6, at: chain + STEP - 2, n: 3 },
  { k: 7, at: chain + STEP * 2 - 2, n: 3 },
];
export const MINES_IN = Lc("o5", "止损订单");

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

/** new resting bids filling in under the price as it climbs (only the slow steps get any) */
export const REFILLS = [
  { k: 0, n: 7, at: HOPS[1] + 8 },
  { k: 1, n: 5, at: HOPS[2] + 8 },
];
/** extra passive orders that land while the narration explains them */
export const PASSIVE_AT = Lc("o2", "挂在那里");
