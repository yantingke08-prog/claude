import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { continueRender, delayRender } from "remotion";
import { CJK_GLYPHS } from "../copy";

export const DISPLAY = loadUnbounded("normal", { weights: ["300", "800"], subsets: ["latin"] });
export const UI = loadGrotesk("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
export const MONO = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] });

// Noto Sans SC ships ~120 unicode-range chunks per weight. Google's `text=` parameter
// returns a font holding only the glyphs we use. With hundreds of glyphs the URL gets too
// long, so we request chunks and stamp each @font-face with a unicode-range listing its
// glyphs: the browser then stitches the chunks into one family, glyph by glyph.
export const CJK_FAMILY = "Noto Sans SC";
const CHUNK = 120;
const cjkHandle = delayRender("Loading subset CJK font");
const chunks: string[][] = [];
const glyphs = Array.from(CJK_GLYPHS);
for (let i = 0; i < glyphs.length; i += CHUNK) chunks.push(glyphs.slice(i, i + CHUNK));

const loadChunk = async (chunk: string[]) => {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;500;900&text=${encodeURIComponent(chunk.join(""))}`;
  const css = await (await fetch(url)).text();
  const range = chunk.map((c) => `U+${c.codePointAt(0)!.toString(16)}`).join(",");
  const style = document.createElement("style");
  style.textContent = css.replace(/@font-face\s*{/g, `@font-face { unicode-range: ${range};`);
  document.head.appendChild(style);
};

Promise.all(chunks.map(loadChunk))
  .then(() => Promise.all(["300", "500", "900"].map((w) => document.fonts.load(`${w} 40px "${CJK_FAMILY}"`, CJK_GLYPHS))))
  .finally(() => continueRender(cjkHandle));

export const zh = (weight: number) => ({ fontFamily: `"${CJK_FAMILY}", sans-serif`, fontWeight: weight });
