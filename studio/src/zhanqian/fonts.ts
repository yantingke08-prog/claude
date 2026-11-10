import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { continueRender, delayRender } from "remotion";
import { allCopy } from "./copy";
import TL from "./timeline.json";

// Two Chinese families, three weights in total:
//   Source Han Serif (Noto Serif SC) SemiBold 600: titles and key conclusions
//   Source Han Sans (Noto Sans SC) Medium 500: captions and labels; Bold 700 for label titles
// Numbers: IBM Plex Mono Medium. The CJK faces are fetched as glyph subsets of exactly the text the film shows.
const MONO = loadPlexMono("normal", { weights: ["500"], subsets: ["latin"] });
const SERIF = "Noto Serif SC";
const SANS = "Noto Sans SC";

const glyphs = Array.from(new Set(Array.from(allCopy() + TL.captions.map((c) => c.text).join("") + "0123456789.,:+-−×✓✕·%").filter((c) => c.trim())));
const CHUNK = 100;
const handle = delayRender("Loading CJK font subsets");
const load = async (family: string, axis: string, chunk: string[]) => {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}${axis}&text=${encodeURIComponent(chunk.join(""))}`;
  const css = await (await fetch(url)).text();
  const range = chunk.map((c) => `U+${c.codePointAt(0)!.toString(16)}`).join(",");
  const el = document.createElement("style");
  el.textContent = css.replace(/@font-face\s*{/g, `@font-face { unicode-range: ${range};`);
  document.head.appendChild(el);
};
const chunks: string[][] = [];
for (let i = 0; i < glyphs.length; i += CHUNK) chunks.push(glyphs.slice(i, i + CHUNK));
const sample = glyphs.join("");
Promise.all(chunks.flatMap((c) => [load(SERIF, ":wght@600", c), load(SANS, ":wght@500;700", c)]))
  .then(() => Promise.all([document.fonts.load(`600 40px "${SERIF}"`, sample), ...["500", "700"].map((w) => document.fonts.load(`${w} 40px "${SANS}"`, sample))]))
  .finally(() => continueRender(handle));

export const serif = () => ({ fontFamily: `"${SERIF}", serif`, fontWeight: 600 });
export const sans = (w: 500 | 700 = 500) => ({ fontFamily: `"${SANS}", sans-serif`, fontWeight: w });
export const mono = () => ({ fontFamily: `${MONO.fontFamily}, monospace`, fontWeight: 500, fontVariantNumeric: "tabular-nums" as const });
