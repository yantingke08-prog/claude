import { Composition, Folder, Still } from "remotion";
import { Showreel } from "./Showreel";
import { IntroLogo } from "./scenes/IntroLogo";
import { GlobeScene } from "./scenes/GlobeScene";
import { WaveScene } from "./scenes/WaveScene";
import { Outro } from "./scenes/Outro";
import { TL, TOTAL_FRAMES } from "./lib/timeline";
import { ExpectancySample, ExpectancyThumbnail, ExpectancyVideo, SAMPLE_FRAMES, sceneComposition } from "./expectancy/ExpectancyVideo";
import { SCRIPT as EXP, TOTAL_FRAMES as EXP_FRAMES, type SceneId } from "./expectancy/timeline.ts";

const base = { fps: TL.fps, width: TL.width, height: TL.height };
const expBase = { fps: EXP.fps, width: EXP.width, height: EXP.height };
// built once at module load: creating components during render would remount them every time
const EXP_SCENES = EXP.scenes.map((s) => ({ ...s, component: sceneComposition(s.id as SceneId) }));

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Showreel" component={Showreel} durationInFrames={TOTAL_FRAMES} {...base} />
    <Folder name="Scenes">
      <Composition id="Intro" component={IntroLogo} durationInFrames={TL.scenes.intro} {...base} />
      <Composition id="Globe" component={GlobeScene} durationInFrames={TL.scenes.globe} {...base} />
      <Composition id="Wave" component={WaveScene} durationInFrames={TL.scenes.wave} {...base} />
      <Composition id="Outro" component={Outro} durationInFrames={TL.scenes.outro} {...base} />
    </Folder>
    <Folder name="Expectancy">
      <Composition id="Expectancy" component={ExpectancyVideo} durationInFrames={EXP_FRAMES} {...expBase} />
      <Composition id="Exp-lln-3d-sample" component={ExpectancySample} durationInFrames={SAMPLE_FRAMES} {...expBase} defaultProps={{ clean: false }} />
      <Composition id="Exp-lln-3d-clean" component={ExpectancySample} durationInFrames={SAMPLE_FRAMES} {...expBase} defaultProps={{ clean: true }} />
      <Still id="ExpectancyThumbnail" component={ExpectancyThumbnail} width={1280} height={720} />
      {EXP_SCENES.map((s) => (
        <Composition key={s.id} id={`Exp-${s.id}`} component={s.component} durationInFrames={s.frames} {...expBase} />
      ))}
    </Folder>
  </>
);
