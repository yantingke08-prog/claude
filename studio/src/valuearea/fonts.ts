// Offline fonts: glyph subsets of Noto Sans SC / Noto Serif SC (SIL OFL 1.1) bundled in public/valuearea/fonts/
// (made by scripts/valuearea-fonts.py from the copies Windows ships). Nothing is fetched from the network.
// If a subset file is missing, the stacks fall back to fonts installed on the machine (Microsoft YaHei, SimHei…).
import { continueRender, delayRender, staticFile } from "remotion";

const SANS = "VA Sans";
const SERIF = "VA Serif";

const load = async (family: string, file: string) => {
  try {
    const face = new FontFace(family, `url(${staticFile(`valuearea/fonts/${file}`)}) format("woff2")`, { weight: "100 900" });
    await face.load();
    document.fonts.add(face);
  } catch (e) {
    console.warn(`font ${file} not loaded, using system fallback`, e);
  }
};

const handle = typeof document !== "undefined" ? delayRender("valuearea fonts", { timeoutInMilliseconds: 60000 }) : null;
export const fontsReady =
  typeof document === "undefined"
    ? Promise.resolve()
    : Promise.all([load(SANS, "valuearea-sans.woff2"), load(SERIF, "valuearea-serif.woff2")]).finally(() => {
        if (handle !== null) continueRender(handle);
      });

const SANS_STACK = `"${SANS}", "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", "PingFang SC", "SimHei", sans-serif`;
export const sans = (w: 400 | 500 | 700 | 900 = 500) => ({ fontFamily: SANS_STACK, fontWeight: w });
export const serif = (w: 700 | 900 = 900) => ({ fontFamily: `"${SERIF}", "Noto Serif SC", "Source Han Serif SC", "SimSun", serif`, fontWeight: w });
/** digits and Latin: the same sans with tabular figures, so price ladders line up */
export const num = (w: 500 | 700 | 900 = 700) => ({ fontFamily: SANS_STACK, fontWeight: w, fontVariantNumeric: "tabular-nums" as const, letterSpacing: 0.5 });
