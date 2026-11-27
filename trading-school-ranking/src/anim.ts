import { Easing, interpolate } from "remotion";
import { FPS } from "./theme.ts";

export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const s2f = (s: number) => Math.round(s * FPS);

/** 0→1：从 at 帧开始，持续 dur 秒；之前 0，之后 1（进入后保持静止） */
export const prog = (f: number, at: number, dur: number, ease = easeOut) =>
  interpolate(f, [at, at + Math.max(1, dur * FPS)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** 线性 0→1 */
export const lin = (f: number, at: number, dur: number) =>
  interpolate(f, [at, at + Math.max(1, dur * FPS)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** 文字成组进入：透明度 + 10px 上移，结束后完全静止 */
export const textIn = (f: number, at: number, dur = 0.3) => {
  const p = prog(f, at, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * 10}px)` } as const;
};

/** 固定 seed 的伪随机（mulberry32） */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type Candle = { o: number; h: number; l: number; c: number; v: number };

/** 标准正态（Box-Muller） */
export const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r());

/** 按 closes 生成带影线的 K 线（固定 seed）。
 *  实体大小跟着收盘价跳动走；影线长短按“大多短、少数很长”的长尾分布；
 *  开盘价偶尔跳空。wick = 影线尺度（价格单位）。 */
export const candlesFrom = (closes: number[], seed: number, wick = 0.6): Candle[] => {
  const r = rng(seed);
  const tail = () => {
    const u = r();
    return u < 0.62 ? 0.08 + r() * 0.45 : u < 0.9 ? 0.5 + r() * 0.9 : 1.5 + r() * 1.9;
  };
  return closes.map((c, i) => {
    const prev = i === 0 ? c - (r() - 0.5) * wick * 2 : closes[i - 1];
    const move = Math.abs(c - prev);
    const gap = r() < 0.12 ? gauss(r) * wick * 0.9 : gauss(r) * wick * 0.12;
    const o = prev + gap;
    const hi = Math.max(o, c);
    const lo = Math.min(o, c);
    const sz = wick * 0.55 + move * 0.35;
    const v = Math.min(1, 0.1 + Math.min(0.55, (move / wick) * 0.22) + r() * r() * 0.5);
    return { o, c, h: hi + tail() * sz, l: lo - tail() * sz, v };
  });
};

/** 简单移动平均 */
export const sma = (xs: number[], n: number) => xs.map((_, i) => {
  const a = xs.slice(Math.max(0, i - n + 1), i + 1);
  return a.reduce((p, q) => p + q, 0) / a.length;
});

export const ema = (xs: number[], n: number) => {
  const k = 2 / (n + 1);
  const out: number[] = [];
  xs.forEach((x, i) => out.push(i === 0 ? x : x * k + out[i - 1] * (1 - k)));
  return out;
};

/** SVG 路径 */
export const pathOf = (pts: [number, number][]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

export const polyLen = (pts: [number, number][]) => {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return n;
};
