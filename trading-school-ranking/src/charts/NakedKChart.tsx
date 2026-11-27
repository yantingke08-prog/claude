// 第四名：裸 K —— 指标淡出 → K 线逐根生成 → 长上影 / 吞没 / 关键高低点 → 读出多空
import React from "react";
import { candlesFrom, pathOf, prog, sma, type Candle } from "../anim.ts";
import { C } from "../theme.ts";
import { Arrow, Candles, Stroke, SvgLabel } from "../ui.tsx";
import { CHART_H, CHART_W, keyed, scale, type ChartProps } from "./common.ts";

const N = 30;
const closes = keyed(N, [[0, 50], [10, 58], [16, 65], [17, 65], [23, 56], [24, 55], [25, 57.4], [29, 63]], 404, 0.6);
const data: Candle[] = candlesFrom(closes, 405, 0.6);
// 手工设定关键 K 线
data[17] = { o: 64.6, c: 65.2, h: 71, l: 64.2, v: 0.9 }; // 长上影
data[24] = { o: 56.4, c: 55.3, h: 56.8, l: 54.2, v: 0.6 }; // 被吞没的阴线
data[25] = { o: 55.1, c: 57.6, h: 58, l: 54.6, v: 1 }; // 阳包阴
const KEY_HI = 71;
const KEY_LO = 54.2;

const x = scale(0, N - 1, 90, CHART_W - 260);
const y = scale(48, 73, 540, 40);
const ghostA = sma(closes, 5);
const ghostB = sma(closes, 12);

export const NakedKChart: React.FC<ChartProps> = ({ f, at, bare }) => {
  const tGhostOut = at(0, 0.05);
  const tCandles = at(0, 0.2);
  const tShadow = at(1, 0);
  const tEngulf = at(1, 0.22);
  const tLevels = at(1, 0.42);
  const tRead = at(1, 0.72);
  const ghost = 1 - prog(f, tGhostOut, 0.35);
  const box = (i0: number, i1: number, t: number) => {
    const p = prog(f, t, 0.3);
    const top = y(Math.max(...data.slice(i0, i1 + 1).map((d) => d.h))) - 12;
    const bot = y(Math.min(...data.slice(i0, i1 + 1).map((d) => d.l))) + 12;
    return p > 0 ? <rect x={x(i0) - 22} y={top} width={x(i1) - x(i0) + 44} height={bot - top} fill="none" stroke={C.gold} strokeWidth={3} rx={4} opacity={p} /> : null;
  };
  return (
    <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {/* 被删掉的指标（灰色），淡出 */}
      {ghost > 0 && (
        <g opacity={ghost * 0.6}>
          <path d={pathOf(ghostA.map((v, i) => [x(i), y(v)]))} fill="none" stroke={C.grey} strokeWidth={3} />
          <path d={pathOf(ghostB.map((v, i) => [x(i), y(v) + 10]))} fill="none" stroke={C.grey} strokeWidth={3} />
          {!bare && (
            <text x={x(2)} y={y(60)} fill={C.grey} fontSize={30} fontWeight={700}>
              指标
            </text>
          )}
          <line x1={x(2) - 6} x2={x(2) + 68} y1={y(60) - 10} y2={y(60) - 10} stroke={C.grey} strokeWidth={4} opacity={prog(f, 0, 0.2)} />
        </g>
      )}
      <Candles f={f} at={tCandles} data={data} x={x} y={y} bw={24} step={0.035} />
      {box(17, 17, tShadow)}
      {box(24, 25, tEngulf)}
      <Stroke d={`M${x(8)} ${y(KEY_HI)} L${CHART_W - 120} ${y(KEY_HI)}`} p={prog(f, tLevels, 0.5)} color={C.white2} width={2} dash="12 8" />
      <Stroke d={`M${x(18)} ${y(KEY_LO)} L${CHART_W - 120} ${y(KEY_LO)}`} p={prog(f, tLevels + 6, 0.5)} color={C.white2} width={2} dash="12 8" />
      <Arrow f={f} at={tRead} x1={x(29) + 36} y1={y(60)} x2={x(29) + 96} y2={y(66.5)} color={C.green} width={5} />
      {!bare && (
        <>
          <SvgLabel f={f} at={tShadow} x={x(17)} y={y(KEY_HI) - 26} text="长上影" color={C.goldHi} anchor="middle" />
          <SvgLabel f={f} at={tEngulf} x={x(24.5)} y={y(KEY_LO) + 54} text="吞没" color={C.goldHi} anchor="middle" />
          <SvgLabel f={f} at={tLevels} x={CHART_W - 110} y={y(KEY_HI) + 9} text="关键高点" color={C.white2} />
          <SvgLabel f={f} at={tLevels + 6} x={CHART_W - 110} y={y(KEY_LO) + 9} text="关键低点" color={C.white2} />
          <SvgLabel f={f} at={tRead} x={x(29) + 106} y={y(66.5) + 4} text="多方占优" color={C.green} weight={700} />
        </>
      )}
    </svg>
  );
};
