// Terminal-native tags (v4). A tag is at most two short units — a label and a number ("放量 ×2.3", "守 11.38") —
// set right beside the object it is about (a candle's top or bottom, a volume column's top or the volume floor, the
// end of a key line), never more than GAP px away, in that object's colour, with no plate, box, leader line or dot.
// One main tag at a time (plus at most one quieter number), and the captions do the explaining, so a tag never
// repeats a sentence. Pure functions of the frame: hud.tsx draws them, scripts/volnorise4-layout.mjs measures every
// one against every candle and volume column on screen.
import { aBars, bBars, hookBars, type LiveBar } from "./acts";
import { E, clamp01, win } from "./cue";
import { A, A_H, A_LEVEL, B_H, B_LEVEL, Bc, HOOK, HOOK_H, box, cx, cy, vy, type Chart } from "./data";
import { presence, projector, type Proj } from "./director";
import { T } from "./text";
import { COL } from "./palette";

export const GAP = 12;
export type Side = "above" | "below" | "right" | "left";
export type Tag = {
  id: string;
  k: string; // label (Chinese, bold)
  v?: string; // value (digits)
  color: string;
  ch: Chart;
  wx: number; // world anchor: the edge of the object the tag sits against
  wy: number;
  side: Side;
  a: number;
  size: number;
  /** a quiet secondary number: smaller and dimmer */
  quiet?: boolean;
  /** above / below only: start the tag at the anchor instead of centring it on the anchor */
  align?: "start";
};
export type Placed = Tag & { x0: number; y0: number; w: number; h: number; ax: number; ay: number };

// ---------------------------------------------------------------- numbers taken from the data
const avg5 = (ch: Chart, i: number) => ch.bars.slice(i - 5, i).reduce((s, b) => s + b.v, 0) / 5;
const times = (ch: Chart, i: number, ref = avg5(ch, i)) => `×${(ch.bars[i].v / ref).toFixed(1)}`;
const p2 = (p: number) => p.toFixed(2);
const chg = (ch: Chart, i: number) => {
  const d = ((ch.bars[i].c - ch.bars[i - 1].c) / ch.bars[i - 1].c) * 100;
  return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}%`;
};
const hb = HOOK.bars[HOOK_H];
const bRef = avg5(Bc, B_H);
export const NUM = {
  hookX: times(HOOK, HOOK_H),
  hookChg: chg(HOOK, HOOK_H),
  hookHi: p2(hb.h),
  hookChase: p2(hb.h - (hb.h - Math.max(hb.o, hb.c)) * 0.2),
  aX: times(A, A_H),
  aLevel: p2(A_LEVEL),
  bX: times(Bc, B_H),
  bDropX: times(Bc, B_H + 1, bRef),
  bLevel: p2(B_LEVEL),
  bLow: p2(Math.min(...Bc.bars.map((b) => b.l))),
  aBack: p2(A.bars[A.bars.length - 1].c),
  stop: p2(A.bars[A_H + 5].l - 0.06),
};

/** text width estimate (CJK = 1 em, digits / Latin ~0.6 em in Space Grotesk) */
export const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 || ch === "−" || ch === "×" ? 0.6 : 1) * size, 0);
export const tagBox = (t: Tag) => {
  const vs = t.quiet ? 0.86 : 1;
  const w = textW(t.k, t.size) + (t.v ? 0.3 * t.size + textW(t.v, t.size * vs) : 0);
  return { w: Math.ceil(w) + 4, h: Math.ceil(t.size * 1.22) };
};

const SAFE_X0 = 48;
const SAFE_X1 = 1392;
export const place = (t: Tag, pr: Proj): Placed => {
  const p = pr(t.wx, t.wy, 0.12);
  const { w, h } = tagBox(t);
  let x0 = 0;
  let y0 = 0;
  if (t.side === "above") [x0, y0] = [p.x - w / 2, p.y - GAP - h];
  if (t.side === "below") [x0, y0] = [p.x - w / 2, p.y + GAP];
  if (t.side === "right") [x0, y0] = [p.x + GAP, p.y - h / 2];
  if (t.side === "left") [x0, y0] = [p.x - GAP - w, p.y - h / 2];
  if ((t.side === "above" || t.side === "below") && t.align === "start") x0 = p.x - 4;
  if (t.side === "above" || t.side === "below") x0 = Math.min(SAFE_X1 - w, Math.max(SAFE_X0, x0));
  // a tag whose object is not on screen (mid camera move) is not shown: it must never float free
  const off = p.x < 0 || p.x > 1440 || p.y < 0 || p.y > 2560;
  return { ...t, a: off ? 0 : t.a, x0, y0, w, h, ax: p.x, ay: p.y };
};

// ---------------------------------------------------------------- anchors
const top = (ch: Chart, b: LiveBar | undefined, i: number) => ({ wx: cx(ch, i), wy: cy(ch, b ? b.h : ch.bars[i].h) + 0.02 });
const bottom = (ch: Chart, i: number) => ({ wx: cx(ch, i), wy: cy(ch, ch.bars[i].l) - 0.02 });
const volTop = (ch: Chart, i: number) => ({ wx: cx(ch, i), wy: vy(ch, ch.bars[i].v) + 0.02 });
const volFloor = (ch: Chart, i0: number, i1: number) => ({ wx: (cx(ch, i0) + cx(ch, i1)) / 2, wy: ch.vb - 0.03 });
const bodyRight = (ch: Chart, i: number, p: number) => ({ wx: cx(ch, i) + ch.xs * 0.31 + 0.01, wy: cy(ch, p) });
/** under the volume floor at the chart's left edge: the chart's name, like a terminal's symbol header */
const chartFoot = (ch: Chart) => ({ wx: box(ch).x0 + 0.05, wy: ch.vb - 0.03 });
/** the right end of a key line (Level x1 in world.tsx): a price-axis label */
const lineEnd = (ch: Chart, p: number) => ({ wx: cx(ch, ch.bars.length - 1) + 0.3, wy: cy(ch, p) });
/** above the last printed bar, clear of the bars just before it (they can be higher while it prints) */
const lastTop = (ch: Chart, bars: LiveBar[], last: number) => ({ wx: cx(ch, last), wy: cy(ch, Math.max(...bars.slice(Math.max(0, last - 2), last + 1).map((b) => (b.g > 0 ? b.h : -1e9)))) + 0.02 });

type Spec = Omit<Tag, "a" | "size"> & { from: number; to: number; size?: number; fi?: number; fo?: number };
const S = (f: number, size: number, specs: Spec[]): Tag[] =>
  specs
    .map(({ from, to, fi = 8, fo = 8, ...t }) => ({ ...t, size: t.size ?? size, a: win(f, from, to, fi, fo) }))
    .filter((t) => t.a > 0.002);

/** count a number from a to b between frames f0 and f1 */
const count = (f: number, f0: number, f1: number, a: number, b: number, dp = 1) => (a + (b - a) * clamp01((f - f0) / Math.max(1, f1 - f0))).toFixed(dp);

export const tagsAt = (f: number): Tag[] => {
  const pres = presence(f);
  const out: Tag[] = [];
  // ---- hook (wide): the heavy candle's volume, as soon as the voice says 放量; it stays through the countdown
  if (f < E("pIn")) {
    out.push(
      ...S(f, 52, [
        { id: "hookVol", k: T.tVol, v: NUM.hookX, color: COL.gold, ch: HOOK, ...volTop(HOOK, HOOK_H), side: "above", from: E("hHi") + 4, to: E("wFlat") },
        // why (close-up): close barely up, the sellers' ceiling, where a chaser buys
        { id: "whyClose", k: T.tClose, v: NUM.hookChg, color: COL.up, ch: HOOK, ...bodyRight(HOOK, HOOK_H, hb.c), side: "right", from: E("wFlat"), to: E("wCeil") + 8 },
        { id: "whyHigh", k: T.tSell, v: NUM.hookHi, color: COL.gold, ch: HOOK, wx: cx(HOOK, HOOK_H) + 0.9, wy: cy(HOOK, hb.h) + 0.03, side: "right", from: E("wCeil") + 8, to: E("wTop") },
        { id: "whyChase", k: T.tChase, v: NUM.hookChase, color: COL.warm, ch: HOOK, ...bodyRight(HOOK, HOOK_H, (hb.h + Math.max(hb.o, hb.c)) / 2), side: "right", from: E("wTop") + 4, to: E("pIn") },
      ]),
    );
  }
  if (pres.ab <= 0.002) return out.map((t) => ({ ...t, a: t.a * pres.hook }));

  const ab = aBars(f);
  const bb = bBars(f);
  const aLast = ab.reduce((k, b, i) => (b.g > 0 ? i : k), 0);
  const bLast = bb.reduce((k, b, i) => (b.g > 0 ? i : k), 0);
  const close = f >= E("lIn") && f < E("sIn"); // the close-ups: bigger tags
  const sz = close ? 52 : 44;
  const axis = 46; // price-axis labels at a line's right end

  // ---- the chart names (a terminal's symbol header, at each chart's top-left corner)
  const aName = win(f, E("pLow"), E("gIn"), 10, 8) + win(f, E("sIn") + 30, E("eIn"), 10, 10);
  const bName = win(f, E("pHigh"), E("lIn"), 10, 8) + win(f, E("gIn") + 30, E("eIn"), 10, 10);
  if (aName > 0.002) out.push({ id: "aName", k: T.nameA, color: COL.warm, ch: A, ...chartFoot(A), side: "below", align: "start", a: clamp01(aName), size: 40, quiet: true });
  if (bName > 0.002) out.push({ id: "bName", k: T.nameB, color: COL.warm, ch: Bc, ...chartFoot(Bc), side: "below", align: "start", a: clamp01(bName), size: 40, quiet: true });

  const sumA = (i: number) => ["sA1", "sA2", "sA3"].map((n) => E(n))[i];
  const sumB = (i: number) => ["sB1", "sB2", "sB3"].map((n) => E(n))[i];
  out.push(
    ...S(f, sz, [
      // position (wide): how far each has come, at the top of its rise line; when B's appears A's drops to a quiet number
      { id: "aRise", k: T.low, v: `+${T.aPctN}%`, color: COL.up, ch: A, ...top(A, undefined, A_H), side: "above", from: E("pLow") + 6, to: E("pHigh") },
      { id: "aRiseQ", k: `+${T.aPctN}%`, color: COL.up, ch: A, ...top(A, undefined, A_H), side: "above", from: E("pHigh"), to: E("lIn"), quiet: true, fi: 1 },
      { id: "bRise", k: T.high, v: `+${T.bPctN}%`, color: COL.up, ch: Bc, ...top(Bc, undefined, B_H), side: "above", from: E("pHigh") + 6, to: E("lIn") },

      // A close-up
      { id: "aBase", k: T.tBase, v: "10.0–10.3", color: COL.gold, ch: A, wx: cx(A, 3), wy: cy(A, 9.94) - 0.02, side: "below", from: Math.max(E("lBase"), E("lIn") + 26), to: E("lHand") },
      { id: "aVol", k: T.tHand, v: NUM.aX, color: COL.gold, ch: A, ...volTop(A, A_H), side: "above", from: E("lHand"), to: E("lPull") },
      { id: "aPull", k: T.tShrink, v: `${A.bars[A_H + 1].v.toFixed(1)}→${count(f, E("lPull") + 4, E("lPull") + 26, A.bars[A_H + 1].v, A.bars[A_H + 4].v)}`, color: COL.gold, ch: A, ...volFloor(A, A_H + 1, A_H + 4), side: "below", from: E("lPull") + 4, to: E("lHold") },
      { id: "aHold", k: T.tHold, v: NUM.aLevel, color: COL.gold, ch: A, ...bottom(A, A_H + 5), side: "below", from: E("lHold") + 6, to: E("lBack") + 4 },
      { id: "aBack", k: T.tBack, v: p2(ab[aLast].c), color: COL.up, ch: A, ...lastTop(A, ab, aLast), side: "above", from: E("lBack") + 4, to: E("gIn") },

      // B close-up
      { id: "bRise2", k: T.tRise, v: `+${T.bPctN}%`, color: COL.up, ch: Bc, wx: cx(Bc, B_H) + 0.3, wy: cy(Bc, Bc.bars[B_H].c), side: "right", from: Math.max(E("gRise"), E("gIn") + 28), to: E("gDist") },
      { id: "bVol", k: T.tVol, v: NUM.bX, color: COL.gold, ch: Bc, ...volTop(Bc, B_H), side: "above", from: E("gDist"), to: E("gDrop") },
      { id: "bDrop", k: T.tVol, v: NUM.bDropX, color: COL.gold, ch: Bc, ...volFloor(Bc, B_H + 1, B_H + 1), side: "below", from: E("gDrop") + 6, to: E("gBreak") },
      { id: "bBreak", k: T.tBreak, v: NUM.bLevel, color: COL.down, ch: Bc, ...lineEnd(Bc, B_LEVEL), side: "right", size: axis, from: E("gBreak") + 8, to: E("gFail") },
      { id: "bFail", k: T.res, v: NUM.bLevel, color: COL.warm, ch: Bc, ...lineEnd(Bc, B_LEVEL), side: "right", size: axis, from: E("gFail"), to: E("gSign") },
      { id: "bLow", k: T.tNewLow, v: p2(bb[bLast].l), color: COL.down, ch: Bc, ...bottom(Bc, bLast), side: "below", from: E("gSign") + 10, to: E("sIn") },

      // summary (wide): the three conditions on each chart, one at a time on its word
      { id: "sA1", k: T.tShrink, v: `${A.bars[A_H + 1].v.toFixed(1)}→${A.bars[A_H + 4].v.toFixed(1)}`, color: COL.gold, ch: A, ...volFloor(A, A_H + 1, A_H + 4), side: "below", from: sumA(0), to: sumA(1) },
      { id: "sA2", k: T.tHold, v: NUM.aLevel, color: COL.gold, ch: A, ...bottom(A, A_H + 5), side: "below", align: "start", from: sumA(1), to: sumA(2) },
      { id: "sA3", k: T.tBack, v: NUM.aBack, color: COL.up, ch: A, ...top(A, undefined, A.bars.length - 1), side: "above", from: sumA(2), to: E("sB") },
      { id: "sB1", k: T.tVol, v: NUM.bDropX, color: COL.gold, ch: Bc, ...volFloor(Bc, B_H + 1, B_H + 1), side: "below", from: sumB(0), to: sumB(1) },
      { id: "sB2", k: T.tBreak, v: NUM.bLevel, color: COL.down, ch: Bc, ...lineEnd(Bc, B_LEVEL), side: "right", from: sumB(1), to: sumB(2) },
      { id: "sB3", k: T.res, v: NUM.bLevel, color: COL.warm, ch: Bc, ...lineEnd(Bc, B_LEVEL), side: "right", from: sumB(2), to: E("xIn") },

      // action (charts low): the plan, as prices on the charts
      { id: "xA", k: T.tWait, v: NUM.aBack, color: COL.up, ch: A, ...top(A, undefined, A.bars.length - 1), side: "above", from: E("xLow"), to: E("xHigh") },
      { id: "xB", k: T.tAvoid, v: NUM.bLevel, color: COL.down, ch: Bc, ...lineEnd(Bc, B_LEVEL), side: "right", from: E("xHigh"), to: E("xStop") },
      { id: "xStop", k: T.tStop, v: NUM.stop, color: COL.down, ch: A, wx: cx(A, A_H + 5), wy: cy(A, Number(NUM.stop)) - 0.02, side: "below", align: "start", from: E("xStop"), to: E("eIn") },
    ]),
  );
  return out.map((t) => ({ ...t, a: t.a * (t.ch === HOOK ? pres.hook : pres.ab) }));
};

export const placedAt = (f: number): Placed[] => {
  const pr = projector(f);
  return tagsAt(f).map((t) => place(t, pr));
};

/** every candle (wick to wick) and volume column on screen at frame f, as screen rects, for the layout check */
export const objectsAt = (f: number) => {
  const pr = projector(f);
  const pres = presence(f);
  const rects: { name: string; x0: number; x1: number; y0: number; y1: number }[] = [];
  const add = (name: string, ch: Chart, bars: LiveBar[]) =>
    bars.forEach((b, i) => {
      if (b.g <= 0) return;
      const hw = ch.xs * 0.31;
      const vw = 0.2 * (ch.xs / 0.34) * 0.5;
      const r = (x0: number, x1: number, y0: number, y1: number, n: string) => {
        const a = pr(x0, y1, 0.12);
        const c = pr(x1, y0, 0.12);
        const a2 = pr(x0, y1, -0.12);
        const c2 = pr(x1, y0, -0.12);
        rects.push({ name: n, x0: Math.min(a.x, a2.x), x1: Math.max(c.x, c2.x), y0: Math.min(a.y, a2.y), y1: Math.max(c.y, c2.y) });
      };
      r(cx(ch, i) - hw, cx(ch, i) + hw, cy(ch, b.l), cy(ch, b.h), `${name}${i}`);
      r(cx(ch, i) - vw, cx(ch, i) + vw, ch.vb, vy(ch, b.v), `${name}v${i}`);
    });
  if (pres.hook > 0.05) add("hook", HOOK, hookBars(f));
  if (pres.ab > 0.05) {
    add("A", A, aBars(f));
    add("B", Bc, bBars(f));
  }
  return rects;
};
