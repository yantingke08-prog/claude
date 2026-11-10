import { useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import { BlendFunction } from "postprocessing";
import { useEffect } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "./copy";
import { L } from "./cue";
import { direct, type Dir } from "./director";
import { mono, sans, serif } from "./fonts";
import { Hud } from "./Hud";
import { PAL, Scene } from "./Scene";

/** Re-render once the composer has mounted (otherwise the first frame of each tab is black). */
const Settle: React.FC = () => {
  const advance = useThree((s) => s.advance);
  const frame = useCurrentFrame();
  useEffect(() => {
    const h = delayRender("composer settle");
    const raf = requestAnimationFrame(() => {
      advance(performance.now());
      continueRender(h);
    });
    return () => {
      cancelAnimationFrame(raf);
      continueRender(h);
    };
  }, [advance, frame]);
  return null;
};

const Cinema: React.FC<{ d: Dir; bloom?: number; dpr?: number }> = ({ d, bloom = 0.85, dpr = 1 }) => {
  const { width, height } = useVideoConfig();
  const focus = d.pos.distanceTo(d.target);
  return (
    <ThreeCanvas width={width} height={height} dpr={dpr} camera={{ fov: 34, position: [0, 2, 10], near: 0.1, far: 900 }} gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
      <color attach="background" args={[PAL.bg]} />
      <Scene d={d} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {d.dof > 0.01 ? <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.9} bokehScale={2.2} /> : <></>}
        <Bloom mipmapBlur intensity={bloom + d.flash * 1.3} luminanceThreshold={0.55} luminanceSmoothing={0.3} radius={0.72} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.14} />
        <Vignette eskil={false} offset={0.28} darkness={0.74} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};

export const ZhanqianFilm: React.FC<{ muted?: boolean; dpr?: number }> = ({ muted = false, dpr = 1 }) => {
  const f = useCurrentFrame();
  const d = direct(f);
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Cinema d={d} dpr={dpr} />
      <Hud d={d} />
      {!muted && <Audio src={staticFile("zhanqian/mix.wav")} />}
    </AbsoluteFill>
  );
};

/** 9:16 cover: the candle lit from inside, under the title */
export const ZhanqianCover: React.FC = () => {
  // the hook's candle, framed wider so the bars before it read as a chart
  const d = { ...direct(L("h2") + 4), pos: new THREE.Vector3(9.5, 3.4, 27), target: new THREE.Vector3(-3.2, 4.4, 0), dof: 0 };
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Cinema d={d} bloom={1.05} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,6,12,0.92) 0%, rgba(4,6,12,0.45) 30%, rgba(4,6,12,0) 46%, rgba(4,6,12,0.1) 68%, rgba(4,6,12,0.92) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center" }}>
        <div style={{ ...mono(), fontSize: 32, letterSpacing: 10, color: PAL.gold }}>
          {C.ep} · {C.titleEn}
        </div>
        <div style={{ ...serif(), fontSize: 200, lineHeight: 1.2, color: "#F5F7FA", marginTop: 10, textShadow: `0 0 50px ${PAL.gold}77, 0 6px 22px #000` }}>{C.title}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1460, textAlign: "center", ...serif(), fontSize: 80, lineHeight: 1.35, color: "#F5F7FA", textShadow: "0 4px 18px #000" }}>
        K线是<span style={{ color: PAL.gold }}>战报</span>
        <br />
        订单才是<span style={{ color: PAL.up }}>战场</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 110, textAlign: "center", ...sans(500), fontSize: 30, letterSpacing: 3, color: "rgba(245,247,250,0.78)" }}>
        {C.tag} · {C.disclaimer}
      </div>
    </AbsoluteFill>
  );
};
