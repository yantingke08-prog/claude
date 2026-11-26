// 《价值区怎么用？只看3个数》 — vertical 1440×2560, 30 fps. One 3D volume-profile stage (seven sets side by side,
// the camera travels between them) under a HUD that follows the voice. Length, timing and captions all come from
// timeline.json: `npm run va:estimate` (placeholder) or `npm run va:sync` (the real recording).
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

/** ThreeCanvas renders once before the composer has its passes: render again after mount */
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

const Cinema: React.FC<{ f: number; lite?: boolean }> = ({ f, lite = false }) => {
  const { width, height } = useVideoConfig();
  const c = cam(f);
  const focus = Math.hypot(c.p[0] - c.t[0], c.p[1] - c.t[1], c.p[2] - c.t[2]);
  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      camera={{ fov: 30, position: [0, 0, 40], near: 0.1, far: 400 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <World f={f} />
      {!lite && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.7} bokehScale={1.6} />
          <Bloom mipmapBlur intensity={0.65} luminanceThreshold={0.7} luminanceSmoothing={0.25} radius={0.7} />
          <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.08} />
          <Vignette eskil={false} offset={0.28} darkness={0.72} />
        </EffectComposer>
      )}
      <Settle />
    </ThreeCanvas>
  );
};

/** the voice is injected locally and never committed: the mix first, else the raw recording */
export const audioTrack = () => {
  const names = new Set(getStaticFiles().map((s) => s.name));
  for (const n of ["valuearea/mix.wav", "voiceover/vo.mp3", "voiceover/vo.wav"]) if (names.has(n)) return n;
  return null;
};

/** lite = preview without post-processing (Studio on machines without a GPU); never used for the real render */
export const ValueArea: React.FC<{ muted?: boolean; requireAudio?: boolean; lite?: boolean }> = ({ muted = false, requireAudio = false, lite = false }) => {
  const f = useCurrentFrame();
  const src = muted ? null : audioTrack();
  if (requireAudio && !src) throw new Error("ValueArea: no voice found (public/valuearea/mix.wav or public/voiceover/vo.mp3) — run `npm run va:sync` first; refusing to render a silent film");
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      <Cinema f={f} lite={lite} />
      <Hud f={f} />
      {src && <Audio src={staticFile(src)} />}
    </AbsoluteFill>
  );
};

/** cover: the profile with all three numbers lit, title above, POC / VAH / VAL below it, the 教学示意 mark */
export const ValueAreaCover: React.FC<{ lite?: boolean }> = ({ lite = false }) => {
  const f = Math.round(E("L13_有没有人接") + 30);
  const M = LAYOUT.margin;
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      <div style={{ position: "absolute", inset: 0, transform: "translateY(380px) scale(1.02)" }}>
        <Cinema f={f} lite={lite} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,8,15,0.97) 0%, rgba(5,8,15,0.82) 26%, rgba(5,8,15,0) 44%, rgba(5,8,15,0) 76%, rgba(5,8,15,0.92) 100%)" }} />
      <div style={{ position: "absolute", right: M, top: 56, ...sans(900), fontSize: 40, color: "#05080f", background: COL.gold, borderRadius: 10, padding: "6px 20px 10px" }}>{T.coverMark}</div>
      <div style={{ position: "absolute", left: M, right: M, top: 210, textAlign: "center" }}>
        <div style={{ ...serif(900), fontSize: 150, lineHeight: 1.12, color: "#f3ead9" }}>{T.titleA}</div>
        <div style={{ ...serif(900), fontSize: 196, lineHeight: 1.18, color: COL.gold, marginTop: 6 }}>{T.titleB}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 40 }}>
          {T.sub.map((s, i) => (
            <div key={s} style={{ ...sans(900), fontSize: 84, lineHeight: 1, letterSpacing: 2, padding: "16px 30px 22px", borderRadius: 18, color: i === 0 ? "#05080f" : "#f3ead9", background: i === 0 ? COL.gold : "rgba(5,8,15,0.7)", border: `3px solid ${i === 0 ? COL.gold : "rgba(243,234,217,0.55)"}` }}>
              {s}
            </div>
          ))}
        </div>
        <div style={{ ...sans(700), fontSize: 44, color: "rgba(243,234,217,0.72)", marginTop: 26 }}>{T.subLine}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 2290, textAlign: "center", ...sans(700), fontSize: 38, color: COL.gold }}>{T.risk}</div>
    </AbsoluteFill>
  );
};
