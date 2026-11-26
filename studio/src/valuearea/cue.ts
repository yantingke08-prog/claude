// Everything time-related comes from timeline.json (scripts/valuearea-sync.py): no frame numbers in the picture code.
// Every character of every line has its own [start, end] frame — estimated from character counts until the real
// voice is aligned with `npm run va:sync`, after which captions, animation, camera and length follow the recording.
import EV from "./events.json";
import TL from "./timeline.json";

export const FPS = TL.fps;
export const FRAMES = TL.frames;
export const WIDTH = TL.width;
export const HEIGHT = TL.height;
export const SOURCE = TL.source;

type Line = (typeof TL.lines)[number];
const LINES: Record<string, Line> = Object.fromEntries(TL.lines.map((l) => [l.id, l]));
const line = (id: string) => {
  const l = LINES[id];
  if (!l) throw new Error(`no line ${id}`);
  return l;
};
const find = (id: string, word: string, nth = 1) => {
  let i = -1;
  for (let k = 0; k < nth; k++) {
    i = line(id).text.indexOf(word, i + 1);
    if (i < 0) throw new Error(`'${word}' (#${nth}) not in ${id}`);
  }
  return i;
};

export const Ls = (id: string, off = 0) => line(id).from + off;
export const Le = (id: string, off = 0) => line(id).to + off;

type Ev = { line?: string; word?: string; at?: "start" | "end"; after?: string; off?: number; nth?: number };
const evs = EV as unknown as Record<string, Ev>;
const cache = new Map<string, number>();
/**
 * A named moment from events.json, named `<line>_<word>`: the frame that word starts (or ends, `.end`), or `<line>_end`
 * = the line has finished. Every action, camera key and label starts on one of these, never before the word.
 */
export const E = (name: string) => {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const e = evs[name];
  if (!e || name.startsWith("_")) throw new Error(`no event ${name} in events.json`);
  const off = e.off ?? 0;
  let v: number;
  if (e.after) v = Le(e.after, off);
  else if (!e.word) v = Ls(e.line!, off);
  else {
    const i = find(e.line!, e.word, e.nth ?? 1);
    const ch = line(e.line!).ch;
    v = (e.at === "end" ? ch[i + e.word.length - 1][1] : ch[i][0]) + off;
  }
  cache.set(name, v);
  return v;
};

export const captions = TL.captions;
export const sections = TL.sections;
export const sectionAt = (f: number) => sections.find((s) => f >= s.from && f < s.to) ?? sections[sections.length - 1];

// ---------------------------------------------------------------- easing (pure functions of the frame)
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
/** 0→1 over d frames from a */
export const ramp = (f: number, a: number, d = 12) => ease((f - a) / d);
/** visible from a to b: fades in over fi after a, fades out over the fo frames before b */
export const win = (f: number, a: number, b = 1e9, fi = 8, fo = 6) => Math.min(clamp01((f - a) / fi), clamp01((b - f) / fo));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** the "make way" rule: an old subject starts to step back 6 frames before the next one enters */
export const YIELD = 6;
/** 0 → 1 as the old subject steps back for a new one entering at frame `next` */
export const yieldTo = (f: number, next: number, d = 14) => ease((f - (next - YIELD)) / d);
