// The label bands: the only screen areas the HUD may put text, cards or markers into. Each shot frames its charts
// into the space between them (director.ts RECT), and scripts/volnorise2-layout.mjs projects every chart through the
// real camera to prove no band touches a candle or a volume column. Captions live below y 1962 and nothing else goes
// lower than 1900.
import { E } from "./cue";

export type Rect = { x0: number; x1: number; y0: number; y1: number };
const L = 48;
const R = 1392;
export const BANDS = {
  hookTop: { x0: L, x1: R, y0: 230, y1: 960 },
  whyTop: { x0: L, x1: R, y0: 230, y1: 600 },
  whyRight: { x0: 700, x1: R, y0: 600, y1: 1880 },
  wideTop: { x0: L, x1: R, y0: 230, y1: 990 },
  wideBottom: { x0: L, x1: R, y0: 1590, y1: 1900 },
  oneTop: { x0: L, x1: R, y0: 230, y1: 600 },
  oneBottom: { x0: L, x1: R, y0: 1730, y1: 1900 },
  lowTop: { x0: L, x1: R, y0: 230, y1: 1290 },
} satisfies Record<string, Rect>;

/** the bands in use at frame f (only meaningful once the camera has settled on the shot) */
export const bandsAt = (f: number): Partial<Record<keyof typeof BANDS, Rect>> => {
  if (f < E("wIn")) return { hookTop: BANDS.hookTop };
  if (f < E("pIn")) return { whyTop: BANDS.whyTop, whyRight: BANDS.whyRight };
  if (f < E("lIn")) return { wideTop: BANDS.wideTop, wideBottom: BANDS.wideBottom };
  if (f < E("sIn")) return { oneTop: BANDS.oneTop, oneBottom: BANDS.oneBottom };
  if (f < E("xIn")) return { wideTop: BANDS.wideTop, wideBottom: BANDS.wideBottom };
  if (f < E("eIn")) return { lowTop: BANDS.lowTop };
  return {};
};
