// 《POC 怎么用：为什么这条线像磁铁》 — vertical 1440×2560, 30 fps. One 3D trading stage (clear-coat candles, volume
// columns, glass profile bricks, a gold line of light for each POC, reflective floor, fog, depth of field, bloom) under a
// HUD of terminal tags, big centred titles and captions. Length, timing and captions all come from timeline.json.
import { useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import { BlendFunction } from "postprocessing";
import React, { useEffect } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, getStaticFiles, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { E } from "./cue";
import { cam } from "./director";
import { fontsReady, mono, sans, serif } from "./fonts";
import { Hud, SAFE } from "./hud";
import { COL } from "./palette";
import { T } from "./text";
import { World } from "./world";

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
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.32 }}
    >
      <World f={f} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.8} bokehScale={1.4} />
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.25} radius={0.72} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.045} />
        <Vignette eskil={false} offset={0.32} darkness={0.45} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};

/** the mixed track (voice + score + cues), else the raw voice, else silent */
const track = () => {
  const names = new Set(getStaticFiles().map((s) => s.name));
  for (const n of ["poc/mix.mp3", "poc/mix.wav", "poc/vo.mp3", "poc/vo.wav"]) if (names.has(n)) return n;
  return null;
};

export const PocMagnet: React.FC<{ muted?: boolean }> = ({ muted = false }) => {
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

/** cover: the first day's line fully lit as a magnet, field lines pulling the last bars onto it, the title above */
export const PocMagnetCover: React.FC = () => {
  const f = Math.round(E("zIn") + 70);
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      <Cinema f={f} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,6,10,0.96) 0%, rgba(4,6,10,0.8) 28%, rgba(4,6,10,0) 42%, rgba(4,6,10,0) 76%, rgba(4,6,10,0.92) 100%)" }} />
      <div style={{ position: "absolute", left: SAFE.l, top: 250, ...sans(900), fontSize: 40, color: "rgba(243,234,217,0.75)", letterSpacing: 4 }}>
        {T.series} <span style={{ ...mono(700), color: COL.gold }}>{T.ep}</span>
      </div>
      <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 340, textAlign: "center" }}>
        <div style={{ ...mono(700), fontSize: 250, lineHeight: 1.0, color: COL.goldHot, textShadow: "0 0 60px rgba(242,184,75,0.55)" }}>{T.cover1}</div>
        <div style={{ ...serif(900), fontSize: 156, lineHeight: 1.16, color: "#f3ead9", marginTop: 12 }}>{T.cover2}</div>
        <div style={{ ...sans(900), fontSize: 72, lineHeight: 1.4, marginTop: 34, color: "#f3ead9" }}>{T.cover3}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 2290, textAlign: "center", ...sans(700), fontSize: 40, color: COL.gold }}>{T.demo} · 不构成投资建议</div>
    </AbsoluteFill>
  );
};
