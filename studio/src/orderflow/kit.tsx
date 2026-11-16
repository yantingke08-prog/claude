// Drawing kit for the order-flow film: chart geometry, data-driven candles (wick first, then body), price axis,
// Delta bars, CVD line, footprint ladder, labels and captions. Dark trading-terminal look, green up / red down.
// Solid fills and leaf opacity only (gradients / blur / group opacity rasterise unevenly in headless Chrome).
import React from "react";
import { captions } from "./cue";
import type { Bar, Level } from "./data";
import { num, sans } from "./fonts";

export const PAL = {
  bg: "#05070b",
  up: "#1fd18b",
  upHi: "#8ff5c9",
  upLo: "#0a7a50",
  down: "#ff4d5e",
  downHi: "#ff9ea8",
  downLo: "#a5162a",
  gold: "#ffcf5a",
  cyan: "#56cdfc",
  warn: "#ff8a3d",
  ink: "#f2f5f9",
  soft: "#aab6c6",
  dim: "#647186",
  plate: "#0a0f17",
  grid: "#93a7c2",
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
export const bodyW = (c: Chart) => Math.min(70, slot(c) * 0.64);
export const lerpChart = (a: Chart, b: Chart, t: number): Chart => {
  const k = ease(t);
  const m = (x: number, y: number) => x + (y - x) * k;
  return { x: m(a.x, b.x), y: m(a.y, b.y), w: m(a.w, b.w), h: m(a.h, b.h), i0: m(a.i0, b.i0), i1: m(a.i1, b.i1), plo: m(a.plo, b.plo), phi: m(a.phi, b.phi) };
};
/** camera: a list of [frame, view, dur?]; holds between keys, eased move starting at each key */
export const camera = (f: number, keys: [number, Chart, number?][]): Chart => {
  let c = keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    const [a, v, d = 30] = keys[k];
    if (f >= a) c = lerpChart(c, v, (f - a) / d);
  }
  return c;
};

// ---------------------------------------------------------------- candles
export type CandleProps = {
  c: Chart;
  bars: Bar[];
  /** growth per bar 0..1: the first 40 % pulls the wicks out from the open, the rest grows the body */
  g?: (i: number) => number;
  op?: (i: number) => number;
  /** 0..1: body narrows to a thin line (footprint view) */
  thin?: (i: number) => number;
  clip?: string;
};
export const Candles: React.FC<CandleProps> = ({ c, bars, g = () => 1, op = () => 1, thin = () => 0, clip }) => {
  const out: React.ReactNode[] = [];
  const a = Math.max(0, Math.floor(c.i0 - 1));
  const b = Math.min(bars.length - 1, Math.ceil(c.i1 + 1));
  for (let i = a; i <= b; i++) {
    const gi = g(i);
    if (gi <= 0) continue;
    const o = op(i);
    if (o <= 0.001) continue;
    const bar = bars[i];
    const wk = out3(gi / 0.4);
    const bk = out3((gi - 0.4) / 0.6);
    const up = bar.c >= bar.o;
    const close = bar.o + (bar.c - bar.o) * bk;
    const hi = bar.o + (bar.h - bar.o) * wk;
    const lo = bar.o - (bar.o - bar.l) * wk;
    const x = cx(c, i);
    const bw = bodyW(c) * (1 - 0.82 * thin(i));
    const ww = Math.max(1.6, Math.min(4, slot(c) * 0.08));
    const yT = cy(c, Math.max(bar.o, close));
    const yB = cy(c, Math.min(bar.o, close));
    const hgt = Math.max(2, yB - yT);
    const fill = up ? PAL.up : PAL.down;
    out.push(
      <g key={i}>
        <line x1={x} x2={x} y1={cy(c, hi)} y2={cy(c, lo)} stroke={fill} strokeOpacity={o} strokeWidth={ww} strokeLinecap="round" />
        {bk > 0 && (
          <>
            <rect x={x - bw / 2} y={yT} width={bw} height={hgt} rx={Math.min(4, bw * 0.12)} fill={fill} fillOpacity={o} />
            {bw > 14 && <rect x={x - bw / 2 + bw * 0.12} y={yT + 3} width={Math.max(1, bw * 0.12)} height={Math.max(0, hgt - 6)} rx={2} fill={up ? PAL.upHi : PAL.downHi} fillOpacity={0.45 * o} />}
            {bw > 14 && <rect x={x + bw / 2 - bw * 0.22} y={yT + 3} width={Math.max(1, bw * 0.18)} height={Math.max(0, hgt - 6)} rx={2} fill={up ? PAL.upLo : PAL.downLo} fillOpacity={0.5 * o} />}
          </>
        )}
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

/** terminal panel: frame, horizontal grid at price steps, vertical grid every `vstep` bars */
export const Panel: React.FC<{ x: number; y: number; w: number; h: number; a?: number; grid?: Chart; step?: number; vstep?: number }> = ({ x, y, w, h, a = 1, grid, step = 10, vstep = 6 }) => {
  const lines: React.ReactNode[] = [];
  if (grid) {
    for (let v = Math.ceil(grid.plo / step) * step; v <= grid.phi; v += step) {
      const yy = cy(grid, v);
      if (yy < y + 4 || yy > y + h - 4) continue;
      lines.push(<line key={`h${v}`} x1={x} x2={x + w} y1={yy} y2={yy} stroke={PAL.grid} strokeOpacity={0.09 * a} strokeWidth={1.2} />);
    }
    for (let i = Math.ceil(grid.i0 / vstep) * vstep; i <= grid.i1 + 1; i += vstep) {
      const xx = cx(grid, i);
      if (xx < x + 4 || xx > x + w - 4) continue;
      lines.push(<line key={`v${i}`} x1={xx} x2={xx} y1={y} y2={y + h} stroke={PAL.grid} strokeOpacity={0.06 * a} strokeWidth={1.2} />);
    }
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill="#080c13" fillOpacity={0.92 * a} stroke="#9fb3cf" strokeOpacity={0.14 * a} strokeWidth={1.5} />
      {lines}
    </g>
  );
};

/** right-hand price axis with a last-price tag */
export const PriceAxis: React.FC<{ c: Chart; x: number; a?: number; step?: number; last?: number; lastUp?: boolean }> = ({ c, x, a = 1, step = 10, last, lastUp = true }) => {
  const out: React.ReactNode[] = [];
  for (let v = Math.ceil(c.plo / step) * step; v <= c.phi; v += step) {
    const yy = cy(c, v);
    if (yy < c.y + 12 || yy > c.y + c.h - 12) continue;
    out.push(
      <text key={v} x={x} y={yy + 8} style={{ ...num(500), fontSize: 22 }} fill={PAL.soft} fillOpacity={0.75 * a}>
        {v.toFixed(0)}
      </text>,
    );
  }
  if (last !== undefined) {
    const yy = Math.min(c.y + c.h - 16, Math.max(c.y + 16, cy(c, last)));
    const col = lastUp ? PAL.up : PAL.down;
    out.push(
      <g key="last">
        <line x1={c.x} x2={x - 8} y1={yy} y2={yy} stroke={col} strokeOpacity={0.45 * a} strokeWidth={1.4} strokeDasharray="3 5" />
        <rect x={x - 6} y={yy - 17} width={98} height={34} rx={5} fill={col} fillOpacity={a} />
        <text x={x + 43} y={yy + 8} textAnchor="middle" style={{ ...num(700), fontSize: 22 }} fill="#05110b" fillOpacity={a}>
          {last.toFixed(1)}
        </text>
      </g>,
    );
  }
  return <g>{out}</g>;
};

/** Delta histogram (zero line in the middle of the panel) */
export const DeltaBars: React.FC<{ c: Chart; y: number; h: number; dmax: number; bars: Bar[]; g?: (i: number) => number; op?: (i: number) => number; hl?: (i: number) => number; clip?: string }> = ({ c, y, h, dmax, bars, g = () => 1, op = () => 1, hl = () => 0, clip }) => {
  const bw = bodyW(c);
  const mid = y + h / 2;
  const out: React.ReactNode[] = [<line key="z" x1={c.x} x2={c.x + c.w} y1={mid} y2={mid} stroke={PAL.grid} strokeOpacity={0.25} strokeWidth={1.2} />];
  for (let i = Math.max(0, Math.floor(c.i0 - 1)); i <= Math.min(bars.length - 1, Math.ceil(c.i1 + 1)); i++) {
    const gi = out3(g(i));
    if (gi <= 0) continue;
    const d = bars[i].d;
    const hh = Math.min(h / 2 - 4, (Math.abs(d) / dmax) * (h / 2 - 4)) * gi;
    const x = cx(c, i);
    const o = op(i);
    const k = hl(i);
    const yy = d >= 0 ? mid - hh : mid;
    out.push(
      <g key={i}>
        <rect x={x - bw / 2} y={yy} width={bw} height={Math.max(1, hh)} rx={2} fill={d >= 0 ? PAL.up : PAL.down} fillOpacity={(0.5 + 0.5 * k) * o} />
        {k > 0 && <rect x={x - bw / 2 - 4} y={yy - 4} width={bw + 8} height={hh + 8} rx={4} fill="none" stroke={PAL.gold} strokeOpacity={k * o} strokeWidth={2.5} />}
      </g>,
    );
  }
  return <g clipPath={clip ? `url(#${clip})` : undefined}>{out}</g>;
};

/** CVD polyline through the bar centres (drawn up to bar `upto`, fractional) */
export const CvdLine: React.FC<{ c: Chart; y: number; h: number; lo: number; hi: number; vals: number[]; upto: number; a?: number; clip?: string; color?: string }> = ({ c, y, h, lo, hi, vals, upto, a = 1, clip, color = PAL.cyan }) => {
  const pts: string[] = [];
  const Y = (v: number) => y + ((hi - v) / (hi - lo)) * h;
  const last = Math.min(vals.length - 1, Math.floor(upto));
  for (let i = 0; i <= last; i++) pts.push(`${cx(c, i).toFixed(1)},${Y(vals[i]).toFixed(1)}`);
  const fr = upto - last;
  if (fr > 0 && last + 1 < vals.length) pts.push(`${cx(c, last + fr).toFixed(1)},${Y(vals[last] + (vals[last + 1] - vals[last]) * fr).toFixed(1)}`);
  const tip = pts[pts.length - 1]?.split(",").map(Number);
  return (
    <g clipPath={clip ? `url(#${clip})` : undefined}>
      <line x1={c.x} x2={c.x + c.w} y1={Y(0)} y2={Y(0)} stroke={PAL.grid} strokeOpacity={0.2 * a} strokeWidth={1.2} strokeDasharray="4 6" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeOpacity={a} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
      {tip && <circle cx={tip[0]} cy={tip[1]} r={6} fill={color} fillOpacity={a} />}
    </g>
  );
};

/** footprint ladder for one bar: bid volume grows left from the centre (red), ask right (green) */
export const Footprint: React.FC<{ c: Chart; i: number; levels: Level[]; vmax: number; a: number; hot?: (p: number) => number }> = ({ c, i, levels, vmax, a, hot = () => 0 }) => {
  if (a <= 0.001) return null;
  const x = cx(c, i);
  const half = slot(c) * 0.46;
  const out: React.ReactNode[] = [];
  for (const l of levels) {
    const y0 = cy(c, l.p + 0.5);
    const y1 = cy(c, l.p - 0.5);
    const hgt = Math.max(1, y1 - y0 - 2);
    const hk = hot(l.p);
    const bw = Math.min(1, l.bid / (vmax * 0.4)) * half;
    const aw = Math.min(1, l.ask / (vmax * 0.4)) * half;
    const txt = slot(c) >= 70 && hgt >= 17;
    out.push(
      <g key={l.p}>
        <rect x={x - half} y={y0 + 1} width={half * 2} height={hgt} fill="#ffffff" fillOpacity={0.025 * a} />
        <rect x={x - bw} y={y0 + 1} width={bw} height={hgt} fill={PAL.down} fillOpacity={(0.32 + 0.5 * hk) * a} />
        <rect x={x} y={y0 + 1} width={aw} height={hgt} fill={PAL.up} fillOpacity={(0.32 + 0.5 * hk) * a} />
        {txt && (
          <>
            <text x={x - 4} y={y0 + hgt / 2 + 6} textAnchor="end" style={{ ...num(700), fontSize: 16 }} fill="#ffffff" fillOpacity={(0.75 + 0.25 * hk) * a}>
              {l.bid}
            </text>
            <text x={x + 4} y={y0 + hgt / 2 + 6} textAnchor="start" style={{ ...num(700), fontSize: 16 }} fill="#ffffff" fillOpacity={(0.75 + 0.25 * hk) * a}>
              {l.ask}
            </text>
          </>
        )}
      </g>,
    );
  }
  out.push(<line key="c" x1={x} x2={x} y1={cy(c, levels[levels.length - 1].p + 0.5)} y2={cy(c, levels[0].p - 0.5)} stroke="#ffffff" strokeOpacity={0.25 * a} strokeWidth={1} />);
  return <g>{out}</g>;
};

/** dashed box in screen px */
export const DashBox: React.FC<{ x: number; y: number; w: number; h: number; k: number; color?: string; fill?: number }> = ({ x, y, w, h, k, color = PAL.gold, fill = 0.08 }) =>
  k <= 0.001 ? null : (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={color} fillOpacity={fill * k} />
      <rect x={x} y={y} width={w} height={h} rx={6} fill="none" stroke={color} strokeOpacity={k} strokeWidth={2.6} strokeDasharray="10 7" pathLength={1000} strokeDashoffset={(1 - k) * 0} />
    </g>
  );

/** horizontal level line with a dashed body */
export const HLine: React.FC<{ x0: number; x1: number; y: number; k: number; color: string; dash?: boolean; w?: number }> = ({ x0, x1, y, k, color, dash = true, w = 2.6 }) =>
  k <= 0.001 ? null : <line x1={x0} x2={x0 + (x1 - x0) * out3(k)} y1={y} y2={y} stroke={color} strokeOpacity={Math.min(1, k * 1.5)} strokeWidth={w} strokeDasharray={dash ? "12 8" : undefined} />;

/** straight arrow p → q, drawn progressively */
export const Arrow: React.FC<{ p: [number, number]; q: [number, number]; k: number; color: string; w?: number }> = ({ p, q, k, color, w = 4 }) => {
  if (k <= 0.001) return null;
  const t = out3(k);
  const ex = p[0] + (q[0] - p[0]) * t;
  const ey = p[1] + (q[1] - p[1]) * t;
  const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
  const hs = 16;
  const h1 = [ex - hs * Math.cos(ang - 0.5), ey - hs * Math.sin(ang - 0.5)];
  const h2 = [ex - hs * Math.cos(ang + 0.5), ey - hs * Math.sin(ang + 0.5)];
  return (
    <g>
      <line x1={p[0]} y1={p[1]} x2={ex} y2={ey} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <path d={`M${h1[0]},${h1[1]} L${ex},${ey} L${h2[0]},${h2[1]}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

// ---------------------------------------------------------------- labels (HTML, screen px)
const TONES: Record<string, string> = { gold: PAL.gold, cyan: PAL.cyan, warn: PAL.warn, up: PAL.up, down: PAL.down, white: "rgba(255,255,255,0.45)" };
export const tone = (t?: string) => (t ? TONES[t] ?? t : TONES.white);
/** bilingual tag anchored at (x, y); ax/ay choose the anchor point of the box (0 left/top … 1 right/bottom) */
export const Tag: React.FC<{ x: number; y: number; ax?: number; ay?: number; zh: string; en?: string; tone?: string; a: number; size?: number; plain?: boolean; align?: "left" | "center" | "right" }> = ({ x, y, ax = 0, ay = 0, zh, en, tone: tn = "gold", a, size = 36, plain, align = "left" }) => {
  if (a <= 0.001) return null;
  const rise = (1 - a) * 8;
  return (
    <div style={{ position: "absolute", left: x, top: y + rise, transform: `translate(${-ax * 100}%, ${-ay * 100}%)`, opacity: a, padding: plain ? 0 : "8px 18px 10px", background: plain ? "transparent" : "rgba(8,12,19,0.92)", border: plain ? "none" : `2px solid ${tone(tn)}`, borderRadius: 10, whiteSpace: "nowrap", textAlign: align }}>
      <div style={{ ...sans(900), fontSize: size, lineHeight: 1.2, color: plain ? tone(tn) : PAL.ink }}>{zh}</div>
      {en && <div style={{ ...num(500), fontSize: Math.round(size * 0.58), lineHeight: 1.25, color: plain ? PAL.soft : tone(tn), letterSpacing: 0.5 }}>{en}</div>}
    </div>
  );
};

// ---------------------------------------------------------------- chapter header + captions + top bar
export const Header: React.FC<{ n: string; zh: string; en: string; a: number; f: number; from: number }> = ({ n, zh, en, a, f, from }) => {
  if (a <= 0.001) return null;
  const k = out3((f - from) / 14);
  return (
    <div style={{ position: "absolute", left: 50, top: 178, opacity: a, display: "flex", alignItems: "center", gap: 22 }}>
      {n && (
        <div style={{ ...num(700), fontSize: 30, color: "#05070b", background: PAL.gold, borderRadius: 8, padding: "4px 12px", transform: `translateY(${(1 - k) * 12}px)` }}>{n}</div>
      )}
      <div style={{ transform: `translateY(${(1 - k) * 18}px)`, opacity: k }}>
        <div style={{ ...sans(900), fontSize: 52, lineHeight: 1.15, color: PAL.ink }}>{zh}</div>
        <div style={{ ...num(500), fontSize: 26, lineHeight: 1.3, color: PAL.soft, letterSpacing: 1 }}>{en}</div>
      </div>
    </div>
  );
};

export const Captions: React.FC<{ f: number; hide?: Set<string>; top?: number }> = ({ f, hide, top = 1530 }) => {
  const c = captions.find((x) => f >= x.from && f < x.to && !hide?.has(x.line));
  if (!c) return null;
  const a = Math.min(clamp01((f - c.from) / 4), clamp01((c.to - f) / 3));
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: a }}>
      <div style={{ ...sans(700), fontSize: 54, lineHeight: "72px", color: PAL.ink, padding: "2px 26px 6px", background: "rgba(4,6,10,0.85)", borderRadius: 12, whiteSpace: "nowrap" }}>{c.text}</div>
      <div style={{ ...num(500), fontSize: 30, lineHeight: "40px", color: PAL.soft, textAlign: "center", maxWidth: 960, padding: "0 16px", background: "rgba(4,6,10,0.7)", borderRadius: 8 }}>{c.en}</div>
    </div>
  );
};

export const TopBar: React.FC<{ symbol: string; tf: string; tag: string; risk: string; price?: number; up?: boolean }> = ({ symbol, tf, tag, risk, price, up = true }) => (
  <>
    <div style={{ position: "absolute", left: 50, top: 92, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: PAL.up }} />
      <div style={{ ...num(700), fontSize: 30, color: PAL.ink, letterSpacing: 1 }}>{symbol}</div>
      <div style={{ ...num(500), fontSize: 24, color: PAL.soft, border: "1.5px solid rgba(170,182,198,0.4)", borderRadius: 6, padding: "1px 10px" }}>{tf}</div>
      {price !== undefined && <div style={{ ...num(700), fontSize: 30, color: up ? PAL.up : PAL.down }}>{price.toFixed(1)}</div>}
      <div style={{ ...sans(700), fontSize: 24, color: PAL.dim, marginLeft: 6, letterSpacing: 2 }}>{tag}</div>
    </div>
    <div style={{ position: "absolute", right: 50, top: 96, ...sans(700), fontSize: 24, color: PAL.soft, letterSpacing: 1 }}>{risk}</div>
  </>
);
