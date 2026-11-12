// Synthetic, seeded teaching data. No real instrument, date, account or fill.
// Every series is built once at module load from fixed seeds → identical on every render tab.
import { mulberry32 } from "../lib/rng";

export const TICK = 0.25;
export const q = (p: number) => Math.round(p / TICK) * TICK;

export type Candle = { o: number; h: number; l: number; c: number; v: number; d: number };

// Absorption zone and key level (price units of the synthetic instrument)
export const ZONE = { lo: 99.5, hi: 100.0 };
export const KEY_LEVEL = 99.75; // prior low / VAL the sellers attack
export const STOP = ZONE.lo - 3 * TICK; // 3 ticks beyond structure → 98.75
export const PRICE_RANGE = { min: 95.0, max: 104.0 };

const lerpPath = (keys: [number, number][], n: number) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let k = 0;
    while (k < keys.length - 2 && i > keys[k + 1][0]) k++;
    const [i0, p0] = keys[k];
    const [i1, p1] = keys[k + 1];
    const t = i1 === i0 ? 1 : Math.min(1, Math.max(0, (i - i0) / (i1 - i0)));
    out.push(p0 + (p1 - p0) * t);
  }
  return out;
};

type BuildOpts = {
  seed: number;
  open: number;
  closes: number[];
  deltas: number[];
  floor?: number; // lows may touch but never break (absorption)
  testFloorEvery?: number; // wick down exactly to the floor on these candles
  vol?: number;
};

const buildCandles = ({ seed, open, closes, deltas, floor, testFloorEvery, vol = 1 }: BuildOpts): Candle[] => {
  const r = mulberry32(seed);
  let o = open;
  return closes.map((raw, i) => {
    const c = q(raw + (r() - 0.5) * 0.5 * vol);
    const up = 1 + Math.floor(r() * 3);
    const dn = 1 + Math.floor(r() * 3);
    const h = Math.max(o, c) + up * TICK * 0.5 * vol + TICK * 0.5;
    let l = Math.min(o, c) - dn * TICK * 0.5 * vol - TICK * 0.5;
    let cc = c;
    if (floor !== undefined) {
      if (testFloorEvery && i % testFloorEvery === 1) l = floor;
      l = Math.max(l, floor);
      cc = Math.max(cc, floor + TICK);
    }
    const d = Math.round(deltas[i] ?? 0);
    const v = Math.round(Math.abs(d) * (2.4 + r() * 0.8) + 300 + r() * 200);
    const candle = { o: q(o), h: q(Math.max(h, o, cc)), l: q(Math.min(l, o, cc)), c: q(cc), v, d };
    o = cc;
    return candle;
  });
};

// ── shared approach: 24 candles drifting from 103 toward the key level ──
const PRE_N = 24;
const preDeltaRng = mulberry32(11);
const PRE_DELTAS = Array.from({ length: PRE_N }, (_, i) => -60 - i * 6 + (preDeltaRng() - 0.5) * 220);
export const PRE = buildCandles({
  seed: 7,
  open: 103.0,
  closes: lerpPath([[0, 102.9], [8, 102.0], [14, 101.6], [19, 100.9], [23, 100.25]], PRE_N),
  deltas: PRE_DELTAS,
  vol: 0.8,
});

// the SAME sell pressure hits both branches (this is the whole point of the hook)
const BRANCH_N = 16;
const pressRng = mulberry32(23);
export const SELL_PRESSURE = Array.from(
  { length: BRANCH_N },
  (_, i) => -(380 + Math.sin(i * 0.9) * 120 + i * 22 + pressRng() * 140),
);

const lastPre = PRE[PRE.length - 1].c;

export const BREAKDOWN = buildCandles({
  seed: 31,
  open: lastPre,
  closes: lerpPath([[0, 99.75], [2, 99.0], [6, 97.6], [10, 96.6], [15, 95.9]], BRANCH_N),
  deltas: SELL_PRESSURE,
  vol: 1.2,
});

export const ABSORB = buildCandles({
  seed: 41,
  open: lastPre,
  closes: lerpPath([[0, 99.9], [3, 99.8], [6, 99.95], [9, 99.8], [12, 99.95], [15, 99.85]], BRANCH_N),
  deltas: SELL_PRESSURE,
  floor: ZONE.lo,
  testFloorEvery: 3,
  vol: 0.7,
});

const AFTER_N = 14;
const lastAbs = ABSORB[ABSORB.length - 1].c;
// success: reclaim zone top, pull back, hold, continue. Delta turns positive.
export const SUCCESS = buildCandles({
  seed: 53,
  open: lastAbs,
  closes: lerpPath([[0, 100.1], [3, 100.75], [5, 100.6], [7, 100.25], [9, 100.9], [13, 102.1]], AFTER_N),
  deltas: Array.from({ length: AFTER_N }, (_, i) => (i < 2 ? -120 + i * 120 : 140 + i * 28)),
  floor: ZONE.hi - TICK, // the pull-back holds the zone top
  vol: 0.8,
});
// failure: lose zone bottom, bids pulled / eaten through, continuation lower.
export const FAILURE = buildCandles({
  seed: 61,
  open: lastAbs,
  closes: lerpPath([[0, 99.7], [2, 99.4], [4, 99.0], [7, 98.3], [10, 97.6], [13, 97.0]], AFTER_N),
  deltas: Array.from({ length: AFTER_N }, (_, i) => -(260 + i * 30)),
  vol: 1.0,
});

export const cvd = (cs: Candle[], start = 0) => {
  let s = start;
  return cs.map((c) => (s += c.d));
};

// ── DOM ladder around the absorption level ──
export const DOM_PRICES = Array.from({ length: 12 }, (_, i) => q(101.0 - i * TICK)); // 101.00 … 98.25
const domRng = mulberry32(71);
const DOM_BASE = DOM_PRICES.map((p) => ({
  p,
  size: Math.round(120 + domRng() * 260),
  phase: domRng() * Math.PI * 2,
}));
export const DOM_ABSORB_PRICE = ZONE.lo; // 99.50: the responsive bid
export const DOM_CYCLE = 54; // frames: eaten → refilled

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** DOM state at a local frame. `mode` "hold" refills the big bid; "pull" lets it vanish. */
export const domAt = (f: number, mode: "hold" | "pull" = "hold", pullFrom = 0) => {
  const cycle = Math.floor(Math.max(0, f) / DOM_CYCLE);
  const ph = (Math.max(0, f) % DOM_CYCLE) / DOM_CYCLE;
  const eaten = ph < 0.62 ? easeInOut(ph / 0.62) * 0.78 : (1 - easeInOut((ph - 0.62) / 0.38)) * 0.78;
  const last = 99.75; // last traded price sits right above the bid wall
  return {
    cycle,
    eating: ph < 0.62,
    refilling: ph >= 0.62,
    rows: DOM_BASE.map(({ p, size, phase }) => {
      const wob = Math.sin(f * 0.07 + phase) * 0.12 + 1;
      const isWall = p === DOM_ABSORB_PRICE;
      let bid = p <= last - TICK ? size * wob : 0;
      let ask = p >= last ? size * wob * 0.9 : 0;
      if (isWall) {
        const full = 980;
        bid = mode === "pull" && f > pullFrom ? full * Math.max(0, 1 - (f - pullFrom) / 20) * (1 - eaten) : full * (1 - eaten);
      }
      if (p === last) ask = size * 0.6;
      return { p, bid: Math.round(bid), ask: Math.round(ask), isWall, isLast: p === last };
    }),
  };
};

// ── Footprint: 3 bars × 10 price rows, bid × ask volumes; heavy band at 99.50–99.75 ──
export const FP_PRICES = Array.from({ length: 10 }, (_, i) => q(100.75 - i * TICK)); // 100.75 … 98.50
const fpRng = mulberry32(83);
export const FOOTPRINT = [0, 1, 2].map((col) =>
  FP_PRICES.map((p) => {
    const inBand = p === 99.5 || p === 99.75;
    const inRange = col === 0 ? p >= 99.5 && p <= 100.75 : p >= 99.5 && p <= 100.25;
    if (!inRange) return { p, bid: 0, ask: 0 };
    const base = 40 + Math.round(fpRng() * 120);
    const bid = inBand ? 820 + col * 260 + Math.round(fpRng() * 140) : base + Math.round(fpRng() * 60);
    const ask = inBand ? 180 + Math.round(fpRng() * 90) : base + Math.round(fpRng() * 70);
    return { p, bid, ask };
  }),
);
// Footprint convention used here: left = sells hitting the bid, right = buys lifting the ask.

// ── Volume profile for the "key level" evidence (POC / VAH / VAL) ──
const vpRng = mulberry32(97);
export const PROFILE = Array.from({ length: 24 }, (_, i) => {
  const p = q(103.0 - i * TICK);
  const dist = Math.abs(p - 101.25);
  return { p, v: Math.round(1000 * Math.exp(-(dist * dist) / 1.4) + 80 + vpRng() * 90) };
});
export const POC = PROFILE.reduce((a, b) => (b.v > a.v ? b : a)).p;
export const VAH = 102.0;
export const VAL = 99.75; // the attacked key level is the value-area low

export const fmt = (p: number) => p.toFixed(2);
