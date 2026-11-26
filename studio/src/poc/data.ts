// Deterministic demo market (示意图 · 模拟数据). Integer prices (1 point = one profile row), volume in 手.
// One continuous series of five sessions laid left to right on the stage — D1..D3 (context, only seen in the five-day
// pull-back), A (the film's first day: the faint line, the profile, the magnet, the deviation), B (breakout + value
// migration), C (targets + the entry at the prior POC) — and one separate session W (the POC is not a wall: through
// it and through a low-volume node). Each session is hand-scripted as segments (n bars toward a target close) with
// seeded noise, plus a few hand-written key bars. Nothing is random per frame: everything here is computed once.
// Every number the voice or a tag uses is computed from these bars (see NUM at the bottom), and
// scripts/poc-data-check.mjs prints them so the script (script.json) can be checked against the data.

export type Bar = { o: number; h: number; l: number; c: number; v: number; vp: Map<number, number> };
export type Day = {
  id: string;
  bars: Bar[];
  x0: number; // world x of bar 0
  xs: number; // world x per bar
  p0: number; // price drawn at y = Y0
  ys: number; // world y per point
  y0: number; // world y of p0
  vb: number; // world y of the volume floor
  px: number; // world x where the day's profile starts (right of its last bar)
};

// ---------------------------------------------------------------- rng
const mulberry = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------------------------------------------------------------- volume at price inside one bar
/** spread a bar's volume over its integer prices: most near the body, a thin tail along the wicks */
const spread = (o: number, h: number, l: number, c: number, v: number, focus?: number) => {
  const mid = focus ?? (o + c) / 2;
  const sd = Math.max(0.9, (h - l) / 3.2);
  const w: [number, number][] = [];
  for (let p = l; p <= h; p++) {
    const inBody = p >= Math.min(o, c) && p <= Math.max(o, c);
    w.push([p, (inBody ? 1 : 0.45) * (0.35 + Math.exp(-((p - mid) ** 2) / (2 * sd * sd)))]);
  }
  const s = w.reduce((a, [, x]) => a + x, 0);
  const vp = new Map<number, number>();
  w.forEach(([p, x]) => vp.set(p, (v * x) / s));
  return vp;
};

type Seg =
  | { n: number; to: number; noise: number; vol: number; wick?: number; thin?: boolean }
  | { bars: [number, number, number, number, number][]; focus?: (number | undefined)[] };

/** build a session from segments; `open` = first bar's open */
const session = (open: number, segs: Seg[], seed: number): Bar[] => {
  const r = mulberry(seed);
  const g = () => (r() + r() + r() - 1.5) / 1.5; // ~N(0, 0.33)
  const out: Bar[] = [];
  let prev = open;
  for (const s of segs) {
    if ("bars" in s) {
      s.bars.forEach(([o, h, l, c, v], k) => {
        out.push({ o, h, l, c, v, vp: spread(o, h, l, c, v, s.focus?.[k]) });
        prev = c;
      });
      continue;
    }
    for (let k = 0; k < s.n; k++) {
      const left = s.n - k;
      const o = prev;
      const c = Math.round(prev + (s.to - prev) / left + g() * s.noise * (left > 1 ? 1 : 0.3));
      const wick = s.wick ?? 1.2;
      const h = Math.max(o, c) + Math.round(Math.abs(g()) * s.noise * wick + r() * 0.8);
      const l = Math.min(o, c) - Math.round(Math.abs(g()) * s.noise * wick + r() * 0.8);
      const range = h - l + 1;
      const v = Math.round((s.vol * (0.72 + 0.56 * r()) * (s.thin ? 1 : 0.8 + 0.06 * range)) / 10) * 10;
      out.push({ o, h, l, c, v, vp: spread(o, h, l, c, v) });
      prev = c;
    }
  }
  return out;
};

// ---------------------------------------------------------------- the sessions
// A: rotation round 5012 with a push up and a push down (the hook), then a fast spike to 5030 and back (deviation)
export const A_HOOK = 34; // bars 0..33 print in the hook; 34.. print in the deviation scene
const A_BARS = session(
  5011,
  [
    { n: 6, to: 5012, noise: 2.4, vol: 620 },
    { bars: [[5012, 5016, 5011, 5015, 760], [5015, 5020, 5014, 5019, 820], [5019, 5023, 5018, 5021, 700], [5021, 5022, 5017, 5018, 640]] },
    { n: 4, to: 5013, noise: 2.2, vol: 600 },
    { n: 6, to: 5012, noise: 2.6, vol: 640 },
    { bars: [[5012, 5013, 5008, 5009, 720], [5009, 5010, 5004, 5005, 800], [5005, 5006, 5001, 5003, 760], [5003, 5007, 5002, 5006, 640]] },
    { n: 4, to: 5012, noise: 2.2, vol: 610 },
    { n: 6, to: 5012, noise: 2.4, vol: 660 },
    // deviation: four quick bars up to 5030 on thin trade, three bars straight back to 5012
    { bars: [[5012, 5018, 5011, 5017, 560], [5017, 5024, 5016, 5023, 520], [5023, 5029, 5022, 5028, 470], [5028, 5030, 5025, 5026, 380]] },
    { bars: [[5026, 5027, 5020, 5021, 430], [5021, 5022, 5015, 5016, 480], [5016, 5017, 5011, 5012, 560]] },
    { n: 4, to: 5012, noise: 2.2, vol: 620 },
  ],
  7,
);

// B: rotation just above A's POC, a heavy breakout, then value builds higher and the developing POC moves up
export const B_BREAK = 6; // first breakout bar
const B_BARS = session(
  5013,
  [
    { n: 6, to: 5014, noise: 2.2, vol: 560 },
    { bars: [[5014, 5020, 5013, 5019, 1320], [5019, 5026, 5018, 5025, 1480], [5025, 5032, 5024, 5031, 1390], [5031, 5034, 5028, 5030, 1060]] },
    { n: 8, to: 5031, noise: 2.4, vol: 760 },
    { n: 5, to: 5028, noise: 2.2, vol: 700 },
    { n: 9, to: 5032, noise: 2.4, vol: 740 },
  ],
  21,
);

// C: gap up, value builds round 5050, then a quick drop to the prior POC (B's), absorption there, then back up
export const C_DROP = 14; // first bar of the drop
export const C_TEST = 20; // first of the three bars at the prior POC
const C_BARS = session(
  5047,
  [
    { n: 14, to: 5050, noise: 2.4, vol: 700 },
    { bars: [[5050, 5051, 5045, 5046, 640], [5046, 5047, 5041, 5042, 560], [5042, 5043, 5037, 5038, 600], [5038, 5039, 5034, 5035, 640], [5035, 5036, 5032, 5033, 700], [5033, 5035, 5031, 5034, 620]] },
    // at the prior POC: sellers hit it hard and it does not give (absorption), selling fades, buyers take over
    { bars: [[5034, 5035, 5030, 5032, 1180], [5032, 5034, 5030, 5033, 860], [5033, 5038, 5032, 5037, 980]], focus: [5031, 5031, 5034] },
    { bars: [[5037, 5042, 5036, 5041, 760], [5041, 5045, 5040, 5044, 700], [5044, 5048, 5043, 5047, 680], [5047, 5050, 5045, 5049, 640]] },
  ],
  33,
);

// three context days before A (only in the five-day pull-back): value stepping up day by day
const D1_BARS = session(4986, [{ n: 9, to: 4989, noise: 2.4, vol: 600 }], 41);
const D2_BARS = session(4990, [{ n: 9, to: 4997, noise: 2.4, vol: 600 }], 43);
const D3_BARS = session(4999, [{ n: 9, to: 5005, noise: 2.4, vol: 600 }], 45);

// W: a separate day. Value round 5048, a fast lift through 5052–5062 (thin trade: the LVN), value builds round 5068
// (the POC). Then it drops straight through the POC and slides through the LVN in two long bars to the lower value.
export const W_DROP = 26; // first bar of the drop
const W_BARS = session(
  5047,
  [
    { n: 9, to: 5048, noise: 2.3, vol: 620 },
    { bars: [[5048, 5056, 5047, 5055, 520], [5055, 5064, 5054, 5063, 520]] },
    { n: 15, to: 5068, noise: 2.4, vol: 720 },
    { bars: [[5068, 5069, 5063, 5064, 820], [5064, 5065, 5051, 5052, 640], [5052, 5053, 5045, 5047, 760], [5047, 5050, 5045, 5049, 620]] },
  ],
  57,
);

// ---------------------------------------------------------------- layout on the stage
export const XS = 0.3; // world x per bar
export const YS = 0.62; // world y per point
export const Y0 = 0; // world y of 5000
export const PROF_W = 3.0; // world x of the longest profile row in a session
export const GAP = 4.8; // from a session's last bar to the next session's first bar (its profile sits in between)
const VOL_DROP = 2.7; // the volume floor sits this far below the session's lowest low

const mk = (id: string, bars: Bar[], x0: number, p0 = 5000, y0 = Y0, xs = XS): Day => {
  const lo = Math.min(...bars.map((b) => b.l));
  return { id, bars, x0, xs, p0, ys: YS, y0, vb: y0 + (lo - p0) * YS - VOL_DROP, px: x0 + (bars.length - 1) * xs + 1.2 };
};
const after = (d: Day) => d.x0 + (d.bars.length - 1) * d.xs + GAP;

export const D1 = mk("D1", D1_BARS, -36);
export const D2 = mk("D2", D2_BARS, after(D1));
export const D3 = mk("D3", D3_BARS, after(D2));
export const A = mk("A", A_BARS, after(D3));
export const B = mk("B", B_BARS, after(A));
export const C = mk("C", C_BARS, after(B));
// W stands apart, further right, drawn in its own price frame (5040 at the same height as 5000)
export const W = mk("W", W_BARS, after(C) + 14, 5040);
export const SERIES = [D1, D2, D3, A, B, C];
export const ALL = [...SERIES, W];

// ---------------------------------------------------------------- mapping
export const cx = (d: Day, i: number) => d.x0 + i * d.xs;
export const cy = (d: Day, p: number) => d.y0 + (p - d.p0) * d.ys;
export const VOL_H = 1.7; // world height of the biggest volume column
const VMAX = Math.max(...ALL.flatMap((d) => d.bars.map((b) => b.v)));
export const vy = (d: Day, v: number) => d.vb + (v / VMAX) * VOL_H;

// ---------------------------------------------------------------- profiles
export type Profile = { rows: Map<number, number>; poc: number; pocV: number; max: number };
/** volume at price over bars [i0, i1) of a day; ties go to the price nearer the middle of the range */
export const profile = (d: Day, i1 = d.bars.length, i0 = 0): Profile => {
  const rows = new Map<number, number>();
  for (let i = i0; i < i1; i++) d.bars[i].vp.forEach((v, p) => rows.set(p, (rows.get(p) ?? 0) + v));
  let poc = NaN;
  let pocV = -1;
  const ps = [...rows.keys()].sort((a, b) => a - b);
  const midP = (ps[0] + ps[ps.length - 1]) / 2;
  for (const p of ps) {
    const v = rows.get(p)!;
    if (v > pocV + 1e-9 || (Math.abs(v - pocV) < 1e-9 && Math.abs(p - midP) < Math.abs(poc - midP))) {
      poc = p;
      pocV = v;
    }
  }
  return { rows, poc, pocV, max: pocV };
};
const profCache = new Map<string, Profile>();
/** cached profile of the first n bars */
export const prof = (d: Day, n = d.bars.length) => {
  const k = `${d.id}|${n}`;
  let p = profCache.get(k);
  if (!p) profCache.set(k, (p = profile(d, n)));
  return p;
};
/** the developing POC after each bar: dpoc[i] = POC of bars 0..i */
export const dpoc = (d: Day) => d.bars.map((_, i) => prof(d, i + 1).poc);
/** how many bars of [i0, i1) traded through price p */
export const touches = (d: Day, p: number, i1 = d.bars.length, i0 = 0) => d.bars.slice(i0, i1).filter((b) => b.l <= p && b.h >= p).length;

/** world length of a profile row: every session is scaled by the same 手-per-unit, so rows compare across days */
const ROW_MAX = Math.max(...ALL.map((d) => prof(d).max));
export const rowLen = (v: number) => (v / ROW_MAX) * PROF_W;

// ---------------------------------------------------------------- the numbers the film says and shows
const pa = prof(A, A_HOOK);
const pb = prof(B);
const pc = prof(C);
const pw = prof(W);
const sumRange = (pr: Profile, lo: number, hi: number) => [...pr.rows].filter(([p]) => p >= lo && p <= hi).reduce((s, [, v]) => s + v, 0);
const cTest = C.bars.slice(C_TEST, C_TEST + 3);
/** Delta of the three test bars (aggressive buys − aggressive sells): hand-set, consistent with each bar's close in its range */
export const C_DELTA = [-520, -180, 260];
export const NUM = {
  aPoc: pa.poc,
  aPocV: Math.round(pa.pocV),
  aTouch: touches(A, pa.poc, A_HOOK),
  aBars: A_HOOK,
  aTop: Math.max(...A.bars.slice(A_HOOK, A_HOOK + 4).map((b) => b.h)),
  aTopV: Math.round(prof(A).rows.get(Math.max(...A.bars.slice(A_HOOK, A_HOOK + 4).map((b) => b.h))) ?? 0),
  aBack: A.bars[A_HOOK + 6].c,
  aDev: Math.max(...A.bars.slice(A_HOOK, A_HOOK + 4).map((b) => b.h)) - pa.poc,
  bPocs: [...new Set(dpoc(B))],
  bPoc: pb.poc,
  cPrior: pb.poc,
  cPoc: prof(C, C_DROP).poc,
  cLow: Math.min(...cTest.map((b) => b.l)),
  cDelta: C_DELTA,
  dPocs: [D1, D2, D3, A, B].map((d) => prof(d).poc),
  wPoc: pw.poc,
  wLvn: [5052, 5062] as [number, number],
  wLvnV: Math.round(sumRange(pw, 5052, 5062) / 11),
  wHvn: prof(W, 9).poc,
  cPocLater: pc.poc,
};

/** value area: the rows round the POC that hold 70 % of the volume (added one neighbour at a time, the bigger first) */
export const valueArea = (pr: Profile, share = 0.7) => {
  const total = [...pr.rows.values()].reduce((s, v) => s + v, 0);
  let lo = pr.poc;
  let hi = pr.poc;
  let sum = pr.pocV;
  while (sum < share * total) {
    const up = pr.rows.get(hi + 1) ?? -1;
    const dn = pr.rows.get(lo - 1) ?? -1;
    if (up < 0 && dn < 0) break;
    if (up >= dn) sum += pr.rows.get(++hi)!;
    else sum += pr.rows.get(--lo)!;
  }
  return { lo, hi };
};
