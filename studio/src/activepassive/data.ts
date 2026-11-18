// Fixed illustrative market data and the layout of the stage. Teaching sketch only, not real quotes.
// One long stage along x; each scene is a set standing at its own x, and the camera flies from set to set.

export const FLOOR_Y = -3.4;

// ---------------------------------------------------------------- set positions (world x)
export const X = {
  hook: 0,
  buyA: 24,
  buyB: 29,
  sellA: 52,
  sellB: 57,
  chase: 84,
  three: 112,
  absorb: 140,
  logic: 166,
  end: 192,
} as const;

// ---------------------------------------------------------------- order book tower
/** vertical distance between two price levels in a book */
export const LV = 0.7;
/** world y of the book's mid price (level 0) */
export const BOOK_Y = 0.2;
/** world width of one unit of resting size */
export const SIZE_W = 0.4;
/** levels each side of the mid */
export const DEPTH = 3;
/** the candle that shows the book's price response stands this far left of the tower */
export const BOOK_CANDLE_DX = -1.85;
export const ly = (level: number) => BOOK_Y + level * LV;
/** a resting-order slab's height and depth, half the width of a price shelf */
export const SLAB_H = 0.3;
export const SLAB_D = 0.8;
export const TOWER_W = 1.2;

export type BookCfg = { x: number; asks: number[]; bids: number[] };
/** sizes at levels 1..3 above (asks) and below (bids) the mid */
export const BOOKS: Record<"buyA" | "buyB" | "sellA" | "sellB" | "absorb", BookCfg> = {
  buyA: { x: X.buyA, asks: [1.6, 1.4, 2.6], bids: [2.2, 1.8, 2.6] },
  buyB: { x: X.buyB, asks: [1.6, 1.4, 2.6], bids: [2.2, 1.8, 2.6] },
  sellA: { x: X.sellA, asks: [2.2, 1.8, 2.6], bids: [1.6, 1.4, 2.6] },
  sellB: { x: X.sellB, asks: [2.2, 1.8, 2.6], bids: [1.6, 1.4, 2.6] },
  absorb: { x: X.absorb, asks: [5.0, 1.4, 1.2], bids: [5.0, 1.4, 1.2] },
};

// ---------------------------------------------------------------- candle charts
export type Bar = { o: number; h: number; l: number; c: number; v: number; d: number };
/** vb = world y of the volume row's base (just under the candles, clear of the captions) */
export type Chart = { x0: number; xs: number; p0: number; ys: number; y0: number; vb: number; bars: Bar[] };
const B = (o: number, h: number, l: number, c: number, v: number, d: number): Bar => ({ o, h, l, c, v, d });

/** x of bar i */
export const cx = (ch: Chart, i: number) => ch.x0 + i * ch.xs;
/** y of price p */
export const cy = (ch: Chart, p: number) => ch.y0 + (p - ch.p0) * ch.ys;
/** volume column height (world units) */
export const VOL_K = 0.36;

// hook: a quiet range, then one big up candle
export const HOOK: Chart = {
  x0: X.hook - 2.6,
  xs: 0.62,
  p0: 100,
  ys: 1.2,
  y0: -1.1,
  vb: -2.4,
  bars: [
    B(100.2, 100.5, 99.9, 100.0, 1.0, -0.1),
    B(100.0, 100.4, 99.8, 100.3, 1.1, 0.2),
    B(100.3, 100.6, 100.0, 100.1, 0.9, -0.2),
    B(100.1, 100.5, 99.9, 100.4, 1.0, 0.2),
    B(100.4, 100.7, 100.1, 100.2, 0.9, -0.1),
    B(100.2, 100.6, 100.0, 100.5, 1.2, 0.3),
    B(100.5, 102.9, 100.4, 102.7, 3.2, 1.6),
  ],
};
export const HOOK_YANG = 6;

// chase: range under a level, a breakout candle, then highs that the delta no longer confirms, then a wall
export const CHASE_LEVEL = 101.0;
export const CHASE: Chart = {
  x0: X.chase - 3.2,
  xs: 0.6,
  p0: 100,
  ys: 1.25,
  y0: -1.0,
  vb: -2.55,
  bars: [
    B(100.3, 100.7, 100.0, 100.5, 1.0, 0.1),
    B(100.5, 100.9, 100.2, 100.3, 0.9, -0.2),
    B(100.3, 100.8, 100.1, 100.7, 1.0, 0.3),
    B(100.7, 100.95, 100.4, 100.5, 0.9, -0.2),
    B(100.5, 100.9, 100.3, 100.8, 1.1, 0.3),
    B(100.8, 102.6, 100.7, 102.4, 3.3, 1.9), // 5: the big up candle through the level
    B(102.4, 102.9, 102.2, 102.7, 1.9, 0.9), // 6: higher high, smaller delta
    B(102.7, 103.05, 102.5, 102.8, 1.6, 0.45), // 7: higher high again, delta smaller still
    B(102.8, 103.1, 102.6, 102.85, 3.0, 1.3), // 8: big active buying, price stuck under the wall
  ],
};
export const CH_YANG = 5;
export const CH_DIV = [5, 6, 7];
export const CH_WALL_I = 8;
/** passive sell wall resting just above the highs */
export const CH_WALL = { lo: 103.12, hi: 103.42 };

// three things: a structure level, an early breakout with expanding delta, a retest, then a run far from structure
export const THREE_LEVEL = 100.6;
export const THREE: Chart = {
  x0: X.three - 3.4,
  xs: 0.6,
  p0: 100,
  ys: 0.95,
  y0: -1.2,
  vb: -2.75,
  bars: [
    B(100.2, 100.5, 99.9, 100.1, 0.9, -0.1),
    B(100.1, 100.55, 99.95, 100.4, 1.0, 0.2),
    B(100.4, 100.6, 100.1, 100.3, 0.8, -0.1),
    B(100.3, 100.7, 100.2, 100.6, 1.2, 0.5), // 3: delta starts to build
    B(100.6, 101.3, 100.5, 101.2, 1.7, 0.9), // 4: early breakout
    B(101.2, 101.9, 101.1, 101.8, 2.2, 1.4), // 5: price responds to the buying
    B(101.8, 101.9, 100.65, 100.85, 1.3, -0.4), // 6: retest of the structure
    B(100.85, 101.6, 100.75, 101.5, 1.6, 0.8), // 7: confirmed
    B(101.5, 102.5, 101.4, 102.4, 2.0, 1.0), // 8
    B(102.4, 103.4, 102.3, 103.3, 2.4, 1.1), // 9: accelerating
    B(103.3, 104.4, 103.2, 104.3, 2.8, 1.2), // 10: far from structure
  ],
};
export const TH_EXPAND = [3, 4, 5];
export const TH_PUSH = 5;
export const TH_NEAR = [4, 7];
export const TH_FAR = [9, 10];

// trading logic: breakout, follow-through, retest held by passive buyers (everything prints before the line ends)
export const LOGIC_LEVEL = 100.8;
export const LOGIC: Chart = {
  x0: X.logic - 3.0,
  xs: 0.62,
  p0: 100,
  ys: 1.25,
  y0: -1.1,
  vb: -2.6,
  bars: [
    B(100.2, 100.6, 100.0, 100.4, 1.0, 0.1),
    B(100.4, 100.75, 100.2, 100.3, 0.9, -0.2),
    B(100.3, 100.7, 100.1, 100.6, 1.0, 0.2),
    B(100.6, 101.6, 100.5, 101.5, 2.4, 1.3), // 3: breakout on active buying
    B(101.5, 102.1, 101.4, 102.0, 1.9, 0.9), // 4: follow-through
    B(102.0, 102.1, 101.2, 101.3, 1.2, -0.5), // 5: pullback
    B(101.3, 101.4, 100.82, 101.2, 1.5, 0.3), // 6: retest held at the level
  ],
};
export const LG_BREAK = 3;
export const LG_FOLLOW = 4;
export const LG_RETEST = 6;

// end: one big up candle beside one active order
export const END_CANDLE = { x: X.end - 1.5, o: -1.3, c: 1.6, h: 2.0, l: -1.6 };
export const END_BOOK_X = X.end + 1.4;
