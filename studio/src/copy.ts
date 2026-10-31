import expectancyScript from "./expectancy/script.json";

// All on-screen copy lives here so the CJK font can be subset to exactly these glyphs.
export const COPY = {
  introSub: "代码驱动的动态影像实验室",
  introTag: "CODE  ·  MOTION  ·  3D",
  globeTitle: "全球数据流",
  globeTitleEn: "GLOBAL DATA FLOW",
  globeRoutes: "活跃线路",
  globeThroughput: "实时吞吐",
  globeLatency: "平均延迟",
  globeNodes: "在线节点",
  globeLog: "线路日志",
  waveTitle: "代码即画面",
  waveTitleEn: "CODE IS THE CANVAS",
  cards: [
    { zh: "三维渲染", en: "3D RENDERING", stat: "Three.js" },
    { zh: "GPU 粒子", en: "GPU PARTICLES", stat: "60K+" },
    { zh: "数据可视化", en: "DATA VIZ", stat: "D3 · GEO" },
    { zh: "动效编排", en: "MOTION DESIGN", stat: "GSAP" },
  ],
  outroLine: "每一帧，皆由代码生成",
  outroCredits: "REMOTION  ·  THREE.JS  ·  GSAP  ·  GLSL  ·  FFMPEG",
};

// Every string any composition shows in the CJK font, plus the ASCII/punctuation it mixes in.
const CJK_SOURCES = [COPY, expectancyScript];
const EXTRA = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]_abcdefghijklmnopqrstuvwxyz{|}~·×—…−→";

export const CJK_GLYPHS = Array.from(
  new Set(
    (JSON.stringify(CJK_SOURCES) + EXTRA)
      .split("")
      .filter((c) => c.charCodeAt(0) > 0x2e80 || EXTRA.includes(c)),
  ),
).join("");
