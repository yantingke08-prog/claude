// The only 3D in v3: the opening macro of the big candle and one pull-back that lands exactly on the 2D rows
// (frames 0–40). The camera ends on the locked frontal pose whose projection equals the 2D layout, so the
// 4-frame dissolve into the 2D layer has nothing to jump.
import { Environment, Lightformer } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { E } from "./cue";
import { HERO, LANES } from "./data";
import { CUT, DISSOLVE, H, IDS, W, bodyW, cx, cy, rowChart, slot } from "./layout";
import { PAL } from "./Stage";

const FOV = 22;
const DZ = 50;
const K = (2 * DZ * Math.tan(((FOV / 2) * Math.PI) / 180)) / H;
const toWorld = (x: number, y: number) => new THREE.Vector3((x - W / 2) * K, (H / 2 - y) * K, 0);
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

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

const heroB = toWorld(cx(rowChart(1), HERO), cy(rowChart(1), 104));
const LOCK = { pos: new THREE.Vector3(0, 0, DZ), target: new THREE.Vector3(0, 0, 0), fov: FOV };
const MACRO = { pos: heroB.clone().add(new THREE.Vector3(1.0, 0.5, 1.5)), target: heroB.clone().add(new THREE.Vector3(0.02, 0.03, 0)), fov: 30 };
/** one move: hold the macro, pull straight back, arrive locked at frame 36 */
export const camAt = (f: number) => {
  const t = smooth((f - E("pull")) / (CUT.rows - DISSOLVE - E("pull")));
  const u = 1 - Math.pow(1 - t, 2.2);
  return {
    pos: new THREE.Vector3().lerpVectors(MACRO.pos, LOCK.pos, u),
    target: new THREE.Vector3().lerpVectors(MACRO.target, LOCK.target, Math.min(1, u * 1.15)),
    fov: FOV + (MACRO.fov - FOV) * (1 - t),
    dof: 1 - smooth((f - E("pull") - 4) / 14),
  };
};

const Rig: React.FC<{ f: number }> = ({ f }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const c = camAt(f);
  camera.position.copy(c.pos);
  camera.fov = c.fov;
  camera.near = 0.05;
  camera.far = 200;
  camera.lookAt(c.target);
  camera.updateProjectionMatrix();
  return null;
};

const mat = (color: string, deep: string, glow = 0.6) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.05, emissive: deep, emissiveIntensity: glow, sheen: 0.35, sheenColor: new THREE.Color("#ffffff") });

const Candles3D: React.FC = () => {
  const items = useMemo(() => {
    const up = mat(PAL.up, "#7a0512");
    const hero = mat("#ff3a4e", "#a40818", 1.4);
    const down = mat(PAL.down, "#035238");
    const out: { geo: THREE.BufferGeometry; m: THREE.Material; p: THREE.Vector3 }[] = [];
    IDS.forEach((id, k) => {
      const c = rowChart(k);
      const bw = bodyW(c);
      const ww = Math.max(2, Math.min(5, slot(c) * 0.075));
      for (let i = Math.ceil(c.i0); i <= HERO; i++) {
        const b = LANES[id][i];
        const yT = cy(c, Math.max(b.o, b.c));
        const yB = cy(c, Math.min(b.o, b.c));
        const h = Math.max(2, yB - yT);
        const m = i === HERO ? hero : b.c >= b.o ? up : down;
        const r = Math.max(0.0005, Math.min(bw * 0.18, h / 2 - 0.05) * K);
        out.push({ geo: new RoundedBoxGeometry(bw * K, h * K, bw * 0.9 * K, 3, r), m, p: toWorld(cx(c, i), (yT + yB) / 2) });
        const yH = cy(c, b.h);
        const yL = cy(c, b.l);
        out.push({ geo: new RoundedBoxGeometry(ww * K, Math.max(1, yL - yH) * K, ww * K, 2, (ww / 2.2) * K), m, p: toWorld(cx(c, i), (yH + yL) / 2) });
      }
    });
    return out;
  }, []);
  return (
    <>
      {items.map((x, j) => (
        <mesh key={j} geometry={x.geo} material={x.m} position={x.p} />
      ))}
    </>
  );
};

export const Opening3D: React.FC<{ f: number }> = ({ f }) => {
  const { width, height } = useVideoConfig();
  const c = camAt(f);
  const focus = c.pos.distanceTo(c.target);
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: FOV, position: [0, 0, DZ], near: 0.05, far: 200 }} gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
      <color attach="background" args={[PAL.bg]} />
      <Rig f={f} />
      <Environment frames={1} resolution={256}>
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[-6, 9, 6]} scale={[14, 5, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#9fc8ff" position={[8, 1, 5]} scale={[4, 12, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffb48a" position={[-8, -6, 4]} scale={[6, 6, 1]} />
      </Environment>
      <ambientLight intensity={0.25} />
      <directionalLight position={[-4, 6, 10]} intensity={1.4} />
      <Candles3D />
      <EffectComposer multisampling={4} enableNormalPass={false}>
        {c.dof > 0.02 ? <DepthOfField worldFocusDistance={focus} worldFocusRange={focus * 0.35} bokehScale={4 * c.dof} /> : <></>}
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.66} luminanceSmoothing={0.25} radius={0.65} />
        <Vignette eskil={false} offset={0.3} darkness={0.6} />
      </EffectComposer>
      <Settle />
    </ThreeCanvas>
  );
};
