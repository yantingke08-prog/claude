// Time helpers. All times are SECONDS (the voice-over's clock), never frames.
import { Easing, interpolate } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = Easing.bezier(0.45, 0, 0.2, 1);

/** eased 0→1 from `start` over `dur` seconds */
export const prog = (t: number, start: number, dur = 0.5) => interpolate(t, [start, start + dur], [0, 1], { ...clamp, easing: smooth });
/** linear 0→1 */
export const lin = (t: number, start: number, dur = 0.5) => interpolate(t, [start, start + dur], [0, 1], clamp);
/** fade in at a, out at b */
export const win = (t: number, a: number, b: number, d = 0.3) => Math.min(prog(t, a, d), 1 - prog(t, b - d, d));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
/** camera keys [seconds, value]; each move eases, holds between keys */
export const keys = (t: number, ks: [number, number][]) => {
  if (ks.length === 1) return ks[0][1];
  return interpolate(t, ks.map((k) => k[0]), ks.map((k) => k[1]), { ...clamp, easing: smooth });
};
/** camera move that starts ON a beat and lasts `dur` (0.65 s default) */
export const camSteps = (t: number, base: number, steps: [beat: number, value: number][], dur = 0.65) => {
  let v = base;
  for (const [b, val] of steps) v = mix(v, val, prog(t, b, dur));
  return v;
};
/** count from a to b */
export const count = (t: number, start: number, dur: number, a: number, b: number) => Math.round(mix(a, b, lin(t, start, dur)));
/** gentle pulse 0..1 after start (stops after n cycles) */
export const pulse = (t: number, start: number, period = 0.5, n = 2) => {
  const x = t - start;
  if (x < 0 || x > period * n) return 0;
  return 0.5 - 0.5 * Math.cos((x / period) * Math.PI * 2);
};
