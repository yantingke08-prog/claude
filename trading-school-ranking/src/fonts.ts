import { continueRender, delayRender, staticFile } from "remotion";

// 离线字体：public/fonts/tsr-{sans,serif}.woff2（npm run fonts 从 Noto Sans/Serif SC 子集化生成）。
// 文件不存在时回退到系统里的 Noto Sans SC / 微软雅黑，不会报错。
let started = false;
export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("fonts");
  const faces = [
    new FontFace("TSR Sans", `url(${staticFile("fonts/tsr-sans.woff2")}) format('woff2')`, { weight: "100 900" }),
    new FontFace("TSR Serif", `url(${staticFile("fonts/tsr-serif.woff2")}) format('woff2')`, { weight: "200 900" }),
  ];
  Promise.all(
    faces.map((f) =>
      f
        .load()
        .then((l) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(l))
        .catch(() => console.warn(`[fonts] ${f.family} 未找到，使用系统字体`)),
    ),
  ).finally(() => continueRender(handle));
};
