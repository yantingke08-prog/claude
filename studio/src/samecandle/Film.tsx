import { useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import { BlendFunction } from "postprocessing";
import { useEffect } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "./copy";
import { E } from "./cue";
import { direct, type Dir } from "./director";
import { fontsReady, num, sans } from "./fonts";
import { Hud } from "./Hud";
import { PAL, Scene } from "./Scene";

void fontsReady;

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

/** Drives the R3F camera from the director (the HUD projects with the very same numbers). */
const Rig: React.FC<{ d: Dir }> = ({ d }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.copy(d.pos);
  camera.fov = d.fov;
  camera.near = 0.05;
  camera.far = 900;
  camera.lookAt(d.target);
  camera.updateProjectionMatrix();
  return null;
};

const Cinema: React.FC<{ d: Dir }> = ({ d }) => {
  const { width, height } = useVideoConfig();
  const focus = d.pos.distanceTo(d.target);
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 34, position: [0, 0, 30], near: 0.05, far: 900 }} gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}>
      <color attach="background" args={[PAL.bg]} />
      <Rig d={d} />
      <Scene d={d} />
      <EffectComposer multisampling={4} enableNormalPass={false}>
        {d.dof > 0.02 ? <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.5} bokehScale={1.5 + 2.5 * d.dof} /> : <></>}
        <Bloom mipmapBlur intensity={0.75 + d.flash * 1.4} luminanceThreshold={0.62} luminanceSmoothing={0.28} radius={0.7} />
        <ChromaticAberration offset={new THREE.Vector2(0.0004, 0.0004)} radialModulation={false} modulationOffset={0} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.12} />
        <Vignette eskil={false} offset={0.26} darkness={0.78} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};

export const SameCandleFilm: React.FC<{ muted?: boolean }> = ({ muted = false }) => {
  const f = useCurrentFrame();
  const d = direct(f);
  if (d.shake > 0) d.pos.add(new THREE.Vector3(Math.sin(f * 7.1) * d.shake, Math.cos(f * 5.3) * d.shake, 0));
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Cinema d={d} />
      <Hud d={d} />
      {!muted && <Audio src={staticFile("samecandle/mix.wav")} />}
    </AbsoluteFill>
  );
};

/** Cover: the beam through the three identical candles, every future visible. */
export const SameCandleCover: React.FC = () => {
  const d = direct(E("laneC") + 30);
  d.post = { A: 24, B: 24, C: 24 };
  d.beam = 1;
  d.heroGlow = 1;
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Cinema d={d} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,5,9,0.85) 0%, rgba(3,5,9,0.2) 30%, rgba(3,5,9,0) 60%, rgba(3,5,9,0.8) 100%)" }} />
      <div style={{ position: "absolute", top: 170, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ ...sans(700), fontSize: 34, color: "#ffc861", letterSpacing: 12 }}>{C.kicker}</div>
        <div style={{ ...sans(900), fontSize: 140, color: "#fff", letterSpacing: 6, marginTop: 10, textShadow: "0 0 40px rgba(255,120,90,0.45), 0 6px 30px rgba(0,0,0,0.8)" }}>{C.title}</div>
        <div style={{ ...sans(900), fontSize: 86, color: "#ffc861", letterSpacing: 14, marginTop: 6 }}>为什么结局完全不同？</div>
      </div>
      <div style={{ position: "absolute", bottom: 250, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 22 }}>
        {(["A", "B", "C"] as const).map((id) => (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderRadius: 16, background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.16)" }}>
            <div style={{ ...sans(900), fontSize: 44, color: "#f5f7fa" }}>{C.lane[id].name}</div>
            <div style={{ ...num(700), fontSize: 36, color: "#ffc861" }}>{C.lane[id].pct}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
