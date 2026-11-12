import { Easing, interpolate } from "remotion";

const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = Easing.bezier(0.45, 0, 0.2, 1); // slow in, slow out, no overshoot

/** 0→1 progress of an action that starts at `start` and lasts `dur` frames (eased). */
export const prog = (f: number, start: number, dur = 18) => interpolate(f, [start, start + dur], [0, 1], { ...clampOpts, easing: smooth });

/** linear 0→1 */
export const lin = (f: number, start: number, dur = 18) => interpolate(f, [start, start + dur], [0, 1], clampOpts);

/** fade in at `a`, fade out at `b` (both eased, `d` frames) */
export const window01 = (f: number, a: number, b: number, d = 12) => Math.min(prog(f, a, d), 1 - prog(f, b - d, d));

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** piecewise camera keys: [frame, value] */
export const keys = (f: number, ks: [number, number][]) =>
  interpolate(
    f,
    ks.map((k) => k[0]),
    ks.map((k) => k[1]),
    { ...clampOpts, easing: smooth },
  );
