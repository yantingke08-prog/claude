// What the HUD shows at frame f, as plain data: the conclusion band, the data labels (where, with what text), the
// status bar, and the screen rectangles of every 3D data object. Pure functions of the frame, no React, so hud.tsx
// draws exactly this and scripts/activepassive-layout.mjs checks exactly this.
//
// Rules enforced here:
// - at most LAYOUT.maxLabels data labels, one conclusion, one caption at a time;
// - an element fades out over OUT frames before the next one starts fading in (nothing cross-dissolves);
// - a label is placed by search: the free spot in the data zone nearest its anchor, clear of every data object and of
//   the other label, valid for its whole time on screen; if the full text fits nowhere it shrinks to its short form,
//   and if that fits nowhere either it is not shown (and the layout check reports it).
import { bookAbsorb, bookBuyA, bookBuyB, bookSellA, bookSellB, chaseBars, chaseFocus, secondBook, threeFocus, hookBars, logicBars, threeBars, volumeOn, type BookState, type LiveBar } from "./acts";
import { E, FRAMES, clamp01, sections } from "./cue";
import {
  BOOK_CANDLE_DX, CHASE, CHASE_LEVEL, CH_WALL, CH_WALL_I, END_BOOK_X, END_CANDLE, HOOK, LOGIC, LOGIC_LEVEL, LV, SIZE_W, SLAB_H, THREE as TH, THREE_LEVEL,
  TH_FAR, TH_NEAR, TOWER_W, VOL_K, X, cx, cy, ly, type Chart,
} from "./data";
import { presence, projector, type Proj } from "./director";
import { DATA, LAYOUT, chipSize, inflate, inside, labelSize, nearest, overlaps, segHits, type Rect } from "./layout";
import { T, type Accent, type Lbl, type Row } from "./text";

export type Pt = { x: number; y: number };
type SetId = keyof ReturnType<typeof presence>;
export type Box = { id: string; set: SetId; r: Rect; p: number };

// ================================================================= data objects on screen
const box3 = (pr: Proj, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Rect => {
  let a = Infinity;
  let b = Infinity;
  let c = -Infinity;
  let d = -Infinity;
  for (const x of [x0, x1])
    for (const y of [y0, y1])
      for (const z of [z0, z1]) {
        const q = pr(x, y, z);
        a = Math.min(a, q.x);
        b = Math.min(b, q.y);
        c = Math.max(c, q.x);
        d = Math.max(d, q.y);
      }
  return { x: a, y: b, w: c - a, h: d - b };
};

/** screen rectangles of the visible 3D data objects (candles, volume/Delta columns, books, walls, key levels) */
export const dataBoxes = (f: number, pr: Proj = projector(f)): Box[] => {
  const P = presence(f);
  const out: Box[] = [];
  const add = (set: SetId, id: string, r: Rect) => P[set] > 0.04 && out.push({ id, set, r, p: P[set] });
  const B = (set: SetId, id: string, x0: number, x1: number, y0: number, y1: number, z0 = -0.2, z1 = 0.2) => add(set, id, box3(pr, x0, x1, Math.min(y0, y1), Math.max(y0, y1), z0, z1));
  const chart = (set: SetId, ch: Chart, bars: LiveBar[], vol: number, level?: number, levelOp = 1) => {
    bars.forEach((b, i) => {
      if (b.g < 0.05 || (b.op ?? 1) < 0.3) return;
      const x = cx(ch, i);
      B(set, `bar${i}`, x - 0.2, x + 0.2, cy(ch, b.l), Math.max(cy(ch, b.h), cy(ch, b.l) + 0.05));
      if (vol > 0.05) B(set, `vol${i}`, x - 0.18, x + 0.18, ch.vb, ch.vb + Math.max(b.v * VOL_K, Math.abs(b.d) * VOL_K * 1.25) * vol, -0.18, 0.18);
    });
    if (level !== undefined && levelOp > 0.3) B(set, "level", cx(ch, 0) - 0.4, cx(ch, ch.bars.length - 1) + 0.6, cy(ch, level) - 0.04, cy(ch, level) + 0.04, 0, 0.1);
  };
  const book = (set: SetId, s: BookState) => {
    // piece by piece, so a label can sit on the shelf right beside the level it explains
    const x = s.cfg.x;
    const cl = x + BOOK_CANDLE_DX;
    const id = (n: string) => `${set}-${n}@${x}`;
    [1, 2, 3].forEach((k, i) => {
      const wa = Math.max(s.asks[i], s.takenA[i] > 0.05 ? s.cfg.asks[i] : 0) * SIZE_W;
      const wb = Math.max(s.bids[i], s.takenB[i] > 0.05 ? s.cfg.bids[i] : 0) * SIZE_W;
      if (wa > 0.02) B(set, id(`ask${k}`), x - wa / 2, x + wa / 2, ly(k) - SLAB_H / 2, ly(k) + SLAB_H / 2, -0.4, 0.4);
      if (wb > 0.02) B(set, id(`bid${k}`), x - wb / 2, x + wb / 2, ly(-k) - SLAB_H / 2, ly(-k) + SLAB_H / 2, -0.4, 0.4);
    });
    [-3, -2, -1, 1, 2, 3].forEach((k) => B(set, id(`shelf${k}`), x - TOWER_W, x + TOWER_W, ly(k) - SLAB_H / 2 - 0.05, ly(k) - SLAB_H / 2 + 0.01, -0.65, 0.65));
    if (s.mine && s.mine.op > 0.05) B(set, id("mine"), x + 0.15 - (s.mine.size * SIZE_W) / 2, x + 0.15 + (s.mine.size * SIZE_W) / 2, ly(s.mine.level) - SLAB_H / 2, ly(s.mine.level) + SLAB_H / 2, 0.4, 0.84);
    s.pulses.forEach((q, i) => q.op > 0.05 && B(set, id(`pulse${i}`), x + (q.dx ?? 0) - 0.14, x + (q.dx ?? 0) + 0.14, ly(Math.min(q.y0, q.y1)) - 0.1, ly(Math.max(q.y0, q.y1)) + 0.1, (q.z ?? 0.62) - 0.12, (q.z ?? 0.62) + 0.12));
    if (s.spread > 0.05) B(set, id("spread"), x + TOWER_W - 0.05, x + TOWER_W + 0.25, ly(-1), ly(1), 0.2, 0.4);
    B(set, id("candle"), cl - 0.22, cl + 0.22, ly(Math.min(s.candle.l, s.candle.c)) - 0.05, ly(Math.max(s.candle.h, s.candle.c)) + 0.05, -0.21, 0.21);
    B(set, id("last"), cl - 0.45, x + TOWER_W, ly(s.price) - 0.05, ly(s.price) + 0.05, 0.6, 0.7);
  };

  if (P.hook > 0.04) chart("hook", HOOK, hookBars(f), 0);
  if (P.buy > 0.04) {
    book("buy", bookBuyA(f));
    if (secondBook(f, "buy") > 0.3) book("buy", bookBuyB(f));
  }
  if (P.sell > 0.04) {
    book("sell", bookSellA(f));
    if (secondBook(f, "sell") > 0.3) book("sell", bookSellB(f));
  }
  if (P.chase > 0.04) {
    chart("chase", CHASE, chaseBars(f), volumeOn(f, "chase") * (f >= E("cBig") + 12 ? 0 : 1), CHASE_LEVEL, chaseFocus(f));
    const wx = cx(CHASE, CH_WALL_I);
    if (f >= E("cBig") - 2) B("chase", "wall", wx - 1.3, wx + 0.7, cy(CHASE, CH_WALL.lo), cy(CHASE, CH_WALL.hi), -0.45, 0.45);
    if (f >= E("cBig") - 4 && f < E("cBig") + 30) B("chase", "bigPulse", wx - 0.12, wx + 0.12, cy(CHASE, 102.6), cy(CHASE, CH_WALL.lo), 0.45, 0.65);
    if (f >= E("cYou")) {
      const k = Math.min(1, Math.max(0, (f - E("cYou")) / 16));
      const yx = wx + 1.35 - 1.15 * k;
      const yy = cy(CHASE, CH_WALL.lo) - 0.6 + 0.5 * k;
      B("chase", "you", yx - 0.16, yx + 0.16, yy - 0.11, yy + 0.11, 0.4, 0.7);
    }
  }
  if (P.three > 0.04) {
    chart("three", TH, threeBars(f), volumeOn(f, "three"), THREE_LEVEL, threeFocus(f));
    if (f >= E("cav2")) B("three", "bidWall", cx(TH, 8.5) - 0.9, cx(TH, 8.5) + 0.9, cy(TH, THREE_LEVEL) - 0.34, cy(TH, THREE_LEVEL) - 0.06, -0.4, 0.4);
    if (f >= E("t3a") && f < E("absIn")) B("three", "nearZone", cx(TH, TH_NEAR[0]) - 0.36, cx(TH, TH_NEAR[1]) + 0.36, cy(TH, THREE_LEVEL) - 0.12, cy(TH, 101.95), 0, 0.05);
    if (f >= E("t3c") && f < E("absIn")) B("three", "farZone", cx(TH, TH_FAR[0]) - 0.36, cx(TH, TH_FAR[1]) + 0.36, cy(TH, 102.2), cy(TH, 104.6), 0, 0.05);
  }
  if (P.absorb > 0.04) {
    const s = bookAbsorb(f);
    book("absorb", s);
    // the two dashed arrows of 往哪走 are HUD drawings over the book: keep labels off them too
    if (f >= E("abWhere")) {
      const m = absorbMid(pr, s);
      add("absorb", "arrows", { x: m.x - 26, y: m.y - 260, w: 120, h: 520 });
    }
  }
  if (P.logic > 0.04) {
    chart("logic", LOGIC, logicBars(f), volumeOn(f, "logic"), LOGIC_LEVEL);
    if (f >= E("lg4")) B("logic", "retest", cx(LOGIC, 5.5) - 0.75, cx(LOGIC, 5.5) + 0.75, cy(LOGIC, LOGIC_LEVEL) - 0.3, cy(LOGIC, LOGIC_LEVEL) - 0.04, -0.4, 0.4);
  }
  if (P.end > 0.04) {
    B("end", "candle", END_CANDLE.x - 0.45, END_CANDLE.x + 0.45, END_CANDLE.l, END_CANDLE.h, -0.45, 0.45);
    B("end", "book", END_BOOK_X - 0.8, END_BOOK_X + 0.8, -1.6, 1.4 + LV + 0.17, -0.4, 0.7);
  }
  return out;
};
export const absorbMid = (pr: Proj, s: BookState) => pr(X.absorb + 1.45, ly(s.price), 0.6);

// ================================================================= sequencing
/** scene changes (the camera flies to the next set): nothing outlives them */
let cuts: number[] | null = null;
const cutAt = () => (cuts ??= ["buyIn", "sellIn", "chaseIn", "threeIn", "absIn", "logicIn", "endIn"].map(E));
/**
 * Visible share of an element that belongs to the span [from, to] (frames of spoken words): it starts fading in on
 * its word (`from`) and has finished fading out at `to`, which is the next element's word or a scene change.
 * So an element lands while its word is spoken, and the old one is gone before the new one begins.
 */
export const alphaOf = (f: number, from: number, to: number) => Math.min(from <= 0 ? 1 : clamp01((f - from) / LAYOUT.IN), clamp01((to - f) / LAYOUT.OUT));
const visibleSpan = (from: number, to: number): [number, number] => [from, to];

// ================================================================= conclusion band
type VSpec = { from: number; rows: Row[]; rowAt?: number[]; big?: boolean };
let vCache: VSpec[] | null = null;
const verdicts = (): VSpec[] =>
  (vCache ??= [
    { from: 0, rows: T.V.hook0, big: true },
    { from: E("notSlow"), rows: T.V.hook1 },
    { from: E("aBuy"), rows: T.V.buy1 },
    { from: E("pBuy"), rows: T.V.buy2 },
    { from: E("cmpDiff"), rows: T.V.buy3 },
    { from: E("sAct"), rows: T.V.sell1 },
    { from: E("sPas"), rows: T.V.sell2 },
    { from: E("keyIn"), rows: T.V.sell3 },
    { from: E("cDone"), rows: T.V.chase1 },
    { from: E("cStuck"), rows: T.V.chase2 },
    { from: E("cYou"), rows: T.V.chase3 },
    { from: E("tThree"), rows: T.V.three0 },
    { from: E("t1"), rows: T.V.three1 },
    { from: E("t2"), rows: T.V.three2 },
    { from: E("t3"), rows: T.V.three3 },
    { from: E("cav1"), rows: T.V.three4, rowAt: [E("cav1"), E("cav2")] },
    { from: E("abStill"), rows: T.V.abs1 },
    { from: E("abHold"), rows: T.V.abs2 },
    { from: E("abWhere"), rows: T.V.abs3, rowAt: [E("abWhere"), E("abNo")] },
    { from: E("lgNo1"), rows: T.V.logic1, rowAt: [E("lgNo1"), E("lgNo2")] },
    { from: E("lg1"), rows: T.V.logic2 },
    { from: E("endIn"), rows: T.V.end1 },
    { from: E("qComment"), rows: T.V.end2 },
    { from: E("next"), rows: T.V.end3, rowAt: [E("next"), E("nAcc")] },
  ]);
export type VerdictNow = { rows: Row[]; rowA: number[]; a: number; big: boolean; key: number };
export const verdictAt = (f: number): VerdictNow | null => {
  const vs = verdicts();
  const cuts = cutAt();
  for (let i = vs.length - 1; i >= 0; i--) {
    const v = vs[i];
    const next = i + 1 < vs.length ? vs[i + 1].from : FRAMES + 99;
    const cut = cuts.find((c) => c > v.from) ?? FRAMES + 99;
    const to = Math.min(next, cut);
    const a = alphaOf(f, v.from, to);
    if (a > 0.002) return { rows: v.rows, rowA: v.rows.map((_, r) => (v.rowAt ? clamp01((f - v.rowAt[r]) / LAYOUT.IN) : 1)), a, big: !!v.big, key: i };
  }
  return null;
};
/** every conclusion with its time on screen (for the layout check) */
export const verdictSpans = () => {
  const vs = verdicts();
  const cuts = cutAt();
  return vs.map((v, i) => {
    const next = i + 1 < vs.length ? vs[i + 1].from : FRAMES + 99;
    const to = Math.min(next, cuts.find((c) => c > v.from) ?? FRAMES + 99);
    return { i, from: v.from, to, rows: v.rows, big: !!v.big };
  });
};

// ================================================================= data labels
type LSpec = {
  id: string;
  from: number;
  to: number;
  /** what the leader points at (may move with the data) */
  at: (f: number, pr: Proj) => Pt;
  /** what the plate is placed against: a fixed point of the set, so the plate stays put while the data moves */
  base?: (f: number, pr: Proj) => Pt;
  /** keep the plate on this side of its anchor when there is a choice */
  prefer?: "left" | "right" | "up" | "down";
  /** which value text (index into [v, ...alt]) at frame f, and live numbers */
  pick?: (f: number) => number;
  fill?: (f: number) => Record<string, string>;
  accent: Accent;
  chip?: boolean;
};
const px = (level: number) => (100 + 0.05 * level).toFixed(2);
const sgn = (x: number) => (x >= 0 ? "+" : "-") + Math.abs(x).toFixed(2);
const lv = (f: number, s: BookState) => ({ p: px(Math.round(s.price * 20) / 20), d: sgn(0.05 * Math.round(s.price * 20) / 20) });
const ABS_GAP = 22;

let lCache: LSpec[] | null = null;
const specs = (): LSpec[] =>
  (lCache ??= (() => {
    const e = E;
    const bookPt = (s: (f: number) => BookState, w: (st: BookState) => [number, number, number]) => (f: number, pr: Proj) => {
      const [x, y, z] = w(s(f));
      return pr(x, y, z);
    };
    const candleTop = (s: (f: number) => BookState) => bookPt(s, (st) => [st.cfg.x + BOOK_CANDLE_DX, ly(Math.max(st.candle.h, st.candle.c)) + 0.06, 0.22]);
    const candleBot = (s: (f: number) => BookState) => bookPt(s, (st) => [st.cfg.x + BOOK_CANDLE_DX, ly(Math.min(st.candle.l, st.candle.c)) - 0.06, 0.22]);
    const W = (x: number, y: number, z = 0.3) => (_f: number, pr: Proj) => pr(x, y, z);
    const C = (ch: Chart) => ({ x: (i: number) => cx(ch, i), y: (p: number) => cy(ch, p) });
    const ch = C(CHASE);
    const th = C(TH);
    const lg = C(LOGIC);
    const wx = cx(CHASE, CH_WALL_I);
    return [
      // Each label lives from its word to the next label's word (or the scene change); at most two at a time.
      // ---------------- hook
      { id: "hYang", from: e("hookYang"), to: e("hAct"), at: W(cx(HOOK, 6), cy(HOOK, 102.9) + 0.08, 0.2), accent: "up" },
      { id: "hYou", from: e("notSlow"), to: e("buyIn"), at: W(cx(HOOK, 6) + 0.2, cy(HOOK, 102.7), 0.2), accent: "ink" },
      { id: "hDelta", from: e("hAct"), to: e("buyIn"), at: W(cx(HOOK, 6) - 0.2, cy(HOOK, 101.6), 0.2), accent: "up" },
      // ---------------- 01 buy
      { id: "bOrder", from: e("aMkt"), to: e("aSpread"), at: (_f, pr) => pr(X.buyA, ly(-0.7), 0.62), accent: "up" },
      { id: "bAsk", from: e("aEat"), to: e("pBuy"), at: W(X.buyA + 0.32, ly(1), 0.4), accent: "up", pick: (f) => (bookBuyA(f).asks[0] < 0.01 ? 1 : 0), fill: (f) => ({ n: String(Math.round(bookBuyA(f).asks[0] * 100)) }) },
      { id: "bSpread", from: e("aSpread"), to: e("aPush"), at: W(X.buyA + TOWER_W + 0.14, ly(0), 0.3), accent: "gold" },
      { id: "bPx", from: e("aPush"), to: e("pBuy"), at: candleTop(bookBuyA), base: W(X.buyA + BOOK_CANDLE_DX, ly(2) + 0.06, 0.22), accent: "gold", fill: (f) => lv(f, bookBuyA(f)) },
      { id: "bQueue", from: e("pBuy") + 14, to: e("pProvide"), at: W(X.buyB + 0.44, ly(-1), 0.4), accent: "ink" },
      { id: "bMine", from: e("pPlace"), to: e("cmp"), at: W(X.buyB + 0.15 + 0.24, ly(-2), 0.84), accent: "ink", pick: (f) => (f >= e("pNoFill") + 8 ? 2 : f >= e("pBetter") ? 1 : 0) },
      { id: "bPxB", from: e("pProvide"), to: e("cmp"), at: candleTop(bookBuyB), base: W(X.buyB + BOOK_CANDLE_DX, ly(1) + 0.06, 0.22), accent: "gold", pick: (f) => (f >= e("pNoFill") + 8 ? 1 : 0), fill: (f) => lv(f, bookBuyB(f)) },
      { id: "bCmpA", prefer: "left", from: e("cmp") + 20, to: e("sellIn"), at: W(X.buyA, ly(3) + 0.25, 0), accent: "up" },
      { id: "bCmpB", prefer: "right", from: e("cmp") + 20, to: e("sellIn"), at: W(X.buyB, ly(3) + 0.25, 0), accent: "gold" },
      // ---------------- 02 sell
      { id: "sOrder", from: e("sAct"), to: e("sDown"), at: (_f, pr) => pr(X.sellA, ly(0.7), 0.62), accent: "down" },
      { id: "sBid", from: e("sHit"), to: e("sPas"), at: W(X.sellA + 0.32, ly(-1), 0.4), accent: "down", pick: (f) => (bookSellA(f).bids[0] < 0.01 ? 1 : 0), fill: (f) => ({ n: String(Math.round(bookSellA(f).bids[0] * 100)) }) },
      { id: "sPx", from: e("sDown"), to: e("sPas"), at: candleBot(bookSellA), base: W(X.sellA + BOOK_CANDLE_DX, ly(-2) - 0.06, 0.22), accent: "gold", fill: (f) => lv(f, bookSellA(f)) },
      { id: "sQueue", from: e("sPas") + 14, to: e("sFill"), at: W(X.sellB + 0.44, ly(1), 0.4), accent: "ink" },
      { id: "sMine", from: e("sPlace"), to: e("keyIn"), at: W(X.sellB + 0.15 + 0.24, ly(2), 0.84), accent: "ink", pick: (f) => (f >= e("sFill") + 30 ? 1 : 0) },
      { id: "sPxB", from: e("sFill"), to: e("keyIn"), at: candleTop(bookSellB), base: W(X.sellB + BOOK_CANDLE_DX, ly(2) + 0.06, 0.22), accent: "gold", fill: (f) => lv(f, bookSellB(f)) },
      { id: "sCmpA", prefer: "left", from: e("keyIn") + 20, to: e("chaseIn"), at: W(X.sellA, ly(3) + 0.25, 0), accent: "down" },
      { id: "sCmpB", prefer: "right", from: e("keyIn") + 20, to: e("chaseIn"), at: W(X.sellB, ly(3) + 0.25, 0), accent: "gold" },
      // ---------------- 03 chase
      { id: "cRange", from: e("chaseIn") + 22, to: e("cYang"), at: W(ch.x(0) - 0.2, ch.y(CHASE_LEVEL), 0.1), accent: "gold" },
      { id: "cYang", from: e("cYang"), to: e("cFade"), at: W(ch.x(5), ch.y(102.6) + 0.08, 0.2), accent: "up" },
      { id: "cVol", from: e("cVol"), to: e("cFade"), at: W(ch.x(5), CHASE.vb + 3.3 * VOL_K, 0.18), accent: "ink" },
      { id: "cDelta", from: e("cFade"), to: e("cBig"), at: W(ch.x(7), CHASE.vb + 0.45 * VOL_K * 1.25 + 0.1, 0.3), accent: "gold" },
      { id: "cHigh", from: e("cNoHigh"), to: e("cBig"), at: W(ch.x(7), ch.y(103.05) + 0.12, 0.3), accent: "ink" },
      { id: "cBig", from: e("cBig") + 8, to: e("cAbs"), at: W(wx, cy(CHASE, CH_WALL.lo) - 0.25, 0.55), accent: "up" },
      { id: "cStuck", from: e("cStuck"), to: e("cYou"), at: W(wx + 0.2, ch.y(102.85), 0.2), accent: "gold" },
      { id: "cWall", from: e("cAbs"), to: e("threeIn"), at: W(wx + 0.7, cy(CHASE, (CH_WALL.lo + CH_WALL.hi) / 2), 0.45), accent: "up" },
      { id: "cYou", from: e("cYou") + 10, to: e("threeIn"), at: W(wx + 0.36, cy(CHASE, CH_WALL.lo) - 0.12, 0.55), accent: "ink" },
      // ---------------- 04 three things
      { id: "tBull", from: e("tColor"), to: e("t1keep"), at: W(th.x(4), th.y(101.3) + 0.08, 0.2), accent: "up" },
      { id: "tBear", from: e("tColor") + 4, to: e("t1keep"), at: W(th.x(6), th.y(100.65) - 0.08, 0.2), accent: "down" },
      { id: "tDelta", from: e("t1keep"), to: e("t2"), at: W(th.x(5), TH.vb + 1.4 * VOL_K * 1.25 + 0.04, 0.2), accent: "up" },
      { id: "tBuy", from: e("t2big"), to: e("t3"), at: W(th.x(5), TH.vb + 1.4 * VOL_K * 1.25 + 0.04, 0.2), accent: "up" },
      { id: "tPush", from: e("t2go"), to: e("t3"), at: W(th.x(5) - 0.31, th.y(101.5), 0.3), accent: "gold" },
      { id: "tNear", from: e("t3a"), to: e("t3c"), at: W((th.x(TH_NEAR[0]) + th.x(TH_NEAR[1])) / 2, th.y(101.95), 0.05), accent: "gold" },
      { id: "tFar", from: e("t3c"), to: e("cav1"), at: W((th.x(TH_FAR[0]) + th.x(TH_FAR[1])) / 2, th.y(104.6), 0.05), accent: "up" },
      { id: "tChase", from: e("cav1"), to: e("absIn"), at: W(th.x(10), th.y(104.4) + 0.08, 0.2), accent: "up" },
      { id: "tCav", from: e("cav2"), to: e("absIn"), at: W(cx(TH, 8.5) + 0.9, cy(TH, THREE_LEVEL) - 0.2, 0.4), accent: "down", pick: (f) => (f >= e("cavBreak") + 8 ? 1 : 0) },
      // ---------------- 05 absorption
      { id: "aWallS", from: e("absIn") + 24, to: e("abBuy"), at: W(X.absorb + 1.0, ly(1), 0.4), accent: "ink" },
      { id: "aWallB", from: e("absIn") + 28, to: e("abBuy"), at: W(X.absorb + 1.0, ly(-1), 0.4), accent: "ink" },
      { id: "aAsk", from: e("abBuy"), to: e("abSell"), at: W(X.absorb + 1.0, ly(1), 0.4), accent: "up", fill: (f) => ({ n: String(220 * hits(f, e("abBuy"))) }) },
      { id: "aPx", from: e("abStill"), to: e("abSell"), at: candleTop(bookAbsorb), base: W(X.absorb + BOOK_CANDLE_DX, ly(1) + 0.06, 0.22), accent: "gold" },
      { id: "aBid", from: e("abSell"), to: e("abWhere"), at: W(X.absorb + 1.0, ly(-1), 0.4), accent: "down", fill: (f) => ({ n: String(220 * hits(f, e("abSell"))) }) },
      { id: "aPx2", from: e("abHold"), to: e("abWhere"), at: candleBot(bookAbsorb), base: W(X.absorb + BOOK_CANDLE_DX, ly(-1) - 0.06, 0.22), accent: "gold" },
      { id: "aUp", prefer: "up", from: e("abWhere") + 8, to: e("logicIn"), at: (f, pr) => arrowTip(f, pr, -1), accent: "up" },
      { id: "aDn", prefer: "down", from: e("abWhere") + 8, to: e("logicIn"), at: (f, pr) => arrowTip(f, pr, 1), accent: "down" },
      // ---------------- 06 logic
      { id: "lLevel", from: e("logicIn") + 22, to: e("lg1"), at: W(lg.x(0) - 0.2, lg.y(LOGIC_LEVEL), 0.1), accent: "gold" },
      { id: "lBreak", from: e("lg1"), to: e("lg3"), at: W(lg.x(3), LOGIC.vb + 1.3 * VOL_K * 1.25 + 0.04, 0.2), accent: "up" },
      { id: "lResp", from: e("lg2"), to: e("lg3"), at: W(lg.x(3) - 0.31, lg.y(101.05), 0.3), accent: "gold" },
      { id: "lFollow", from: e("lg3"), to: e("endIn"), at: W(lg.x(4), lg.y(102.1) + 0.08, 0.2), accent: "up" },
      { id: "lRetest", from: e("lg4"), to: e("endIn"), at: W(cx(LOGIC, 5.5) + 0.75, cy(LOGIC, LOGIC_LEVEL) - 0.17, 0.4), accent: "down" },
      // ---------------- end: the two answers
      { id: "eYang", prefer: "left", from: e("qYang"), to: e("next"), at: W(END_CANDLE.x, END_CANDLE.l - 0.1, 0.45), accent: "gold", chip: true },
      { id: "eAct", prefer: "right", from: e("qAct"), to: e("next"), at: W(END_BOOK_X, -1.7, 0.6), accent: "up", chip: true },
    ] as LSpec[];
  })());
const hits = (f: number, at: number) => [0, 1, 2, 3].filter((k) => f >= at + k * ABS_GAP + 8).length;
const arrowTip = (f: number, pr: Proj, d: -1 | 1) => {
  const m = absorbMid(pr, bookAbsorb(f));
  return { x: m.x, y: m.y + d * 250 };
};

const baseOf = (s: LSpec) => s.base ?? s.at;
const textOf = (s: LSpec, f: number, short = false) => {
  const L: Lbl = T.L[s.id];
  const vs = [L.v, ...(L.alt ?? [])];
  let k = short && L.s ? L.s[0] : L.k;
  let v = short && L.s ? L.s[1] : vs[Math.min(vs.length - 1, s.pick?.(f) ?? 0)];
  const fl = s.fill?.(f) ?? {};
  for (const [a, b] of Object.entries(fl)) {
    v = v.replace(`{${a}}`, b);
    k = k.replace(`{${a}}`, b);
  }
  return { k, v };
};
const sizeOf = (s: LSpec, k: string, v: string) => (s.chip ? chipSize(k, v) : labelSize(k, v));

type Placed = { spec: LSpec; dx: number; dy: number; w: number; h: number; short: boolean };
export type Dropped = { id: string; reason: string };
let placedCache: { placed: Map<string, Placed>; dropped: Dropped[] } | null = null;

/** frames at which a label's spot must be valid */
const samplesOf = (s: LSpec) => {
  const [a, b] = visibleSpan(s.from, s.to);
  const out = new Set<number>();
  for (const t of [a + 1, a + LAYOUT.IN, (a + b) / 2, b - 2]) out.add(Math.round(Math.min(b - 1, Math.max(a + 1, t))));
  for (let t = a + 1; t < b - 1; t += 1) out.add(Math.round(t));
  for (let t = a + 1; t < Math.min(b - 1, a + 16); t += 2) out.add(Math.round(t));
  return [...out].sort((x, y) => x - y);
};

const DEBUG = typeof process !== "undefined" ? process.env?.AP_LAYOUT_DEBUG : undefined;
const reasons: Record<string, number> = {};
const solve = () => {
  const placed = new Map<string, Placed>();
  const dropped: Dropped[] = [];
  const all = [...specs()].sort((a, b) => a.from - b.from);
  const ctx = new Map<number, { pr: Proj; boxes: Rect[] }>();
  const at = (t: number) => {
    let c = ctx.get(t);
    if (!c) {
      const pr = projector(t);
      c = { pr, boxes: dataBoxes(t, pr).map((b) => inflate(b.r, LAYOUT.pad)) };
      ctx.set(t, c);
    }
    return c;
  };
  const rectAt = (p: Placed, t: number) => {
    const a = baseOf(p.spec)(t, at(t).pr);
    return { x: a.x + p.dx, y: a.y + p.dy, w: p.w, h: p.h };
  };
  for (const s of all) {
    const ts = samplesOf(s);
    const [va, vb] = visibleSpan(s.from, s.to);
    const others = [...placed.values()].filter((p) => {
      const [oa, ob] = visibleSpan(p.spec.from, p.spec.to);
      return oa < vb && va < ob;
    });
    let done = false;
    // closest first: the full text right beside its object, then the short text there, and only then further out
    const tiers: [boolean, number][] = [[false, 150], [false, 240], [true, 150], [true, 240], [false, 560], [true, 560]];
    for (const [short, maxLen] of tiers) {
      if (short && !T.L[s.id].s) continue;
      const size = ts.map((t) => {
        const { k, v } = textOf(s, t, short);
        return sizeOf(s, k, v);
      });
      const w = Math.max(...size.map((z) => z.w));
      const h = Math.max(...size.map((z) => z.h));
      const a0 = s.at(ts[0], at(ts[0]).pr);
      const b0 = baseOf(s)(ts[0], at(ts[0]).pr);
      // leaders should not cut across other data: boxes that do not hold the anchor itself cost extra
      const crossable = at(ts[0]).boxes.filter((b) => !(a0.x >= b.x && a0.x <= b.x + b.w && a0.y >= b.y && a0.y <= b.y + b.h));
      // where the other label on screen sits: never line up on the same row as it
      const rows = others.map((o) => rectAt(o, ts[0])).map((r) => r.y + r.h / 2);
      const cands: { dx: number; dy: number; score: number }[] = [];
      for (let x = DATA.x; x <= DATA.x + DATA.w - w; x += 10)
        for (let y = DATA.y; y <= DATA.y + DATA.h - h; y += 8) {
          const r = { x, y, w, h };
          const n = nearest(r, a0);
          const len = Math.hypot(n.x - a0.x, n.y - a0.y);
          if (len < 16 || len > maxLen) continue;
          const side = 0;
          const row = rows.some((ry) => Math.abs(ry - (y + h / 2)) < h * 0.8) ? 160 : 0;
          const mx = x + w / 2 - a0.x;
          const my = y + h / 2 - a0.y;
          const pref = s.prefer === "left" ? (mx < -40 ? 0 : 400) : s.prefer === "right" ? (mx > 40 ? 0 : 400) : s.prefer === "up" ? (my < 0 ? 0 : 400) : s.prefer === "down" ? (my > 0 ? 0 : 400) : 0;
          const cross = crossable.reduce((k, b) => k + (segHits(a0, n, b) ? 1 : 0), 0);
          cands.push({ dx: x - b0.x, dy: y - b0.y, score: len + side + pref + row + 220 * cross });
        }
      cands.sort((p, q) => p.score - q.score);
      for (const c of cands) {
        const why = (m: string) => (DEBUG === s.id && (reasons[m] = (reasons[m] ?? 0) + 1), false);
        const ok = ts.every((t) => {
          const { pr, boxes } = at(t);
          const a = s.at(t, pr);
          const bb = baseOf(s)(t, pr);
          const r = { x: bb.x + c.dx, y: bb.y + c.dy, w, h };
          if (!inside(r, DATA)) return why(`zone@${t}`);
          if (a.x < DATA.x || a.x > DATA.x + DATA.w || a.y < DATA.y || a.y > DATA.y + DATA.h) return why(`anchor outside@${t}`);
          if (boxes.some((b) => overlaps(r, b))) return why(`data@${t}`);
          const n = nearest(r, a);
          if (Math.hypot(n.x - a.x, n.y - a.y) < 12) return why(`on anchor@${t}`);
          for (const o of others) {
            const [oa, ob] = visibleSpan(o.spec.from, o.spec.to);
            if (t < oa || t >= ob) continue;
            const orc = rectAt(o, t);
            if (overlaps(inflate(r, LAYOUT.gap), orc)) return why(`label ${o.spec.id}@${t}`);
            if (segHits(a, n, inflate(orc, 4))) return why(`leader into ${o.spec.id}@${t}`);
            const oa2 = o.spec.at(t, pr);
            if (segHits(oa2, nearest(orc, oa2), inflate(r, 4))) return why(`${o.spec.id} leader@${t}`);
          }
          return true;
        });
        if (ok) {
          placed.set(s.id, { spec: s, dx: c.dx, dy: c.dy, w, h, short });
          done = true;
          break;
        }
      }
      if (done) break;
    }
    if (!done) dropped.push({ id: s.id, reason: "no free spot in the data zone for the full or the short text" + (DEBUG === s.id ? " " + JSON.stringify(reasons) : "") });
  }
  return { placed, dropped };
};
const solved = () => (placedCache ??= solve());

export type LabelNow = { id: string; k: string; v: string; accent: Accent; chip: boolean; a: number; rect: Rect; anchor: Pt; short: boolean };
export const labelsAt = (f: number, pr: Proj = projector(f)): LabelNow[] => {
  const { placed } = solved();
  const out: LabelNow[] = [];
  for (const p of placed.values()) {
    const a = alphaOf(f, p.spec.from, p.spec.to);
    if (a <= 0.002) continue;
    const anchor = p.spec.at(f, pr);
    const b = baseOf(p.spec)(f, pr);
    const { k, v } = textOf(p.spec, f, p.short);
    out.push({ id: p.spec.id, k, v, accent: p.spec.accent, chip: !!p.spec.chip, a, rect: { x: b.x + p.dx, y: b.y + p.dy, w: p.w, h: p.h }, anchor, short: p.short });
  }
  return out;
};
export const droppedLabels = () => solved().dropped;
export const labelSpans = () => specs().map((s) => ({ id: s.id, from: s.from, to: s.to, span: visibleSpan(s.from, s.to) }));

// ================================================================= status bar
export type StatusNow = { n: string; name: string; steps: string[]; step: number; progress: number; marks: number[] };
export const statusAt = (f: number): StatusNow => {
  const sec = sections.find((s) => f >= s.from && f < s.to) ?? sections[sections.length - 1];
  const head = T.head[sec.id];
  const n = head ? head[0] : "";
  const name = head ? head[1] : sec.id === "hook" ? T.hookName : T.endName;
  let steps: string[] = [];
  let step = -1;
  if (sec.id === "three") {
    steps = T.steps3;
    step = [E("t1"), E("t2"), E("t3")].filter((t) => f >= t).length - 1;
  }
  if (sec.id === "logic") {
    steps = T.steps4;
    step = [E("lg1"), E("lg2"), E("lg3"), E("lg4")].filter((t) => f >= t).length - 1;
  }
  return { n, name, steps, step, progress: clamp01(f / Math.max(1, FRAMES - 1)), marks: sections.slice(1).map((s) => s.from / FRAMES) };
};
