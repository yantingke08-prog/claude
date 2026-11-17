// Everything time-related comes from timeline.json (written by scripts/activepassive-sync.py): no frame numbers in code.
// Every character of every line has its own [start, end] frame, taken from the real voice by the local alignment.
import EV from "./events.json";
import TL from "./timeline.json";

export const FPS = TL.fps;
export const FRAMES = TL.frames;
export const WIDTH = TL.width;
export const HEIGHT = TL.height;

type Line = (typeof TL.lines)[number];
const LINES: Record<string, Line> = Object.fromEntries(TL.lines.map((l) => [l.id, l]));
const line = (id: string) => {
  const l = LINES[id];
  if (!l) throw new Error(`no line ${id}`);
  return l;
};
const at = (id: string, word: string) => {
  const i = line(id).text.indexOf(word);
  if (i < 0) throw new Error(`'${word}' not in ${id}`);
  return i;
};

/** frame at which the voice starts `word` */
export const Lw = (id: string, word: string, off = 0) => line(id).ch[at(id, word)][0] + off;
/** frame at which the voice finishes `word` */
export const LwEnd = (id: string, word: string, off = 0) => line(id).ch[at(id, word) + word.length - 1][1] + off;
export const Ls = (id: string, off = 0) => line(id).from + off;
export const Le = (id: string, off = 0) => line(id).to + off;

type Ev = { line?: string; word?: string; at?: "start" | "end"; after?: string; off?: number };
const evs = EV as unknown as Record<string, Ev>;
const cache = new Map<string, number>();
/**
 * Named moment shared with the mix (events.json). `line + word` = the frame that word starts (or ends, at: "end");
 * `after` = the frame a line has finished. Actions start on these frames, never before the word.
 */
export const E = (name: string) => {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const e = evs[name];
  if (!e || name.startsWith("_")) throw new Error(`no event ${name}`);
  const off = e.off ?? 0;
  const v = e.after ? Le(e.after, off) : e.word ? (e.at === "end" ? LwEnd(e.line!, e.word, off) : Lw(e.line!, e.word, off)) : Ls(e.line!, off);
  cache.set(name, v);
  return v;
};

export const captions = TL.captions;
export const sections = TL.sections;

// ---------------------------------------------------------------- easing
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const ease = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const out3 = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const backOut = (x: number) => {
  const t = clamp01(x);
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
/** 0→1 over d frames from a */
export const ramp = (f: number, a: number, d = 12) => ease((f - a) / d);
/** visible from a to b with fades */
export const win = (f: number, a: number, b = 1e9, fi = 10, fo = 10) => Math.min(clamp01((f - a) / fi), clamp01((b - f) / fo));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
