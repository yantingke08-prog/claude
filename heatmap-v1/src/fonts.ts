import { continueRender, delayRender, staticFile } from "remotion";

export const SANS = "'HM Sans', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
export const SERIF = "'HM Serif', 'Noto Serif SC', 'SimSun', serif";

let started = false;
/** Offline Noto SC subsets (scripts/fonts.py), loaded once per tab before the first frame. */
export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("fonts");
  const faces = [
    new FontFace("HM Sans", `url(${staticFile("fonts/heatmap-sans.woff2")}) format('woff2')`, { weight: "100 900" }),
    new FontFace("HM Serif", `url(${staticFile("fonts/heatmap-serif.woff2")}) format('woff2')`, { weight: "200 900" }),
  ];
  Promise.all(faces.map((f) => f.load().then((l) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(l))))
    .catch((e) => console.warn("font load failed, using system fallback", e))
    .finally(() => continueRender(handle));
};
