// Alternative far fields for the shared World: what stands on the horizon behind the data.
// Each is our own take on "the distance", built from the film's subject rather than scenery:
//
//   skyline - a city whose towers are a candlestick chart wrapped round the horizon:
//             each building is a candle body, its antenna the wick, lit windows on the facades
//   lattice - a sea of points whose mountains are normal distributions (bell curves),
//             breathing slowly, with a radar sweep passing over them
//   orbit   - a giant wireframe planet rising behind the data, eclipsing the light source,
//             with a ring of data points orbiting it
//
// Same rule as the ridges: everything stays below the bloom threshold, only the data glows.
import { useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "../../lib/rng";

const BODY = new THREE.Color("#04060c");
const HAZE = new THREE.Color("#0e1322");
const RIM = new THREE.Color("#d9a35a");
const STEEL = new THREE.Color("#86b7dc");

// Far points are only 2-4 px wide, where the soft halo sprite would vanish: a crisp dot instead.
const DOT_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, smoothstep(0.5, 0.15, d) * vAlpha);
}
`;

type FarProps = { sun: THREE.Vector2; time: number; intensity: number };

// ---------------------------------------------------------------- skyline

const windowVertex = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uBlink;
attribute vec3 aRand; // phase, haze, warmth
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(420.0 / -mv.z, 2.0, 4.0) * (1.0 + uBlink * 0.5);
  vColor = mix(vec3(0.55, 0.72, 0.92), vec3(1.0, 0.8, 0.52), aRand.z);
  // windows switch on and off now and then; antenna tips blink
  float slot = floor(uTime * 0.3 + aRand.x * 7.0);
  float on = step(0.3, fract(sin(slot * 12.9898 + aRand.x * 78.233) * 43758.5453));
  float blink = pow(max(sin(uTime * 2.2 + aRand.x * 40.0), 0.0), 10.0);
  float a = mix((0.08 + 0.2 * fract(aRand.x * 91.0)) * on, 0.06 + 0.45 * blink, uBlink);
  vAlpha = a * (1.0 - aRand.y * 0.75) * uIntensity;
}
`;

const SKYLINE = [
  { r: 85, h: 7, haze: 0.1, w: 1.1 },
  { r: 130, h: 11, haze: 0.35, w: 1.6 },
  { r: 190, h: 17, haze: 0.62, w: 2.2 },
];

const buildSkyline = (sun: THREE.Vector2) => {
  const rand = mulberry32(911);
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const edge: number[] = [];
  const edgeCol: number[] = [];
  const win: number[] = [];
  const winR: number[] = [];
  const tip: number[] = [];
  const tipR: number[] = [];
  for (const ring of SKYLINE) {
    const n = Math.floor((Math.PI * 2 * ring.r) / (ring.w * 1.6));
    // a price series that closes on itself around the circle
    const walk = [0];
    for (let i = 1; i <= n; i++) walk.push(walk[i - 1] + (rand() - 0.5) * 2 + Math.sin(i * 0.05) * 0.3);
    const drift = walk[n] / n;
    const series = walk.map((w, i) => w - drift * i);
    const lo = Math.min(...series);
    const hi = Math.max(...series);
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * Math.PI * 2;
      const c = new THREE.Vector2(Math.cos(t), Math.sin(t));
      const tan = new THREE.Vector2(-c.y, c.x).multiplyScalar(ring.w / 2);
      const open = (series[i] - lo) / (hi - lo);
      const close = (series[i + 1] - lo) / (hi - lo);
      const top = ring.h * (0.18 + 0.82 * Math.max(open, close)) * (0.85 + 0.3 * rand());
      const toward = Math.max(0, c.x * sun.x + c.y * sun.y);
      const rim = Math.pow(toward, 4) * (1 - ring.haze * 0.5);
      const base = BODY.clone().lerp(HAZE, ring.haze);
      const crown = base.clone().lerp(RIM, rim * 0.06).lerp(HAZE, ring.haze * 0.2);
      const x = c.x * ring.r;
      const z = c.y * ring.r;
      const a = pos.length / 3;
      pos.push(x - tan.x, -2, z - tan.y, x + tan.x, -2, z + tan.y, x - tan.x, top, z - tan.y, x + tan.x, top, z + tan.y);
      col.push(base.r, base.g, base.b, base.r, base.g, base.b, crown.r, crown.g, crown.b, crown.r, crown.g, crown.b);
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      // the lit roof edge
      const ec = RIM.clone().multiplyScalar(rim * 0.35).add(STEEL.clone().multiplyScalar(0.035 * (1 - ring.haze)));
      edge.push(x - tan.x, top, z - tan.y, x + tan.x, top, z + tan.y);
      edgeCol.push(ec.r, ec.g, ec.b, ec.r, ec.g, ec.b);
      // the wick becomes an antenna mast
      const wick = top + ring.h * (0.04 + rand() * 0.16);
      const wc = STEEL.clone().multiplyScalar(0.06 * (1 - ring.haze * 0.6));
      edge.push(x, top, z, x, wick, z);
      edgeCol.push(wc.r, wc.g, wc.b, wc.r, wc.g, wc.b);
      if (rand() < 0.35) {
        tip.push(x, wick, z);
        tipR.push(rand(), ring.haze, 0.9);
      }
      // windows, pulled towards the centre so they never fight the facade for depth
      const inset = c.clone().multiplyScalar(-0.9);
      const rows = Math.floor(top / (0.9 + ring.haze));
      for (let k = 1; k < rows; k++)
        for (const s of [-0.5, 0, 0.5]) {
          if (rand() > 0.22) continue;
          win.push(x + tan.x * s * 1.4 + inset.x, k * (0.9 + ring.haze), z + tan.y * s * 1.4 + inset.y);
          winR.push(rand(), ring.haze, rand() < 0.7 ? 0.85 : 0.1);
        }
    }
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  body.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  body.setIndex(idx);
  const edges = new THREE.BufferGeometry();
  edges.setAttribute("position", new THREE.Float32BufferAttribute(edge, 3));
  edges.setAttribute("color", new THREE.Float32BufferAttribute(edgeCol, 3));
  const pts = (p: number[], r: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("aRand", new THREE.Float32BufferAttribute(r, 3));
    return g;
  };
  return { body, edges, windows: pts(win, winR), tips: pts(tip, tipR) };
};

const pointMat = (vertexShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({ vertexShader, fragmentShader: DOT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms });

export const Skyline: React.FC<FarProps> = ({ sun, time, intensity }) => {
  const p = useMemo(() => {
    const g = buildSkyline(sun);
    const bodyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const edges = new THREE.LineSegments(g.edges, edgeMat);
    edges.frustumCulled = false;
    const winMat = pointMat(windowVertex, { uTime: { value: 0 }, uIntensity: { value: 1 }, uBlink: { value: 0 } });
    const tipMat = pointMat(windowVertex, { uTime: { value: 0 }, uIntensity: { value: 1 }, uBlink: { value: 1 } });
    return { ...g, bodyMat, edges, winMat, tipMat };
  }, [sun]);
  for (const m of [p.winMat, p.tipMat]) {
    m.uniforms.uTime.value = time;
    m.uniforms.uIntensity.value = intensity;
  }
  return (
    <group>
      <mesh geometry={p.body} material={p.bodyMat} frustumCulled={false} />
      <primitive object={p.edges} />
      <points geometry={p.windows} material={p.winMat} frustumCulled={false} />
      <points geometry={p.tips} material={p.tipMat} frustumCulled={false} />
    </group>
  );
};

// ---------------------------------------------------------------- lattice

const BELLS = 9;
const latticeVertex = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uSun;
uniform vec4 uBells[${BELLS}]; // centre x, centre z, sigma, height
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec3 p = position;
  float r = length(p.xz);
  float h = 0.0;
  for (int i = 0; i < ${BELLS}; i++) {
    vec4 b = uBells[i];
    vec2 d = p.xz - b.xy;
    float breathe = 0.82 + 0.18 * sin(uTime * 0.22 + float(i) * 1.7);
    h += b.w * breathe * exp(-dot(d, d) / (2.0 * b.z * b.z));
  }
  h += 0.5 * sin(r * 0.11 - uTime * 0.6);
  h *= smoothstep(42.0, 90.0, r);
  p.y = max(h, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(420.0 / -mv.z, 2.0, 3.6);

  float crest = clamp(p.y / 30.0, 0.0, 1.0);
  float toward = max(dot(normalize(vec3(p.x, 0.0, p.z) + 1e-5), uSun), 0.0);
  float haze = smoothstep(60.0, 240.0, r);
  // a slow radar sweep, leaving a fading trail
  float ang = atan(p.z, p.x);
  float lag = mod(uTime * 0.35 - ang, 6.28318);
  float sweep = exp(-lag * 2.2) * smoothstep(42.0, 90.0, r);
  vColor = mix(vec3(0.45, 0.62, 0.86), vec3(1.0, 0.76, 0.46), clamp(pow(toward, 3.0) * (0.3 + crest) + sweep * 0.3, 0.0, 1.0));
  vAlpha = (0.04 + 0.55 * crest + 0.25 * sweep) * (1.0 - haze * 0.7) * uIntensity;
}
`;

export const Lattice: React.FC<FarProps> = ({ sun, time, intensity }) => {
  const p = useMemo(() => {
    const rand = mulberry32(377);
    const pos: number[] = [];
    const RINGS = 150;
    for (let k = 0; k < RINGS; k++) {
      const r = 38 + 202 * Math.pow(k / (RINGS - 1), 1.35);
      const n = Math.round(r * 2.4);
      const off = rand() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const t = off + (i / n) * Math.PI * 2;
        pos.push(Math.cos(t) * r, 0, Math.sin(t) * r);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const bells = Array.from({ length: BELLS }, (_, i) => {
      const t = (i / BELLS) * Math.PI * 2 + rand() * 0.5;
      const r = 105 + rand() * 95;
      return new THREE.Vector4(Math.cos(t) * r, Math.sin(t) * r, 14 + rand() * 16, 18 + rand() * 20);
    });
    const mat = pointMat(latticeVertex, {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uSun: { value: new THREE.Vector3(sun.x, 0, sun.y) },
      uBells: { value: bells },
    });
    return { geo, mat };
  }, [sun]);
  p.mat.uniforms.uTime.value = time;
  p.mat.uniforms.uIntensity.value = intensity;
  return <points geometry={p.geo} material={p.mat} frustumCulled={false} />;
};

// ---------------------------------------------------------------- orbit

const planetVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vObj;
varying vec3 vWorld;
void main(){
  vObj = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const planetFrag = /* glsl */ `
uniform vec3 uLight;
uniform float uIntensity;
uniform float uSpin;
varying vec3 vN;
varying vec3 vObj;
varying vec3 vWorld;
void main(){
  vec3 n = normalize(vN);
  vec3 vd = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(n, vd), 0.0), 3.0);
  float lit = max(dot(n, uLight), 0.0);
  vec3 o = normalize(vObj);
  float lon = atan(o.z, o.x) + uSpin;
  float lat = asin(clamp(o.y, -1.0, 1.0));
  vec2 g = vec2(lon, lat) / (3.14159265 / 18.0);
  vec2 gg = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = 1.0 - min(min(gg.x, gg.y), 1.0);
  vec3 col = vec3(0.004, 0.006, 0.012);
  col += vec3(0.4, 0.56, 0.8) * line * 0.045 * (1.0 - fres);
  col += vec3(1.0, 0.68, 0.38) * fres * pow(lit, 1.4) * 0.55;
  col += vec3(0.4, 0.55, 0.8) * fres * 0.05;
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`;
const ringVertex = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uInner;
attribute vec3 aRand; // radius, angle, brightness
varying vec3 vColor;
varying float vAlpha;
void main(){
  float a = aRand.y + uTime * 0.05 * pow(uInner / aRand.x, 1.5);
  vec3 p = vec3(cos(a) * aRand.x, position.y, sin(a) * aRand.x);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(420.0 / -mv.z, 2.0, 3.4);
  vColor = mix(vec3(0.5, 0.68, 0.9), vec3(1.0, 0.78, 0.5), aRand.z);
  vAlpha = (0.06 + 0.16 * aRand.z) * uIntensity;
}
`;

const PLANET_R = 52;
const PLANET_D = 225;

export const Orbit: React.FC<FarProps & { sunMat: THREE.SpriteMaterial }> = ({ sun, time, intensity, sunMat }) => {
  const p = useMemo(() => {
    const light = new THREE.Vector3(sun.x, 0.75, sun.y).normalize();
    const planet = new THREE.ShaderMaterial({
      vertexShader: planetVertex,
      fragmentShader: planetFrag,
      uniforms: { uLight: { value: light }, uIntensity: { value: 1 }, uSpin: { value: 0 } },
    });
    const rand = mulberry32(5150);
    const N = 26000;
    const inner = PLANET_R * 1.35;
    const r = new Float32Array(N * 3);
    const ps = new Float32Array(N * 3);
    // banded radii, with gaps, like a real ring system
    const bands = [
      [1.35, 1.6, 0.6],
      [1.66, 1.98, 1.0],
      [2.05, 2.12, 0.4],
      [2.2, 2.55, 0.7],
    ];
    for (let i = 0; i < N; i++) {
      const b = bands[Math.floor(rand() * bands.length)];
      r[i * 3] = PLANET_R * (b[0] + rand() * (b[1] - b[0]));
      r[i * 3 + 1] = rand() * Math.PI * 2;
      r[i * 3 + 2] = b[2] * Math.pow(rand(), 2);
      ps[i * 3 + 1] = (rand() - 0.5) * 0.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(ps, 3));
    geo.setAttribute("aRand", new THREE.BufferAttribute(r, 3));
    const ring = pointMat(ringVertex, { uTime: { value: 0 }, uIntensity: { value: 1 }, uInner: { value: inner } });
    // tilt the ring plane towards the viewer, and roll it a little for a diagonal sweep
    const yaw = Math.atan2(sun.x, sun.y);
    return { planet, ring, geo, yaw };
  }, [sun]);
  p.planet.uniforms.uIntensity.value = intensity;
  p.planet.uniforms.uSpin.value = time * 0.01;
  p.ring.uniforms.uTime.value = time;
  p.ring.uniforms.uIntensity.value = intensity;
  const c: [number, number, number] = [sun.x * PLANET_D, 30, sun.y * PLANET_D];
  // the light source sits just behind the planet's upper limb: an eclipse corona
  const corona: [number, number, number] = [sun.x * (PLANET_D + 60), 30 + PLANET_R * 0.55, sun.y * (PLANET_D + 60)];
  return (
    <group>
      <sprite material={sunMat} position={corona} scale={[230, 150, 1]} renderOrder={-8} />
      <group position={c}>
        <mesh material={p.planet} frustumCulled={false}>
          <sphereGeometry args={[PLANET_R, 96, 64]} />
        </mesh>
        <group rotation={[0, p.yaw, 0]}>
          <group rotation={[0.22, 0, 0.32]}>
            <points geometry={p.geo} material={p.ring} frustumCulled={false} />
          </group>
        </group>
      </group>
    </group>
  );
};
