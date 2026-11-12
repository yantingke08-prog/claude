import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { keys, prog } from "./anim";
import { BackgroundGrid, BrandHeader, Caption, Disclaimer } from "./components/Frame";
import { After } from "./chapters/After";
import { Delta } from "./chapters/Delta";
import { End } from "./chapters/End";
import { Evidence } from "./chapters/Evidence";
import { Hook } from "./chapters/Hook";
import { Layers } from "./chapters/Layers";
import { Mechanism } from "./chapters/Mechanism";
import { Mind } from "./chapters/Mind";
import { Questions } from "./chapters/Questions";
import { Risk } from "./chapters/Risk";
import { CHAPTERS, SFX, TOTAL_FRAMES, type ChapterId } from "./script";
import { C, W } from "./theme";

export type XishouProps = {
  voiceVolume: number;
  bgmVolume: number; // background music stays under the voice
  sfxVolume: number;
};

export const defaultXishouProps: XishouProps = { voiceVolume: 1, bgmVolume: 0.12, sfxVolume: 0.3 };

const SCENES: Record<ChapterId, React.FC> = {
  hook: Hook,
  delta: Delta,
  mechanism: Mechanism,
  after: After,
  evidence: Evidence,
  risk: Risk,
  mind: Mind,
  questions: Questions,
  layers: Layers,
  end: End,
};

const WIPE = 16; // chapter transition: a left→right mask with a thin cyan edge

const ChapterShell: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const f = useCurrentFrame();
  const p = first ? 1 : prog(f, 0, WIPE);
  return (
    <AbsoluteFill style={{ clipPath: p < 1 ? `inset(0 ${(1 - p) * 100}% 0 0)` : undefined, background: p < 1 ? C.bg : undefined }}>
      {p < 1 ? <BackgroundGrid /> : null}
      {children}
      {p > 0 && p < 1 ? <div style={{ position: "absolute", top: 0, bottom: 0, left: p * W - 2, width: 2, background: C.cyan, opacity: 0.7 }} /> : null}
    </AbsoluteFill>
  );
};

export const XishouLVP: React.FC<XishouProps> = ({ voiceVolume, bgmVolume, sfxVolume }) => {
  const f = useCurrentFrame();
  const drift = keys(f, [[0, 1], [TOTAL_FRAMES, 1.04]]);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <BackgroundGrid push={drift} />
      {CHAPTERS.map((ch, i) => {
        const Scene = SCENES[ch.id];
        const last = i === CHAPTERS.length - 1;
        return (
          <Sequence key={ch.id} name={ch.id} from={ch.start} durationInFrames={ch.dur + (last ? 0 : WIPE)}>
            <ChapterShell first={i === 0}>
              <Scene />
            </ChapterShell>
          </Sequence>
        );
      })}
      <BrandHeader />
      <Caption />
      <Disclaimer />
      {/* audio: placeholders ship silent; replace the files, not the code */}
      <Audio src={staticFile("assets/audio/voiceover.m4a")} volume={voiceVolume} />
      <Audio src={staticFile("assets/audio/bgm.m4a")} volume={bgmVolume} />
      {SFX.map((s, i) => (
        <Sequence key={i} from={s.frame} durationInFrames={45} name={`sfx-${s.kind}`}>
          <Audio src={staticFile(`assets/audio/sfx/${s.kind}.wav`)} volume={sfxVolume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
