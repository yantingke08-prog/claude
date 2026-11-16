// Everything time-related comes from timeline.json (written by scripts/stophunt-sync.py): no frame numbers in code.
// A line has phrases [c0, c1, from, to]; a char's frame is interpolated inside its phrase.
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

/** frame at which the voice reaches char index `ch` of a line */
export const Lc = (id: string, ch = 0, off = 0) => {
  const l = line(id);
  for (const [c0, c1, a, b] of l.ph) if (ch < c1) return a + ((b - a) * Math.max(0, ch - c0)) / Math.max(1, c1 - c0) + off;
  return l.to + off;
};
/** frame at which the voice reaches `word` in a line */
export const Lw = (id: string, word: string, off = 0) => {
  const ch = line(id).text.indexOf(word);
  if (ch < 0) throw new Error(`'${word}' not in ${id}`);
  return Lc(id, ch, off);
};
export const Ls = (id: string, off = 0) => line(id).from + off;
export const Le = (id: string, off = 0) => line(id).to + off;

type Ev = { line: string; word?: string; off?: number; end?: boolean };
const evs = EV as unknown as Record<string, Ev>;
const cache = new Map<string, number>();
/** named moment shared with the mix (events.json) */
export const E = (name: string) => {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const e = evs[name];
  if (!e || name.startsWith("_")) throw new Error(`no event ${name}`);
  const v = e.end ? Le(e.line, e.off ?? 0) : e.word ? Lw(e.line, e.word, e.off ?? 0) : Ls(e.line, e.off ?? 0);
  cache.set(name, v);
  return v;
};

export const captions = TL.captions;
export const sections = TL.sections;
export const SEC = (id: string) => {
  const s = TL.sections.find((x) => x.id === id);
  if (!s) throw new Error(`no section ${id}`);
  return s;
};

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
  const c = 1.5;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
/** 0→1 over d frames from a */
export const ramp = (f: number, a: number, d = 12) => ease((f - a) / d);
/** visible from a to b with fades */
export const win = (f: number, a: number, b = 1e9, fi = 10, fo = 10) => Math.min(clamp01((f - a) / fi), clamp01((b - f) / fo));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
