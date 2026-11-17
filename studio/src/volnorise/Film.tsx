// 《放量不涨，是洗盘还是出货？》 v1 — vertical 1440×2560. One 3D trading stage (bevelled clear-coat candles, a volume
// panel of rounded columns, gold glass lines and support shelves, reflective floor, light shafts, fog, depth of field)
// under a HUD that follows the voice. Length, timing and captions all come from timeline.json.
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
        <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.7} bokehScale={1.6} />
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.74} luminanceSmoothing={0.25} radius={0.7} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.1} />
        <Vignette eskil={false} offset={0.28} darkness={0.72} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};

/** prefer the mixed track (voice + bed + countdown ticks), fall back to the raw voice, else silent */
const track = () => {
  const names = new Set(getStaticFiles().map((s) => s.name));
  if (names.has("volnorise/mix.wav")) return "volnorise/mix.wav";
  if (names.has("volnorise/vo.wav")) return "volnorise/vo.wav";
  return null;
};

export const VolNoRise: React.FC<{ muted?: boolean }> = ({ muted = false }) => {
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

/** cover: the heavy-volume candle that did not rise, close up with its volume column lit, the question above */
export const VolNoRiseCover: React.FC = () => {
  const f = Math.round(E("wIn") + 40);
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      <Cinema f={f} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,7,13,0.96) 0%, rgba(4,7,13,0.7) 30%, rgba(4,7,13,0) 46%, rgba(4,7,13,0) 78%, rgba(4,7,13,0.9) 100%)" }} />
      <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 230, textAlign: "center" }}>
        <div style={{ ...serif(900), fontSize: 200, lineHeight: 1.12, color: "#f3ead9" }}>{T.cover1}</div>
        <div style={{ ...sans(900), fontSize: 104, lineHeight: 1.4, color: "#f3ead9", marginTop: 20 }}>
          {T.cover2.map((w, i) => (
            <span key={i} style={{ color: i % 2 ? COL.gold : "#f3ead9" }}>{w}</span>
          ))}
        </div>
        <div style={{ ...sans(700), fontSize: 54, lineHeight: 1.4, color: "rgba(243,234,217,0.7)", marginTop: 20 }}>{T.cover3}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 2250, textAlign: "center", ...sans(700), fontSize: 42, color: COL.gold }}>{T.risk}</div>
    </AbsoluteFill>
  );
};
