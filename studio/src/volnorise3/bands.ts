// The label bands: the only screen areas the HUD may put text, cards or markers into. Each shot frames its charts
// into the space between them (director.ts RECT), and scripts/volnorise3-layout.mjs projects every chart through the
// real camera to prove no band touches a candle or a volume column. Captions live below y 1962 and nothing else goes
// lower than 1900.
import { E } from "./cue";

export type Rect = { x0: number; x1: number; y0: number; y1: number };
const L = 48;
const R = 1392;
export const BANDS = {
  hookTop: { x0: L, x1: R, y0: 230, y1: 990 },
  whyTop: { x0: L, x1: R, y0: 230, y1: 600 },
  whyRight: { x0: 790, x1: R, y0: 600, y1: 1880 },
  wideTop: { x0: L, x1: R, y0: 230, y1: 950 },
  wideBottom: { x0: L, x1: R, y0: 1650, y1: 1900 },
  oneTop: { x0: L, x1: R, y0: 230, y1: 590 },
  oneBottom: { x0: L, x1: R, y0: 1740, y1: 1900 },
  sumTop: { x0: L, x1: R, y0: 230, y1: 660 },
  sumBottom: { x0: L, x1: R, y0: 1350, y1: 1900 },
  lowTop: { x0: L, x1: R, y0: 230, y1: 1240 },
} satisfies Record<string, Rect>;

/** the bands in use at frame f (only meaningful once the camera has settled on the shot) */
export const bandsAt = (f: number): Partial<Record<keyof typeof BANDS, Rect>> => {
  if (f < E("wIn")) return { hookTop: BANDS.hookTop };
  if (f < E("pIn")) return { whyTop: BANDS.whyTop, whyRight: BANDS.whyRight };
  if (f < E("lIn")) return { wideTop: BANDS.wideTop, wideBottom: BANDS.wideBottom };
  if (f < E("sIn")) return { oneTop: BANDS.oneTop, oneBottom: BANDS.oneBottom };
  if (f < E("xIn")) return { sumTop: BANDS.sumTop, sumBottom: BANDS.sumBottom };
  if (f < E("eIn")) return { lowTop: BANDS.lowTop };
  return {};
};
