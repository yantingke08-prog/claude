import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { continueRender, delayRender } from "remotion";
import { CJK_GLYPHS } from "../copy";

export const DISPLAY = loadUnbounded("normal", { weights: ["300", "800"], subsets: ["latin"] });
export const UI = loadGrotesk("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
export const MONO = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] });

// Noto Sans SC ships ~120 unicode-range chunks per weight. Google's `text=` parameter
// returns a font holding only the glyphs we use: one tiny request instead of hundreds.
export const CJK_FAMILY = "Noto Sans SC";
const cjkHandle = delayRender("Loading subset CJK font");
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;500;900&text=${encodeURIComponent(CJK_GLYPHS)}`;
link.onload = () => {
  Promise.all(["300", "500", "900"].map((w) => document.fonts.load(`${w} 40px "${CJK_FAMILY}"`, CJK_GLYPHS))).then(
    () => continueRender(cjkHandle),
    () => continueRender(cjkHandle),
  );
};
link.onerror = () => continueRender(cjkHandle);
document.head.appendChild(link);

export const zh = (weight: number) => ({ fontFamily: `"${CJK_FAMILY}", sans-serif`, fontWeight: weight });
