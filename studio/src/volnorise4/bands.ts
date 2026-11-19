// v4: the only screen areas big text may use. Chart labels are tags (tags.ts) that sit on the objects themselves, so
// the remaining bands are for the hook (question, countdown, answer above the chart) and the rule title (above the
// lowered charts). scripts/volnorise4-layout.mjs projects every chart through the real camera to prove no band
// touches a candle or a volume column, and measures every tag against every bar. Captions live below y 1962 and
// nothing else goes lower than 1900.
import { E } from "./cue";

export type Rect = { x0: number; x1: number; y0: number; y1: number };
const L = 48;
const R = 1392;
export const BANDS = {
  hookTop: { x0: L, x1: R, y0: 230, y1: 990 },
  lowTop: { x0: L, x1: R, y0: 230, y1: 1180 },
} satisfies Record<string, Rect>;

/** the bands in use at frame f (only meaningful once the camera has settled on the shot) */
export const bandsAt = (f: number): Partial<Record<keyof typeof BANDS, Rect>> => {
  if (f < E("wIn")) return { hookTop: BANDS.hookTop };
  if (f >= E("xIn") + 30 && f < E("eIn")) return { lowTop: BANDS.lowTop };
  return {};
};
