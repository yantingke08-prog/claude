// 《你的止损，为什么总被精准扫掉？》 vertical 1440×2560 explainer. One 3D set (candles, level shelves, stop-order piles,
// order-book ladder) under a projected HUD. Length, timing and captions all come from timeline.json.
import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, getStaticFiles, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { E } from "./cue";
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
      continueRender(h);
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
  return (
    <ThreeCanvas width={width} height={height} dpr={1} camera={{ fov: 30, position: [0, 0, 30], near: 0.1, far: 400 }} gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}>
      <World f={f} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.25} radius={0.7} />
        <Vignette eskil={false} offset={0.3} darkness={0.7} />
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

/** cover: the sweep at its peak, cubes flying into the counterparty block, with the title */
export const StopHuntCover: React.FC = () => {
  const f = Math.round(E("fire") + 18);
  return (
    <AbsoluteFill style={{ background: COL.bg }}>
      <Cinema f={f} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,6,11,0.92) 0%, rgba(4,6,11,0.55) 26%, rgba(4,6,11,0) 42%, rgba(4,6,11,0) 70%, rgba(4,6,11,0.85) 100%)" }} />
      <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 230, textAlign: "center" }}>
        <div style={{ ...serif(900), fontSize: 190, lineHeight: 1.1, color: "#f3f6fb" }}>{T.hook1}</div>
        <div style={{ ...sans(900), fontSize: 112, lineHeight: 1.25, color: COL.level, marginTop: 16 }}>{T.hook2}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1960, display: "flex", justifyContent: "center", gap: 24 }}>
        {["前高", "前低", "整数位"].map((s) => (
          <div key={s} style={{ ...sans(900), fontSize: 64, color: "#05070b", background: COL.level, borderRadius: 16, padding: "6px 34px 10px" }}>{s}</div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 2110, textAlign: "center", ...sans(900), fontSize: 70, color: COL.buyStop }}>{T.core1}{T.core2}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 2250, textAlign: "center", ...sans(700), fontSize: 38, color: "rgba(255,214,140,0.92)" }}>{T.risk}</div>
    </AbsoluteFill>
  );
};
