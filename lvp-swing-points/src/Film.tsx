import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "./Captions";
import { Background, Badge, Disclaimer, TimeProvider } from "./kit";
import { SCENES } from "./scenes";
import { FONT, FONT_FAMILY } from "./theme.ts";
import { END_HOLD, VO_AUDIO, buildTimeline, type Timeline } from "./timeline.ts";

export type FilmProps = { timeline: Timeline | null; hasAudio: boolean; broll: Record<string, boolean> };

// Embedded Chinese font (Noto Sans SC, OFL) so renders never fall back or miss glyphs.
if (typeof document !== "undefined") {
  const handle = delayRender("Loading Noto Sans SC");
  const face = new FontFace(FONT_FAMILY, `url(${staticFile("fonts/NotoSansSC-VF.ttf")}) format("truetype")`, { weight: "100 900" });
  face
    .load()
    .then((f) => {
      (document.fonts as unknown as Set<FontFace>).add(f);
      continueRender(handle);
    })
    .catch((e) => {
      console.error("[font] Noto Sans SC failed to load", e);
      continueRender(handle);
    });
}

const DISSOLVE = 9; // frames (0.3 s) between sections
const HARD_CUT_INTO = new Set(["title"]); // the title card comes in on its own red band wipe

export const Film: React.FC<FilmProps> = ({ timeline, hasAudio, broll }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tl = useMemo(() => timeline ?? buildTimeline(null, null), [timeline]);
  const t = frame / fps;
  const current = tl.shots.find((s) => t >= s.start && t < s.end)?.id;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background />
      {tl.shots.map((s, k) => {
        const a = Math.round(s.start * fps);
        const next = tl.shots[k + 1];
        const tail = next && !HARD_CUT_INTO.has(next.id) ? DISSOLVE : 0;
        const b = next ? Math.round(next.start * fps) + tail : durationInFrames + 1;
        if (frame < a || frame >= b) return null;
        const Scene = SCENES[s.id];
        const fadeIn = k > 0 && !HARD_CUT_INTO.has(s.id);
        const opacity = fadeIn ? Math.min(1, (frame - a) / DISSOLVE) : 1;
        return (
          <AbsoluteFill key={k} style={{ opacity, zIndex: k + 1 }}>
            <TimeProvider value={{ t, tl, shotStart: s.start, shotEnd: s.end }}>
              <Scene broll={broll} />
            </TimeProvider>
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{ zIndex: 100, pointerEvents: "none" }}>
        {current !== "title" && current !== "outro" && <Badge />}
        <Disclaimer />
        {current !== "title" && <Captions units={tl.units} />}
      </AbsoluteFill>
      {/* the end: fade to black right after the last word */}
      <AbsoluteFill style={{ zIndex: 300, background: "black", opacity: interpolate(t, [tl.speechEnd + END_HOLD, tl.duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      {hasAudio && <Voice tl={tl} />}
    </AbsoluteFill>
  );
};

/** The raw voiceover, laid in segments (a pause for the title card is cut inside existing silence).
 * Each cut gets a 3-frame volume ramp so no click can be heard; the voice fades with the picture. */
const Voice: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const { fps } = useVideoConfig();
  const RAMP = 3;
  return (
    <>
      {tl.audio.segments.map((s, k) => {
        const len = Math.max(1, Math.round((Math.min(s.to, s.from + tl.duration - s.at) - s.from) * fps));
        const atF = Math.round(s.at * fps);
        const endFadeA = Math.round((tl.speechEnd + END_HOLD) * fps) - atF;
        const endFadeB = Math.round(tl.duration * fps) - atF;
        return (
          <Sequence key={k} from={atF} durationInFrames={len} layout="none">
            <Audio
              src={staticFile(VO_AUDIO)}
              trimBefore={Math.round(s.from * fps)}
              volume={(f) => {
                const inRamp = s.from > 0 ? Math.min(1, f / RAMP) : 1;
                const outRamp = k < tl.audio.segments.length - 1 ? Math.min(1, (len - f) / RAMP) : 1;
                const end = interpolate(f, [endFadeA, Math.max(endFadeA + 1, endFadeB)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return Math.max(0, Math.min(inRamp, outRamp, end));
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};
