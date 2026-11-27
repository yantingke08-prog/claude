// 第三名：价格行为 —— K 线逐根走出结构 → 高点/低点抬高 → 真突破 → 假突破（长上影刺破阻力后收回）
import React from "react";
import { candlesFrom, pathOf, prog, type Candle } from "../anim.ts";
import { C } from "../theme.ts";
import { Arrow, Candles, Stroke, SvgLabel } from "../ui.tsx";
import { CHART_H, CHART_W, keyed, scale, type ChartProps } from "./common.ts";

const N = 46;
// 摆动点：L0 → H1 → L1 → H2 → L2 → H3 → L3 → H4 → L4 → 假突破 → 回落
const SW = { H1: 6, L1: 10, H2: 16, L2: 19, H3: 25, L3: 28, H4: 33, L4: 36, FK: 39 };
const closes = keyed(
  N,
  [[0, 41], [SW.H1, 51.5], [SW.L1, 46.5], [SW.H2, 57], [SW.L2, 52], [SW.H3, 63.5], [SW.L3, 59.5], [SW.H4, 67.5], [SW.L4, 62.8], [SW.FK - 1, 66.4], [SW.FK, 66.2], [N - 1, 57.5]],
  311,
  0.55,
);
const data: Candle[] = candlesFrom(closes, 312, 0.55);

// 摆动高/低点：让关键 K 线成为左右各 3 根里最高/最低的那根
const around = (i: number) => data.slice(Math.max(0, i - 3), i + 4).filter((_, k, a) => a[k] !== data[i]);
const makeHigh = (i: number) => {
  data[i] = { ...data[i], h: Math.max(data[i].h, ...around(i).map((d) => d.h)) + 0.35 };
};
const makeLow = (i: number) => {
  data[i] = { ...data[i], l: Math.min(data[i].l, ...around(i).map((d) => d.l)) - 0.35 };
};
[SW.H1, SW.H2, SW.H3, SW.H4].forEach(makeHigh);
[SW.L1, SW.L2, SW.L3, SW.L4].forEach(makeLow);

const R1 = data[SW.H2].h; // 被真突破的阻力
const R2 = data[SW.H4].h; // 被假突破的阻力
// 假突破：长上影刺破 R2，收盘回到阻力下方
data[SW.FK] = { o: R2 - 0.9, h: R2 + 3.4, c: R2 - 2.4, l: R2 - 2.9, v: 1 };
data[SW.FK + 1] = { ...data[SW.FK + 1], o: data[SW.FK].c - 0.2 };
// 真突破：H2 之后第一根收盘站上 R1 的阳线
const TB = (() => {
  for (let i = SW.L2 + 1; i < SW.H3; i++) if (data[i].c > R1 && data[i].c > data[i].o) return i;
  return SW.L2 + 3;
})();

const x = scale(0, N - 1, 70, CHART_W - 200);
const lo = Math.min(...data.map((d) => d.l)) - 1;
const hi = Math.max(...data.map((d) => d.h)) + 2.5;
const y = scale(lo, hi, 545, 30);
const SWING: [number, number][] = [
  [0, data[0].l],
  [SW.H1, data[SW.H1].h],
  [SW.L1, data[SW.L1].l],
  [SW.H2, data[SW.H2].h],
  [SW.L2, data[SW.L2].l],
  [SW.H3, data[SW.H3].h],
  [SW.L3, data[SW.L3].l],
  [SW.H4, data[SW.H4].h],
  [SW.L4, data[SW.L4].l],
  [SW.FK, data[SW.FK].h],
];

export const PriceActionChart: React.FC<ChartProps> = ({ f, at, bare }) => {
  const tMain = at(0, 0.05);
  const tHH = at(1, 0);
  const tHL = at(1, 0.18);
  const tTrue = at(1, 0.42);
  const tFake = at(1, 0.6);
  const tFakeTag = at(1, 0.82);
  // 假突破那几根 K 线等到“假突破”这句才出现
  const shown = (i: number) => (i < SW.FK ? 1 : prog(f, tFake + (i - SW.FK) * 2, 0.15));
  const dots: { i: number; v: number; t: number }[] = [
    { i: SW.H1, v: data[SW.H1].h, t: tHH },
    { i: SW.H2, v: data[SW.H2].h, t: tHH },
    { i: SW.L1, v: data[SW.L1].l, t: tHL },
    { i: SW.L2, v: data[SW.L2].l, t: tHL },
  ];
  return (
    <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      <Stroke d={`M${x(SW.H2 - 2)} ${y(R1)} L${x(SW.H3 + 2)} ${y(R1)}`} p={prog(f, tTrue, 0.45)} color={C.white2} width={2} dash="12 8" />
      <Stroke d={`M${x(SW.H4 - 2)} ${y(R2)} L${x(N - 1) + 20} ${y(R2)}`} p={prog(f, tFake, 0.45)} color={C.white2} width={2} dash="12 8" />
      <Candles f={f} at={tMain} data={data} x={x} y={y} bw={15} step={0.032} dim={shown} />
      {/* 结构线：连接摆动点 */}
      <Stroke d={pathOf(SWING.slice(0, -1).map(([i, v]) => [x(i), y(v)]))} p={prog(f, tMain + 22, 1.3)} color={C.goldHi} width={2.2} opacity={0.75} />
      {dots.map(({ i, v, t }) => {
        const q = prog(f, t, 0.25);
        return q > 0 ? <circle key={i} cx={x(i)} cy={y(v)} r={9} fill={C.up} stroke={C.white} strokeWidth={2} opacity={q} /> : null;
      })}
      {/* 抬高关系 */}
      <Stroke d={`M${x(SW.H1)} ${y(data[SW.H1].h) - 18} L${x(SW.H2)} ${y(R1) - 18}`} p={prog(f, tHH, 0.4)} color={C.up} width={2.5} dash="6 6" />
      <Stroke d={`M${x(SW.L1)} ${y(data[SW.L1].l) + 18} L${x(SW.L2)} ${y(data[SW.L2].l) + 18}`} p={prog(f, tHL, 0.4)} color={C.up} width={2.5} dash="6 6" />
      {/* 真突破 / 假突破 标记 */}
      {prog(f, tTrue, 0.3) > 0 && <circle cx={x(TB)} cy={y(R1)} r={17} fill="none" stroke={C.gold} strokeWidth={4} opacity={prog(f, tTrue, 0.3)} />}
      {prog(f, tFakeTag, 0.3) > 0 && <circle cx={x(SW.FK)} cy={y(R2 + 2.2)} r={20} fill="none" stroke={C.goldHi} strokeWidth={4} opacity={prog(f, tFakeTag, 0.3)} />}
      <Arrow f={f} at={tFakeTag + 6} x1={x(SW.FK + 1.5)} y1={y(R2 + 0.5)} x2={x(SW.FK + 5)} y2={y(R2 - 6)} color={C.down} width={5} />
      {!bare && (
        <>
          <SvgLabel f={f} at={tHH} x={(x(SW.H1) + x(SW.H2)) / 2} y={y(R1) - 40} text="高点抬高" color={C.up} anchor="middle" weight={700} />
          <SvgLabel f={f} at={tHL} x={(x(SW.L1) + x(SW.L2)) / 2 + 20} y={y(data[SW.L2].l) + 62} text="低点抬高" color={C.up} anchor="middle" weight={700} />
          <SvgLabel f={f} at={tTrue} x={x(TB) + 28} y={y(R1) + 44} text="真突破" color={C.goldHi} weight={700} />
          <SvgLabel f={f} at={tFakeTag} x={x(SW.FK) - 30} y={y(R2 + 2.2) - 34} text="假突破" color={C.goldHi} anchor="end" weight={700} />
          <SvgLabel f={f} at={tFake} x={x(N - 1) + 30} y={y(R2) + 9} text="阻力" color={C.white2} />
        </>
      )}
    </svg>
  );
};
