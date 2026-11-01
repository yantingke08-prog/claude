import { Line } from "@react-three/drei";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../../components/Hud";
import { CameraRig, Stage } from "../../components/Stage";
import { MONO, zh } from "../../lib/fonts";
import { SceneShell } from "../components/SceneShell";
import { appear, fadeOut, Formula, GREEN, RED } from "../components/Charts";
import { STRATEGY_A, STRATEGY_B } from "../sim.ts";
import { SCRIPT } from "../timeline.ts";
import { GlassCard, Label, makeCamera, projector, span, StudioLights, v, type Shot } from "../three/common";
import { Tray, trayAnchors, type TrayParams } from "../three/Trays";
import { World } from "../three/World";

const UI = SCRIPT.ui;
const PA: TrayParams = { p: STRATEGY_A.pWin, win: STRATEGY_A.win, loss: STRATEGY_A.loss };
const PB: TrayParams = { p: STRATEGY_B.pWin, win: STRATEGY_B.win, loss: STRATEGY_B.loss };
const XA = -3.2;
const XB = 3.2;
const POS_A: [number, number, number] = [XA, 0, 0];
const POS_B: [number, number, number] = [XB, 0, 0];
const SPACE_IN = 330;
const SPACE_OUT = 1250;

// ---------------- timing ----------------

const popA = (f: number) => span(f, 345, 440);
const sortA = (f: number) => span(f, 455, 515);
const popB = (f: number) => span(f, 590, 680);
const sortB = (f: number) => span(f, 695, 755);

// ---------------- camera ----------------

const orbit = (x: number, from: number, dir: number): Shot => (f) => {
  const a = dir * (0.95 - (f - from) * 0.0035);
  return { pos: v(x + Math.sin(a) * 8, 3.8, Math.cos(a) * 8), target: v(x, -0.1, 0), fov: 35 };
};
const SHOTS: Record<string, Shot> = {
  aIntro: () => ({ pos: v(XA - 5.5, 4.6, 6.8), target: v(XA, -0.1, 0), fov: 35 }),
  aOrbit: orbit(XA, 330, -1),
  aSide: () => ({ pos: v(XA, 0.25, 9.8), target: v(XA, -0.25, 0), fov: 35 }),
  bIntro: () => ({ pos: v(XB + 5.5, 4.6, 6.8), target: v(XB, -0.1, 0), fov: 35 }),
  bOrbit: orbit(XB, 580, 1),
  bSide: () => ({ pos: v(XB, 0.25, 9.8), target: v(XB, -0.25, 0), fov: 35 }),
  bothSide: () => ({ pos: v(0, 0.35, 17.5), target: v(0, -0.2, 0), fov: 33 }),
  aClose: () => ({ pos: v(XA - 3.6, 2.4, 5.2), target: v(XA + 0.5, -0.6, 0), fov: 38 }),
  top: () => ({ pos: v(0, 12.5, 10.5), target: v(0, -0.5, 0), fov: 38 }),
};
const camAt = makeCamera(SHOTS, [
  [SPACE_IN, "aIntro"],
  [380, "aOrbit"],
  [450, "aOrbit"],
  [520, "aSide"],
  [575, "aSide"],
  [615, "bIntro"],
  [650, "bOrbit"],
  [695, "bOrbit"],
  [762, "bSide"],
  [822, "bSide"],
  [875, "bothSide"],
  [955, "bothSide"],
  [1010, "aClose"],
  [1080, "aClose"],
  [1150, "top"],
  [1260, "top"],
]);

// ---------------- 2D motion graphics (before the space opens) ----------------

/** "Win rate" gets struck out, "expectancy" lights up. */
const NotWinRate: React.FC<{ f: number }> = ({ f }) => {
  const a = appear(f, 104);
  const strike = interpolate(f, [130, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const b = appear(f, 150);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOut(f, 196, 10), perspective: 1000 }}>
      <div style={{ display: "flex", gap: 140, alignItems: "center", ...zh(900), fontSize: 120 }}>
        <div style={{ position: "relative", opacity: a * (1 - strike * 0.6), color: "#fff", transform: `rotateY(${(1 - a) * -40}deg)` }}>
          {UI.winRate}
          <div style={{ position: "absolute", left: -10, right: -10, top: "52%", height: 10, background: RED, transform: `scaleX(${strike})`, transformOrigin: "left", boxShadow: `0 0 20px ${RED}` }} />
        </div>
        <div style={{ opacity: b, transform: `scale(${0.7 + b * 0.3}) rotateY(${(1 - b) * 40}deg)`, color: C.gold, textShadow: `0 0 40px ${C.gold}` }}>{UI.formula[0]}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- 3D ----------------

const Space: React.FC<{ f: number }> = ({ f }) => {
  const cam = camAt(f);
  const ia = trayAnchors(PA, POS_A);
  const ib = trayAnchors(PB, POS_B);
  const dimsA = span(f, 525, 545) * (1 - span(f, 950, 970));
  const dimsB = span(f, 768, 788) * (1 - span(f, 950, 970));
  const dims = (a: ReturnType<typeof trayAnchors>, o: number) =>
    o > 0.01 && (
      <>
        <Line points={a.winWidthLine.map((p) => p.toArray()) as [number, number, number][]} color="#ffffff" lineWidth={2} transparent opacity={o} />
        <Line points={a.winHeightLine.map((p) => p.toArray()) as [number, number, number][]} color="#ffffff" lineWidth={2} transparent opacity={o} />
      </>
    );
  return (
    <Stage fov={cam.fov} bloom={0.8} bloomThreshold={0.35}>
      <CameraRig position={cam.pos.toArray() as [number, number, number]} target={cam.target.toArray() as [number, number, number]} fov={cam.fov} />
      <StudioLights />
      <World groundY={-2.2} sun={[0, -1]} scale={0.6} time={f / 30} />
      <Tray params={PA} pop={popA(f)} sort={sortA(f)} position={POS_A} seed={7} plate={span(f, 335, 360)} />
      <Tray params={PB} pop={popB(f)} sort={sortB(f)} position={POS_B} seed={8} plate={span(f, 585, 610)} />
      {dims(ia, dimsA)}
      {dims(ib, dimsB)}
    </Stage>
  );
};

const Annotations: React.FC<{ f: number }> = ({ f }) => {
  const { width, height } = useVideoConfig();
  const proj = projector(camAt(f), width, height);
  const items: React.ReactNode[] = [];
  const tray = (key: string, params: TrayParams, pos: [number, number, number], name: string, popAt: number, sortEnd: number, color: string) => {
    const a = trayAnchors(params, pos);
    const t = proj(a.title);
    items.push(
      <Label key={`${key}t`} x={t.x} y={t.y} o={appear(f, popAt) * fadeOut(f, 1085)} align="center">
        <GlassCard>
          <div style={{ padding: "10px 22px", ...zh(900), fontSize: 26, color: "#fff" }}>
            {name} <span style={{ color, fontFamily: MONO.fontFamily }}>{Math.round(params.p * 100)}%</span>
            <div style={{ ...zh(500), fontSize: 16, color: C.dim, textAlign: "center" }}>{UI.hundredTrades}</div>
          </div>
        </GlassCard>
      </Label>,
    );
    const o = appear(f, sortEnd) * fadeOut(f, 1085);
    const w = proj(a.winTop);
    const l = proj(a.lossBottom);
    const wins = Math.round(params.p * 100);
    items.push(
      <Label key={`${key}w`} x={w.x} y={w.y} o={o} align="center">
        <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 24, color: GREEN }}>
          +{params.win} × {wins} = +{+(params.win * wins).toFixed(1)}
        </span>
      </Label>,
      <Label key={`${key}l`} x={l.x} y={l.y} o={o} align="center">
        <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 24, color: RED }}>
          −{params.loss} × {100 - wins} = −{+(params.loss * (100 - wins)).toFixed(1)}
        </span>
      </Label>,
    );
    // dimension call-outs in the side view: this is where the area chart comes from
    const dimO = (key === "a" ? span(f, 530, 550) : span(f, 772, 792)) * (1 - span(f, 950, 970));
    const wl = proj(a.winWidthLine[0].clone().lerp(a.winWidthLine[1], 0.5));
    const hl = proj(a.winHeightLine[1]);
    items.push(
      <Label key={`${key}dw`} x={wl.x} y={wl.y + 22} o={dimO} align="center">
        <span style={{ ...zh(500), fontSize: 20, color: "#fff" }}>
          {UI.widthIsProb} {wins}%
        </span>
      </Label>,
      <Label key={`${key}dh`} x={hl.x - 12} y={hl.y} o={dimO} align="right">
        <span style={{ ...zh(500), fontSize: 20, color: "#fff" }}>
          {UI.heightIsPayoff} +{params.win}
        </span>
      </Label>,
    );
  };
  tray("a", PA, POS_A, UI.traderA, 340, 520, C.steel);
  tray("b", PB, POS_B, UI.traderB, 585, 765, C.gold);
  const note = proj(v(0, -3.0, 0));
  items.push(
    <Label key="note" x={note.x} y={note.y} o={span(f, 880, 900) * (1 - span(f, 945, 960))} align="center">
      <span style={{ ...zh(500), fontSize: 24, color: C.dim }}>{UI.sideViewNote}</span>
    </Label>,
  );
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{items}</AbsoluteFill>;
};

export const Expectancy3D: React.FC = () => {
  const f = useCurrentFrame();
  const fShow = interpolate(f, [210, 300], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dock = appear(f, 330, 26);
  const onB = f >= 580;
  const values = f < 335 ? undefined : onB ? PB : PA;
  const numbers = onB ? appear(f, 590) : appear(f, 345);
  const result = onB ? appear(f, 780, 14) : appear(f, 535, 14);
  const final = appear(f, 1085, 24);
  const spaceO = appear(f, SPACE_IN, 24) * fadeOut(f, SPACE_OUT, 12);
  return (
    <SceneShell id="expectancy">
      {f < 210 && <NotWinRate f={f} />}
      {f >= SPACE_IN - 2 && (
        <AbsoluteFill style={{ opacity: spaceO }}>
          <Space f={f} />
          <Annotations f={f} />
        </AbsoluteFill>
      )}
      {f >= 205 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: interpolate(dock, [0, 1], [430, 120]),
            display: "flex",
            justifyContent: "center",
            opacity: 1 - final * 0.85,
            transform: `scale(${interpolate(dock, [0, 1], [1, 0.72])})`,
          }}
        >
          <GlassCard rx={dock * 8}>
            <div style={{ padding: "26px 46px" }}>
              <Formula show={fShow} values={values} numbers={values ? numbers : 0} result={result} size={60} />
            </div>
          </GlassCard>
        </div>
      )}
      {final > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <GlassCard tint="63,242,164" rx={(1 - final) * 30}>
            <div style={{ ...zh(900), fontSize: 130, color: GREEN, opacity: final, padding: "16px 80px", textShadow: `0 0 50px ${GREEN}` }}>{UI.formula[0]} &gt; 0</div>
          </GlassCard>
        </AbsoluteFill>
      )}
    </SceneShell>
  );
};
