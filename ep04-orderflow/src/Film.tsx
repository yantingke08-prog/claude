import React, { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { VO_AUDIO } from "./audioContract";
import { Captions } from "./Captions";
import { Backdrop, C, FONT, ShotProvider, SAFE, makeShotCtx } from "./kit";
import { SCENES } from "./scenes";
import { SCRIPT } from "./script";
import { buildTimeline, type Timeline } from "./timelineCore";

export type FilmProps = { timeline: Timeline | null; hasAudio: boolean };

const FADE_IN = 10; // frames: incoming shot fades over the outgoing one (no black frames)
const LEAD = 3; // incoming shot starts this many frames before its anchor so it is fully there on the word

export const Film: React.FC<FilmProps> = ({ timeline, hasAudio }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tl = useMemo(() => timeline ?? buildTimeline(SCRIPT, null, null), [timeline]);
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ background: C.bg0, fontFamily: FONT }}>
      <Backdrop />
      {tl.shots.map((s, k) => {
        const a = Math.round(s.start * fps) - (k ? LEAD : 0);
        const next = tl.shots[k + 1];
        const b = next ? Math.round(next.start * fps) - LEAD + FADE_IN : Math.ceil(tl.duration * fps) + 1;
        if (frame < a || frame >= b) return null;
        const Scene = SCENES[s.id];
        if (!Scene) return null;
        const opacity = k === 0 ? 1 : Math.min(1, (frame - a) / FADE_IN);
        const units = s.units.map((i) => tl.units[i]);
        return (
          <AbsoluteFill key={k} style={{ opacity, zIndex: k }}>
            <ShotProvider value={makeShotCtx(units, s.start, s.end - s.start, t - s.start)}>
              <Scene />
            </ShotProvider>
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{ zIndex: 100, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            top: SAFE.top - 6,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 2,
            color: C.dim,
          }}
        >
          {SCRIPT.title}
        </div>
        <div style={{ position: "absolute", right: 40, top: SAFE.top - 6, fontSize: 28, fontWeight: 600, letterSpacing: 2, color: C.dim }}>示意图 · 模拟数据</div>
        <Captions units={tl.units} />
      </AbsoluteFill>
      {hasAudio && <Audio src={staticFile(VO_AUDIO)} />}
    </AbsoluteFill>
  );
};
