import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../../components/Hud";
import { CameraRig, Stage } from "../../components/Stage";
import { DISPLAY, MONO, zh } from "../../lib/fonts";
import { ease } from "../../lib/gsap";
import { SceneShell } from "../components/SceneShell";
import { appear, fadeOut, Formula, GREEN, RED } from "../components/Charts";
import { STRATEGY_B } from "../sim.ts";
import { cue, scene, SCRIPT } from "../timeline.ts";
import { Bracket, GlassCard, Label, makeCamera, projector, StudioLights, v, ValueChip, type Shot } from "../three/common";
import { energyMaterial, setEnergy, unitColumn } from "../three/Energy";
import { Tray, trayAnchors, TRAY_W, type TrayParams } from "../three/Trays";
import { World } from "../three/World";

const UI = SCRIPT.ui;
const PB: TrayParams = { p: STRATEGY_B.pWin, win: STRATEGY_B.win, loss: STRATEGY_B.loss };
const POS: [number, number, number] = [0, 0, 0];
const CHECKS_AT = [1050, 1070, 1090, 1110];
const DOUBLE = [1, 2, 4, 8, 16];
const PIT_X = 7;
// columns stretched further than in chapter 1, so the leaks read at a glance
const KH_D = 0.6;
const WIN_AT = cue("discipline", "pop");
const LOSS_AT = cue("discipline", "pop", WIN_AT + 1);
const FLIP_AT = cue("discipline", "hit", 600);
const LEAKS_OUT = 612;
const KINETIC_AT = scene("discipline").cues.filter((c) => c.type === "hit" && c.at! > 770).map((c) => c.at!);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** The two leaks, then (from 905) discipline restoring the original numbers. */
const valuesAt = (f: number) => {
  const restore = ease("expo.inOut")(interpolate(f, [905, 965], [0, 1], clamp));
  const win = interpolate(f, [350, 425], [PB.win, 1], { ...clamp, easing: ease("power2.inOut") });
  const loss = interpolate(f, [490, 565], [PB.loss, 2], { ...clamp, easing: ease("power2.inOut") });
  return { p: PB.p, win: win + (PB.win - win) * restore, loss: loss + (PB.loss - loss) * restore };
};

// ---------------- camera ----------------

const SHOTS: Record<string, Shot> = {
  hero: (f) => {
    const a = 0.7 + f * 0.002;
    return { pos: v(Math.sin(a) * 8.5, 4.4, Math.cos(a) * 8.5), target: v(0, -0.2, 0), fov: 36 };
  },
  winClose: () => ({ pos: v(-4.2, 3.4, 4.6), target: v(-1.2, 0.4, 0), fov: 36 }),
  // under the glass plate, looking up at the shafts as they dig deeper
  under: () => ({ pos: v(4.8, -4.4, 5.8), target: v(1.0, -0.9, 0), fov: 38 }),
  side: () => ({ pos: v(0, 0.2, 10.5), target: v(0, -0.3, 0), fov: 36 }),
  pits: () => ({ pos: v(PIT_X - 1, 3.2, 6.5), target: v(PIT_X + 0.5, -1.2, 0), fov: 40 }),
  pitsDown: () => ({ pos: v(PIT_X + 0.4, 4.6, 3.6), target: v(PIT_X + 1.2, -3.4, 0), fov: 44 }),
  rise: () => ({ pos: v(-2.5, 7.5, 8.5), target: v(0, -0.3, 0), fov: 36 }),
};
const camAt = makeCamera(SHOTS, [
  [100, "hero"],
  [330, "hero"],
  [375, "winClose"],
  [470, "winClose"],
  [520, "under"],
  [610, "under"],
  [665, "side"],
  [762, "side"],
  [800, "pits"],
  [860, "pitsDown"],
  [905, "pitsDown"],
  [975, "rise"],
  [1200, "rise"],
]);

// ---------------- 3D ----------------

const PIT_GEO = unitColumn();
const PIT_MATS = DOUBLE.map(() => energyMaterial("#ff4d6d", false));

const Pits: React.FC<{ f: number }> = ({ f }) => (
  <group position={[PIT_X, 0, 0]}>
    {DOUBLE.map((s, i) => {
      const k = ease("elastic.out(1, 0.6)")(Math.min(1, Math.max(0, (f - 785 - i * 16) / 18)));
      const d = s * 0.28 * k;
      if (d <= 0.001) return null;
      // deeper pits burn a little hotter
      setEnergy(PIT_MATS[i], 0.8 + i * 0.12, f / 30);
      return <mesh key={s} geometry={PIT_GEO} material={PIT_MATS[i]} position={[i * 0.75, -d, 0]} scale={[0.55, d, 0.55]} />;
    })}
    <mesh position={[1.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.6, 1.6]} />
      <meshBasicMaterial color="#9fc2ff" transparent opacity={0.07} depthWrite={false} />
    </mesh>
  </group>
);

// dimension lines beside the middle of the green block's left side and the red block's right
// side: in frame from the close-ups (front-left, below-right) and from the side view alike
const WIN_EDGE = v(-TRAY_W / 2 - 0.2, 0, 0);
const LOSS_EDGE = v(TRAY_W / 2 + 0.2, 0, 0);
// the win measure steps aside while the camera is under the plate with the losses
const winMeasure = (f: number) => appear(f, WIN_AT, 16) * fadeOut(f, LOSS_AT - 10, 12) + appear(f, 650, 14) * fadeOut(f, 762, 12);
const lossMeasure = (f: number) => appear(f, LOSS_AT, 16) * fadeOut(f, 762, 12);

const Space: React.FC<{ f: number }> = ({ f }) => {
  const cam = camAt(f);
  const val = valuesAt(f);
  const pitsOn = f >= 770 && f < 920;
  return (
    <Stage fov={cam.fov} bloom={0.8} bloomThreshold={0.35}>
      <CameraRig position={cam.pos.toArray() as [number, number, number]} target={cam.target.toArray() as [number, number, number]} fov={cam.fov} />
      <StudioLights />
      <World center={[2, 0, 0]} groundY={-5} sun={[0.2, -1]} scale={0.6} time={f / 30} />
      <Tray params={PB} win={val.win} loss={val.loss} pop={1} sort={1} position={POS} seed={8} dim={pitsOn ? 0.6 : 0} kh={KH_D} />
      <Bracket base={WIN_EDGE} tip={WIN_EDGE.clone().setY(val.win * KH_D)} tick={v(0.13, 0, 0)} k={winMeasure(f)} color={GREEN} width={3} />
      <Bracket base={LOSS_EDGE} tip={LOSS_EDGE.clone().setY(-val.loss * KH_D)} tick={v(0.13, 0, 0)} k={lossMeasure(f)} color={RED} width={3.5} />
      {pitsOn && <Pits f={f} />}
    </Stage>
  );
};

// ---------------- 2D layers ----------------

const Annotations: React.FC<{ f: number }> = ({ f }) => {
  const { width, height } = useVideoConfig();
  const proj = projector(camAt(f), width, height);
  const val = valuesAt(f);
  const a = trayAnchors(PB, POS, val.win, val.loss, KH_D);
  const out: React.ReactNode[] = [];
  const o = appear(f, 230) * fadeOut(f, 770) + appear(f, 920) * fadeOut(f, 1040);
  const w = proj(a.winTop);
  const l = proj(a.lossBottom);
  out.push(
    <Label key="w" x={w.x} y={w.y} o={o} align="center">
      <ValueChip color={GREEN}>
        +{val.win.toFixed(1)} × 40 = +{(val.win * 40).toFixed(0)}
      </ValueChip>
    </Label>,
    <Label key="l" x={l.x} y={l.y} o={o} align="center">
      <ValueChip color={RED}>
        −{val.loss.toFixed(1)} × 60 = −{(val.loss * 60).toFixed(0)}
      </ValueChip>
    </Label>,
  );
  // labels on the dimension lines: the measured height, live
  const wm = proj(WIN_EDGE.clone().setY((val.win * KH_D) / 2).add(v(-0.15, 0, 0)));
  const lm = proj(LOSS_EDGE.clone().setY((-val.loss * KH_D) / 2).add(v(0.15, 0, 0)));
  out.push(
    <Label key="wm" x={wm.x - 14} y={wm.y} o={winMeasure(f)} align="right">
      <ValueChip color={GREEN} size={28}>
        <span style={{ ...zh(700), color: "#fff", fontSize: 22 }}>{UI.avgWin}</span>
        {val.win.toFixed(1)}
      </ValueChip>
    </Label>,
    <Label key="lm" x={lm.x + 14} y={lm.y} o={lossMeasure(f)} align="left">
      <div style={{ transform: `scale(${1 + 0.12 * Math.max(0, Math.sin((f - LOSS_AT) * 0.25)) * (f < 570 ? 1 : 0)})`, transformOrigin: "left center" }}>
        <ValueChip color={RED} size={34}>
          <span style={{ ...zh(900), color: "#fff", fontSize: 28 }}>{UI.holdLosers}</span>
          {val.loss.toFixed(1)}
        </ValueChip>
      </div>
    </Label>,
  );
  if (f >= 770 && f < 920) {
    DOUBLE.forEach((s, i) => {
      const p = proj(v(PIT_X + i * 0.75, 0.35, 0.4));
      out.push(
        <Label key={`d${s}`} x={p.x} y={p.y} o={appear(f, 785 + i * 16, 10) * fadeOut(f, 895)} align="center">
          <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 26, color: i === 4 ? RED : "#fff" }}>×{s}</span>
        </Label>,
      );
    });
  }
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{out}</AbsoluteFill>;
};

/** Doubling down, as shouted words that slam in on each hit and shake the frame. */
const KINETIC_POS = [
  { x: 0.27, y: 0.3, rot: -7, size: 110, color: "#fff" },
  { x: 0.74, y: 0.42, rot: 6, size: 124, color: "#fff" },
  { x: 0.5, y: 0.7, rot: -3, size: 168, color: RED },
];
const Kinetic: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {UI.kinetic.map((w, i) => {
      const at = KINETIC_AT[i];
      if (f < at - 4) return null;
      const k = ease("expo.out")(Math.min(1, Math.max(0, (f - at + 4) / 8)));
      const age = f - at;
      const shake = age >= 0 && age < 10 ? (1 - age / 10) * 10 : 0;
      const p = KINETIC_POS[i];
      return (
        <div
          key={w}
          style={{
            position: "absolute",
            left: p.x * 1920,
            top: p.y * 1080,
            transform: `translate(-50%,-50%) translate(${Math.sin(age * 7.1) * shake}px, ${Math.cos(age * 8.3) * shake}px) rotate(${p.rot}deg) scale(${2.2 - 1.2 * k})`,
            opacity: k * fadeOut(f, 895, 12),
            filter: `blur(${(1 - k) * 10}px)`,
            ...zh(900),
            fontSize: p.size,
            color: p.color,
            letterSpacing: 6,
            whiteSpace: "nowrap",
            WebkitTextStroke: p.color === RED ? undefined : `2px ${RED}`,
            textShadow: `0 0 40px ${RED}, 0 8px 30px rgba(0,0,0,0.9)`,
          }}
        >
          {w}
        </div>
      );
    })}
  </AbsoluteFill>
);

const calloutNote = (title: string, detail: string, color: string, big = false) => (
  <div style={{ padding: "10px 20px", borderRadius: 12, background: "rgba(4,6,14,0.86)", border: `1.5px solid ${color}88`, boxShadow: `0 10px 30px rgba(0,0,0,0.6), 0 0 24px ${color}33`, textAlign: "center" }}>
    <div style={{ ...zh(900), fontSize: big ? 46 : 40, color }}>{title}</div>
    <div style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: big ? 64 : 28, color: big ? color : "#fff", marginTop: 4, textShadow: big ? `0 0 30px ${color}` : undefined }}>{detail}</div>
  </div>
);

const Checks: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -30 }}>
    <div style={{ display: "flex", gap: 30 }}>
      {UI.checks.map((c, i) => {
        const k = appear(f, CHECKS_AT[i], 22);
        const tick = ease("back.out(3)")(appear(f, CHECKS_AT[i] + 8, 12));
        return (
          <GlassCard key={c} rx={(1 - k) * 60} ry={(i - 1.5) * -6} style={{ opacity: k, transform: `translateY(${(1 - k) * 80}px)` }}>
            <div style={{ width: 330, height: 290, padding: 30, boxSizing: "border-box", position: "relative" }}>
              <div style={{ fontFamily: MONO.fontFamily, fontSize: 20, color: C.gold, letterSpacing: 3 }}>0{i + 1}</div>
              <div style={{ ...zh(900), fontSize: 50, color: "#fff", marginTop: 44 }}>{c}</div>
              <div style={{ fontFamily: DISPLAY.fontFamily, fontWeight: 300, fontSize: 16, letterSpacing: 4, color: C.dim, marginTop: 10 }}>{UI.checksEn[i]}</div>
              <div
                style={{
                  position: "absolute",
                  right: 26,
                  top: 22,
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  background: GREEN,
                  color: "#032",
                  fontSize: 34,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${tick})`,
                  boxShadow: `0 0 24px ${GREEN}`,
                }}
              >
                ✓
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  </AbsoluteFill>
);

export const Discipline3D: React.FC = () => {
  const f = useCurrentFrame();
  const val = valuesAt(f);
  const highlight: ("win" | "loss")[] = [];
  if (f >= 335 && f < 615) highlight.push("win");
  if (f >= 475 && f < 615) highlight.push("loss");
  const spaceO = appear(f, 100, 26) * (1 - appear(f, 1040, 20) * 0.75);
  const blur = appear(f, 1040, 20) * 8;
  const flash = f >= FLIP_AT && f < FLIP_AT + 20 ? 1 - (f - FLIP_AT) / 20 : 0;
  const pulse = f >= FLIP_AT ? Math.exp(-(f - FLIP_AT) / 9) : 0;
  const shake = f >= FLIP_AT && f < FLIP_AT + 12 ? (1 - (f - FLIP_AT) / 12) * 9 : 0;
  // the leaks point at the exact numbers they change; then the result is called out
  const callouts = {
    win: { k: appear(f, WIN_AT, 14) * fadeOut(f, LEAKS_OUT, 12), color: C.amber, node: calloutNote(UI.takeProfitEarly, `${UI.avgWin} ${PB.win} → ${val.win.toFixed(1)}`, C.amber) },
    loss: { k: appear(f, LOSS_AT, 14) * fadeOut(f, LEAKS_OUT, 12), color: RED, node: calloutNote(UI.holdLosers, `${UI.avgLoss} ${PB.loss} → ${val.loss.toFixed(1)}`, RED) },
    result: { k: appear(f, FLIP_AT, 12) * fadeOut(f, 762, 12), color: RED, node: calloutNote(UI.flipNegative, "−0.8", RED, true) },
  };
  // the doubling-down pits take the top of the frame, so the formula steps aside for them
  const formulaO = appear(f, 110) * fadeOut(f, 1040, 16) * (fadeOut(f, 768, 12) + appear(f, 905, 16));
  return (
    <SceneShell id="discipline">
      <AbsoluteFill style={{ opacity: spaceO, filter: `blur(${blur}px)` }}>
        <Space f={f} />
        <Annotations f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: RED, opacity: flash * 0.16, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", justifyContent: "center", opacity: formulaO, transform: `translate(${Math.sin(f * 7.3) * shake}px, ${Math.cos(f * 9.1) * shake}px) scale(0.8)` }}>
        <GlassCard rx={8} clip={false} tint={val.p * val.win - (1 - val.p) * val.loss < 0 ? "255,77,109" : "120,170,255"}>
          <div style={{ padding: "22px 40px" }}>
            <Formula show={interpolate(f, [110, 200], [0, 1], clamp)} values={val} numbers={appear(f, 220)} result={appear(f, 300)} size={56} highlight={highlight} callouts={callouts} resultPulse={pulse} />
          </div>
        </GlassCard>
      </div>
      {f >= 770 && f < 910 && <Kinetic f={f} />}
      {f >= 1045 && <Checks f={f} />}
    </SceneShell>
  );
};
