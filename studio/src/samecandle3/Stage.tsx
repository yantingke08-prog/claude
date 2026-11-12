// The 2D layers of v3: a fixed screen-space background, one chart layer per scene, annotations on top.
// Nothing here moves unless the frame number changes what is drawn (a bar growing, an annotation drawing in).
import React from "react";
import { captions } from "./cue";
import { HERO, HERO_BAR, LANES, POS, POSMAP, avgVol, type Bar, type LaneId } from "./data";
import { type Beat, type Pt, type ChartKey, BEATS, CHAPTERS, COND_LABELS, END_TEXT, NAME, PATHS, PCT, THREE_ITEMS, chartOf, rowFocus, vis } from "./beats";
import { type Chart, CUT, HOLD_CHART, IDS, POS_CHART, ROW, ROW_H, ROW_Y, VCOL_W, VCOL_X, WHY, bodyW, clamp01, cx, cy, ease, holdPost, mix, rowChart, rowPost, slot, volBars, volPost, volPrice } from "./layout";
import { num, sans } from "./fonts";

export const PAL = {
  bg: "#05070c",
  up: "#ff3347",
  upHi: "#ff8a95",
  upLo: "#b3101f",
  down: "#14c785",
  downHi: "#7ff0c4",
  downLo: "#077a50",
  gold: "#ffd166",
  ink: "#f5f7fa",
  soft: "rgba(232,238,246,0.76)",
  plate: "rgba(7,10,17,0.92)",
  lane: { A: "#4cc9ff", B: "#a98bff", C: "#f2b84b" } as Record<LaneId, string>,
};
const TONE = { gold: PAL.gold, white: "#eef3fa", up: PAL.up, down: PAL.down, warn: "#ff6b5e" };
const pctColor = (id: LaneId) => (PCT[id].startsWith("+") ? PAL.up : PAL.down);

// ---------------------------------------------------------------- fixed background (screen space)
// Solid fills only, everywhere: a CSS/SVG gradient or blur filter is rasterised with slightly different dithering in each
// render tab, which shows up as 1–4-level flicker between frames (found by the motion check).
export const Background: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <pattern id="grid" width={60} height={60} patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#8fa6c6" strokeOpacity={0.06} strokeWidth={1} />
      </pattern>
    </defs>
    <rect width={1080} height={1920} fill="#070a11" />
    <rect width={1080} height={1920} fill="url(#grid)" />
  </svg>
);

// ---------------------------------------------------------------- candles
const Defs: React.FC = () => (
  <defs>
    <linearGradient id="gUp" x1="0" x2="1">
      <stop offset="0" stopColor={PAL.upHi} />
      <stop offset="0.35" stopColor={PAL.up} />
      <stop offset="1" stopColor={PAL.upLo} />
    </linearGradient>
    <linearGradient id="gDown" x1="0" x2="1">
      <stop offset="0" stopColor={PAL.downHi} />
      <stop offset="0.35" stopColor={PAL.down} />
      <stop offset="1" stopColor={PAL.downLo} />
    </linearGradient>
    <filter id="heroGlow" x="-200%" y="-50%" width="500%" height="200%">
      <feGaussianBlur stdDeviation="7" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

/** a bar that is still growing draws from its open toward its close */
const grown = (b: Bar, g: number) => {
  const k = Math.min(1, g * 1.25);
  const c = b.o + (b.c - b.o) * k;
  const w = clamp01((g - 0.35) / 0.65);
  return { o: b.o, c, h: Math.max(b.o, c) + (b.h - Math.max(b.o, c)) * w, l: Math.min(b.o, c) - (Math.min(b.o, c) - b.l) * w, v: b.v * Math.min(1, g * 1.4) };
};

type CandleOpts = { bars: Bar[]; c: Chart; post: number; hero?: number; heroGlow?: boolean; dimPre?: number; dimPost?: number; from?: number; mul?: number };
const Candles: React.FC<CandleOpts> = ({ bars, c, post, hero = HERO, heroGlow = false, dimPre = 1, dimPost = 1, from, mul = 1 }) => {
  const out: React.ReactNode[] = [];
  const bw = bodyW(c);
  const ww = Math.max(2, Math.min(5, slot(c) * 0.075));
  const i0 = Math.max(0, Math.ceil(c.i0 - 0.5), from ?? 0);
  const i1 = Math.min(bars.length - 1, Math.floor(c.i1 + 0.5));
  for (let i = i0; i <= i1; i++) {
    const g = i <= hero ? 1 : clamp01(post - (i - hero - 1));
    if (g <= 0) continue;
    const b = grown(bars[i], g);
    const up = bars[i].c >= bars[i].o;
    const x = cx(c, i);
    const yT = cy(c, Math.max(b.o, b.c));
    const yB = cy(c, Math.min(b.o, b.c));
    const isHero = i === hero;
    const op = (isHero ? 1 : i < hero ? dimPre : dimPost) * mul;
    const fill = up ? PAL.up : PAL.down;
    const col = up ? PAL.up : PAL.down;
    out.push(
      <g key={i}>
        {isHero && heroGlow && <rect x={x - bw / 2 - 6} y={yT - 6} width={bw + 12} height={Math.max(2, yB - yT) + 12} rx={Math.min(8, bw * 0.3)} fill="none" stroke={PAL.up} strokeOpacity={0.35 * op} strokeWidth={4} />}
        <line x1={x} x2={x} y1={cy(c, b.h)} y2={cy(c, b.l)} stroke={col} strokeOpacity={op} strokeWidth={ww} strokeLinecap="round" />
        <rect x={x - bw / 2} y={yT} width={bw} height={Math.max(2, yB - yT)} rx={Math.min(5, bw * 0.16)} fill={fill} fillOpacity={op} />
        <rect x={x - bw / 2 + bw * 0.12} y={yT + 2} width={Math.max(1, bw * 0.14)} height={Math.max(0, yB - yT - 4)} fill={up ? PAL.upHi : PAL.downHi} fillOpacity={0.55 * op} />
        <rect x={x + bw / 2 - bw * 0.22} y={yT + 2} width={Math.max(1, bw * 0.2)} height={Math.max(0, yB - yT - 4)} fill={up ? PAL.upLo : PAL.downLo} fillOpacity={0.6 * op} />
      </g>,
    );
  }
  return <>{out}</>;
};

/** the chart's own panel: dark glass, thin lane-coloured frame, price grid every 10 */
const Panel: React.FC<{ c: Chart; color?: string; op?: number; grid?: boolean; axis?: boolean }> = ({ c, color = "rgba(160,180,210,0.35)", op = 1, grid = true, axis = false }) => {
  const r = c.r;
  const lines: React.ReactNode[] = [];
  if (grid)
    for (let v = Math.ceil(c.plo / 10) * 10; v <= c.phi; v += 10) {
      const y = cy(c, v);
      if (y < r.y + 4 || y > r.y + r.h - 4) continue;
      lines.push(<line key={v} x1={r.x} x2={r.x + r.w} y1={y} y2={y} stroke="#9fb4d0" strokeOpacity={0.1 * op} strokeWidth={1.5} />);
      if (axis)
        lines.push(
          <text key={`t${v}`} x={r.x + r.w - 8} y={y - 8} textAnchor="end" style={{ ...num(500), fontSize: 24 }} fill="rgb(200,214,232)" fillOpacity={0.5 * op}>
            {v}
          </text>,
        );
    }
  return (
    <g>
      <rect x={r.x - 14} y={r.y - 14} width={r.w + 28} height={r.h + 28} rx={16} fill="#080c14" fillOpacity={0.92 * op} stroke={color} strokeOpacity={op} strokeWidth={2} />
      {lines}
    </g>
  );
};

// ---------------------------------------------------------------- annotations
type XY = { x: number; y: number };
const pt = (c: Chart, [i, p]: Pt): XY => ({ x: cx(c, i), y: cy(c, p) });
const seg = (a: XY, b: XY, k: number): XY => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const Plate: React.FC<{ x: number; y: number; align: "left" | "right" | "center"; vAlign?: "middle" | "top" | "bottom"; a: number; color?: string; children: React.ReactNode; pad?: string }> = ({ x, y, align, vAlign = "middle", a, color = "rgba(255,255,255,0.4)", children, pad = "10px 18px" }) => {
  const tx = align === "left" ? "0" : align === "right" ? "-100%" : "-50%";
  const ty = vAlign === "middle" ? "-50%" : vAlign === "top" ? "0" : "-100%";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, ${ty})`, opacity: a, background: PAL.plate, border: `2px solid ${color}`, borderRadius: 14, padding: pad, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};
const T1: React.FC<{ t: string; size?: number; color?: string }> = ({ t, size = 42, color = PAL.ink }) => <div style={{ ...sans(900), fontSize: size, lineHeight: 1.18, color, letterSpacing: 1 }}>{t}</div>;
const T2: React.FC<{ t: string; size?: number; color?: string }> = ({ t, size = 34, color = PAL.soft }) => <div style={{ ...sans(700), fontSize: size, lineHeight: 1.25, color, marginTop: 2 }}>{t}</div>;
const Dot: React.FC<{ p: XY; k: number; color: string }> = ({ p, k, color }) => (
  <>
    <circle cx={p.x} cy={p.y} r={14 * k} fill="none" stroke={color} strokeWidth={3} />
    <circle cx={p.x} cy={p.y} r={5.5 * k} fill={color} />
  </>
);

type Draw = { svg: React.ReactNode[]; html: React.ReactNode[] };
const fadeIn = (k0: number, from = 0.4) => clamp01((k0 - from) / (1 - from));

const drawBeat = (f: number, b: Beat, out: Draw, dim: number) => {
  const [k0, a0] = vis(b, f);
  if (a0 <= 0.001) return;
  const fa = a0 * dim;
  const k = ease(k0);
  const c = chartOf(b.ch);
  const key = b.id;
  const sl = slot(c);
  switch (b.kind) {
    case "marker": {
      const color = TONE[b.tone ?? "white"];
      const p = pt(c, b.at);
      const e = { x: p.x + b.dx, y: p.y + b.dy };
      const s = seg(p, e, k);
      out.svg.push(
        <g key={key} opacity={fa}>
          <Dot p={p} k={k} color={color} />
          <line x1={p.x} y1={p.y} x2={s.x} y2={s.y} stroke={color} strokeWidth={2.5} />
        </g>,
      );
      out.html.push(
        <Plate key={key} x={e.x} y={e.y} align={b.dx >= 0 ? "left" : "right"} a={fa * fadeIn(k0, 0.45)} color={color}>
          <T1 t={b.text} />
          {b.sub && <T2 t={b.sub} />}
        </Plate>,
      );
      return;
    }
    case "ring": {
      const color = TONE[b.tone ?? "gold"];
      const x = cx(c, b.at[0]);
      const bw = bodyW(c);
      const bar = POSMAP[b.at[0]];
      const y0 = cy(c, bar.h) - 14;
      const y1 = cy(c, bar.l) + 14;
      out.svg.push(<rect key={key} x={x - bw / 2 - 12} y={y0} width={bw + 24} height={(y1 - y0) * k} rx={10} fill="none" stroke={color} strokeWidth={3} opacity={fa} />);
      if (b.label)
        out.html.push(
          <div key={key} style={{ position: "absolute", left: x, top: y1 + 10, transform: "translateX(-50%)", opacity: fa * fadeIn(k0), width: 46, height: 46, borderRadius: 10, border: `2.5px solid ${PAL.lane[b.label as LaneId]}`, background: "rgba(7,10,17,0.9)", display: "flex", alignItems: "center", justifyContent: "center", ...num(700), fontSize: 30, color: PAL.lane[b.label as LaneId] }}>
            {b.label}
          </div>,
        );
      return;
    }
    case "box": {
      const color = TONE[b.tone ?? "white"];
      const x0 = cx(c, b.i0) - sl / 2;
      const x1 = cx(c, b.i1) + sl / 2;
      const y0 = cy(c, b.p1);
      const y1 = cy(c, b.p0);
      out.svg.push(<rect key={key} x={x0} y={y0} width={(x1 - x0) * k} height={y1 - y0} rx={8} fill={color} fillOpacity={0.07} stroke={color} strokeWidth={3} opacity={fa} />);
      out.html.push(
        <Plate key={key} x={x0} y={b.side === "bottom" ? y1 + 14 : y0 - 14} align="left" vAlign={b.side === "bottom" ? "top" : "bottom"} a={fa * fadeIn(k0)} color={color}>
          <T1 t={b.text} />
        </Plate>,
      );
      return;
    }
    case "hline": {
      const color = TONE[b.tone ?? "white"];
      const y = cy(c, b.p);
      const x0 = b.vol ? c.r.x : b.i0 !== undefined ? cx(c, b.i0) - sl / 2 : c.r.x;
      const x1 = c.r.x + c.r.w;
      const gold = b.tone === "gold";
      const xe = x0 + (x1 - x0) * k;
      out.svg.push(
        <g key={key} opacity={fa}>
          {gold && <line x1={x0} x2={xe} y1={y} y2={y} stroke={color} strokeOpacity={0.28} strokeWidth={b.strong ? 16 : 12} />}
          <line x1={x0} x2={xe} y1={y} y2={y} stroke={color} strokeWidth={gold ? 3.5 : 2.5} strokeDasharray={gold ? undefined : "12 9"} />
        </g>,
      );
      if (b.text)
        out.html.push(
          <div key={key} style={{ position: "absolute", left: b.vol ? x0 + 6 : x1 - 6, top: y + (b.side === "below" ? 8 : -8), transform: `translate(${b.vol ? "0" : "-100%"}, ${b.side === "below" ? "0" : "-100%"})`, opacity: fa * fadeIn(k0, 0.5), ...sans(900), fontSize: b.vol ? 34 : 40, color, background: "rgba(5,8,14,0.82)", padding: "2px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>
            {b.text}
          </div>,
        );
      return;
    }
    case "band": {
      const y0 = cy(c, b.p1);
      const y1 = cy(c, b.p0);
      const x0 = cx(c, b.i0) - sl / 2;
      const x1 = mix(x0, c.r.x + c.r.w, k);
      const col = "#ffa95e";
      out.svg.push(
        <g key={key} opacity={fa}>
          <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={col} fillOpacity={0.18} />
          <line x1={x0} x2={x1} y1={y0} y2={y0} stroke={col} strokeWidth={2.5} />
          <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={col} strokeWidth={2.5} />
        </g>,
      );
      out.html.push(
        <Plate key={key} x={x0} y={y0 - 12} align="left" vAlign="bottom" a={fa * fadeIn(k0)} color={col}>
          <T1 t={b.text} />
        </Plate>,
      );
      return;
    }
    case "arrow": {
      const color = TONE[b.tone ?? "white"];
      const p0 = pt(c, b.from);
      const p1 = pt(c, b.to);
      const e = seg(p0, p1, k);
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const hs = 22;
      const head = `M ${e.x} ${e.y} L ${e.x - hs * Math.cos(ang - 0.45)} ${e.y - hs * Math.sin(ang - 0.45)} L ${e.x - hs * Math.cos(ang + 0.45)} ${e.y - hs * Math.sin(ang + 0.45)} Z`;
      out.svg.push(
        <g key={key} opacity={fa}>
          <line x1={p0.x} y1={p0.y} x2={e.x} y2={e.y} stroke={color} strokeOpacity={0.28} strokeWidth={14} strokeLinecap="round" />
          <line x1={p0.x} y1={p0.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={4.5} strokeLinecap="round" />
          <path d={head} fill={color} />
        </g>,
      );
      if (b.text) {
        const up = p1.y < p0.y;
        const atEnd = b.labelAt === "end";
        const m = atEnd ? p1 : seg(p0, p1, 0.2);
        out.html.push(
          <Plate key={key} x={m.x + (atEnd ? 16 : 0)} y={m.y + (atEnd ? 0 : up ? -36 : -36)} align={atEnd ? "left" : "right"} vAlign={atEnd ? "middle" : "bottom"} a={fa * fadeIn(k0, 0.6)} color={color}>
            <T1 t={b.text} />
          </Plate>,
        );
      }
      return;
    }
    case "bracket": {
      const color = TONE[b.tone ?? "white"];
      const bw = bodyW(c);
      const x = cx(c, b.i) + (b.side === "left" ? -bw / 2 - 20 : bw / 2 + 20);
      const t = b.side === "left" ? -14 : 14;
      const y0 = cy(c, b.p1);
      const y1 = cy(c, b.p0);
      const ym = (y0 + y1) / 2;
      out.svg.push(
        <g key={key} opacity={fa} fill="none" stroke={color} strokeWidth={4}>
          <path d={`M ${x - t} ${mix(ym, y0, k)} L ${x} ${mix(ym, y0, k)} L ${x} ${mix(ym, y1, k)} L ${x - t} ${mix(ym, y1, k)}`} />
          {b.mid && <line x1={x} x2={x + t * 1.8} y1={ym} y2={ym} strokeWidth={4} />}
          {b.mid && <circle cx={x} cy={ym} r={6} fill={color} />}
        </g>,
      );
      out.html.push(
        <div key={key} style={{ position: "absolute", left: x + (b.side === "left" ? -16 : 16), top: b.mid ? (y0 + ym) / 2 : ym, transform: `translate(${b.side === "left" ? "-100%" : "0"}, -50%)`, opacity: fa * fadeIn(k0, 0.5), ...sans(900), fontSize: 44, color, whiteSpace: "nowrap" }}>
          {b.text}
        </div>,
      );
      return;
    }
    case "fill": {
      const bw = bodyW(c);
      const x = cx(c, b.i);
      const y0 = cy(c, b.p1);
      const y1 = cy(c, b.p0);
      out.svg.push(
        <g key={key} opacity={fa}>
          <rect x={x - bw / 2 - 8} y={y0} width={bw + 16} height={(y1 - y0) * k} fill="#05070c" fillOpacity={0.66} stroke={TONE.warn} strokeWidth={3} strokeDasharray="8 6" />
          <line x1={x - bw / 2 - 8} x2={c.r.x + 200} y1={(y0 + y1) / 2} y2={y0 - 60} stroke={TONE.warn} strokeWidth={2.5} />
        </g>,
      );
      out.html.push(
        <Plate key={key} x={c.r.x + 14} y={y0 - 60} align="left" vAlign="bottom" a={fa * fadeIn(k0)} color={TONE.warn}>
          <T1 t={b.text} />
          {b.sub && <T2 t={b.sub} />}
        </Plate>,
      );
      return;
    }
    case "card": {
      const p = pt(c, b.at);
      const edge = { x: p.x < b.x ? b.x : p.x > b.x + b.w ? b.x + b.w : b.x + b.w / 2, y: p.y < b.y ? b.y : b.y + 60 };
      const s = seg(p, edge, k);
      out.svg.push(
        <g key={key} opacity={fa}>
          <Dot p={p} k={k} color={PAL.gold} />
          <line x1={p.x} y1={p.y} x2={s.x} y2={s.y} stroke={PAL.gold} strokeWidth={2.5} />
        </g>,
      );
      out.html.push(
        <div key={key} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, opacity: fa * fadeIn(k0, 0.35), background: "#070a11", border: `2.5px solid ${PAL.gold}`, borderRadius: 18, padding: "20px 26px" }}>
          <T1 t={b.title} size={48} />
          {b.lines.map((l) => (
            <div key={l.t} style={{ opacity: clamp01((f - l.at) / 8) }}>
              <T2 t={l.t} size={40} color={PAL.gold} />
            </div>
          ))}
        </div>,
      );
      return;
    }
    case "three": {
      out.html.push(
        <div key={key} style={{ position: "absolute", left: b.x, top: b.y, opacity: fa * fadeIn(k0, 0.2) }}>
          <div style={{ ...sans(900), fontSize: 42, color: PAL.ink, marginBottom: 14 }}>真正决定后面的</div>
          <div style={{ display: "flex", gap: 18 }}>
            {THREE_ITEMS.map((t) => {
              const kk = clamp01((f - t.at) / 9);
              return (
                <div key={t.n} style={{ opacity: kk, display: "flex", alignItems: "baseline", gap: 10, padding: "10px 22px", borderRadius: 14, background: PAL.plate, border: `2px solid ${PAL.gold}` }}>
                  <span style={{ ...num(700), fontSize: 36, color: PAL.gold }}>{t.n}</span>
                  <span style={{ ...sans(900), fontSize: 48, color: PAL.ink }}>{t.t}</span>
                </div>
              );
            })}
          </div>
        </div>,
      );
      return;
    }
    case "chip": {
      out.html.push(
        <Plate key={key} x={b.x} y={b.y} align={b.align} vAlign={b.align === "right" ? "bottom" : "top"} a={fa * clamp01(k0 / 0.6)} color={PAL.gold} pad="12px 20px">
          {b.lines.map((l) => (
            <div key={l.t} style={{ opacity: clamp01((f - l.at) / 8) }}>
              <T1 t={l.t} size={40} />
            </div>
          ))}
        </Plate>,
      );
      return;
    }
    case "ratio": {
      const id = b.lane!;
      const k2 = IDS.indexOf(id);
      const v = volBars(k2);
      const hx = cx(v, HERO);
      const yAvg = cy(v, avgVol(id));
      const yTop = cy(v, LANES[id][HERO].v);
      const bx = hx + slot(v) * 0.5 + 8;
      out.svg.push(<path key={key} d={`M ${bx - 8} ${yAvg} L ${bx} ${yAvg} L ${bx} ${mix(yAvg, yTop, k)} L ${bx - 8} ${mix(yAvg, yTop, k)}`} fill="none" stroke={PAL.gold} strokeWidth={4} opacity={fa} />);
      out.html.push(
        <div key={key} style={{ position: "absolute", left: VCOL_X[k2], top: v.r.y + v.r.h + 30, opacity: fa, display: "flex", alignItems: "baseline", gap: 10, whiteSpace: "nowrap" }}>
          <div style={{ ...num(700), fontSize: 72, lineHeight: 1, color: PAL.gold }}>{b.value}</div>
          <div style={{ ...sans(900), fontSize: 44, color: PAL.ink }}>{b.word}</div>
        </div>,
      );
      return;
    }
    case "stamp": {
      const p = pt(c, b.at);
      const sc = 1.2 - 0.2 * k;
      out.html.push(
        <div key={key} style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%, -50%) scale(${sc})`, opacity: fa * clamp01(k0 * 1.6), border: `6px solid ${TONE.warn}`, borderRadius: 18, padding: "4px 34px", background: "rgba(40,6,6,0.88)", ...sans(900), fontSize: 110, lineHeight: 1.12, color: "#fff", letterSpacing: 16, whiteSpace: "nowrap" }}>
          {b.text}
        </div>,
      );
      return;
    }
    case "path": {
      const id = b.lane;
      const pts = [HERO_BAR.c, ...LANES[id].slice(HERO + 1, HERO + 1 + b.n).map((x) => x.c)].map((p, j) => ({ x: cx(c, HERO + j), y: cy(c, p) }));
      const d = pts.map((q, j) => `${j ? "L" : "M"} ${q.x} ${q.y}`).join(" ");
      const end = pts[pts.length - 1];
      out.svg.push(
        <g key={key} opacity={fa}>
          <path d={d} fill="none" stroke={PAL.lane[id]} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
          {pts.slice(1).map((q, j) => (
            <circle key={j} cx={q.x} cy={q.y} r={5} fill={PAL.lane[id]} />
          ))}
        </g>,
      );
      out.html.push(
        <div key={key} style={{ position: "absolute", left: end.x, top: end.y + (id === "A" ? -22 : 22), transform: `translate(-50%, ${id === "A" ? "-100%" : "0"})`, opacity: fa * fadeIn(k0), ...sans(900), fontSize: 34, color: PAL.lane[id], background: "rgba(5,8,14,0.85)", padding: "2px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>
          {b.text}
        </div>,
      );
      return;
    }
    case "unknown":
    case "answer": {
      const x0 = cx(c, b.kind === "unknown" ? b.i0 : HERO + 1) - sl / 2 - 2;
      const x1 = c.r.x + c.r.w + 4;
      const y0 = c.r.y - 6;
      const y1 = c.r.y + c.r.h + 6;
      const col = b.kind === "answer" ? PAL.gold : "#cfe0f5";
      out.svg.push(<rect key={key} x={x0} y={y0} width={(x1 - x0) * k} height={y1 - y0} rx={12} fill={col} fillOpacity={0.05} stroke={col} strokeWidth={3} strokeDasharray="12 9" opacity={fa} />);
      out.html.push(
        <div key={key} style={{ position: "absolute", left: b.kind === "answer" ? x0 + 14 : (x0 + x1) / 2, top: b.kind === "answer" ? y0 + 12 : (y0 + y1) / 2, transform: b.kind === "answer" ? "none" : "translate(-50%, -50%)", opacity: fa * fadeIn(k0), ...sans(900), fontSize: b.kind === "answer" ? 38 : 64, color: col, whiteSpace: "nowrap" }}>
          {b.kind === "answer" ? "答案在这里" : b.text}
        </div>,
      );
      return;
    }
    case "result":
    case "condHead":
    case "cond": {
      const id = b.lane!;
      const y = ROW_Y[IDS.indexOf(id)];
      if (b.kind === "result") {
        out.html.push(
          <React.Fragment key={key}>
            <div style={{ position: "absolute", left: ROW.colX, top: y + 24, opacity: fa, ...sans(900), fontSize: 46, lineHeight: "58px", color: PAL.ink, whiteSpace: "nowrap" }}>{NAME[id]}</div>
            <div style={{ position: "absolute", left: ROW.colX, top: y + 84, opacity: fa * fadeIn(k0, 0.2), ...num(700), fontSize: 60, lineHeight: "64px", color: pctColor(id), whiteSpace: "nowrap" }}>{PCT[id]}</div>
          </React.Fragment>,
        );
      } else {
        const rows = b.kind === "condHead" ? [0, 1, 2] : [b.k];
        rows.forEach((kk) => {
          const top = y + 168 + kk * 52;
          out.html.push(
            b.kind === "condHead" ? (
              <div key={`${key}${kk}`} style={{ position: "absolute", left: ROW.colX, top, opacity: fa * 0.9, ...sans(700), fontSize: 34, lineHeight: "48px", color: PAL.soft }}>
                {COND_LABELS[kk]}
              </div>
            ) : (
              <div key={key} style={{ position: "absolute", left: ROW.colX + 88, top, opacity: fa, ...sans(900), fontSize: 42, lineHeight: "48px", color: PAL.ink, whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: PAL.lane[id], marginRight: 12, verticalAlign: "middle", transform: "translateY(-4px)" }} />
                {b.value}
              </div>
            ),
          );
        });
      }
      return;
    }
  }
};

// ---------------------------------------------------------------- lane badge
export const Badge: React.FC<{ id: LaneId; x: number; y: number; size: number; op?: number }> = ({ id, x, y, size, op = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: size, height: size, opacity: op, borderRadius: size * 0.22, background: `${PAL.lane[id]}26`, border: `${Math.max(2, size * 0.035)}px solid ${PAL.lane[id]}`, display: "flex", alignItems: "center", justifyContent: "center", ...num(700), fontSize: size * 0.6, lineHeight: 1, color: PAL.lane[id] }}>
    {id}
  </div>
);

// ---------------------------------------------------------------- the chart layer of each scene
const Rows: React.FC<{ f: number; recap: boolean }> = ({ f, recap }) => {
  const endDim = recap && f >= CUT.end ? 1 - 0.8 * clamp01((f - CUT.end) / 4) : 1;
  const lit = recap && f >= END_TEXT.l3.a ? clamp01((f - END_TEXT.l3.a) / 4) : 0;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Defs />
        {IDS.map((id, k) => {
          const c = rowChart(k);
          const op = recap ? rowFocus(id, f) : 1;
          return (
            <g key={id}>
              <Panel c={c} color={PAL.lane[id]} op={op} />
              <Candles bars={LANES[id]} c={c} post={recap ? 24 : rowPost(id, f)} heroGlow dimPre={endDim} dimPost={mix(endDim, 1, lit)} mul={op} />
            </g>
          );
        })}
      </svg>
      {IDS.map((id, k) => (
        <Badge key={id} id={id} x={ROW.badgeX} y={ROW_Y[k] + ROW_H / 2 - ROW.badge / 2} size={ROW.badge} op={recap ? Math.max(0.4, rowFocus(id, f)) : 1} />
      ))}
    </>
  );
};

const Why: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <Defs />
    <Panel c={WHY} grid={false} />
    <Candles bars={LANES.A} c={WHY} post={0} from={HERO} heroGlow />
  </svg>
);

const Pos: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <Defs />
    <Panel c={POS_CHART} />
    <Candles bars={POSMAP} c={POS_CHART} post={0} hero={POSMAP.length} />
  </svg>
);

const Vol: React.FC<{ f: number }> = ({ f }) => {
  const focus = (id: LaneId) => {
    const on = { A: CUT.vol, B: 0, C: 0 };
    void on;
    const ks = BEATS.filter((b) => b.kind === "ratio");
    const starts = ks.map((b) => b.a);
    if (f < starts[0]) return 1;
    const k = IDS.indexOf(id);
    const cur = starts.filter((s) => f >= s).length - 1;
    return cur === k ? 1 : 0.35;
  };
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Defs />
        {IDS.map((id, k) => {
          const pc = volPrice(k);
          const vc = volBars(k);
          const n = volPost(id, f);
          const fo = focus(id);
          return (
            <g key={id}>
              <Panel c={pc} color={PAL.lane[id]} grid={false} op={fo} />
              <Candles bars={LANES[id]} c={pc} post={n} mul={fo} />
              <Panel c={vc} color={PAL.lane[id]} grid={false} op={fo} />
              {LANES[id].map((bb, i) => {
                if (i < vc.i0 || i > vc.i1 || i > HERO + n) return null;
                const g = i <= HERO ? 1 : clamp01(n - (i - HERO - 1));
                const x = cx(vc, i);
                const y = cy(vc, bb.v * g);
                const w = bodyW(vc);
                const up = bb.c >= bb.o;
                return <rect key={i} x={x - w / 2} y={y} width={w} height={vc.r.y + vc.r.h - y} rx={3} fill={up ? PAL.up : PAL.down} fillOpacity={(i === HERO ? 1 : 0.7) * fo} />;
              })}
            </g>
          );
        })}
      </svg>
      {IDS.map((id, k) => (
        <div key={id} style={{ position: "absolute", left: VCOL_X[k] - 14, top: 400, display: "flex", alignItems: "center", gap: 14, opacity: Math.max(0.45, focus(id)) }}>
          <Badge id={id} x={0} y={0} size={56} />
          <div style={{ marginLeft: 70, ...sans(900), fontSize: 40, color: PAL.ink, whiteSpace: "nowrap" }}>{NAME[id]}</div>
        </div>
      ))}
    </>
  );
};

const Hold: React.FC<{ f: number }> = ({ f }) => {
  const c = HOLD_CHART;
  const showA = f < PATHS.A;
  const showB = f >= PATHS.A && f < PATHS.B;
  const showC = f >= PATHS.B;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <Panel c={c} axis />
      <Candles bars={LANES.A} c={c} post={showA ? holdPost("A", f) : 0} from={HERO} heroGlow />
      {showB && <Candles bars={LANES.B} c={c} post={holdPost("B", f)} from={HERO + 1} />}
      {showC && <Candles bars={LANES.C} c={c} post={holdPost("C", f)} from={HERO + 1} />}
    </svg>
  );
};

// ---------------------------------------------------------------- composition of the 2D layers
export const Layers: React.FC<{ f: number; scene: string }> = ({ f, scene }) => {
  const draw: Draw = { svg: [], html: [] };
  const rowsDim = (ch: ChartKey, id?: LaneId) => (ch.startsWith("row") && f >= CUT.recap && id ? Math.max(0.4, rowFocus(id, f)) : 1);
  const live = BEATS.filter((b) => {
    const isRows = b.ch.startsWith("row");
    if (scene === "rows") return isRows && b.a < CUT.why;
    if (scene === "recap") return isRows && b.a >= CUT.recap;
    return !isRows && (scene === "vol" ? b.ch.startsWith("vol") || b.ch.startsWith("vbar") : b.ch === scene);
  });
  live.forEach((b) => drawBeat(f, b, draw, rowsDim(b.ch, b.lane ?? (b.ch.slice(-1) as LaneId))));
  return (
    <>
      {scene === "rows" && <Rows f={f} recap={false} />}
      {scene === "recap" && <Rows f={f} recap />}
      {scene === "why" && <Why />}
      {scene === "pos" && <Pos />}
      {scene === "vol" && <Vol f={f} />}
      {scene === "hold" && <Hold f={f} />}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {draw.svg}
      </svg>
      {draw.html}
    </>
  );
};

// ---------------------------------------------------------------- titles, captions, end card
export const Header: React.FC<{ f: number }> = ({ f }) => {
  if (f >= CUT.end) {
    const k = (a: number) => (f >= a ? 1 : 0);
    return (
      <div style={{ position: "absolute", left: 64, right: 140, top: 150 }}>
        <div style={{ opacity: k(END_TEXT.l1.a), ...sans(900), fontSize: 80, lineHeight: 1.15, color: PAL.ink }}>{END_TEXT.l1.t}</div>
        <div style={{ opacity: k(END_TEXT.l2.a), ...sans(900), fontSize: 80, lineHeight: 1.15, color: PAL.gold }}>{END_TEXT.l2.t}</div>
      </div>
    );
  }
  const c = CHAPTERS.find((x) => f >= x.a && f < x.b);
  if (!c) return null;
  return (
    <div style={{ position: "absolute", left: 64, right: 140, top: 156 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
        {c.n && <div style={{ ...num(700), fontSize: 64, color: PAL.gold, lineHeight: 1 }}>{c.n}</div>}
        <div style={{ ...sans(900), fontSize: 80, color: PAL.ink, lineHeight: 1.05, letterSpacing: 2 }}>{c.t}</div>
      </div>
      <div style={{ ...sans(700), fontSize: 40, color: c.n ? PAL.soft : PAL.gold, marginTop: 14, letterSpacing: 3 }}>{c.s}</div>
    </div>
  );
};

const END_LINES = new Set(["e1", "e2", "e3"]);
export const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to);
  if (!c || END_LINES.has(c.line)) return null;
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1572, display: "flex", justifyContent: "center" }}>
      <div style={{ ...sans(900), fontSize: 58, lineHeight: 1.3, color: "#fff", padding: "8px 26px", borderRadius: 14, background: "rgba(3,5,10,0.66)", letterSpacing: 1 }}>{c.text}</div>
    </div>
  );
};
export const EndCard: React.FC<{ f: number }> = ({ f }) => {
  if (f < END_TEXT.l3.a) return null;
  const k = (a: number) => clamp01((f - a) / 8);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1540, textAlign: "center" }}>
      <div style={{ opacity: k(END_TEXT.l3.a), ...sans(900), fontSize: 58, color: PAL.ink }}>{END_TEXT.l3.t}</div>
      <div style={{ opacity: k(END_TEXT.note.a), ...sans(700), fontSize: 34, color: PAL.soft, marginTop: 20 }}>{END_TEXT.note.t}</div>
    </div>
  );
};
export const Corner: React.FC = () => <div style={{ position: "absolute", left: 64, top: 84, ...sans(700), fontSize: 34, color: "rgba(230,236,245,0.55)", letterSpacing: 4 }}>示意图</div>;
export { POS };
