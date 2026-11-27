// 第二名：威科夫 —— K 线逐根走出 吸筹 / 拉升 / 派发 / 下跌 四阶段 → 成交量柱逐根生成
import React from "react";
import { candlesFrom, prog, type Candle } from "../anim.ts";
import { C, FPS } from "../theme.ts";
import { Arrow, Candles, SvgLabel } from "../ui.tsx";
import { CHART_H, CHART_W, keyed, scale, type ChartProps } from "./common.ts";

const N = 61;
const price = keyed(
  N,
  [[0, 44], [3, 41.2], [6, 44.8], [9, 42], [12, 40.3], [14, 44.6], [16, 43.2], [18, 45.2], [22, 51], [25, 49.2], [30, 64], [33, 67], [36, 62.8], [39, 66.2], [41, 67.6], [43, 63.6], [46, 64.2], [50, 56], [52, 58], [56, 49], [60, 43]],
  202,
  0.7,
);
const data: Candle[] = candlesFrom(price, 204, 0.7);
// 弹簧（Spring）：跌破区间下沿后快速收回；上冲回落（UTAD）：刺破派发区上沿后收回
data[12] = { o: 41.6, h: 41.9, l: 38.6, c: 41.4, v: 1 };
data[41] = { o: 66.4, h: 70.2, l: 65.9, c: 66.8, v: 1 };

const x = scale(0, N - 1, 70, CHART_W - 70);
const y = scale(Math.min(...data.map((d) => d.l)) - 1, Math.max(...data.map((d) => d.h)) + 2.5, 420, 40);
const VOL_BASE = 560;
const VOL_H = 92;

type Phase = { name: string; col: string; i0: number; i1: number; box?: boolean };
const PHASES: Phase[] = [
  { name: "吸筹", col: C.up, i0: 0, i1: 18, box: true },
  { name: "拉升", col: C.up, i0: 18, i1: 30 },
  { name: "派发", col: C.down, i0: 30, i1: 46, box: true },
  { name: "下跌", col: C.down, i0: 46, i1: 60 },
];
// 区间框：去掉弹簧 / 上冲回落那根，取其余 K 线的实体范围
const boxOf = (ph: Phase) => {
  const bars = data.slice(ph.i0, ph.i1 + 1).filter((_, k) => ![12, 41].includes(ph.i0 + k));
  return { lo: Math.min(...bars.map((d) => Math.min(d.o, d.c))) - 0.4, hi: Math.max(...bars.map((d) => Math.max(d.o, d.c))) + 0.4 };
};

export const WyckoffChart: React.FC<ChartProps> = ({ f, at, bare }) => {
  const tLine = at(0, 0.05);
  const tPhase = [at(1, 0), at(1, 0.14), at(1, 0.28), at(1, 0.42)];
  const tVol = at(1, 0.6);
  const acc = boxOf(PHASES[0]);
  const dis = boxOf(PHASES[2]);
  return (
    <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {/* 区间框（吸筹 / 派发） */}
      {PHASES.map((ph, k) => {
        if (!ph.box) return null;
        const b = boxOf(ph);
        const p = prog(f, tPhase[k], 0.35);
        return p > 0 ? (
          <rect key={ph.name} x={x(ph.i0) - 10} y={y(b.hi)} width={(x(ph.i1) - x(ph.i0) + 20) * p} height={y(b.lo) - y(b.hi)} fill={ph.col} fillOpacity={0.1} stroke={ph.col} strokeWidth={2} strokeOpacity={0.9} rx={4} />
        ) : null;
      })}
      <Candles f={f} at={tLine} data={data} x={x} y={y} bw={13} step={0.026} />
      {/* 拉升 / 下跌 箭头 */}
      <Arrow f={f} at={tPhase[1]} x1={x(19)} y1={y(acc.hi + 2.5)} x2={x(27)} y2={y(62)} color={C.up} />
      <Arrow f={f} at={tPhase[3]} x1={x(48)} y1={y(dis.lo - 1)} x2={x(58)} y2={y(48)} color={C.down} />
      {/* 成交量：颜色跟 K 线（红涨绿跌） */}
      <line x1={40} x2={CHART_W - 40} y1={VOL_BASE} y2={VOL_BASE} stroke={C.grey} strokeWidth={1} opacity={prog(f, tVol, 0.2)} />
      {data.map((d, i) => {
        const p = prog(f, tVol + i * 0.02 * FPS, 0.15);
        if (p <= 0) return null;
        const h = d.v * VOL_H * p;
        return <rect key={i} x={x(i) - 7} y={VOL_BASE - h} width={14} height={h} fill={d.c >= d.o ? C.up : C.down} opacity={0.85} />;
      })}
      {!bare && (
        <>
          <SvgLabel f={f} at={tPhase[0]} x={x(9)} y={y(acc.hi) - 18} text="吸筹" color={C.up} anchor="middle" size={32} weight={700} />
          <SvgLabel f={f} at={tPhase[1]} x={x(21)} y={y(57)} text="拉升" color={C.up} anchor="end" size={32} weight={700} />
          <SvgLabel f={f} at={tPhase[2]} x={x(38)} y={y(dis.hi) - 34} text="派发" color={C.down} anchor="middle" size={32} weight={700} />
          <SvgLabel f={f} at={tPhase[3]} x={x(55) + 16} y={y(57)} text="下跌" color={C.down} size={32} weight={700} />
          <SvgLabel f={f} at={tVol} x={52} y={VOL_BASE - VOL_H - 4} text="成交量" color={C.white2} size={26} />
        </>
      )}
    </svg>
  );
};
