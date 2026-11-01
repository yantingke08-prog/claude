import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../../components/Hud";
import { CameraRig, Stage } from "../../components/Stage";
import { zh } from "../../lib/fonts";
import { SceneShell } from "../components/SceneShell";
import { appear } from "../components/Charts";
import { LLN_TRADES } from "../sim.ts";
import { cue, SCRIPT } from "../timeline.ts";
import { GlassCard, v } from "../three/common";
import { ExpectationPlane, MeanLine, Trajectories } from "../three/LlnSpace";

const UI = SCRIPT.ui;

/** Callback to chapter 2: the finished 1000-person space, slowly orbiting behind the quote. */
const Backdrop: React.FC<{ f: number }> = ({ f }) => {
  const a = -0.9 + f * 0.0016;
  const c = v(10, 5, -4);
  const pos = v(c.x + Math.sin(a) * 30, 9 + f * 0.01, c.z + Math.cos(a) * 30);
  return (
    <Stage fov={38} bloom={1.0} bloomThreshold={0.18}>
      <CameraRig position={pos.toArray() as [number, number, number]} target={c.toArray() as [number, number, number]} fov={38} />
      <Trajectories n={LLN_TRADES} crowd={1} />
      <ExpectationPlane opacity={0.7} />
      <MeanLine n={LLN_TRADES} opacity={0.9} />
    </Stage>
  );
};

export const Outro3D: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [q1, q2] = UI.quote;
  const l1 = appear(f, cue("outro", "ping") - 5, 26);
  const l2 = appear(f, cue("outro", "hit") - 4, 20);
  const checks = appear(f, 150, 24);
  const disc = appear(f, 220, 24);
  const black = interpolate(f, [durationInFrames - 30, durationInFrames - 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <SceneShell id="outro">
      <AbsoluteFill style={{ opacity: appear(f, 0, 30) * 0.55 }}>
        <Backdrop f={f} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(3,4,11,0.55) 0%, rgba(3,4,11,0.2) 75%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -140, perspective: 1200 }}>
        <div style={{ display: "flex", ...zh(300), fontSize: 76, color: C.text, letterSpacing: 6 }}>
          {q1.split("").map((ch, i) => {
            const k = appear(f, cue("outro", "ping") - 5 + i * 2, 18);
            return (
              <span key={i} style={{ display: "inline-block", opacity: k * l1, transform: `translateY(${(1 - k) * 24}px)`, filter: `blur(${(1 - k) * 8}px)` }}>
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            ...zh(900),
            fontSize: 124,
            color: "#fff",
            opacity: l2,
            transform: `scale(${1.25 - l2 * 0.25}) rotateX(${(1 - l2) * 30}deg)`,
            letterSpacing: 10,
            marginTop: 14,
            textShadow: `0 0 50px ${C.cyan}88`,
          }}
        >
          {q2}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 50, opacity: checks }}>
          {UI.checks.map((c, i) => (
            <GlassCard key={c} style={{ transform: `translateY(${(1 - appear(f, 150 + i * 6)) * 20}px)` }}>
              <div style={{ ...zh(500), fontSize: 26, color: C.cyan, padding: "6px 22px" }}>✓ {c}</div>
            </GlassCard>
          ))}
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, display: "flex", justifyContent: "center", opacity: disc }}>
        <GlassCard tint="255,181,71">
          <div style={{ ...zh(500), fontSize: 24, lineHeight: 1.6, color: C.dim, padding: "18px 36px", maxWidth: 1300, textAlign: "center" }}>
            <span style={{ color: C.amber }}>⚠ </span>
            {UI.disclaimer}
          </div>
        </GlassCard>
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: black }} />
    </SceneShell>
  );
};
