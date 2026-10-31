import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../../components/Hud";
import { zh } from "../../lib/fonts";
import { SceneShell } from "../components/SceneShell";
import { appear, glass } from "../components/Charts";
import { cue, SCRIPT } from "../timeline.ts";

const UI = SCRIPT.ui;

export const ExpectancyOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [q1, q2] = UI.quote;
  const l1 = appear(frame, cue("outro", "ping") - 5, 26);
  const l2 = appear(frame, cue("outro", "hit") - 4, 20);
  const checks = appear(frame, 150, 24);
  const disc = appear(frame, 220, 24);
  const black = interpolate(frame, [durationInFrames - 30, durationInFrames - 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <SceneShell id="outro">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -140 }}>
        <div style={{ ...zh(300), fontSize: 76, color: C.text, opacity: l1, transform: `translateY(${(1 - l1) * 30}px)`, letterSpacing: 6 }}>{q1}</div>
        <div
          style={{
            ...zh(900),
            fontSize: 120,
            color: "#fff",
            opacity: l2,
            transform: `scale(${1.25 - l2 * 0.25})`,
            letterSpacing: 10,
            marginTop: 14,
            textShadow: `0 0 50px ${C.cyan}88`,
          }}
        >
          {q2}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 50, opacity: checks }}>
          {UI.checks.map((c, i) => (
            <div key={c} style={{ ...zh(500), fontSize: 26, color: C.cyan, border: `1px solid ${C.cyan}55`, borderRadius: 999, padding: "6px 22px", transform: `translateY(${(1 - appear(frame, 150 + i * 6)) * 20}px)` }}>
              ✓ {c}
            </div>
          ))}
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, display: "flex", justifyContent: "center", opacity: disc }}>
        <div style={{ ...glass, ...zh(500), fontSize: 24, lineHeight: 1.6, color: C.dim, padding: "18px 36px", maxWidth: 1300, textAlign: "center", borderColor: "rgba(255,181,71,0.35)" }}>
          <span style={{ color: C.amber }}>⚠ </span>
          {UI.disclaimer}
        </div>
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: black }} />
    </SceneShell>
  );
};
