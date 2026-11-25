// LVP订单流 · 三种成交 — one design system for every shot.
export const W = 1080;
export const H = 1920;

export const C = {
  red: "#D11F2D", // sell, risk, forced
  redText: "#F0444F",
  green: "#1FA34A", // buy, support, acceptance
  greenText: "#35C266",
  cyan: "#5CD6FF", // key level, resting (passive) orders
  amber: "#FFB547", // emphasis, aggressive urgency
  bg: "#07090D",
  navy: "#0B1220",
  text: "#F2F5F8",
  sub: "#91A0B5",
  off: "#39424F",
  grid: "rgba(92,214,255,0.055)",
  panel: "rgba(11,18,32,0.82)",
  border: "rgba(145,160,181,0.22)",
} as const;

export type Tone = "red" | "green" | "cyan" | "amber";
export const toneColor = (t: Tone) => (t === "red" ? C.redText : t === "green" ? C.greenText : t === "cyan" ? C.cyan : C.amber);

// Local fonts only: render needs no network.
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
  disclaimerY: 1612, // last text ends ≈1642 < 1660
  left: SAFE.side,
  right: W - SAFE.side,
};
export const T = { xs: 22, s: 26, m: 32, l: 44, cap: 58, xl: 84, xxl: 112 };
export const RADIUS = 14;
