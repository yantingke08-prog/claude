import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { MONO } from "../lib/fonts";

export const C = {
  bg: "#03040b",
  cyan: "#5ce8ff",
  violet: "#7b5cff",
  magenta: "#ff4fd8",
  amber: "#ffb547",
  gold: "#f2c46d",
  steel: "#86b7dc",
  text: "#e9f1ff",
  dim: "rgba(200,215,255,0.55)",
  line: "rgba(140,180,255,0.22)",
};

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\";
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Deterministic "decoding" text: revealed characters settle, the rest flicker by frame. */
export const scramble = (text: string, progress: number, frame: number) => {
  const reveal = Math.floor(progress * text.length);
  return text
    .split("")
    .map((ch, i) => {
      if (i < reveal || ch === " " || ch === "·") return ch;
      if (progress <= 0) return " ";
      return GLYPHS[Math.floor(hash(i, Math.floor(frame / 2)) * GLYPHS.length)];
    })
    .join("");
};

const Bracket: React.FC<{ corner: "tl" | "tr" | "bl" | "br"; size: number; inset: number; opacity: number }> = ({
  corner,
  size,
  inset,
  opacity,
}) => {
  const top = corner[0] === "t";
  const left = corner[1] === "l";
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        opacity,
        [top ? "top" : "bottom"]: inset,
        [left ? "left" : "right"]: inset,
        [top ? "borderTop" : "borderBottom"]: `2px solid ${C.cyan}`,
        [left ? "borderLeft" : "borderRight"]: `2px solid ${C.cyan}`,
        boxShadow: `0 0 12px ${C.cyan}55`,
      }}
    />
  );
};

/** Persistent cinematic chrome over the whole reel: brackets, slate label, timecode. */
export const HudFrame: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = interpolate(frame, [4, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outP = interpolate(frame, [durationInFrames - 30, durationInFrames - 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const o = inP * outP;
  const size = interpolate(inP, [0, 1], [10, 44]);
  const inset = interpolate(inP, [0, 1], [70, 40]);
  const s = Math.floor(frame / fps);
  const tc = `00:00:${String(s).padStart(2, "0")}:${String(frame % fps).padStart(2, "0")}`;
  const mono: React.CSSProperties = {
    fontFamily: MONO.fontFamily,
    fontSize: 15,
    letterSpacing: 3,
    color: C.dim,
    position: "absolute",
    opacity: o,
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <Bracket key={c} corner={c} size={size} inset={inset} opacity={o * 0.9} />
      ))}
      <div style={{ ...mono, top: 52, left: 100 }}>
        <span style={{ color: C.cyan }}>●</span>&nbsp;&nbsp;{scramble(label, inP, frame)}
      </div>
      <div style={{ ...mono, top: 52, right: 100 }}>{tc}</div>
      <div style={{ ...mono, bottom: 52, left: 100 }}>
        1920×1080 · {fps}FPS · FRAME {String(frame).padStart(4, "0")}
      </div>
      <div style={{ ...mono, bottom: 52, right: 100 }}>
        <span style={{ color: frame % 30 < 18 ? "#ff4a5c" : "transparent" }}>●</span>&nbsp;REC
      </div>
    </AbsoluteFill>
  );
};

/** White-hot bloom flash + expanding shockwave ring, centred on screen. */
export const Impact: React.FC<{ at: number; color?: string; strength?: number }> = ({ at, color = C.cyan, strength = 1 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -2 || t > 50) return null;
  const flash = interpolate(t, [-2, 0, 14], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * strength;
  const ring = interpolate(t, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringE = 1 - Math.pow(1 - ring, 3);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <AbsoluteFill
        style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${flash}) 0%, ${color}${Math.round(flash * 120).toString(16).padStart(2, "0")} 30%, transparent 70%)` }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 2400 * ringE,
          height: 2400 * ringE,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          border: `${3 + 10 * (1 - ring)}px solid ${color}`,
          opacity: (1 - ring) * 0.7 * strength,
          boxShadow: `0 0 60px ${color}, inset 0 0 60px ${color}`,
        }}
      />
    </AbsoluteFill>
  );
};
