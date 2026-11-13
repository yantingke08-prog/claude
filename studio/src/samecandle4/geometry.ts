// Text boxes are sized here, not by the browser: the renderer draws every label at exactly the box this
// module computes, and the layout check (scripts/samecandle4-timing.ts) tests the very same boxes against
// candles, lines, numbers and each other. Widths are deliberately generous (CJK = 1 em, Latin/digits
// 0.62 em) so a real glyph run never exceeds its box.
export type Box = { x: number; y: number; w: number; h: number };
export type Line = { t: string; size: number; w?: 500 | 700 | 900; num?: boolean; color?: string };

const charW = (c: string, size: number) => {
  if (/[　-鿿＀-￯]/.test(c)) return size; // CJK + full-width punctuation
  if (c === " ") return size * 0.3;
  if (c === "." || c === ",") return size * 0.32;
  if (c === "%") return size * 0.82;
  if (c === "×" || c === "−" || c === "+" || c === "→") return size * 0.66;
  return size * 0.62;
};
export const textW = (t: string, size: number) => Array.from(t).reduce((s, c) => s + charW(c, size), 0);

export const PAD = { x: 18, y: 10 };
export const LINE_H = 1.22;
export const linesSize = (lines: Line[], pad = PAD) => ({
  w: Math.ceil(Math.max(...lines.map((l) => textW(l.t, l.size))) + pad.x * 2),
  h: Math.ceil(lines.reduce((s, l) => s + l.size * LINE_H, 0) + pad.y * 2),
});

/** A slot: where a label box goes, as a point and which part of the box sits on it (0 = left/top, 1 = right/bottom). */
export type Slot = { x: number; y: number; ax?: number; ay?: number };
export const boxAt = (s: Slot, w: number, h: number): Box => ({ x: s.x - w * (s.ax ?? 0), y: s.y - h * (s.ay ?? 0), w, h });

export const inter = (a: Box, b: Box, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
export const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
export const union = (bs: Box[]): Box | null => {
  if (!bs.length) return null;
  const x0 = Math.min(...bs.map((b) => b.x));
  const y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.w));
  const y1 = Math.max(...bs.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};
/** does the segment p→q pass through box b (sampled)? */
export const segHits = (p: { x: number; y: number }, q: { x: number; y: number }, b: Box) => {
  const n = Math.max(2, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 4));
  for (let i = 0; i <= n; i++) {
    const x = p.x + ((q.x - p.x) * i) / n;
    const y = p.y + ((q.y - p.y) * i) / n;
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  }
  return false;
};
/** the point on a box edge closest to p (where a leader line meets its label) */
export const edgePoint = (b: Box, p: { x: number; y: number }) => ({ x: Math.min(b.x + b.w, Math.max(b.x, p.x)), y: Math.min(b.y + b.h, Math.max(b.y, p.y)) });
