// 第三名：价格行为 —— 走势结构描边 → 高点/低点抬高 → 真突破 → 假突破
import React from "react";
import { pathOf, prog } from "../anim.ts";
import { C } from "../theme.ts";
import { Stroke, SvgLabel } from "../ui.tsx";
import { CHART_H, CHART_W, scale, type ChartProps } from "./common.ts";

const x = scale(0, 12.6, 80, CHART_W - 200);
const y = scale(36, 74, 545, 30);
type P = [number, number];
// 主体结构（到 L4）
const MAIN: P[] = [[0, 40], [1.6, 52], [2.6, 46], [4.2, 58], [5.2, 52], [6.6, 64], [7.6, 59], [9, 68], [10, 62.5]];
// 假突破腿
const FAKE: P[] = [[10, 62.5], [11, 70.6], [12.6, 57]];
const px = (p: P): P => [x(p[0]), y(p[1])];

const R1 = 58; // H2：被真突破的阻力
const R2 = 68; // H4：被假突破的阻力
// 真突破点：L2→H3 线段穿过 R1 的位置
const tb = 5.2 + ((R1 - 52) / (64 - 52)) * (6.6 - 5.2);

export const PriceActionChart: React.FC<ChartProps> = ({ f, at, bare }) => {
  const tMain = at(0, 0.05);
  const tHH = at(1, 0);
  const tHL = at(1, 0.18);
  const tTrue = at(1, 0.42);
  const tFake = at(1, 0.6);
  const tFakeTag = at(1, 0.82);
  const pMain = prog(f, tMain, 1.5);
  const dots: { p: P; col: string; t: number }[] = [
    { p: MAIN[1], col: C.white2, t: tHH },
    { p: MAIN[3], col: C.green, t: tHH },
    { p: MAIN[2], col: C.white2, t: tHL },
    { p: MAIN[4], col: C.green, t: tHL },
  ];
  return (
    <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      <Stroke d={`M${x(3.4)} ${y(R1)} L${x(8)} ${y(R1)}`} p={prog(f, tTrue, 0.45)} color={C.white2} width={2} dash="12 8" />
      <Stroke d={`M${x(8.2)} ${y(R2)} L${x(12.6)} ${y(R2)}`} p={prog(f, tFake, 0.45)} color={C.white2} width={2} dash="12 8" />
      <Stroke d={pathOf(MAIN.map(px))} p={pMain} color={C.white} width={4} />
      <Stroke d={pathOf(FAKE.map(px))} p={prog(f, tFake, 0.6)} color={C.white} width={4} />
      {dots.map(({ p, col, t }, i) => {
        const q = prog(f, t, 0.25);
        return q > 0 ? <circle key={i} cx={x(p[0])} cy={y(p[1])} r={9} fill={col} opacity={q} /> : null;
      })}
      {/* 抬高关系：两点之间的细虚线 */}
      <Stroke d={`M${x(1.6)} ${y(52)} L${x(4.2)} ${y(58)}`} p={prog(f, tHH, 0.4)} color={C.green} width={2} dash="6 6" />
      <Stroke d={`M${x(2.6)} ${y(46)} L${x(5.2)} ${y(52)}`} p={prog(f, tHL, 0.4)} color={C.green} width={2} dash="6 6" />
      {/* 真突破 / 假突破 标记 */}
      {prog(f, tTrue, 0.3) > 0 && <circle cx={x(tb)} cy={y(R1)} r={15} fill="none" stroke={C.gold} strokeWidth={4} opacity={prog(f, tTrue, 0.3)} />}
      {prog(f, tFakeTag, 0.3) > 0 && <circle cx={x(11)} cy={y(70.6)} r={15} fill="none" stroke={C.red} strokeWidth={4} opacity={prog(f, tFakeTag, 0.3)} />}
      {!bare && (
        <>
          <SvgLabel f={f} at={tHH} x={x(4.2)} y={y(58) - 26} text="高点抬高" color={C.green} anchor="middle" />
          <SvgLabel f={f} at={tHL} x={x(5.2) + 6} y={y(52) + 50} text="低点抬高" color={C.green} anchor="middle" />
          <SvgLabel f={f} at={tTrue} x={x(tb) + 30} y={y(R1) + 40} text="真突破" color={C.goldHi} weight={700} />
          <SvgLabel f={f} at={tFakeTag} x={x(11)} y={y(70.6) - 30} text="假突破" color={C.red} anchor="middle" weight={700} />
          <SvgLabel f={f} at={tFake} x={x(12.6) + 14} y={y(R2) + 9} text="阻力" color={C.white2} />
        </>
      )}
    </svg>
  );
};
