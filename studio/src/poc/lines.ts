// Where every POC line is and how strongly it glows at frame f (the film's motif), and the order book state.
// Pure functions of the frame; world.tsx draws them, tags.ts pins its price labels to their ends.
import { live, pocAt, printed, rowsAt } from "./acts";
import { E, clamp01, ramp, win } from "./cue";
import { A, A_HOOK, B, C, C_TEST, D1, D2, D3, NUM, PROF_W, W, cx, cy, prof, rowLen, type Day } from "./data";
import { presence } from "./director";
import { COL } from "./palette";

export type LineSpec = { id: string; d: Day; price: number; x0: number; x1: number; y: number; g: number; op: number; color?: string; sparks?: boolean };

/** a short bump after a moment (the line answers when price comes back to it) */
const pulse = (f: number, at: number, len = 26) => (f < at ? 0 : Math.exp(-(f - at) / (len / 3)) * clamp01((f - at) / 3));
const lastIdx = (d: Day, f: number) => Math.max(0, Math.ceil(printed(d, f)) - 1);
/** right end: past the last printed bar, or the tip of the POC brick once the profile is there */
const tip = (d: Day, f: number, price: number) => {
  const r = rowsAt(d, f);
  const brick = r.n > 0.01 ? d.px + rowLen(r.rows.get(Math.round(price)) ?? 0) : -1e9;
  return Math.max(cx(d, lastIdx(d, f)) + 0.45, brick);
};
const fullTip = (d: Day) => d.px + rowLen(prof(d).pocV);

/** the strength of the first day's line: a glimmer, lit by volume, a magnet at the end */
export const gA = (f: number) => {
  if (f >= E("zIn")) return 1;
  const glimmer = (0.06 + 0.035 * Math.sin(f * 0.61) * Math.sin(f * 0.23 + 1)) * ramp(f, 4, 40);
  let g = glimmer + 0.17 * ramp(f, E("wBright"), 20) + 0.38 * ramp(f, E("pPoc"), 16) + 0.08 * ramp(f, E("pFair"), 20) + 0.16 * ramp(f, E("yMem"), 24);
  g += 0.22 * (pulse(f, E("hBack1") + 4) + pulse(f, E("hBack2") + 4)) + 0.12 * (pulse(f, E("aBackP") + 4) + pulse(f, E("yPull") + 6));
  // day two: it becomes the old POC; in the five-day view it is one step of five
  g *= 1 - 0.62 * ramp(f, E("mMig"), 24) * (1 - ramp(f, E("u1In"), 20));
  if (f >= E("u1In")) g = 0.55 * (1 - 0.5 * ramp(f, E("u2In"), 20));
  return Math.min(1, g);
};

export const lineState = (f: number): LineSpec[] => {
  const pr = presence(f);
  const out: LineSpec[] = [];
  const five = f >= E("u1In") && f < E("xIn");
  const fiveK = win(f, E("u1In"), E("u2In") + 20, 20, 20);

  // ---- A: 5012
  const aP = NUM.aPoc;
  let aX1 = f < E("pBuild") ? cx(A, Math.min(lastIdx(A, f), A_HOOK - 1)) + 0.5 : tip(A, f, aP);
  if (f >= E("mIn") && f < E("u1In")) aX1 = Math.max(aX1, aX1 + (cx(B, B.bars.length - 1) + 0.45 - aX1) * ramp(f, E("mIn") + 12, 40));
  if (five || f >= E("zIn")) aX1 = fullTip(A);
  out.push({ id: "a", d: A, price: aP, x0: cx(A, 0) - 0.35, x1: aX1, y: cy(A, aP), g: gA(f), op: pr.A });

  // ---- B: the developing POC, shown once value starts to pile up, gliding from 5013 to 5031
  if (pr.B > 0.002 && f >= E("mPile") - 10) {
    const bp = pocAt(B, f, 26);
    const g0 = 0.42 * ramp(f, E("mPile") - 10, 14) + 0.45 * ramp(f, E("mMove") + 8, 16);
    let x1 = tip(B, f, bp);
    let g = g0;
    if (five) {
      x1 = fullTip(B);
      g = 0.6;
    }
    // as the prior day's POC, it reaches across day three
    if (f >= E("u2In")) {
      x1 = fullTip(B) + (tip(C, f, NUM.cPrior) - fullTip(B)) * ramp(f, E("u2Prior"), 24);
      g = 0.6 + 0.25 * ramp(f, E("u2Prior"), 16) + 0.25 * pulse(f, E("u2Hit") + 4) + 0.15 * win(f, E("u3Near"), E("go") + 30, 10, 20);
    }
    out.push({ id: "b", d: B, price: bp, x0: cx(B, 0) - 0.3, x1, y: cy(B, bp), g: Math.min(1, g), op: pr.B });
  }

  // ---- C: today's POC (frozen at its value-area price once the drop starts, so it does not jitter by one point)
  if (pr.C > 0.002) {
    const cp = printed(C, f) > 14 ? NUM.cPoc : pocAt(C, f, 18);
    const x1 = f < E("u3Near") || f > E("go") + 4 ? tip(C, f, cp) : cx(C, C.bars.length - 1) + 0.5;
    out.push({ id: "c", d: C, price: cp, x0: cx(C, 0) - 0.3, x1: Math.max(cx(C, 0) + 0.2, x1), y: cy(C, cp), g: 0.4 * ramp(f, E("u1In") + 10, 20) + 0.38 * ramp(f, E("u2Today"), 14), op: pr.C });
  }

  // ---- the context days (only in the five-day view)
  for (const d of [D1, D2, D3]) {
    const p = prof(d).poc;
    out.push({ id: d.id, d, price: p, x0: cx(d, 0) - 0.2, x1: fullTip(d), y: cy(d, p), g: 0.55 * fiveK, op: pr.ctx, sparks: false });
  }

  // ---- W: a lit POC that price goes straight through
  if (pr.W > 0.002) {
    const p = NUM.wPoc;
    const thru = win(f, E("xThru"), E("xThru") + 26, 3, 14);
    out.push({ id: "w", d: W, price: p, x0: cx(W, 0) - 0.3, x1: fullTip(W), y: cy(W, p), g: 0.82 - 0.4 * thru * (0.5 + 0.5 * Math.sin(f * 1.7)), op: pr.W });
  }
  return out;
};

// ---------------------------------------------------------------- the order book at the test of the prior POC
const PER = 0.0032; // world x per 手
export const DOM_X = () => C.px + 1.55;
export const DOM_W = 2.9;
export const DOM_ROWS = [5028, 5029, 5030, 5031, 5032, 5033, 5034, 5035, 5036, 5037];
const BASE: Record<number, number> = { 5028: 210, 5029: 260, 5030: 320, 5031: 380, 5032: 300, 5033: 220, 5034: 240, 5035: 260, 5036: 240, 5037: 300 };
/** the bid at the prior POC being hit and refilled (two hits), as a number of 手 */
export const bidAt = (f: number, p: number) => {
  if (p !== NUM.cPrior && p !== NUM.cPrior + 1) return BASE[p];
  const a = E("dBid");
  const b = E("dAsk");
  if (f < a) return BASE[p];
  const t = clamp01((f - a) / Math.max(1, b - a + 20));
  const ph = (t * 2) % 1; // two cycles: knocked down fast, refilled slower
  const hit = ph < 0.3 ? ph / 0.3 : 1 - (ph - 0.3) / 0.7;
  return Math.round(BASE[p] - (p === NUM.cPrior ? 280 : 180) * (t >= 1 ? 0 : hit));
};
/** the offers above being pulled */
export const askAt = (f: number, p: number) => {
  const pulled = { 5035: 70, 5036: 60, 5037: 90 } as Record<number, number>;
  if (!(p in pulled)) return BASE[p];
  return Math.round(BASE[p] + (pulled[p] - BASE[p]) * ramp(f, E("dAsk") + 2 + (p - 5035) * 4, 18));
};
export const dom = (f: number) => {
  const op = win(f, E("u3Near"), E("go") + 4, 12, 10) * presence(f).C;
  const bars = live(C, f);
  const li = Math.max(0, Math.ceil(printed(C, f)) - 1);
  const last = Math.round(bars[li]?.c ?? NUM.cPrior);
  const rows = DOM_ROWS.map((p) => {
    const bid = p < last ? bidAt(f, p) : 0;
    const ask = p > last ? askAt(f, p) : 0;
    const hot = (p === NUM.cPrior ? win(f, E("dBid"), E("dAsk") + 20, 6, 10) : 0) + (p >= 5035 ? win(f, E("dAsk"), E("go"), 6, 10) : 0);
    return { p, bid, ask, bidL: bid * PER, askL: ask * PER, hot };
  });
  const ghost = win(f, E("u3NoOrder"), E("e0"), 6, 16);
  return { op, x: DOM_X(), w: DOM_W, rows, last, ghost, ghostP: NUM.cPrior };
};
export const LADDER_COL = { bid: COL.up, ask: COL.down };
export { PROF_W, C_TEST };
