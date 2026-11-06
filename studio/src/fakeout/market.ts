// Illustrative (synthetic) OHLCV + order-flow delta. Nothing here is a real instrument or date.
// Every number is generated once from fixed seeds (or written by hand), never per frame.
import { mulberry32 } from "../lib/rng";

export const LEVEL = 5000; // prior high / round number = the "tripwire"
export const BAR_W = 0.62; // x spacing between bars

/** price → world y (main chart) */
export const py = (p: number) => 2.2 + (p - LEVEL) * 0.085;
/** bar index → world x (bar 0 is the breakout bar) */
export const bx = (i: number) => i * BAR_W;

/** o/h/l/c price, v volume (contracts), d order-flow delta = aggressive buys − aggressive sells */
export type Bar = { o: number; h: number; l: number; c: number; v: number; d: number };
type OHLC = Pick<Bar, "o" | "h" | "l" | "c">;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const r2 = (x: number) => Math.round(x * 4) / 4; // quarter-point tick

/**
 * Volume and delta that agree with the candle: wide bars trade more, delta follows where the bar
 * closed inside its range (close near the high = buyers in control), plus a little seeded noise.
 */
const flow = (b: OHLC, rnd: () => number, base = 1100): Bar => {
  const range = Math.max(0.75, b.h - b.l);
  const v = Math.round(base * (0.55 + range / 9) * (0.85 + rnd() * 0.3));
  const pos = (b.c - b.l) / range; // 0 = closed on the low, 1 = closed on the high
  const d = Math.round(v * clamp((pos - 0.5) * 0.9 + ((b.c - b.o) / range) * 0.25 + (rnd() - 0.5) * 0.12, -0.8, 0.8));
  return { ...b, v, d };
};

/**
 * The run-up into the range (indices -73..-17): impulse legs with counter-trend bars, pullback legs
 * with up-closing rebounds, dojis and inside bars at fixed spots.
 */
const HISTORY: Bar[] = (() => {
  const r = mulberry32(19);
  const legs: [number, number, number][] = [
    // bars, price at the end of the leg, body noise
    [12, 4750, 10],
    [5, 4710, 8],
    [10, 4830, 10],
    [4, 4795, 8],
    [12, 4966, 11],
    [14, 4978, 9], // chop under the level
  ];
  const doji = new Set([7, 15, 24, 33, 41, 50]);
  const inside = new Set([11, 20, 29, 46, 53]);
  const out: Bar[] = [];
  let c = 4640;
  let k = 0;
  for (const [n, target, noise] of legs) {
    for (let j = 0; j < n; j++, k++) {
      const o = c;
      const chop = n === 14;
      // steer toward the leg's end price so the legs land where the story needs them
      let body = (target - o) / (n - j) + (r() - 0.5) * 2 * noise;
      if (doji.has(k)) body = (r() - 0.5) * 1.2;
      c = o + body;
      if (chop) c = clamp(c, 4963, 4993);
      const up = r() ** 2.2 * (chop ? 6 : 9) + 0.5; // mostly short wicks, a few long ones
      const dn = r() ** 2.2 * (chop ? 6 : 9) + 0.5;
      let bar: OHLC = { o: r2(o), h: r2(Math.min(Math.max(o, c) + up, 4997.5)), l: r2(Math.min(o, c) - dn), c: r2(c) };
      const prev = out[out.length - 1];
      if (inside.has(k) && prev) {
        // inside bar: the whole range sits within the previous bar
        const lo = prev.l + (prev.h - prev.l) * 0.2,
          hi = prev.h - (prev.h - prev.l) * 0.2;
        const oo = r2(lo + (hi - lo) * r()),
          cc = r2(lo + (hi - lo) * r());
        bar = { o: oo, c: cc, h: r2(Math.min(prev.h - 0.25, Math.max(oo, cc) + 1)), l: r2(Math.max(prev.l + 0.25, Math.min(oo, cc) - 1)) };
      }
      c = bar.c;
      out.push(flow(bar, r));
    }
  }
  const last = out[out.length - 1];
  out[out.length - 1] = flow({ ...last, c: 4978, l: Math.min(last.l, 4976.5) }, r); // hand over to the range
  return out;
})();

/** The range under the level (indices -16..-1). Hand-written so the structure reads at a glance. */
const RANGE: Bar[] = (() => {
  const r = mulberry32(7);
  const bars: OHLC[] = [
    { o: 4978, h: 4986, l: 4975.5, c: 4984.5 },
    { o: 4984.5, h: 4991, l: 4982, c: 4989 },
    { o: 4989, h: 4994.5, l: 4986, c: 4987.5 },
    { o: 4987.5, h: 4990.5, l: 4980.5, c: 4982 },
    { o: 4982, h: 4988, l: 4979.5, c: 4986 },
    { o: 4986, h: 5000, l: 4984, c: 4993.5 }, // -11: the prior high, long upper wick
    { o: 4993.5, h: 4995, l: 4983.5, c: 4985 },
    { o: 4985, h: 4989, l: 4983.75, c: 4985.5 }, // doji
    { o: 4985.5, h: 4987.5, l: 4984.5, c: 4986.75 }, // inside bar
    { o: 4986.75, h: 4987.5, l: 4971, c: 4973.5 },
    { o: 4973.5, h: 4978.5, l: 4966, c: 4976 }, // long lower wick: buyers defend the bottom
    { o: 4976, h: 4984.5, l: 4974.5, c: 4983.5 },
    { o: 4983.5, h: 4985, l: 4978, c: 4979.25 },
    { o: 4979.25, h: 4990, l: 4978.5, c: 4988.5 },
    { o: 4988.5, h: 4993.75, l: 4986.25, c: 4991 },
    { o: 4991, h: 4996.75, l: 4989.5, c: 4995 },
  ];
  const out = bars.map((b) => flow(b, r));
  out[5] = { ...out[5], v: 2100, d: 620 }; // strong buying made the prior high
  return out;
})();

export const HIST0 = -(HISTORY.length + RANGE.length); // index of the first bar on the chart
/** every settled bar before the breakout, with its chart index */
export const PAST = [...HISTORY, ...RANGE].map((b, k) => ({ b, i: HIST0 + k }));
export const PRIOR_HIGH = -11;

/** the breakout bar, identical in all three outcomes */
export const BREAK: Bar = { o: 4995, h: 5011, l: 4993, c: 5008, v: 2600, d: 540 };

export type Outcome = "A" | "B" | "C";
/** what happens after the breakout bar (indices 1..12) */
export const AFTER: Record<Outcome, Bar[]> = {
  // A: accepted — holds above, volume keeps coming, steps higher with green pullbacks
  A: [
    { o: 5008, h: 5016, l: 5005.5, c: 5014, v: 2400, d: 610 },
    { o: 5014, h: 5018, l: 5009, c: 5011, v: 1500, d: -240 },
    { o: 5011, h: 5021, l: 5010, c: 5019, v: 2200, d: 520 },
    { o: 5019, h: 5027, l: 5017, c: 5025, v: 2300, d: 560 },
    { o: 5025, h: 5026.5, l: 5019, c: 5021, v: 1400, d: -260 },
    { o: 5021, h: 5023.5, l: 5018.5, c: 5021.5, v: 1000, d: 40 }, // doji
    { o: 5021.5, h: 5031, l: 5021, c: 5029, v: 2100, d: 480 },
    { o: 5029, h: 5036, l: 5027, c: 5034, v: 2000, d: 430 },
    { o: 5034, h: 5035.5, l: 5028, c: 5030, v: 1300, d: -210 },
    { o: 5030, h: 5039, l: 5029, c: 5037, v: 1900, d: 400 },
    { o: 5037, h: 5044, l: 5035, c: 5042, v: 1800, d: 380 },
    { o: 5042, h: 5045, l: 5038, c: 5040, v: 1100, d: -120 },
  ],
  // B: retest — drifts back to the level on shrinking volume, holds it, then expands higher
  B: [
    { o: 5008, h: 5012, l: 5003, c: 5004, v: 1600, d: -260 },
    { o: 5004, h: 5006, l: 4999.5, c: 5001.5, v: 1050, d: -120 }, // probes the level, long lower wick
    { o: 5001.5, h: 5003.5, l: 5000, c: 5002.25, v: 800, d: 60 }, // doji, volume drying up
    { o: 5002.25, h: 5003.25, l: 5000.75, c: 5001.5, v: 650, d: -30 }, // inside bar, lowest volume
    { o: 5001.5, h: 5010, l: 5000.5, c: 5009, v: 2300, d: 640 }, // volume returns: confirmed
    { o: 5009, h: 5016, l: 5007, c: 5014, v: 2100, d: 470 },
    { o: 5014, h: 5015, l: 5009, c: 5011, v: 1300, d: -220 },
    { o: 5011, h: 5020, l: 5010, c: 5018, v: 2000, d: 450 },
    { o: 5018, h: 5025, l: 5016, c: 5023, v: 1900, d: 410 },
    { o: 5023, h: 5024, l: 5018, c: 5020, v: 1200, d: -200 },
    { o: 5020, h: 5028, l: 5019, c: 5026, v: 1800, d: 390 },
    { o: 5026, h: 5032, l: 5024, c: 5030, v: 1700, d: 330 },
  ],
  // C: fails — new high on weak delta leaves a long upper wick, closes back inside, then trends down
  C: [
    { o: 5008, h: 5016, l: 5002, c: 5003, v: 2400, d: 180 }, // new high, long upper wick, delta divergence
    { o: 5003, h: 5005, l: 4976, c: 4978, v: 3400, d: -1150 }, // closes back inside the range: stops cascade
    { o: 4978, h: 4985, l: 4972, c: 4983, v: 1700, d: 280 }, // red rebound
    { o: 4983, h: 4998.5, l: 4981, c: 4991, v: 1300, d: 120 }, // rebound fails under the level
    { o: 4991, h: 4993, l: 4979, c: 4981, v: 1900, d: -520 },
    { o: 4981, h: 4984, l: 4968, c: 4970, v: 2000, d: -560 },
    { o: 4970, h: 4977, l: 4967, c: 4975, v: 1200, d: 230 }, // red rebound
    { o: 4975, h: 4976, l: 4962, c: 4964, v: 1900, d: -510 },
    { o: 4964, h: 4966, l: 4956, c: 4959, v: 1600, d: -400 },
    { o: 4959, h: 4965, l: 4955, c: 4963, v: 1100, d: 210 }, // red rebound
    { o: 4963, h: 4964, l: 4950, c: 4952, v: 1700, d: -450 },
    { o: 4952, h: 4957, l: 4947, c: 4950.5, v: 1000, d: -60 }, // doji
  ],
};
export const N_AFTER = 12;
export const OUTCOMES: Outcome[] = ["A", "B", "C"];
/** the bars every chart shares, oldest first, with chart indices */
export const bar = (o: Outcome, i: number): Bar => (i < 0 ? PAST[i - HIST0].b : i === 0 ? BREAK : AFTER[o][i - 1]);

// ---------------------------------------------------------------- intrabar paths (pure functions of u ∈ [0,1])
const seg = (u: number, pts: [number, number][]) => {
  for (let k = 1; k < pts.length; k++) {
    const [u0, p0] = pts[k - 1];
    const [u1, p1] = pts[k];
    if (u <= u1) return p0 + (p1 - p0) * ((u - u0) / (u1 - u0));
  }
  return pts[pts.length - 1][1];
};
/** breakout bar: small dip, drives through 5000, settles to the close */
export const path0 = (u: number) => seg(u, [[0, 4995], [0.1, 4993], [0.7, 5011], [1, 5008]]);
/** C bar 1: grinds to the new high into the sell wall, then is pushed back down (the long upper wick) */
export const path1 = (u: number) => seg(u, [[0, 5008], [0.55, 5016], [0.95, 5002], [1, 5003]]);
/** C bar 2: the stop cascade back into the range */
export const path2 = (u: number) => seg(u, [[0, 5003], [0.15, 5005], [0.85, 4976], [1, 4978]]);
export const PATHS = [path0, path1, path2];
/** u at which each path crosses 5000 (up for bar 0, down for bar 2) */
export const U_CROSS = { up0: 0.1 + (7 / 18) * 0.6, down2: 0.15 + (5 / 29) * 0.7 };

/** a bar whose price has followed path(0..u); volume and delta fill in proportionally */
export const liveBar = (full: Bar, path: (u: number) => number, u: number, steps = 60): Bar => {
  let h = full.o;
  let l = full.o;
  const n = Math.round(steps * u);
  for (let i = 0; i <= n; i++) {
    const p = path(i / steps);
    h = Math.max(h, p);
    l = Math.min(l, p);
  }
  const c = path(u);
  return { o: full.o, h: Math.max(h, c), l: Math.min(l, c), c, v: full.v * u, d: full.d * u };
};

/** chart extents (world) for the main chart: history + breakout + outcome C */
export const CHART = { x0: bx(HIST0) - 0.6, x1: bx(N_AFTER) + 0.6, p0: 4610, p1: 5040 };
/** the glass board extends well above the chart so close-ups never see its edge */
export const BOARD_TOP = 5110;

export const fmt = (p: number) => p.toFixed(2);
export const fmtD = (d: number) => (d > 0 ? "+" : d < 0 ? "−" : "") + Math.abs(Math.round(d)).toLocaleString("en-US");
