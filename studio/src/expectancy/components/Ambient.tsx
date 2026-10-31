import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, Glow, Stage, Starfield } from "../../components/Stage";
import { SIMPLEX_3D, SOFT_POINT_FRAG } from "../../lib/glsl";
import { mulberry32 } from "../../lib/rng";
import { SCRIPT, sceneStart } from "../timeline.ts";
import { accentOf } from "./Chrome";

const vertex = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
attribute vec3 aRand;
varying vec3 vColor;
varying float vAlpha;
${SIMPLEX_3D}
void main(){
  vec3 p = position;
  vec3 q = p * 0.06 + vec3(0.0, 0.0, uTime * 0.04);
  p += vec3(snoise(q), snoise(q + 13.1), snoise(q + 29.7)) * 2.4;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.0 + aRand.x * 2.2) * (26.0 / -mv.z);
  vColor = mix(uColor, vec3(0.55, 0.65, 1.0), aRand.y);
  vAlpha = (0.25 + aRand.z * 0.5) * smoothstep(-70.0, -18.0, mv.z);
}
`;

/** A slow probability-cloud drifting behind every chart; its tint follows the chapter. */
const Cloud: React.FC<{ time: number; color: THREE.Color }> = ({ time, color }) => {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(5);
    const n = 9000;
    const pos = new Float32Array(n * 3);
    const r3 = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rand() - 0.5) * 90;
      pos[i * 3 + 1] = (rand() - 0.5) * 50;
      pos[i * 3 + 2] = -10 - rand() * 60;
      r3[i * 3] = Math.pow(rand(), 2);
      r3[i * 3 + 1] = rand();
      r3[i * 3 + 2] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aRand", new THREE.BufferAttribute(r3, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: SOFT_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() } },
    });
    return { geometry, material };
  }, []);
  material.uniforms.uTime.value = time;
  (material.uniforms.uColor.value as THREE.Color).copy(color);
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

/** Crossfades the chapter accent colour around each scene boundary. */
const chapterColor = (frame: number) => {
  const c = new THREE.Color(accentOf(SCRIPT.scenes[0].id));
  for (const s of SCRIPT.scenes) {
    const k = Math.min(1, Math.max(0, (frame - sceneStart(s.id)) / 45));
    if (k > 0) c.lerp(new THREE.Color(accentOf(s.id)), k);
  }
  return c;
};

export const Ambient: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const color = chapterColor(frame);
  return (
    <Stage bloom={0.9} bloomThreshold={0.2}>
      <CameraRig position={[Math.sin(time * 0.05) * 2, Math.cos(time * 0.04) * 1, 14 - Math.sin(time * 0.03) * 2]} />
      <Starfield time={time} opacity={0.5} count={3000} />
      <Glow position={[-18, 8, -40]} scale={80} color="#2a1aff" intensity={0.16} />
      <Glow position={[20, -10, -45]} scale={70} color="#ff2fb4" intensity={0.06} />
      <Cloud time={time} color={color} />
    </Stage>
  );
};
