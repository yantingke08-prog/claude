import { Composition, Folder, Still } from "remotion";
import { Showreel } from "./Showreel";
import { IntroLogo } from "./scenes/IntroLogo";
import { GlobeScene } from "./scenes/GlobeScene";
import { WaveScene } from "./scenes/WaveScene";
import { Outro } from "./scenes/Outro";
import { TL, TOTAL_FRAMES } from "./lib/timeline";
import { ExpectancySample, ExpectancyThumbnail, ExpectancyVideo, SAMPLE_FRAMES, sceneComposition } from "./expectancy/ExpectancyVideo";
import { FAR_SHOWCASE_FRAMES, FarFieldShowcase } from "./expectancy/FarFieldShowcase";
import { SCRIPT as EXP, TOTAL_FRAMES as EXP_FRAMES, type SceneId } from "./expectancy/timeline.ts";
import { LvpEndCard } from "./lvp/EndCard";
import { LvpV1Seeing } from "./lvp/V1Seeing";
import { LvpV2Footprint } from "./lvp/V2Footprint";
import { LvpV3Profile } from "./lvp/V3Profile";
import { VIDEO as LVP } from "./lvp/brand";
import { FakeoutCover, FakeoutFilm } from "./fakeout/Film";
import { FRAMES as FO_FRAMES, FPS as FO_FPS } from "./fakeout/cue";

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
      <Composition id="Exp-far-fields" component={FarFieldShowcase} durationInFrames={FAR_SHOWCASE_FRAMES} {...expBase} />
      <Still id="ExpectancyThumbnail" component={ExpectancyThumbnail} width={1280} height={720} />
      {EXP_SCENES.map((s) => (
        <Composition key={s.id} id={`Exp-${s.id}`} component={s.component} durationInFrames={s.frames} {...expBase} />
      ))}
    </Folder>
    <Folder name="LVP">
      <Composition id="LVP-V1-Seeing" component={LvpV1Seeing} durationInFrames={LVP.frames} fps={LVP.fps} width={LVP.width} height={LVP.height} />
      <Composition id="LVP-V2-Footprint" component={LvpV2Footprint} durationInFrames={LVP.frames} fps={LVP.fps} width={LVP.width} height={LVP.height} />
      <Composition id="LVP-V3-Profile" component={LvpV3Profile} durationInFrames={LVP.frames} fps={LVP.fps} width={LVP.width} height={LVP.height} />
      <Composition id="LVP-EndCard" component={LvpEndCard} durationInFrames={LVP.frames} fps={LVP.fps} width={LVP.width} height={LVP.height} />
    </Folder>
    <Folder name="Fakeout-v3">
      <Composition id="FakeoutV3" component={FakeoutFilm} durationInFrames={FO_FRAMES} fps={FO_FPS} width={1080} height={1920} defaultProps={{ muted: false }} />
      <Still id="FakeoutV3Cover" component={FakeoutCover} width={1080} height={1920} />
    </Folder>
  </>
);
