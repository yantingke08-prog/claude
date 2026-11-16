import { continueRender, delayRender } from "remotion";
import { allText } from "./text";
import TL from "./timeline.json";

// Noto Sans SC 500/700/900 for Chinese, Noto Serif SC 900 for the conclusion, Space Grotesk for digits and Latin.
// Fetched from Google Fonts as glyph subsets of exactly the text the film shows (see KnowledgeBase 10-踩坑记录 #9/#14).
const SANS = "Noto Sans SC";
const SERIF = "Noto Serif SC";
const NUM = "Space Grotesk";

const glyphs = Array.from(new Set(Array.from(allText() + TL.captions.map((c) => c.text).join("") + "0123456789.,:+-%×").filter((c) => c.trim())));
const CHUNK = 100;
const handle = delayRender("Loading font subsets", { timeoutInMilliseconds: 120000 });
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
const ASCII = Array.from({ length: 95 }, (_, k) => String.fromCharCode(32 + k)).filter((c) => c.trim());
const serifText = Array.from(new Set(Array.from("市场追的不是你，是流动性。你的止损为什么总被精准扫掉？")));
export const fontsReady = Promise.all([
  ...chunks.map((c) => load(SANS, ":wght@500;700;900", c)),
  load(SERIF, ":wght@700;900", serifText),
  load(NUM, ":wght@500;700", ASCII),
])
  .then(() =>
    Promise.all([
      ...["500", "700", "900"].map((w) => document.fonts.load(`${w} 40px "${SANS}"`, sample)),
      ...["700", "900"].map((w) => document.fonts.load(`${w} 40px "${SERIF}"`, serifText.join(""))),
      document.fonts.load(`700 40px "${NUM}"`, "0123"),
    ]),
  )
  .catch((e) => console.error("font load failed", e))
  .finally(() => continueRender(handle));

export const sans = (w: 500 | 700 | 900 = 500) => ({ fontFamily: `"${SANS}", "Microsoft YaHei", "PingFang SC", sans-serif`, fontWeight: w });
export const serif = (w: 700 | 900 = 900) => ({ fontFamily: `"${SERIF}", "Songti SC", serif`, fontWeight: w });
export const num = (w: 500 | 700 = 700) => ({ fontFamily: `"${NUM}", "${SANS}", sans-serif`, fontWeight: w, fontVariantNumeric: "tabular-nums" as const });
