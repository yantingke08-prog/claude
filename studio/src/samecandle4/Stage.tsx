// The 2D layers of v4: fixed screen-space background, one chart layer per scene, labels drawn in the exact
// boxes geometry.ts computes (so the layout check tests what is drawn). Solid fills only and opacity set
// on each shape, never on a group: gradients, blurs, shadows and group opacity rasterise differently from
// frame to frame in Chrome (found by the v3 motion check).
import React from "react";
import { captions } from "./cue";
import { HERO, HERO_BAR, LANES, POSMAP, avgVol, type Bar, type LaneId } from "./data";
import { type Beat, type Label, type Pt, BEATS, CHAPTERS, EMPH, END_TEXT, NAME, PATHS, THREE_ITEMS, chartOf, labelBox, labelPad, rowFocus, vis } from "./beats";
import { type Box, LINE_H, edgePoint } from "./geometry";
import { type CandleOpts, type XY, HEADER_Y, arrowPts, axisBoxes, emphAt, holdShown, hlineSeg, liveBeats, pathPts, pt, rowBadgeBox, seg, threeBoxes, volBarBoxes, volFocus, volHeadBoxes, grown } from "./shapes";
import { type Chart, CUT, HOLD_CHART, IDS, POS_CHART, ROW, ROW_H, ROW_Y, THREE_CARD, VCOL_W, VCOL_X, WHY, bodyW, clamp01, cx, cy, ease, holdPost, mix, rowChart, rowPost, slot, volBars, volPost, volPrice } from "./layout";
import { num, sans } from "./fonts";

export const PAL = {
  bg: "#070a11",
  up: "#ff3347",
  upHi: "#ff8a95",
  upLo: "#b3101f",
  down: "#14c785",
  downHi: "#7ff0c4",
  downLo: "#077a50",
  gold: "#ffd166",
  ink: "#f5f7fa",
  soft: "#c9d2de",
  plate: "#0b0f18",
  lane: { A: "#4cc9ff", B: "#a98bff", C: "#f2b84b" } as Record<LaneId, string>,
};
const TONE: Record<string, string> = { gold: PAL.gold, white: "#eef3fa", up: PAL.up, down: PAL.down, warn: "#ff6b5e", soft: PAL.soft, ink: PAL.ink, ...PAL.lane };
const col = (c?: string) => (c ? TONE[c] ?? c : PAL.ink);

// ---------------------------------------------------------------- fixed background (screen space)
export const Background: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <pattern id="grid" width={60} height={60} patternUnits="userSpaceOnUse" x={0}>
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#8fa6c6" strokeOpacity={0.06} strokeWidth={1} />
      </pattern>
    </defs>
    <rect width={1080} height={1920} fill={PAL.bg} />
    <rect width={1080} height={1920} fill="url(#grid)" />
  </svg>
);

// ---------------------------------------------------------------- candles
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
    out.push(
      <g key={i}>
        {isHero && heroGlow && <rect x={x - bw / 2 - 6} y={yT - 6} width={bw + 12} height={Math.max(2, yB - yT) + 12} rx={Math.min(8, bw * 0.3)} fill="none" stroke={PAL.up} strokeOpacity={0.35 * op} strokeWidth={4} />}
        <line x1={x} x2={x} y1={cy(c, b.h)} y2={cy(c, b.l)} stroke={fill} strokeOpacity={op} strokeWidth={ww} strokeLinecap="round" />
        <rect x={x - bw / 2} y={yT} width={bw} height={Math.max(2, yB - yT)} rx={Math.min(5, bw * 0.16)} fill={fill} fillOpacity={op} />
        <rect x={x - bw / 2 + bw * 0.12} y={yT + 2} width={Math.max(1, bw * 0.14)} height={Math.max(0, yB - yT - 4)} fill={up ? PAL.upHi : PAL.downHi} fillOpacity={0.55 * op} />
        <rect x={x + bw / 2 - bw * 0.22} y={yT + 2} width={Math.max(1, bw * 0.2)} height={Math.max(0, yB - yT - 4)} fill={up ? PAL.upLo : PAL.downLo} fillOpacity={0.6 * op} />
      </g>,
    );
  }
  return <>{out}</>;
};

const Panel: React.FC<{ c: Chart; color?: string; op?: number; grid?: boolean; axis?: boolean; flash?: number }> = ({ c, color = "#a0b4d2", op = 1, grid = true, axis = false, flash = 0 }) => {
  const r = c.r;
  const lines: React.ReactNode[] = [];
  if (grid)
    for (let v = Math.ceil(c.plo / 10) * 10; v <= c.phi; v += 10) {
      const y = cy(c, v);
      if (y < r.y + 4 || y > r.y + r.h - 4) continue;
      lines.push(<line key={v} x1={r.x} x2={r.x + r.w} y1={y} y2={y} stroke="#9fb4d0" strokeOpacity={0.1 * op} strokeWidth={1.5} />);
    }
  if (axis)
    axisBoxes(c).forEach((b) =>
      lines.push(
        <text key={`t${b.v}`} x={b.x + b.w} y={b.y + b.h - 4} textAnchor="end" style={{ ...num(500), fontSize: 24 }} fill="#c8d6e8" fillOpacity={0.5 * op}>
          {b.v}
        </text>,
      ),
    );
  return (
    <g>
      <rect x={r.x - 14} y={r.y - 14} width={r.w + 28} height={r.h + 28} rx={16} fill="#080c14" fillOpacity={0.92 * op} stroke={color} strokeOpacity={(color === "#a0b4d2" ? 0.35 : 1) * op} strokeWidth={2} />
      {flash > 0 && <rect x={r.x - 14} y={r.y - 14} width={r.w + 28} height={r.h + 28} rx={16} fill="none" stroke={PAL.gold} strokeOpacity={flash} strokeWidth={4} />}
      {lines}
    </g>
  );
};

// ---------------------------------------------------------------- labels: drawn in exactly the box geometry computes
export const LabelBox: React.FC<{ l: Label; a: number; f: number; start: number }> = ({ l, a, f, start }) => {
  const b = labelBox(l);
  const pad = labelPad(l);
  const border = l.plain ? "none" : `${l.card ? 2.5 : 2}px solid ${col(l.tone ?? (l.card ? "gold" : "rgba(255,255,255,0.45)"))}`;
  return (
    <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, boxSizing: "border-box", padding: `${pad.y}px ${pad.x}px`, opacity: a, background: l.plain ? "transparent" : PAL.plate, border, borderRadius: l.card ? 18 : 12, whiteSpace: "nowrap", overflow: "visible" }}>
      {l.lines.map((ln) => (
        <div key={ln.t} style={{ ...(ln.num ? num(ln.w === 500 ? 500 : 700) : sans(ln.w ?? 900)), fontSize: ln.size, lineHeight: `${ln.size * LINE_H}px`, color: col(ln.color), opacity: ln.at !== undefined && ln.at > start ? clamp01((f - ln.at) / 8) : 1 }}>
          {ln.t}
        </div>
      ))}
    </div>
  );
};

const Dot: React.FC<{ p: XY; k: number; color: string; o: number }> = ({ p, k, color, o }) => (
  <>
    <circle cx={p.x} cy={p.y} r={14 * k} fill="none" stroke={color} strokeOpacity={o} strokeWidth={3} />
    <circle cx={p.x} cy={p.y} r={5.5 * k} fill={color} fillOpacity={o} />
  </>
);
const Leader: React.FC<{ from: XY; box: Box; k: number; color: string; o: number; dash?: boolean }> = ({ from, box, k, color, o, dash }) => {
  const e = edgePoint(box, from);
  const s = seg(from, e, k);
  return <line x1={from.x} y1={from.y} x2={s.x} y2={s.y} stroke={color} strokeOpacity={o} strokeWidth={2.5} strokeDasharray={dash ? "7 6" : undefined} />;
};

type Draw = { svg: React.ReactNode[]; html: React.ReactNode[] };
const drawBeat = (f: number, b: Beat, out: Draw, dim: number) => {
  const [k0, a0] = vis(b, f);
  if (a0 <= 0.001) return;
  const fa = a0 * dim;
  const k = ease(k0);
  const c = chartOf(b.ch);
  const key = b.id;
  const sl = slot(c);
  const lab = b.label;
  const lb = lab ? labelBox(lab) : null;
  const la = fa * clamp01((k0 - 0.4) / 0.6);
  const pushLabel = (alpha = la) => lab && out.html.push(<LabelBox key={`${key}L`} l={lab} a={alpha} f={f} start={b.a} />);
  const leaderTo = (p: XY, color: string, dash = false) => lb && out.svg.push(<Leader key={`${key}ld`} from={p} box={lb} k={k} color={color} o={fa} dash={dash} />);
  switch (b.kind) {
    case "marker": {
      const color = col(b.tone ?? "white");
      const p = pt(c, b.at);
      out.svg.push(<Dot key={key} p={p} k={k} color={color} o={fa} />);
      leaderTo(p, color);
      pushLabel();
      return;
    }
    case "ring": {
      const x = cx(c, b.at[0]);
      const bw = bodyW(c);
      const bar = POSMAP[b.at[0]];
      const y0 = cy(c, bar.h) - 14;
      const y1 = cy(c, bar.l) + 14;
      out.svg.push(<rect key={key} x={x - bw / 2 - 12} y={y0} width={bw + 24} height={(y1 - y0) * k} rx={10} fill="none" stroke={PAL.gold} strokeOpacity={fa} strokeWidth={3} />);
      return;
    }
    case "box": {
      const x0 = cx(c, b.i0) - sl / 2;
      const x1 = cx(c, b.i1) + sl / 2;
      const y0 = cy(c, b.p1);
      const y1 = cy(c, b.p0);
      out.svg.push(<rect key={key} x={x0} y={y0} width={(x1 - x0) * k} height={y1 - y0} rx={8} fill="#ffffff" fillOpacity={0.07 * fa} stroke="#ffffff" strokeOpacity={fa} strokeWidth={3} />);
      pushLabel();
      return;
    }
    case "hline": {
      const color = col(b.tone ?? "white");
      const s = hlineSeg(b)!;
      const x0 = b.vol ? c.r.x : s.x0;
      const xe = x0 + (s.x1 - x0) * k;
      const gold = b.tone === "gold";
      out.svg.push(
        <g key={key}>
          {gold && <line x1={x0} x2={xe} y1={s.y} y2={s.y} stroke={color} strokeOpacity={0.28 * fa} strokeWidth={b.strong ? 14 : 10} />}
          <line x1={x0} x2={xe} y1={s.y} y2={s.y} stroke={color} strokeOpacity={fa} strokeWidth={gold ? 3.5 : 2.5} strokeDasharray={gold ? undefined : "12 9"} />
        </g>,
      );
      if (lab?.leaderTo) leaderTo(pt(c, lab.leaderTo), color, true);
      pushLabel();
      return;
    }
    case "band": {
      const y0 = cy(c, b.p1);
      const y1 = cy(c, b.p0);
      const x0 = cx(c, b.i0) - sl / 2;
      const x1 = mix(x0, c.r.x + c.r.w, k);
      const cc = "#ffa95e";
      out.svg.push(
        <g key={key}>
          <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={cc} fillOpacity={0.18 * fa} />
          <line x1={x0} x2={x1} y1={y0} y2={y0} stroke={cc} strokeOpacity={fa} strokeWidth={2.5} />
          <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={cc} strokeOpacity={fa} strokeWidth={2.5} />
        </g>,
      );
      if (lab?.leaderTo) leaderTo(pt(c, lab.leaderTo), cc);
      lab && out.html.push(<LabelBox key={`${key}L`} l={{ ...lab, tone: lab.tone ?? "warn" }} a={la} f={f} start={b.a} />);
      return;
    }
    case "arrow": {
      const color = col(b.tone ?? "white");
      const [p0, p1] = arrowPts(b);
      const e = seg(p0, p1, k);
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const hs = 22;
      const head = `M ${e.x} ${e.y} L ${e.x - hs * Math.cos(ang - 0.45)} ${e.y - hs * Math.sin(ang - 0.45)} L ${e.x - hs * Math.cos(ang + 0.45)} ${e.y - hs * Math.sin(ang + 0.45)} Z`;
      out.svg.push(
        <g key={key}>
          <line x1={p0.x} y1={p0.y} x2={e.x} y2={e.y} stroke={color} strokeOpacity={0.28 * fa} strokeWidth={14} strokeLinecap="round" />
          <line x1={p0.x} y1={p0.y} x2={e.x} y2={e.y} stroke={color} strokeOpacity={fa} strokeWidth={4.5} strokeLinecap="round" />
          <path d={head} fill={color} fillOpacity={fa} />
        </g>,
      );
      if (lab) {
        leaderTo(lab.leaderTo ? pt(c, lab.leaderTo) : seg(p0, p1, 0.5), color);
        pushLabel(fa * clamp01((k0 - 0.6) / 0.4));
      }
      return;
    }
    case "bracket": {
      const color = col(b.tone ?? "white");
      const bw = bodyW(c);
      const x = cx(c, b.i) + (b.side === "left" ? -bw / 2 - 20 : bw / 2 + 20);
      const t = b.side === "left" ? -14 : 14;
      const y0 = cy(c, b.p1);
      const y1 = cy(c, b.p0);
      const ym = (y0 + y1) / 2;
      out.svg.push(
        <g key={key}>
          <path d={`M ${x - t} ${mix(ym, y0, k)} L ${x} ${mix(ym, y0, k)} L ${x} ${mix(ym, y1, k)} L ${x - t} ${mix(ym, y1, k)}`} fill="none" stroke={color} strokeOpacity={fa} strokeWidth={4} />
          {b.mid && <line x1={x} x2={x + t * 1.8} y1={ym} y2={ym} stroke={color} strokeOpacity={fa} strokeWidth={4} />}
          {b.mid && <circle cx={x} cy={ym} r={6} fill={color} fillOpacity={fa} />}
        </g>,
      );
      if (lb && b.mid) leaderTo({ x: x + t * 1.8, y: ym }, color);
      pushLabel();
      return;
    }
    case "fill": {
      const bw = bodyW(c);
      const x = cx(c, b.i);
      const y0 = cy(c, b.p1);
      const y1 = cy(c, b.p0);
      out.svg.push(<rect key={key} x={x - bw / 2 - 8} y={y0} width={bw + 16} height={(y1 - y0) * k} fill="#05070c" fillOpacity={0.66 * fa} stroke={TONE.warn} strokeOpacity={fa} strokeWidth={3} strokeDasharray="8 6" />);
      leaderTo({ x: x + bw / 2 + 8, y: (y0 + y1) / 2 }, TONE.warn);
      pushLabel();
      return;
    }
    case "card": {
      const p = pt(c, b.at);
      out.svg.push(<Dot key={key} p={p} k={k} color={PAL.gold} o={fa} />);
      leaderTo(p, PAL.gold);
      pushLabel(fa * clamp01((k0 - 0.35) / 0.65));
      return;
    }
    case "chip":
    case "ratio":
    case "text":
      pushLabel(b.kind === "text" ? fa * clamp01(k0 * 1.6) : fa * clamp01(k0 / 0.6));
      if (b.kind === "ratio") {
        const id = b.lane!;
        const v = volBars(IDS.indexOf(id));
        const hx = cx(v, HERO);
        const yAvg = cy(v, avgVol(id));
        const yTop = cy(v, LANES[id][HERO].v);
        const bx = hx + slot(v) * 0.5 + 8;
        out.svg.push(<path key={key} d={`M ${bx - 8} ${yAvg} L ${bx} ${yAvg} L ${bx} ${mix(yAvg, yTop, k)} L ${bx - 8} ${mix(yAvg, yTop, k)}`} fill="none" stroke={PAL.gold} strokeOpacity={fa} strokeWidth={4} />);
      }
      return;
    case "stamp": {
      if (!lb || !lab) return;
      out.html.push(
        <div key={key} style={{ position: "absolute", left: lb.x, top: lb.y, width: lb.w, height: lb.h, boxSizing: "border-box", opacity: fa * clamp01(k0 * 1.6), border: `6px solid ${TONE.warn}`, borderRadius: 18, background: "#2a0808", display: "flex", alignItems: "center", justifyContent: "center", ...sans(900), fontSize: 110, color: "#fff" }}>
          {lab.lines[0].t}
        </div>,
      );
      return;
    }
    case "path": {
      const pts = pathPts(b);
      const d = pts.map((q, j) => `${j ? "L" : "M"} ${q.x} ${q.y}`).join(" ");
      out.svg.push(
        <g key={key}>
          <path d={d} fill="none" stroke={PAL.lane[b.lane]} strokeOpacity={fa} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
          {pts.slice(1).map((q, j) => (
            <circle key={j} cx={q.x} cy={q.y} r={5} fill={PAL.lane[b.lane]} fillOpacity={fa} />
          ))}
        </g>,
      );
      leaderTo(pts[pts.length - 1], PAL.lane[b.lane], true);
      pushLabel();
      return;
    }
    case "unknown":
    case "answer": {
      const x0 = cx(c, b.kind === "unknown" ? b.i0 : HERO + 1) - sl / 2 - 2;
      const x1 = c.r.x + c.r.w + 4;
      const y0 = c.r.y - 6;
      const y1 = c.r.y + c.r.h + 6;
      const cc = b.kind === "answer" ? PAL.gold : "#cfe0f5";
      out.svg.push(<rect key={key} x={x0} y={y0} width={(x1 - x0) * k} height={y1 - y0} rx={12} fill={cc} fillOpacity={0.05 * fa} stroke={cc} strokeOpacity={fa} strokeWidth={3} strokeDasharray="12 9" />);
      pushLabel();
      return;
    }
  }
};

// ---------------------------------------------------------------- lane badge
export const Badge: React.FC<{ id: LaneId; x: number; y: number; size: number; op?: number }> = ({ id, x, y, size, op = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: size, height: size, boxSizing: "border-box", opacity: op, borderRadius: size * 0.22, background: "#0c1422", border: `${Math.max(2, size * 0.035)}px solid ${PAL.lane[id]}`, display: "flex", alignItems: "center", justifyContent: "center", ...num(700), fontSize: size * 0.6, lineHeight: 1, color: PAL.lane[id] }}>
    {id}
  </div>
);
// ---------------------------------------------------------------- emphasis ("真正" / "最关键")
// ---------------------------------------------------------------- scene layers
const Rows: React.FC<{ f: number; recap: boolean }> = ({ f, recap }) => {
  const endDim = recap && f >= CUT.end ? 1 - 0.8 * clamp01((f - CUT.end) / 4) : 1;
  const lit = recap && f >= END_TEXT.l3.a ? clamp01((f - END_TEXT.l3.a) / 4) : 0;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
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
      {IDS.map((id, k) => {
        const b = rowBadgeBox(k);
        return <Badge key={id} id={id} x={b.x} y={b.y} size={b.w} op={recap ? Math.max(0.4, rowFocus(id, f)) : 1} />;
      })}
    </>
  );
};

const Why: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <Panel c={WHY} grid={false} />
    <Candles bars={LANES.A} c={WHY} post={0} from={HERO} heroGlow />
  </svg>
);

// ---- the 三件事 page: three big row cards, each number + title + one icon + one line
const Icon: React.FC<{ k: number; b: Box; o: number }> = ({ k, b, o }) => {
  const { x, y, w, h } = b;
  if (k === 0) {
    // 位置: a range box with small candles, one big candle breaking out, arrow up-right
    const bx = x + 14;
    const by = y + h * 0.48;
    const bw = w * 0.56;
    const bh = h * 0.34;
    const cs = [0.6, -0.4, 0.5, -0.6, 0.4, -0.3, 0.5];
    return (
      <g>
        <rect x={bx} y={by} width={bw} height={bh} rx={6} fill="#ffffff" fillOpacity={0.06 * o} stroke="#ffffff" strokeOpacity={0.9 * o} strokeWidth={3} strokeDasharray="10 7" />
        {cs.map((v, j) => {
          const cxj = bx + 18 + j * ((bw - 36) / (cs.length - 1));
          const mid = by + bh / 2 + (j % 2 ? 6 : -6);
          const hh = Math.abs(v) * bh * 0.7;
          return <rect key={j} x={cxj - 7} y={mid - hh / 2} width={14} height={hh} rx={3} fill={v > 0 ? PAL.up : PAL.down} fillOpacity={o} />;
        })}
        <rect x={bx + bw + 14} y={by - bh * 0.95} width={26} height={bh * 1.55} rx={4} fill={PAL.up} fillOpacity={o} />
        <line x1={bx + bw + 52} y1={by - 6} x2={x + w - 18} y2={y + 22} stroke={PAL.gold} strokeOpacity={o} strokeWidth={6} strokeLinecap="round" />
        <path d={`M ${x + w - 12} ${y + 14} L ${x + w - 44} ${y + 20} L ${x + w - 22} ${y + 44} Z`} fill={PAL.gold} fillOpacity={o} />
      </g>
    );
  }
  if (k === 1) {
    // 量能: three volume bars of very different heights over a dashed average line
    const hs = [0.42, 0.95, 0.2];
    const cols = [PAL.lane.A, PAL.lane.B, PAL.lane.C];
    const bw = 58;
    const gap = (w - 3 * bw) / 4;
    return (
      <g>
        <line x1={x + 8} x2={x + w - 8} y1={y + h - 14} y2={y + h - 14} stroke="#ffffff" strokeOpacity={0.5 * o} strokeWidth={2} />
        {hs.map((v, j) => (
          <rect key={j} x={x + gap + j * (bw + gap)} y={y + h - 14 - v * (h - 30)} width={bw} height={v * (h - 30)} rx={5} fill={cols[j]} fillOpacity={o} />
        ))}
        <line x1={x + 8} x2={x + w - 8} y1={y + h - 14 - 0.3 * (h - 30)} y2={y + h - 14 - 0.3 * (h - 30)} stroke="#ffffff" strokeOpacity={0.85 * o} strokeWidth={3} strokeDasharray="10 7" />
      </g>
    );
  }
  // 承接: a big candle, its half line, one path holding above it and one breaking below
  const cx0 = x + 40;
  const top = y + 24;
  const bot = y + h - 24;
  const mid = (top + bot) / 2;
  const hold = `M ${cx0 + 22} ${top + 6} L ${x + 120} ${mid - 30} L ${x + 175} ${mid - 14} L ${x + 230} ${mid - 46} L ${x + w - 14} ${top + 4}`;
  const brk = `M ${cx0 + 22} ${top + 6} L ${x + 120} ${mid + 18} L ${x + 175} ${mid + 6} L ${x + 230} ${mid + 50} L ${x + w - 14} ${bot}`;
  return (
    <g>
      <rect x={cx0 - 20} y={top} width={40} height={bot - top} rx={5} fill={PAL.up} fillOpacity={o} />
      <line x1={x + 4} x2={x + w - 4} y1={mid} y2={mid} stroke={PAL.gold} strokeOpacity={o} strokeWidth={4} />
      <path d={hold} fill="none" stroke={PAL.lane.A} strokeOpacity={o} strokeWidth={5} strokeLinejoin="round" />
      <path d={brk} fill="none" stroke={PAL.lane.B} strokeOpacity={o} strokeWidth={5} strokeLinejoin="round" strokeDasharray="12 7" />
    </g>
  );
};
const Three: React.FC<{ f: number; flash: number }> = ({ f, flash }) => (
  <>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {THREE_ITEMS.map((t, k) => {
        const B = threeBoxes(k);
        const o = clamp01((f - t.at) / 9);
        return (
          <g key={t.n}>
            <rect x={B.card.x} y={B.card.y} width={B.card.w} height={B.card.h} rx={22} fill={PAL.plate} stroke={PAL.gold} strokeOpacity={0.35 + 0.65 * Math.max(o, flash)} strokeWidth={2.5 + 2 * flash} />
            <Icon k={k} b={B.icon} o={o} />
          </g>
        );
      })}
    </svg>
    {THREE_ITEMS.map((t, k) => {
      const B = threeBoxes(k);
      const o = clamp01((f - t.at) / 9);
      return (
        <React.Fragment key={t.n}>
          <div style={{ position: "absolute", left: B.num.x, top: B.num.y, width: B.num.w, height: B.num.h, ...num(700), fontSize: 72, lineHeight: `${B.num.h}px`, color: PAL.gold }}>{t.n}</div>
          <div style={{ position: "absolute", left: B.title.x, top: B.title.y, width: B.title.w, height: B.title.h, opacity: o, ...sans(900), fontSize: 84, lineHeight: `${B.title.h}px`, color: PAL.ink }}>{t.t}</div>
          <div style={{ position: "absolute", left: B.desc.x, top: B.desc.y, width: B.desc.w, height: B.desc.h, opacity: o, ...sans(700), fontSize: 44, lineHeight: `${B.desc.h}px`, color: PAL.soft, whiteSpace: "nowrap" }}>{t.d}</div>
        </React.Fragment>
      );
    })}
  </>
);

const Pos: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <Panel c={POS_CHART} />
    <Candles bars={POSMAP} c={POS_CHART} post={0} hero={POSMAP.length} />
  </svg>
);

const Vol: React.FC<{ f: number }> = ({ f }) => (
  <>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {IDS.map((id, k) => {
        const pc = volPrice(k);
        const vc = volBars(k);
        const fo = volFocus(id, f);
        return (
          <g key={id}>
            <Panel c={pc} color={PAL.lane[id]} grid={false} op={fo} />
            <Candles bars={LANES[id]} c={pc} post={volPost(id, f)} mul={fo} />
            <Panel c={vc} color={PAL.lane[id]} grid={false} op={fo} />
            {volBarBoxes(id, f).map((b, j) => {
              const i = vc.i0 + j;
              const bb = LANES[id][Math.round(i)];
              return <rect key={j} x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={bb.c >= bb.o ? PAL.up : PAL.down} fillOpacity={(Math.round(i) === HERO ? 1 : 0.7) * fo} />;
            })}
          </g>
        );
      })}
    </svg>
    {IDS.map((id, k) => {
      const [bb, nb] = volHeadBoxes(k, id);
      const fo = Math.max(0.45, volFocus(id, f));
      return (
        <React.Fragment key={id}>
          <Badge id={id} x={bb.x} y={bb.y} size={bb.w} op={fo} />
          <div style={{ position: "absolute", left: nb.x, top: nb.y, width: nb.w, height: nb.h, opacity: fo, ...sans(900), fontSize: 40, lineHeight: `${nb.h}px`, color: PAL.ink, whiteSpace: "nowrap" }}>{NAME[id]}</div>
        </React.Fragment>
      );
    })}
  </>
);

const Hold: React.FC<{ f: number; flash: number }> = ({ f, flash }) => {
  const c = HOLD_CHART;
  const s = holdShown(f);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Panel c={c} axis flash={flash} />
      <Candles bars={LANES.A} c={c} post={s.A ? holdPost("A", f) : 0} from={HERO} heroGlow />
      {s.B && <Candles bars={LANES.B} c={c} post={holdPost("B", f)} from={HERO + 1} />}
      {s.C && <Candles bars={LANES.C} c={c} post={holdPost("C", f)} from={HERO + 1} />}
    </svg>
  );
};

export const Layers: React.FC<{ f: number; scene: string }> = ({ f, scene }) => {
  const draw: Draw = { svg: [], html: [] };
  const em = emphAt(f);
  const flash = em && em.e.scene === scene ? em.flash : 0;
  const rowsDim = (b: Beat) => (b.ch.startsWith("row") && f >= CUT.recap ? Math.max(0.4, rowFocus(b.lane ?? (b.ch.slice(-1) as LaneId), f)) : 1);
  liveBeats(scene).forEach((b) => drawBeat(f, b, draw, rowsDim(b)));
  return (
    <>
      {scene === "rows" && <Rows f={f} recap={false} />}
      {scene === "recap" && <Rows f={f} recap />}
      {scene === "why" && <Why />}
      {scene === "three" && <Three f={f} flash={flash} />}
      {scene === "pos" && <Pos />}
      {scene === "vol" && <Vol f={f} />}
      {scene === "hold" && <Hold f={f} flash={flash} />}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {draw.svg}
      </svg>
      {draw.html}
    </>
  );
};

/** page dim for the emphasis (drawn above the charts, below titles and captions) */
export const EmphDim: React.FC<{ f: number }> = ({ f }) => {
  const em = emphAt(f);
  if (!em || em.dim <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, background: "#000", opacity: 0.1 * em.dim }} />;
};

// ---------------------------------------------------------------- titles, captions, end card (all centred on x = 540)
export const Header: React.FC<{ f: number }> = ({ f }) => {
  if (f >= CUT.end) {
    const k = (a: number) => (f >= a ? 1 : 0);
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top: HEADER_Y, textAlign: "center" }}>
        <div style={{ opacity: k(END_TEXT.l1.a), ...sans(900), fontSize: 80, lineHeight: 1.15, color: PAL.ink }}>{END_TEXT.l1.t}</div>
        <div style={{ opacity: k(END_TEXT.l2.a), ...sans(900), fontSize: 80, lineHeight: 1.15, color: PAL.gold }}>{END_TEXT.l2.t}</div>
      </div>
    );
  }
  const c = CHAPTERS.find((x) => f >= x.a && f < x.b);
  if (!c) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: HEADER_Y, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 22 }}>
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
  const em = emphAt(f);
  const word = em && em.e.line === c.line && c.text.includes(em.e.word) ? em.e.word : null;
  const parts = word ? c.text.split(word) : [c.text];
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1572, display: "flex", justifyContent: "center" }}>
      <div style={{ ...sans(900), fontSize: 58, lineHeight: 1.3, color: "#fff", padding: "8px 26px", borderRadius: 14, background: "#05070c", letterSpacing: 1 }}>
        {parts[0]}
        {word && (
          <span style={{ display: "inline-block", color: PAL.gold, transform: `scale(${1 + 0.12 * em!.dim})`, borderBottom: `5px solid ${PAL.gold}`, lineHeight: 1.1, margin: "0 6px" }}>{word}</span>
        )}
        {word && parts[1]}
      </div>
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
export const Corner: React.FC = () => <div style={{ position: "absolute", left: 0, right: 0, top: 84, textAlign: "center", ...sans(700), fontSize: 30, color: "#8b95a6", letterSpacing: 6 }}>示意图</div>;
export { ROW, VCOL_W, HOLD_CHART };
