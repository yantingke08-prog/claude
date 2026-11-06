import { useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import { BlendFunction } from "postprocessing";
import { useEffect } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "./copy";
import { E, direct, type Dir } from "./director";
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

/** WebGL set + lens: ACES tone mapping, focus on the subject, bloom on emissives, grain. */
/** dpr: pixel ratio of the 3D layer (1 = native 1080×1920; 0.75 speeds up CPU-only renders) */
const Cinema: React.FC<{ d: Dir; bloom?: number; dof?: boolean; dpr?: number }> = ({ d, bloom = 0.9, dof = false, dpr = 1 }) => {
  const { width, height } = useVideoConfig();
  const focus = d.cam.pos.distanceTo(d.cam.target);
  return (
    <ThreeCanvas width={width} height={height} dpr={dpr} camera={{ fov: 38, position: [0, 2, 10], near: 0.1, far: 3000 }} gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
      <color attach="background" args={[PAL.bg]} />
      <Scene d={d} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {dof ? <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.55} bokehScale={2.4} /> : <></>}
        <Bloom mipmapBlur intensity={bloom + d.flash * 1.4} luminanceThreshold={0.55} luminanceSmoothing={0.3} radius={0.72} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.16} />
        <Vignette eskil={false} offset={0.28} darkness={0.78} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};

export const FakeoutFilm: React.FC<{ muted?: boolean; dof?: boolean; dpr?: number }> = ({ muted = false, dof = false, dpr = 1 }) => {
  const f = useCurrentFrame();
  const d = direct(f);
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Cinema d={d} dof={dof} dpr={dpr} />
      <Hud d={d} />
      {!muted && <Audio src={staticFile("fakeout/mix.wav")} />}
    </AbsoluteFill>
  );
};

/** 9:16 cover: the three endings side by side under the title */
export const FakeoutCover: React.FC = () => {
  const d = direct(E("endsTo") + 40);
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Cinema d={d} bloom={1.1} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,6,12,0.95) 0%, rgba(4,6,12,0.6) 14%, rgba(4,6,12,0) 24%, rgba(4,6,12,0) 74%, rgba(4,6,12,0.9) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 110, textAlign: "center" }}>
        <div style={{ ...mono(), fontSize: 28, letterSpacing: 8, color: PAL.amber }}>{C.titleEn}</div>
        <div style={{ ...serif(), fontSize: 92, color: "#F5F7FA", lineHeight: 1.25, marginTop: 8, textShadow: `-4px 0 0 ${PAL.up}aa, 4px 0 0 ${PAL.down}aa` }}>{C.title}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1450, textAlign: "center", ...serif(), fontSize: 64, color: "#F5F7FA" }}>{C.endQ2}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", ...sans(500), fontSize: 30, letterSpacing: 3, color: "rgba(245,247,250,0.78)" }}>
        {C.tag} · {C.disclaimer}
      </div>
    </AbsoluteFill>
  );
};
