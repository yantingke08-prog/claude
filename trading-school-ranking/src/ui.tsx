import React from "react";
import { interpolate } from "remotion";
import { prog, textIn, type Candle } from "./anim.ts";
import { C, FPS, FS, L, M, SANS, SERIF } from "./theme.ts";

/** 细白色边框内容板 */
export const Panel: React.FC<{ x: number; y: number; w: number; h: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, h, children, style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      background: "linear-gradient(180deg, rgba(26,34,49,0.94), rgba(18,25,37,0.94))",
      border: `1.5px solid ${C.line}`,
      borderRadius: 6,
      boxSizing: "border-box",
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

/** 页面标题：No.n + 流派名（48–64px） */
export const PageTitle: React.FC<{ f: number; rank: number; name: string; at?: number }> = ({ f, rank, name, at = 0 }) => (
  <div style={{ position: "absolute", left: L.margin, top: L.titleY - 30, display: "flex", alignItems: "baseline", gap: 22, ...textIn(f, at) }}>
    <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: C.gold, letterSpacing: 1 }}>No.{rank}</span>
    <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: FS.school, color: C.white }}>{name}</span>
  </div>
);

/** 图表标题（40–52px） */
export const ChartTitle: React.FC<{ f: number; at: number; text: string; x: number; y: number; color?: string }> = ({ f, at, text, x, y, color = C.white }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: SANS, fontWeight: 600, fontSize: FS.chartTitle, color, ...textIn(f, at) }}>{text}</div>
);

/** SVG 描边生长（pathLength=1 归一化） */
export const Stroke: React.FC<{ d: string; p: number; color: string; width?: number; dash?: string; opacity?: number; cap?: "round" | "butt" }> = ({ d, p, color, width = 3, dash, opacity = 1, cap = "round" }) =>
  dash ? (
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} opacity={opacity * Math.min(1, p * 3)} strokeLinecap={cap} />
  ) : (
    <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeDasharray="1 1" strokeDashoffset={1 - p} opacity={p > 0 ? opacity : 0} strokeLinecap={cap} strokeLinejoin="round" />
  );

/** 金色箭头：线段生长 + 箭头头部，0.35–0.7 秒 */
export const Arrow: React.FC<{ f: number; at: number; x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; dur?: number }> = ({ f, at, x1, y1, x2, y2, color = C.gold, width = 5, dur = M.arrow }) => {
  const p = prog(f, at, dur);
  if (p <= 0) return null;
  const x = x1 + (x2 - x1) * p;
  const y = y1 + (y2 - y1) * p;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hl = 18;
  const head = `M${x} ${y} L${x - hl * Math.cos(a - 0.45)} ${y - hl * Math.sin(a - 0.45)} L${x - hl * Math.cos(a + 0.45)} ${y - hl * Math.sin(a + 0.45)} Z`;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x - Math.cos(a) * 8} y2={y - Math.sin(a) * 8} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={head} fill={color} />
    </g>
  );
};

/** SVG 内标注（≥ 24px），进入后静止 */
export const SvgLabel: React.FC<{ f: number; at: number; x: number; y: number; text: string; color?: string; size?: number; anchor?: "start" | "middle" | "end"; weight?: number }> = ({ f, at, x, y, text, color = C.white, size = FS.label, anchor = "start", weight = 600 }) => {
  const p = prog(f, at, 0.3);
  return (
    <text x={x} y={y + (1 - p) * 8} fill={color} fontSize={Math.max(FS.labelSmall, size)} fontFamily={SANS} fontWeight={weight} textAnchor={anchor} opacity={p} stroke="rgba(9,11,14,0.85)" strokeWidth={6} paintOrder="stroke" strokeLinejoin="round">
      {text}
    </text>
  );
};

/** K 线逐根生成 */
export const Candles: React.FC<{
  f: number;
  at: number;
  data: Candle[];
  x: (i: number) => number;
  y: (v: number) => number;
  bw: number;
  step?: number;
  color?: (c: Candle, i: number) => string;
  dim?: (i: number) => number;
}> = ({ f, at, data, x, y, bw, step = M.candleStep, color, dim }) => (
  <g>
    {data.map((c, i) => {
      const p = prog(f, at + i * step * FPS, 0.16);
      if (p <= 0) return null;
      const up = c.c >= c.o;
      const col = color ? color(c, i) : up ? C.up : C.down;
      const top = y(Math.max(c.o, c.c));
      const bot = y(Math.min(c.o, c.c));
      const bh = Math.max(2, bot - top);
      const cx = x(i);
      // 实体从开盘价向收盘价方向长出
      const grow = bh * p;
      const by = up ? bot - grow : top;
      return (
        <g key={i} opacity={(dim ? dim(i) : 1) * Math.min(1, p * 1.5)}>
          <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={2.4} opacity={p} />
          <rect x={cx - bw / 2} y={by} width={bw} height={Math.max(1, grow)} fill={col} />
        </g>
      );
    })}
  </g>
);

/** 绿色优势卡 / 红色风险卡：高度展开，文字按语义短语出现 */
export const ProsCons: React.FC<{ f: number; at: number; kind: "pro" | "con"; points: readonly string[]; x: number; y: number; w: number }> = ({ f, at, kind, points, x, y, w }) => {
  const col = kind === "pro" ? C.green : C.red;
  const rowH = 70;
  const headH = 76;
  const full = headH + points.length * rowH + 22;
  const open = prog(f, at, M.cardOpen);
  if (open <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: full * open,
        overflow: "hidden",
        borderRadius: 6,
        border: `1.5px solid ${col}`,
        background: kind === "pro" ? "rgba(54,224,127,0.12)" : "rgba(255,90,78,0.12)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ height: headH, display: "flex", alignItems: "center", gap: 16, padding: "0 28px", borderBottom: `1px solid ${col}55` }}>
        <span style={{ width: 40, height: 40, borderRadius: 20, background: col, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, fontFamily: SANS }}>
          {kind === "pro" ? "✓" : "✕"}
        </span>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: FS.cardHead, color: col }}>{kind === "pro" ? "优势" : "风险"}</span>
      </div>
      {points.map((pt, i) => {
        const phrases = pt.split(/(?<=，)/);
        const base = at + (M.cardOpen + 0.05 + i * 0.42) * FPS;
        return (
          <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", padding: "0 28px", gap: 18 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: col, opacity: prog(f, base, 0.2) }} />
            <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: FS.cardPoint, color: C.white }}>
              {phrases.map((ph, k) => (
                <span key={k} style={{ display: "inline-block", ...textIn(f, base + k * 0.18 * FPS, 0.26) }}>
                  {ph}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** 帧内淡入的 div 包装 */
export const In: React.FC<{ f: number; at: number; style?: React.CSSProperties; children: React.ReactNode; dur?: number }> = ({ f, at, style, children, dur }) => (
  <div style={{ position: "absolute", ...style, ...textIn(f, at, dur) }}>{children}</div>
);

export const clampI = (f: number, a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
