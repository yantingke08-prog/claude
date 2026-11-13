// Pure geometry of everything drawn in v4 (no React, no fonts): the renderer and the layout check both use it.
import { HERO, HERO_BAR, LANES, type Bar, type LaneId } from "./data";
import { type Beat, type Pt, BEATS, CHAPTERS, EMPH, NAME, PATHS, THREE_ITEMS, chartOf } from "./beats";
import { type Box } from "./geometry";
import { type Chart, CUT, IDS, ROW, ROW_H, ROW_Y, THREE_CARD, VCOL_X, bodyW, clamp01, cx, cy, slot, volBars, volPost } from "./layout";

export const grown = (b: Bar, g: number) => {
  const k = Math.min(1, g * 1.25);
  const c = b.o + (b.c - b.o) * k;
  const w = clamp01((g - 0.35) / 0.65);
  return { o: b.o, c, h: Math.max(b.o, c) + (b.h - Math.max(b.o, c)) * w, l: Math.min(b.o, c) - (Math.min(b.o, c) - b.l) * w, v: b.v * Math.min(1, g * 1.4) };
};
export type CandleOpts = { bars: Bar[]; c: Chart; post: number; hero?: number; heroGlow?: boolean; dimPre?: number; dimPost?: number; from?: number; mul?: number };
export const candleBoxes = ({ bars, c, post, hero = HERO, from }: CandleOpts): (Box & { i: number })[] => {
  const out: (Box & { i: number })[] = [];
  const bw = bodyW(c);
  const i0 = Math.max(0, Math.ceil(c.i0 - 0.5), from ?? 0);
  const i1 = Math.min(bars.length - 1, Math.floor(c.i1 + 0.5));
  for (let i = i0; i <= i1; i++) {
    const g = i <= hero ? 1 : clamp01(post - (i - hero - 1));
    if (g <= 0) continue;
    const b = grown(bars[i], g);
    out.push({ i, x: cx(c, i) - bw / 2, y: cy(c, b.h), w: bw, h: cy(c, b.l) - cy(c, b.h) });
  }
  return out;
};

/** axis labels of a panel: their boxes are obstacles for the layout check too */
export const axisBoxes = (c: Chart) => {
  const out: (Box & { v: number })[] = [];
  for (let v = Math.ceil(c.plo / 10) * 10; v <= c.phi; v += 10) {
    const y = cy(c, v);
    if (y < c.r.y + 30 || y > c.r.y + c.r.h - 4) continue;
    out.push({ v, x: c.r.x + c.r.w - 8 - 44, y: y - 8 - 26, w: 44, h: 26 });
  }
  return out;
};

export type XY = { x: number; y: number };
export const pt = (c: Chart, [i, p]: Pt): XY => ({ x: cx(c, i), y: cy(c, p) });
export const seg = (a: XY, b: XY, k: number): XY => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

/** geometry of arrows / paths / lines, shared with the layout check */
export const arrowPts = (b: Beat) => (b.kind === "arrow" ? [pt(chartOf(b.ch), b.from), pt(chartOf(b.ch), b.to)] : []);
export const pathPts = (b: Beat) => (b.kind === "path" ? [HERO_BAR.c, ...LANES[b.lane].slice(HERO + 1, HERO + 1 + b.n).map((x) => x.c)].map((p, j) => pt(chartOf(b.ch), [HERO + j, p])) : []);
export const hlineSeg = (b: Beat) => {
  if (b.kind !== "hline") return null;
  const c = chartOf(b.ch);
  const y = cy(c, b.p);
  const x0 = b.i0 !== undefined ? cx(c, b.i0) - slot(c) / 2 : c.r.x;
  return { y, x0, x1: c.r.x + c.r.w };
};


export const rowBadgeBox = (k: number): Box => ({ x: ROW.badgeX, y: ROW_Y[k] + ROW_H / 2 - ROW.badge / 2, w: ROW.badge, h: ROW.badge });
export const volHeadBoxes = (k: number, id: LaneId): Box[] => [
  { x: VCOL_X[k], y: 400, w: 56, h: 56 },
  { x: VCOL_X[k] + 70, y: 400 + 4, w: NAME[id].length * 40, h: 48 },
];


export const emphAt = (f: number) => {
  for (const e of EMPH) {
    if (f < e.at || f > e.at + e.len + 6) continue;
    const dim = Math.min(clamp01((f - e.at) / 6), clamp01((e.at + e.len + 6 - f) / 6));
    const flash = f < e.at + 20 ? (f < e.at + 8 ? (f - e.at) / 8 : 1 - (f - e.at - 8) / 12) : 0;
    return { e, dim, flash: clamp01(flash) };
  }
  return null;
};


export const threeBoxes = (k: number) => {
  const y = THREE_CARD.y[k];
  const x = THREE_CARD.x;
  return {
    card: { x, y, w: THREE_CARD.w, h: THREE_CARD.h },
    num: { x: x + 36, y: y + 44, w: 96, h: 84 },
    title: { x: x + 150, y: y + 40, w: 2 * 84 + 8, h: 100 },
    desc: { x: x + 150, y: y + 170, w: THREE_ITEMS[k].d.length * 44 + 8, h: 60 },
    icon: { x: x + 500, y: y + 30, w: 350, h: 240 },
  };
};

export const volFocus = (id: LaneId, f: number) => {
  const starts = BEATS.filter((b) => b.kind === "ratio").map((b) => b.a);
  if (f < starts[0]) return 1;
  const cur = starts.filter((s) => f >= s).length - 1;
  return cur === IDS.indexOf(id) ? 1 : 0.35;
};
export const volBarBoxes = (id: LaneId, f: number): Box[] => {
  const vc = volBars(IDS.indexOf(id));
  const n = volPost(id, f);
  const out: Box[] = [];
  LANES[id].forEach((bb, i) => {
    if (i < vc.i0 || i > vc.i1 || i > HERO + n) return;
    const g = i <= HERO ? 1 : clamp01(n - (i - HERO - 1));
    const y = cy(vc, bb.v * g);
    const w = bodyW(vc);
    out.push({ x: cx(vc, i) - w / 2, y, w, h: vc.r.y + vc.r.h - y });
  });
  return out;
};

export const holdShown = (f: number) => ({ A: f < PATHS.A, B: f >= PATHS.A && f < PATHS.B, C: f >= PATHS.B });

/** which beats belong to the scene on screen */
export const liveBeats = (scene: string) =>
  BEATS.filter((b) => {
    const isRows = b.ch.startsWith("row");
    if (scene === "rows") return isRows && b.a < CUT.why;
    if (scene === "recap") return isRows && b.a >= CUT.recap;
    return !isRows && (scene === "vol" ? b.ch.startsWith("vol") || b.ch.startsWith("vbar") : b.ch === scene);
  });


export const HEADER_Y = 150;
export const headerBox = (f: number): Box | null => {
  if (f >= CUT.end) return { x: 540 - (7 * 80) / 2, y: HEADER_Y, w: 7 * 80, h: 190 };
  const c = CHAPTERS.find((x) => f >= x.a && f < x.b);
  if (!c) return null;
  const w = Math.max(c.t.length * 80 + (c.n ? 100 : 0), c.s.length * 40);
  return { x: 540 - w / 2, y: HEADER_Y, w, h: 160 };
};

export const CAPTION_BOX: Box = { x: 40, y: 1572, w: 1000, h: 90 };
