// Timing helpers for the v2 short. Every animated value is a pure function of the frame and is
// keyed to the narration (timeline.json comes from scripts/fakeout-vo.py, i.e. the real TTS).
import TL from "./timeline.json";

export const FPS = TL.fps;
export const FRAMES = TL.frames;
const lines = Object.fromEntries(TL.lines.map((l) => [l.id, l]));
const secs = Object.fromEntries(TL.sections.map((s) => [s.id, s]));
/** first / last frame of a narration line */
export const L = (id: string) => lines[id].from;
export const Le = (id: string) => lines[id].to;
/** first / last frame of a section */
export const S = (id: string) => secs[id].from;
export const Se = (id: string) => secs[id].to;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const expoIn = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const cubicInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const backOut = (t: number) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

/** 0→1 between frames a and b */
export const span = (f: number, a: number, b: number, e: (t: number) => number = cubicInOut) => e(clamp01((f - a) / (b - a)));
/** fades in over [a, a+d] and out over [b-d, b] */
export const hold = (f: number, a: number, b: number, d = 10) => span(f, a, a + d, smooth) * (1 - span(f, b - d, b, smooth));

/** keyframes [frame, value, ease-into-this-key?] */
export const track = (f: number, ks: [number, number, ((t: number) => number)?][]) => {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [f1, v1, e] = ks[i];
    const [f0, v0] = ks[i - 1];
    if (f < f1) return v0 + (v1 - v0) * (e ?? cubicInOut)(clamp01((f - f0) / (f1 - f0)));
  }
  return ks[ks.length - 1][1];
};

/** exponential decay pulse that starts at frame a */
export const pulse = (f: number, a: number, tau = 8) => (f < a ? 0 : Math.exp(-(f - a) / tau));

export { TL };
