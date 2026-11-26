// Offline fonts: glyph subsets in public/poc/fonts (scripts/poc-fonts.py), all SIL OFL 1.1. No network at render time.
import { continueRender, delayRender, staticFile } from "remotion";

const SANS = "POC Sans"; // Noto Sans SC (variable)
const SERIF = "POC Serif"; // Noto Serif SC (variable)
const MONO = "POC Mono"; // Cascadia Mono (variable)

const handle = delayRender("Loading POC fonts", { timeoutInMilliseconds: 60000 });
const load = (family: string, file: string, weight: string) => {
  const ff = new FontFace(family, `url(${staticFile(`poc/fonts/${file}`)}) format("woff2")`, { weight });
  return ff.load().then((f) => {
    document.fonts.add(f);
  });
};
export const fontsReady = Promise.all([load(SANS, "poc-sans.woff2", "100 900"), load(SERIF, "poc-serif.woff2", "200 900"), load(MONO, "poc-mono.woff2", "200 700")])
  .catch((e) => console.error("font load failed", e))
  .finally(() => continueRender(handle));

export const sans = (w: 500 | 700 | 900 = 500) => ({ fontFamily: `"${SANS}", sans-serif`, fontWeight: w });
export const serif = (w: 700 | 900 = 900) => ({ fontFamily: `"${SERIF}", serif`, fontWeight: w });
export const mono = (w: 500 | 700 = 700) => ({ fontFamily: `"${MONO}", "${SANS}", monospace`, fontWeight: w, fontVariantNumeric: "tabular-nums" as const });
