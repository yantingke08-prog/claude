// Terminal-native tags: a label and a number at most ("POC 5012", "成交 4,224 手", "Delta −520 −180 +260"), set right
// beside the object it is about — a candle's top or bottom, a volume column's top, the tip of a profile brick, the
// right end of a POC line, a row of the order book — never more than GAP px away, in that object's colour, with no
// plate, box, leader line or dot. Several may share a shot; the captions do the explaining. Pure functions of the
// frame: hud.tsx draws them, scripts/poc-layout.mjs measures each one against every candle, volume column, profile
// brick and order-book row on screen, and against the other tags.
import { live, printed, rowsAt, type LiveBar } from "./acts";
import { E, clamp01, win } from "./cue";
import { A, A_HOOK, B, C, C_DELTA, C_TEST, NUM, W, W_DROP, YS, cx, cy, prof, rowLen, valueArea, vy, type Day } from "./data";
import { presence, projector, type Proj } from "./director";
import { DOM_ROWS, DOM_W, DOM_X, askAt, bidAt, dom, lineState } from "./lines";
import { COL } from "./palette";
import { T } from "./text";

export const GAP = 12;
export type Side = "above" | "below" | "right" | "left";
export type Tag = { id: string; k: string; v?: string; color: string; d: Day; wx: number; wy: number; side: Side; a: number; size: number; quiet?: boolean; align?: "start" };
export type Placed = Tag & { x0: number; y0: number; w: number; h: number; ax: number; ay: number };

const n = (x: number) => Math.round(x).toLocaleString("en-US");
const sg = (x: number) => (x >= 0 ? `+${x}` : `−${Math.abs(x)}`);

/** text width estimate (CJK = 1 em, digits / Latin in the mono font = 0.6 em) */
export const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 || "−×→↑·–".includes(ch) ? 0.6 : 1) * size, 0);
export const tagBox = (t: Tag) => {
  const vs = t.quiet ? 0.86 : 1;
  const w = textW(t.k, t.size) + (t.v ? 0.3 * t.size + textW(t.v, t.size * vs) : 0);
  return { w: Math.ceil(w) + 4, h: Math.ceil(t.size * 1.22) };
};
const SAFE_X0 = 48;
const SAFE_X1 = 1392;
export const place = (t: Tag, pr: Proj): Placed => {
  const p = pr(t.wx, t.wy, 0.2);
  const { w, h } = tagBox(t);
  let x0 = 0;
  let y0 = 0;
  if (t.side === "above") [x0, y0] = [p.x - w / 2, p.y - GAP - h];
  if (t.side === "below") [x0, y0] = [p.x - w / 2, p.y + GAP];
  if (t.side === "right") [x0, y0] = [p.x + GAP, p.y - h / 2];
  if (t.side === "left") [x0, y0] = [p.x - GAP - w, p.y - h / 2];
  if ((t.side === "above" || t.side === "below") && t.align === "start") x0 = p.x - 4;
  if (t.side === "above" || t.side === "below") x0 = Math.min(SAFE_X1 - w, Math.max(SAFE_X0, x0));
  const off = p.x < 0 || p.x > 1440 || p.y < 0 || p.y > 2560;
  return { ...t, a: off ? 0 : t.a, x0, y0, w, h, ax: p.x, ay: p.y };
};

// ---------------------------------------------------------------- anchors
const top = (d: Day, bars: LiveBar[], i: number) => ({ wx: cx(d, i), wy: cy(d, bars[i].h) + 0.03 });
const bottom = (d: Day, bars: LiveBar[], i: number) => ({ wx: cx(d, i), wy: cy(d, bars[i].l) - 0.03 });
const volTop = (d: Day, i: number) => ({ wx: cx(d, i), wy: vy(d, d.bars[i].v) + 0.03 });
const volFloor = (d: Day, i0: number, i1: number) => ({ wx: (cx(d, i0) + cx(d, i1)) / 2, wy: d.vb - 0.04 });
/** the tip of the brick at price p (at frame f) */
const brick = (d: Day, f: number, p: number) => ({ wx: d.px + rowLen(rowsAt(d, f).rows.get(p) ?? 0) + 0.04, wy: cy(d, p) });
const lineEnd = (f: number, id: string) => {
  const s = lineState(f).find((l) => l.id === id);
  return s ? { wx: s.x1 + 0.06, wy: s.y } : { wx: 0, wy: -999 };
};

type Spec = Omit<Tag, "a" | "size"> & { from: number; to: number; size?: number; fi?: number; fo?: number };
const S = (f: number, size: number, specs: Spec[]): Tag[] =>
  specs.map(({ from, to, fi = 8, fo = 8, ...t }) => ({ ...t, size: t.size ?? size, a: win(f, from, to, fi, fo) })).filter((t) => t.a > 0.002);
const count = (f: number, f0: number, f1: number, a: number, b: number) => a + (b - a) * clamp01((f - f0) / Math.max(1, f1 - f0));

const aVa = valueArea(prof(A, A_HOOK));
const aPocV = prof(A, A_HOOK).pocV;
const bRatio = (B.bars.slice(6, 10).reduce((s, b) => s + b.v, 0) / 4 / (B.bars.slice(0, 6).reduce((s, b) => s + b.v, 0) / 6)).toFixed(1);
const cStop = Math.min(...C.bars.slice(C_TEST, C_TEST + 3).map((b) => b.l)) - 1;
const cEntry = C.bars[C_TEST + 3].o;
const wLvnTip = (f: number) => {
  const r = rowsAt(W, f).rows;
  let m = 0;
  for (let p = NUM.wLvn[0]; p <= NUM.wLvn[1]; p++) m = Math.max(m, r.get(p) ?? 0);
  return { wx: W.px + rowLen(m) + 0.05, wy: cy(W, (NUM.wLvn[0] + NUM.wLvn[1]) / 2) };
};
export const TAGNUM = { bRatio, cStop, cEntry };
/** entry / stop lines run to just past the longest profile brick between them, so their price tags sit clear of it */
export const levelEnd = (f: number) => {
  const r = rowsAt(C, f).rows;
  let m = 0;
  for (let p = cStop; p <= cEntry; p++) m = Math.max(m, r.get(p) ?? 0);
  return Math.max(cx(C, C.bars.length - 1) + 0.6, C.px + rowLen(m) + 0.1);
};

export const tagsAt = (f: number): Tag[] => {
  const pres = presence(f);
  const out: Tag[] = [];
  const aBars = live(A, f);

  // ---------------- day one: the line, the profile, the magnet, the deviation
  if (pres.A > 0.002 && f < E("u1In")) {
    // one price-axis tag on the line's right end; its words follow the voice
    const aK = f < E("pPoc") ? T.tPoc : f < E("pFair") ? T.tPoc : f < E("yVolN") ? T.tFair : f < E("aIn") ? T.tHand : f < E("aFill2") ? T.tPoc : T.tFill;
    const live5012 = rowsAt(A, f).rows.get(NUM.aPoc) ?? 0;
    const aV = f < E("pPoc") ? undefined : f < E("yVolN") ? String(NUM.aPoc) : f < E("aIn") ? `${n(aPocV)} 手` : f < E("aFill2") ? String(NUM.aPoc) : `+${n(Math.max(0, live5012 - aPocV))}`;
    const aLast = Math.max(0, Math.ceil(printed(A, f)) - 1);
    out.push(
      ...S(f, 50, [
        { id: "aLine", k: aK, v: aV, color: COL.gold, d: A, ...lineEnd(f, "a"), side: "right", from: E("wPoc"), to: E("mIn") + 10 },
        { id: "aVa", k: T.tVa, v: `${aVa.lo}–${aVa.hi}`, color: COL.ice, d: A, wx: cx(A, A_HOOK - 1) + 0.4, wy: cy(A, aVa.hi) + YS / 2 + 0.05, side: "right", size: 44, from: E("wVa"), to: E("pBuild") },
        { id: "aDist", k: T.tDist, color: COL.warm, d: A, wx: A.px + 0.1, wy: cy(A, 5023) + 0.15, side: "above", align: "start", size: 42, quiet: true, from: E("pDist"), to: E("yIn") },
        // why: how many bars touched the POC, counting up
        { id: "aStay", k: T.tStay, v: `${Math.round(count(f, E("yStay"), E("yCount"), 0, NUM.aTouch))}/${NUM.aBars} 根`, color: COL.gold, d: A, wx: cx(A, 9), wy: cy(A, 5023) + 0.1, side: "above", from: E("yStay"), to: E("yVol") + 30 },
        { id: "aThin", k: T.tThin, v: `${n(prof(A, A_HOOK).rows.get(5021) ?? 0)} 手`, color: COL.ice, d: A, ...brick(A, f, 5021), side: "right", size: 44, from: E("yThin"), to: E("aIn") },
        // the deviation
        { id: "aDev", k: T.tDev, v: `+${NUM.aDev}`, color: COL.warm, d: A, wx: cx(A, A_HOOK + 3), wy: cy(A, NUM.aTop) + 0.05, side: "above", size: 46, from: E("aDev") - 4, to: E("aFill") },
        { id: "aTop", k: T.tThin, v: `${n(prof(A).rows.get(NUM.aTop) ?? 0)} 手`, color: COL.ice, d: A, ...brick(A, f, NUM.aTop), side: "right", size: 44, from: E("aNone"), to: E("mIn") },
        { id: "aBack", k: T.tBack, v: String(NUM.aBack), color: COL.gold, d: A, ...bottom(A, aBars, A_HOOK + 6), side: "below", size: 46, from: E("aBackP") + 4, to: E("aFill") + 4 },
      ]),
    );
    void aLast;
  }

  // ---------------- day two: breakout, the POC moves up
  if (pres.B > 0.002 && f < E("u1In")) {
    const bp = lineState(f).find((l) => l.id === "b")?.price ?? NUM.bPocs[0];
    const bK = f < E("mMig") ? T.tPoc : f < E("mTrend") ? T.tMig : T.tTrend;
    const bV = f < E("mMig") ? String(Math.round(bp)) : f < E("mTrend") ? `+${NUM.bPocs[1] - NUM.bPocs[0]}` : "↑";
    out.push(
      ...S(f, 50, [
        { id: "bVol", k: T.tBreak, v: `×${bRatio}`, color: COL.gold, d: B, ...volFloor(B, 6, 9), side: "below", size: 46, from: E("mBreak"), to: E("mPile") },
        { id: "bLine", k: bK, v: bV, color: COL.gold, d: B, ...lineEnd(f, "b"), side: "right", from: E("mPile"), to: E("u1In") },
        { id: "aOld", k: T.tOldPoc, v: String(NUM.aPoc), color: COL.warm, d: A, wx: cx(B, 22), wy: cy(B, NUM.aPoc) - 0.06, side: "below", size: 44, quiet: true, from: E("mOld"), to: E("u1In") },
      ]),
    );
  }

  // ---------------- five days: the staircase, above / below
  if (pres.ctx > 0.002) {
    const cb = live(C, f);
    const cl = Math.max(0, Math.ceil(printed(C, f)) - 1);
    out.push(
      ...S(f, 46, [
        { id: "fStair", k: "POC ↑", v: `${NUM.dPocs[2]}→${NUM.dPocs[4]}`, color: COL.gold, d: B, ...lineEnd(f, "b"), side: "right", from: E("u1Up"), to: E("u2In") },
        { id: "fAbove", k: T.tAbove, color: COL.up, d: C, wx: cx(C, Math.max(0, cl - 3)), wy: cy(C, Math.max(...cb.slice(0, cl + 1).map((b) => b.h))) + 0.1, side: "above", from: E("u1Above"), to: E("u2In") },
        { id: "fBelow", k: T.tBelow, color: COL.down, d: C, wx: cx(C, 1), wy: cy(C, NUM.bPoc) - 2.2, side: "below", align: "start", from: E("u1Below"), to: E("u2In") },
      ]),
    );
  }

  // ---------------- day three: two targets, the test of the prior POC, the order book, entry and stop
  if (pres.C > 0.002 && f >= E("u2In")) {
    const dm = dom(f);
    const delta = [E("e1"), E("e2"), E("e3")].filter((t) => f >= t).map((_, i) => sg(C_DELTA[i]));
    const row = (p: number) => cy(C, p);
    out.push(
      ...S(f, 48, [
        { id: "cPrior", k: T.tPrior, v: String(NUM.cPrior), color: COL.gold, d: C, ...lineEnd(f, "b"), side: "right", from: E("u2Prior"), to: E("u3Near") },
        { id: "cToday", k: T.tToday, v: String(NUM.cPoc), color: COL.gold, d: C, ...lineEnd(f, "c"), side: "right", from: E("u2Today"), to: E("u3Near") },
        { id: "cNoOrder", k: T.tNoOrder, color: COL.warm, d: C, wx: dm.x + 0.12, wy: row(NUM.cPrior), side: "right", size: 44, from: E("u3NoOrder"), to: E("e0") },
        { id: "cAbsorb", k: T.tAbsorb, v: String(NUM.cLow), color: COL.gold, d: C, ...bottom(C, live(C, f), C_TEST), side: "below", align: "start", size: 44, from: E("e1"), to: E("dIn") },
        { id: "cDelta", k: "Delta", v: delta.join(" "), color: COL.warm, d: C, ...volFloor(C, C_TEST, C_TEST + 2), side: "below", size: 44, from: E("e1"), to: E("go") },
        { id: "cBid", k: T.tBidFill, v: `${bidAt(f, NUM.cPrior)}`, color: COL.up, d: C, wx: dm.x + 0.12, wy: row(NUM.cPrior), side: "right", size: 44, from: E("dBid"), to: E("go") },
        { id: "cAsk", k: T.tAskPull, v: `260→${askAt(f, 5035)}`, color: COL.down, d: C, wx: dm.x + 0.05 + (dm.rows.find((r) => r.p === 5035)?.askL ?? 0) + 0.04, wy: row(5035), side: "right", size: 44, from: E("dAsk"), to: E("go") },
        { id: "cEntry", k: T.tEntry, v: String(cEntry), color: COL.up, d: C, wx: levelEnd(f) + 0.06, wy: row(cEntry), side: "right", size: 46, from: E("go") + 12, to: E("xIn") },
        { id: "cStop", k: T.tStop, v: String(cStop), color: COL.down, d: C, wx: levelEnd(f) + 0.06, wy: row(cStop), side: "right", size: 46, from: E("goStop"), to: E("xIn") },
        { id: "cTarget", k: T.tTarget, v: String(NUM.cPoc), color: COL.gold, d: C, ...lineEnd(f, "c"), side: "right", size: 46, from: E("goStop") + 10, to: E("xIn") },
      ]),
    );
  }

  // ---------------- W: through the POC, through the LVN
  if (pres.W > 0.002) {
    const wb = live(W, f);
    out.push(
      ...S(f, 48, [
        { id: "wPoc", k: T.tPoc, v: String(NUM.wPoc), color: COL.gold, d: W, ...lineEnd(f, "w"), side: "right", from: E("xIn") + 8, to: E("zIn") },
        { id: "wThru", k: T.tThru, v: String(NUM.wPoc), color: COL.warm, d: W, ...bottom(W, wb, W_DROP), side: "below", size: 44, from: E("xThru") + 6, to: E("xLvn") + 20 },
        { id: "wLvn", k: T.tLvn, v: `${NUM.wLvn[0]}–${NUM.wLvn[1]}`, color: COL.ice, d: W, ...wLvnTip(f), side: "right", from: E("xLvn"), to: E("zIn") },
        { id: "wDense", k: T.tDense, v: String(NUM.wHvn), color: COL.warm, d: W, ...brick(W, f, NUM.wHvn), side: "right", size: 44, from: E("xDense"), to: E("zIn") },
      ]),
    );
  }
  const quiet = (id: string, a0: number, a1: number) => out.forEach((t) => t.id === id && (t.a *= 1 - win(f, a0, a1, 4, 6)));
  quiet("aLine", E("pBuild"), E("pBuild") + 56);
  quiet("bLine", E("mMove"), E("mMove") + 30);
  return out.map((t) => ({ ...t, a: t.a * (t.d === W ? pres.W : t.d === C ? pres.C : t.d === B ? pres.B : pres.A) }));
};

/** a tag's alpha at frame f (0 when it is not up): world.tsx draws a tag's mark (a distance line, entry, stop) with exactly this */
export const markA = (f: number, ...ids: string[]) => {
  const ts = tagsAt(f);
  return Math.max(0, ...ids.map((id) => ts.find((t) => t.id === id)?.a ?? 0));
};
export const placedAt = (f: number): Placed[] => {
  const pr = projector(f);
  return tagsAt(f).map((t) => place(t, pr));
};

/** every candle (wick to wick), volume column, profile brick and order-book row on screen at frame f, for the layout check */
export const objectsAt = (f: number) => {
  const pr = projector(f);
  const pres = presence(f);
  const rects: { name: string; x0: number; x1: number; y0: number; y1: number }[] = [];
  const r = (x0: number, x1: number, y0: number, y1: number, nm: string, z = 0.2) => {
    const a = pr(x0, y1, z);
    const c = pr(x1, y0, z);
    const a2 = pr(x0, y1, -z);
    const c2 = pr(x1, y0, -z);
    rects.push({ name: nm, x0: Math.min(a.x, a2.x), x1: Math.max(c.x, c2.x), y0: Math.min(a.y, a2.y), y1: Math.max(c.y, c2.y) });
  };
  const add = (d: Day, op: number, vol: boolean) => {
    if (op <= 0.05) return;
    live(d, f).forEach((b, i) => {
      if (b.g <= 0) return;
      const hw = d.xs * 0.32;
      r(cx(d, i) - hw, cx(d, i) + hw, cy(d, b.l), cy(d, b.h), `${d.id}${i}`);
      if (vol) r(cx(d, i) - d.xs * 0.3, cx(d, i) + d.xs * 0.3, d.vb, vy(d, b.v), `${d.id}v${i}`);
    });
    const rw = rowsAt(d, f);
    const domOp = d === C ? dom(f).op : 0;
    if (rw.n > 0.01 && domOp < 0.5) rw.rows.forEach((v, p) => rowLen(v) > 0.015 && r(d.px, d.px + rowLen(v), cy(d, p) - YS * 0.39, cy(d, p) + YS * 0.39, `${d.id}p${p}`));
  };
  const vol = pres.vol > 0.5;
  add(A, pres.A, vol);
  add(B, pres.B, vol);
  add(C, pres.C, vol);
  add(W, pres.W, true);
  const dm = dom(f);
  if (dm.op > 0.3)
    dm.rows.forEach((row) => {
      if (row.bid > 1) r(dm.x - 0.05 - row.bidL, dm.x - 0.05, cy(C, row.p) - YS * 0.36, cy(C, row.p) + YS * 0.36, `dom-b${row.p}`);
      if (row.ask > 1) r(dm.x + 0.05, dm.x + 0.05 + row.askL, cy(C, row.p) - YS * 0.36, cy(C, row.p) + YS * 0.36, `dom-a${row.p}`);
    });
  void DOM_ROWS;
  void DOM_W;
  void DOM_X;
  return rects;
};
