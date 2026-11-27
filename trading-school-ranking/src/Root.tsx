import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { Film, type FilmProps } from "./Film.tsx";
import { FPS, HEIGHT, PLACEHOLDER_SECONDS, WIDTH } from "./theme.ts";
import { buildTimeline, type TimingFile } from "./timeline.ts";

const exists = async (url: string) => {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
};

/** 读取 public/audio 下的配音和时间轴；总帧数跟随音频，没有音频时用 93 秒占位 */
const calculateMetadata: CalculateMetadataFunction<FilmProps> = async () => {
  let timing: TimingFile | null = null;
  let audioSeconds: number | null = null;

  const wav = staticFile("audio/voiceover.wav");
  if (await exists(wav)) {
    try {
      audioSeconds = await getAudioDurationInSeconds(wav);
    } catch (e) {
      console.warn("[audio] voiceover.wav 无法解码，按无音频处理", e);
    }
  }
  const tj = staticFile("audio/timing.json");
  if (await exists(tj)) {
    try {
      const j = (await (await fetch(tj)).json()) as TimingFile;
      if (Array.isArray(j.segments) && j.segments.length) timing = j;
    } catch (e) {
      console.warn("[timing] timing.json 解析失败，改用字数估算", e);
    }
  }
  const tl = buildTimeline(timing, audioSeconds);
  console.log(`[timeline] ${tl.source} · ${(tl.durationInFrames / FPS).toFixed(2)} s · ${tl.durationInFrames} 帧`);
  return { durationInFrames: tl.durationInFrames, props: { timing, audioSeconds } };
};

export const Root: React.FC = () => (
  <Composition
    id="TradingSchoolRanking"
    component={Film}
    durationInFrames={PLACEHOLDER_SECONDS * FPS}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ timing: null, audioSeconds: null } satisfies FilmProps}
    calculateMetadata={calculateMetadata}
  />
);
