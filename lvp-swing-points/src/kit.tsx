// Layer primitives: L1 background, L2 chart engine, L3 annotations, L5 text, L6 brand.
import React, { createContext, useContext, useId } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { CUES, type CueName } from "./cues.ts";
import { isDoji, type Bar } from "./data.ts";
import { BRAND, C, DISCLAIMER, FONT, H, MONO, W, glow, withAlpha } from "./theme.ts";
import { findAnchor, type Timeline } from "./timeline.ts";

// ------------------------------------------------------------------ easing
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
/** 0→1 over [a, a+d] with easing */
export const ramp = (t: number, a: number, d: number, ease: (x: number) => number = (x) => x) => ease(clamp01((t - a) / d));

// ------------------------------------------------------------------ time context
type Ctx = { t: number; tl: Timeline; shotStart: number; shotEnd: number };
const TimeCtx = createContext<Ctx | null>(null);
export const TimeProvider = TimeCtx.Provider;
export const useTime = () => {
  const ctx = useContext(TimeCtx);
  if (!ctx) throw new Error("useTime outside TimeProvider");
  const cue = (name: CueName) => {
    const q = CUES[name];
    const v = findAnchor(ctx.tl, q.phrase, "after" in q ? q.after : undefined);
    if (v === null) {
      console.warn(`[cue] "${name}" (${q.phrase}) not found in the script`);
      return Number.POSITIVE_INFINITY;
    }
    return v;
  };
  return { ...ctx, cue };
};

/** annotation entrance: 0.3 s fade + scale 0.85→1 (easeOutBack); optional 0.2 s exit */
export const pop = (t: number, at: number, out = Number.POSITIVE_INFINITY) => {
  const k = clamp01((t - at) / 0.3);
  const exit = 1 - clamp01((t - out) / 0.2);
  return { opacity: k * exit, scale: lerp(0.85, 1, easeOutBack(k)), on: t >= at && t < out + 0.2 };
};

// ------------------------------------------------------------------ L1 background
export const Background: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 40% 45%, ${C.bgCenter} 0%, ${C.bgEdge} 70%)` }} />
    <AbsoluteFill
      style={{
        opacity: 0.12,
        backgroundImage: `linear-gradient(${C.grid} 2px, transparent 2px), linear-gradient(90deg, ${C.grid} 2px, transparent 2px)`,
        backgroundSize: "80px 80px",
        backgroundPosition: "-1px -1px",
      }}
    />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
  </AbsoluteFill>
);

// ------------------------------------------------------------------ camera: slow push-in per section
export const PushIn: React.FC<{ children: React.ReactNode; dim?: number }> = ({ children, dim = 1 }) => {
  const { t, shotStart, shotEnd } = useTime();
  const k = easeInOutSine(clamp01((t - shotStart) / Math.max(0.1, shotEnd - shotStart)));
  return (
    <AbsoluteFill style={{ transform: `translateX(${-30 * k}px) scale(${1 + 0.04 * k})`, transformOrigin: "50% 50%", opacity: dim }}>
      {children}
    </AbsoluteFill>
  );
};

/** chart opacity 100→35 % over 0.4 s while a big title is on */
export const dimFor = (t: number, from: number, to = Number.POSITIVE_INFINITY) => {
  const a = clamp01((t - from) / 0.4);
  const b = clamp01((t - to) / 0.4);
  return 1 - 0.65 * (a - b);
};

// ------------------------------------------------------------------ L2 chart engine
export type Scale = { x: (i: number) => number; y: (p: number) => number; step: number; body: number; x0: number; x1: number };
export const makeScale = (o: { n: number; x0: number; x1: number; top: number; bottom: number; pMin: number; pMax: number }): Scale => {
  const step = (o.x1 - o.x0) / o.n;
  return {
    x: (i) => o.x0 + step * (i + 0.5),
    y: (p) => o.bottom - ((p - o.pMin) / (o.pMax - o.pMin)) * (o.bottom - o.top),
    step,
    body: Math.max(6, step * 0.62),
    x0: o.x0,
    x1: o.x1,
  };
};
/** blend two framings of the same chart (a camera move that keeps every candle on its slot) */
export const mixScale = (a: Scale, b: Scale, k: number): Scale => ({
  x: (i) => lerp(a.x(i), b.x(i), k),
  y: (p) => lerp(a.y(p), b.y(p), k),
  step: lerp(a.step, b.step, k),
  body: lerp(a.body, b.body, k),
  x0: lerp(a.x0, b.x0, k),
  x1: lerp(a.x1, b.x1, k),
});
export const rangeOf = (bars: Bar[], pad = 0.08) => {
  const lo = Math.min(...bars.map((b) => b.l));
  const hi = Math.max(...bars.map((b) => b.h));
  const p = (hi - lo) * pad;
  return { pMin: lo - p, pMax: hi + p };
};

export const GROW = 0.12; // seconds per candle
/** reveal schedule: bars up to `pre` are on screen from the start; then each segment grows from its cue */
export const growSchedule = (segs: { to: number; at: number; per?: number }[], pre = -1) => {
  const times: number[] = [];
  let from = pre + 1;
  for (const s of segs) {
    for (let i = from; i <= s.to; i++) times[i] = s.at + (i - from) * (s.per ?? GROW);
    from = Math.max(from, s.to + 1);
  }
  return (i: number) => (i <= pre ? Number.NEGATIVE_INFINITY : times[i] ?? Number.POSITIVE_INFINITY);
};

/** candles: gradient bodies with a bright edge and glow, round-capped wicks; dojis grey */
export const Candles: React.FC<{
  bars: Bar[];
  sc: Scale;
  appear: (i: number) => number;
  offset?: number; // draw bar k at slot offset+k
  ghost?: boolean; // hypothetical branch: outlines only
  opacity?: number | ((i: number) => number);
}> = ({ bars, sc, appear, offset = 0, ghost = false, opacity = 1 }) => {
  const { t } = useTime();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <g>
      <defs>
        {(["up", "down"] as const).map((k) => (
          <linearGradient key={k} id={`${id}-${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C[k]} stopOpacity={1} />
            <stop offset="100%" stopColor={C[k]} stopOpacity={0.62} />
          </linearGradient>
        ))}
      </defs>
      {bars.map((b, k) => {
        const at = appear(k);
        const g = clamp01((t - at) / GROW);
        if (g <= 0) return null;
        const doji = isDoji(b);
        const up = b.c >= b.o;
        const col = doji ? C.doji : up ? C.up : C.down;
        const x = sc.x(offset + k);
        const yo = sc.y(b.o);
        const yc = sc.y(b.c);
        const op = typeof opacity === "function" ? opacity(k) : opacity;
        const wickW = Math.max(1.6, sc.body * 0.11);
        const top = Math.min(yo, yc);
        const hgt = Math.max(doji ? 3 : 2, Math.abs(yc - yo));
        return (
          <g key={k} style={{ transform: `scaleY(${easeOutCubic(g)})`, transformOrigin: `${x}px ${yo}px`, opacity: op }}>
            <line
              x1={x}
              x2={x}
              y1={sc.y(b.h)}
              y2={sc.y(b.l)}
              stroke={col}
              strokeWidth={ghost ? 2.5 : wickW}
              strokeLinecap="round"
              strokeDasharray={ghost ? "5 4" : undefined}
              opacity={ghost ? 1 : 0.9}
            />
            <rect
              x={x - sc.body / 2}
              y={doji ? top - hgt / 2 : top}
              width={sc.body}
              height={hgt}
              rx={Math.min(3, sc.body * 0.14)}
              fill={ghost ? withAlpha(col, 0.28) : doji ? col : `url(#${id}-${up ? "up" : "down"})`}
              stroke={col}
              strokeWidth={ghost ? 2.5 : 1.2}
              strokeDasharray={ghost ? "6 4" : undefined}
              style={ghost || doji ? undefined : { filter: glow(col, up ? 10 : 9, up ? 0.45 : 0.4) }}
            />
            {!ghost && !doji && hgt > 6 && (
              <rect x={x - sc.body / 2 + 2} y={top + 2} width={Math.max(1, sc.body * 0.18)} height={hgt - 4} rx={1} fill={withAlpha(C.text, 0.22)} />
            )}
          </g>
        );
      })}
    </g>
  );
};

/** right-hand price axis (terminal feel); pure decoration, muted */
export const PriceAxis: React.FC<{ sc: Scale; pMin: number; pMax: number; x: number; ticks?: number }> = ({ sc, pMin, pMax, x, ticks = 6 }) => {
  const out = [];
  for (let k = 0; k <= ticks; k++) {
    const p = pMin + ((pMax - pMin) * k) / ticks;
    out.push(
      <text key={k} x={x} y={sc.y(p) + 8} fill={withAlpha(C.muted, 0.45)} fontFamily={MONO} fontSize={20}>
        {p.toFixed(1)}
      </text>,
    );
  }
  return <g>{out}</g>;
};

// ------------------------------------------------------------------ L3 annotations (SVG, inside the chart group)
type PopProps = { at: number; out?: number; x: number; y: number; children: React.ReactNode };
export const PopG: React.FC<PopProps> = ({ at, out, x, y, children }) => {
  const { t } = useTime();
  const p = pop(t, at, out);
  if (p.opacity <= 0) return null;
  return <g style={{ opacity: p.opacity, transform: `scale(${p.scale})`, transformOrigin: `${x}px ${y}px` }}>{children}</g>;
};

/** horizontal level: draws left→right in 0.35 s (easeOutCubic), 2 px + 8 px glow; label follows 0.15 s later */
export const HLine: React.FC<{
  y: number;
  x1: number;
  x2: number;
  color: string;
  at: number;
  out?: number;
  label?: string;
  labelAt?: "end" | "start";
  dashed?: boolean;
}> = ({ y, x1, x2, color, at, out, label, labelAt = "end", dashed }) => {
  const { t } = useTime();
  const k = ramp(t, at, 0.35, easeOutCubic);
  const exit = out === undefined ? 1 : 1 - clamp01((t - out) / 0.2);
  if (k <= 0 || exit <= 0) return null;
  const xe = lerp(x1, x2, k);
  const lx = labelAt === "end" ? x2 + 14 : x1;
  return (
    <g style={{ opacity: exit }}>
      <line x1={x1} x2={xe} y1={y} y2={y} stroke={color} strokeWidth={2.5} strokeDasharray={dashed ? "12 8" : undefined} style={{ filter: glow(color, 8, 0.8) }} />
      {label && (
        <Label x={lx} y={labelAt === "end" ? y : y - 34} text={label} color={color} at={at + 0.15} anchor={labelAt === "end" ? "start" : "start"} />
      )}
    </g>
  );
};

const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (/[\x00-\x7f]/.test(ch) ? 0.58 : 1), 0) * size;

/** label box: dark glass fill, 1.5 px coloured border, white text */
export const Label: React.FC<{
  x: number;
  y: number;
  text: string;
  color: string;
  at: number;
  out?: number;
  size?: number;
  anchor?: "start" | "middle" | "end";
  fill?: boolean; // solid colour fill (for 多头 blocks etc.)
  textColor?: string;
}> = ({ x, y, text, color, at, out, size = 30, anchor = "middle", fill = false, textColor }) => {
  const w = textW(text, size) + size * 1.1;
  const h = size * 1.6;
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return (
    <PopG at={at} out={out} x={x} y={y}>
      <rect
        x={left}
        y={y - h / 2}
        width={w}
        height={h}
        rx={8}
        fill={fill ? color : withAlpha(C.bg, 0.82)}
        stroke={color}
        strokeWidth={1.5}
        style={{ filter: glow(color, 10, 0.55) }}
      />
      <text x={left + w / 2} y={y + size * 0.36} textAnchor="middle" fill={textColor ?? C.text} fontFamily={FONT} fontWeight={800} fontSize={size}>
        {text}
      </text>
    </PopG>
  );
};

/** B / 空 bubble with a stem arrow to the candle and a ripple (scale 1→1.8, opacity 60→0, 0.5 s) */
export const Bubble: React.FC<{
  x: number;
  y: number;
  letter: string;
  color: string;
  at: number;
  out?: number;
  below?: boolean;
  r?: number;
  gap?: number; // distance from the candle tip to the bubble edge
  ripples?: number;
}> = ({ x, y, letter, color, at, out, below = true, r = 26, gap = 26, ripples = 1 }) => {
  const { t } = useTime();
  const s = below ? 1 : -1;
  const tip = y + s * 8; // arrow tip, just off the wick end
  const cy = tip + s * (gap + r);
  const head = Math.max(9, r * 0.32);
  return (
    <PopG at={at} out={out} x={x} y={cy}>
      {Array.from({ length: ripples }, (_, k) => {
        const rip = clamp01((t - at - 0.15 - k * 0.45) / 0.5);
        return rip > 0 && rip < 1 ? <circle key={k} cx={x} cy={cy} r={r * lerp(1, 1.8, rip)} fill="none" stroke={color} strokeWidth={3} opacity={0.6 * (1 - rip)} /> : null;
      })}
      <g style={{ filter: glow(color, 8, 0.8) }}>
        <line x1={x} y1={cy - s * r} x2={x} y2={tip + s * head * 0.9} stroke={color} strokeWidth={Math.max(3, r * 0.12)} strokeLinecap="round" />
        <path d={`M${x} ${tip} L${x - head * 0.75} ${tip + s * head * 1.2} L${x + head * 0.75} ${tip + s * head * 1.2} Z`} fill={color} />
      </g>
      <circle cx={x} cy={cy} r={r} fill={color} style={{ filter: glow(color, r * 0.7, 0.55) }} />
      <circle cx={x} cy={cy} r={r - 3} fill="none" stroke={withAlpha(C.text, 0.55)} strokeWidth={2} />
      <text x={x} y={cy + r * 0.4} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={r * 1.15} fill={C.text}>
        {letter}
      </text>
    </PopG>
  );
};

/** red ✓ badge with text */
export const Check: React.FC<{ x: number; y: number; text?: string; at: number; out?: number; color?: string; size?: number }> = ({
  x,
  y,
  text,
  at,
  out,
  color = C.up,
  size = 34,
}) => {
  const { t } = useTime();
  const draw = ramp(t, at + 0.1, 0.3, easeOutCubic);
  const r = size * 0.72;
  const tw = text ? textW(text, size) : 0;
  return (
    <PopG at={at} out={out} x={x} y={y}>
      {text && (
        <rect x={x - r - 8} y={y - r - 8} width={2 * r + 16 + tw + size * 0.9} height={2 * r + 16} rx={r + 8} fill={withAlpha(C.bg, 0.82)} stroke={color} strokeWidth={1.5} style={{ filter: glow(color, 12, 0.5) }} />
      )}
      <circle cx={x} cy={y} r={r} fill={color} style={{ filter: glow(color, 18, 0.45) }} />
      <path
        d={`M${x - r * 0.45} ${y + r * 0.02} L${x - r * 0.1} ${y + r * 0.38} L${x + r * 0.5} ${y - r * 0.36}`}
        fill="none"
        stroke={C.text}
        strokeWidth={size * 0.16}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      {text && (
        <text x={x + r + size * 0.45} y={y + size * 0.36} fontFamily={FONT} fontWeight={800} fontSize={size} fill={C.text}>
          {text}
        </text>
      )}
    </PopG>
  );
};

/** ▽ above a high / △ below a low */
export const Marker: React.FC<{ x: number; y: number; dir: "down" | "up"; color: string; at: number; out?: number; s?: number }> = ({ x, y, dir, color, at, out, s = 16 }) => {
  const cy = dir === "down" ? y - s - 10 : y + s + 10;
  const d = dir === "down" ? `M${x - s} ${cy - s * 0.7} L${x + s} ${cy - s * 0.7} L${x} ${cy + s * 0.7} Z` : `M${x - s} ${cy + s * 0.7} L${x + s} ${cy + s * 0.7} L${x} ${cy - s * 0.7} Z`;
  return (
    <PopG at={at} out={out} x={x} y={cy}>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" style={{ filter: glow(color, 8, 0.7) }} />
    </PopG>
  );
};

export const Ring: React.FC<{ x: number; y: number; r?: number; color: string; at: number; out?: number }> = ({ x, y, r = 30, color, at, out }) => {
  const { t } = useTime();
  const pulse = 1 + 0.06 * Math.sin((t - at) * 5);
  return (
    <PopG at={at} out={out} x={x} y={y}>
      <circle cx={x} cy={y} r={r * pulse} fill="none" stroke={color} strokeWidth={3} style={{ filter: glow(color, 10, 0.8) }} />
    </PopG>
  );
};

export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; at: number; out?: number; width?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  color,
  at,
  out,
  width = 4,
}) => {
  const { t } = useTime();
  const k = ramp(t, at, 0.35, easeOutCubic);
  const exit = out === undefined ? 1 : 1 - clamp01((t - out) / 0.2);
  if (k <= 0 || exit <= 0) return null;
  const xe = lerp(x1, x2, k);
  const ye = lerp(y1, y2, k);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hs = 16;
  return (
    <g style={{ opacity: exit, filter: glow(color, 8, 0.7) }}>
      <line x1={x1} y1={y1} x2={xe} y2={ye} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path
        d={`M${xe} ${ye} L${xe - hs * Math.cos(a - 0.45)} ${ye - hs * Math.sin(a - 0.45)} L${xe - hs * Math.cos(a + 0.45)} ${ye - hs * Math.sin(a + 0.45)} Z`}
        fill={color}
      />
    </g>
  );
};

/** a pulsing focus box (no text) */
export const FocusBox: React.FC<{ x: number; y: number; w: number; h: number; color: string; at: number; out?: number }> = ({ x, y, w, h, color, at, out }) => (
  <PopG at={at} out={out} x={x + w / 2} y={y + h / 2}>
    <rect x={x} y={y} width={w} height={h} rx={10} fill={withAlpha(color, 0.06)} stroke={color} strokeWidth={2} strokeDasharray="10 7" style={{ filter: glow(color, 8, 0.6) }} />
  </PopG>
);

/** full-frame SVG for a chart group */
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {children}
  </svg>
);

// ------------------------------------------------------------------ L5 text
/** top-left purple title bar: Chinese 44 px + English 22 px, 4 px bright left edge */
export const TitleBar: React.FC<{ zh: string; en: string; at: number }> = ({ zh, en, at }) => {
  const { t } = useTime();
  const p = pop(t, at);
  if (p.opacity <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        top: 104,
        display: "flex",
        alignItems: "baseline",
        gap: 18,
        padding: "10px 26px 12px 22px",
        borderLeft: `4px solid ${C.text}`,
        background: `linear-gradient(90deg, ${C.resistance}, ${C.resistanceDeep})`,
        borderRadius: "0 10px 10px 0",
        boxShadow: `0 0 24px ${withAlpha(C.resistance, 0.45)}`,
        opacity: p.opacity,
        transform: `scale(${p.scale})`,
        transformOrigin: "0% 50%",
        fontFamily: FONT,
      }}
    >
      <span style={{ fontSize: 44, fontWeight: 900, color: C.text }}>{zh}</span>
      <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, color: withAlpha(C.text, 0.8) }}>{en}</span>
    </div>
  );
};

/** centre big title (110 px, two lines, line-height 1.25, glow); pair it with dimFor() on the chart */
export const BigTitle: React.FC<{ lines: React.ReactNode[]; at: number; out?: number; y?: number; size?: number }> = ({ lines, at, out, y = 480, size = 110 }) => {
  const { t } = useTime();
  const k = ramp(t, at, 0.5, easeOutCubic);
  const exit = out === undefined ? 1 : 1 - clamp01((t - out) / 0.3);
  if (k <= 0 || exit <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        transform: `translateY(-50%) scale(${lerp(0.92, 1, k)})`,
        opacity: k * exit,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.25,
        color: C.text,
        textShadow: `0 0 24px ${withAlpha(C.brand, 0.45)}, 0 4px 4px rgba(0,0,0,0.6)`,
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
};

/** always-on disclaimer + data note (top right) */
export const Disclaimer: React.FC = () => (
  <div style={{ position: "absolute", right: 40, top: 34, textAlign: "right", fontFamily: FONT, color: C.muted, opacity: 0.55 }}>
    <div style={{ fontSize: 26, fontWeight: 500 }}>{DISCLAIMER}</div>
    <div style={{ fontSize: 20, fontWeight: 500, marginTop: 6, letterSpacing: 2 }}>示意图 · 模拟数据</div>
  </div>
);

// ------------------------------------------------------------------ L6 brand
/** L.V.P.订单流 corner badge (top-left, always on). The mark is the user's own logo (white, unaltered). */
export const Badge: React.FC = () => (
  <div style={{ position: "absolute", left: 40, top: 30, display: "flex", alignItems: "center", gap: 12, fontFamily: FONT }}>
    <Img src={staticFile("brand/lvp-mark-white.svg")} style={{ width: 54, height: 54 }} />
    <div style={{ lineHeight: 1 }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: 1 }}>{BRAND.mark}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: 2, marginTop: 6 }}>{BRAND.full}</div>
    </div>
  </div>
);

/** The brand on its own screen: logo + "L.V.P.订单流" in flat solid red (no stroke, no glow, no lines). */
export const BrandLockup: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.32, fontFamily: FONT }}>
    <Img src={staticFile("brand/lvp-mark-white.svg")} style={{ width: size * 1.45, height: size * 1.45 }} />
    <div style={{ lineHeight: 1 }}>
      <div style={{ fontSize: size, fontWeight: 900, color: C.brandSolid, letterSpacing: size * 0.02, whiteSpace: "nowrap" }}>{BRAND.mark}</div>
      <div style={{ fontSize: size * 0.2, fontWeight: 600, color: C.muted, letterSpacing: size * 0.06, marginTop: size * 0.22, whiteSpace: "nowrap" }}>{BRAND.full}</div>
    </div>
  </div>
);
