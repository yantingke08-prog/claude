// 《主动还是被动：谁拿走了流动性？》 v2 — vertical 1440×2560. One 3D trading stage (bevelled candles,
// glass price shelves, order books with glass resting orders, active orders as single pulses, volume glass with a
// delta core, reflective floor, light shafts, fog, depth of field) under a HUD that follows the voice.
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
import { Hud } from "./hud";
import { LAYOUT } from "./layout";
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
        <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.6} bokehScale={2.0} />
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.72} luminanceSmoothing={0.25} radius={0.7} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.1} />
        <Vignette eskil={false} offset={0.28} darkness={0.75} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};

/** the voice is injected locally: prefer the mixed track, fall back to the raw voice, else silent */
const track = () => {
  const names = new Set(getStaticFiles().map((s) => s.name));
  if (names.has("activepassive/mix.wav")) return "activepassive/mix.wav";
  if (names.has("voiceover/vo.wav")) return "voiceover/vo.wav";
  return null;
};

export const ActivePassive: React.FC<{ muted?: boolean }> = ({ muted = false }) => {
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

/** cover: the active buy that crossed the spread and ate the ask, the question above, the notice below */
export const ActivePassiveCover: React.FC = () => {
  const f = Math.round(E("aPush") + 14);
  const M = LAYOUT.margin;
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      {/* the stage drops below the title block */}
      <div style={{ position: "absolute", inset: 0, transform: "translateY(420px)" }}>
        <Cinema f={f} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,7,13,0.95) 0%, rgba(4,7,13,0.7) 24%, rgba(4,7,13,0) 40%, rgba(4,7,13,0) 74%, rgba(4,7,13,0.9) 100%)" }} />
      <div style={{ position: "absolute", left: M, right: M, top: 190, textAlign: "center" }}>
        <div style={{ ...serif(900), fontSize: 170, lineHeight: 1.12, color: "#f3ead9" }}>
          <span style={{ color: COL.up }}>主动</span>还是<span style={{ color: COL.gold }}>被动</span>
        </div>
        <div style={{ ...serif(900), fontSize: 120, lineHeight: 1.3, color: "#f3ead9", marginTop: 10 }}>{T.titleB}</div>
        <div style={{ ...sans(700), fontSize: 50, lineHeight: 1.4, color: "rgba(243,234,217,0.7)", marginTop: 22 }}>{T.V.hook1.flat().map((s) => s[0]).join("")}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 2240, textAlign: "center", ...sans(700), fontSize: 40, color: COL.gold }}>{T.risk}</div>
    </AbsoluteFill>
  );
};
