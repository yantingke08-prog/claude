import { continueRender, delayRender } from "remotion";
import { COPY } from "./brand";

// The VI sets its headlines in a gold Song/serif face; Noto Serif SC is the free-for-commercial match.
// Only the slogan glyphs are requested (see KnowledgeBase 10-踩坑记录 #9).
export const SERIF = "Noto Serif SC";
const GLYPHS = Array.from(new Set(`${COPY.belief}${COPY.claim}ORDERFLOWISTRUTH L.V.P`)).join("");
const handle = delayRender("Loading Noto Serif SC subset");

fetch(`https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;900&text=${encodeURIComponent(GLYPHS)}`)
  .then((r) => r.text())
  .then((css) => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return Promise.all(["400", "600", "900"].map((w) => document.fonts.load(`${w} 40px "${SERIF}"`, GLYPHS)));
  })
  .finally(() => continueRender(handle));

export const serif = (weight: number) => ({ fontFamily: `"${SERIF}", serif`, fontWeight: weight });
