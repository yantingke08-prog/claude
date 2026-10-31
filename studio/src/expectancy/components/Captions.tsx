import { interpolate, useCurrentFrame } from "remotion";
import { C } from "../../components/Hud";
import { zh } from "../../lib/fonts";
import { segments } from "../text.ts";
import { t, type Scene } from "../timeline.ts";

/** Burned-in subtitles. They carry the narration, so they get real typographic care. */
export const Captions: React.FC<{ captions: Scene["captions"]; accent?: string }> = ({ captions, accent = C.cyan }) => {
  const frame = useCurrentFrame();
  const cap = captions.find((c) => frame >= c.from && frame < c.to);
  if (!cap) return null;
  const local = frame - cap.from;
  const o = interpolate(local, [0, 8], [0, 1], { extrapolateRight: "clamp" }) * interpolate(frame, [cap.to - 6, cap.to], [1, 0], { extrapolateLeft: "clamp" });
  const y = interpolate(local, [0, 10], [14, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 74,
        display: "flex",
        justifyContent: "center",
        opacity: o,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          ...zh(500),
          fontSize: 42,
          lineHeight: 1.35,
          color: "#f4f7ff",
          padding: "14px 34px",
          borderRadius: 14,
          background: "rgba(4,6,16,0.62)",
          border: "1px solid rgba(140,180,255,0.14)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          maxWidth: 1500,
          textAlign: "center",
          letterSpacing: 1,
        }}
      >
        {segments(t(cap.text)).map((s, i) => (
          <span key={i} style={s.hi ? { color: accent, fontWeight: 900, textShadow: `0 0 18px ${accent}66` } : undefined}>
            {s.text}
          </span>
        ))}
      </div>
    </div>
  );
};
