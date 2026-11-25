import React from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { VO_AUDIO, type VoTimestamps } from "./audioContract";
import { SanzhongLVP, type SanzhongProps } from "./Film";
import { FPS, PARAGRAPHS, TAIL } from "./script";
import { buildTimeline, filmSeconds } from "./timeline";
// Bundled at build time (offline). Replace the file + re-render; nothing else changes.
import TS from "../../public/sanzhong/audio/vo.timestamps.json";

const timestamps = TS as unknown as VoTimestamps;

// Length = the real recording + TAIL after the last word. Visuals never decide how long the film is.
const calculateMetadata: CalculateMetadataFunction<SanzhongProps> = async ({ props }) => {
  let audio: number | null = null;
  try {
    audio = await getAudioDurationInSeconds(staticFile(VO_AUDIO));
  } catch (e) {
    console.warn(`[sanzhong] could not read public/${VO_AUDIO}: ${(e as Error).message}`);
  }
  const timeline = buildTimeline(PARAGRAPHS, timestamps, audio);
  for (const w of timeline.warnings) console.warn(`[sanzhong] ${w}`);
  return {
    durationInFrames: Math.max(1, Math.ceil(filmSeconds(timeline, TAIL) * FPS)),
    props: { ...props, timeline, hasAudio: audio !== null },
  };
};

const initial = buildTimeline(PARAGRAPHS, timestamps, null);

export const SanzhongRoot: React.FC = () => (
  <Composition
    id="SanzhongLVP"
    component={SanzhongLVP}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={Math.ceil(filmSeconds(initial, TAIL) * FPS)}
    defaultProps={{ timeline: initial, hasAudio: false, voiceVolume: 1, sfxVolume: 0.3 }}
    calculateMetadata={calculateMetadata}
  />
);
