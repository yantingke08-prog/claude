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
import { VolNoRise, VolNoRiseCover } from "./volnorise/Film";
import { VolNoRise2, VolNoRise2Cover } from "./volnorise2/Film";
import { VolNoRise3, VolNoRise3Cover } from "./volnorise3/Film";
import { FPS as VNR_FPS, FRAMES as VNR_FRAMES, HEIGHT as VNR_H, WIDTH as VNR_W } from "./volnorise/cue";
import { FPS as VNR2_FPS, FRAMES as VNR2_FRAMES, HEIGHT as VNR2_H, WIDTH as VNR2_W } from "./volnorise2/cue";
import { FPS as VNR3_FPS, FRAMES as VNR3_FRAMES, HEIGHT as VNR3_H, WIDTH as VNR3_W } from "./volnorise3/cue";

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
    <Folder name="VolNoRise">
      <Composition id="VolNoRise" component={VolNoRise} durationInFrames={VNR_FRAMES} fps={VNR_FPS} width={VNR_W} height={VNR_H} defaultProps={{ muted: false }} />
      <Still id="VolNoRiseCover" component={VolNoRiseCover} width={VNR_W} height={VNR_H} />
    </Folder>
    <Folder name="VolNoRise2">
      <Composition id="VolNoRise2" component={VolNoRise2} durationInFrames={VNR2_FRAMES} fps={VNR2_FPS} width={VNR2_W} height={VNR2_H} defaultProps={{ muted: false }} />
      <Still id="VolNoRise2Cover" component={VolNoRise2Cover} width={VNR2_W} height={VNR2_H} />
    </Folder>
    <Folder name="VolNoRise3">
      <Composition id="VolNoRise3" component={VolNoRise3} durationInFrames={VNR3_FRAMES} fps={VNR3_FPS} width={VNR3_W} height={VNR3_H} defaultProps={{ muted: false }} />
      <Still id="VolNoRise3Cover" component={VolNoRise3Cover} width={VNR3_W} height={VNR3_H} />
    </Folder>
  </>
);
