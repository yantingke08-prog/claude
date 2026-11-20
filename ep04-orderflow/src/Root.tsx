import React from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { VO_AUDIO, VO_TIMESTAMPS, type VoTimestamps } from "./audioContract";
import { Film, type FilmProps } from "./Film";
import { SCRIPT } from "./script";
import { buildTimeline } from "./timelineCore";

const FPS = 30;

// Duration = the real voiceover length. The visuals never decide how long the film is.
const calculateMetadata: CalculateMetadataFunction<FilmProps> = async () => {
  let audio: number | null = null;
  try {
    audio = await getAudioDurationInSeconds(staticFile(VO_AUDIO));
  } catch (e) {
    console.warn(`[vo] could not read public/${VO_AUDIO}: ${(e as Error).message}`);
  }
  let ts: VoTimestamps | null = null;
  try {
    const r = await fetch(staticFile(VO_TIMESTAMPS));
    if (r.ok) ts = (await r.json()) as VoTimestamps;
    else console.warn(`[vo] public/${VO_TIMESTAMPS} not found (${r.status})`);
  } catch (e) {
    console.warn(`[vo] could not read public/${VO_TIMESTAMPS}: ${(e as Error).message}`);
  }
  const timeline = buildTimeline(SCRIPT, ts, audio);
  for (const w of timeline.warnings) console.warn(`[vo] ${w}`);
  return {
    durationInFrames: Math.max(1, Math.ceil(timeline.duration * FPS)),
    props: { timeline, hasAudio: audio !== null },
  };
};

export const Root: React.FC = () => (
  <Composition
    id="Ep04OrderFlowThreeFills"
    component={Film}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 10}
    defaultProps={{ timeline: null, hasAudio: false }}
    calculateMetadata={calculateMetadata}
  />
);
