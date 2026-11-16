// Drawing kit for 《红三兵》: chart geometry, candles, volume, labels, chips, header, captions.
// Solid fills, opacity on leaves (gradients/blur/group opacity rasterise unevenly in Chrome; see same-candle v3).
import React from "react";
import { captions } from "./cue";
import type { Bar } from "./data";
import { num, sans } from "./fonts";

export const PAL = {
  bg: "#06080e",
  up: "#ff3b4e",
  upHi: "#ff9aa4",
  upLo: "#a90f20",
  down: "#17c98a",
  downHi: "#86f2c8",
  downLo: "#06734b",
  gold: "#ffcf6a",
  cyan: "#5fd4ff",
  warn: "#ff8a4c",
  ink: "#f4f6fa",
  soft: "#b9c4d3",
  dim: "#6f7c8f",
  plate: "#0b1019",
  line: "#9fb2cc",
};

// ---------------------------------------------------------------- timing helpers
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ease = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const out3 = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
/** 0→1 over d frames from a (eased) */
export const ramp = (f: number, a: number, d = 12) => ease((f - a) / d);
/** visible from a to b with fade in/out */
export const win = (f: number, a: number, b = 1e9, fi = 8, fo = 8) => Math.min(clamp01((f - a) / fi), clamp01((b - f) / fo));

// ---------------------------------------------------------------- chart geometry (screen px)
/** i0/i1 = first/last bar slot shown (fractional for camera moves) */
export type Chart = { x: number; y: number; w: number; h: number; i0: number; i1: number; plo: number; phi: number };
export const slot = (c: Chart) => c.w / (c.i1 - c.i0 + 1);
export const cx = (c: Chart, i: number) => c.x + (i - c.i0 + 0.5) * slot(c);
export const cy = (c: Chart, p: number) => c.y + ((c.phi - p) / (c.phi - c.plo)) * c.h;
export const bodyW = (c: Chart) => Math.min(84, slot(c) * 0.62);
export const lerpChart = (a: Chart, b: Chart, t: number): Chart => {
  const k = ease(t);
  const m = (x: number, y: number) => x + (y - x) * k;
  return { x: m(a.x, b.x), y: m(a.y, b.y), w: m(a.w, b.w), h: m(a.h, b.h), i0: m(a.i0, b.i0), i1: m(a.i1, b.i1), plo: m(a.plo, b.plo), phi: m(a.phi, b.phi) };
};
/** camera: a list of [frame, view]; holds between keys, eased move of `dur` frames starting at each key */
export const camera = (f: number, keys: [number, Chart][], dur = 26): Chart => {
  let c = keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    const [a, v] = keys[k];
    if (f >= a) c = lerpChart(c, v, (f - a) / dur);
  }
  return c;
};

/** a bar drawn g (0..1) of the way from its open */
export const grown = (b: Bar, g: number): Bar => {
  if (g >= 1) return b;
  const c = b.o + (b.c - b.o) * g;
  return { ...b, c, h: Math.max(b.o, c) + (b.h - Math.max(b.o, b.c)) * g, l: Math.min(b.o, c) - (Math.min(b.o, b.c) - b.l) * g, v: b.v * g };
};

// ---------------------------------------------------------------- candles
export type CandleProps = {
  c: Chart;
  bars: Bar[];
  /** growth per bar, 0 hides it */
  g?: (i: number) => number;
  op?: (i: number) => number;
  glow?: (i: number) => number;
  clip?: string;
};
export const Candles: React.FC<CandleProps> = ({ c, bars, g = () => 1, op = () => 1, glow = () => 0, clip }) => {
  const bw = bodyW(c);
  const ww = Math.max(2, Math.min(6, slot(c) * 0.07));
  const out: React.ReactNode[] = [];
  const a = Math.max(0, Math.floor(c.i0 - 1));
  const b = Math.min(bars.length - 1, Math.ceil(c.i1 + 1));
  for (let i = a; i <= b; i++) {
    const gi = g(i);
    if (gi <= 0) continue;
    const bar = grown(bars[i], gi);
    const up = bars[i].c >= bars[i].o;
    const x = cx(c, i);
    const yT = cy(c, Math.max(bar.o, bar.c));
    const yB = cy(c, Math.min(bar.o, bar.c));
    const hgt = Math.max(2, yB - yT);
    const o = op(i);
    const gl = glow(i);
    const fill = up ? PAL.up : PAL.down;
    out.push(
      <g key={i}>
        {gl > 0 && <rect x={x - bw / 2 - 9} y={yT - 9} width={bw + 18} height={hgt + 18} rx={10} fill={fill} fillOpacity={0.14 * gl * o} />}
        <line x1={x} x2={x} y1={cy(c, bar.h)} y2={cy(c, bar.l)} stroke={fill} strokeOpacity={o} strokeWidth={ww} strokeLinecap="round" />
        <rect x={x - bw / 2} y={yT} width={bw} height={hgt} rx={Math.min(6, bw * 0.14)} fill={fill} fillOpacity={o} />
        <rect x={x - bw / 2 + bw * 0.1} y={yT + 3} width={Math.max(1, bw * 0.13)} height={Math.max(0, hgt - 6)} rx={2} fill={up ? PAL.upHi : PAL.downHi} fillOpacity={0.5 * o} />
        <rect x={x + bw / 2 - bw * 0.24} y={yT + 3} width={Math.max(1, bw * 0.2)} height={Math.max(0, hgt - 6)} rx={2} fill={up ? PAL.upLo : PAL.downLo} fillOpacity={0.55 * o} />
      </g>,
    );
  }
  return <g clipPath={clip ? `url(#${clip})` : undefined}>{out}</g>;
};

/** volume bars in their own panel (same x as the price chart) */
export const Volume: React.FC<{ c: Chart; y: number; h: number; vmax: number; bars: Bar[]; g?: (i: number) => number; op?: (i: number) => number; hl?: (i: number) => number; clip?: string }> = ({ c, y, h, vmax, bars, g = () => 1, op = () => 1, hl = () => 0, clip }) => {
  const bw = bodyW(c);
  const out: React.ReactNode[] = [];
  for (let i = Math.max(0, Math.floor(c.i0 - 1)); i <= Math.min(bars.length - 1, Math.ceil(c.i1 + 1)); i++) {
    const gi = g(i);
    if (gi <= 0) continue;
    const up = bars[i].c >= bars[i].o;
    const vh = (bars[i].v / vmax) * h * gi;
    const x = cx(c, i);
    const o = op(i);
    const k = hl(i);
    out.push(
      <g key={i}>
        <rect x={x - bw / 2} y={y + h - vh} width={bw} height={vh} rx={3} fill={up ? PAL.up : PAL.down} fillOpacity={(0.42 + 0.5 * k) * o} />
        {k > 0 && <rect x={x - bw / 2 - 4} y={y + h - vh - 4} width={bw + 8} height={vh + 4} rx={5} fill="none" stroke={PAL.gold} strokeOpacity={k * o} strokeWidth={2.5} />}
      </g>,
    );
  }
  return <g clipPath={clip ? `url(#${clip})` : undefined}>{out}</g>;
};

export const ClipRect: React.FC<{ id: string; x: number; y: number; w: number; h: number }> = ({ id, x, y, w, h }) => (
  <defs>
    <clipPath id={id}>
      <rect x={x} y={y} width={w} height={h} />
    </clipPath>
  </defs>
);

/** framed glass panel behind a chart */
export const Panel: React.FC<{ x: number; y: number; w: number; h: number; a?: number; grid?: Chart; step?: number }> = ({ x, y, w, h, a = 1, grid, step = 5 }) => {
  const lines: React.ReactNode[] = [];
  if (grid)
    for (let v = Math.ceil(grid.plo / step) * step; v <= grid.phi; v += step) {
      const yy = cy(grid, v);
      if (yy < y + 6 || yy > y + h - 6) continue;
      lines.push(<line key={v} x1={x + 12} x2={x + w - 12} y1={yy} y2={yy} stroke={PAL.line} strokeOpacity={0.08 * a} strokeWidth={1.5} />);
    }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={22} fill="#0a0f18" fillOpacity={0.86 * a} stroke="#a9bcd8" strokeOpacity={0.16 * a} strokeWidth={2} />
      <rect x={x + 1} y={y + 1} width={w - 2} height={3} rx={1.5} fill="#ffffff" fillOpacity={0.06 * a} />
      {lines}
    </g>
  );
};

// ---------------------------------------------------------------- labels (HTML, screen px)
export type Ln = { t: string; size?: number; w?: 500 | 700 | 900; color?: string; at?: number; f?: number };
const TONES: Record<string, string> = { gold: PAL.gold, cyan: PAL.cyan, warn: PAL.warn, up: PAL.up, white: "rgba(255,255,255,0.5)" };
export const tone = (t?: string) => (t ? TONES[t] ?? t : TONES.white);
/** a label box anchored at (x, y): ax/ay pick which point of the box sits there (0 left/top … 1 right/bottom) */
export const Label: React.FC<{ x: number; y: number; ax?: number; ay?: number; lines: Ln[]; tone?: string; a: number; f: number; plain?: boolean; align?: "left" | "center" | "right" }> = ({ x, y, ax = 0, ay = 0, lines, tone: tn, a, f, plain, align = "left" }) => {
  if (a <= 0.001) return null;
  const rise = (1 - a) * 10;
  return (
    <div style={{ position: "absolute", left: x, top: y + rise, transform: `translate(${-ax * 100}%, ${-ay * 100}%)`, opacity: a, padding: plain ? 0 : "10px 20px 12px", background: plain ? "transparent" : PAL.plate, border: plain ? "none" : `2.5px solid ${tone(tn)}`, borderRadius: 14, whiteSpace: "nowrap", textAlign: align }}>
      {lines.map((l) => (
        <div key={l.t} style={{ ...sans(l.w ?? 900), fontSize: l.size ?? 38, lineHeight: 1.25, color: l.color ? tone(l.color) : PAL.ink, opacity: l.at !== undefined ? clamp01((f - l.at) / 8) : 1 }}>
          {l.t}
        </div>
      ))}
    </div>
  );
};

/** a straight leader from p to q, drawn progressively */
export const Leader: React.FC<{ p: [number, number]; q: [number, number]; k: number; color: string; dash?: boolean }> = ({ p, q, k, color, dash }) =>
  k <= 0.001 ? null : (
    <>
      <line x1={p[0]} y1={p[1]} x2={p[0] + (q[0] - p[0]) * k} y2={p[1] + (q[1] - p[1]) * k} stroke={color} strokeOpacity={Math.min(1, k * 2)} strokeWidth={2.5} strokeDasharray={dash ? "8 6" : undefined} />
      <circle cx={p[0]} cy={p[1]} r={6} fill={color} fillOpacity={Math.min(1, k * 2)} />
    </>
  );

// ---------------------------------------------------------------- checklist chips
/** state: 0 = pending (dim), 1 = ticked, -1 = failed */
export const Chip: React.FC<{ x: number; y: number; w: number; text: string; state: number; k: number; a: number; n?: string }> = ({ x, y, w, text, state, k, a, n }) => {
  if (a <= 0.001) return null;
  const ok = state > 0;
  const bad = state < 0;
  const col = bad ? PAL.warn : ok ? PAL.gold : "#5d6a7e";
  const pop = 1 + 0.06 * Math.sin(Math.PI * clamp01(k));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 76, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 14, padding: "0 20px", opacity: a, background: ok || bad ? "#111824" : "#0b1019", border: `2.5px solid ${col}`, borderRadius: 38, transform: `scale(${pop})` }}>
      <svg width={40} height={40} style={{ flex: "none" }}>
        <circle cx={20} cy={20} r={17} fill={ok || bad ? col : "none"} stroke={col} strokeWidth={2.5} />
        {ok && <path d="M11 20.5 L17.5 27 L29 14" fill="none" stroke="#10141c" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
        {bad && <path d="M13 13 L27 27 M27 13 L13 27" fill="none" stroke="#10141c" strokeWidth={4} strokeLinecap="round" />}
        {!ok && !bad && n && (
          <text x={20} y={27} textAnchor="middle" style={{ ...num(700), fontSize: 20 }} fill={col}>
            {n}
          </text>
        )}
      </svg>
      <div style={{ ...sans(ok || bad ? 900 : 700), fontSize: 34, color: ok || bad ? PAL.ink : "#8a96a8", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
};

// ---------------------------------------------------------------- header + captions + corner tag
export const Header: React.FC<{ n: string; title: string; a: number; f: number; from: number }> = ({ n, title, a, f, from }) => {
  if (a <= 0.001) return null;
  const k = out3((f - from) / 14);
  return (
    <div style={{ position: "absolute", left: 60, top: 168, opacity: a }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
        <div style={{ ...num(700), fontSize: 50, color: PAL.gold, transform: `translateY(${(1 - k) * 16}px)` }}>{n}</div>
        <div style={{ ...sans(900), fontSize: 62, color: PAL.ink, letterSpacing: 1, transform: `translateY(${(1 - k) * 24}px)`, opacity: k }}>{title}</div>
      </div>
      <div style={{ marginTop: 14, height: 4, width: 96 * k, background: PAL.gold, borderRadius: 2 }} />
    </div>
  );
};

const HIDE = new Set(["r3", "r4", "e1", "e2"]); // the picture shows these lines as statements
export const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to && !HIDE.has(x.line));
  if (!c) return null;
  const a = Math.min(clamp01((f - c.from) / 4), clamp01((c.to - f) / 3));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1516, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ ...sans(700), fontSize: 56, lineHeight: "76px", color: PAL.ink, padding: "4px 30px 8px", background: "rgba(5,8,14,0.82)", borderRadius: 16, whiteSpace: "nowrap" }}>{c.text}</div>
    </div>
  );
};

export const Corner: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 60, top: 104, display: "flex", alignItems: "center", gap: 10, ...sans(700), fontSize: 28, color: PAL.soft, letterSpacing: 4 }}>
    <div style={{ width: 10, height: 10, borderRadius: 5, background: PAL.gold }} />
    {text}
  </div>
);
