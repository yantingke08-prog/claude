import { createContext } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../../components/Hud";
import { DISPLAY, MONO, zh } from "../../lib/fonts";
import { ease } from "../../lib/gsap";
import { SCRIPT, sceneStart, TOTAL_FRAMES, type Scene } from "../timeline.ts";

/**
 * Chapter title: arrives big and centred, holds, then docks into the top-left corner
 * where it stays as a "you are here" label for the rest of the chapter.
 */
export const ChapterCard: React.FC<{ chapter: NonNullable<Scene["chapter"]>; accent: string }> = ({ chapter, accent }) => {
  const frame = useCurrentFrame();
  // starts after most of the incoming crossfade, so it lands on a clean screen
  const inP = ease("expo.out")(interpolate(frame, [12, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const dock = ease("expo.inOut")(interpolate(frame, [64, 92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const scale = interpolate(dock, [0, 1], [1, 0.3]);
  const x = interpolate(dock, [0, 1], [960, 110]);
  const y = interpolate(dock, [0, 1], [500, 78]);
  const veil = interpolate(frame, [0, 10, 60, 92], [0, 0.55, 0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `rgba(3,4,11,${veil})` }} />
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(${-50 * (1 - dock)}%, -50%) scale(${scale})`,
          transformOrigin: "left center",
          textAlign: dock > 0.5 ? "left" : "center",
          opacity: inP,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ ...zh(500), fontSize: 40, letterSpacing: 16, color: accent, transform: `translateY(${(1 - inP) * 30}px)` }}>{chapter.index}</div>
        <div
          style={{
            ...zh(900),
            fontSize: 150,
            lineHeight: 1.1,
            color: "#fff",
            letterSpacing: 10 + (1 - inP) * 40,
            textShadow: `0 0 50px ${accent}66`,
          }}
        >
          {chapter.title}
        </div>
        <div style={{ fontFamily: DISPLAY.fontFamily, fontWeight: 300, fontSize: 30, letterSpacing: 12, color: C.dim, marginTop: 8 }}>{chapter.en}</div>
      </div>
    </AbsoluteFill>
  );
};

const CHAPTER_COLORS: Record<string, string> = {
  hook: C.text,
  expectancy: C.cyan,
  lln: C.violet,
  sizing: C.amber,
  discipline: C.magenta,
  outro: C.text,
};
export const accentOf = (id: string) => CHAPTER_COLORS[id] ?? C.cyan;

/** YouTube-style segmented progress bar across the top of the whole video. */
export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 5, display: "flex", gap: 4, opacity: 0.9 }}>
      {SCRIPT.scenes.map((s) => {
        const start = sceneStart(s.id);
        const len = s.frames - (s.id === "outro" ? 0 : SCRIPT.transition);
        const p = Math.min(1, Math.max(0, (frame - start) / len));
        return (
          <div key={s.id} style={{ flex: len, background: "rgba(255,255,255,0.1)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${p * 100}%`, background: accentOf(s.id), boxShadow: `0 0 10px ${accentOf(s.id)}` }} />
          </div>
        );
      })}
    </div>
  );
};

/** Small "simulated data" stamp: the honesty label every chart carries. */
export const SimTag: React.FC<{ label: string; style?: React.CSSProperties }> = ({ label, style }) => (
  <div style={{ fontFamily: MONO.fontFamily, fontSize: 14, letterSpacing: 3, color: C.dim, ...style }}>
    <span style={{ ...zh(500), letterSpacing: 2 }}>{label}</span> · SEEDED MONTE CARLO
  </div>
);

export const totalFrames = TOTAL_FRAMES;

/** Review mode: hides captions, chapter cards and decorative backgrounds so only the subject remains. */
export const CleanContext = createContext(false);
