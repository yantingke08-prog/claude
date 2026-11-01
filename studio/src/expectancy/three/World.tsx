// One landscape shared by every chapter, so the film reads as a single place rather than
// objects floating in a void. Built in depth layers that all share one light source:
//
//   far   - night sky dome with a warm horizon band, stars, the sun glow behind the ridges
//   mid   - four rings of mountain ridges, each hazier than the last (atmospheric depth),
//           rim-lit on the side facing the sun; a dark ground with a faint sun reflection
//   near  - a few drifting dust motes catching the light
//
// The data lives above the ground in front of the sun. Everything here is kept well below
// the bloom threshold: the environment sets the mood, the data stays the brightest thing.
import { useMemo } from "react";
import * as THREE from "three";
import { SOFT_POINT_FRAG } from "../../lib/glsl";
import { mulberry32 } from "../../lib/rng";

export const WORLD = {
  zenith: new THREE.Color("#02040a"),
  horizon: new THREE.Color("#0e1322"),
  glow: new THREE.Color("#c8873a"),
  ridge: new THREE.Color("#04060c"),
  rim: new THREE.Color("#d9a35a"),
};

export type WorldProps = {
  /** world centre (where the data sits) */
  center?: [number, number, number];
  /** ground height in data units - keep it below the lowest data point */
  groundY: number;
  /** horizontal direction from the centre towards the sun: put it behind the data */
  sun: [number, number];
  /** overall size; 1 suits a data block about 20 units wide */
  scale?: number;
  time: number;
  /** 0..1 overall brightness of the environment */
  intensity?: number;
};

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const skyFrag = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform float uIntensity;
varying vec3 vDir;
void main(){
  float y = vDir.y;
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.5, y));
  float toward = max(dot(normalize(vec3(vDir.x, 0.0, vDir.z) + 1e-5), uSun), 0.0);
  float band = exp(-abs(y - 0.015) * 16.0);
  col += uGlow * band * (0.05 + 0.38 * pow(toward, 5.0));
  col = mix(col, uZenith, smoothstep(0.0, -0.15, y));
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`;

const groundVertex = /* glsl */ `
varying vec3 vWorld;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const groundFrag = /* glsl */ `
uniform vec3 uCenter;
uniform vec3 uSun;
uniform vec3 uGlow;
uniform float uScale;
uniform float uIntensity;
varying vec3 vWorld;
void main(){
  vec2 d = (vWorld.xz - uCenter.xz) / uScale;
  float dist = length(d);
  vec3 col = vec3(0.006, 0.008, 0.015);
  // a long, soft reflection of the sun glow across the ground
  float toward = max(dot(normalize(vec3(d.x, 0.0, d.y) + 1e-5), uSun), 0.0);
  col += uGlow * pow(toward, 10.0) * smoothstep(10.0, 150.0, dist) * 0.22;
  // survey grid near the data, dissolving into the distance
  vec2 g = abs(fract(d / 4.0 - 0.5) - 0.5) / fwidth(d / 4.0);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  col += vec3(0.35, 0.3, 0.22) * line * 0.022 * (1.0 - smoothstep(12.0, 55.0, dist));
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`;

const moteVertex = /* glsl */ `
uniform float uTime;
uniform float uScale;
attribute vec3 aRand;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.15 + aRand.x * 30.0) * 1.5 * uScale;
  p.y += sin(uTime * 0.11 + aRand.y * 30.0) * 0.8 * uScale;
  p.z += cos(uTime * 0.13 + aRand.z * 30.0) * 1.5 * uScale;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp((1.0 + aRand.x * 2.0) * 22.0 / -mv.z, 1.0, 6.0);
  vColor = vec3(0.85, 0.66, 0.42);
  vAlpha = 0.18 + 0.25 * aRand.y;
}
`;

const starVertex = /* glsl */ `
uniform float uTime;
attribute vec2 aRand;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.6 + 0.4 * sin(uTime * (0.6 + aRand.x * 2.0) + aRand.y * 70.0);
  gl_PointSize = (0.8 + aRand.x * 1.6) * tw * 2.0;
  vColor = mix(vec3(0.7, 0.75, 1.0), vec3(1.0, 0.85, 0.65), aRand.y);
  vAlpha = 0.25 + aRand.x * 0.45;
}
`;

/** Ridge profile around the full circle: layered sines, sharpened into peaks. */
const ridgeProfile = (rand: () => number) => {
  const octaves = Array.from({ length: 6 }, (_, k) => ({ f: 2 + k * 3 + Math.floor(rand() * 3), p: rand() * Math.PI * 2, a: 1 / (k + 1.2) }));
  return (t: number) => {
    let h = 0;
    for (const o of octaves) h += o.a * (1 - Math.abs(Math.sin(t * o.f * 0.5 + o.p)));
    return h;
  };
};

const buildRidge = (radius: number, height: number, haze: number, seed: number, sun: THREE.Vector2) => {
  const prof = ridgeProfile(mulberry32(seed));
  const SEG = 720;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const crest: number[] = [];
  const crestCol: number[] = [];
  let maxH = 0;
  const hs = Array.from({ length: SEG + 1 }, (_, i) => {
    const v = prof((i / SEG) * Math.PI * 2);
    maxH = Math.max(maxH, v);
    return v;
  });
  for (let i = 0; i <= SEG; i++) {
    const t = (i / SEG) * Math.PI * 2;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    const y = 0.15 * height + (hs[i] / maxH) * height * 0.85;
    const toward = Math.max(0, (Math.cos(t) * sun.x + Math.sin(t) * sun.y));
    const rim = Math.pow(toward, 4) * (1 - haze * 0.5);
    const base = WORLD.ridge.clone().lerp(WORLD.horizon, haze);
    const top = base.clone().lerp(WORLD.rim, rim * 0.08).lerp(WORLD.horizon, haze * 0.25);
    pos.push(x, -2, z, x, y, z);
    col.push(base.r, base.g, base.b, top.r, top.g, top.b);
    crest.push(x, y, z);
    const c = WORLD.rim.clone().multiplyScalar(rim * 0.4);
    crestCol.push(c.r, c.g, c.b);
    if (i < SEG) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const c = new THREE.BufferGeometry();
  c.setAttribute("position", new THREE.Float32BufferAttribute(crest, 3));
  c.setAttribute("color", new THREE.Float32BufferAttribute(crestCol, 3));
  return { body: g, crest: c };
};

const sunTexture = () => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,214,150,1)");
  g.addColorStop(0.18, "rgba(240,170,90,0.55)");
  g.addColorStop(0.5, "rgba(200,120,60,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(cv);
};

const RIDGES = [
  { r: 70, h: 5.5, haze: 0.06 },
  { r: 105, h: 8.5, haze: 0.28 },
  { r: 150, h: 13, haze: 0.5 },
  { r: 210, h: 19, haze: 0.72 },
];

export const World: React.FC<WorldProps> = ({ center = [0, 0, 0], groundY, sun, scale = 1, time, intensity = 1 }) => {
  const sunV = useMemo(() => new THREE.Vector2(sun[0], sun[1]).normalize(), [sun[0], sun[1]]);
  const parts = useMemo(() => {
    const sky = new THREE.ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSun: { value: new THREE.Vector3(sunV.x, 0, sunV.y) },
        uZenith: { value: WORLD.zenith },
        uHorizon: { value: WORLD.horizon },
        uGlow: { value: WORLD.glow },
        uIntensity: { value: 1 },
      },
    });
    const ground = new THREE.ShaderMaterial({
      vertexShader: groundVertex,
      fragmentShader: groundFrag,
      uniforms: {
        uCenter: { value: new THREE.Vector3() },
        uSun: { value: new THREE.Vector3(sunV.x, 0, sunV.y) },
        uGlow: { value: WORLD.glow },
        uScale: { value: 1 },
        uIntensity: { value: 1 },
      },
    });
    const ridgeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const crestMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const ridges = RIDGES.map((r, i) => {
      const g = buildRidge(r.r, r.h, r.haze, 300 + i * 17, sunV);
      // <line> in JSX means the SVG element, so the crest is built as an object here
      const crest = new THREE.Line(g.crest, crestMat);
      crest.frustumCulled = false;
      return { body: g.body, crest };
    });
    const sunMat = new THREE.SpriteMaterial({ map: sunTexture(), color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

    const rand = mulberry32(61);
    const NS = 1600;
    const sp = new Float32Array(NS * 3);
    const sr = new Float32Array(NS * 2);
    for (let i = 0; i < NS; i++) {
      const u = 0.08 + rand() * 0.92;
      const th = rand() * Math.PI * 2;
      const r = 260;
      sp[i * 3] = Math.cos(th) * Math.sqrt(1 - u * u) * r;
      sp[i * 3 + 1] = u * r;
      sp[i * 3 + 2] = Math.sin(th) * Math.sqrt(1 - u * u) * r;
      sr[i * 2] = Math.pow(rand(), 3);
      sr[i * 2 + 1] = rand();
    }
    const stars = new THREE.BufferGeometry();
    stars.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    stars.setAttribute("aRand", new THREE.BufferAttribute(sr, 2));
    const starMat = new THREE.ShaderMaterial({ vertexShader: starVertex, fragmentShader: SOFT_POINT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } } });

    const NM = 500;
    const mp = new Float32Array(NM * 3);
    const mr = new Float32Array(NM * 3);
    for (let i = 0; i < NM; i++) {
      const a = rand() * Math.PI * 2;
      const r = 6 + Math.sqrt(rand()) * 45;
      mp[i * 3] = Math.cos(a) * r;
      mp[i * 3 + 1] = rand() * 14;
      mp[i * 3 + 2] = Math.sin(a) * r;
      mr[i * 3] = rand();
      mr[i * 3 + 1] = rand();
      mr[i * 3 + 2] = rand();
    }
    const motes = new THREE.BufferGeometry();
    motes.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    motes.setAttribute("aRand", new THREE.BufferAttribute(mr, 3));
    const moteMat = new THREE.ShaderMaterial({ vertexShader: moteVertex, fragmentShader: SOFT_POINT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uScale: { value: 1 } } });
    return { sky, ground, ridgeMat, crestMat, ridges, sunMat, stars, starMat, motes, moteMat };
  }, [sunV]);

  const [cx, , cz] = center;
  parts.sky.uniforms.uIntensity.value = intensity;
  (parts.ground.uniforms.uCenter.value as THREE.Vector3).set(cx, groundY, cz);
  parts.ground.uniforms.uScale.value = scale;
  parts.ground.uniforms.uIntensity.value = intensity;
  parts.starMat.uniforms.uTime.value = time;
  parts.moteMat.uniforms.uTime.value = time;
  parts.moteMat.uniforms.uScale.value = scale;
  parts.sunMat.opacity = 0.55 * intensity;
  const sunPos: [number, number, number] = [sunV.x * 240, 3, sunV.y * 240];

  return (
    <group position={[cx, groundY, cz]} scale={scale}>
      <mesh material={parts.sky} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[300, 48, 24]} />
      </mesh>
      <points geometry={parts.stars} material={parts.starMat} frustumCulled={false} renderOrder={-9} />
      <sprite material={parts.sunMat} position={sunPos} scale={[260, 110, 1]} renderOrder={-8} />
      {parts.ridges.map((r, i) => (
        <group key={i}>
          <mesh geometry={r.body} material={parts.ridgeMat} frustumCulled={false} />
          <primitive object={r.crest} />
        </group>
      ))}
      <mesh material={parts.ground} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <circleGeometry args={[240, 96]} />
      </mesh>
      <points geometry={parts.motes} material={parts.moteMat} frustumCulled={false} />
    </group>
  );
};
