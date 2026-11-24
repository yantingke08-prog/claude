// All colours live here. Components never write a hex value.
// 红=涨，绿=跌，紫=压力，蓝=支撑 — never mixed up.
export const C = {
  up: "#FF3B5C", // 涨 / 阳线 / 多 / 买 / B 气泡 / ✓
  down: "#35EFB9", // 跌 / 阴线 / 空 / 卖 / 空 气泡 / 破位
  resistance: "#8B5CF6", // 压力 / 孤立高点 / 概念定义
  resistanceDeep: "#6D3FE0",
  support: "#3B82F6", // 支撑 / 孤立低点
  bg: "#0B1020",
  bgCenter: "#141C36",
  bgEdge: "#070A14",
  grid: "#1B2440",
  text: "#FFFFFF",
  muted: "#C7CEDB",
  brand: "#FF3B5C",
  brandSolid: "#E0242E", // the logo's solid red: brand name on its own screen (flat fill, no stroke / glow)
  doji: "#8A93A6", // 十字星 (open ≈ close): neither up nor down
  ghost: "#C7CEDB", // hypothetical (if-this-happens) candles, drawn as outlines
} as const;

/** neutral greys for code-built devices (B-roll stand-ins) and black cards — never semantic */
export const N = {
  black: "#000000",
  void: "#05070D",
  device: "#111521",
  bezel: "#0D1019",
  deviceRim: "#2A3150",
  bezelRim: "#262C44",
  base: "#151A28",
  key: "#232A3D",
  keyShadow: "#12161F",
  deck: "#161B29",
  pen: "#FFFFFF",
} as const;

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const FONT_FAMILY = "LVPSans";
export const FONT = `"${FONT_FAMILY}","Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif`;
export const MONO = `"JetBrains Mono","Consolas","Menlo",monospace`;

/** L.V.P. = Location · Volume · Pattern */
export const BRAND = { mark: "L.V.P.订单流", full: "LOCATION · VOLUME · PATTERN" } as const;

export const DISCLAIMER = "个人经验分享，不构成投资建议，市场有风险，投资需谨慎。";

/** glow as a CSS drop-shadow (works on HTML and on SVG elements) */
export const glow = (color: string, r = 8, alpha = 0.55) => `drop-shadow(0 0 ${r}px ${withAlpha(color, alpha)})`;
export const withAlpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// layout bands (1920x1080)
export const CAPTION_BOTTOM = 90; // caption baseline offset from the bottom
export const CHART_BAND = { top: 170, bottom: 830 }; // keep chart content out of the caption band
