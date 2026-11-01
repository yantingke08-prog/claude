// Chapter 3 spaces.
//
// Sizing runways:  x = trade (0.06 / trade)   y = log10(wealth) x 1.4   z = person
//   The 2% group runs on the left, the 40% group on the right (offset in x), each in lanes
//   z = 0 .. -3, so the comparison stays left/right from any camera, including head-on.
//   Same strategy, same edge; only the bet size differs.
// Coin game:       x = log10(wealth) x 1.3, particles = players, stacked by count.
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { SOFT_POINT_FRAG } from "../../lib/glsl";
import { ease } from "../../lib/gsap";
import { mulberry32 } from "../../lib/rng";
import { column, ERGO_DOWN, ERGO_PLAYERS, ERGO_UP, getSim, median, SIZING_TRADERS, SIZING_TRADES } from "../sim.ts";

export const SKX = 0.06;
export const SKY = 1.4;
export const LOG_FLOOR = -6;
export const SHOWN = 300;
const LANE = 0.01;
export const RUN_LEN = SIZING_TRADES * SKX;
export const GROUP_X = { s2: 0, s40: RUN_LEN + 6 } as const;
export const GROUP_Z = { s2: 0, s40: 0 } as const;

export const LOG_CEIL = 3;
// clipped to [1/10^6, x1000]: the far tails would otherwise dominate the frame
const yOf = (logW: number) => Math.min(LOG_CEIL, Math.max(LOG_FLOOR, logW)) * SKY;

const runVertex = /* glsl */ `
attribute float aI;
varying float vI;
varying float vY;
void main(){
  vI = aI;
  vY = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const runFrag = /* glsl */ `
uniform float uN;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uRuin;
varying float vI;
varying float vY;
void main(){
  if (vI > uN) discard;
  bool ruined = vY < uRuin;
  // ruined paths fade to dark ember: they are evidence, not the subject
  vec3 c = ruined ? vec3(0.5, 0.1, 0.14) : uColor;
  gl_FragColor = vec4(c, (ruined ? 0.016 : uAlpha));
}
`;

/** One group's trajectories as a single static geometry, revealed by uN in the shader. */
export const Runway: React.FC<{ which: "s2" | "s40"; n: number; color: string; alpha: number }> = ({ which, n, color, alpha }) => {
  const { geometry, material } = useMemo(() => {
    const { logW, stride } = getSim().sizing[which];
    const segs = SIZING_TRADES;
    const pos = new Float32Array(SHOWN * segs * 2 * 3);
    const aI = new Float32Array(SHOWN * segs * 2);
    let k = 0;
    for (let t = 0; t < SHOWN; t++) {
      const z = GROUP_Z[which] - t * LANE;
      for (let i = 0; i < segs; i++) {
        for (const j of [i, i + 1]) {
          pos[k * 3] = GROUP_X[which] + j * SKX;
          pos[k * 3 + 1] = yOf(logW[t * stride + j]);
          pos[k * 3 + 2] = z;
          aI[k] = j;
          k++;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aI", new THREE.BufferAttribute(aI, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: runVertex,
      fragmentShader: runFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uN: { value: 0 }, uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0.06 }, uRuin: { value: -1 * SKY } },
    });
    return { geometry, material };
  }, [which, color]);
  material.uniforms.uN.value = n;
  material.uniforms.uAlpha.value = alpha;
  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
};

const headVertex = /* glsl */ `
attribute vec3 color;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(40.0 / -mv.z, 3.0, 12.0);
  vColor = color;
  vAlpha = 0.95;
}
`;

/** One glowing dot per person at the front of their trajectory. */
export const RunwayHeads: React.FC<{ which: "s2" | "s40"; n: number; color: string }> = ({ which, n, color }) => {
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SHOWN * 3), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SHOWN * 3), 3));
    const material = new THREE.ShaderMaterial({ vertexShader: headVertex, fragmentShader: SOFT_POINT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return { geometry, material };
  }, []);
  const { logW, stride } = getSim().sizing[which];
  const base = new THREE.Color(color);
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  const col = geometry.getAttribute("color") as THREE.BufferAttribute;
  const k = Math.min(SIZING_TRADES, Math.floor(n));
  const fr = Math.min(1, n - k);
  for (let t = 0; t < SHOWN; t++) {
    const a = logW[t * stride + k];
    const b = logW[t * stride + Math.min(SIZING_TRADES, k + 1)];
    const lw = a + (b - a) * fr;
    pos.setXYZ(t, GROUP_X[which] + n * SKX, yOf(lw), GROUP_Z[which] - t * LANE);
    if (lw < -1) col.setXYZ(t, 0.55, 0.12, 0.18);
    else col.setXYZ(t, base.r, base.g, base.b);
  }
  pos.needsUpdate = col.needsUpdate = true;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

/** The group's median path - the "typical person" - as a bright line on the group's front lane. */
export const MedianPath: React.FC<{ which: "s2" | "s40"; n: number; color: string; opacity: number }> = ({ which, n, color, opacity }) => {
  const meds = useMemo(() => {
    const { logW, stride } = getSim().sizing[which];
    const raw = Array.from({ length: SIZING_TRADES + 1 }, (_, i) => median(column(logW, stride, SIZING_TRADERS, i)));
    // +/-4-trade moving average: the discrete win/loss steps make the raw median saw-tooth
    return raw.map((_, i) => {
      const a = Math.max(0, i - 4);
      const b = Math.min(SIZING_TRADES, i + 4);
      let sum = 0;
      for (let j = a; j <= b; j++) sum += raw[j];
      return sum / (b - a + 1);
    });
  }, [which]);
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= Math.min(SIZING_TRADES, Math.floor(n)); i += 2) pts.push([GROUP_X[which] + i * SKX, yOf(meds[i]), GROUP_Z[which] + 0.3]);
  if (pts.length < 2 || opacity <= 0.01) return null;
  return <Line points={pts} color={color} lineWidth={6} transparent opacity={opacity} />;
};

/**
 * Reference lines only - x1 (break-even, white) and "lost 90%" (dashed red) along the
 * front edge. Filled planes here read as a red wall behind the curves, so there are none.
 */
export const SizingPlanes: React.FC<{ opacity: number }> = ({ opacity }) => {
  if (opacity <= 0.01) return null;
  const zMax = 0.6;
  return (
    <>
      {Object.values(GROUP_X).map((x0) => (
        <group key={x0}>
          <Line points={[[x0 - 0.5, -SKY, zMax], [x0 + RUN_LEN + 0.5, -SKY, zMax]]} color="#ff4d6d" lineWidth={2.5} transparent opacity={opacity} dashed dashSize={0.5} gapSize={0.3} />
          <Line points={[[x0 - 0.5, 0, zMax], [x0 + RUN_LEN + 0.5, 0, zMax]]} color="#ffffff" lineWidth={1.5} transparent opacity={opacity * 0.6} />
        </group>
      ))}
    </>
  );
};

// ---------------- the +50% / -40% coin game ----------------

export const EKX = 1.3;
const COLS_Z = 25;
const UP = Math.log10(ERGO_UP);
const DOWN = Math.log10(ERGO_DOWN);

/** Stack slots for round r: each player's (x, layer, depth) inside their bin of #heads. */
const layoutRound = (r: number) => {
  const { logW, stride } = getSim().ergo;
  const counts = new Int32Array(r + 1);
  const slot = new Int32Array(ERGO_PLAYERS);
  const kOf = new Int32Array(ERGO_PLAYERS);
  for (let p = 0; p < ERGO_PLAYERS; p++) {
    const k = Math.round((logW[p * stride + r] - r * DOWN) / (UP - DOWN));
    kOf[p] = k;
    slot[p] = counts[k]++;
  }
  let maxLayers = 1;
  for (const c of counts) maxLayers = Math.max(maxLayers, Math.ceil(c / COLS_Z));
  return { kOf, slot, maxLayers };
};

const ergoVertex = /* glsl */ `
attribute vec3 color;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(55.0 / -mv.z, 2.5, 9.0);
  vColor = color;
  vAlpha = 0.9;
}
`;

/**
 * 10000 players as 10000 particles. Each round every particle hops right (+50%) or left
 * (-40%) and restacks into its column, so the histogram is literally built from people.
 * Column height is normalised to `height` world units for the tallest column of the round.
 */
export const CoinParticles: React.FC<{ round: number; height: number }> = ({ round, height }) => {
  const { geometry, material, jitter } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ERGO_PLAYERS * 3), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(ERGO_PLAYERS * 3), 3));
    const material = new THREE.ShaderMaterial({ vertexShader: ergoVertex, fragmentShader: SOFT_POINT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const rand = mulberry32(91);
    const jitter = Float32Array.from({ length: ERGO_PLAYERS * 2 }, () => rand() - 0.5);
    return { geometry, material, jitter };
  }, []);
  const r0 = Math.floor(round);
  const r1 = Math.min(100, r0 + 1);
  const t = ease("power2.inOut")(round - r0);
  const L0 = layoutRound(r0);
  const L1 = layoutRound(r1);
  const binW = (UP - DOWN) * EKX * 0.86;
  const place = (L: ReturnType<typeof layoutRound>, r: number, p: number) => {
    const k = L.kOf[p];
    const e = k * UP + (r - k) * DOWN;
    const s = L.slot[p];
    const layer = Math.floor(s / COLS_Z);
    const unit = Math.min(0.12, height / L.maxLayers);
    return [e * EKX + jitter[p * 2] * binW * 0.6, (layer + 0.5) * unit, ((s % COLS_Z) / COLS_Z - 0.5) * 1.6 + jitter[p * 2 + 1] * 0.03, e] as const;
  };
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  const col = geometry.getAttribute("color") as THREE.BufferAttribute;
  for (let p = 0; p < ERGO_PLAYERS; p++) {
    const a = place(L0, r0, p);
    const b = place(L1, r1, p);
    // hop: rise mid-flight so moving particles arc instead of sliding through the stacks
    const arc = Math.sin(Math.PI * t) * 0.35 * (r1 > r0 ? 1 : 0);
    pos.setXYZ(p, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + arc, a[2] + (b[2] - a[2]) * t);
    const e = a[3] + (b[3] - a[3]) * t;
    if (e < 0) col.setXYZ(p, 1, 0.32, 0.45);
    else col.setXYZ(p, 0.98, 0.8, 0.48);
  }
  pos.needsUpdate = col.needsUpdate = true;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

/** Vertical light beam marking a value on the log-wealth axis. */
export const Beam: React.FC<{ e: number; color: string; opacity: number; height?: number; dashed?: boolean }> = ({ e, color, opacity, height = 7, dashed = false }) => {
  if (opacity <= 0.01) return null;
  const x = e * EKX;
  return (
    <>
      <Line points={[[x, 0, 0.9], [x, height, 0.9]]} color={color} lineWidth={3} transparent opacity={opacity} dashed={dashed} dashSize={0.25} gapSize={0.18} />
      <mesh position={[x, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.8, height]} />
        <meshBasicMaterial color={color} transparent opacity={0.06 * opacity} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
};

export const coinMedianLog = (round: number) => {
  const { logW, stride } = getSim().ergo;
  return median(column(logW, stride, ERGO_PLAYERS, Math.round(round)));
};
export const coinMeanLog = (round: number) => round * Math.log10((ERGO_UP + ERGO_DOWN) / 2);
