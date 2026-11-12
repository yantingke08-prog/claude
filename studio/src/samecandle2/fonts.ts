import { continueRender, delayRender } from "remotion";
import { allBeatText } from "./beats";
import TL from "./timeline.json";

// Noto Sans SC 500 / 700 / 900 for all Chinese, Space Grotesk 600 for numbers and Latin.
// Fetched from Google Fonts as glyph subsets of exactly the text the film shows (keeps requests small).
const SANS = "Noto Sans SC";
const NUM = "Space Grotesk";

const glyphs = Array.from(new Set(Array.from(allBeatText() + TL.captions.map((c) => c.text).join("") + "示意图答案在这里?？为什么结局完全不同同一根大阳线三种图命运K线科普" + "0123456789.,:+-−×→·%ABCKk ").filter((c) => c.trim())));
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
export const fontsReady = Promise.all([...chunks.map((c) => load(SANS, ":wght@500;700;900", c)), load(NUM, ":wght@500;700", Array.from("0123456789.,:+-−×%ABCK "))])
  .then(() => Promise.all([...["500", "700", "900"].map((w) => document.fonts.load(`${w} 40px "${SANS}"`, sample)), document.fonts.load(`700 40px "${NUM}"`, "0123")]))
  .catch((e) => console.error("font load failed", e))
  .finally(() => continueRender(handle));

export const sans = (w: 500 | 700 | 900 = 500) => ({ fontFamily: `"${SANS}", "Microsoft YaHei", sans-serif`, fontWeight: w });
export const num = (w: 500 | 700 = 700) => ({ fontFamily: `"${NUM}", "${SANS}", sans-serif`, fontWeight: w, fontVariantNumeric: "tabular-nums" as const });
