import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../../components/Hud";
import { CameraRig, Stage } from "../../components/Stage";
import { DISPLAY, MONO, zh } from "../../lib/fonts";
import { ease } from "../../lib/gsap";
import { SceneShell } from "../components/SceneShell";
import { appear, fadeOut, Formula, GREEN, RED } from "../components/Charts";
import { STRATEGY_B } from "../sim.ts";
import { cue, SCRIPT } from "../timeline.ts";
import { GlassCard, Label, makeCamera, projector, StudioLights, v, type Shot } from "../three/common";
import { KH, Tray, trayAnchors, TRAY_W, type TrayParams } from "../three/Trays";

const UI = SCRIPT.ui;
const PB: TrayParams = { p: STRATEGY_B.pWin, win: STRATEGY_B.win, loss: STRATEGY_B.loss };
const POS: [number, number, number] = [0, 0, 0];
const CHECKS_AT = [1050, 1070, 1090, 1110];
const DOUBLE = [1, 2, 4, 8, 16];
const PIT_X = 7;
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
  under: () => ({ pos: v(4.6, -4.2, 5.4), target: v(1.0, -0.6, 0), fov: 38 }),
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

const Pits: React.FC<{ f: number }> = ({ f }) => (
  <group position={[PIT_X, 0, 0]}>
    {DOUBLE.map((s, i) => {
      const k = ease("elastic.out(1, 0.6)")(Math.min(1, Math.max(0, (f - 785 - i * 16) / 18)));
      const d = s * 0.28 * k;
      if (d <= 0.001) return null;
      return (
        <mesh key={s} position={[i * 0.75, -d / 2, 0]}>
          <boxGeometry args={[0.55, d, 0.55]} />
          <meshStandardMaterial color="#ff4d6d" emissive="#a3132f" emissiveIntensity={0.4 + i * 0.15} roughness={0.35} transparent opacity={0.92} />
        </mesh>
      );
    })}
    <mesh position={[1.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4.6, 1.6]} />
      <meshBasicMaterial color="#9fc2ff" transparent opacity={0.07} depthWrite={false} />
    </mesh>
  </group>
);

const Space: React.FC<{ f: number }> = ({ f }) => {
  const cam = camAt(f);
  const val = valuesAt(f);
  const pitsOn = f >= 770 && f < 920;
  return (
    <Stage fov={cam.fov} bloom={0.8} bloomThreshold={0.35}>
      <CameraRig position={cam.pos.toArray() as [number, number, number]} target={cam.target.toArray() as [number, number, number]} fov={cam.fov} />
      <StudioLights />
      <Tray params={PB} win={val.win} loss={val.loss} pop={1} sort={1} position={POS} seed={8} dim={pitsOn ? 0.6 : 0} />
      {pitsOn && <Pits f={f} />}
    </Stage>
  );
};

// ---------------- 2D layers ----------------

const Chip: React.FC<{ text: string; k: number; color: string }> = ({ text, k, color }) =>
  k <= 0.01 ? null : (
    <div style={{ transform: `scale(${0.6 + ease("back.out(2.5)")(k) * 0.4})`, opacity: k }}>
      <GlassCard tint="255,181,71">
        <div style={{ ...zh(900), fontSize: 30, color, padding: "8px 24px" }}>{text}</div>
      </GlassCard>
    </div>
  );

const Annotations: React.FC<{ f: number }> = ({ f }) => {
  const { width, height } = useVideoConfig();
  const proj = projector(camAt(f), width, height);
  const val = valuesAt(f);
  const a = trayAnchors(PB, POS, val.win, val.loss);
  const out: React.ReactNode[] = [];
  const o = appear(f, 230) * fadeOut(f, 770) + appear(f, 920) * fadeOut(f, 1040);
  const w = proj(a.winTop);
  const l = proj(a.lossBottom);
  out.push(
    <Label key="w" x={w.x} y={w.y} o={o} align="center">
      <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 26, color: GREEN }}>
        +{val.win.toFixed(1)} × 40 = +{(val.win * 40).toFixed(0)}
      </span>
    </Label>,
    <Label key="l" x={l.x} y={l.y} o={o} align="center">
      <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 26, color: RED }}>
        −{val.loss.toFixed(1)} × 60 = −{(val.loss * 60).toFixed(0)}
      </span>
    </Label>,
  );
  const chipW = proj(v(a.winTop.x, val.win * KH + 1.4, 0));
  const chipL = proj(v(a.lossBottom.x, -val.loss * KH - 1.2, TRAY_W / 2));
  out.push(
    <div key="cw" style={{ position: "absolute", left: chipW.x, top: chipW.y, transform: "translate(-50%,-50%)" }}>
      <Chip text={UI.takeProfitEarly} k={appear(f, 340) * fadeOut(f, 468)} color={C.amber} />
    </div>,
    <div key="cl" style={{ position: "absolute", left: chipL.x, top: chipL.y, transform: "translate(-50%,-50%)" }}>
      <Chip text={UI.holdLosers} k={appear(f, 480) * fadeOut(f, 610)} color={C.amber} />
    </div>,
  );
  if (f >= 770 && f < 920) {
    const top = proj(v(PIT_X + 1.5, 1.4, 0));
    out.push(
      <div key="dd" style={{ position: "absolute", left: top.x, top: top.y, transform: "translate(-50%,-50%)" }}>
        <Chip text={UI.doubleDown} k={appear(f, 772) * fadeOut(f, 895)} color={RED} />
      </div>,
    );
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

const Checks: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -30 }}>
    <div style={{ display: "flex", gap: 30 }}>
      {UI.checks.map((c, i) => {
        const k = appear(f, CHECKS_AT[i], 22);
        const tick = ease("back.out(3)")(appear(f, CHECKS_AT[i] + 8, 12));
        return (
          <GlassCard key={c} rx={(1 - k) * 60} ry={(i - 1.5) * -6} style={{ opacity: k, transform: `translateY(${(1 - k) * 80}px)` }}>
            <div style={{ width: 330, height: 290, padding: 30, boxSizing: "border-box", position: "relative" }}>
              <div style={{ fontFamily: MONO.fontFamily, fontSize: 20, color: C.cyan, letterSpacing: 3 }}>0{i + 1}</div>
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
  const hit = cue("discipline", "hit", 600);
  const flash = f >= hit && f < hit + 20 ? 1 - (f - hit) / 20 : 0;
  // the doubling-down pits take the top of the frame, so the formula steps aside for them
  const formulaO = appear(f, 110) * fadeOut(f, 1040, 16) * (fadeOut(f, 768, 12) + appear(f, 905, 16));
  return (
    <SceneShell id="discipline">
      <AbsoluteFill style={{ opacity: spaceO, filter: `blur(${blur}px)` }}>
        <Space f={f} />
        <Annotations f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: RED, opacity: flash * 0.16, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", justifyContent: "center", opacity: formulaO, transform: "scale(0.8)" }}>
        <GlassCard rx={8} tint={val.p * val.win - (1 - val.p) * val.loss < 0 ? "255,77,109" : "120,170,255"}>
          <div style={{ padding: "22px 40px" }}>
            <Formula show={interpolate(f, [110, 200], [0, 1], clamp)} values={val} numbers={appear(f, 220)} result={appear(f, 300)} size={56} highlight={highlight} />
          </div>
        </GlassCard>
      </div>
      {f >= 1045 && <Checks f={f} />}
    </SceneShell>
  );
};
