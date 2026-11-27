import { gauss, rng } from "../anim.ts";

/** 图表统一接口
 *  f   ：页内帧
 *  at  ：at(i, frac) = 该页第 i 句口播开始后 frac×句长 的帧（frac 默认 0）
 *  bare：缩略图模式，不画任何文字（避免文字缩小到 24px 以下）
 */
export type ChartProps = { f: number; at: (seg: number, frac?: number) => number; bare?: boolean };

/** 终态：所有元素都已出现（卡片页缩略图用） */
export const FINAL: Omit<ChartProps, "bare"> = { f: 1e6, at: () => 0 };

/** 关键点之间走“布朗桥”：关键点价格精确落在指定位置，中间是带回撤、
 *  波动率忽大忽小（聚集）的随机走势，不再是整齐的直线涨跌。noise = 每根的典型波动。 */
export const keyed = (n: number, keys: [number, number][], seed: number, noise: number) => {
  const r = rng(seed);
  // 波动率聚集：对数波动率做 AR(1)
  const sig: number[] = [];
  let lv = 0;
  for (let i = 0; i < n; i++) {
    lv = 0.72 * lv + 0.62 * gauss(r);
    sig.push(noise * Math.exp(lv * 0.75));
  }
  const out = new Array<number>(n).fill(keys[0][1]);
  for (let k = 0; k + 1 < keys.length; k++) {
    const [x0, y0] = keys[k];
    const [x1, y1] = keys[k + 1];
    const w = [0];
    for (let i = x0 + 1; i <= x1; i++) w.push(w[w.length - 1] + gauss(r) * sig[i]);
    const wEnd = w[w.length - 1];
    for (let i = x0; i <= x1 && i < n; i++) {
      const t = x1 === x0 ? 0 : (i - x0) / (x1 - x0);
      out[i] = y0 + (y1 - y0) * t + (w[i - x0] - t * wEnd);
    }
  }
  const [xl, yl] = keys[keys.length - 1];
  for (let i = xl + 1; i < n; i++) out[i] = out[i - 1] + gauss(r) * sig[i];
  if (xl < n) out[xl] = yl;
  return out;
};

/** 线性比例尺 */
export const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

export const CHART_W = 1540;
export const CHART_H = 580;
