import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { C } from "../components/Hud";
import { zh } from "../lib/fonts";
import { Ambient } from "./components/Ambient";
import { CleanContext, ProgressBar } from "./components/Chrome";
import { HookCharts } from "./scenes/Hook";
import { LargeNumbers3D } from "./scenes/LargeNumbers3D";
import { Hook3D } from "./scenes/Hook3D";
import { Expectancy3D } from "./scenes/Expectancy3D";
import { Sizing3D } from "./scenes/Sizing3D";
import { Discipline3D } from "./scenes/Discipline3D";
import { Outro3D } from "./scenes/Outro3D";
import { SCRIPT, sceneStart, type SceneId } from "./timeline.ts";

const SCENES: Record<SceneId, React.FC> = {
  hook: Hook3D,
  expectancy: Expectancy3D,
  lln: LargeNumbers3D,
  sizing: Sizing3D,
  discipline: Discipline3D,
  outro: Outro3D,
};

const timing = linearTiming({ durationInFrames: SCRIPT.transition });

/**
 * Each chapter owns its 3D data space (its own WebGL stage); the shared Ambient cloud only
 * shows through during the 2D motion-graphics beats. Crossfaded by TransitionSeries.
 */
export const ExpectancyVideo: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <Ambient />
    <TransitionSeries>
      {SCRIPT.scenes.flatMap((s, i) => {
        const Scene = SCENES[s.id as SceneId];
        const seq = (
          <TransitionSeries.Sequence key={s.id} durationInFrames={s.frames}>
            <Scene />
          </TransitionSeries.Sequence>
        );
        return i === 0 ? [seq] : [<TransitionSeries.Transition key={`t-${s.id}`} presentation={fade()} timing={timing} />, seq];
      })}
    </TransitionSeries>
    <ProgressBar />
    {withAudio && <Audio src={staticFile("expectancy-score.wav")} />}
  </AbsoluteFill>
);

/** Renders a single scene on its own, with the shared background, for fast iteration. */
export const sceneComposition = (id: SceneId) => {
  const Scene = SCENES[id];
  const Comp: React.FC = () => (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Ambient />
      <Scene />
    </AbsoluteFill>
  );
  return Comp;
};

const highlightPct = (text: string, color: string) =>
  text.split(/(\d+%)/).map((part, i) =>
    /\d+%/.test(part) ? (
      <span key={i} style={{ color, textShadow: `0 0 40px ${color}` }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );

/** 1280x720 YouTube thumbnail, built from the same chart as the hook. */
export const ExpectancyThumbnail: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
    <Ambient />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 30, opacity: 0.85 }}>
      <HookCharts frame={360} scale={0.72} />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,4,11,0.92) 0%, rgba(3,4,11,0.55) 45%, rgba(3,4,11,0) 70%)" }} />
    <div style={{ position: "absolute", left: 60, top: 40, ...zh(900), lineHeight: 1.12, fontSize: 104, color: "#fff" }}>
      <div>{highlightPct(SCRIPT.ui.thumbTop, C.amber)}</div>
      <div>{highlightPct(SCRIPT.ui.thumbBottom, "#ff4d6d")}</div>
    </div>
  </AbsoluteFill>
);

// ---------------- 3D direction sample: chapter 2, frames 300-1080 ----------------

export const SAMPLE_FROM = 300;
export const SAMPLE_FRAMES = 780;

/**
 * Review cut of the rebuilt law-of-large-numbers segment, with the matching slice of the
 * score. `clean` hides captions, chapter card and decorative background, leaving only
 * the subject, to judge whether the picture carries the explanation on its own.
 */
export const ExpectancySample: React.FC<{ clean?: boolean }> = ({ clean = false }) => (
  <CleanContext.Provider value={clean}>
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {!clean && <Ambient />}
      <Sequence from={-SAMPLE_FROM}>
        <LargeNumbers3D />
      </Sequence>
      {!clean && <Audio src={staticFile("expectancy-score.wav")} trimBefore={sceneStart("lln") + SAMPLE_FROM} />}
    </AbsoluteFill>
  </CleanContext.Provider>
);
