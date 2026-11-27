import { rng } from "../anim.ts";

/** 图表统一接口
 *  f   ：页内帧
 *  at  ：at(i, frac) = 该页第 i 句口播开始后 frac×句长 的帧（frac 默认 0）
 *  bare：缩略图模式，不画任何文字（避免文字缩小到 24px 以下）
 */
export type ChartProps = { f: number; at: (seg: number, frac?: number) => number; bare?: boolean };

/** 终态：所有元素都已出现（卡片页缩略图用） */
export const FINAL: Omit<ChartProps, "bare"> = { f: 1e6, at: () => 0 };

/** 关键点线性插值 + 固定 seed 噪声 */
export const keyed = (n: number, keys: [number, number][], seed: number, noise: number) => {
  const r = rng(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let k = 0;
    while (k + 1 < keys.length - 1 && keys[k + 1][0] <= i) k++;
    const [x0, y0] = keys[k];
    const [x1, y1] = keys[k + 1];
    const t = x1 === x0 ? 0 : (i - x0) / (x1 - x0);
    const isKey = keys.some(([x]) => x === i);
    out.push(y0 + (y1 - y0) * Math.min(1, Math.max(0, t)) + (isKey ? 0 : (r() - 0.5) * 2 * noise));
  }
  return out;
};

/** 线性比例尺 */
export const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

export const CHART_W = 1540;
export const CHART_H = 580;
