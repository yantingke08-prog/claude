// Deterministic example data (示意图 · 模拟数据). Generated once from fixed seeds + hand-written key bars.
// Prices are in ticks: price = 10.00 + tick × 0.01. Volumes in 手.
/** deterministic pseudo-random (same as kit.rnd; kept local so node scripts can import this file) */
const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export type Bar = { o: number; h: number; l: number; c: number; v: number };
export const priceOf = (tick: number) => (10 + tick * 0.01).toFixed(2);

/** a leg guided by its end price (not by total change), so the walk cannot drift away */
const leg = (from: number, to: number, n: number, seed: number, vol: number, chop = 1.6): Bar[] => {
  const out: Bar[] = [];
  let prev = from;
  for (let k = 0; k < n; k++) {
    const target = from + ((to - from) * (k + 1)) / n;
    const noise = (rnd(seed + k * 7.3) - 0.5) * 2 * chop;
    const c = k === n - 1 ? to : Math.round(target + noise); // land exactly on the leg's end price
    const o = prev;
    const h = Math.max(o, c) + Math.round(rnd(seed + k * 3.1) * 2);
    const l = Math.min(o, c) - Math.round(rnd(seed + k * 5.7) * 2);
    const v = Math.round(vol * (0.6 + 0.35 * (h - l) / 4 + 0.3 * rnd(seed + k * 1.9)));
    out.push({ o, h, l, c, v });
    prev = c;
  }
  return out;
};

const range = (lo: number, hi: number, n: number, seed: number, vol: number): Bar[] => {
  const out: Bar[] = [];
  let prev = hi - 1;
  for (let k = 0; k < n; k++) {
    const c = k === n - 1 ? hi - 2 : Math.round(lo + 0.5 + rnd(seed + k * 4.1) * (hi - lo - 1));
    const o = prev;
    out.push({ o, c, h: Math.min(hi, Math.max(o, c) + 1), l: Math.max(lo, Math.min(o, c) - 1), v: Math.round(vol * (0.7 + 0.4 * rnd(seed + k))) });
    prev = c;
  }
  return out;
};

// ---- main chart: 80 bars -------------------------------------------------------------
export const SUPPORT = -6; // the narrow range's key level (9.94)
export const RESIST = -2;
export const CHASE = 44; // the bar you chased into (hook)
export const ABSORB = 52; // huge volume, no progress (passive absorption)
export const BREAK = 73; // key level breaks → stops fire
export const PLUNGE = 74; // stop cascade accelerates the move

export const MAIN: Bar[] = [
  ...leg(-30, 4, 44, 11, 900, 2.2), // 0–43 the rise
  { o: 4, h: 14, l: 1, c: 2, v: 3400 }, // 44 chase-and-reverse: long upper wick
  ...leg(2, 1, 7, 61, 1000, 1.2), // 45–51
  { o: 1, h: 3, l: -1, c: 1, v: 3900 }, // 52 big volume, price does not move
  ...leg(1, -3, 6, 91, 900, 1.2), // 53–58
  ...range(SUPPORT, RESIST, 14, 131, 700), // 59–72 narrow range
  { o: -4, h: -3, l: -10, c: -9, v: 2600 }, // 73 breaks the key level
  { o: -9, h: -8, l: -24, c: -22, v: 5200 }, // 74 stop cascade
  ...leg(-22, -17, 5, 171, 1300, 1.4), // 75–79 bounce
];

/** volume at each tick across bars [0..upto]: each bar's volume spread evenly over its range */
export const volumeProfile = (upto = MAIN.length - 1) => {
  const m = new Map<number, number>();
  MAIN.slice(0, upto + 1).forEach((b) => {
    const n = b.h - b.l + 1;
    for (let p = b.l; p <= b.h; p++) m.set(p, (m.get(p) ?? 0) + b.v / n);
  });
  const ticks = [...m.keys()].sort((a, b) => a - b);
  const total = [...m.values()].reduce((s, x) => s + x, 0);
  // value area: grow from the point of control until 70 % of volume is inside
  const poc = ticks.reduce((a, b) => ((m.get(b) ?? 0) > (m.get(a) ?? 0) ? b : a), ticks[0]);
  let lo = poc;
  let hi = poc;
  let inside = m.get(poc) ?? 0;
  while (inside < total * 0.7) {
    const up = m.get(hi + 1) ?? -1;
    const dn = m.get(lo - 1) ?? -1;
    if (up < 0 && dn < 0) break;
    if (up >= dn) inside += m.get(++hi)!;
    else inside += m.get(--lo)!;
  }
  return { m, ticks, total, poc, lo, hi, share: inside / total };
};

// ---- footprint of the chase bar: bid × ask volume per price; sums to MAIN[CHASE].v --------
export type FootRow = { tick: number; bid: number; ask: number }; // bid = sold into bids (主动卖), ask = bought from asks (主动买)
export const FOOT: FootRow[] = (() => {
  const b = MAIN[CHASE];
  const rows: FootRow[] = [];
  const raw: { tick: number; bid: number; ask: number }[] = [];
  for (let p = b.h; p >= b.l; p--) {
    const upper = (p - b.l) / (b.h - b.l); // 0 at low, 1 at high
    // chasers lift offers on the way up (ask heavy mid/high), the top gets sold into, the bottom is stop selling
    const ask = 60 + 260 * Math.sin(Math.PI * Math.min(1, upper * 1.15)) + 40 * rnd(p + 300);
    const bid = 50 + (upper > 0.75 ? 220 : 0) + (upper < 0.2 ? 260 : 0) + 40 * rnd(p + 400);
    raw.push({ tick: p, bid, ask });
  }
  const sum = raw.reduce((s, r) => s + r.bid + r.ask, 0);
  let acc = 0;
  raw.forEach((r, i) => {
    let bid = Math.round((r.bid / sum) * b.v);
    let ask = Math.round((r.ask / sum) * b.v);
    if (i === raw.length - 1) ask = b.v - acc - bid; // exact total
    acc += bid + ask;
    rows.push({ tick: r.tick, bid, ask });
  });
  return rows;
})();

// ---- acceptance forks: identical shared history, different after the fork ----------
export const LEVEL = 8; // the new price both forks reach
const HIST: Bar[] = leg(-4, 5, 12, 211, 800, 1.2);
export const FORK_AT = HIST.length;
export const FORK_ACCEPT: Bar[] = [
  ...HIST,
  { o: 5, h: 11, l: 5, c: 10, v: 2100 }, // push through the level
  { o: 10, h: 13, l: 9, c: 12, v: 1900 }, // trades keep coming
  { o: 12, h: 13, l: 8, c: 9, v: 1500 }, // retest
  { o: 9, h: 10, l: 7, c: 9, v: 1600 }, // caught at the level: long lower wick
  { o: 9, h: 15, l: 9, c: 14, v: 2000 }, // holds and extends
  { o: 14, h: 17, l: 13, c: 16, v: 1700 },
];
export const FORK_REJECT: Bar[] = [
  ...HIST,
  { o: 5, h: 11, l: 5, c: 10, v: 2100 }, // same push
  { o: 10, h: 12, l: 6, c: 6, v: 1200 }, // nobody follows, straight back under
  { o: 6, h: 7, l: 2, c: 3, v: 1100 },
  { o: 3, h: 5, l: 1, c: 2, v: 900 },
  { o: 2, h: 3, l: -2, c: -1, v: 1000 },
  { o: -1, h: 1, l: -3, c: 0, v: 800 },
];
