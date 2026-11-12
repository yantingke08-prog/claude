import React from "react";
import { AbsoluteFill } from "remotion";
import { captions, Lc, Lend } from "./cue";
import { HERO, LANES, type LaneId } from "./data";
import { type Beat, type Pt, AVG, BEATS, CHAPTERS, COND_LABELS, END_TEXT, NAME, PCT, THREE_ITEMS, vis } from "./beats";
import { type Dir, type LaneState, BIG, BIG_HEAD_Y, COL, IDS, ROW_H, ROW_Y, T, THUMB, TR, VCOL_W, VCOL_X, VMAX, VOL_BARS, clamp01, mix, px, py, slot, smooth } from "./director";
import { num, sans } from "./fonts";
import { PAL } from "./Scene";

const INK = "#f5f7fa";
const SOFT = "rgba(232,238,246,0.74)";
const PLATE = "rgba(7,10,17,0.9)";
const TONE = { gold: PAL.gold, white: "#eef3fa", up: PAL.up, down: PAL.down, warn: "#ff6b5e" };
const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

type XY = { x: number; y: number };
const at = (s: LaneState, [i, p]: Pt): XY => ({ x: px(s.p, i), y: py(s.p, p) });

// ---------------------------------------------------------------- text plates
const Plate: React.FC<{ x: number; y: number; align: "left" | "right" | "center"; vAlign?: "middle" | "top" | "bottom"; a: number; color?: string; children: React.ReactNode; pad?: string }> = ({ x, y, align, vAlign = "middle", a, color = "rgba(255,255,255,0.35)", children, pad = "10px 18px" }) => {
  const tx = align === "left" ? "0" : align === "right" ? "-100%" : "-50%";
  const ty = vAlign === "middle" ? "-50%" : vAlign === "top" ? "0" : "-100%";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, ${ty})`, opacity: a, background: PLATE, border: `2px solid ${color}`, borderRadius: 14, padding: pad, whiteSpace: "nowrap", boxShadow: "0 10px 30px rgba(0,0,0,0.55)" }}>
      {children}
    </div>
  );
};
const Big: React.FC<{ t: string; size?: number; color?: string; w?: 500 | 700 | 900 }> = ({ t, size = 38, color = INK, w = 900 }) => <div style={{ ...sans(w), fontSize: size, lineHeight: 1.2, color, letterSpacing: 1 }}>{t}</div>;
const Sub: React.FC<{ t: string; size?: number; color?: string }> = ({ t, size = 29, color = SOFT }) => <div style={{ ...sans(700), fontSize: size, lineHeight: 1.25, color, marginTop: 2 }}>{t}</div>;

// ---------------------------------------------------------------- lane identity
export const Badge: React.FC<{ id: LaneId; x: number; y: number; size: number; a: number }> = ({ id, x, y, size, a }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      opacity: a,
      borderRadius: size * 0.22,
      background: `${PAL.lane[id]}26`,
      border: `${Math.max(2, size * 0.035)}px solid ${PAL.lane[id]}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...num(700),
      fontSize: size * 0.6,
      lineHeight: 1,
      color: PAL.lane[id],
    }}
  >
    {id}
  </div>
);
const pctColor = (id: LaneId) => (PCT[id].startsWith("+") ? PAL.up : PAL.down);

/** thin lane-coloured frame around a panel (matches the 3D glass slab) */
const Frame: React.FC<{ s: LaneState; id: LaneId }> = ({ s, id }) => {
  const p = s.p;
  const out: React.ReactNode[] = [];
  const op = Math.max(0.45, s.focus);
  if (p.a > 0.01 && p.r.w > 4) out.push(<rect key="p" x={p.r.x - 14} y={p.r.y - 14} width={p.r.w + 28} height={p.r.h + 28} rx={16} fill="none" stroke={PAL.lane[id]} strokeOpacity={0.55 * p.a * op} strokeWidth={2} />);
  if (p.va > 0.01 && p.vr.h > 4) out.push(<rect key="v" x={p.vr.x - 14} y={p.vr.y - 14} width={p.vr.w + 28} height={p.vr.h + 28} rx={16} fill="none" stroke={PAL.lane[id]} strokeOpacity={0.55 * p.va * op} strokeWidth={2} />);
  // price grid every 10 (faint), so every panel in a layout reads on the same scale
  if (p.a > 0.01 && p.r.h > 120) {
    for (let v = Math.ceil(p.plo / 10) * 10; v <= p.phi; v += 10) {
      const y = py(p, v);
      if (y < p.r.y + 4 || y > p.r.y + p.r.h - 4) continue;
      out.push(<line key={`g${v}`} x1={p.r.x} x2={p.r.x + p.r.w} y1={y} y2={y} stroke="#9fb4d0" strokeOpacity={0.12 * p.a * op} strokeWidth={1.5} />);
    }
  }
  return <>{out}</>;
};
const Axis: React.FC<{ s: LaneState; a: number }> = ({ s, a }) => {
  const p = s.p;
  if (a < 0.01) return null;
  const out: React.ReactNode[] = [];
  for (let v = Math.ceil(p.plo / 10) * 10; v <= p.phi; v += 10) {
    const y = py(p, v);
    if (y < p.r.y + 16 || y > p.r.y + p.r.h - 16) continue;
    out.push(
      <div key={v} style={{ position: "absolute", left: p.r.x + p.r.w - 8, top: y, transform: "translate(-100%, -115%)", ...num(500), fontSize: 24, color: "rgba(200,214,232,0.5)", opacity: a }}>
        {v}
      </div>,
    );
  }
  return <>{out}</>;
};

// ---------------------------------------------------------------- per-layout labels (badge / name / result)
type Look = { a: number; node: React.ReactNode };
const laneLabels = (d: Dir, stage: string, id: LaneId, a: number): React.ReactNode => {
  const k = IDS.indexOf(id);
  const s = d.lanes[id];
  if (a < 0.01) return null;
  if (stage === "trio" || stage === "recap" || stage === "end") {
    const y = ROW_Y[k] + ROW_H / 2 - 48;
    return <Badge id={id} x={COL.badgeX} y={y} size={96} a={a * Math.max(0.5, s.focus)} />;
  }
  if (stage === "vol") {
    const x = VCOL_X[k];
    return (
      <div style={{ position: "absolute", left: x - 14, top: 392, width: VCOL_W + 28, display: "flex", alignItems: "center", gap: 14, opacity: a * Math.max(0.45, s.focus) }}>
        <Badge id={id} x={0} y={0} size={64} a={1} />
        <div style={{ marginLeft: 78, ...sans(900), fontSize: 40, color: INK }}>{NAME[id]}</div>
      </div>
    );
  }
  // solo / hold: one big panel + two thumbnails
  const focusId = stage.slice(-1) as LaneId;
  if (id === focusId) {
    return (
      <div style={{ position: "absolute", left: BIG.x - 14, top: BIG_HEAD_Y, width: BIG.w + 28, height: 64, opacity: a }}>
        <Badge id={id} x={0} y={0} size={64} a={1} />
        <div style={{ position: "absolute", left: 84, top: 4, ...sans(900), fontSize: 46, lineHeight: "56px", color: INK }}>{NAME[id]}</div>
        <div style={{ position: "absolute", right: 0, top: 2, ...num(700), fontSize: 50, lineHeight: "60px", color: pctColor(id) }}>{PCT[id]}</div>
      </div>
    );
  }
  const others = IDS.filter((x) => x !== focusId);
  const r = THUMB[others.indexOf(id)];
  return (
    <div style={{ position: "absolute", left: r.x - 14, top: r.y - 66, width: r.w + 28, opacity: a * 0.85 }}>
      <Badge id={id} x={0} y={0} size={44} a={1} />
      <div style={{ position: "absolute", left: 56, top: 0, ...sans(900), fontSize: 30, lineHeight: "44px", color: INK }}>{NAME[id]}</div>
      <div style={{ position: "absolute", right: 0, top: 0, ...num(700), fontSize: 30, lineHeight: "44px", color: pctColor(id) }}>{PCT[id]}</div>
    </div>
  );
};

// ---------------------------------------------------------------- beats
const Dot: React.FC<{ p: XY; k: number; color: string }> = ({ p, k, color }) => (
  <>
    <circle cx={p.x} cy={p.y} r={14 * k} fill="none" stroke={color} strokeWidth={3} />
    <circle cx={p.x} cy={p.y} r={5.5 * k} fill={color} />
  </>
);
const seg = (a: XY, b: XY, k: number): XY => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

type Draw = { svg: React.ReactNode[]; html: React.ReactNode[] };

const drawBeat = (d: Dir, b: Beat, out: Draw) => {
  const [k0, a0] = vis(b, d.f);
  if (a0 <= 0.001) return;
  const s = d.lanes[b.lane!];
  const fa = a0 * Math.max(0.45, s.focus);
  const k = ease(k0);
  const key = b.id;
  const sl = slot(s.p);
  switch (b.kind) {
    case "marker": {
      const color = TONE[b.tone ?? "white"];
      const p = at(s, b.at);
      const e = { x: p.x + b.dx, y: p.y + b.dy };
      out.svg.push(
        <g key={key} opacity={fa}>
          <Dot p={p} k={k} color={color} />
          <line x1={p.x} y1={p.y} x2={seg(p, e, k).x} y2={seg(p, e, k).y} stroke={color} strokeWidth={2.5} />
        </g>,
      );
      out.html.push(
        <Plate key={key} x={e.x} y={e.y} align={b.dx >= 0 ? "left" : "right"} a={fa * clamp01((k0 - 0.45) / 0.55)} color={color}>
          <Big t={b.text} />
          {b.sub && <Sub t={b.sub} />}
        </Plate>,
      );
      return;
    }
    case "box": {
      const x0 = px(s.p, b.i0) - sl / 2;
      const x1 = px(s.p, b.i1) + sl / 2;
      const y0 = py(s.p, b.p1);
      const y1 = py(s.p, b.p0);
      const color = TONE[b.tone ?? "white"];
      out.svg.push(
        <g key={key} opacity={fa}>
          <rect x={x0} y={y0} width={(x1 - x0) * k} height={y1 - y0} rx={8} fill={color} fillOpacity={0.07} stroke={color} strokeWidth={3} strokeDasharray={b.dashed ? "10 8" : undefined} />
        </g>,
      );
      out.html.push(
        <Plate key={key} x={x0} y={b.side === "bottom" ? y1 + 14 : y0 - 14} align="left" vAlign={b.side === "bottom" ? "top" : "bottom"} a={fa * clamp01((k0 - 0.4) / 0.6)} color={color}>
          <Big t={b.text} />
        </Plate>,
      );
      return;
    }
    case "hline": {
      const color = TONE[b.tone ?? "white"];
      const v = s.p.vr;
      const y = b.vol ? v.y + v.h - (b.p / VMAX) * v.h : py(s.p, b.p);
      const x0 = b.vol ? v.x : b.i0 !== undefined ? px(s.p, b.i0) - sl / 2 : s.p.r.x;
      const x1 = b.vol ? v.x + v.w : s.p.r.x + s.p.r.w;
      const glow = b.tone === "gold";
      out.svg.push(
        <g key={key} opacity={fa}>
          {glow && <line x1={x0} x2={x0 + (x1 - x0) * k} y1={y} y2={y} stroke={color} strokeOpacity={0.3} strokeWidth={12} />}
          <line x1={x0} x2={x0 + (x1 - x0) * k} y1={y} y2={y} stroke={color} strokeWidth={glow ? 3.5 : 2.5} strokeDasharray={glow ? undefined : "12 9"} />
        </g>,
      );
      if (b.text)
        out.html.push(
          <div key={key} style={{ position: "absolute", left: b.vol ? x0 : x1 - 6, top: y + (b.side === "below" ? 8 : -8), transform: `translate(${b.vol ? "0" : "-100%"}, ${b.side === "below" ? "0" : "-100%"})`, fontSize: b.vol ? 28 : 34, opacity: fa * clamp01((k0 - 0.5) / 0.5), ...sans(900), color, background: "rgba(5,8,14,0.78)", padding: "2px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>
            {b.text}
          </div>,
        );
      return;
    }
    case "band": {
      const y0 = py(s.p, b.p1);
      const y1 = py(s.p, b.p0);
      const x0 = px(s.p, b.i0) - sl / 2;
      const xShort = px(s.p, b.i1) + sl / 2;
      const xFull = s.p.r.x + s.p.r.w;
      const g = b.grow ? smooth((d.f - b.grow[0]) / (b.grow[1] - b.grow[0])) : 0;
      const x1 = mix(x0, mix(xShort, xFull, g), k);
      const c = "#ffa95e";
      out.svg.push(
        <g key={key} opacity={fa}>
          <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={c} fillOpacity={0.2} />
          <line x1={x0} x2={x1} y1={y0} y2={y0} stroke={c} strokeWidth={2.5} />
          <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={c} strokeWidth={2.5} />
        </g>,
      );
      const two = b.at2 !== undefined && d.f >= b.at2;
      const ta = two ? clamp01((d.f - b.at2!) / 8) : 1;
      out.html.push(
        <Plate key={key} x={x0} y={y0 - 14} align="left" vAlign="bottom" a={fa * clamp01((k0 - 0.4) / 0.6)} color={c}>
          <div style={{ opacity: ta }}>
            <Big t={two ? b.text2! : b.text} />
          </div>
        </Plate>,
      );
      return;
    }
    case "arrow": {
      const color = TONE[b.tone ?? "white"];
      const p0 = at(s, b.from);
      const p1 = at(s, b.to);
      const e = seg(p0, p1, k);
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const hs = 22;
      const head = `M ${e.x} ${e.y} L ${e.x - hs * Math.cos(ang - 0.45)} ${e.y - hs * Math.sin(ang - 0.45)} L ${e.x - hs * Math.cos(ang + 0.45)} ${e.y - hs * Math.sin(ang + 0.45)} Z`;
      out.svg.push(
        <g key={key} opacity={fa}>
          <line x1={p0.x} y1={p0.y} x2={e.x} y2={e.y} stroke={color} strokeOpacity={0.3} strokeWidth={14} strokeLinecap="round" />
          <line x1={p0.x} y1={p0.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={4.5} strokeLinecap="round" />
          <path d={head} fill={color} />
        </g>,
      );
      if (b.text) {
        const up = p1.y < p0.y;
        const m = seg(p0, p1, 0.55);
        out.html.push(
          <Plate key={key} x={m.x} y={m.y + (up ? -40 : 40)} align="right" vAlign={up ? "bottom" : "top"} a={fa * clamp01((k0 - 0.6) / 0.4)} color={color}>
            <Big t={b.text} />
          </Plate>,
        );
      }
      return;
    }
    case "bracket": {
      const color = TONE[b.tone ?? "white"];
      const bw = Math.min(56, sl * 0.64);
      const x = px(s.p, b.i) + (b.side === "left" ? -bw / 2 - 18 : bw / 2 + 18);
      const t = b.side === "left" ? -14 : 14;
      const y0 = py(s.p, b.p1);
      const y1 = py(s.p, b.p0);
      const ym = (y0 + y1) / 2;
      const yk0 = mix(ym, y0, k);
      const yk1 = mix(ym, y1, k);
      out.svg.push(
        <g key={key} opacity={fa} fill="none" stroke={color} strokeWidth={3.5}>
          <path d={`M ${x - t} ${yk0} L ${x} ${yk0} L ${x} ${yk1} L ${x - t} ${yk1}`} />
          {b.mid && <line x1={x} x2={x + t * 1.6} y1={ym} y2={ym} strokeWidth={4} />}
          {b.mid && <circle cx={x} cy={ym} r={6} fill={color} />}
        </g>,
      );
      out.html.push(
        <div key={key} style={{ position: "absolute", left: x + (b.side === "left" ? -14 : 14), top: b.mid ? (y0 + ym) / 2 : ym, transform: `translate(${b.side === "left" ? "-100%" : "0"}, -50%)`, opacity: fa * clamp01((k0 - 0.5) / 0.5), ...sans(900), fontSize: sl > 30 ? 38 : 30, color, whiteSpace: "nowrap", textShadow: "0 2px 10px #000" }}>
          {b.text}
        </div>,
      );
      return;
    }
    case "fill": {
      const bw = Math.min(56, sl * 0.64);
      const x = px(s.p, b.i);
      const y0 = py(s.p, b.p1);
      const y1 = py(s.p, b.p0);
      const yk = mix(y0, y1, k);
      out.svg.push(
        <g key={key} opacity={fa}>
          <rect x={x - bw / 2 - 8} y={y0} width={bw + 16} height={yk - y0} fill="#05070c" fillOpacity={0.62} stroke={TONE.warn} strokeWidth={3} strokeDasharray="8 6" />
          <line x1={x - bw / 2 - 8} x2={s.p.r.x + 150} y1={(y0 + y1) / 2} y2={y0 - 40} stroke={TONE.warn} strokeWidth={2.5} />
        </g>,
      );
      out.html.push(
        <Plate key={key} x={s.p.r.x + 14} y={y0 - 40} align="left" vAlign="bottom" a={fa * clamp01((k0 - 0.4) / 0.6)} color={TONE.warn}>
          <Big t={b.text} />
          {b.sub && <Sub t={b.sub} />}
        </Plate>,
      );
      return;
    }
    case "card": {
      const p = at(s, b.at);
      const cx = b.x + b.w / 2;
      const edge = { x: p.x < b.x ? b.x : p.x > b.x + b.w ? b.x + b.w : cx, y: b.y + 60 };
      out.svg.push(
        <g key={key} opacity={fa}>
          <Dot p={p} k={k} color={PAL.gold} />
          <line x1={p.x} y1={p.y} x2={seg(p, edge, k).x} y2={seg(p, edge, k).y} stroke={PAL.gold} strokeWidth={2.5} />
        </g>,
      );
      out.html.push(
        <div key={key} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, opacity: fa * clamp01((k0 - 0.35) / 0.65), background: "#070a11", border: `2.5px solid ${PAL.gold}`, borderRadius: 18, padding: "20px 26px", boxShadow: "0 16px 40px rgba(0,0,0,0.6)" }}>
          <Big t={b.title} size={48} />
          {b.lines.map((l) => (
            <div key={l.t} style={{ opacity: clamp01((d.f - l.at) / 8) }}>
              <Sub t={l.t} size={36} color={PAL.gold} />
            </div>
          ))}
        </div>,
      );
      return;
    }
    case "chip": {
      const k2 = IDS.indexOf(b.lane!);
      const inVol = d.stage === "vol";
      const x = inVol ? VCOL_X[k2] + VCOL_W / 2 : BIG.x + BIG.w - 20;
      const y = inVol ? VOL_BARS.y + VOL_BARS.h + 150 : BIG.y + BIG.h - 20;
      out.html.push(
        <Plate key={key} x={x} y={y} align={inVol ? "center" : "right"} vAlign={inVol ? "top" : "bottom"} a={fa * clamp01(k0 / 0.6)} color={PAL.gold} pad="12px 20px">
          {b.lines.map((l) => (
            <div key={l.t} style={{ opacity: clamp01((d.f - l.at) / 8), textAlign: "center" }}>
              <Big t={l.t} size={inVol ? 36 : 40} />
            </div>
          ))}
        </Plate>,
      );
      return;
    }
    case "ratio": {
      const k2 = IDS.indexOf(b.lane!);
      const v = s.p.vr;
      const hx = px(s.p, HERO);
      const yAvg = v.y + v.h - (AVG[b.lane!] / VMAX) * v.h;
      const yTop = v.y + v.h - (LANES[b.lane!][HERO].v / VMAX) * v.h;
      const bx = hx + sl * 0.5 + 10;
      out.svg.push(
        <g key={key} opacity={fa} stroke={PAL.gold} strokeWidth={3.5} fill="none">
          <path d={`M ${bx - 8} ${yAvg} L ${bx} ${yAvg} L ${bx} ${mix(yAvg, yTop, k)} L ${bx - 8} ${mix(yAvg, yTop, k)}`} />
        </g>,
      );
      out.html.push(
        <div key={key} style={{ position: "absolute", left: VCOL_X[k2] + VCOL_W / 2, top: VOL_BARS.y + VOL_BARS.h + 34, transform: "translateX(-50%)", opacity: fa, display: "flex", alignItems: "baseline", gap: 10, whiteSpace: "nowrap" }}>
          <div style={{ ...num(700), fontSize: 72, lineHeight: 1, color: PAL.gold }}>{b.value}</div>
          <div style={{ ...sans(900), fontSize: 42, color: INK }}>{b.word}</div>
        </div>,
      );
      return;
    }
    case "stamp": {
      const x = px(s.p, HERO - 2.6);
      const y = py(s.p, 111.2);
      const sc = 1.25 - 0.25 * k;
      out.html.push(
        <div key={key} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${sc})`, opacity: fa * clamp01(k0 * 1.6), border: `6px solid ${TONE.warn}`, borderRadius: 18, padding: "6px 34px", background: "rgba(40,6,6,0.82)", ...sans(900), fontSize: 120, lineHeight: 1.1, color: "#fff", letterSpacing: 18, whiteSpace: "nowrap", boxShadow: `0 0 40px ${TONE.warn}66` }}>
          {b.text}
        </div>,
      );
      return;
    }
    case "unknown":
    case "answer": {
      const x0 = px(s.p, HERO + 1) - sl / 2 - 2;
      const x1 = s.p.r.x + s.p.r.w + 4;
      const y0 = s.p.r.y - 6;
      const y1 = s.p.r.y + s.p.r.h + 6;
      const c = b.kind === "answer" ? PAL.gold : "#cfe0f5";
      out.svg.push(<rect key={key} x={x0} y={y0} width={(x1 - x0) * k} height={y1 - y0} rx={12} fill={c} fillOpacity={b.kind === "answer" ? 0.06 : 0.04} stroke={c} strokeOpacity={0.9} strokeWidth={3} strokeDasharray="12 9" opacity={fa} />);
      out.html.push(
        <div key={key} style={{ position: "absolute", left: b.kind === "answer" ? x0 + 14 : (x0 + x1) / 2, top: b.kind === "answer" ? y0 + 12 : (y0 + y1) / 2, transform: b.kind === "answer" ? "none" : "translate(-50%, -50%)", opacity: fa * clamp01((k0 - 0.4) / 0.6), ...sans(900), fontSize: b.kind === "answer" ? 36 : 96, color: c, textShadow: "0 2px 14px #000" }}>
          {b.kind === "answer" ? "答案在这里" : "?"}
        </div>,
      );
      return;
    }
    case "result": {
      const k2 = IDS.indexOf(b.lane!);
      const r = d.rows;
      const y = ROW_Y[k2];
      const x = mix(790, 590, r);
      const nameY = mix(y + ROW_H / 2 - 74, y + 26, r);
      const pctY = mix(y + ROW_H / 2 + 2, y + 26, r);
      const pctX = mix(790, 1036, r);
      const fl = d.stage === "trio" || d.stage === "recap" || d.stage === "end" ? 1 : 0;
      const ra = a0 * fl * Math.max(0.45, s.focus) * (d.stage === "end" ? 1 - smooth((d.f - T.end) / 12) * 0.6 : 1);
      out.html.push(
        <React.Fragment key={key}>
          <div style={{ position: "absolute", left: x, top: nameY, opacity: ra, ...sans(900), fontSize: mix(54, 46, r), lineHeight: "64px", color: INK, whiteSpace: "nowrap" }}>{NAME[b.lane!]}</div>
          <div style={{ position: "absolute", left: pctX, top: pctY, transform: `translateX(${-100 * r}%)`, opacity: ra * clamp01(k0 * 1.5), ...num(700), fontSize: mix(72, 52, r), lineHeight: mix(72, 64, r) + "px", color: pctColor(b.lane!), whiteSpace: "nowrap" }}>
            {PCT[b.lane!]}
          </div>
        </React.Fragment>,
      );
      return;
    }
    case "condHead":
    case "cond": {
      const k2 = IDS.indexOf(b.lane!);
      const y = ROW_Y[k2];
      const rows = b.kind === "condHead" ? [0, 1, 2] : [b.k];
      rows.forEach((kk) => {
        const top = y + 112 + kk * 74;
        if (b.kind === "condHead")
          out.html.push(
            <div key={`${key}${kk}`} style={{ position: "absolute", left: 590, top, opacity: fa * 0.9, ...sans(700), fontSize: 32, lineHeight: "60px", color: SOFT }}>
              {COND_LABELS[kk]}
            </div>,
          );
        else
          out.html.push(
            <div key={key} style={{ position: "absolute", left: 694, top, opacity: fa, transform: `translateX(${(1 - k) * 16}px)`, ...sans(900), fontSize: 48, lineHeight: "60px", color: INK, whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: PAL.lane[b.lane!], marginRight: 14, verticalAlign: "middle", transform: "translateY(-4px)" }} />
              {b.value}
            </div>,
          );
      });
      return;
    }
  }
};

// ---------------------------------------------------------------- chapter header
const Header: React.FC<{ f: number }> = ({ f }) => {
  return (
    <>
      {CHAPTERS.map((c, i) => {
        const a = Math.min(clamp01((f - c.a) / 10), clamp01((c.b - f) / 8));
        if (a <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 64, right: 64, top: 156, opacity: a }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
              {c.n && <div style={{ ...num(700), fontSize: 64, color: PAL.gold, lineHeight: 1 }}>{c.n}</div>}
              <div style={{ ...sans(900), fontSize: i === 0 ? 92 : 78, color: INK, lineHeight: 1.05, letterSpacing: 2 }}>{c.t}</div>
            </div>
            {c.s && <div style={{ ...sans(700), fontSize: 40, color: i === 0 ? PAL.gold : SOFT, marginTop: 14, letterSpacing: 3 }}>{c.s}</div>}
            {c.three && (
              <div style={{ display: "flex", gap: 18, marginTop: 20 }}>
                {THREE_ITEMS.map((t) => {
                  const k = clamp01((f - t.at) / 9);
                  return (
                    <div key={t.n} style={{ opacity: k, transform: `translateY(${(1 - ease(k)) * 14}px)`, display: "flex", alignItems: "baseline", gap: 12, padding: "10px 24px", borderRadius: 14, background: PLATE, border: `2px solid ${PAL.gold}` }}>
                      <span style={{ ...num(700), fontSize: 34, color: PAL.gold }}>{t.n}</span>
                      <span style={{ ...sans(900), fontSize: 46, color: INK }}>{t.t}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- captions + end card
const END_LINES = new Set(["e1", "e2", "e3"]);
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to);
  if (!c || END_LINES.has(c.line)) return null;
  const a = Math.min(clamp01((f - c.from) / 3), clamp01((c.to - f) / 3));
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1572, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ ...sans(900), fontSize: 58, lineHeight: 1.3, color: "#fff", padding: "8px 26px", borderRadius: 14, background: "rgba(3,5,10,0.6)", textShadow: "0 3px 12px rgba(0,0,0,0.9)", letterSpacing: 1 }}>{c.text}</div>
    </div>
  );
};
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  if (f < END_TEXT.l1.a) return null;
  const k = (a: number) => clamp01((f - a) / 10);
  return (
    <>
      <div style={{ position: "absolute", left: 64, right: 64, top: 150 }}>
        <div style={{ opacity: k(END_TEXT.l1.a), ...sans(900), fontSize: 84, lineHeight: 1.15, color: INK }}>{END_TEXT.l1.t}</div>
        <div style={{ opacity: k(END_TEXT.l2.a), ...sans(900), fontSize: 84, lineHeight: 1.15, color: PAL.gold }}>{END_TEXT.l2.t}</div>
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, top: 1540, textAlign: "center", opacity: k(END_TEXT.l3.a) }}>
        <div style={{ ...sans(900), fontSize: 60, color: INK }}>{END_TEXT.l3.t}</div>
        <div style={{ opacity: k(END_TEXT.note.a), ...sans(500), fontSize: 30, color: SOFT, marginTop: 22 }}>{END_TEXT.note.t}</div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- HUD
const stageOfLabels = (d: Dir): { name: string; a: number }[] => {
  // labels cross-fade with the layout: the outgoing set fades in the first half, the incoming in the second
  const starts: [string, number][] = [
    ["trio", 0],
    ["soloA", T.solo],
    ["soloB", T.soloB],
    ["soloC", T.soloC],
    ["vol", T.vol],
    ["holdA", T.holdA],
    ["holdB", T.holdB],
    ["holdC", T.holdC],
    ["recap", T.recap],
    ["end", T.end],
  ];
  let k = 0;
  for (let i = 0; i < starts.length; i++) if (d.f >= starts[i][1]) k = i;
  const t = (d.f - starts[k][1]) / TR;
  if (k === 0 || t >= 1) return [{ name: starts[k][0], a: 1 }];
  return [
    { name: starts[k - 1][0], a: clamp01(1 - t * 2) },
    { name: starts[k][0], a: clamp01(t * 2 - 1) },
  ];
};
const sameRows = (a: string, b: string) => [a, b].every((x) => x === "recap" || x === "end");

export const Hud: React.FC<{ d: Dir }> = ({ d }) => {
  const draw: Draw = { svg: [], html: [] };
  BEATS.forEach((b) => drawBeat(d, b, draw));
  const sets = stageOfLabels(d);
  const settled = sets.length === 1 ? 1 : 0;
  const bigAxis = d.stage.startsWith("solo") || d.stage.startsWith("hold");
  return (
    <AbsoluteFill>
    <AbsoluteFill style={{ opacity: d.hud }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {IDS.map((id) => (
          <Frame key={id} s={d.lanes[id]} id={id} />
        ))}
        {draw.svg}
      </svg>
      {bigAxis &&
        IDS.map((id) => {
          const s = d.lanes[id];
          const big = s.p.r.w > 700;
          return big ? <Axis key={id} s={s} a={settled * Math.max(0.45, s.focus)} /> : null;
        })}
      {sets.map((st) => IDS.map((id) => <React.Fragment key={st.name + id}>{laneLabels(d, st.name, id, sets.length === 2 && sameRows(sets[0].name, sets[1].name) ? 1 : st.a)}</React.Fragment>))}
      {draw.html}
    </AbsoluteFill>
      <Header f={d.f} />
      <EndCard f={d.f} />
      <Captions f={d.f} />
      <div style={{ position: "absolute", right: 48, top: 70, ...sans(700), fontSize: 26, color: "rgba(230,236,245,0.55)", letterSpacing: 4 }}>示意图</div>
    </AbsoluteFill>
  );
};

export const lineWindow = (id: string) => [Lc(id), Lend(id)];
