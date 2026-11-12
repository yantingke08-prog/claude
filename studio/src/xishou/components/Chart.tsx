// SVG trading-chart primitives sharing one scale, so candles, Delta bars, zones and labels line up.
import React from "react";
import { C, MONO, T } from "../theme";
import { fmt, TICK, type Candle } from "../market";

export type Scale = {
  x: number;
  y: number;
  w: number;
  h: number;
  slots: number;
  min: number;
  max: number;
  X: (slot: number) => number; // centre x of a slot
  Y: (price: number) => number;
  cw: number; // slot width
};

export const makeScale = (x: number, y: number, w: number, h: number, slots: number, min: number, max: number): Scale => {
  const cw = w / slots;
  return {
    x,
    y,
    w,
    h,
    slots,
    min,
    max,
    cw,
    X: (s) => x + (s + 0.5) * cw,
    Y: (p) => y + ((max - p) / (max - min)) * h,
  };
};

/**
 * Candles that grow in order. `reveal` is a float count: candle i is complete when i+1 ≤ reveal,
 * the next one grows its body from open toward close.
 */
export const Candles: React.FC<{ s: Scale; data: Candle[]; from: number; reveal: number; opacity?: number; ghost?: boolean; tint?: string }> = ({
  s,
  data,
  from,
  reveal,
  opacity = 1,
  ghost = false,
  tint,
}) => (
  <g opacity={opacity}>
    {data.map((c, i) => {
      const t = Math.max(0, Math.min(1, reveal - i));
      if (t <= 0) return null;
      const up = c.c >= c.o;
      const col = tint ?? (up ? C.green : C.red);
      const cx = s.X(from + i);
      const close = c.o + (c.c - c.o) * t;
      const hi = Math.max(c.o, close) + (c.h - Math.max(c.o, c.c)) * t;
      const lo = Math.min(c.o, close) - (Math.min(c.o, c.c) - c.l) * t;
      const top = s.Y(Math.max(c.o, close));
      const bot = s.Y(Math.min(c.o, close));
      const bw = Math.max(3, s.cw * 0.62);
      return (
        <g key={i}>
          <line x1={cx} x2={cx} y1={s.Y(hi)} y2={s.Y(lo)} stroke={col} strokeWidth={Math.max(1.5, s.cw * 0.09)} opacity={ghost ? 0.5 : 1} />
          <rect
            x={cx - bw / 2}
            y={top}
            width={bw}
            height={Math.max(2, bot - top)}
            rx={1.5}
            fill={ghost ? "transparent" : col}
            stroke={col}
            strokeWidth={ghost ? 1.5 : 0}
            opacity={ghost ? 0.55 : 1}
          />
        </g>
      );
    })}
  </g>
);

/** Price band that grows outward from its structure edge (default: from `lo` upward). */
export const Zone: React.FC<{ s: Scale; lo: number; hi: number; from: number; to: number; grow: number; color?: string; fill?: string; edge?: boolean }> = ({
  s,
  lo,
  hi,
  from,
  to,
  grow,
  color = C.amber,
  fill = C.amberZone,
  edge = true,
}) => {
  if (grow <= 0) return null;
  const x0 = s.X(from) - s.cw / 2;
  const x1 = x0 + (s.X(to) + s.cw / 2 - x0) * Math.min(1, grow * 1.4);
  const yTop = s.Y(hi);
  const yBot = s.Y(lo);
  const hh = (yBot - yTop) * Math.min(1, Math.max(0, grow * 1.4 - 0.4));
  return (
    <g>
      <rect x={x0} y={yBot - Math.max(2, hh)} width={x1 - x0} height={Math.max(2, hh)} fill={fill} />
      {edge ? (
        <>
          <line x1={x0} x2={x1} y1={yBot} y2={yBot} stroke={color} strokeWidth={2} opacity={0.9} />
          <line x1={x0} x2={x1} y1={yBot - hh} y2={yBot - hh} stroke={color} strokeWidth={2} opacity={0.9 * Math.min(1, hh / 4)} />
        </>
      ) : null}
    </g>
  );
};

/** Horizontal level drawn left → right. */
export const HLine: React.FC<{ s: Scale; p: number; draw: number; color: string; dash?: string; from?: number; to?: number; width?: number }> = ({
  s,
  p,
  draw,
  color,
  dash,
  from,
  to,
  width = 2,
}) => {
  if (draw <= 0) return null;
  const x0 = from !== undefined ? s.X(from) - s.cw / 2 : s.x;
  const xe = to !== undefined ? s.X(to) + s.cw / 2 : s.x + s.w;
  return <line x1={x0} x2={x0 + (xe - x0) * draw} y1={s.Y(p)} y2={s.Y(p)} stroke={color} strokeWidth={width} strokeDasharray={dash} />;
};

/** Right-hand price axis with tick labels. */
export const PriceAxis: React.FC<{ s: Scale; step?: number; o?: number; side?: "left" | "right" }> = ({ s, step = 1, o = 1, side = "right" }) => {
  const ticks: number[] = [];
  for (let p = Math.ceil(s.min / step) * step; p <= s.max + 1e-6; p += step) ticks.push(p);
  return (
    <g opacity={o}>
      {ticks.map((p) => (
        <g key={p}>
          <line x1={s.x} x2={s.x + s.w} y1={s.Y(p)} y2={s.Y(p)} stroke={C.gridStrong} strokeWidth={1} strokeDasharray="2 6" />
          <text
            x={side === "right" ? s.x + s.w + 10 : s.x - 10}
            y={s.Y(p) + 7}
            fill={C.sub}
            fontFamily={MONO}
            fontSize={T.xs - 2}
            textAnchor={side === "right" ? "start" : "end"}
          >
            {fmt(p)}
          </text>
        </g>
      ))}
    </g>
  );
};

/** Delta histogram aligned to the candle slots. Bars grow from zero in narrative order. */
export const DeltaBars: React.FC<{
  s: Scale;
  data: Candle[];
  from: number;
  reveal: number;
  y0: number; // zero line y
  h: number; // max bar height (each side)
  maxAbs?: number;
  opacity?: number;
}> = ({ s, data, from, reveal, y0, h, maxAbs = 800, opacity = 1 }) => (
  <g opacity={opacity}>
    <line x1={s.x} x2={s.x + s.w} y1={y0} y2={y0} stroke={C.gridStrong} strokeWidth={1} />
    {data.map((c, i) => {
      const t = Math.max(0, Math.min(1, reveal - i));
      if (t <= 0) return null;
      const v = (c.d / maxAbs) * h * t;
      const bw = Math.max(3, s.cw * 0.62);
      const x = s.X(from + i) - bw / 2;
      return <rect key={i} x={x} y={v >= 0 ? y0 - v : y0} width={bw} height={Math.max(1, Math.abs(v))} fill={c.d >= 0 ? C.green : C.red} opacity={0.9} rx={1} />;
    })}
  </g>
);

/** Small vertical marker (entry / confirm / fail) pointing at a candle extreme. */
export const Marker: React.FC<{ s: Scale; slot: number; p: number; dir: "up" | "down"; color: string; o: number }> = ({ s, slot, p, dir, color, o }) => {
  if (o <= 0) return null;
  const x = s.X(slot);
  const y = s.Y(p) + (dir === "up" ? 14 : -14);
  const d = dir === "up" ? `M${x} ${y} l-10 16 h20 z` : `M${x} ${y} l-10 -16 h20 z`;
  return <path d={d} fill={color} opacity={o} />;
};

export const ticksBetween = (a: number, b: number) => Math.round(Math.abs(a - b) / TICK);
