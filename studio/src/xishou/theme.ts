// LVP订单流 · 吸收 explainer — one design system for every shot.
export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const C = {
  red: "#D11F2D", // sellers, risk, invalidation
  redText: "#F0444F", // same hue, lifted for small text on black
  green: "#1FA34A", // buyers, support, confirmation
  greenText: "#35C266",
  navy: "#0B1220",
  bg: "#07090D",
  text: "#F2F5F8",
  sub: "#91A0B5",
  cyan: "#5CD6FF", // key levels
  amber: "#FFB547", // absorption zone, emphasis
  amberZone: "rgba(255,181,71,0.14)",
  grid: "rgba(92,214,255,0.055)",
  gridStrong: "rgba(145,160,181,0.16)",
  panel: "rgba(11,18,32,0.78)",
  border: "rgba(145,160,181,0.22)",
  off: "#39424F",
} as const;

export type Tone = "red" | "green" | "cyan" | "amber";
export const toneColor = (t: Tone) =>
  t === "red" ? C.redText : t === "green" ? C.greenText : t === "cyan" ? C.cyan : C.amber;

// Local fonts only (Windows first). Two families, two weights: 400 / 700.
export const FONT = '"Microsoft YaHei", "Noto Sans SC", "PingFang SC", sans-serif';
export const MONO = 'Consolas, "Cascadia Mono", "Courier New", monospace';

// Platform-safe layout (px). Top ≥110, bottom ≥260, sides ≥64.
export const SAFE = { top: 110, bottom: 260, side: 64 };
export const L = {
  headerY: 118,
  stageTop: 262,
  stageBottom: 1372,
  captionTop: 1404,
  captionBottom: 1590,
  disclaimerY: 1612, // bottom edge of last text: 1640 < 1660
  left: SAFE.side,
  right: W - SAFE.side,
};

export const RADIUS = 14;
export const STROKE = 2;
// type scale: only these sizes
export const T = { xs: 22, s: 26, m: 32, l: 44, cap: 58, xl: 84, xxl: 112 };
