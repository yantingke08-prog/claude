// Illustrative market data and the stage layout. Everything is deterministic (fixed seeds, hand-keyed closes):
// no real symbol, no real prices, no real volumes — prices are a neutral 100–108 scale and volumes are relative.
//
// The value area is computed the conventional way (Market Profile / volume profile literature): start at the
// POC row and keep adding the heavier of the two neighbouring row pairs until ~70% of the volume is inside.
// 70% is a common platform default, not a law; the film says so on screen.

// ---------------------------------------------------------------- seeded randomness
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------------------------------------------------------------- price grid and world mapping
export const P_LO = 100;
export const P_HI = 108;
export const TICK = 0.25;
export const ROWS = Math.round((P_HI - P_LO) / TICK) + 1; // 33 rows
export const rowPrice = (i: number) => P_LO + i * TICK;
/** world units per 1.00 of price */
export const Y_PER = 1.7;
export const P_MID = 104;
export const py = (p: number) => (p - P_MID) * Y_PER;
export const ROW_H = TICK * Y_PER;

/** sets sit side by side along x; the camera moves laterally from one to the next */
export const SET_GAP = 26;
export const SETS = ["hook", "main", "accept", "reject", "watch", "map", "end"] as const;
export type SetId = (typeof SETS)[number];
export const SX: Record<SetId, number> = Object.fromEntries(SETS.map((s, i) => [s, i * SET_GAP])) as Record<SetId, number>;

/** local x layout inside a set (same on every set) */
export const CH_X0 = -5.0; // first candle
export const CH_X1 = 1.5; // chart right edge
export const PROF_X = 2.25; // profile spine
export const PROF_L = 3.35; // longest profile bar
export const LADDER_X = -5.55; // price-ladder rail
export const VOL_BASE = py(P_LO) - 2.05; // volume strip baseline
export const VOL_H = 1.45; // tallest volume bar
export const STAGE_Y = -1.2; // vertical centre the camera looks at

// ---------------------------------------------------------------- the volume profile
const g = (p: number, m: number, s: number) => Math.exp(-0.5 * ((p - m) / s) ** 2);
export const PROFILE: number[] = (() => {
  const r = rng(20251126);
  const raw = Array.from({ length: ROWS }, (_, i) => {
    const p = rowPrice(i);
    const v = 1.0 * g(p, 103.4, 0.62) + 0.36 * g(p, 106.45, 0.38) + 0.05 * g(p, 101.3, 0.5) + 0.025;
    return v * (0.9 + 0.2 * r());
  });
  // a clearly thin shelf between the two nodes (low-volume node) — the "成交稀薄" place on the map
  for (let i = 0; i < ROWS; i++) {
    const p = rowPrice(i);
    if (p >= 105.25 && p <= 105.75) raw[i] *= 0.45;
  }
  const mx = Math.max(...raw);
  return raw.map((v) => v / mx);
})();

export const POC_I = PROFILE.indexOf(Math.max(...PROFILE));
/** value area by the standard two-row expansion until VA_SHARE of the volume is inside */
export const VA_SHARE = 0.7;
export const VA = (() => {
  const total = PROFILE.reduce((s, v) => s + v, 0);
  let lo = POC_I;
  let hi = POC_I;
  let inside = PROFILE[POC_I];
  while (inside / total < VA_SHARE && (lo > 0 || hi < ROWS - 1)) {
    const up = (PROFILE[hi + 1] ?? 0) + (PROFILE[hi + 2] ?? 0);
    const dn = (PROFILE[lo - 1] ?? 0) + (PROFILE[lo - 2] ?? 0);
    if (up >= dn && hi < ROWS - 1) {
      const n = Math.min(2, ROWS - 1 - hi);
      for (let k = 1; k <= n; k++) inside += PROFILE[hi + k];
      hi += n;
    } else {
      const n = Math.min(2, lo);
      for (let k = 1; k <= n; k++) inside += PROFILE[lo - k];
      lo -= n;
    }
  }
  return { lo, hi, share: inside / total };
})();
export const POC = rowPrice(POC_I);
export const VAH = rowPrice(VA.hi);
export const VAL = rowPrice(VA.lo);
/** the thin row used on the map */
export const LVN_I = (() => {
  let best = -1;
  for (let i = VA.hi + 1; i < ROWS - 2; i++) if (best < 0 || PROFILE[i] < PROFILE[best]) best = i;
  return best;
})();
export const fmt = (p: number) => p.toFixed(2);

// ---------------------------------------------------------------- candles
export type Candle = { o: number; h: number; l: number; c: number; v: number; d: number };
export const CANDLE_DX = 0.32;
export const cxOf = (i: number) => CH_X0 + i * CANDLE_DX;

/** candles from hand-keyed closes; wicks and volumes are seeded; `force` pins exact highs/lows where the story needs them */
const build = (closes: number[], seed: number, open0: number, vol: (i: number) => number, force: Record<number, { h?: number; l?: number }> = {}): Candle[] => {
  const r = rng(seed);
  let o = open0;
  return closes.map((c, i) => {
    const body = Math.abs(c - o);
    let h = Math.max(o, c) + 0.06 + r() * (0.12 + body * 0.25);
    let l = Math.min(o, c) - 0.06 - r() * (0.12 + body * 0.25);
    if (force[i]?.h !== undefined) h = force[i].h!;
    if (force[i]?.l !== undefined) l = force[i].l!;
    const v = vol(i) * (0.85 + 0.3 * r());
    const d = (c - o >= 0 ? 1 : -1) * v * (0.25 + 0.35 * r());
    const k: Candle = { o, h, l, c, v, d };
    o = c + (r() - 0.5) * 0.04;
    return k;
  });
};

/** 0 hook: one line, touched twice — it holds the first time and gives way the second */
export const LINE_P = VAL;
export const HOOK = build(
  [1.4, 1.1, 1.25, 0.8, 0.5, 0.35, 0.25, 0.65, 0.95, 1.1, 0.9, 0.7, 0.55, 0.35, 0.2, -0.2, -0.65, -0.8, -1.1, -0.95, -1.3].map((d) => LINE_P + d),
  11,
  LINE_P + 1.2,
  (i) => (i === 6 ? 1.3 : i === 15 || i === 16 ? 1.5 : 0.8),
  { 6: { l: LINE_P - 0.02 }, 14: { l: LINE_P + 0.04 } },
);
export const HOOK_HOLD = 6; // the candle that touches the line and holds
export const HOOK_BREAK = 15; // the candle that goes straight through

/** 1 main: the period that built the profile — rotation inside the value area, ending at the upper edge */
export const MAIN = (() => {
  const r = rng(7);
  const out: number[] = [];
  let p = POC;
  for (let i = 0; i < 16; i++) {
    const lo = VAL + 0.3;
    const hi = VAH - 0.3;
    p += (POC - p) * 0.25 + (r() - 0.5) * 0.9;
    p = Math.min(hi, Math.max(lo, p));
    out.push(Math.round(p * 20) / 20);
  }
  const last = out[out.length - 1];
  [0.25, 0.5, 0.75].forEach((k) => out.push(Math.round((last + (VAH - 0.2 - last) * k) * 20) / 20));
  out.push(VAH - 0.15, VAH - 0.05);
  return build(out, 8, POC, (i) => 0.7 + 0.3 * Math.sin(i * 1.7) ** 2, { 20: { h: VAH + 0.02 } });
})();

/** 2 accept: drive to the upper edge on rising volume, pull back, hold above it, go on */
export const ACCEPT = build(
  [103.3, 103.6, 103.45, 103.7, 103.9, 103.8, VAH - 0.2, VAH - 0.05, VAH + 0.25, VAH + 0.55, VAH + 0.4, VAH + 0.2, VAH + 0.35, VAH + 0.6, VAH + 0.85],
  21,
  103.5,
  (i) => (i < 6 ? 0.75 : i < 10 ? 0.95 + (i - 5) * 0.3 : i < 12 ? 0.85 : 1.05),
  { 11: { l: VAH + 0.03 }, 12: { l: VAH + 0.08 } },
);
export const AC_DRIVE = [6, 10] as const; // candles that push into and through the edge
export const AC_TEST = 11; // the pullback that tests the edge from above
/** the new value that starts forming above (acceptance) */
export const NEW_VA = { lo: VAH + 0.1, hi: VAH + 1.0 };

/** 3 reject: a poke above the edge on thin volume that closes straight back inside; later the mirror at the lower edge */
export const REJECT = build(
  [103.3, 103.6, 103.45, 103.75, 103.95, VAH - 0.1, VAH + 0.2, VAH - 0.4, 104.0, 103.75, 103.55, 103.3, 103.0, 102.8, VAL + 0.1, VAL - 0.15, VAL + 0.35, VAL + 0.65],
  31,
  103.6,
  (i) => (i === 6 ? 0.55 : i === 7 ? 1.2 : i === 15 ? 0.55 : i === 16 ? 1.15 : 0.8),
  { 6: { h: VAH + 0.55 }, 15: { l: VAL - 0.5 } },
);
export const RJ_POKE = 6;
export const RJ_BACK = 7;
export const RJ_MIRROR = 15; // the same thing below the lower edge
export const RJ_UP_END = 13; // candles 0..13 tell the upper story; 14..17 the mirror

/** 4 watch: chop in the middle, then two possible paths from the edge */
export const WATCH = (() => {
  const zig = [103.5, 103.85, 103.3, 103.75, 103.2, 103.9, 103.35, 103.8, 103.25, 103.7, 104.0, VAH - 0.15];
  return build(zig, 41, 103.4, (i) => 0.8 + 0.25 * (i % 2), { 11: { h: VAH } });
})();
/** branch paths from the last candle: [price] per step */
export const BRANCH_UP = [VAH - 0.15, VAH + 0.3, VAH + 0.15, VAH + 0.45, VAH + 0.7];
export const BRANCH_DN = [VAH - 0.15, VAH + 0.25, VAH - 0.25, POC + 0.35, POC + 0.1];

/** 6 end: prices drawn toward the POC (the next episode) */
export const MAGNET = Array.from({ length: 10 }, (_, i) => {
  const r = rng(90 + i);
  const up = i % 2 === 0;
  return { p0: up ? POC + 1.4 + r() * 1.8 : POC - 1.2 - r() * 1.6, x0: CH_X0 + 0.4 + r() * 5.4, z: (r() - 0.5) * 0.8, delay: i * 0.06 };
});

/** each set's volume strip sits just under its own candles (not at the bottom of the price scale) */
export const volBase = (data: Candle[]) => Math.min(py(VAL) - 0.55, py(Math.min(...data.map((c) => c.l))) - 0.6) - VOL_H;
export const VB = { hook: volBase(HOOK), main: volBase(MAIN), accept: volBase(ACCEPT), reject: volBase(REJECT), watch: volBase(WATCH) } as Record<string, number>;
