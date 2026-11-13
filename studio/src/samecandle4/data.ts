/**
 * Three illustrative (示意) daily charts that share one identical big bullish candle (open 100, close 108).
 *   A 起飞  long base 92–100, first breakout, volume ×2.6, pullback holds above the midpoint (104) → trend
 *   B 见顶  40-bar accelerating rally, climax volume ×4.5, next bar closes below the midpoint → reversal
 *   C 打回  downtrend into the old support-turned-resistance (108–111), volume ×0.8, falls back under the open
 * Deterministic (seeded) so every render is identical.
 */
export type Bar = { o: number; h: number; l: number; c: number; v: number };
export type LaneId = "A" | "B" | "C";

export const PRE = 40; // bars before the hero
export const POST = 24; // bars after the hero
export const HERO = PRE; // index of the hero candle
export const HERO_BAR: Bar = { o: 100, h: 108.8, l: 99.6, c: 108, v: 1 };
export const MID = (HERO_BAR.o + HERO_BAR.c) / 2; // 104

const rand = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export function build(closes: number[], vols: number[], seed: number, start: number): Bar[] {
  const r = rand(seed);
  const out: Bar[] = [];
  let prev = start;
  closes.forEach((c, i) => {
    const o = prev + (r() - 0.5) * 0.5;
    const body = Math.abs(c - o);
    const h = Math.max(o, c) + (0.15 + r() * 0.9) * (0.4 + body * 0.35);
    const l = Math.min(o, c) - (0.15 + r() * 0.9) * (0.4 + body * 0.35);
    out.push({ o, h, l, c, v: vols[i] });
    prev = c;
  });
  return out;
}

export const noiseSeq = (n: number, seed: number, amp: number) => {
  const r = rand(seed);
  return Array.from({ length: n }, () => (r() - 0.5) * 2 * amp);
};

const avg20 = (pre: Bar[]) => pre.slice(-20).reduce((s, b) => s + b.v, 0) / 20;

// ---------------------------------------------------------------- A: base breakout
function laneA(): Bar[] {
  const nz = noiseSeq(PRE, 11, 0.9);
  const closes = Array.from({ length: PRE }, (_, i) => {
    if (i < 12) return 117 - i * 1.75 + nz[i] * 0.6; // decline into the base
    const k = i - 12;
    return 96 + 2.6 * Math.sin(k * 0.62) + 0.8 * Math.sin(k * 1.7) + nz[i] * 0.7; // base 92–100
  });
  closes[PRE - 1] = 99.6;
  const vols = Array.from({ length: PRE }, (_, i) => (i < 12 ? 1.25 - i * 0.02 : 0.95 - (i - 12) * 0.008) + nz[(i * 7) % PRE] * 0.15);
  const pre = build(closes, vols, 101, 119);
  pre.forEach((b, i) => {
    if (i >= 12) {
      b.h = Math.min(b.h, 100.3);
      b.l = Math.max(b.l, 91.6);
    }
  });
  const postC = [107, 105.6, 106.4, 108.7, 110.1, 109.3, 111.6, 113.1, 112.3, 114.9, 116.4, 115.5, 118.1, 120.2, 119.2, 121.6, 123.7, 122.8, 125.1, 127.3, 126.2, 128.6, 130.1, 129.4];
  const postV = [1.6, 1.0, 0.95, 1.4, 1.5, 1.0, 1.4, 1.5, 1.05, 1.45, 1.5, 1.0, 1.55, 1.6, 1.1, 1.5, 1.55, 1.05, 1.5, 1.6, 1.1, 1.5, 1.55, 1.1];
  const post = build(postC, postV, 202, 108);
  post.slice(0, 6).forEach((b) => (b.l = Math.max(b.l, 104.5))); // pullback stays above the midpoint
  return [...pre, { ...HERO_BAR, v: 2.6 * avg20(pre) }, ...post];
}

// ---------------------------------------------------------------- B: climax top
function laneB(): Bar[] {
  const nz = noiseSeq(PRE, 23, 0.8);
  const closes = Array.from({ length: PRE }, (_, i) => {
    const u = i / (PRE - 1);
    return 62 + 38 * Math.pow(u, 1.55) + nz[i] * (0.6 + u) - (i % 6 === 3 ? 1.6 : 0);
  });
  closes[PRE - 1] = 99.8;
  const vols = Array.from({ length: PRE }, (_, i) => 0.7 + (i / PRE) * 0.9 + nz[(i * 5) % PRE] * 0.2);
  const pre = build(closes, vols, 303, 61);
  const post: Bar[] = [{ o: 108.6, h: 111.9, l: 103.1, c: 103.5, v: 3.1 }]; // shooting star: closes below the midpoint
  const postC = [102.3, 104.2, 100.9, 99.1, 100.6, 97.7, 95.9, 97.2, 94.3, 92.7, 93.9, 91.1, 89.6, 90.7, 88.3, 87.0, 88.1, 86.2, 85.4, 86.5, 84.7, 85.6, 84.1];
  const postV = [2.2, 1.6, 1.9, 1.7, 1.3, 1.6, 1.5, 1.1, 1.5, 1.4, 1.0, 1.4, 1.3, 0.95, 1.3, 1.2, 0.9, 1.2, 1.15, 0.85, 1.1, 0.9, 1.0];
  post.push(...build(postC, postV, 404, 103.5));
  return [...pre, { ...HERO_BAR, v: 4.8 * avg20(pre) }, ...post];
}

// ---------------------------------------------------------------- C: bounce into resistance
function laneC(): Bar[] {
  const nz = noiseSeq(PRE, 37, 0.8);
  const closes = Array.from({ length: PRE }, (_, i) => {
    if (i < 11) return 114.5 + 2.4 * Math.sin(i * 0.9) + nz[i] * 0.5; // range above the old support 110
    if (i < 15) return 110 - (i - 10) * 2.1 + nz[i] * 0.4; // breakdown
    if (i < 34) return 101.8 - (i - 15) * 0.52 + 1.1 * Math.sin(i * 0.8) + nz[i] * 0.6; // grind lower
    return 92.8 + (i - 34) * 1.2 + nz[i] * 0.4; // small bounce
  });
  closes[PRE - 1] = 99.7;
  const vols = Array.from({ length: PRE }, (_, i) => (i >= 11 && i < 15 ? 1.9 : 1.0 - Math.max(0, i - 15) * 0.006) + nz[(i * 3) % PRE] * 0.15);
  const pre = build(closes, vols, 505, 115);
  pre.forEach((b, i) => {
    if (i < 11) b.l = Math.max(b.l, 110.3);
  });
  const postC = [107.2, 106.0, 104.6, 103.0, 101.4, 99.3, 98.0, 99.1, 97.6, 98.4, 97.0, 98.2, 96.8, 97.5, 96.2, 97.4, 96.0, 96.9, 95.8, 96.6, 95.5, 96.3, 95.9, 96.4];
  const postV = [0.85, 0.8, 0.9, 1.0, 1.15, 1.3, 1.0, 0.8, 0.9, 0.8, 0.85, 0.75, 0.8, 0.7, 0.75, 0.7, 0.72, 0.68, 0.7, 0.66, 0.7, 0.64, 0.66, 0.62];
  const post = build(postC, postV, 606, 108);
  post[0].h = 110.6; // stabs into the resistance band and gets rejected
  return [...pre, { ...HERO_BAR, v: 0.8 * avg20(pre) }, ...post];
}

export const LANES: Record<LaneId, Bar[]> = { A: laneA(), B: laneB(), C: laneC() };
export const LANE_IDS: LaneId[] = ["A", "B", "C"];

export const lastClose = (id: LaneId) => LANES[id][LANES[id].length - 1].c;
export const changePct = (id: LaneId) => (lastClose(id) / HERO_BAR.c - 1) * 100;
export const avgVol = (id: LaneId) => {
  const pre = LANES[id].slice(HERO - 20, HERO);
  return pre.reduce((s, b) => s + b.v, 0) / pre.length;
};
export const volRatio = (id: LaneId) => LANES[id][HERO].v / avgVol(id);

// ---------------------------------------------------------------- world layout
export const SPACING = 0.16; // x per bar
export const PY = 0.085; // world y per price point (same for every lane, so the three heroes are identical)
export const BODY_W = 0.104;
export const LANE_Y: Record<LaneId, number> = { A: 7.2, B: 0, C: -7.2 };
export const VOL_BASE = -4.2; // local y of the volume floor (below B's lowest low ≈ 60 → -3.4)
export const VOL_H = 0.26; // local height per 1.0 volume
export const barX = (i: number) => (i - 32) * SPACING;
export const priceY = (p: number) => (p - HERO_BAR.o) * PY;
export const HERO_X = barX(HERO);
/** world position of a price on a lane at bar i */
export const world = (lane: LaneId, i: number, p: number, z = 0): [number, number, number] => [barX(i), LANE_Y[lane] + priceY(p), z];

export const RES_LO = 108.2; // C's resistance band
export const RES_HI = 111;
export const BASE_LO = 91.6; // A's base box
export const BASE_HI = 100.3;

// ---------------------------------------------------------------- the position map (chapter 01)
/**
 * One illustrative chart that contains all three positions, each with the same-sized big bullish candle
 * (body +8): ① first breakout after a long base, ② a late, accelerating rally, ③ a bounce in a downtrend
 * into old support that has turned into resistance.
 */
export const POS = { hero: [34, 59, 77] as const, base: [12, 33] as const, rally: [35, 58] as const, shelf: [46, 50] as const, band: [127, 133] as const, baseBox: [91.6, 100.4] as const };
function posMap(): Bar[] {
  const nz = noiseSeq(120, 77, 0.8);
  const c: number[] = [];
  for (let i = 0; i < 12; i++) c.push(118 - i * 1.9 + nz[i] * 0.6); // decline
  for (let i = 12; i < 34; i++) c.push(96 + 2.5 * Math.sin((i - 12) * 0.66) + 0.7 * Math.sin((i - 12) * 1.8) + nz[i] * 0.5); // base 92–100
  c[33] = 99.7;
  const hero = (o: number): Bar => ({ o, c: o + 8, h: o + 8.8, l: o - 0.4, v: 1 });
  const pre = build(c, c.map(() => 1), 919, 120);
  pre.forEach((b, i) => {
    if (i >= 12) {
      b.h = Math.min(b.h, 100.4);
      b.l = Math.max(b.l, 91.6);
    }
  });
  const r: number[] = [];
  for (let i = 35; i < 46; i++) r.push(108 + (i - 34) * 1.85 + nz[i] * 0.7); // steady rise to ~128
  for (let i = 46; i < 51; i++) r.push(130 + 2.2 * Math.sin((i - 46) * 1.4) + nz[i] * 0.4); // shelf 127–133
  for (let i = 51; i < 59; i++) r.push(133 + Math.pow(i - 50, 1.45) * 1.2 + nz[i] * 0.4); // acceleration
  r[r.length - 1] = 157.6;
  const rally = build(r, r.map(() => 1), 929, 108);
  rally.forEach((b, k) => {
    const i = 35 + k;
    if (i >= 46 && i < 51) {
      b.h = Math.min(b.h, 133.4);
      b.l = Math.max(b.l, 127.2);
    }
  });
  const top: Bar = { o: 166.6, h: 170.2, l: 160.8, c: 161.4, v: 1 }; // closes under the midpoint the next day
  const f: number[] = [];
  for (let i = 61; i < 73; i++) f.push(161.4 - (i - 60) * 3.7 + nz[i] * 0.9); // fall through the shelf
  for (let i = 73; i < 77; i++) f.push(116.5 + Math.sin(i) * 1.2 + nz[i] * 0.4);
  f[f.length - 1] = 117.6;
  const fall = build(f, f.map(() => 1), 939, 161.4);
  const reject: Bar = { o: 126.3, h: 129.6, l: 121.2, c: 121.9, v: 1 };
  const t: number[] = [];
  for (let i = 79; i < 89; i++) t.push(121.9 - (i - 78) * 1.15 + nz[i] * 0.6);
  const tail = build(t, t.map(() => 1), 949, 121.9);
  const h3 = hero(118);
  h3.h = 128.6; // pokes into the band
  return [...pre, hero(100), ...rally, hero(158), top, ...fall, h3, reject, ...tail];
}
export const POSMAP = posMap();
