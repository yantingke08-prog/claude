import { useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "../lib/rng";
import { SIMPLEX_3D, SOFT_POINT_FRAG } from "../lib/glsl";

const vertex = /* glsl */ `
uniform float uProgress;
uniform float uScatter;
uniform float uTime;
uniform float uSize;
uniform float uOpacity;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
attribute vec3 aStart;
attribute vec4 aRand;
varying vec3 vColor;
varying float vAlpha;
${SIMPLEX_3D}

vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
float easeInOutCubic(float t){ return t < 0.5 ? 4.0*t*t*t : 1.0 - pow(-2.0*t + 2.0, 3.0) / 2.0; }

void main(){
  // Each particle leaves on its own schedule: a staggered, organic convergence.
  float delay = aRand.x * 0.42;
  float p = clamp((uProgress - delay) / 0.58, 0.0, 1.0);
  float e = easeInOutCubic(p);

  // Start state: a differentially rotating galaxy (inner stars orbit faster).
  float r = length(aStart.xz);
  vec3 start = rotY(aStart, uTime * 1.1 / (0.6 + r * 0.22));

  vec3 pos = mix(start, position, e);

  // In flight, particles ride a simplex-noise flow field; it fades to zero on arrival.
  float flight = sin(p * 3.14159);
  vec3 q = start * 0.18 + vec3(0.0, 0.0, uTime * 0.25);
  vec3 flow = vec3(snoise(q), snoise(q + 17.3), snoise(q + 41.7));
  pos += flight * flow * (1.6 + aRand.y * 2.2);

  // Settled particles keep breathing so the logo never looks frozen.
  pos += e * 0.025 * vec3(sin(uTime * 2.1 + aRand.w * 40.0), cos(uTime * 1.7 + aRand.z * 40.0), sin(uTime * 1.3 + aRand.y * 40.0));

  // Scatter: blast outward and toward the lens.
  float s = uScatter * uScatter;
  vec3 dir = normalize(vec3(position.xy, 0.0) + (aRand.xyz - 0.5) * 3.0 + vec3(0.0, 0.0, 0.001));
  pos += dir * s * (8.0 + aRand.y * 20.0);
  pos.z += s * (aRand.z * 26.0 - 4.0);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float twinkle = 0.7 + 0.3 * sin(uTime * (3.0 + aRand.z * 6.0) + aRand.x * 60.0);
  gl_PointSize = uSize * (0.45 + aRand.y * 0.9) * twinkle * (1.0 + flight * 0.25) * (34.0 / max(-mv.z, 0.5));

  vec3 chaos = mix(uColA, uColB, aRand.z);
  // In flight: saturated cyan/magenta streaks rather than white mush.
  vec3 streak = mix(vec3(0.15, 0.75, 1.0), uColB, step(0.6, aRand.w));
  vColor = mix(mix(chaos, streak, flight), uColC, e * (0.55 + 0.45 * aRand.w));
  vAlpha = uOpacity * (0.55 + 0.45 * e) * (1.0 - flight * 0.35) * (1.0 - s * 0.8);
}
`;

export type StartShape = "galaxy" | "shell";

const buildStart = (count: number, shape: StartShape, seed: number) => {
  const rand = mulberry32(seed);
  const start = new Float32Array(count * 3);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number;
    if (shape === "galaxy") {
      const arms = 3;
      const radius = 0.8 + Math.pow(rand(), 1.35) * 13.5;
      const arm = ((i % arms) / arms) * Math.PI * 2;
      const angle = arm + radius * 0.42 + gauss() * 0.35;
      x = Math.cos(angle) * radius + gauss() * 0.6;
      z = Math.sin(angle) * radius + gauss() * 0.6;
      y = gauss() * (0.25 + 1.2 / radius);
    } else {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const rr = 14 + rand() * 18;
      x = Math.sqrt(1 - u * u) * Math.cos(th) * rr;
      y = u * rr * 0.7;
      z = Math.sqrt(1 - u * u) * Math.sin(th) * rr - 6;
    }
    start[i * 3] = x;
    start[i * 3 + 1] = y;
    start[i * 3 + 2] = z;
  }
  return start;
};

export const ParticleMorph: React.FC<{
  targets: Float32Array;
  progress: number;
  time: number;
  scatter?: number;
  size?: number;
  opacity?: number;
  colors?: [string, string, string];
  start?: StartShape;
  seed?: number;
  tilt?: number;
}> = ({
  targets,
  progress,
  time,
  scatter = 0,
  size = 2.2,
  opacity = 1,
  colors = ["#6a4dff", "#ff3fd0", "#bff6ff"],
  start = "galaxy",
  seed = 11,
  tilt = 0.95,
}) => {
  const count = targets.length / 3;
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(targets, 3));
    geometry.setAttribute("aStart", new THREE.BufferAttribute(buildStart(count, start, seed), 3));
    const rand = mulberry32(seed * 31 + 5);
    const r4 = new Float32Array(count * 4);
    for (let i = 0; i < r4.length; i++) r4[i] = rand();
    geometry.setAttribute("aRand", new THREE.BufferAttribute(r4, 4));
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: SOFT_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uProgress: { value: 0 },
        uScatter: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: size },
        uOpacity: { value: opacity },
        uColA: { value: new THREE.Color(colors[0]) },
        uColB: { value: new THREE.Color(colors[1]) },
        uColC: { value: new THREE.Color(colors[2]) },
      },
    });
    return { geometry, material };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets]);

  const u = material.uniforms;
  u.uProgress.value = progress;
  u.uScatter.value = scatter;
  u.uTime.value = time;
  u.uSize.value = size;
  u.uOpacity.value = opacity;

  // The galaxy lies in the XZ plane; tilt it toward camera so we see the spiral, then
  // straighten as particles arrive so the logo faces the lens.
  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      rotation={[start === "galaxy" ? tilt * (1 - Math.min(1, progress * 1.6)) : 0, 0, 0]}
    />
  );
};
