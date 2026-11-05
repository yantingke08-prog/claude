// Illustrative (synthetic) price data. Nothing here is a real instrument or date.
import { mulberry32 } from "../lib/rng";

export const LEVEL = 5000; // prior high / round number = the "tripwire"
export const BAR_W = 0.62; // x spacing between bars
export const FLOOR_Y = -1.38;

/** price → world y */
export const py = (p: number) => 2.2 + (p - LEVEL) * 0.085;
/** bar index → world x (bar 0 is the live / breakout bar) */
export const bx = (i: number) => i * BAR_W;

export type Bar = { o: number; h: number; l: number; c: number };

/** The range under the level: 16 bars ending just before the breakout bar (indices -16..-1). */
export const RANGE: Bar[] = (() => {
  const r = mulberry32(7);
  const out: Bar[] = [];
  let c = 4978;
  for (let i = 0; i < 16; i++) {
    const o = c;
    // mean-reverting chop inside 4964..4997, drifting up into the level near the end
    const pull = (4981 + i * 0.9 - o) * 0.35;
    c = Math.max(4965, Math.min(4996.5, o + pull + (r() - 0.5) * 12));
    const h = Math.max(o, c) + r() * 3.5;
    const l = Math.min(o, c) - r() * 3.5;
    out.push({ o, h: Math.min(h, 4998.5), l, c });
  }
  // the prior high that defines the level
  out[5] = { o: 4986, h: 5000, l: 4984, c: 4993.5 };
  out[15] = { o: 4991, h: 4996.5, l: 4989.5, c: 4995 };
  return out;
})();

/**
 * The run-up before the range (indices -73..-17): three impulse legs with pullbacks, then chop
 * under the level. Together with RANGE, the live bar and the outcome bars it makes an ~80-bar chart.
 */
export const HISTORY: Bar[] = (() => {
  const r = mulberry32(19);
  const legs: [number, number][] = [
    [12, 110],
    [5, -40],
    [10, 120],
    [4, -35],
    [12, 170],
    [14, 13],
  ];
  const out: Bar[] = [];
  let c = 4640;
  for (const [n, move] of legs) {
    for (let i = 0; i < n; i++) {
      const o = c;
      const chop = n === 14;
      c = o + move / n + (r() - 0.5) * (chop ? 14 : 9);
      if (chop) c = Math.max(4962, Math.min(4992, c));
      const span = chop ? 3.5 : 5;
      out.push({ o, h: Math.min(Math.max(o, c) + r() * span, 4997), l: Math.min(o, c) - r() * span, c });
    }
  }
  out[out.length - 1] = { ...out[out.length - 1], c: 4978 };
  return out;
})();
export const HIST0 = -(HISTORY.length + RANGE.length); // index of the first bar on the chart
/** every settled bar left of the live bar, with its chart index */
export const PAST = [...HISTORY, ...RANGE].map((b, k) => ({ b, i: HIST0 + k }));
/** chart extents (world) */
export const CHART = { x0: bx(HIST0) - 0.6, x1: bx(7) + 0.6, p0: 4610, p1: 5040 };
/** the glass board extends well above the chart so close-ups never see its edge */
export const BOARD_TOP = 5110;

/**
 * Intrabar path of the hook / fail bar as a function of progress u ∈ [0,1]:
 * rips up through the level, stalls, then collapses far below the open.
 */
export const FAIL_OPEN = 4995;
export const failPath = (u: number) => {
  const k = (a: number, b: number, t: number) => a + (b - a) * t;
  if (u < 0.32) {
    const x = u / 0.32;
    return k(4995, 5013, x * x * (3 - 2 * x)); // builds into the wire, then decelerates at the top
  }
  if (u < 0.48) return 5013 - 1.2 * Math.sin(((u - 0.32) / 0.16) * Math.PI);
  return k(5012.5, 4974, 1 - Math.pow(1 - (u - 0.48) / 0.52, 2.2));
};

/** OHLC of a bar whose price has followed path(0..u) */
export const liveBar = (open: number, path: (u: number) => number, u: number, steps = 60): Bar => {
  let h = open;
  let l = open;
  for (let i = 0; i <= steps; i++) {
    const p = path((i / steps) * u);
    h = Math.max(h, p);
    l = Math.min(l, p);
  }
  return { o: open, h, l, c: path(u) };
};

/** Bars after the breakout bar for the three outcomes (indices 1..6). */
export const OUTCOMES: Record<"true" | "retest" | "fail", Bar[]> = {
  true: [
    { o: 5009, h: 5016, l: 5007, c: 5014 },
    { o: 5014, h: 5019, l: 5010, c: 5012 },
    { o: 5012, h: 5021, l: 5011, c: 5019.5 },
    { o: 5019.5, h: 5026, l: 5017, c: 5024 },
    { o: 5024, h: 5027, l: 5019, c: 5021 },
    { o: 5021, h: 5031, l: 5020, c: 5029 },
  ],
  retest: [
    { o: 5009, h: 5011, l: 5003, c: 5004 },
    { o: 5004, h: 5006, l: 5000.5, c: 5002 },
    { o: 5002, h: 5009, l: 5001, c: 5008 },
    { o: 5008, h: 5016, l: 5006, c: 5015 },
    { o: 5015, h: 5021, l: 5013, c: 5019 },
    { o: 5019, h: 5025, l: 5017, c: 5023.5 },
  ],
  fail: [
    { o: 4974, h: 4983, l: 4971, c: 4981 },
    { o: 4981, h: 4999.5, l: 4980, c: 4991 }, // the rebound that cannot reclaim the level
    { o: 4991, h: 4993, l: 4976, c: 4978 },
    { o: 4978, h: 4982, l: 4966, c: 4969 },
    { o: 4969, h: 4975, l: 4963, c: 4973 },
    { o: 4973, h: 4976, l: 4960, c: 4962 },
  ],
};
/** breakout bar for the true / retest outcomes (closes above the level) */
export const GOOD_BREAK: Bar = { o: 4995, h: 5011, l: 4994, c: 5009 };
/** final state of the fail bar */
export const FAIL_BAR = liveBar(FAIL_OPEN, failPath, 1);

/** illustrative order-flow delta (aggressive buys − aggressive sells) at two successive highs */
export const DELTA = { firstHigh: 620, newHigh: 180 };

export const fmt = (p: number) => p.toFixed(2);
