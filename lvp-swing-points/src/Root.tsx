import React from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { Film, type FilmProps } from "./Film";
import { BROLL_SLOTS } from "./broll.ts";
import { FPS, H, W } from "./theme.ts";
import { VO_AUDIO, VO_TIMESTAMPS, buildTimeline, type VoTimestamps } from "./timeline.ts";

export const COMP_ID = "LvpSwingPoints";

const exists = async (path: string) => {
  try {
    const r = await fetch(staticFile(path), { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
};
const sizeOf = async (path: string) => {
  try {
    const r = await fetch(staticFile(path), { method: "HEAD" });
    const n = Number(r.headers.get("content-length"));
    return r.ok && n > 0 ? n : null;
  } catch {
    return null;
  }
};

// Length = the real voiceover length (getAudioDurationInSeconds). The visuals never decide it.
const calculateMetadata: CalculateMetadataFunction<FilmProps> = async () => {
  let audio: number | null = null;
  if (await exists(VO_AUDIO)) {
    try {
      audio = await getAudioDurationInSeconds(staticFile(VO_AUDIO));
    } catch (e) {
      console.warn(`[vo] could not read public/${VO_AUDIO}: ${(e as Error).message}`);
    }
  } else console.warn(`[vo] public/${VO_AUDIO} not found — silent preview.`);
  let ts: VoTimestamps | null = null;
  try {
    const r = await fetch(staticFile(VO_TIMESTAMPS));
    if (r.ok) ts = (await r.json()) as VoTimestamps;
  } catch (e) {
    console.warn(`[vo] could not read public/${VO_TIMESTAMPS}: ${(e as Error).message}`);
  }
  const timeline = buildTimeline(ts, audio, undefined, audio ? await sizeOf(VO_AUDIO) : null);
  for (const w of timeline.warnings) console.warn(`[vo] ${w}`);
  const broll: Record<string, boolean> = {};
  for (const s of BROLL_SLOTS) broll[s.id] = await exists(s.file);
  return { durationInFrames: Math.max(1, Math.ceil(timeline.duration * FPS)), props: { timeline, hasAudio: audio !== null, broll } };
};

export const Root: React.FC = () => (
  <Composition
    id={COMP_ID}
    component={Film}
    width={W}
    height={H}
    fps={FPS}
    durationInFrames={FPS * 191}
    defaultProps={{ timeline: null, hasAudio: false, broll: {} }}
    calculateMetadata={calculateMetadata}
  />
);
