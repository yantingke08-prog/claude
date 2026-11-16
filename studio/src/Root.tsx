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
import { ZhanqianCover, ZhanqianFilm } from "./zhanqian/Film";
import { FRAMES as ZQ_FRAMES, FPS as ZQ_FPS } from "./zhanqian/cue";
import { SameCandleCover, SameCandleFilm } from "./samecandle/Film";
import { FRAMES as SC_FRAMES, FPS as SC_FPS } from "./samecandle/cue";
import { SameCandle3Cover, SameCandle3Film, SameCandle3Phone } from "./samecandle3/Film";
import { FRAMES as SC3_FRAMES, FPS as SC3_FPS } from "./samecandle3/cue";
import { SameCandle4Cover, SameCandle4Film, SameCandle4Phone } from "./samecandle4/Film";
import { FRAMES as SC4_FRAMES, FPS as SC4_FPS } from "./samecandle4/cue";
import { HongSanBingCover, HongSanBingFilm } from "./hongsanbing/Film";
import { OrderFlowCover, OrderFlowFilm } from "./orderflow/Film";
import { FRAMES as OF_FRAMES, FPS as OF_FPS } from "./orderflow/cue";
import { FRAMES as HSB_FRAMES, FPS as HSB_FPS } from "./hongsanbing/cue";

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
    <Folder name="Zhanqian">
      <Composition id="Zhanqian" component={ZhanqianFilm} durationInFrames={ZQ_FRAMES} fps={ZQ_FPS} width={1080} height={1920} defaultProps={{ muted: false, dpr: 1, qa: false }} />
      <Still id="ZhanqianCover" component={ZhanqianCover} width={1080} height={1920} defaultProps={{ dpr: 1 }} />
    </Folder>
    <Folder name="SameCandle">
      <Composition id="SameCandle" component={SameCandleFilm} durationInFrames={SC_FRAMES} fps={SC_FPS} width={1080} height={1920} defaultProps={{ muted: false }} />
      <Still id="SameCandleCover" component={SameCandleCover} width={1080} height={1920} />
      <Composition id="SameCandle3" component={SameCandle3Film} durationInFrames={SC3_FRAMES} fps={SC3_FPS} width={1080} height={1920} defaultProps={{ muted: false }} />
      <Composition id="SameCandle3K" component={SameCandle3Film} durationInFrames={SC3_FRAMES} fps={SC3_FPS} width={1440} height={2560} defaultProps={{ muted: false }} />
      <Still id="SameCandle3Cover" component={SameCandle3Cover} width={1080} height={1920} />
      <Still id="SameCandle3Cover2K" component={SameCandle3Cover} width={1440} height={2560} />
      <Composition id="SameCandle4" component={SameCandle4Film} durationInFrames={SC4_FRAMES} fps={SC4_FPS} width={1080} height={1920} defaultProps={{ muted: false }} />
      <Composition id="SameCandle4K" component={SameCandle4Film} durationInFrames={SC4_FRAMES} fps={SC4_FPS} width={1440} height={2560} defaultProps={{ muted: false }} />
      <Still id="SameCandle4Cover" component={SameCandle4Cover} width={1080} height={1920} />
      <Still id="SameCandle4Cover2K" component={SameCandle4Cover} width={1440} height={2560} />
      <Composition id="SameCandle4Phone" component={SameCandle4Phone} durationInFrames={SC4_FRAMES} fps={SC4_FPS} width={1080} height={1920} />
      <Composition id="SameCandle3Phone" component={SameCandle3Phone} durationInFrames={SC3_FRAMES} fps={SC3_FPS} width={1080} height={1920} />
    </Folder>
    <Folder name="OrderFlow">
      <Composition id="OrderFlow" component={OrderFlowFilm} durationInFrames={OF_FRAMES} fps={OF_FPS} width={1080} height={1920} defaultProps={{ muted: false }} />
      <Still id="OrderFlowCover" component={OrderFlowCover} width={1080} height={1920} />
    </Folder>
    <Folder name="HongSanBing">
      <Composition id="HongSanBing" component={HongSanBingFilm} durationInFrames={HSB_FRAMES} fps={HSB_FPS} width={1080} height={1920} defaultProps={{ muted: false }} />
      <Composition id="HongSanBing2K" component={HongSanBingFilm} durationInFrames={HSB_FRAMES} fps={HSB_FPS} width={1440} height={2560} defaultProps={{ muted: false }} />
      <Still id="HongSanBingCover" component={HongSanBingCover} width={1080} height={1920} />
      <Still id="HongSanBingCover2K" component={HongSanBingCover} width={1440} height={2560} />
    </Folder>
    <Folder name="Fakeout-v6">
      <Composition id="FakeoutV6" component={FakeoutFilm} durationInFrames={FO_FRAMES} fps={FO_FPS} width={1080} height={1920} defaultProps={{ muted: false }} />
      <Still id="FakeoutV6Cover" component={FakeoutCover} width={1080} height={1920} />
    </Folder>
  </>
);
