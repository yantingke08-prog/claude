// The law of large numbers as a place you can fly through.
//
// Data -> space mapping (fixed for the whole segment, never rescaled per shot):
//   x = trade number  x KX      (1000 trades = 20 units)
//   y = cumulative P&L x KY     (+400 = 10 units, so the expectation slope is honest)
//   z = which person  x -LANE   (1000 parallel lanes, person #0 at the front)
// "Zooming out from 10 trades to 1000" is a real camera move through this fixed space.
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { interpolate } from "remotion";
import { ease } from "../../lib/gsap";
import { SOFT_POINT_FRAG } from "../../lib/glsl";
import { getSim, LLN_TRADERS, LLN_TRADES, STRATEGY_B, expectancy } from "../sim.ts";
import { makeCamera, projector, v, type Shot } from "./common";

export const KX = 0.02;
export const KY = 0.025;
export const LANE = 0.008;
export const DEPTH = (LLN_TRADERS - 1) * LANE;
export const HERO = 0;
const HIST_BIN = 10; // P&L units per histogram bin
const HIST_X = LLN_TRADES * KX + 0.9;
const HIST_STEP = 0.07;
const HIST_Z = -DEPTH / 2;

/** Trade indices we keep as vertices: every trade up to 100, every 5th after (full detail where the camera is close). */
const SAMPLE_I = [...Array.from({ length: 101 }, (_, i) => i), ...Array.from({ length: 180 }, (_, k) => 105 + k * 5)];

// ---------------- the schedule: how many trades are revealed at each frame ----------------

export const tradesAt = (frame: number) => {
  const seg = (f0: number, f1: number, n0: number, n1: number) =>
    Math.exp(Math.log(n0) + (Math.log(n1) - Math.log(n0)) * ease("power2.inOut")(Math.min(1, Math.max(0, (frame - f0) / (f1 - f0)))));
  if (frame < 345) return 0;
  if (frame < 430) return interpolate(frame, [345, 430], [0, 10]);
  if (frame < 565) return 10;
  if (frame < 690) return seg(565, 690, 10, 100);
  if (frame < 705) return 100;
  return seg(705, 830, 100, 1000);
};

/** Frame at which the hero's i-th trade lands (inverse of the linear 0->10 section). */
export const heroTradeFrame = (i: number) => 345 + (i * 85) / 10;

// ---------------- data access ----------------

const pnlAt = (trader: number, n: number) => {
  const { pnl, stride } = getSim().lln;
  const k = Math.max(0, Math.min(LLN_TRADES, Math.floor(n)));
  const a = pnl[trader * stride + k];
  if (k >= LLN_TRADES) return a;
  return a + (pnl[trader * stride + k + 1] - a) * (n - k);
};

export const pointOf = (trader: number, n: number) => new THREE.Vector3(n * KX, pnlAt(trader, n) * KY, -trader * LANE);
export const heroWon = (i: number) => getSim().lln.wins[HERO * LLN_TRADES + i] === 1;

const meanPath = (() => {
  let cache: Float32Array | null = null;
  return () => {
    if (cache) return cache;
    const { pnl, stride } = getSim().lln;
    cache = new Float32Array(LLN_TRADES + 1);
    for (let i = 0; i <= LLN_TRADES; i++) {
      let s = 0;
      for (let t = 0; t < LLN_TRADERS; t++) s += pnl[t * stride + i];
      cache[i] = s / LLN_TRADERS;
    }
    return cache;
  };
})();

// ---------------- camera: a pure function of the frame ----------------

const SHOTS: Record<string, Shot> = {
  // macro, side-on, at the very first trade of person #0
  close: () => ({ pos: v(-0.06, 0.07, 0.42), target: v(0.05, 0.0, 0), fov: 32 }),
  // tracking shot that rides alongside person #0's line head
  track: (f) => {
    const h = pointOf(HERO, tradesAt(f));
    return { pos: v(h.x - 0.2, h.y + 0.09, 0.5), target: v(h.x + 0.03, h.y - 0.01, -0.05), fov: 32 };
  },
  // pulled back and around: 1000 lanes recede behind person #0
  crowd10: () => ({ pos: v(-2.3, 1.5, 2.1), target: v(0.12, 0.08, -3.4), fov: 36 }),
  crowd10b: () => ({ pos: v(-2.0, 1.25, 2.6), target: v(0.14, 0.08, -3.6), fov: 36 }),
  crowd100: () => ({ pos: v(-3.0, 3.4, 5.4), target: v(1.1, 0.55, -4), fov: 38 }),
  crowd100b: () => ({ pos: v(-2.8, 3.5, 5.9), target: v(1.2, 0.6, -4), fov: 38 }),
  crowd1000: () => ({ pos: v(-5, 13, 17), target: v(10, 5, -4), fov: 40 }),
  // from beyond the finish line, looking back down the funnel of trajectories
  endOn: () => ({ pos: v(31, 13.5, 7), target: v(12, 6, -4), fov: 38 }),
  endOnB: () => ({ pos: v(30, 12.5, 9.5), target: v(12.5, 6, -4), fov: 38 }),
  // long lens, square to the data: a near-orthographic, readable chart
  side: () => ({ pos: v(12.5, 7, 52), target: v(12.5, 6.5, -4), fov: 20 }),
};

const KEYS: [number, string][] = [
  [300, "close"],
  [340, "track"],
  [415, "track"],
  [458, "crowd10"],
  [562, "crowd10b"],
  [692, "crowd100"],
  [706, "crowd100b"],
  [832, "crowd1000"],
  [905, "endOn"],
  [968, "endOnB"],
  [1040, "side"],
  [1100, "side"],
];

export const camAt = makeCamera(SHOTS, KEYS);
export { projector };

// ---------------- 1000 trajectories: one static geometry, revealed in the shader ----------------

const trajVertex = /* glsl */ `
uniform float uCrowd;
attribute float aI;
attribute float aT;
varying float vI;
varying float vY;
varying float vFade;
void main(){
  vI = aI;
  vY = position.y;
  // lanes switch on front-to-back as the crowd is revealed; person #0 is drawn separately
  vFade = aT < 0.5 ? 0.0 : smoothstep(aT, aT + 60.0, uCrowd * 1060.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const trajFrag = /* glsl */ `
uniform float uN;
uniform float uOpacity;
varying float vI;
varying float vY;
varying float vFade;
void main(){
  if (vI > uN) discard;
  // under water = red, above = cyan; red is boosted because it is rarer and it is the point
  bool under = vY < 0.0;
  vec3 c = under ? vec3(1.0, 0.3, 0.42) : vec3(0.36, 0.88, 1.0);
  float a = (under ? 0.34 : 0.05) * vFade * uOpacity;
  gl_FragColor = vec4(c, a);
}
`;

export const Trajectories: React.FC<{ n: number; crowd: number; opacity?: number }> = ({ n, crowd, opacity = 1 }) => {
  const { geometry, material } = useMemo(() => {
    const { pnl, stride } = getSim().lln;
    const segs = SAMPLE_I.length - 1;
    const pos = new Float32Array(LLN_TRADERS * segs * 2 * 3);
    const aI = new Float32Array(LLN_TRADERS * segs * 2);
    const aT = new Float32Array(LLN_TRADERS * segs * 2);
    let k = 0;
    for (let t = 0; t < LLN_TRADERS; t++) {
      const z = -t * LANE;
      for (let s = 0; s < segs; s++) {
        for (const i of [SAMPLE_I[s], SAMPLE_I[s + 1]]) {
          pos[k * 3] = i * KX;
          pos[k * 3 + 1] = pnl[t * stride + i] * KY;
          pos[k * 3 + 2] = z;
          aI[k] = i;
          aT[k] = t;
          k++;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aI", new THREE.BufferAttribute(aI, 1));
    geometry.setAttribute("aT", new THREE.BufferAttribute(aT, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: trajVertex,
      fragmentShader: trajFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uN: { value: 0 }, uCrowd: { value: 0 }, uOpacity: { value: 1 } },
    });
    return { geometry, material };
  }, []);
  material.uniforms.uN.value = n;
  material.uniforms.uCrowd.value = crowd;
  material.uniforms.uOpacity.value = opacity;
  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
};

// ---------------- 1000 line heads: each glowing dot is one person ----------------

const headVertex = /* glsl */ `
uniform float uSize;
attribute vec3 color;
attribute float aAlpha;
attribute float aSettle;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uSize * 9.0 / -mv.z, 3.5 + aSettle * 3.0, 18.0);
  vColor = color * (1.0 + aSettle * 0.6);
  vAlpha = aAlpha;
}
`;

/**
 * Heads ride the front of every trajectory. When `settle` > 0 they leave their lanes and
 * stack into a histogram beyond the finish line - the distribution, built one person at a time.
 */
export const Heads: React.FC<{ n: number; crowd: number; settle: number; size?: number }> = ({ n, crowd, settle, size = 1 }) => {
  const { geometry, material, stack } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LLN_TRADERS * 3), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(LLN_TRADERS * 3), 3));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(LLN_TRADERS), 1));
    geometry.setAttribute("aSettle", new THREE.BufferAttribute(new Float32Array(LLN_TRADERS), 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: headVertex,
      fragmentShader: SOFT_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uSize: { value: 1 } },
    });
    // final-state histogram slots: bin by P&L at trade 1000, stack outward along +x
    const { pnl, stride } = getSim().lln;
    const fill = new Map<number, number>();
    const order = Array.from({ length: LLN_TRADERS }, (_, t) => t).sort((a, b) => pnl[a * stride + LLN_TRADES] - pnl[b * stride + LLN_TRADES]);
    const stack = new Array<{ pos: THREE.Vector3; delay: number }>(LLN_TRADERS);
    order.forEach((t, rank) => {
      const bin = Math.floor(pnl[t * stride + LLN_TRADES] / HIST_BIN);
      const slot = fill.get(bin) ?? 0;
      fill.set(bin, slot + 1);
      stack[t] = { pos: v(HIST_X + slot * HIST_STEP, (bin + 0.5) * HIST_BIN * KY, HIST_Z), delay: rank / LLN_TRADERS };
    });
    return { geometry, material, stack };
  }, []);

  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  const col = geometry.getAttribute("color") as THREE.BufferAttribute;
  const alpha = geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
  const settled = geometry.getAttribute("aSettle") as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let t = 0; t < LLN_TRADERS; t++) {
    const head = pointOf(t, n);
    const k = ease("power3.inOut")(Math.min(1, Math.max(0, settle * 1.6 - stack[t].delay * 0.6)));
    p.copy(head).lerp(stack[t].pos, k);
    settled.setX(t, k);
    pos.setXYZ(t, p.x, p.y, p.z);
    const under = head.y < 0;
    col.setXYZ(t, under ? 1 : 0.45, under ? 0.32 : 0.95, under ? 0.45 : 1);
    const shown = t === HERO ? 1 : Math.min(1, Math.max(0, (crowd * 1060 - t) / 60));
    alpha.setX(t, shown * (n > 0 ? 1 : 0));
  }
  pos.needsUpdate = col.needsUpdate = alpha.needsUpdate = settled.needsUpdate = true;
  material.uniforms.uSize.value = size;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

export const histogramTop = () => {
  const { pnl, stride } = getSim().lln;
  let max = -Infinity;
  for (let t = 0; t < LLN_TRADERS; t++) max = Math.max(max, pnl[t * stride + LLN_TRADES]);
  return v(HIST_X + 0.6, (Math.ceil(max / HIST_BIN) + 2) * HIST_BIN * KY, HIST_Z);
};

// ---------------- reference surfaces ----------------

const planeMat = (color: string, opacity: number) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });

const floorVertex = /* glsl */ `
varying float vX;
void main(){ vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const floorFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uMaxX;
varying float vX;
void main(){
  if (vX > uMaxX) discard;
  gl_FragColor = vec4(uColor, uOpacity * smoothstep(uMaxX, uMaxX * 0.8, vX));
}
`;
const floorMat = (opacity: number) =>
  new THREE.ShaderMaterial({
    vertexShader: floorVertex,
    fragmentShader: floorFrag,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color("#ff4d6d") }, uOpacity: { value: opacity }, uMaxX: { value: 1 } },
  });

/**
 * y = 0: the break-even floor, with grid lines every 10 trades and every 100 people.
 * It only extends a little past the furthest trade revealed, so close-ups stay about the data.
 */
export const ZeroPlane: React.FC<{ opacity: number; n: number }> = ({ opacity, n }) => {
  const { fill, grid, fillMat, gridMat } = useMemo(() => {
    const len = LLN_TRADES * KX + 0.4;
    const fill = new THREE.PlaneGeometry(len, DEPTH + 0.4, 200, 1);
    fill.rotateX(-Math.PI / 2);
    fill.translate(len / 2 - 0.2, 0, -DEPTH / 2);
    const g: number[] = [];
    for (let i = 0; i <= LLN_TRADES; i += 10) g.push(i * KX, 0, 0.2, i * KX, 0, -DEPTH - 0.2);
    for (let t = 0; t <= LLN_TRADERS; t += 100) for (let i = 0; i < LLN_TRADES; i += 10) g.push(i * KX, 0, -t * LANE, (i + 10) * KX, 0, -t * LANE);
    const grid = new THREE.BufferGeometry();
    grid.setAttribute("position", new THREE.BufferAttribute(new Float32Array(g), 3));
    return { fill, grid, fillMat: floorMat(0.03), gridMat: floorMat(0.12) };
  }, []);
  const maxX = Math.max(10, n) * KX * 1.25 + 0.1;
  fillMat.uniforms.uMaxX.value = gridMat.uniforms.uMaxX.value = maxX;
  fillMat.uniforms.uOpacity.value = 0.035 * opacity;
  // fine grid fades as we zoom out so it never turns into a moire wash
  gridMat.uniforms.uOpacity.value = 0.13 * opacity * (n < 150 ? 1 : Math.max(0.25, 150 / n));
  return (
    <>
      <mesh geometry={fill} material={fillMat} />
      <lineSegments geometry={grid} material={gridMat} />
    </>
  );
};

/** y = 0.4 x: what every person should earn on average. A sloped sheet through all lanes. */
export const ExpectationPlane: React.FC<{ opacity: number }> = ({ opacity }) => {
  const geometry = useMemo(() => {
    const ev = expectancy(STRATEGY_B);
    const x1 = LLN_TRADES * KX;
    const y1 = ev * LLN_TRADES * KY;
    const z0 = 0.25;
    const z1 = -DEPTH - 0.25;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, z0, x1, y1, z0, x1, y1, z1, 0, 0, z0, x1, y1, z1, 0, 0, z1]), 3));
    return g;
  }, []);
  const mat = useMemo(() => planeMat("#ffb547", 0.1), []);
  mat.opacity = 0.11 * opacity;
  const y1 = expectancy(STRATEGY_B) * LLN_TRADES * KY;
  return (
    <>
      <mesh geometry={geometry} material={mat} />
      {opacity > 0.01 && (
        <Line points={[[0, 0, 0.26], [LLN_TRADES * KX, y1, 0.26]]} color="#ffb547" lineWidth={3} transparent opacity={opacity} dashed dashSize={0.4} gapSize={0.25} />
      )}
    </>
  );
};

/** x = 1000: the finish line you have to survive to. */
export const FinishGate: React.FC<{ opacity: number }> = ({ opacity }) => {
  const x = LLN_TRADES * KX;
  const mat = useMemo(() => planeMat("#5ce8ff", 0.06), []);
  mat.opacity = 0.07 * opacity;
  if (opacity <= 0.01) return null;
  return (
    <>
      <mesh position={[x, 7, -DEPTH / 2]} rotation={[0, Math.PI / 2, 0]} material={mat}>
        <planeGeometry args={[DEPTH + 0.4, 18]} />
      </mesh>
      <Line points={[[x, -2, 0.25], [x, 16, 0.25]]} color="#5ce8ff" lineWidth={2} transparent opacity={opacity} />
    </>
  );
};

// ---------------- person #0 and the crowd average, drawn as thick lines ----------------

const pathPoints = (getY: (i: number) => number, n: number, z: number) => {
  const pts: [number, number, number][] = [];
  for (const i of SAMPLE_I) {
    if (i > n) break;
    pts.push([i * KX, getY(i) * KY, z]);
  }
  if (n > 0 && n < LLN_TRADES) {
    const k = Math.floor(n);
    const a = getY(k);
    const b = getY(Math.min(LLN_TRADES, k + 1));
    pts.push([n * KX, (a + (b - a) * (n - k)) * KY, z]);
  }
  return pts;
};

export const HeroLine: React.FC<{ n: number; opacity: number; width: number }> = ({ n, opacity, width }) => {
  const { pnl, stride } = getSim().lln;
  const pts = pathPoints((i) => pnl[HERO * stride + i], n, 0.002);
  if (pts.length < 2 || opacity <= 0.01) return null;
  return <Line points={pts} color="#ffd27a" lineWidth={width} transparent opacity={opacity} />;
};

export const MeanLine: React.FC<{ n: number; opacity: number }> = ({ n, opacity }) => {
  const m = meanPath();
  const pts = pathPoints((i) => m[i], n, 0.3);
  if (pts.length < 2 || opacity <= 0.01) return null;
  return <Line points={pts} color="#ffffff" lineWidth={3} transparent opacity={opacity} />;
};
