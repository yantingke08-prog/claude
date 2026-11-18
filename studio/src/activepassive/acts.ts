// What every set shows at frame f: pure functions of the frame, driven only by events (which follow the voice).
// world.tsx draws these states in 3D; hud.tsx anchors its labels on them.
import { E, clamp01, ease, out3, ramp, win } from "./cue";
import { BOOKS, CHASE, CH_WALL_I, CH_YANG, HOOK, HOOK_YANG, LG_BREAK, LG_FOLLOW, LOGIC, THREE, type Bar, type BookCfg, type Chart } from "./data";

export type Pulse = { y0: number; y1: number; dir: 1 | -1; color: "up" | "down"; op: number; z?: number; dx?: number };
export type Mine = { level: number; size: number; op: number; glow: number; filled: number };
export type BookState = {
  cfg: BookCfg;
  asks: number[];
  bids: number[];
  askHit: number[];
  bidHit: number[];
  /** outlines of what an active order took (0..1 per level) */
  takenA: number[];
  takenB: number[];
  price: number;
  candle: { o: number; h: number; l: number; c: number; hot: number };
  pulses: Pulse[];
  mine?: Mine;
  spread: number;
  plate: number;
  dimPassive: number;
};

/** a pulse from level a to level b: head travels in d frames, then the beam shrinks into what it hit */
const pulse = (f: number, at: number, a: number, b: number, d: number, color: "up" | "down", z = 0.62): Pulse | null => {
  if (f < at || f > at + d + 16) return null;
  const k = ease((f - at) / d);
  const head = a + (b - a) * k;
  const tail = a + (b - a) * ease((f - at - d) / 14);
  return { y0: tail, y1: head, dir: b > a ? 1 : -1, color, op: win(f, at, at + d + 16, 3, 8), z };
};
/** the path an active order took, held as a quiet trace in the summary shots */
const trace = (k: number, a: number, b: number, color: "up" | "down"): Pulse | null => (k > 0.01 ? { y0: a, y1: b, dir: b > a ? 1 : -1, color, op: 0.55 * k, z: 0.62 } : null);
/** price (in levels) walks from p0 to p1 between frames a and a+d */
const walk = (f: number, a: number, d: number, p0: number, p1: number) => p0 + (p1 - p0) * ease((f - a) / d);
const empty = (cfg: BookCfg): BookState => ({
  cfg,
  asks: [...cfg.asks],
  bids: [...cfg.bids],
  askHit: [0, 0, 0],
  bidHit: [0, 0, 0],
  takenA: [0, 0, 0],
  takenB: [0, 0, 0],
  price: 0,
  candle: { o: 0, h: 0, l: 0, c: 0, hot: 0 },
  pulses: [],
  spread: 0,
  plate: 0,
  dimPassive: 0,
});
const finish = (s: BookState, lo = Math.min(0, s.price), hi = Math.max(0, s.price)) => {
  s.candle = { o: 0, h: hi, l: lo, c: s.price, hot: s.candle.hot };
  s.pulses = s.pulses.filter(Boolean);
  return s;
};

// ---------------------------------------------------------------- 01: active buy (book A) / passive buy (book B)
export const bookBuyA = (f: number): BookState => {
  const s = empty(BOOKS.buyA);
  const eat = E("aEat");
  const push = E("aPush");
  // the order shows up under the spread as soon as it is named, crosses on 吃掉, eats ask 1; on 推涨 a second one eats ask 2
  const arm = ramp(f, E("aBuy"), 10) * (f < eat ? 1 : 0);
  if (arm > 0.01) s.pulses.push({ y0: -1.6, y1: -1.6 + 0.9 * arm, dir: 1, color: "up", op: arm });
  const p1 = pulse(f, eat, -1.6, 1, 10, "up");
  const p2 = pulse(f, push, -1.6, 2, 12, "up");
  if (p1) s.pulses.push(p1);
  if (p2) s.pulses.push(p2);
  const e1 = clamp01((f - eat - 8) / 12);
  const e2 = clamp01((f - push - 10) / 14);
  s.asks[0] = s.cfg.asks[0] * (1 - e1);
  s.asks[1] = s.cfg.asks[1] * (1 - 0.7 * e2);
  s.askHit = [win(f, eat + 6, eat + 26, 3, 10), win(f, push + 8, push + 30, 3, 10), 0];
  s.takenA = [e1 * (1 - 0.6 * ramp(f, E("pBuy") + 20, 20)), 0.7 * e2, 0];
  s.price = f < push + 10 ? walk(f, eat + 8, 10, 0, 1) : walk(f, push + 10, 12, 1, 2);
  s.spread = win(f, E("aSpread"), E("aTake") + 6, 8, 10);
  s.plate = win(f, E("aPush"), E("pBuy"), 6, 12) + 0.5 * win(f, E("kPush"), 1e9, 8, 8);
  s.candle.hot = win(f, push + 6, E("pBuy") + 10, 6, 14) + 0.5 * ramp(f, E("cmp") + 10, 12);
  const tr = trace(ramp(f, E("cmp") + 10, 12), -1.6, 2, "up");
  if (tr) s.pulses.push(tr);
  return finish(s, 0, s.price);
};

export const bookBuyB = (f: number): BookState => {
  const s = empty(BOOKS.buyB);
  const place = E("pPlace");
  const away = E("pNoFill");
  const drop = out3((f - place) / 12);
  if (f >= place) {
    const left = ramp(f, away + 14, 16);
    s.mine = { level: -2, size: 1.2, op: drop, glow: 0.35 + 0.65 * win(f, E("pProvide"), away + 10, 8, 10), filled: 0 };
    s.mine.glow *= 1 - 0.7 * left;
    s.mine.glow += 0.6 * ramp(f, E("cmp") + 10, 12);
  }
  // someone else's active buy lifts the price away from the resting order
  const p = pulse(f, away, -1.6, 1, 10, "up", 0.9);
  if (p) s.pulses.push(p);
  const e1 = clamp01((f - away - 8) / 12);
  s.asks[0] = s.cfg.asks[0] * (1 - e1);
  s.askHit = [win(f, away + 6, away + 26, 3, 10), 0, 0];
  s.takenA = [e1 * 0.5, 0, 0];
  s.price = walk(f, away + 8, 12, 0, 1);
  return finish(s, 0, s.price);
};

// ---------------------------------------------------------------- 02: active sell (book C) / passive sell (book D)
export const bookSellA = (f: number): BookState => {
  const s = empty(BOOKS.sellA);
  const hit = E("sHit");
  const down = E("sDown");
  const arm = ramp(f, E("sAct"), 10) * (f < hit ? 1 : 0);
  if (arm > 0.01) s.pulses.push({ y0: 1.6, y1: 1.6 - 0.9 * arm, dir: -1, color: "down", op: arm });
  const p1 = pulse(f, hit, 1.6, -1, 10, "down");
  const p2 = pulse(f, down + 12, 1.6, -2, 12, "down");
  if (p1) s.pulses.push(p1);
  if (p2) s.pulses.push(p2);
  const e1 = clamp01((f - hit - 8) / 12);
  const e2 = clamp01((f - down - 22) / 14);
  s.bids[0] = s.cfg.bids[0] * (1 - e1);
  s.bids[1] = s.cfg.bids[1] * (1 - 0.7 * e2);
  s.bidHit = [win(f, hit + 6, hit + 26, 3, 10), win(f, down + 20, down + 42, 3, 10), 0];
  s.takenB = [e1, 0.7 * e2, 0];
  s.price = f < down + 22 ? walk(f, hit + 8, 10, 0, -1) : walk(f, down + 22, 12, -1, -2);
  s.candle.hot = win(f, down + 18, E("sPas") + 24, 6, 14) + 0.6 * win(f, E("kPush"), 1e9, 8, 8);
  s.spread = 0.8 * win(f, E("kCross"), 1e9, 8, 8);
  s.plate = 0.6 * win(f, E("kPush"), 1e9, 8, 8);
  s.dimPassive = 0.5 * win(f, E("kCross"), 1e9, 10, 8);
  const tr = trace(ramp(f, E("kCross"), 12), 1.6, -2, "down");
  if (tr) s.pulses.push(tr);
  return finish(s, s.price, 0);
};

export const bookSellB = (f: number): BookState => {
  const s = empty(BOOKS.sellB);
  const place = E("sPlace");
  const fill = E("sFill");
  if (f >= place) {
    const got = clamp01((f - fill - 22) / 12);
    s.mine = { level: 2, size: 1.2, op: out3((f - place) / 12) * (1 - got), glow: 0.4 + 0.6 * win(f, place, fill + 30, 8, 8) + 1.2 * win(f, fill + 18, fill + 36, 3, 8), filled: got };
  }
  // an active buy comes up through ask 1 and fills the resting sell order at ask 2
  const p = pulse(f, fill, -1.6, 2, 14, "up", 0.9);
  if (p) s.pulses.push(p);
  const e1 = clamp01((f - fill - 8) / 10);
  s.asks[0] = s.cfg.asks[0] * (1 - e1);
  s.askHit = [win(f, fill + 6, fill + 22, 3, 10), win(f, fill + 16, fill + 34, 3, 10), 0];
  s.takenA = [0.5 * e1, 0, 0];
  s.price = f < fill + 18 ? walk(f, fill + 8, 8, 0, 1) : walk(f, fill + 18, 10, 1, 2);
  s.candle.hot = 0.6 * win(f, E("kPush"), 1e9, 8, 8);
  s.spread = 0.8 * win(f, E("kCross"), 1e9, 8, 8);
  s.plate = 0.6 * win(f, E("kPush"), 1e9, 8, 8);
  s.dimPassive = 0.5 * win(f, E("kCross"), 1e9, 10, 8);
  const tr = trace(ramp(f, E("kCross"), 12), -1.6, 2, "up");
  if (tr) s.pulses.push(tr);
  return finish(s, 0, s.price);
};

// ---------------------------------------------------------------- 05: absorption on both sides
const ABS_GAP = 22;
export const bookAbsorb = (f: number): BookState => {
  const s = empty(BOOKS.absorb);
  const buy = E("abBuy");
  const sell = E("abSell");
  const hitsA = [0, 1, 2, 3].map((k) => buy + k * ABS_GAP);
  const hitsB = [0, 1, 2, 3].map((k) => sell + k * ABS_GAP);
  let dentA = 0;
  let dentB = 0;
  hitsA.forEach((h, k) => {
    const p = pulse(f, h, -1.6, 1, 8, "up");
    if (p && f < sell) s.pulses.push(p);
    // each hit takes a slice, the wall refills: the iceberg of a passive seller
    dentA += 0.55 * win(f, h + 7, h + 16, 2, 10);
    s.askHit[0] = Math.max(s.askHit[0], win(f, h + 6, h + 18, 2, 8));
    void k;
  });
  hitsB.forEach((h) => {
    const p = pulse(f, h, 1.6, -1, 8, "down");
    if (p) s.pulses.push(p);
    dentB += 0.55 * win(f, h + 7, h + 16, 2, 10);
    s.bidHit[0] = Math.max(s.bidHit[0], win(f, h + 6, h + 18, 2, 8));
  });
  s.asks[0] = s.cfg.asks[0] - dentA;
  s.bids[0] = s.cfg.bids[0] - dentB;
  s.price = f < sell ? walk(f, buy + 7, 6, 0, 1) : walk(f, sell + 7, 8, 1, -1);
  s.plate = win(f, E("abStill"), sell, 8, 8) + win(f, E("abHold"), E("abWhere"), 8, 8) + win(f, E("abWhere"), 1e9, 8, 8);
  const lo = f < sell + 7 ? 0 : s.price;
  return finish(s, Math.min(0, lo), f >= buy + 7 ? 1 : 0);
};

// ---------------------------------------------------------------- charts
/** g = printed (0 = not yet), op = focus opacity (bars outside a close-up step back), hot = lit, grey = desaturated */
export type LiveBar = Bar & { g: number; hot: number; grey: number; op?: number };
/** a bar that prints live: to its extreme first, then back to its close */
const live = (f: number, b: Bar, a: number, d = 20): LiveBar => {
  if (f < a) return { ...b, g: 0, hot: 0, grey: 0 };
  const upFirst = b.h - Math.max(b.o, b.c) >= Math.min(b.o, b.c) - b.l;
  const ext = upFirst ? b.h : b.l;
  const top = a + d * 0.7;
  const end = a + d;
  const p = f < top ? b.o + (ext - b.o) * ease((f - a) / (top - a)) : ext + (b.c - ext) * ease((f - top) / (end - top));
  const reach = f < top ? p : ext;
  const done = clamp01((f - end) / 6);
  const g = clamp01((f - a) / 4);
  return upFirst
    ? { o: b.o, h: Math.max(b.o, reach), l: Math.min(p, b.o) - (Math.min(p, b.o) - b.l) * done, c: p, v: b.v, d: b.d, g, hot: 0, grey: 0 }
    : { o: b.o, l: Math.min(b.o, reach), h: Math.max(p, b.o) + (b.h - Math.max(p, b.o)) * done, c: p, v: b.v, d: b.d, g, hot: 0, grey: 0 };
};
const shown = (b: Bar, g = 1): LiveBar => ({ ...b, g, hot: 0, grey: 0 });

export const hookBars = (f: number): LiveBar[] =>
  HOOK.bars.map((b, i) => {
    if (i < HOOK_YANG) return shown(b, clamp01((f - i * 2) / 8));
    const L = live(f, b, E("hookYang") - 2, 22);
    return { ...L, hot: 0.4 * ramp(f, E("hookYang") + 16, 10) };
  });

/** in the close-up on the wall the range bars step back so nothing is cut by the frame edge */
export const chaseFocus = (f: number) => 1 - ramp(f, E("cBig"), 12);
/** in the close-up on the price response only bars 3..6 stay */
export const threeFocus = (f: number) => 1 - win(f, E("t2"), E("t3") + 20, 10, 14);
/** the second book of a pair only appears when the camera turns to it, so it never sits cut at the edge of the first one's shot */
export const secondBook = (f: number, which: "buy" | "sell") => ramp(f, which === "buy" ? E("pBuy") + 10 : E("sPas") + 10, 12);
export const chaseBars = (f: number): LiveBar[] => {
  const cIn = E("chaseIn");
  return CHASE.bars.map((b, i) => {
    if (i < CH_YANG) return { ...shown(b, clamp01((f - cIn - 4 - i * 2) / 8)), op: chaseFocus(f) };
    if (i === CH_YANG) return { ...live(f, b, E("cYang"), 20), hot: 0.5 * win(f, E("cVol"), E("cFade"), 8, 12) };
    if (i < CH_WALL_I) return live(f, b, E("cFade") + (i - CH_YANG - 1) * 14, 16);
    return { ...live(f, b, E("cBig") - 4, 22), hot: 0.4 * win(f, E("cStuck"), E("cYou"), 6, 12) };
  });
};

export const threeBars = (f: number): LiveBar[] => {
  const tIn = E("threeIn");
  const grey = ramp(f, E("tColor"), 14) * (1 - ramp(f, E("t1"), 14));
  const foc = threeFocus(f);
  return THREE.bars.map((b, i) => ({ ...shown(b, clamp01((f - tIn - 2 - i * 1.5) / 8)), grey, hot: i === 5 ? 0.6 * win(f, E("t2go"), E("t3"), 6, 12) : 0, op: i >= 3 && i <= 6 ? 1 : foc }));
};

export const logicBars = (f: number): LiveBar[] => {
  const lIn = E("logicIn");
  return LOGIC.bars.map((b, i) => {
    if (i < LG_BREAK) return shown(b, clamp01((f - lIn - 4 - i * 2) / 8));
    if (i === LG_BREAK) return { ...live(f, b, E("lg1"), 18), hot: 0.5 * win(f, E("lg1") + 10, E("lg3"), 6, 12) };
    if (i === LG_FOLLOW) return { ...live(f, b, E("lg3"), 16), hot: 0.5 * win(f, E("lg3") + 8, E("lg4"), 6, 12) };
    return live(f, b, E("lg4") + (i - LG_FOLLOW - 1) * 8, 12);
  });
};

/** delta core visibility per bar of a chart (volume glass + delta core under each candle) */
export const volumeOn = (f: number, which: "chase" | "three" | "logic") => {
  if (which === "chase") return ramp(f, E("cVol"), 10);
  if (which === "three") return ramp(f, E("t1"), 12);
  return ramp(f, E("lg1"), 12);
};

export type { Chart };
