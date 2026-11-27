// 第二名：威科夫 —— 价格路径描边 → 吸筹 / 拉升 / 派发 / 下跌 四阶段 → 成交量柱逐根生成
import React from "react";
import { pathOf, prog, rng } from "../anim.ts";
import { C, FPS } from "../theme.ts";
import { Arrow, Stroke, SvgLabel } from "../ui.tsx";
import { CHART_H, CHART_W, keyed, scale, type ChartProps } from "./common.ts";

const N = 61;
const price = keyed(
  N,
  [[0, 44], [4, 41], [8, 45], [12, 40.5], [15, 45.5], [18, 44], [24, 56], [30, 65], [33, 67.5], [37, 62.5], [41, 68], [44, 63], [46, 64], [53, 52], [60, 42]],
  202,
  0.9,
);
const r = rng(203);
const vol = price.map((_, i) => {
  const base = i < 18 ? 0.45 : i < 30 ? 0.7 : i < 46 ? 0.6 : 0.75;
  const spike = i === 12 || i === 41 ? 0.4 : 0;
  return Math.min(1, base + spike + (r() - 0.5) * 0.3);
});

const x = scale(0, N - 1, 70, CHART_W - 70);
const y = scale(36, 72, 420, 40);
const VOL_BASE = 560;
const VOL_H = 92;

type Phase = { name: string; col: string; i0: number; i1: number; lo?: number; hi?: number };
const PHASES: Phase[] = [
  { name: "吸筹", col: C.green, i0: 0, i1: 18, lo: 39.5, hi: 46.5 },
  { name: "拉升", col: C.green, i0: 18, i1: 30 },
  { name: "派发", col: C.red, i0: 30, i1: 46, lo: 61.5, hi: 69 },
  { name: "下跌", col: C.red, i0: 46, i1: 60 },
];

export const WyckoffChart: React.FC<ChartProps> = ({ f, at, bare }) => {
  const tLine = at(0, 0.05);
  const tPhase = [at(1, 0), at(1, 0.14), at(1, 0.28), at(1, 0.42)];
  const tVol = at(1, 0.6);
  return (
    <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {/* 区间框（吸筹 / 派发） */}
      {PHASES.map((ph, k) => {
        if (ph.lo === undefined || ph.hi === undefined) return null;
        const p = prog(f, tPhase[k], 0.35);
        return p > 0 ? (
          <rect key={ph.name} x={x(ph.i0) - 6} y={y(ph.hi)} width={(x(ph.i1) - x(ph.i0) + 12) * p} height={y(ph.lo) - y(ph.hi)} fill={ph.col} fillOpacity={0.08} stroke={ph.col} strokeWidth={2} strokeOpacity={0.8} rx={4} />
        ) : null;
      })}
      <Stroke d={pathOf(price.map((v, i) => [x(i), y(v)]))} p={prog(f, tLine, 1.6)} color={C.white} width={3.5} />
      {/* 拉升 / 下跌 箭头 */}
      <Arrow f={f} at={tPhase[1]} x1={x(19)} y1={y(47)} x2={x(29)} y2={y(63)} color={C.green} />
      <Arrow f={f} at={tPhase[3]} x1={x(47)} y1={y(60)} x2={x(58)} y2={y(44)} color={C.red} />
      {/* 成交量 */}
      <line x1={40} x2={CHART_W - 40} y1={VOL_BASE} y2={VOL_BASE} stroke={C.grey} strokeWidth={1} opacity={prog(f, tVol, 0.2)} />
      {vol.map((v, i) => {
        const p = prog(f, tVol + i * 0.02 * FPS, 0.15);
        if (p <= 0) return null;
        const ph = PHASES.find((q) => i >= q.i0 && i <= q.i1) ?? PHASES[0];
        return <rect key={i} x={x(i) - 8} y={VOL_BASE - v * VOL_H * p} width={16} height={v * VOL_H * p} fill={ph.col} opacity={0.55} />;
      })}
      {!bare && (
        <>
          <SvgLabel f={f} at={tPhase[0]} x={x(9)} y={y(46.5) - 18} text="吸筹" color={C.green} anchor="middle" size={32} weight={700} />
          <SvgLabel f={f} at={tPhase[1]} x={x(22)} y={y(58)} text="拉升" color={C.green} anchor="end" size={32} weight={700} />
          <SvgLabel f={f} at={tPhase[2]} x={x(38)} y={y(69) - 18} text="派发" color={C.red} anchor="middle" size={32} weight={700} />
          <SvgLabel f={f} at={tPhase[3]} x={x(55) + 14} y={y(55)} text="下跌" color={C.red} size={32} weight={700} />
          <SvgLabel f={f} at={tVol} x={52} y={VOL_BASE - VOL_H - 4} text="成交量" color={C.white2} size={26} />
        </>
      )}
    </svg>
  );
};
