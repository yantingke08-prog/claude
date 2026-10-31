import { Composition, Folder } from "remotion";
import { Showreel } from "./Showreel";
import { IntroLogo } from "./scenes/IntroLogo";
import { GlobeScene } from "./scenes/GlobeScene";
import { WaveScene } from "./scenes/WaveScene";
import { Outro } from "./scenes/Outro";
import { TL, TOTAL_FRAMES } from "./lib/timeline";

const base = { fps: TL.fps, width: TL.width, height: TL.height };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Showreel" component={Showreel} durationInFrames={TOTAL_FRAMES} {...base} />
    <Folder name="Scenes">
      <Composition id="Intro" component={IntroLogo} durationInFrames={TL.scenes.intro} {...base} />
      <Composition id="Globe" component={GlobeScene} durationInFrames={TL.scenes.globe} {...base} />
      <Composition id="Wave" component={WaveScene} durationInFrames={TL.scenes.wave} {...base} />
      <Composition id="Outro" component={Outro} durationInFrames={TL.scenes.outro} {...base} />
    </Folder>
  </>
);
