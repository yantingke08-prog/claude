import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { IntroLogo } from "./scenes/IntroLogo";
import { GlobeScene } from "./scenes/GlobeScene";
import { WaveScene } from "./scenes/WaveScene";
import { Outro } from "./scenes/Outro";
import { HudFrame } from "./components/Hud";
import { TL } from "./lib/timeline";

const timing = linearTiming({ durationInFrames: TL.transition });

export const Showreel: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ backgroundColor: "#03040b" }}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={TL.scenes.intro}>
        <IntroLogo />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={TL.scenes.globe}>
        <GlobeScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={TL.scenes.wave}>
        <WaveScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={TL.scenes.outro}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <HudFrame label="MOTION LAB / SHOWREEL 2026" />
    {withAudio && <Audio src={staticFile("soundtrack.wav")} />}
  </AbsoluteFill>
);
