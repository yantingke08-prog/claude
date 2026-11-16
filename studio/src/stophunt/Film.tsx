// 《你的止损，为什么总被精准扫掉？》 v2 — vertical 1440×2560. One 3D trading stage (bevelled candles, gold glass levels,
// order-brick stacks, reflective floor, light shafts, fog, depth of field) under a HUD that follows the voice.
// Length, timing and captions all come from timeline.json.
import { useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import { BlendFunction } from "postprocessing";
import React, { useEffect } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, getStaticFiles, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { E } from "./cue";
import { cam } from "./director";
import { fontsReady, sans, serif } from "./fonts";
import { Hud, SAFE } from "./hud";
import { T } from "./text";
import { COL, World } from "./world";

void fontsReady;

/** ThreeCanvas renders once before the composer has its passes: render again after mount (KnowledgeBase 10 #1) */
const Settle: React.FC = () => {
  const advance = useThree((s) => s.advance);
  const frame = useCurrentFrame();
  useEffect(() => {
    const h = delayRender("post-mount render");
    const raf = requestAnimationFrame(() => {
      advance(performance.now());
      requestAnimationFrame(() => {
        advance(performance.now());
        continueRender(h);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      continueRender(h);
    };
  }, [advance, frame]);
  return null;
};

const Cinema: React.FC<{ f: number }> = ({ f }) => {
  const { width, height } = useVideoConfig();
  const c = cam(f);
  const focus = Math.hypot(c.p[0] - c.t[0], c.p[1] - c.t[1], c.p[2] - c.t[2]);
  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      shadows={{ type: THREE.VSMShadowMap }}
      camera={{ fov: 30, position: [0, 0, 30], near: 0.1, far: 400 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
    >
      <World f={f} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.55} bokehScale={2.2} />
        <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.7} luminanceSmoothing={0.25} radius={0.72} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.12} />
        <Vignette eskil={false} offset={0.28} darkness={0.75} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};

/** the voice is injected locally: prefer the mixed track, fall back to the raw voice, else silent */
const track = () => {
  const names = new Set(getStaticFiles().map((s) => s.name));
  if (names.has("stophunt/mix.wav")) return "stophunt/mix.wav";
  if (names.has("voiceover/vo.wav")) return "voiceover/vo.wav";
  return null;
};

export const StopHunt: React.FC<{ muted?: boolean }> = ({ muted = false }) => {
  const f = useCurrentFrame();
  const src = muted ? null : track();
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      <Cinema f={f} />
      <Hud f={f} />
      {src && <Audio src={staticFile(src)} />}
    </AbsoluteFill>
  );
};

/** cover: the stops lighting up layer by layer as the sweep goes through them */
export const StopHuntCover: React.FC = () => {
  const f = Math.round(E("fire") + 16);
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      <Cinema f={f} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,7,13,0.94) 0%, rgba(4,7,13,0.5) 24%, rgba(4,7,13,0) 40%, rgba(4,7,13,0) 70%, rgba(4,7,13,0.88) 100%)" }} />
      <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 230, textAlign: "center" }}>
        <div style={{ ...serif(900), fontSize: 190, lineHeight: 1.1, color: "#f3ead9" }}>{T.hook1}</div>
        <div style={{ ...sans(900), fontSize: 108, lineHeight: 1.25, color: COL.gold, marginTop: 16 }}>{T.hook2}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 2040, textAlign: "center", ...sans(900), fontSize: 72, color: "#f3ead9" }}>
        {T.core1}
        <span style={{ color: COL.gold }}>{T.core2}</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 2190, textAlign: "center", ...sans(700), fontSize: 38, color: COL.gold }}>{T.risk}</div>
    </AbsoluteFill>
  );
};
