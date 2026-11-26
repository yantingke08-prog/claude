import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { prog } from "./anim";
import { Captions } from "./Captions";
import { FilmProvider, ShotCtx, XF, useFilm } from "./ctx";
import { Backdrop, Disclaimer, Header } from "./kit";
import { VO_AUDIO } from "./audioContract";
import { SCENES } from "./scenes";
import { BEATS, SFX, SHOT_LABEL, type ShotId } from "./script";
import { resolveBeats, resolveSfx, type Timeline } from "./timeline";

export type SanzhongProps = { timeline: Timeline; hasAudio: boolean; voiceVolume: number; sfxVolume: number; qa?: boolean };

// QA render mode (scripts/sanzhong-qa.mjs): everything is hidden except tag/caption boxes, painted 50 % red,
// so a pixel scan finds overlaps (two boxes → brighter red) and text outside the safe area.
const QA_CSS = `
  * { color: transparent !important; text-shadow: none !important; box-shadow: none !important; border-color: transparent !important; background: transparent !important; outline: none !important; }
  svg, img { visibility: hidden !important; }
  [data-qa] { background: rgba(255,0,0,0.5) !important; }
  [data-qa] * { background: transparent !important; }
`;


const Shots: React.FC = () => {
  const { t, tl } = useFilm();
  return (
    <>
      {tl.shots.map((s, i) => {
        const Scene = SCENES[s.id as ShotId];
        if (!Scene) return null;
        const last = i === tl.shots.length - 1;
        if (t < s.start || (!last && t > s.end + XF)) return null;
        const o = i === 0 ? 1 : prog(t, s.start, XF);
        return (
          <AbsoluteFill key={`${s.id}-${i}`} style={{ opacity: o }}>
            <ShotCtx.Provider value={{ start: s.start, first: i === 0 }}>
              <Scene shot={s} />
            </ShotCtx.Provider>
          </AbsoluteFill>
        );
      })}
    </>
  );
};

const Chrome: React.FC = () => {
  const { t, tl } = useFilm();
  const s = [...tl.shots].reverse().find((x) => t >= x.start) ?? tl.shots[0];
  const label = SHOT_LABEL[s.id as ShotId] ?? "";
  // the label animates only when the chapter text changes
  const firstOfLabel = tl.shots.find((x) => SHOT_LABEL[x.id as ShotId] === label) ?? s;
  return (
    <>
      <Header label={label} labelIn={prog(t, firstOfLabel.start, 0.4)} />
      <Captions />
      <Disclaimer />
    </>
  );
};

export const SanzhongLVP: React.FC<SanzhongProps> = ({ timeline, hasAudio, voiceVolume, sfxVolume, qa }) => {
  const { fps } = useVideoConfig();
  useCurrentFrame();
  const { beats } = React.useMemo(() => resolveBeats(timeline, BEATS), [timeline]);
  const sfx = React.useMemo(() => resolveSfx(beats, SFX), [beats]);
  return (
    <FilmProvider value={{ tl: timeline, beats }}>
      <AbsoluteFill style={{ background: qa ? "#000" : "#07090D" }}>
        {qa ? <style>{QA_CSS}</style> : null}
        {qa ? null : <Backdrop />}
        <Shots />
        <Chrome />
        {hasAudio && !qa ? <Audio src={staticFile(VO_AUDIO)} volume={voiceVolume} /> : null}
        {sfx.map((c, i) => (
          <Sequence key={i} from={Math.max(0, Math.round(c.t * fps))} durationInFrames={45} name={`sfx-${c.kind}`}>
            <Audio src={staticFile(`sanzhong/sfx/${c.kind}.wav`)} volume={sfxVolume} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </FilmProvider>
  );
};
