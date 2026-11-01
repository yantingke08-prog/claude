import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEffect, useMemo } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { mulberry32 } from "../lib/rng";
import { SOFT_POINT_FRAG } from "../lib/glsl";

/** Full-frame WebGL canvas with the house look: bloom, subtle chroma, grain, vignette. */
export const Stage: React.FC<{
  children: React.ReactNode;
  fov?: number;
  background?: string;
  bloom?: number;
  bloomThreshold?: number;
  chroma?: number;
}> = ({ children, fov = 35, background = "#03040b", bloom = 1.4, bloomThreshold = 0.12, chroma = 0.0005 }) => {
  const { width, height } = useVideoConfig();
  const chromaOffset = useMemo(() => new THREE.Vector2(chroma, chroma * 0.6), [chroma]);
  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      flat
      camera={{ fov, position: [0, 0, 12], near: 0.1, far: 400 }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
    >
      <color attach="background" args={[background]} />
      {children}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={bloom} luminanceThreshold={bloomThreshold} luminanceSmoothing={0.35} radius={0.78} />
        <ChromaticAberration offset={chromaOffset} radialModulation={false} modulationOffset={0} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.22} />
        <Vignette eskil={false} offset={0.22} darkness={0.82} />
      </EffectComposer>
      <PostMountRender />
    </ThreeCanvas>
  );
};

/**
 * ThreeCanvas renders once when the GL context is created, which is *before* the
 * EffectComposer has attached its passes - so the first frame of every render tab
 * (and every still) came out black. Render again after mount, holding the screenshot.
 */
const PostMountRender: React.FC = () => {
  const advance = useThree((s) => s.advance);
  const frame = useCurrentFrame();
  useEffect(() => {
    const handle = delayRender("Post-mount composer render");
    const raf = requestAnimationFrame(() => {
      advance(performance.now());
      continueRender(handle);
    });
    return () => {
      cancelAnimationFrame(raf);
      continueRender(handle);
    };
  }, [advance, frame]);
  return null;
};

/** Drives the camera from props (i.e. from the frame), never from a clock. */
export const CameraRig: React.FC<{ position: [number, number, number]; target?: [number, number, number]; roll?: number; fov?: number }> = ({
  position,
  target = [0, 0, 0],
  roll = 0,
  fov,
}) => {
  const camera = useThree((s) => s.camera);
  if (fov !== undefined && camera instanceof THREE.PerspectiveCamera && camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.position.set(...position);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(...target);
  camera.updateMatrixWorld();
  return null;
};

const starVertex = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
attribute vec2 aRand;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.55 + 0.45 * sin(uTime * (0.8 + aRand.x * 2.5) + aRand.y * 80.0);
  gl_PointSize = (1.0 + aRand.x * 2.6) * tw * 2.2;
  vColor = mix(vec3(0.55, 0.65, 1.0), vec3(1.0, 0.85, 0.75), aRand.y);
  vAlpha = uOpacity * tw * (0.35 + aRand.x * 0.65);
}
`;

export const Starfield: React.FC<{ time: number; count?: number; opacity?: number; rotation?: number }> = ({
  time,
  count = 5000,
  opacity = 1,
  rotation = 0,
}) => {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(99);
    const pos = new Float32Array(count * 3);
    const r2 = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const r = 60 + rand() * 90;
      pos[i * 3] = Math.sqrt(1 - u * u) * Math.cos(th) * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = Math.sqrt(1 - u * u) * Math.sin(th) * r;
      r2[i * 2] = Math.pow(rand(), 3);
      r2[i * 2 + 1] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aRand", new THREE.BufferAttribute(r2, 2));
    const material = new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: SOFT_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    });
    return { geometry, material };
  }, [count]);
  material.uniforms.uTime.value = time;
  material.uniforms.uOpacity.value = opacity;
  return <points geometry={geometry} material={material} frustumCulled={false} rotation={[0.2, rotation, 0]} />;
};

const glowFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(max(0.0, 1.0 - d), 2.2) * uIntensity;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/** A camera-agnostic soft light blob: cheap nebula / backlight. */
export const Glow: React.FC<{
  position?: [number, number, number];
  scale?: number;
  color?: string;
  intensity?: number;
}> = ({ position = [0, 0, -20], scale = 40, color = "#3b2bff", intensity = 0.5 }) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: glowFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity } },
      }),
    [color],
  );
  material.uniforms.uIntensity.value = intensity;
  return (
    <mesh position={position} scale={scale} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};
