import { useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import { useEffect } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { NAME, PCT } from "./beats";
import { direct, type Dir, T } from "./director";
import { fontsReady, num, sans } from "./fonts";
import { Badge, Hud } from "./Hud";
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

/** Drives the R3F camera from the director. After the opening it is locked: the chart plane maps 1:1 to the HUD. */
const Rig: React.FC<{ d: Dir }> = ({ d }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const pos = d.cam.pos.clone();
  if (d.shake > 0) pos.add(new THREE.Vector3(Math.sin(d.f * 7.1) * d.shake, Math.cos(d.f * 5.3) * d.shake, 0));
  camera.position.copy(pos);
  camera.fov = d.cam.fov;
  camera.near = 0.05;
  camera.far = 200;
  camera.lookAt(d.cam.target.clone().add(pos.clone().sub(d.cam.pos)));
  camera.updateProjectionMatrix();
  return null;
};

const Cinema: React.FC<{ d: Dir; dpr?: number }> = ({ d, dpr = 1 }) => {
  const { width, height } = useVideoConfig();
  const focus = d.cam.pos.distanceTo(d.cam.target);
  return (
    <ThreeCanvas width={width} height={height} dpr={dpr} camera={{ fov: 22, position: [0, 0, 50], near: 0.05, far: 200 }} gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
      <color attach="background" args={[PAL.bg]} />
      <Rig d={d} />
      <Scene d={d} />
      <EffectComposer multisampling={4} enableNormalPass={false}>
        {d.dof > 0.02 ? <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.35} bokehScale={4 * d.dof} /> : <></>}
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.66} luminanceSmoothing={0.25} radius={0.65} />
        <Vignette eskil={false} offset={0.3} darkness={0.6} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};

/** The HUD is laid out on a 1080×1920 page; at 2K (1440×2560) it is scaled up as vector text, the 3D is rendered natively. */
const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  const s = width / 1080;
  return <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${s})`, transformOrigin: "0 0" }}>{children}</div>;
};

export const SameCandle2Film: React.FC<{ muted?: boolean; dpr?: number }> = ({ muted = false, dpr = 1 }) => {
  const f = useCurrentFrame();
  const d = direct(f);
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Cinema d={d} dpr={dpr} />
      <Page>
        <Hud d={d} />
      </Page>
      {!muted && <Audio src={staticFile("samecandle2/mix.wav")} />}
    </AbsoluteFill>
  );
};

/** Cover: the three aligned rows, every ending grown, one title. */
export const SameCandle2Cover: React.FC<{ dpr?: number }> = ({ dpr = 1 }) => {
  const d = direct(T.solo - 30);
  (["A", "B", "C"] as const).forEach((id) => {
    d.lanes[id].dimPost = 1;
  });
  d.beam = 1;
  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      <Cinema d={d} dpr={dpr} />
      <Page>
      <div style={{ position: "absolute", left: 64, right: 64, top: 120 }}>
        <div style={{ ...sans(700), fontSize: 34, color: PAL.gold, letterSpacing: 10 }}>K线科普 · 示意图</div>
        <div style={{ ...sans(900), fontSize: 104, color: "#fff", lineHeight: 1.1, marginTop: 10 }}>同一根大阳线</div>
        <div style={{ ...sans(900), fontSize: 64, color: PAL.gold, marginTop: 4 }}>为什么结局完全不同？</div>
      </div>
      {(["A", "B", "C"] as const).map((id, k) => (
        <div key={id}>
          <Badge id={id} x={46} y={372 + k * 380 + 130} size={96} a={1} />
          <div style={{ position: "absolute", left: 790, top: 372 + k * 380 + 104, ...sans(900), fontSize: 54, color: "#fff" }}>{NAME[id]}</div>
          <div style={{ position: "absolute", left: 790, top: 372 + k * 380 + 180, ...num(700), fontSize: 72, color: PCT[id].startsWith("+") ? PAL.up : PAL.down }}>{PCT[id]}</div>
        </div>
      ))}
      </Page>
    </AbsoluteFill>
  );
};
