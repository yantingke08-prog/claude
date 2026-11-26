// Pure constants — imported by the film and by scripts/check.mts (no React here).

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 2100; // 70 s

/** Heatmap grid: columns = time snapshots, rows = price levels. */
export const COLS = 90;
export const ROWS = 56;

/** World size of the heatmap plane (x = time, y = price, z = liquidity height). */
export const PLANE_W = 9;
export const PLANE_H = 11.2;
export const CW = PLANE_W / COLS;
export const CH = PLANE_H / ROWS;

/** Illustrative price axis: row 0 = BASE_PRICE, one tick per row. */
export const BASE_PRICE = 2486.0;
export const TICK = 0.5;

export const cellX = (c: number) => -PLANE_W / 2 + (c + 0.5) * CW;
export const cellY = (r: number) => -PLANE_H / 2 + (r + 0.5) * CH;
export const priceOf = (r: number) => BASE_PRICE + r * TICK;

/** Palette. Thermal ramp for liquidity; 红涨绿跌 for the traded-price line only. */
export const C = {
  bg: "#05070c",
  ink: "#f3ecdf", // warm white text
  mute: "#8d95a6",
  faint: "#4a5262",
  up: "#ff4a5f", // price up = red
  down: "#22d39a", // price down = green
  heat: "#ffd27a", // thick liquidity tag colour (matches the ramp's hot end)
  cold: "#6f8fd8", // thin liquidity tag colour (matches the ramp's cold end)
};

/** Liquidity colour ramp: dark/cold = thin, bright/warm = thick. Stops are [t, hex]. */
export const RAMP: [number, string][] = [
  [0.0, "#060912"],
  [0.14, "#0b1a33"],
  [0.3, "#173c6b"],
  [0.46, "#3f5fa6"],
  [0.6, "#8a6aa0"],
  [0.72, "#d9873a"],
  [0.86, "#f0b04e"],
  [1.0, "#ffdf9a"],
];

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);

const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const RAMP_RGB = RAMP.map(([t, h]) => [t, ...hexRgb(h)] as [number, number, number, number]);

/** Ramp lookup into out[0..2] (linear-ish sRGB 0..1). */
export const rampInto = (v: number, out: [number, number, number]) => {
  const x = clamp(v);
  for (let i = 1; i < RAMP_RGB.length; i++) {
    const b = RAMP_RGB[i];
    if (x <= b[0]) {
      const a = RAMP_RGB[i - 1];
      const t = (x - a[0]) / (b[0] - a[0]);
      out[0] = lerp(a[1], b[1], t);
      out[1] = lerp(a[2], b[2], t);
      out[2] = lerp(a[3], b[3], t);
      return out;
    }
  }
  const l = RAMP_RGB[RAMP_RGB.length - 1];
  out[0] = l[1];
  out[1] = l[2];
  out[2] = l[3];
  return out;
};

export const rampCss = () => RAMP.map(([t, h]) => `${h} ${(t * 100).toFixed(0)}%`).join(", ");

/** Deterministic hash noise. */
export const hash = (a: number, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
};
/** Smooth 1-D value noise. */
export const vnoise = (x: number, seed: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u);
};
