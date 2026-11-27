// 第五名：传统指标与形态 —— K 线逐根生成 → 均线描边 → MACD → 头肩顶 → 金叉买 / 死叉卖
import React from "react";
import { candlesFrom, ema, pathOf, prog, sma } from "../anim.ts";
import { C, FS } from "../theme.ts";
import { Candles, Stroke, SvgLabel } from "../ui.tsx";
import { CHART_H, CHART_W, keyed, scale, type ChartProps } from "./common.ts";

const N = 44;
const closes = keyed(
  N,
  [[0, 60], [8, 52], [18, 66], [21, 70], [24, 65], [28, 76], [31, 65], [34, 70], [38, 61], [43, 54]],
  505,
  0.7,
);
const data = candlesFrom(closes, 506, 0.9);
const ma5 = sma(closes, 5);
const ma20 = sma(closes, 14);
const dif = ema(closes, 6).map((v, i) => v - ema(closes, 13)[i]);
const dea = ema(dif, 5);
const hist = dif.map((d, i) => 2 * (d - dea[i]));

// 均线交叉点（金叉：短上穿长；死叉：短下穿长）
const crossAt = (from: number, up: boolean) => {
  for (let i = Math.max(1, from); i < N; i++) {
    const a = ma5[i - 1] - ma20[i - 1];
    const b = ma5[i] - ma20[i];
    if (up ? a <= 0 && b > 0 : a >= 0 && b < 0) return i;
  }
  return up ? 12 : 37;
};
const GOLDEN = crossAt(9, true);
const DEATH = crossAt(32, false);

const x = scale(0, N - 1, 70, CHART_W - 150);
const lo = Math.min(...data.map((d) => d.l)) - 1;
const hi = Math.max(...data.map((d) => d.h)) + 2;
const y = scale(lo, hi, 370, 30);
const hMax = Math.max(...hist.map(Math.abs));
const MACD_MID = 488;
const yh = (v: number) => MACD_MID - (v / hMax) * 62;

const neckY = y((closes[24] + closes[31]) / 2 - 0.8);

export const IndicatorChart: React.FC<ChartProps> = ({ f, at, bare }) => {
  const t0 = at(0);
  const tMA = at(0, 0.3);
  const tMACD = at(0, 0.55);
  const tHS = at(0, 0.78);
  const tGold = at(1, 0);
  const tDeath = at(1, 0.45);
  const pMA = prog(f, tMA, 0.9);
  const pMACD = prog(f, tMACD, 0.6);
  return (
    <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {/* 分隔线 */}
      <line x1={40} x2={CHART_W - 40} y1={410} y2={410} stroke={C.lineSoft} strokeWidth={1.5} />
      <Candles f={f} at={t0} data={data} x={x} y={y} bw={17} step={0.025} />
      <Stroke d={pathOf(ma5.map((v, i) => [x(i), y(v)]))} p={pMA} color={C.white} width={2.5} opacity={0.85} />
      <Stroke d={pathOf(ma20.map((v, i) => [x(i), y(v)]))} p={pMA} color={C.white2} width={2.5} opacity={0.55} />
      {/* MACD 柱 + 两线 */}
      <g opacity={pMACD}>
        <line x1={50} x2={CHART_W - 130} y1={MACD_MID} y2={MACD_MID} stroke={C.grey} strokeWidth={1} />
        {hist.map((h, i) => {
          const p = prog(f, tMACD + i * 0.6, 0.15);
          const hh = Math.abs(yh(h) - MACD_MID) * p;
          return <rect key={i} x={x(i) - 6} y={h >= 0 ? MACD_MID - hh : MACD_MID} width={12} height={Math.max(1, hh)} fill={h >= 0 ? C.green : C.red} opacity={0.75} />;
        })}
      </g>
      <Stroke d={pathOf(dif.map((v, i) => [x(i), yh(v * 0.5)]))} p={prog(f, tMACD + 6, 0.6)} color={C.white} width={2} opacity={0.7} />
      {/* 头肩顶：颈线 */}
      <Stroke d={`M${x(19)} ${neckY} L${x(36)} ${neckY}`} p={prog(f, tHS, 0.5)} color={C.white2} width={2} dash="10 8" />
      {/* 金叉 / 死叉 圆点 */}
      {[{ i: GOLDEN, t: tGold, col: C.green }, { i: DEATH, t: tDeath, col: C.red }].map(({ i, t, col }) => {
        const p = prog(f, t, 0.35);
        return p > 0 ? <circle key={i} cx={x(i)} cy={y(ma5[i])} r={16 * p} fill="none" stroke={C.gold} strokeWidth={4} /> : null;
      })}
      {!bare && (
        <>
          <SvgLabel f={f} at={tMA + 12} x={x(N - 1) + 22} y={y(ma5[N - 1]) + 10} text="均线" color={C.white} />
          <SvgLabel f={f} at={tMACD} x={56} y={440} text="MACD" color={C.white2} size={FS.labelSmall} />
          <SvgLabel f={f} at={tHS} x={x(28)} y={y(data[28].h) - 22} text="头肩顶" color={C.white} anchor="middle" />
          <SvgLabel f={f} at={tGold} x={x(GOLDEN)} y={y(ma5[GOLDEN]) + 62} text="金叉买入" color={C.green} anchor="middle" size={30} weight={700} />
          <SvgLabel f={f} at={tDeath} x={x(DEATH) + 10} y={y(ma5[DEATH]) - 34} text="死叉卖出" color={C.red} anchor="start" size={30} weight={700} />
        </>
      )}
    </svg>
  );
};
