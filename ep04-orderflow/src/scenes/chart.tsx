// The main K-line chart (layer 1), its minimap (position anchor for drill-downs) and the focus box.
import React from "react";
import { C, Candle, MONO, shade } from "../kit";
import { MAIN, type Bar } from "../data";

export type Geo = { x0: number; dx: number; w: number; y0: number; k: number; volBase: number; volH: number; maxV: number };
/** full-chart geometry: 80 bars across x 80–996, price y 544–1174, volume up from 1320 */
export const GEO: Geo = { x0: 80, dx: 11.6, w: 9, y0: 740, k: 14, volBase: 1322, volH: 110, maxV: 5200 };
export const bx = (i: number, g: Geo = GEO) => g.x0 + i * g.dx;
export const py = (tick: number, g: Geo = GEO) => g.y0 - tick * g.k;

export type ChartProps = {
  bars?: Bar[];
  geo?: Geo;
  upto: number; // last bar index shown
  live?: Partial<Bar>; // overrides for bar `upto` while it is forming
  o?: (i: number) => number; // per-bar opacity
  glow?: (i: number) => number;
  vol?: boolean | number; // show volume (number = opacity)
  volBoost?: (i: number) => number; // 0..1 how much of the volume bar has printed
};

export const Chart: React.FC<ChartProps> = ({ bars = MAIN, geo = GEO, upto, live, o, glow, vol = true, volBoost }) => {
  const shown = bars.slice(0, upto + 1).map((b, i) => (i === upto && live ? { ...b, ...live } : b));
  const volO = typeof vol === "number" ? vol : vol ? 0.75 : 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d" }}>
      {shown.map((b, i) => {
        const x = bx(i, geo);
        const up = b.c >= b.o;
        const bo = o?.(i) ?? 1;
        const vh = (b.v / geo.maxV) * geo.volH * (volBoost?.(i) ?? 1);
        return (
          <React.Fragment key={i}>
            <Candle cx={x} open={py(b.o, geo)} close={py(b.c, geo)} high={py(b.h, geo)} low={py(b.l, geo)} w={geo.w} o={bo} glow={glow?.(i) ?? 0} />
            {volO > 0 && vh > 0.5 && (
              <div
                style={{
                  position: "absolute",
                  left: x - geo.w / 2,
                  top: geo.volBase - vh,
                  width: geo.w,
                  height: vh,
                  background: `linear-gradient(180deg, ${up ? C.up : C.down}, ${up ? C.upD : C.downD})`,
                  opacity: volO * bo * 0.8,
                  boxShadow: (glow?.(i) ?? 0) > 0 ? `0 0 16px ${up ? C.up : C.down}` : undefined,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** price axis labels at the right edge */
export const Axis: React.FC<{ ticks: number[]; geo?: Geo; x?: number; o?: number }> = ({ ticks, geo = GEO, x = 1040, o = 1 }) => (
  <>
    {ticks.map((t) => (
      <div
        key={t}
        style={{
          position: "absolute",
          left: x,
          top: py(t, geo),
          transform: "translate(-100%,-50%)",
          fontFamily: MONO,
          fontSize: 24,
          color: C.dim,
          opacity: o * 0.8,
        }}
      >
        {(10 + t * 0.01).toFixed(2)}
      </div>
    ))}
  </>
);

/** focus box outline; the scene dims the bars outside it */
export const FocusBox: React.FC<{ x: number; y: number; w: number; h: number; o: number; color?: string }> = ({ x, y, w, h, o, color = "#ffffff" }) =>
  o <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        border: `3px solid ${color}`,
        borderRadius: 8,
        opacity: o,
        boxShadow: `0 0 24px ${color}55, inset 0 0 30px ${color}22`,
        transform: "translateZ(30px)",
      }}
    />
  );

/** 2D minimap (top-right): the whole chart with the bar being examined boxed */
export const Minimap: React.FC<{ upto: number; mark: number; o?: number; markColor?: string }> = ({ upto, mark, o = 1, markColor = "#ffffff" }) => {
  if (o <= 0) return null;
  const W0 = 250;
  const H0 = 120;
  const n = MAIN.length;
  const hi = Math.max(...MAIN.map((b) => b.h));
  const lo = Math.min(...MAIN.map((b) => b.l));
  const X = (i: number) => 8 + (i / (n - 1)) * (W0 - 16);
  const Y = (p: number) => 8 + ((hi - p) / (hi - lo)) * (H0 - 16);
  return (
    <div style={{ position: "absolute", left: 40, top: 330, width: W0, height: H0, opacity: o, background: "rgba(5,9,18,0.8)", border: `1px solid ${C.faint}`, borderRadius: 8 }}>
      <svg width={W0} height={H0}>
        {MAIN.slice(0, upto + 1).map((b, i) => (
          <g key={i}>
            <line x1={X(i)} x2={X(i)} y1={Y(b.h)} y2={Y(b.l)} stroke={b.c >= b.o ? C.up : C.down} strokeWidth={1} />
            <rect x={X(i) - 1.2} y={Y(Math.max(b.o, b.c))} width={2.4} height={Math.max(1, Math.abs(Y(b.o) - Y(b.c)))} fill={b.c >= b.o ? C.up : C.down} />
          </g>
        ))}
        <rect x={X(mark) - 6} y={Y(MAIN[mark].h) - 6} width={12} height={Math.abs(Y(MAIN[mark].h) - Y(MAIN[mark].l)) + 12} fill="none" stroke={markColor} strokeWidth={2} />
      </svg>
    </div>
  );
};

/** glowing ring around one bar (a "定位圈" without a leader line) */
export const Ring: React.FC<{ i: number; color: string; o: number; geo?: Geo; bars?: Bar[]; pad?: number }> = ({ i, color, o, geo = GEO, bars = MAIN, pad = 12 }) => {
  if (o <= 0) return null;
  const b = bars[i];
  const top = py(b.h, geo) - pad;
  const h = py(b.l, geo) - top + pad;
  const w = geo.w + pad * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: bx(i, geo) - w / 2,
        top,
        width: w,
        height: h,
        border: `3px solid ${color}`,
        borderRadius: w / 2,
        boxShadow: `0 0 18px ${shade(color, 0.1)}`,
        opacity: o,
        transform: `translateZ(24px) scale(${0.85 + 0.15 * o})`,
      }}
    />
  );
};
