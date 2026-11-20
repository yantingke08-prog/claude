// 《放量不涨，先别追：低位看换手，高位防出货》 v5 — vertical 1440×2560. One 3D trading stage (bevelled clear-coat
// candles, volume columns, a faint price grid behind each chart, gold glass lines and shelves, reflective floor, fog,
// depth of field) under a HUD of terminal-native tags set right beside the candles, volume columns and key lines (tags.ts). Length, timing and captions all
// come from timeline.json.
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
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.38 }}
    >
      <World f={f} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.7} bokehScale={1.6} />
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.7} luminanceSmoothing={0.25} radius={0.7} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.05} />
        <Vignette eskil={false} offset={0.32} darkness={0.45} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};

/** prefer the mixed track (voice + bed + countdown ticks), fall back to the raw voice, else silent */
const track = () => {
  const names = new Set(getStaticFiles().map((s) => s.name));
  if (names.has("volnorise5/mix.wav")) return "volnorise5/mix.wav";
  if (names.has("volnorise5/vo.wav")) return "volnorise5/vo.wav";
  return null;
};

export const VolNoRise5: React.FC<{ muted?: boolean }> = ({ muted = false }) => {
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

/** cover: the heavy-volume candle lit on the darkened chart (the moment the answer lands), the title in the band above it */
export const VolNoRise5Cover: React.FC = () => {
  const f = Math.round(E("tHigh") + 30);
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      <Cinema f={f} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,7,10,0.95) 0%, rgba(5,7,10,0.75) 30%, rgba(5,7,10,0) 40%, rgba(5,7,10,0) 76%, rgba(5,7,10,0.92) 100%)" }} />
      <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: SAFE.top - 20, textAlign: "center" }}>
        <div style={{ ...serif(900), fontSize: 184, lineHeight: 1.12, color: "#f3ead9" }}>{T.cover1}</div>
        <div style={{ ...serif(900), fontSize: 184, lineHeight: 1.12, color: COL.gold }}>{T.cover2}</div>
        <div style={{ ...sans(900), fontSize: 70, lineHeight: 1.4, marginTop: 30, whiteSpace: "nowrap" }}>
          {T.cover3.map((w, i) => (
            <span key={i} style={{ color: i === 0 ? COL.gold : i === 3 ? "#f3ead9" : i === 2 ? "rgba(243,234,217,0.5)" : "#f3ead9" }}>{w}</span>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 2250, textAlign: "center", ...sans(700), fontSize: 42, color: COL.gold }}>{T.risk}</div>
    </AbsoluteFill>
  );
};
