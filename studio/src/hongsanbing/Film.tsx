// 《红三兵：三根阳线，不一定是机会》 — vertical 1080×1920 explainer, all 2D vector, timed to the voice.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { E, FRAMES, Lc } from "./cue";
import { CONF, CONF_SOL, DEF_STAGES, HOOK, POS_A, POS_B, POS_BARS, POS_RANGE, POS_RES, POS_SUP, RES, SOL, STRONG, type Bar, lerp, lerpBar } from "./data";
import { fontsReady, num, sans, serif } from "./fonts";
import { type Chart, Candles, Captions, Chip, ClipRect, Corner, Header, Label, Leader, PAL, Panel, Volume, bodyW, camera, clamp01, cx, cy, ease, out3, ramp, slot, win } from "./kit";
import { T } from "./text";

void fontsReady;

export const CUT = { def: E("def"), weak: E("weak"), pos: E("pos"), conf: E("conf"), risk: E("risk"), end: E("end") };
const XF = 10; // cross-dissolve between scenes

const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  return <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${width / 1080})`, transformOrigin: "0 0" }}>{children}</div>;
};

const Background: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <radialGradient id="hsbV" cx="50%" cy="38%" r="75%">
        <stop offset="0%" stopColor="#101826" />
        <stop offset="60%" stopColor="#080b12" />
        <stop offset="100%" stopColor="#040509" />
      </radialGradient>
      <pattern id="hsbG" width={60} height={60} patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#8fa6c6" strokeOpacity={0.05} strokeWidth={1} />
      </pattern>
    </defs>
    <rect width={1080} height={1920} fill="url(#hsbV)" />
    <rect width={1080} height={1920} fill="url(#hsbG)" />
  </svg>
);

const P = (c: Chart, i: number, p: number): [number, number] => [cx(c, i), cy(c, p)];
const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {children}
  </svg>
);

// ================================================================= 0 · hook
const HOOK_C: Chart = { x: 80, y: 540, w: 920, h: 860, i0: 6.9, i1: 10.9, plo: 101, phi: 116.2 };
const HOOK_W: Chart = { ...HOOK_C, i0: 2.6, i1: 15.2, plo: 101, phi: 117.2 };
const DUST = Array.from({ length: 46 }, (_, k) => {
  const r = (n: number) => ((Math.sin(k * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * 1080, y: 420 + r(2) * 1000, s: 1.4 + r(3) * 2.4, o: 0.1 + r(4) * 0.28, v: 0.15 + r(5) * 0.5 };
});

const HOOK_Z: Chart = { ...HOOK_C, i0: 7.6, i1: 10.7, plo: 102.2, phi: 114.6 }; // opening close-up
const BASE_P = 102.9; // first soldier's open: the gain counter starts here

const Hook: React.FC<{ f: number }> = ({ f }) => {
  // v3: the film opens mid-action — three soldiers slam in within 0.6 s on a close-up, the camera kicks back,
  // a gain counter races up, then the voice asks "你敢追吗？" and the move is shown failing
  const sol = [E("s1"), E("s2"), E("s3")];
  const c = camera(f, [[0, HOOK_Z], [sol[2] + 8, HOOK_C], [E("fall") - 8, HOOK_W]], 26);
  const spike = ramp(f, E("spike"), 9);
  const bars: Bar[] = HOOK.map((b, i) => (i === 10 ? { ...b, h: lerp(113.1, 115.6, spike) } : b));
  const fall = E("fall");
  const g = (i: number) => (i < 8 ? 1 : i <= 10 ? out3((f - sol[i - 8]) / 6) : out3((f - fall - (i - 11) * 5) / 7));
  const op = (i: number) => (i < 8 ? 0.4 : 1);
  const glow = (i: number) => (i >= 8 && i <= 10 ? 1 - ramp(f, fall, 10) : 0);
  // impacts: a decaying shake and an expanding ring on each soldier, and on the fall
  const hits = [...sol.map((t, k) => [t + 5, 1 + 0.3 * k] as [number, number]), [fall, 1.3] as [number, number]];
  let shx = 0;
  let shy = 0;
  for (const [t, amp] of hits)
    if (f >= t) {
      const d = Math.exp(-(f - t) / 3.2) * 10 * amp;
      shx += d * Math.sin((f - t) * 2.3);
      shy += d * Math.cos((f - t) * 2.9) * 0.7;
    }
  // 3D stage: tilted hard at first, settling
  const t = clamp01(f / CUT.def);
  const rx = lerp(26, 9, ease(t));
  const ry = lerp(-18, -5, ease(t));
  const base = c.y + c.h;
  // gain counter: follows the latest drawn close
  let px = BASE_P;
  let rising = true;
  for (let i = 8; i < HOOK.length; i++) {
    const gi = g(i);
    if (gi <= 0) break;
    const b = HOOK[i];
    const prev = px;
    px = b.o + (b.c - b.o) * Math.min(1, gi);
    rising = px >= prev - 0.001 && b.c >= b.o;
  }
  const pct = (px / BASE_P - 1) * 100;
  const cA = 1;
  const dare = E("dare");
  const dk = win(f, dare, E("hope") - 2, 6, 8);
  const pulse = 1 + 0.08 * Math.sin(Math.PI * clamp01((f - dare) / 10));
  // projection "看起来像机会" and its collapse
  const hope = E("hope");
  const pk = ramp(f, hope, 16) * (1 - ramp(f, E("spike") - 4, 6)); // the projection is gone before the push
  const p0 = P(c, 10, 112.6);
  const p1: [number, number] = [cx(c, 10.75), cy(c, 116.0)];
  const last = win(f, E("spike") + 2, CUT.def + 4);
  const top = P(c, 10, bars[10].h);
  const ring = (i: number, t0: number, color: string, key: string) => {
    const k = (f - t0) / 12;
    if (k <= 0 || k >= 1) return null;
    const [x, y] = P(c, i, Math.max(bars[i].o, bars[i].c));
    return <circle key={key} cx={x} cy={y} r={24 + 120 * out3(k)} fill="none" stroke={color} strokeOpacity={0.75 * (1 - k)} strokeWidth={4 * (1 - k) + 1} />;
  };
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${shx}px, ${shy}px) perspective(1900px) rotateX(${rx}deg) rotateY(${ry}deg)`, transformOrigin: "540px 1000px" }}>
        <Svg>
          {DUST.map((d, k) => (
            <circle key={k} cx={d.x} cy={d.y - f * d.v} r={d.s} fill="#cfe0ff" fillOpacity={d.o} />
          ))}
          {/* floor line and reflection */}
          <line x1={40} x2={1040} y1={base + 4} y2={base + 4} stroke="#cfe0ff" strokeOpacity={0.16} strokeWidth={2} />
          <ClipRect id="hkR" x={0} y={base + 6} w={1080} h={230} />
          <g clipPath="url(#hkR)" transform={`translate(0 ${2 * base + 8}) scale(1 -1)`}>
            <Candles c={c} bars={bars} g={g} op={(i) => op(i) * 0.13} />
          </g>
          <Candles c={c} bars={bars} g={g} op={op} glow={glow} />
          {sol.map((t0, k) => ring(8 + k, t0 + 4, PAL.up, `r${k}`))}
          {ring(11, fall + 2, PAL.down, "rf")}
          {dk > 0 && <circle cx={top[0]} cy={top[1]} r={34 * pulse} fill="none" stroke={PAL.gold} strokeOpacity={dk} strokeWidth={4} />}
          {pk > 0 && (
            <g>
              <line x1={p0[0]} y1={p0[1]} x2={lerp(p0[0], p1[0], pk)} y2={lerp(p0[1], p1[1], pk)} stroke={PAL.gold} strokeWidth={4} strokeDasharray="14 10" strokeOpacity={0.95} />
              <circle cx={lerp(p0[0], p1[0], pk)} cy={lerp(p0[1], p1[1], pk)} r={9} fill={PAL.gold} fillOpacity={pk} />
            </g>
          )}
          {last > 0 && <Leader p={top} q={[top[0] + 70, top[1] - 56]} k={last} color={PAL.warn} />}
        </Svg>
        <Label x={p1[0]} y={p1[1] - 18} ax={0.75} ay={1} lines={[{ t: T.hope, size: 44, color: "gold" }]} tone="gold" a={pk * ramp(f, hope + 6, 8)} f={f} />
        <Label x={top[0] + 70} y={top[1] - 56} ax={0} ay={0.5} lines={[{ t: T.last, size: 44, color: "warn" }]} tone="warn" a={last} f={f} />
      </div>
      {/* gain counter (screen space, upper-left of the stage) */}
      <div style={{ position: "absolute", left: 70, top: 560, opacity: cA * (1 - ramp(f, CUT.def - 4, 8)) }}>
        <div style={{ ...sans(700), fontSize: 32, color: PAL.soft, letterSpacing: 4 }}>{T.gain}</div>
        <div style={{ ...num(700), fontSize: 132, lineHeight: 1.05, color: rising ? PAL.up : PAL.down, transform: `translate(${shx * 0.4}px, ${shy * 0.4}px)` }}>
          {pct >= 0 ? "+" : "−"}
          {Math.abs(pct).toFixed(1)}%
        </div>
        <div style={{ display: "inline-block", marginTop: 14, opacity: dk, transform: `scale(${pulse})`, transformOrigin: "0 50%", ...sans(900), fontSize: 64, color: "#10141c", background: PAL.gold, padding: "2px 26px 6px", borderRadius: 18 }}>{T.dare}</div>
      </div>
      <HookTitle f={f} />
    </>
  );
};

const HookTitle: React.FC<{ f: number }> = ({ f }) => {
  const t0 = E("title");
  const chars = Array.from(T.title);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 176, textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {chars.map((ch, k) => {
          const a = out3((f - t0 - k * 4) / 14);
          return (
            <div key={k} style={{ ...serif(900), fontSize: 176, lineHeight: 1.05, color: PAL.ink, opacity: a, transform: `translateY(${(1 - a) * 40}px)` }}>
              {ch}
            </div>
          );
        })}
      </div>
      <div style={{ ...sans(900), fontSize: 54, marginTop: 10, opacity: out3((f - t0 - 16) / 12), letterSpacing: 2 }}>
        <span style={{ color: PAL.soft }}>{T.sub1}</span>
        <span style={{ color: PAL.gold }}>{T.sub2}</span>
      </div>
    </div>
  );
};

// ================================================================= 1–2 · definition, then the weak version on the same chart
const DEF_FULL: Chart = { x: 90, y: 400, w: 900, h: 600, i0: 0, i1: 10, plo: 99, phi: 116.5 };
const DEF_PUSH: Chart = { ...DEF_FULL, i0: 4.6, i1: 11.2, plo: 100.4, phi: 115.2 };
const VOL = { y: 1060, h: 190, vmax: 125 };
const CHIP = { x: [60, 552], y: [1306, 1398], w: 468 };

const defBars = (f: number): Bar[] => {
  const st: [Bar[], number, number][] = [
    [DEF_STAGES.SHRUNK, E("shrink"), 22],
    [DEF_STAGES.WICKY, E("wicks"), 20],
    [DEF_STAGES.DRY, E("volDown"), 20],
    [DEF_STAGES.SPIKE, E("spikeW"), 8],
    [DEF_STAGES.WEAK, E("fallW"), 14],
  ];
  let bars = DEF_STAGES.STRONG;
  for (const [to, a, d] of st) {
    const t = ease((f - a) / d);
    if (t > 0) bars = bars.map((b, i) => lerpBar(b, to[i], t));
  }
  return bars;
};

const DefWeak: React.FC<{ f: number }> = ({ f }) => {
  const c = camera(f, [[0, DEF_FULL], [CUT.def + 6, DEF_PUSH]], 24);
  const bars = defBars(f);
  const weak = f >= CUT.weak;
  const bw = bodyW(c);
  const svg: React.ReactNode[] = [];
  const S = (n: string) => E(n);
  // soldier badges 1 2 3 under each bar
  const b0 = Lc("d1", 4);
  SOL.forEach((i, k) => {
    const a = ramp(f, b0 + k * 6, 8);
    if (a <= 0) return;
    const [x, y] = P(c, i, bars[i].l);
    svg.push(
      <g key={`bd${i}`} opacity={1}>
        <circle cx={x} cy={y + 40} r={21} fill={PAL.plate} fillOpacity={a} stroke={PAL.up} strokeOpacity={a} strokeWidth={2.5} />
        <text x={x} y={y + 49} textAnchor="middle" style={{ ...sans(900), fontSize: 26 }} fill={PAL.ink} fillOpacity={a}>
          {k + 1}
        </text>
      </g>,
    );
  });
  // closes stepping up
  const kc = win(f, S("closes"), S("opens") - 2) * ramp(f, S("closes"), 16);
  if (kc > 0) {
    const pts = SOL.map((i) => [cx(c, i) + bw / 2 + 16, cy(c, bars[i].c)] as [number, number]);
    SOL.forEach((i, k) => svg.push(<line key={`ct${i}`} x1={cx(c, i) - bw / 2} x2={pts[k][0]} y1={pts[k][1]} y2={pts[k][1]} stroke={PAL.gold} strokeOpacity={kc} strokeWidth={3} />));
    svg.push(<polyline key="cl" points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={PAL.gold} strokeOpacity={kc} strokeWidth={3} strokeDasharray="10 8" />);
    pts.forEach((p, k) => svg.push(<circle key={`cd${k}`} cx={p[0]} cy={p[1]} r={7} fill={PAL.gold} fillOpacity={kc} />));
    svg.push(<Leader key="cll" p={pts[1]} q={[480, 470]} k={kc} color={PAL.gold} />);
  }
  // opens inside the previous body
  const ko = win(f, S("opens"), S("body") - 2) * ramp(f, S("opens"), 14);
  if (ko > 0)
    [9, 10].forEach((i) => {
      const pv = bars[i - 1];
      const yT = cy(c, Math.max(pv.o, pv.c));
      const yB = cy(c, Math.min(pv.o, pv.c));
      const x0 = cx(c, i - 1) - bw / 2;
      const x1 = cx(c, i) + bw / 2;
      svg.push(
        <g key={`op${i}`}>
          <rect x={x0} y={yT} width={(x1 - x0) * ko} height={yB - yT} fill={PAL.cyan} fillOpacity={0.12 * ko} />
          <line x1={x0} x2={x0 + (x1 - x0) * ko} y1={yT} y2={yT} stroke={PAL.cyan} strokeOpacity={ko} strokeWidth={2} strokeDasharray="8 6" />
          <line x1={x0} x2={x0 + (x1 - x0) * ko} y1={yB} y2={yB} stroke={PAL.cyan} strokeOpacity={ko} strokeWidth={2} strokeDasharray="8 6" />
          <circle cx={cx(c, i) - bw / 2} cy={cy(c, bars[i].o)} r={8} fill={PAL.cyan} fillOpacity={ko} stroke={PAL.bg} strokeWidth={2} />
        </g>,
      );
    });
  if (ko > 0) svg.push(<Leader key="opl" p={[cx(c, 9) - bw / 2, cy(c, bars[9].o)]} q={[480, 520]} k={ko} color={PAL.cyan} />);
  // full bodies, short upper wicks
  const kb = win(f, S("body"), CUT.weak - 2) * ramp(f, S("body"), 12);
  if (kb > 0)
    SOL.forEach((i) => {
      const b = bars[i];
      svg.push(<rect key={`bo${i}`} x={cx(c, i) - bw / 2 - 6} y={cy(c, Math.max(b.o, b.c)) - 6} width={bw + 12} height={cy(c, Math.min(b.o, b.c)) - cy(c, Math.max(b.o, b.c)) + 12} rx={9} fill="none" stroke={PAL.gold} strokeOpacity={kb} strokeWidth={3} />);
    });
  const kw = win(f, S("wick"), CUT.weak - 2) * ramp(f, S("wick"), 10);
  const wickBracket = (i: number, k: number, color: string) => {
    const b = bars[i];
    const x = cx(c, i) + bw / 2 + 16;
    const y0 = cy(c, b.h);
    const y1 = cy(c, Math.max(b.o, b.c));
    svg.push(<path key={`wb${i}${color}`} d={`M ${x - 8} ${y0} L ${x} ${y0} L ${x} ${y1} L ${x - 8} ${y1}`} fill="none" stroke={color} strokeOpacity={k} strokeWidth={3} />);
  };
  if (kw > 0) wickBracket(10, kw, PAL.gold);
  // volume rises gently
  const kv = ramp(f, S("volUp"), 14) * (1 - ramp(f, S("volDown"), 10));
  if (kv > 0) {
    const pts = SOL.map((i) => [cx(c, i), VOL.y + VOL.h - (bars[i].v / VOL.vmax) * VOL.h - 12]);
    svg.push(<polyline key="vl" points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={PAL.gold} strokeOpacity={kv} strokeWidth={3.5} strokeDasharray="10 7" />);
  }
  // ---- weak: ghost of the textbook bars
  const kg = ramp(f, S("shrink"), 12) * (1 - ramp(f, S("quality") + 30, 14));
  if (kg > 0)
    [9, 10].forEach((i) => {
      const b = STRONG[i];
      svg.push(<rect key={`gh${i}`} x={cx(c, i) - bw / 2 - 3} y={cy(c, b.c)} width={bw + 6} height={cy(c, b.o) - cy(c, b.c)} rx={6} fill="none" stroke="#ffffff" strokeOpacity={0.42 * kg} strokeWidth={2} strokeDasharray="7 6" />);
    });
  const kww = win(f, S("wicks"), S("volDown") - 2) * ramp(f, S("wicks"), 10);
  if (kww > 0) [9, 10].forEach((i) => wickBracket(i, kww, PAL.warn));
  const kf = win(f, S("spikeW"), S("quality") - 2) * ramp(f, S("fallW"), 10);
  if (kf > 0) {
    const b = bars[10];
    const x = cx(c, 10) + bw / 2 + 22;
    svg.push(
      <g key="fallA">
        <line x1={x} x2={x} y1={cy(c, b.h)} y2={cy(c, b.c) - 10} stroke={PAL.warn} strokeOpacity={kf} strokeWidth={3.5} />
        <path d={`M ${x - 9} ${cy(c, b.c) - 20} L ${x} ${cy(c, b.c) - 4} L ${x + 9} ${cy(c, b.c) - 20}`} fill="none" stroke={PAL.warn} strokeOpacity={kf} strokeWidth={3.5} strokeLinejoin="round" />
      </g>,
    );
  }
  // ---- chips
  const chipState = (k: number) => {
    const tick = [S("tick1"), S("tick2"), S("tick3"), S("tick4")][k];
    if (k === 2 && f >= S("wicks") + 10) return { s: -1, t: T.chipsBad[0], at: S("wicks") + 10 };
    if (k === 3 && f >= S("volDown") + 16) return { s: -1, t: T.chipsBad[1], at: S("volDown") + 16 };
    return { s: f >= tick ? 1 : 0, t: T.chips[k], at: tick };
  };
  const volG = (i: number) => out3((f - S("vol") - i * 1.2) / 12);
  const soldier = (i: number) => SOL.includes(i);
  const ql = qualityCard(f);
  return (
    <>
      <Svg>
        <Panel x={60} y={370} w={960} h={905} grid={c} />
        <line x1={84} x2={996} y1={VOL.y - 18} y2={VOL.y - 18} stroke={PAL.line} strokeOpacity={0.12} strokeWidth={1.5} />
        <ClipRect id="dfC" x={72} y={382} w={936} h={640} />
        <ClipRect id="dfV" x={72} y={VOL.y - 10} w={936} h={VOL.h + 12} />
        <Candles c={c} bars={bars} op={(i) => (soldier(i) ? 1 : 0.42)} glow={(i) => (soldier(i) && !weak ? 1 : 0)} clip="dfC" />
        <Volume c={c} y={VOL.y} h={VOL.h} vmax={VOL.vmax} bars={bars} g={volG} op={(i) => (soldier(i) ? 1 : 0.5)} hl={(i) => (soldier(i) ? ramp(f, S("volUp"), 10) * (1 - ramp(f, S("quality"), 10)) : 0)} clip="dfV" />
        {svg}
      </Svg>
      <Label x={480} y={470} ax={1} ay={0.5} lines={[{ t: T.closes }]} tone="gold" a={kc} f={f} />
      <Label x={480} y={520} ax={1} ay={0.5} lines={[{ t: T.opens, size: 36 }]} tone="cyan" a={ko} f={f} />
      <Label x={480} y={540} ax={1} ay={0.5} lines={[{ t: T.body }, { t: T.wick, at: S("wick") }]} tone="gold" a={kb} f={f} />
      <Label x={110} y={VOL.y - 4} lines={[{ t: T.vol, size: 34, color: "gold" }]} tone="gold" a={win(f, S("volUp"), S("shrink") - 2)} f={f} />
      <Label x={480} y={520} ax={1} ay={0.5} lines={[{ t: T.weakBody }]} tone="warn" a={win(f, S("shrink") + 4, S("wicks") - 2)} f={f} />
      <Label x={480} y={520} ax={1} ay={0.5} lines={[{ t: T.weakWick }]} tone="warn" a={win(f, S("wicks") + 4, S("volDown") - 2)} f={f} />
      <Label x={110} y={VOL.y - 4} lines={[{ t: T.weakVol, size: 34, color: "warn" }]} tone="warn" a={win(f, S("volDown") + 4, S("quality") - 2)} f={f} />
      <Label x={cx(c, 10)} y={cy(c, bars[10].h) - 16} ax={0.5} ay={1} lines={[{ t: T.weakFall, color: "warn" }]} tone="warn" a={win(f, S("fallW"), S("quality") - 2)} f={f} />
      {ql}
      {[0, 1, 2, 3].map((k) => {
        const st = chipState(k);
        return <Chip key={k} x={CHIP.x[k % 2]} y={CHIP.y[Math.floor(k / 2)]} w={CHIP.w} text={st.t} state={st.s} k={(f - st.at) / 10} a={ramp(f, CUT.def + 6 + k * 3, 10)} n={String(k + 1)} />;
      })}
    </>
  );
};

/** "形态质量 · 在减弱" — a 5-segment gauge that drains from 5 to 2 */
const qualityCard = (f: number) => {
  const a0 = E("quality");
  const a = win(f, a0, CUT.pos + 6);
  if (a <= 0) return null;
  const lit = 5 - 3 * ramp(f, a0 + 8, 22);
  return (
    <div style={{ position: "absolute", left: 100, top: 420, opacity: a, padding: "14px 22px 16px", background: PAL.plate, border: `2.5px solid ${PAL.warn}`, borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <div style={{ ...sans(900), fontSize: 40, color: PAL.ink }}>{T.quality}</div>
        <div style={{ ...sans(900), fontSize: 40, color: PAL.warn, opacity: ramp(f, a0 + 10, 8) }}>{T.qualityDown}</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} style={{ width: 56, height: 16, borderRadius: 4, background: k < Math.round(lit) ? (lit < 4.5 ? PAL.warn : PAL.gold) : "#253042" }} />
        ))}
      </div>
      <div style={{ ...sans(900), fontSize: 36, color: PAL.warn, marginTop: 12, opacity: ramp(f, E("notBull"), 8) }}>{T.notBull}</div>
    </div>
  );
};

// ================================================================= 3 · position
const POS_FULL: Chart = { x: 90, y: 400, w: 900, h: 1050, i0: 0, i1: 65, plo: 94, phi: 168 };
const POS_AV: Chart = { ...POS_FULL, i0: 20, i1: 44, plo: 95, phi: 125 };
const POS_BV: Chart = { ...POS_FULL, i0: 44, i1: 65, plo: 128, phi: 168 };

const Pos: React.FC<{ f: number }> = ({ f }) => {
  const S = (n: string) => E(n);
  const c = camera(f, [[0, POS_FULL], [S("posA") - 10, POS_AV], [S("posB") - 14, POS_BV], [S("cashout") + 12, POS_FULL]], 28);
  const sl = slot(c);
  const isSol = (i: number) => POS_A.includes(i) || POS_B.includes(i);
  const g = (i: number) => (i < 60 ? clamp01((f - CUT.pos - i * 0.8) / 3) : out3((f - S("trap") - (i - 60) * 4) / 6));
  const frame = (ids: number[], color: string, k: number, key: string) => {
    if (k <= 0) return null;
    const hi = Math.max(...ids.map((i) => POS_BARS[i].h));
    const lo = Math.min(...ids.map((i) => POS_BARS[i].l));
    const x0 = cx(c, ids[0]) - sl * 0.75;
    const x1 = cx(c, ids[2]) + sl * 0.75;
    return <rect key={key} x={x0} y={cy(c, hi) - 14} width={x1 - x0} height={cy(c, lo) - cy(c, hi) + 28} rx={12} fill={color} fillOpacity={0.08 * k} stroke={color} strokeOpacity={k} strokeWidth={3} />;
  };
  const back = ramp(f, S("cashout") + 12, 20);
  const kA = Math.max(win(f, S("posA"), S("posB") - 12) * ramp(f, S("posA"), 12), back);
  const kB = Math.max(ramp(f, S("posB"), 12), back);
  const kR = win(f, S("range"), S("posB") - 12) * ramp(f, S("range"), 12);
  const r = POS_RANGE;
  const kRes = ramp(f, S("resist"), 16);
  const kSup = win(f, S("farSup"), S("cashout") + 10) * ramp(f, S("farSup"), 14);
  const labA = win(f, S("posA"), S("posB") - 14);
  const labB = win(f, S("posB") + 4, S("cashout") + 8);
  const xb = cx(c, POS_B[0]) - sl * 1.1;
  const yb0 = cy(c, POS_BARS[POS_B[0]].l);
  const yb1 = cy(c, POS_SUP);
  return (
    <>
      <Svg>
        <Panel x={60} y={370} w={960} h={1110} grid={c} step={10} />
        <ClipRect id="psC" x={72} y={382} w={936} h={1086} />
        <g clipPath="url(#psC)">
          {kRes > 0 && (
            <g>
              <rect x={72} y={cy(c, POS_RES.hi)} width={936 * kRes} height={cy(c, POS_RES.lo) - cy(c, POS_RES.hi)} fill={PAL.warn} fillOpacity={0.14} />
              <line x1={72} x2={72 + 936 * kRes} y1={cy(c, POS_RES.lo)} y2={cy(c, POS_RES.lo)} stroke={PAL.warn} strokeWidth={2.5} />
              <line x1={72} x2={72 + 936 * kRes} y1={cy(c, POS_RES.hi)} y2={cy(c, POS_RES.hi)} stroke={PAL.warn} strokeWidth={2.5} strokeOpacity={0.6} />
            </g>
          )}
          {kR > 0 && <rect x={cx(c, r.i0) - sl / 2} y={cy(c, r.hi)} width={(cx(c, r.i1) - cx(c, r.i0) + sl) * kR} height={cy(c, r.lo) - cy(c, r.hi)} rx={8} fill="#ffffff" fillOpacity={0.05} stroke="#ffffff" strokeOpacity={0.7 * kR} strokeWidth={2.5} strokeDasharray="10 8" />}
          {kSup > 0 && <line x1={72} x2={72 + 936 * kSup} y1={yb1} y2={yb1} stroke={PAL.cyan} strokeOpacity={0.85} strokeWidth={2.5} strokeDasharray="12 9" />}
          <Candles c={c} bars={POS_BARS} g={g} op={(i) => (isSol(i) ? 1 : i >= 60 ? 0.9 : 0.5)} glow={(i) => (isSol(i) ? 1 : 0)} />
          {frame(POS_A, PAL.cyan, kA, "fA")}
          {frame(POS_B, PAL.warn, kB, "fB")}
          {kSup > 0 && (
            <g>
              <line x1={xb} x2={xb} y1={yb0} y2={yb0 + (yb1 - yb0) * kSup} stroke={PAL.cyan} strokeWidth={3} />
              <line x1={xb - 12} x2={xb + 12} y1={yb0} y2={yb0} stroke={PAL.cyan} strokeWidth={3} />
              <line x1={xb - 12} x2={xb + 12} y1={yb1} y2={yb1} stroke={PAL.cyan} strokeWidth={3} strokeOpacity={kSup} />
            </g>
          )}
        </g>
        {labA > 0 && <Leader p={[cx(c, POS_A[0]) - sl * 0.75, cy(c, POS_BARS[37].h) - 14]} q={[420, 560]} k={labA} color={PAL.cyan} />}
        {kSup > 0 && labB > 0 && <Leader p={[xb, (yb0 + yb1) / 2]} q={[770, (yb0 + yb1) / 2]} k={win(f, S("farSup"), S("trap") - 2)} color={PAL.cyan} />}
      </Svg>
      <Label x={110} y={430} lines={[...T.aLines.map((t, k) => ({ t, at: [S("posA"), S("range"), Lc("p2", 10)][k] })), { t: T.aWorth, size: 42, color: "cyan", at: S("worthA") }]} tone="cyan" a={labA} f={f} />
      <Label x={xb - 20} y={cy(c, POS_RES.lo) + 70} ax={1} ay={0.5} lines={[{ t: T.bHigh, color: "warn" }]} tone="warn" a={labB} f={f} />
      <Label x={110} y={cy(c, POS_RES.hi) - 12} ay={1} lines={[{ t: T.bRes, color: "warn" }]} tone="warn" a={win(f, S("resist") + 4, S("cashout") + 8)} f={f} />
      <Label x={110} y={yb1 - 10} ay={1} lines={[{ t: T.supTag, size: 30, color: "cyan" }]} plain a={win(f, S("farSup") + 6, S("cashout") + 8)} f={f} />
      <Label x={770} y={(yb0 + yb1) / 2} ay={0.5} lines={[{ t: T.bSup, color: "cyan" }]} tone="cyan" a={win(f, S("farSup") + 6, S("trap") - 2)} f={f} />
      <Label x={770} y={cy(c, 137.5)} ay={0.5} lines={[{ t: T.bTrap, color: "warn" }, { t: T.bCash, color: "warn", at: S("cashout") }]} tone="warn" a={win(f, S("trap"), S("cashout") + 8)} f={f} />
    </>
  );
};

// ================================================================= 4–5 · confirmation, then risk on the same chart
const CF_FULL: Chart = { x: 90, y: 400, w: 900, h: 680, i0: 0, i1: 19, plo: 104, phi: 132 };
const CF_RISK: Chart = { x: 90, y: 400, w: 900, h: 900, i0: 6, i1: 15, plo: 104, phi: 124.5 };
const CVOL = { y: 1120, h: 190, vmax: 112 };
const CCHIP = { x: [60, 384, 708], y: 1366, w: 312 };

const ConfRisk: React.FC<{ f: number }> = ({ f }) => {
  const S = (n: string) => E(n);
  const risk = CUT.risk;
  const c = camera(f, [[0, CF_FULL], [risk + 8, CF_RISK]], 30);
  const bw = bodyW(c);
  const g = (i: number) => {
    if (i <= 12) return clamp01((f - CUT.conf - i * 1.5) / 4);
    if (i === 13) return out3((f - S("brk")) / 10);
    if (i <= 16) return out3((f - S("pull") - (i - 14) * 7) / 8);
    return out3((f - S("volOk") - (i - 17) * 6) / 8);
  };
  const isSol = (i: number) => CONF_SOL.includes(i);
  const rk = ramp(f, risk, 14);
  const op = (i: number) => (isSol(i) ? 1 : lerp(i <= 9 ? 0.5 : 0.95, 0.3, rk));
  const stat = ramp(f, S("prob") - 4, 14);
  const dim = 1 - 0.9 * stat;
  const svg: React.ReactNode[] = [];
  // 第三根很强 → 别急着追高
  const k3 = win(f, S("chase3"), S("resLine") - 2) * ramp(f, S("chase3"), 10);
  if (k3 > 0) {
    const b = CONF[12];
    svg.push(<rect key="b3" x={cx(c, 12) - bw / 2 - 7} y={cy(c, b.h) - 7} width={bw + 14} height={cy(c, b.l) - cy(c, b.h) + 14} rx={9} fill="none" stroke={PAL.gold} strokeOpacity={k3} strokeWidth={3} />);
  }
  const kx = win(f, S("chase"), S("resLine") - 2) * ramp(f, S("chase"), 8);
  const t3 = P(c, 12, CONF[12].h);
  if (kx > 0) svg.push(<path key="x" d={`M ${t3[0] - 16} ${t3[1] - 52} L ${t3[0] + 16} ${t3[1] - 20} M ${t3[0] + 16} ${t3[1] - 52} L ${t3[0] - 16} ${t3[1] - 20}`} stroke={PAL.warn} strokeOpacity={kx} strokeWidth={5} strokeLinecap="round" />);
  // key level
  const kl = ramp(f, S("resLine"), 16);
  const yR = cy(c, RES);
  // retest holds
  const kh = ramp(f, S("hold"), 10) * (1 - rk);
  const ph = P(c, 15, CONF[15].l);
  if (kh > 0) svg.push(<circle key="hd" cx={ph[0]} cy={ph[1]} r={10} fill={PAL.cyan} fillOpacity={kh} stroke={PAL.bg} strokeWidth={2} />);
  // stops
  const s1 = ramp(f, S("stopLow"), 14);
  const s2 = ramp(f, S("stopBody"), 14);
  const sx = cx(c, 10) - bw / 2 - 18;
  const yLow = cy(c, CONF[10].l);
  const yBody = cy(c, CONF[10].o);
  const chip = (k: number) => [S("brk") + 12, S("hold") + 10, S("volOk") + 10][k];
  const chipA = (k: number) => ramp(f, CUT.conf + 8 + k * 3, 10) * (1 - ramp(f, risk, 10));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        <Svg>
          <Panel x={60} y={370} w={960} h={965} grid={c} />
          <line x1={84} x2={996} y1={CVOL.y - 18} y2={CVOL.y - 18} stroke={PAL.line} strokeOpacity={0.12 * (1 - rk)} strokeWidth={1.5} />
          <ClipRect id="cfC" x={72} y={382} w={936} h={lerp(715, 932, rk)} />
          <ClipRect id="cfV" x={72} y={CVOL.y - 10} w={936} h={CVOL.h + 12} />
          {kl > 0 && (
            <g clipPath="url(#cfC)">
              <line x1={72} x2={72 + 936 * kl} y1={yR} y2={yR} stroke={PAL.gold} strokeOpacity={0.3 * (1 - 0.6 * rk)} strokeWidth={12} />
              <line x1={72} x2={72 + 936 * kl} y1={yR} y2={yR} stroke={PAL.gold} strokeOpacity={1 - 0.6 * rk} strokeWidth={3} />
            </g>
          )}
          <Candles c={c} bars={CONF} g={g} op={op} glow={(i) => (isSol(i) ? 1 : 0)} clip="cfC" />
          {rk < 1 && <Volume c={c} y={CVOL.y} h={CVOL.h} vmax={CVOL.vmax} bars={CONF} g={(i) => Math.min(g(i), out3((f - S("volC") - i * 0.8) / 10))} op={() => 1 - rk} hl={(i) => (i === 13 || i >= 17 ? ramp(f, S("volOk"), 10) : 0)} clip="cfV" />}
          {s2 > 0 && <line x1={sx} x2={sx + (990 - sx) * s2} y1={yBody} y2={yBody} stroke={PAL.warn} strokeWidth={3} />}
          {s1 > 0 && <line x1={sx} x2={sx + (990 - sx) * s1} y1={yLow} y2={yLow} stroke={PAL.warn} strokeWidth={3} strokeDasharray="12 8" />}
          {svg}
        </Svg>
        <Label x={t3[0]} y={t3[1] - 66} ax={0.5} ay={1} lines={[{ t: T.chase, color: "warn" }]} tone="warn" a={kx} f={f} />
        <Label x={110} y={yR - 14} ay={1} lines={[{ t: T.res, size: 34, color: "gold" }]} tone="gold" a={win(f, S("resLine") + 6, risk)} f={f} />
        <Label x={cx(c, 13)} y={cy(c, CONF[13].h) - 14} ax={0.5} ay={1} lines={[{ t: T.brk, color: "gold" }]} tone="gold" a={win(f, S("brk") + 8, risk)} f={f} />
        <Label x={ph[0]} y={ph[1] + 30} ax={0.5} lines={[{ t: T.hold, color: "cyan" }]} tone="cyan" a={win(f, S("hold"), risk)} f={f} />
        <Label x={110} y={CVOL.y - 6} lines={[{ t: T.volOk, size: 34, color: "gold" }]} tone="gold" a={win(f, S("volOk") + 4, risk)} f={f} />
        <Label x={990} y={yBody - 12} ax={1} ay={1} lines={[{ t: T.stopTag, size: 28, w: 700, color: PAL.soft }, { t: T.stopBody, color: "warn" }]} tone="warn" a={s2 * (1 - stat)} f={f} />
        <Label x={990} y={yLow + 12} ax={1} lines={[{ t: T.stopTag, size: 28, w: 700, color: PAL.soft }, { t: T.stopLow, color: "warn" }]} tone="warn" a={s1 * (1 - stat)} f={f} />
        {[0, 1, 2].map((k) => (
          <Chip key={k} x={CCHIP.x[k]} y={CCHIP.y} w={CCHIP.w} text={T.confChips[k]} state={f >= chip(k) ? 1 : 0} k={(f - chip(k)) / 10} a={chipA(k)} n={String(k + 1)} />
        ))}
      </div>
      <Statement f={f} />
    </>
  );
};

const Statement: React.FC<{ f: number }> = ({ f }) => {
  const a = ramp(f, E("prob"), 12) * (1 - ramp(f, CUT.end, XF));
  if (a <= 0) return null;
  const k2 = out3((f - E("probWord")) / 12);
  const k3 = out3((f - E("notFormula")) / 12);
  const ks = ramp(f, E("formula") + 4, 12);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", opacity: a }}>
      <div style={{ ...sans(700), fontSize: 48, color: PAL.soft }}>{T.probPre}</div>
      <div style={{ ...sans(900), fontSize: 176, color: PAL.gold, lineHeight: 1.2, opacity: k2, transform: `scale(${0.9 + 0.1 * k2})` }}>{T.prob}</div>
      <div style={{ display: "inline-flex", alignItems: "baseline", gap: 14, marginTop: 34, opacity: k3, transform: `translateY(${(1 - k3) * 20}px)` }}>
        <span style={{ ...sans(700), fontSize: 50, color: PAL.soft }}>{T.notPre}</span>
        <span style={{ position: "relative", ...sans(900), fontSize: 66, color: PAL.ink }}>
          {T.formula}
          <span style={{ position: "absolute", left: 0, top: "54%", height: 7, width: `${ks * 100}%`, background: PAL.warn, borderRadius: 4 }} />
        </span>
      </div>
    </div>
  );
};

// ================================================================= end
const END_C: Chart = { x: 300, y: 420, w: 480, h: 470, i0: 8, i1: 10, plo: 102, phi: 113.6 };
const End: React.FC<{ f: number }> = ({ f }) => {
  const e0 = CUT.end;
  const k1 = out3((f - E("e1")) / 16);
  const k2 = out3((f - E("e2")) / 16);
  const kd = ramp(f, E("disc"), 14);
  return (
    <>
      <Svg>
        <line x1={220} x2={860} y1={END_C.y + END_C.h + 10} y2={END_C.y + END_C.h + 10} stroke="#cfe0ff" strokeOpacity={0.14} strokeWidth={2} />
        <Candles c={END_C} bars={STRONG} g={(i) => out3((f - e0 - 2 - (i - 8) * 6) / 10)} glow={() => 1} />
      </Svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1000, textAlign: "center" }}>
        <div style={{ ...serif(900), fontSize: 120, color: PAL.ink, opacity: k1, transform: `translateY(${(1 - k1) * 26}px)`, letterSpacing: 4 }}>{T.end1}</div>
        <div style={{ ...serif(900), fontSize: 120, color: PAL.gold, opacity: k2, transform: `translateY(${(1 - k2) * 26}px)`, letterSpacing: 4, marginTop: 18 }}>{T.end2}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1420, display: "flex", justifyContent: "center", opacity: kd }}>
        <div style={{ ...sans(700), fontSize: 34, lineHeight: 1.5, color: PAL.soft, padding: "14px 36px", border: "2px solid rgba(185,196,211,0.35)", borderRadius: 32, letterSpacing: 2, textAlign: "center" }}>
          <div>{T.disc}</div>
          <div style={{ color: PAL.gold }}>{T.risk}</div>
        </div>
      </div>
    </>
  );
};

// ================================================================= film
const HEADERS: [number, string[]][] = [
  [CUT.def, T.h1],
  [CUT.weak, T.h2],
  [CUT.pos, T.h3],
  [CUT.conf, T.h4],
  [CUT.risk, T.h5],
];
const Headers: React.FC<{ f: number }> = ({ f }) => (
  <>
    {HEADERS.map(([a, [n, t]], k) => {
      const b = k + 1 < HEADERS.length ? HEADERS[k + 1][0] : CUT.end;
      const a0 = k === 0 ? a + XF : a; // the hook title has gone before the first header arrives
      return <Header key={n} n={n} title={t} a={win(f, a0, b, XF, 6)} f={f} from={a0} />;
    })}
  </>
);

const Scene: React.FC<{ f: number; a: number; b: number; children: (f: number) => React.ReactNode }> = ({ f, a, b, children }) => {
  // the first scene is fully visible from frame 0 (no fade-in)
  const o = Math.min(a === 0 ? 1 : clamp01((f - a) / XF), clamp01((b + XF - f) / XF));
  if (o <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{children(f)}</div>;
};

export const HongSanBingFilm: React.FC<{ muted?: boolean }> = ({ muted = false }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Page>
        <Background />
        <Scene f={f} a={0} b={CUT.def}>{(x) => <Hook f={x} />}</Scene>
        <Scene f={f} a={CUT.def} b={CUT.pos}>{(x) => <DefWeak f={x} />}</Scene>
        <Scene f={f} a={CUT.pos} b={CUT.conf}>{(x) => <Pos f={x} />}</Scene>
        <Scene f={f} a={CUT.conf} b={CUT.end}>{(x) => <ConfRisk f={x} />}</Scene>
        <Scene f={f} a={CUT.end} b={FRAMES + 99}>{(x) => <End f={x} />}</Scene>
        <Headers f={f} />
        <Captions f={f} />
        <Corner text={T.tag} risk={T.risk} />
      </Page>
      {!muted && <Audio src={staticFile("hongsanbing/mix.wav")} />}
    </AbsoluteFill>
  );
};

/** Cover: the textbook soldiers on the tilted stage, the title, the doubt. */
export const HongSanBingCover: React.FC = () => {
  const f = E("hope") + 20;
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Page>
        <Background />
        <Hook f={f} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1330, textAlign: "center" }}>
          <div style={{ ...sans(700), fontSize: 34, color: PAL.gold, letterSpacing: 8 }}>{T.coverTag}</div>
        </div>
        <Corner text={T.tag} risk={T.risk} />
      </Page>
    </AbsoluteFill>
  );
};
