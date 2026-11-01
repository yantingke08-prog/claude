import { useContext } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "../../components/Hud";
import { CameraRig, Stage } from "../../components/Stage";
import { MONO, zh } from "../../lib/fonts";
import { SceneShell } from "../components/SceneShell";
import { appear, fadeOut, GREEN, RED } from "../components/Charts";
import { StreakStrip, streakCell, fanStats } from "../components/CanvasCharts";
import { CleanContext } from "../components/Chrome";
import { LLN_TRADES, STRATEGY_B } from "../sim.ts";
import { GlassCard } from "../three/common";
import { World } from "../three/World";
import { ease } from "../../lib/gsap";
import { SCRIPT } from "../timeline.ts";
import {
  camAt,
  DEPTH,
  ExpectationPlane,
  FinishGate,
  Heads,
  HERO,
  HeroLine,
  heroTradeFrame,
  heroWon,
  histogramTop,
  KX,
  KY,
  MeanLine,
  pointOf,
  projector,
  tradesAt,
  Trajectories,
  ZeroPlane,
} from "../three/LlnSpace";

const UI = SCRIPT.ui;
const SPACE_IN = 300;
const SPACE_OUT = 1078;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Everything that changes over the segment, as plain numbers of the frame. */
const stateAt = (f: number) => ({
  n: tradesAt(f),
  crowd: interpolate(f, [415, 470], [0, 1], clamp),
  hero: interpolate(f, [820, 860], [1, 0.45], clamp),
  heroWidth: interpolate(f, [420, 470], [4, 2.2], clamp),
  zero: interpolate(f, [330, 360, 830, 880], [0, 1, 1, 0.45], clamp),
  ev: interpolate(f, [835, 880], [0, 1], clamp),
  mean: interpolate(f, [845, 885], [0, 1], clamp),
  settle: interpolate(f, [905, 995], [0, 1], clamp),
  gate: interpolate(f, [962, 990], [0, 1], clamp),
});

const Label: React.FC<{ x: number; y: number; o: number; children: React.ReactNode; align?: "left" | "right" | "center"; style?: React.CSSProperties }> = ({
  x,
  y,
  o,
  children,
  align = "left",
  style,
}) =>
  o <= 0.01 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: o,
        transform: `translate(${align === "left" ? "0" : align === "right" ? "-100%" : "-50%"}, -50%)`,
        whiteSpace: "nowrap",
        textShadow: "0 2px 12px rgba(0,0,0,0.9)",
        ...style,
      }}
    >
      {children}
    </div>
  );

/** Crisp HTML annotations pinned to 3D positions with the scene's exact camera. */
const Annotations: React.FC<{ f: number }> = ({ f }) => {
  const { width, height } = useVideoConfig();
  const s = stateAt(f);
  const proj = projector(camAt(f), width, height);
  const at = (p: THREE.Vector3) => proj(p);
  const out: React.ReactNode[] = [];

  // person #0 and their trade-by-trade results
  const head = at(pointOf(HERO, s.n));
  out.push(
    <Label key="hero" x={head.x + 26} y={head.y - 46} o={appear(f, 348) * fadeOut(f, 455)}>
      <span style={{ ...zh(900), fontSize: 30, color: "#ffffff" }}>{UI.oneTrader}</span>
    </Label>,
  );
  for (let i = 1; i <= 10; i++) {
    const tf = heroTradeFrame(i);
    if (f < tf || f > tf + 30) continue;
    const p = at(pointOf(HERO, i));
    const won = heroWon(i - 1);
    out.push(
      <Label key={`t${i}`} x={p.x} y={p.y + (won ? -40 : 40) - (f - tf) * 0.8} o={appear(f, tf, 6) * fadeOut(f, tf + 18, 12)} align="center">
        <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 30, color: won ? GREEN : RED }}>{won ? "+2.5" : "−1"}</span>
      </Label>,
    );
  }

  // one dot = one person (when the crowd first appears)
  const cloud = at(pointOf(420, 10));
  out.push(
    <Label key="dot" x={cloud.x + 22} y={cloud.y - 34} o={appear(f, 472) * fadeOut(f, 560)}>
      <span style={{ ...zh(500), fontSize: 26, color: C.text }}>● {UI.eachDot}</span>
    </Label>,
  );

  // break-even floor, labelled at the front edge
  const z0 = at(V(Math.max(0.12, s.n * KX * 0.55), 0, 0.25));
  out.push(
    <Label key="zero" x={z0.x} y={z0.y + 20} o={s.zero * appear(f, 450) * fadeOut(f, 840)} align="center">
      <span style={{ ...zh(500), fontSize: 22, color: RED }}>{UI.zeroPlane}</span>
    </Label>,
  );

  // trade-count ticks along the front edge, only those that make sense at this zoom
  for (const tick of [10, 100, 250, 500, 750, 1000]) {
    if (tick > s.n * 1.02 || tick < s.n / 12) continue;
    const p = at(V(tick * KX, 0, 0.3));
    if (!p.visible) continue;
    out.push(
      <Label key={`x${tick}`} x={p.x} y={p.y + 30} o={appear(f, 445) * fadeOut(f, SPACE_OUT - 8)} align="center">
        <span style={{ fontFamily: MONO.fontFamily, fontSize: 20, color: C.dim }}>
          {tick}
          <span style={{ ...zh(500), fontSize: 16 }}> {UI.trades}</span>
        </span>
      </Label>,
    );
  }

  // the expectation sheet, the finish line, the distribution
  const evMid = at(V(0.62 * LLN_TRADES * KX, 0.4 * 0.62 * LLN_TRADES * KY, 0.3));
  out.push(
    <Label key="ev" x={evMid.x - 20} y={evMid.y - 46} o={s.ev} align="right">
      <span style={{ ...zh(900), fontSize: 28, color: C.amber }}>{UI.evPlane}</span>
    </Label>,
  );
  const gate = at(V(LLN_TRADES * KX, 2.2, 0.25));
  out.push(
    <Label key="gate" x={gate.x - 24} y={gate.y} o={s.gate} align="right">
      <span style={{ ...zh(900), fontSize: 32, color: C.gold }}>{UI.finishLine}</span>
    </Label>,
  );
  const top = at(histogramTop());
  out.push(
    <Label key="hist" x={top.x} y={top.y} o={appear(f, 975, 20)} align="left">
      <span style={{ ...zh(500), fontSize: 24, color: C.text }}>{UI.distribution}</span>
    </Label>,
  );

  // y axis appears in the final, near-orthographic readout
  const yo = appear(f, 1005, 20) * fadeOut(f, SPACE_OUT - 8);
  for (const pnl of [0, 200, 400]) {
    const p = at(V(-0.25, pnl * KY, 0.3));
    out.push(
      <Label key={`y${pnl}`} x={p.x} y={p.y} o={yo} align="right">
        <span style={{ fontFamily: MONO.fontFamily, fontSize: 20, color: pnl === 0 ? RED : C.dim }}>{pnl === 0 ? "0" : `+${pnl}`}</span>
      </Label>,
    );
  }
  const yName = at(V(-0.25, 13, 0.3));
  out.push(
    <Label key="yname" x={yName.x} y={yName.y} o={yo} align="right">
      <span style={{ ...zh(500), fontSize: 22, color: C.dim }}>{UI.axisPnl}</span>
    </Label>,
  );
  const xName = at(V(10, -1.6, 0.3));
  out.push(
    <Label key="xname" x={xName.x} y={xName.y} o={yo} align="center">
      <span style={{ ...zh(500), fontSize: 22, color: C.dim }}>{UI.axisTrades} →</span>
    </Label>,
  );

  return <AbsoluteFill style={{ pointerEvents: "none" }}>{out}</AbsoluteFill>;
};

/** Screen-fixed readout: the two numbers the captions talk about, always legible. */
const Readout: React.FC<{ f: number }> = ({ f }) => {
  const n = tradesAt(f);
  const stats = fanStats(n);
  // retires once the final readout shot takes over the top-right of the frame
  const o = appear(f, 335) * fadeOut(f, 985, 20);
  return (
    <div style={{ position: "absolute", right: 110, top: 120, textAlign: "right", opacity: o }}>
      <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 72, color: "#fff", lineHeight: 1 }}>
        {Math.round(n)}
        <span style={{ ...zh(500), fontSize: 28, color: C.dim, marginLeft: 10 }}>{UI.trades}</span>
      </div>
      <div style={{ marginTop: 14, ...zh(500), fontSize: 26, color: C.dim, opacity: appear(f, 445) }}>
        {UI.losingShare}{" "}
        <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 44, color: stats.losing > 0.05 ? RED : GREEN }}>
          {`${(stats.losing * 100).toFixed(stats.losing < 0.1 ? 1 : 0)}%`}
        </span>
      </div>
    </div>
  );
};

/** The WebGL subject: 1000 trajectories, their heads, and the reference surfaces. */
const Space: React.FC<{ f: number; decor: boolean }> = ({ f, decor }) => {
  const { fps } = useVideoConfig();
  const s = stateAt(f);
  const cam = camAt(f);
  return (
    <Stage fov={cam.fov} bloom={1.0} bloomThreshold={0.18}>
      <CameraRig position={cam.pos.toArray() as [number, number, number]} target={cam.target.toArray() as [number, number, number]} fov={cam.fov} />
      {decor && <World center={[10, 0, -4]} groundY={-1.4} sun={[0.5, -1]} time={f / fps} />}
      <ZeroPlane opacity={s.zero} n={s.n} />
      <ExpectationPlane opacity={s.ev} />
      <FinishGate opacity={s.gate} />
      <Trajectories n={s.n} crowd={s.crowd} />
      <HeroLine n={s.n} opacity={s.hero} width={s.heroWidth} />
      <MeanLine n={s.n} opacity={s.mean} />
      <Heads n={s.n} crowd={s.crowd} settle={s.settle} size={2.6} />
    </Stage>
  );
};

/**
 * One trade as a physical draw: a glass slab lying in perspective, split 40% win / 60%
 * loss, and a ball that rolls, bounces and settles in the loss zone (with a real shadow).
 */
const SpatialSingleTrade: React.FC<{ f: number }> = ({ f }) => {
  const k = appear(f, 205, 22) * fadeOut(f, 312, 12);
  const W = 1100;
  const t = Math.max(0, f - 225) / 30;
  const settle = 0.71;
  const x = settle + Math.cos(t * 6.5) * Math.exp(-t * 1.7) * 0.32;
  const hop = Math.abs(Math.sin(t * 6.5)) * Math.exp(-t * 2.4) * 120;
  const landed = t > 1.7;
  const tilt = 48 - appear(f, 205, 40) * 6;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: k, perspective: 1100 }}>
      <div style={{ transform: `rotateX(${tilt}deg) translateY(40px)`, transformStyle: "preserve-3d", position: "relative" }}>
        <GlassCard>
          <div style={{ width: W, height: 220, display: "flex", padding: 22, boxSizing: "border-box", gap: 8 }}>
            <div style={{ width: `${STRATEGY_B.pWin * 100}%`, borderRadius: 12, background: `linear-gradient(180deg, ${GREEN}cc, ${GREEN}66)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 44, color: "#032" }}>
              40% · +2.5
            </div>
            <div style={{ flex: 1, borderRadius: 12, background: `linear-gradient(180deg, ${RED}cc, ${RED}66)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 44, color: "#300" }}>
              60% · −1
            </div>
          </div>
        </GlassCard>
        {/* shadow stays on the slab; the ball rises off it */}
        <div style={{ position: "absolute", left: x * W, top: 110, width: 70 - hop * 0.2, height: 70 - hop * 0.2, transform: "translate(-50%,-50%) translateZ(2px)", borderRadius: "50%", background: "rgba(0,0,0,0.55)", filter: `blur(${6 + hop * 0.08}px)` }} />
        <div
          style={{
            position: "absolute",
            left: x * W,
            top: 110,
            width: 56,
            height: 56,
            borderRadius: "50%",
            transform: `translate(-50%,-50%) translateZ(${28 + hop}px) rotateX(${-tilt}deg)`,
            background: "radial-gradient(circle at 35% 30%, #ffffff, #cfe6ff 45%, #6b86b8 100%)",
            boxShadow: `0 0 40px ${landed ? RED : C.gold}`,
          }}
        />
      </div>
      <div style={{ position: "absolute", top: 760, ...zh(900), fontSize: 64, color: RED, opacity: landed ? appear(f, 225 + 52) : 0, textShadow: `0 0 30px ${RED}` }}>−1</div>
    </AbsoluteFill>
  );
};

/**
 * One person's 1000 trades on a glass plane lying in perspective. When the streak lights
 * up, the "camera" pushes in on it (scale about the streak's own position).
 */
const SpatialStreak: React.FC<{ f: number }> = ({ f }) => {
  const W = 1250;
  const k = appear(f, 1088, 24);
  const reveal = interpolate(f, [1095, 1185], [0, 1], clamp);
  const highlight = appear(f, 1225, 20);
  const sc = streakCell(W);
  const push = ease("power3.inOut")(interpolate(f, [1215, 1290], [0, 1], clamp)) * (1 - ease("power2.inOut")(interpolate(f, [1370, 1440], [0, 1], clamp)) * 0.6);
  const tilt = 48 - ease("expo.out")(interpolate(f, [1088, 1190], [0, 1], clamp)) * 24 - push * 14;
  const ox = sc.x + sc.cell * (sc.wraps ? 0 : sc.length / 2);
  const oy = sc.y + sc.cell / 2;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: 1500, opacity: k }}>
      <div
        style={{
          transform: `translateY(${-30 + push * 60}px) rotateX(${tilt}deg) rotateZ(${-3 + push * 3}deg) scale(${1 + push * 0.9})`,
          transformOrigin: `${ox + 24}px ${oy + 24}px`,
          transformStyle: "preserve-3d",
          position: "relative",
        }}
      >
        <GlassCard>
          <div style={{ padding: 24 }}>
            <StreakStrip reveal={reveal} highlight={highlight} width={W} />
          </div>
        </GlassCard>
        {highlight > 0 && (
          <div
            style={{
              position: "absolute",
              left: ox + 24,
              top: oy + 24,
              transform: `translate(-50%, -100%) translateZ(60px) rotateX(${-tilt}deg) translateY(-30px)`,
              opacity: highlight,
              ...zh(900),
              fontSize: 40,
              color: RED,
              whiteSpace: "nowrap",
              textShadow: `0 0 20px ${RED}`,
            }}
          >
            {sc.length} {UI.streak} ↓
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Chapter 2: a single draw, the 3D trajectory space (frames 300-1078), then one person's streak. */
export const LargeNumbers3D: React.FC = () => {
  const f = useCurrentFrame();
  const clean = useContext(CleanContext);
  const spaceO = appear(f, SPACE_IN, 22) * fadeOut(f, SPACE_OUT, 12);
  return (
    <SceneShell id="lln">
      {f >= 200 && f < 330 && <SpatialSingleTrade f={f} />}
      {f >= SPACE_IN - 2 && f < SPACE_OUT + 14 && (
        <AbsoluteFill style={{ opacity: spaceO }}>
          <Space f={f} decor={!clean} />
          <Annotations f={f} />
          <Readout f={f} />
        </AbsoluteFill>
      )}
      {f >= 1085 && <SpatialStreak f={f} />}
    </SceneShell>
  );
};
