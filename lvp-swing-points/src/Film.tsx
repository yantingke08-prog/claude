import React, { useMemo } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "./Captions";
import { Background, Badge, Disclaimer, TimeProvider } from "./kit";
import { SCENES } from "./scenes";
import { FONT, FONT_FAMILY } from "./theme.ts";
import { VO_AUDIO, buildTimeline, type Timeline } from "./timeline.ts";

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
        <Captions units={tl.units} />
      </AbsoluteFill>
      {hasAudio && <Audio src={staticFile(VO_AUDIO)} />}
    </AbsoluteFill>
  );
};
