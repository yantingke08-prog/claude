// When each candle prints, and how a candle looks while it prints. Pure functions of the frame, driven by events.
// The A/B charts start with everything up to the heavy candle; the candles after it print only when the voice gets
// to them, so the "answer" unfolds in the order it is explained.
import { E, clamp01, ease } from "./cue";
import { A, A_H, B_H, Bc, HOOK, type Bar, type Chart } from "./data";

export type LiveBar = Bar & { g: number };

/** a bar that prints live: to its first extreme, then back to its close (d frames) */
const live = (f: number, b: Bar, a: number, d = 16): LiveBar => {
  if (f < a) return { ...b, g: 0 };
  const upFirst = b.h - Math.max(b.o, b.c) >= Math.min(b.o, b.c) - b.l;
  const k1 = ease((f - a) / (d * 0.6));
  const k2 = ease((f - a - d * 0.6) / (d * 0.4));
  const ext = upFirst ? b.h : b.l;
  const other = upFirst ? b.l : b.h;
  const reached = b.o + (ext - b.o) * k1;
  const cur = k1 < 1 ? reached : ext + (b.c - ext) * k2;
  const opp = b.o + (other - b.o) * k2;
  const hi = Math.max(b.o, cur, upFirst ? reached : opp);
  const lo = Math.min(b.o, cur, upFirst ? opp : reached);
  return { o: b.o, h: hi, l: lo, c: cur, v: b.v * clamp01((f - a) / d), g: 1 };
};

const all = (ch: Chart, f: number, at: (i: number) => number) => ch.bars.map((b, i) => live(f, b, at(i)));

/** the hook chart is complete from the first frame */
export const hookBars = (f: number) => all(HOOK, f, () => -1e9);

/** frame at which bar i of A prints */
export const aAt = (i: number) => {
  if (i <= A_H) return -1e9;
  if (i <= A_H + 4) return E("vPull") + (i - A_H - 1) * 6; // the pullback, volume shrinking
  if (i === A_H + 5) return E("cLow"); // the dip to the heavy candle's low
  return E("bBack") + (i - A_H - 6) * 7; // back above the line
};
/** frame at which bar i of B prints */
export const bAt = (i: number) => {
  if (i <= B_H) return -1e9;
  if (i === B_H + 1) return E("vBDrop"); // down on volume
  if (i === B_H + 2) return E("vBRe"); // rebound on none
  if (i === B_H + 3) return E("cBreak"); // through the line
  if (i <= B_H + 5) return E("bReb") + (i - B_H - 4) * 8; // a rebound that cannot get back
  return E("bFlip") + (i - B_H - 6) * 7; // and lower
};
export const aBars = (f: number) => all(A, f, aAt);
export const bBars = (f: number) => all(Bc, f, bAt);
