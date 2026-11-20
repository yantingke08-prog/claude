// v4: the only screen areas big text may use. Chart labels are tags (tags.ts) that sit on the objects themselves, so
// the remaining bands are for the hook (question, countdown, answer above the chart) and the rule title (above the
// lowered charts). scripts/volnorise5-layout.mjs projects every chart through the real camera to prove no band
// touches a candle or a volume column, and measures every tag against every bar. Captions live below y 2120 and
// nothing else goes lower than 2060; the top line sits at y 250, below the phone's top safe area.
import { E } from "./cue";

export type Rect = { x0: number; x1: number; y0: number; y1: number };
const L = 48;
const R = 1392;
export const BANDS = {
  hookTop: { x0: L, x1: R, y0: 340, y1: 1010 },
} satisfies Record<string, Rect>;

/** the bands in use at frame f (only meaningful once the camera has settled on the shot) */
export const bandsAt = (f: number): Partial<Record<keyof typeof BANDS, Rect>> => {
  if (f < E("wIn")) return { hookTop: BANDS.hookTop };
  return {};
};
