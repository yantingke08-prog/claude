// Fixed screen zones for the 1440×2560 frame. Every HUD element and every 3D data object has exactly one zone;
// scene.ts places labels inside these rectangles and scripts/activepassive-layout.mjs checks them at the key frames.
export type Rect = { x: number; y: number; w: number; h: number };
export type Zone = { top: number; bottom: number };

export const LAYOUT = {
  W: 1440,
  H: 2560,
  /** left/right safe margin for everything (text, cards, data) */
  margin: 64,
  /** chapter, topic, progress, risk notice — nothing else */
  status: { top: 0, bottom: 260 } as Zone,
  /** candles, volume, Delta, order books, and the data labels that point at them */
  data: { top: 300, bottom: 1760 } as Zone,
  /** one main conclusion at a time */
  verdict: { top: 1780, bottom: 1950 } as Zone,
  /** subtitles only, fixed at the bottom */
  caption: { top: 1980, bottom: 2320 } as Zone,
  /** the 3D camera's principal point is moved up by this many px so the stage centres on the data zone (1030) */
  viewShift: 250,
  /** at most this many data labels on screen at once (plus one conclusion and one caption) */
  maxLabels: 2,
  /** px kept free around data objects and between labels */
  pad: 14,
  gap: 18,
  /** frames: an element appears on its word and fades in over IN; it fades out over the OUT frames before its end,
   * so the old one is gone exactly when the next one's word starts */
  OUT: 5,
  IN: 6,
} as const;

export const zoneRect = (z: Zone): Rect => ({ x: LAYOUT.margin, y: z.top, w: LAYOUT.W - 2 * LAYOUT.margin, h: z.bottom - z.top });
export const DATA = zoneRect(LAYOUT.data);
export const VERDICT = zoneRect(LAYOUT.verdict);
export const CAPTION = zoneRect(LAYOUT.caption);
export const STATUS = zoneRect(LAYOUT.status);

export const inflate = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
export const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const inside = (a: Rect, z: Rect, tol = 0.5) => a.x >= z.x - tol && a.y >= z.y - tol && a.x + a.w <= z.x + z.w + tol && a.y + a.h <= z.y + z.h + tol;
export const union = (rs: Rect[]): Rect | null => {
  if (!rs.length) return null;
  const x0 = Math.min(...rs.map((r) => r.x));
  const y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w));
  const y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};
/** nearest point of a rectangle to p (where a leader line meets the plate) */
export const nearest = (r: Rect, p: { x: number; y: number }) => ({ x: Math.min(r.x + r.w, Math.max(r.x, p.x)), y: Math.min(r.y + r.h, Math.max(r.y, p.y)) });
/** does segment p→q cross rectangle r (Liang–Barsky) */
export const segHits = (p: { x: number; y: number }, q: { x: number; y: number }, r: Rect) => {
  let t0 = 0;
  let t1 = 1;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const clip = (pp: number, qq: number) => {
    if (pp === 0) return qq >= 0;
    const t = qq / pp;
    if (pp < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return clip(-dx, p.x - r.x) && clip(dx, r.x + r.w - p.x) && clip(-dy, p.y - r.y) && clip(dy, r.y + r.h - p.y) && t0 < t1;
};

/** width estimate for the fonts in use: CJK = 1 em, Latin and digits (Space Grotesk) = 0.6 em */
export const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? (ch === " " ? 0.3 : 0.6) : 1) * size, 0);

// ---------------------------------------------------------------- label anatomy (shared by scene.ts and hud.tsx)
/** a data label: muted key text + bright value, one row, on a plate with a left accent bar */
export const LBL = { k: 32, v: 40, padX: 18, bar: 5, gapKV: 12, h: 66 } as const;
export const labelSize = (k: string, v: string) => ({ w: Math.ceil((k ? textW(k, LBL.k) + LBL.gapKV : 0) + textW(v, LBL.v) + LBL.padX * 2 + LBL.bar + 6), h: LBL.h });
/** a choice chip at the end: big word + small line */
export const CHIP = { k: 76, v: 34, h: 158, padX: 40 } as const;
export const chipSize = (k: string, v: string) => ({ w: Math.ceil(Math.max(textW(k, CHIP.k) + 2 * CHIP.padX, textW(v, CHIP.v) + 24)), h: CHIP.h });

// ---------------------------------------------------------------- conclusion band and captions
/** font size per row so every row fits the band's width and all rows fit its height */
export const verdictLayout = (rows: string[], big = false) => {
  const inner = VERDICT.w - 2 * 44;
  const base = big ? 104 : rows.length > 1 ? 56 : 66;
  const sizes = rows.map((r, i) => Math.floor(Math.min(i > 0 ? base - 4 : base, inner / Math.max(1, textW(r, 1)))));
  const lh = 1.22;
  const h = Math.ceil(sizes.reduce((s, z) => s + z * lh, 0) + 26);
  const w = Math.ceil(Math.max(...rows.map((r, i) => textW(r, sizes[i]))) + 2 * 44);
  return { sizes, lh, h, w, rect: { x: VERDICT.x + (VERDICT.w - w) / 2, y: VERDICT.y + (VERDICT.h - h) / 2, w, h } as Rect };
};
export const CAP = { size: 60, lh: 82, padX: 30, padY: 18 } as const;
export const captionLayout = (rows: string[]) => {
  const w = Math.ceil(Math.max(...rows.map((r) => textW(r, CAP.size))) + 2 * CAP.padX);
  const h = rows.length * CAP.lh + CAP.padY;
  return { rect: { x: (LAYOUT.W - w) / 2, y: CAPTION.y + 10, w, h } as Rect };
};
/** status band: three rows (series + risk, topic, chapter + steps) and the progress line */
export const STATUS_ROWS = { r1: 58, r2: 104, r3: 190, bar: 244 } as const;
