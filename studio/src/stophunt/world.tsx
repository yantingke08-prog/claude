// The 3D trading stage. Bevelled, clear-coated candles standing over a reflective floor, gold glass price levels,
// stop orders as a few large bricks behind the levels, volume columns rising from the floor, light shafts and fog.
// Palette: deep blue-black, warm white, gold (key levels), red (up / buy stops), green (down / sell stops).
// Everything is a pure function of the frame.
import { MeshReflectorMaterial } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { E, clamp01, ease, out3, ramp, win } from "./cue";
import {
  A_HIGH, A_HI, A_LO, A_LOW, A_N, BAD_STOP, B_HI, B_HIGH, Brick, FLOOR_Y, GOOD_STOP, HUNT, LADDER_X, ROUND, SA, SB, SC,
  SERIES_A, SERIES_REAL, SERIES_STOP, SPIKE_I, STACK_B, STACK_C, STACK_HI, STACK_LO, STACK_RD, Stage, TEST_WICK, TOUCH, XS, YOU_BRICK,
  YS, avgVol, px, py, type Bar,
} from "./data";
import { cam, huntCross, huntPath, stage } from "./director";

export const COL = {
  bg: "#04070d",
  fog: "#070c16",
  up: "#e5484d", // red: up candles, buy stops
  down: "#25b07a", // green: down candles, sell stops
  gold: "#e9b44c",
  warm: "#f3ead9",
  steel: "#8e9ab0",
};

// ---------------------------------------------------------------- shared geometry
const geoCache = new Map<string, THREE.BufferGeometry>();
const rbox = (w: number, h: number, d: number, r = 0.045) => {
  const q = (v: number) => Math.max(0.01, Math.round(v * 100) / 100);
  const key = `${q(w)}|${q(h)}|${q(d)}|${r}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(q(w), q(h), q(d), 3, Math.min(r, q(h) / 2 - 0.001, q(w) / 2 - 0.001));
    geoCache.set(key, g);
  }
  return g;
};
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 16);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 20, 14);

// ---------------------------------------------------------------- camera rig + key light that follows the subject
const Rig: React.FC<{ f: number }> = ({ f }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const c = cam(f);
  camera.fov = c.fov;
  camera.near = 0.1;
  camera.far = 400;
  camera.updateProjectionMatrix();
  camera.position.set(...c.p);
  camera.lookAt(...c.t);
  camera.updateMatrixWorld();
  return null;
};
const KeyLight: React.FC<{ f: number }> = ({ f }) => {
  const c = cam(f);
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight("#fff3e0", 2.2);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.radius = 6;
    l.shadow.blurSamples = 12;
    l.shadow.bias = -0.0004;
    const s = l.shadow.camera as THREE.OrthographicCamera;
    s.left = -16;
    s.right = 16;
    s.top = 16;
    s.bottom = -16;
    s.near = 1;
    s.far = 60;
    return l;
  }, []);
  light.position.set(c.t[0] + 5, c.t[1] + 14, c.t[2] + 8);
  light.target.position.set(c.t[0], c.t[1] - 2, c.t[2]);
  light.target.updateMatrixWorld();
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
};

// ---------------------------------------------------------------- candles
export type Live = Bar & { g: number; hot?: number };
const Candle: React.FC<{ b: Live; x: number; st: Stage; op: number }> = ({ b, x, st, op }) => {
  if (b.g <= 0.001 || op <= 0.002) return null;
  const wk = out3(b.g / 0.4);
  const bk = out3((b.g - 0.4) / 0.6);
  const up = b.c >= b.o;
  const close = b.o + (b.c - b.o) * bk;
  const hi = b.o + (b.h - b.o) * wk;
  const lo = b.o - (b.o - b.l) * wk;
  const col = up ? COL.up : COL.down;
  const hot = b.hot ?? 0;
  const bh = Math.max(0.05, Math.abs(close - b.o) * YS);
  const wl = Math.max(0.02, py(hi, st) - py(lo, st));
  const tr = op < 0.995;
  return (
    <group>
      <mesh geometry={UNIT_CYL} position={[x, (py(hi, st) + py(lo, st)) / 2, 0]} scale={[0.026, wl, 0.026]} castShadow>
        <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.25 + 1.2 * hot} roughness={0.35} clearcoat={1} transparent={tr} opacity={op} />
      </mesh>
      {bk > 0 && (
        <mesh geometry={rbox(XS * 0.66, bh, XS * 0.66)} position={[x, (py(close, st) + py(b.o, st)) / 2, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.1 + 0.9 * hot} roughness={0.24} metalness={0.05} clearcoat={1} clearcoatRoughness={0.12} sheen={0.4} sheenColor="#ffffff" transparent={tr} opacity={op} />
        </mesh>
      )}
    </group>
  );
};
const Candles: React.FC<{ bars: Live[]; st: Stage; op: number; from?: number }> = ({ bars, st, op, from = 0 }) =>
  op <= 0.002 ? null : (
    <group>
      {bars.map((b, i) => (i < from ? null : <Candle key={i} b={b} x={px(i, st)} st={st} op={op} />))}
    </group>
  );

/** volume columns standing on the floor under their candles */
const Volume: React.FC<{ bars: Live[]; st: Stage; op: number; from: number; hot?: (i: number) => number; vol?: (i: number) => number; k?: number; base?: number }> = ({ bars, st, op, from, hot = () => 0, vol, k = 0.32, base = FLOOR_Y }) =>
  op <= 0.002 ? null : (
    <group>
      {bars.map((b, i) => {
        if (i < from || b.g <= 0.001) return null;
        const h = Math.max(0.03, (vol ? vol(i) : b.v) * k * out3(b.g));
        const hh = hot(i);
        const col = hh > 0.05 ? COL.up : COL.steel;
        return (
          <mesh key={i} geometry={rbox(XS * 0.5, h, XS * 0.5, 0.03)} position={[px(i, st), base + h / 2 + 0.01, 0]} castShadow>
            <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.05 + 1.4 * hh} roughness={0.4} clearcoat={0.6} transparent opacity={op * (0.5 + 0.5 * Math.max(hh, 0.3))} />
          </mesh>
        );
      })}
    </group>
  );

// ---------------------------------------------------------------- price level: gold glass shelf with a lit front edge
const Level: React.FC<{ y: number; x0: number; x1: number; k: number; op: number; glow?: number; color?: string }> = ({ y, x0, x1, k, op, glow = 0, color = COL.gold }) => {
  if (k <= 0.002 || op <= 0.002) return null;
  const w = Math.max(0.02, (x1 - x0) * out3(k));
  return (
    <group>
      <mesh position={[x0 + w / 2, y, -0.75]}>
        <boxGeometry args={[w, 0.012, 2.2]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.05 + 0.3 * glow} roughness={0.1} transparent opacity={(0.04 + 0.06 * glow) * op} depthWrite={false} />
      </mesh>
      <mesh geometry={UNIT_CYL} position={[x0 + w / 2, y, 0.36]} rotation={[0, 0, Math.PI / 2]} scale={[0.022, w, 0.022]}>
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op * (0.85 + 0.15 * glow)} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- order bricks
type BrickState = { s: number; dy?: number; glow?: number; ghost?: number; color?: string } | null;
const Bricks: React.FC<{ bricks: Brick[]; color: string; op: number; at: (b: Brick, j: number) => BrickState }> = ({ bricks, color, op, at }) => {
  if (op <= 0.002) return null;
  return (
    <group>
      {bricks.map((b, j) => {
        const st = at(b, j);
        if (!st || st.s <= 0.002) return null;
        const ghost = st.ghost ?? 0;
        const glow = st.glow ?? 0;
        const c = st.color ?? color;
        return (
          <mesh key={j} geometry={rbox(b.w, b.h, b.d, 0.05)} position={[b.x, b.y + (st.dy ?? 0), b.z]} scale={[st.s, st.s, st.s]} castShadow={ghost < 0.5}>
            <meshPhysicalMaterial color={c} emissive={c} emissiveIntensity={0.16 + 1.1 * glow} roughness={0.22} clearcoat={1} clearcoatRoughness={0.1} transparent opacity={op * (0.92 - 0.72 * ghost)} depthWrite={ghost < 0.5} />
          </mesh>
        );
      })}
    </group>
  );
};

const Bead: React.FC<{ p: [number, number, number]; r: number; color: string; op: number }> = ({ p, r, color, op }) =>
  op <= 0.002 || r <= 0.001 ? null : (
    <mesh geometry={UNIT_SPHERE} position={p} scale={[r, r, r]}>
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op} />
    </mesh>
  );

const Slab: React.FC<{ p: [number, number, number]; s: [number, number, number]; color: string; op: number; ei?: number; r?: number }> = ({ p, s, color, op, ei = 0.2, r = 0.06 }) =>
  op <= 0.002 || s[0] <= 0.01 || s[1] <= 0.01 ? null : (
    <mesh geometry={rbox(s[0], s[1], s[2], r)} position={p} castShadow>
      <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={ei} roughness={0.25} clearcoat={1} transparent opacity={op} depthWrite={op > 0.6} />
    </mesh>
  );

/** up / down arrow made of a shaft and a cone (a stop turning into a market order) */
const Arrow: React.FC<{ p: [number, number, number]; dir: 1 | -1; len: number; color: string; op: number }> = ({ p, dir, len, color, op }) =>
  op <= 0.002 || len <= 0.01 ? null : (
    <group position={p}>
      <mesh geometry={UNIT_CYL} position={[0, (dir * len) / 2, 0]} scale={[0.05, len, 0.05]}>
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op} />
      </mesh>
      <mesh position={[0, dir * (len + 0.12), 0]} rotation={[dir > 0 ? 0 : Math.PI, 0, 0]}>
        <coneGeometry args={[0.14, 0.28, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op} />
      </mesh>
    </group>
  );

/** expanding ring on the floor: a volume pulse */
const Ring: React.FC<{ x: number; z: number; k: number; color: string; op: number }> = ({ x, z, k, color, op }) =>
  k <= 0.001 || k >= 1 || op <= 0.002 ? null : (
    <mesh position={[x, FLOOR_Y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.3 + 2.4 * k, 0.3 + 2.4 * k, 1]}>
      <ringGeometry args={[0.9, 1, 64]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op * (1 - k)} depthWrite={false} />
    </mesh>
  );

// ---------------------------------------------------------------- atmosphere: light shafts, dust, floor
const BEAM_V = /* glsl */ `
uniform float uH;
varying float vT;
varying vec3 vN;
varying vec3 vV;
void main(){
  vT = (position.y + uH * 0.5) / uH;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_F = /* glsl */ `
uniform vec3 uC;
uniform float uO;
varying float vT;
varying vec3 vN;
varying vec3 vV;
void main(){
  float edge = pow(abs(dot(vN, vV)), 2.0);
  float a = uO * edge * mix(0.15, 1.0, vT);
  gl_FragColor = vec4(uC * a, a);
}`;
const Beam: React.FC<{ x: number; y: number; z: number; h: number; r: number; op: number; color?: string }> = ({ x, y, z, h, r, op, color = COL.warm }) => {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: BEAM_V, fragmentShader: BEAM_F, uniforms: { uH: { value: h }, uC: { value: new THREE.Color(color) }, uO: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    [h, color],
  );
  mat.uniforms.uO.value = op;
  if (op <= 0.002) return null;
  return (
    <mesh position={[x, y + h / 2, z]} material={mat}>
      <cylinderGeometry args={[0.08, r, h, 40, 1, true]} />
    </mesh>
  );
};
const Dust: React.FC = () => {
  const geo = useMemo(() => {
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pts: number[] = [];
    for (let i = 0; i < 2600; i++) pts.push(-90 + r() * 130, FLOOR_Y + r() * 15, -9 + r() * 15);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color={COL.warm} size={0.035} sizeAttenuation transparent opacity={0.35} depthWrite={false} />
    </points>
  );
};
const Floor: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-25, FLOOR_Y, -2]} receiveShadow>
    <planeGeometry args={[150, 40]} />
    <MeshReflectorMaterial resolution={1024} blur={[400, 120]} mixBlur={1} mixStrength={2.2} mixContrast={1} roughness={0.85} depthScale={0.8} minDepthThreshold={0.4} maxDepthThreshold={1.2} color="#0a0f19" metalness={0.5} mirror={0.6} />
  </mesh>
);

// ---------------------------------------------------------------- data on stage at frame f

/** a bar that prints live: to its extreme first, then back to its close */
export const liveBar = (f: number, b: Bar, a: number, top: number, end: number): Live => {
  if (f < a) return { ...b, g: 0 };
  const upFirst = b.h - Math.max(b.o, b.c) >= Math.min(b.o, b.c) - b.l;
  const ext = upFirst ? b.h : b.l;
  const p = f < top ? b.o + (ext - b.o) * ease((f - a) / Math.max(1, top - a)) : ext + (b.c - ext) * ease((f - top) / Math.max(1, end - top));
  const reach = f < top ? p : ext;
  const done = clamp01((f - end) / 8);
  return upFirst
    ? { o: b.o, h: Math.max(b.o, reach), l: Math.min(p, b.o) - (Math.min(p, b.o) - b.l) * done, c: p, v: b.v, g: 1 }
    : { o: b.o, l: Math.min(b.o, reach), h: Math.max(p, b.o) + (b.h - Math.max(p, b.o)) * done, c: p, v: b.v, g: 1 };
};

export const barsA = (f: number): Live[] =>
  SERIES_A.map((b, i) => {
    if (i < HUNT) return { ...b, g: 1 };
    if (i === HUNT) {
      if (f < E("hunt")) return { ...b, g: 0 };
      const hp = huntPath(f, b.o, A_HIGH, b.h, b.c);
      return { o: b.o, h: Math.max(b.o, hp.hi), l: f > E("counter") + 30 ? b.l : Math.min(b.o, hp.p), c: hp.p, v: b.v, g: 1, hot: 0.5 * win(f, E("fire"), E("wickIn"), 6, 20) + 0.6 * win(f, E("wickTag"), E("pollIn"), 8, 14) };
    }
    return { ...b, g: clamp01((f - (E("wickIn") + (i - HUNT - 1) * 5)) / 10) };
  });

const realG = (f: number, i: number) => {
  const at = [E("c1"), E("c2"), E("c2") + 10, E("c3"), E("c3catch"), E("c3catch") + 10][i - TOUCH];
  return clamp01((f - at) / 14);
};
export const barsB = (f: number): Live[] => {
  const testIn = E("testIn");
  const real = f < testIn + 10;
  const collapse = 1 - ramp(f, testIn, 10);
  const src = real ? SERIES_REAL : SERIES_STOP;
  return src.map((b, i) => {
    if (i < TOUCH) return { ...b, g: clamp01((f - (E("checkIn") + 6 + i * 0.8)) / 9) };
    if (real) return { ...b, g: realG(f, i) * collapse, hot: i === TOUCH ? 0.5 * win(f, E("c1vol"), E("c2"), 6, 12) : i === TOUCH + 1 || i === TOUCH + 2 ? 0.4 * win(f, E("c2hold"), E("c3"), 6, 12) : 0 };
    if (i === TOUCH) return { ...liveBar(f, b, E("pierce"), E("pierce") + 14, E("back") + 8), hot: 0.5 * win(f, E("pierce"), E("noFollow"), 6, 12) };
    if (i === SPIKE_I) return { ...liveBar(f, b, E("badStop") + 14, E("badHit") + 4, E("badHit") + 22), hot: 0.4 * win(f, E("badHit"), E("goodIn"), 6, 10) };
    const at = i <= TOUCH + 3 ? E("noFollow") + (i - TOUCH - 1) * 6 : E("notReal") + (i - TOUCH - 4) * 6;
    return { ...b, g: clamp01((f - at) / 12) };
  });
};
/** the same market on the comparison stage: everything printed, the probe replays when the voice reaches 缓冲 */
export const barsC = (f: number): Live[] =>
  SERIES_STOP.map((b, i) => (i === SPIKE_I ? liveBar(f, b, E("goodHold"), E("goodHold") + 18, E("goodHold") + 36) : { ...b, g: 1 }));

/** buffer above the structure high on stage C; it widens / narrows with the volatility the voice names */
export const bufferSpan = (f: number) => 0.2 + (0.1 - 0.2) * ramp(f, E("tune"), 16) + (0.36 - 0.1) * ramp(f, E("vol"), 16);

export const VB_TRAY = py(97.55, SB);
export const GOLD_SLAB = { x: px(43.6), y: py(99.94), w: 0.9, h: py(100.22) - py(99.66), d: 1.0, z: -0.25 };

// ---------------------------------------------------------------- the world
export const World: React.FC<{ f: number }> = ({ f }) => {
  const st = stage(f);
  const A = barsA(f);
  const Bb = barsB(f);
  const Cb = barsC(f);
  const xA1 = px(A_N - 1) + 0.6;

  // ---------- opening: your brick alone, swept once, then the crowd lands around it
  const mechIn = E("mechIn");
  const reveal = E("reveal");
  const inMech = f >= E("liqIn") + 26; // switched while series A is off stage
  const youGlow = 1 - ramp(f, E("seeYou"), 14);
  const sweepK = clamp01((f - E("sweepYou")) / 14);
  const liqGlow = win(f, E("seeLiq"), E("liqIn") + 20, 10, 10);
  // ---------- the mechanism
  const hidden = E("hidden");
  const pile = E("pile");
  const buildHi = inMech ? 0.34 * ramp(f, E("shortStops"), 24) + 0.66 * ramp(f, pile, 40) : 1;
  const buildLo = inMech ? 0.34 * ramp(f, E("longStops"), 24) + 0.66 * ramp(f, pile, 40) : 0;
  const ghostK = inMech ? ramp(f, hidden, 10) * (1 - ramp(f, pile, 14)) : 0;
  const fire = E("fire");
  const volume = E("volume");
  const counter = E("counter");
  const huntH = SERIES_A[HUNT].h;
  const tip = (): [number, number, number] => [px(HUNT), py(Math.max(A[HUNT].h, A[HUNT].c)), 0.05];
  const pollIn = E("pollIn");
  const refill = ramp(f, E("gather"), 30);
  const underGhost = ramp(f, E("pileUnder"), 12);
  const ignite = (b: Brick) => huntCross(b.price - 0.03, A_HIGH, huntH) + (b.k / 5) * 14; // layer by layer, from the candle outward
  const hiAt = (b: Brick): BrickState => {
    if (!inMech) {
      // opening: only your brick at first, the others drop in when the voice says 放得太显眼
      if (b === YOU_BRICK) return { s: 1, glow: 0.12 * youGlow + 0.35 * win(f, E("sweepYou"), E("sweepYou") + 16, 2, 10), color: youGlow > 0.5 ? COL.warm : undefined };
      const land = reveal + 4 + b.t * 22;
      const k = clamp01((f - land) / 10);
      return k <= 0 ? null : { s: 1, dy: (1 - out3(k)) * 1.2, glow: 0.5 * liqGlow };
    }
    if (f >= E("gather")) return b.t < refill ? { s: out3((refill - b.t) * 6), glow: 0.25 * win(f, E("visible"), E("checkIn"), 10, 10) } : null;
    if (b.t >= buildHi) return null;
    const grow = out3((buildHi - b.t) * 6);
    const demo = b.layer === 0 && b.k === 0 ? win(f, E("buyTag"), E("loLevel"), 4, 10) : 0;
    if (f < fire) return { s: grow, ghost: ghostK, glow: demo };
    const t0 = ignite(b);
    if (f < t0) return { s: 1 };
    if (f < t0 + 8) return { s: 1, glow: 1 }; // lit
    if (f < t0 + 22) return { s: 1 - ease((f - t0 - 8) / 14), glow: 1 }; // collapses into a bead
    return f >= E("pileUnder") ? { s: underGhost, ghost: 0.8 } : null;
  };
  // beads: each lit brick sends one bead along its layer into the sweep candle
  const beads: React.ReactNode[] = [];
  if (inMech && f >= fire && f < volume + 30 && st.A > 0.01) {
    STACK_HI.forEach((b, j) => {
      const t0 = ignite(b) + 14;
      const u = (f - t0) / 16;
      if (u < 0) return;
      const [tx, ty, tz] = tip();
      if (u < 1) {
        const k = ease(u);
        beads.push(<Bead key={j} p={[b.x + (tx - b.x) * k, b.y + (ty - 0.25 - b.y) * k, b.z + (tz - b.z) * k]} r={0.07} color={COL.up} op={st.A} />);
      }
    });
  }
  const knot = inMech && f >= fire + 20 ? clamp01((f - fire - 20) / 20) * (1 - ramp(f, volume, 10)) : 0;
  const drop = clamp01((f - volume) / 12);
  const huntVol = 0.9 + (SERIES_A[HUNT].v - 0.9) * out3((f - volume - 10) / 14);
  const ringK = (f - volume - 10) / 26;
  const slabIn = ramp(f, counter, 12) * (1 - ramp(f, E("wickIn") + 10, 12));
  const absorb = win(f, counter + 6, counter + 40, 6, 20);
  const loAt = (b: Brick): BrickState => {
    if (!inMech) return null;
    if (f >= E("gather")) return b.t < refill ? { s: out3((refill - b.t) * 6) } : { s: 1 };
    if (b.t >= buildLo) return null;
    const demo = b.layer === 0 && b.k === 0 ? win(f, E("sellTag"), E("hidden"), 4, 10) : 0;
    return { s: out3((buildLo - b.t) * 6), ghost: ghostK, glow: demo };
  };
  const buildR = ramp(f, E("round"), 24);
  const rAt = (b: Brick): BrickState => (f >= pollIn && b.t < buildR ? { s: out3((buildR - b.t) * 6), glow: 0.25 * win(f, E("visible"), E("checkIn"), 10, 10) } : null);
  const same = win(f, E("same"), E("checkIn"), 6, 12) * (0.5 + 0.5 * Math.cos(((f - E("same")) / 14) * Math.PI * 2) ** 2);

  // ---------- stage B: checks, test, stop hugging the level
  const checkIn = E("checkIn");
  const buildB = ramp(f, checkIn + 20, 30);
  const stopIn = E("stopIn");
  const refillB = ramp(f, stopIn, 18);
  const pierceA = E("pierce");
  const bAt = (b: Brick, j: number): BrickState => {
    if (b.t >= buildB) return null;
    const base = { s: out3((buildB - b.t) * 6), ghost: f < stopIn ? 0.55 : 0 };
    // the test pierce takes the bricks below its wick high
    if (b.price - 0.03 < TEST_WICK && f >= pierceA + 6) {
      const t0 = pierceA + 6 + (b.layer * 5 + (b.k / 5) * 6);
      if (f >= stopIn) return b.t < 1.01 ? { s: out3((refillB - b.layer * 0.2) * 3), ghost: 0, glow: spikeHit(b, j) } : null;
      if (f < t0) return base;
      if (f < t0 + 8) return { ...base, glow: 1, ghost: 0 };
      return { s: 1 - ease((f - t0 - 8) / 12), glow: 1, ghost: 0 };
    }
    return { ...base, glow: f >= stopIn ? spikeHit(b, j) : 0 };
  };
  /** the probe on stage B lights the bricks it passes (your stop is one of them) */
  const spikeHit = (b: Brick, _j: number) => {
    const reach = Bb[SPIKE_I].h;
    return b.price - 0.03 < reach && f >= E("badStop") + 14 ? win(f, E("badHit") - 2, E("goodIn") + 10, 4, 12) : 0;
  };
  // ---------- stage C: same market, stop beyond the structure
  const cAt = (b: Brick): BrickState => {
    const lit = b.price - 0.03 < Cb[SPIKE_I].h && f >= E("goodHold") ? win(f, E("goodHold") + 8, E("goodHold") + 50, 4, 16) : 0;
    return { s: 1, glow: lit + 0.5 * win(f, E("notYou"), 1e9, 14, 10) * st.dimEnd };
  };
  const span = bufferSpan(f);
  const goodStop = GOOD_STOP(span);
  const badOp = win(f, E("badStop"), E("goodIn") + 18, 10, 10) * st.B;
  const badBroken = ramp(f, E("badHit") + 4, 10);
  const goodOp = ramp(f, E("goodIn") + 4, 12) * st.C;
  const bandOp = ramp(f, E("buffer"), 14) * st.C;
  const awayGlow = win(f, E("away"), 1e9, 12, 10);

  // ---------- ladder (order book depth)
  const L = st.ladder;
  const many = ramp(f, E("liqMany"), 18);
  const rowHi = ramp(f, E("liqRow"), 10);
  const fill = E("liqFill");
  const done = ramp(f, E("liqDone"), 26);
  const ROWS = [1.1, 0.7, 1.4, 0.8, 1.0, 0.6, 1.2, 0.9, 0.7];
  const THICK = 4;

  const checkVol = win(f, E("c1") - 6, stopIn + 6, 10, 10) * st.B;
  const avgB = avgVol(SERIES_REAL, TOUCH);

  return (
    <>
      <Rig f={f} />
      <color attach="background" args={[COL.bg]} />
      <fog attach="fog" args={[COL.fog, 14, 46]} />
      <ambientLight intensity={0.22} color="#9fb2d6" />
      <hemisphereLight args={["#2a3550", "#05070c", 0.5]} />
      <KeyLight f={f} />
      <pointLight position={[cam(f).t[0] - 6, cam(f).t[1] + 3, -4]} intensity={18} distance={20} color="#ffd9a0" />
      <Floor />
      <Dust />

      {/* light shafts: two over each stage, plus the ones that point at what the voice is about */}
      <Beam x={4} y={-6.2} z={-3.5} h={18} r={2.6} op={0.05 * Math.max(st.A, 0.2)} />
      <Beam x={-38} y={-6.2} z={-3.5} h={18} r={2.6} op={0.05 * Math.max(st.B, 0.2)} />
      <Beam x={-68} y={-6.2} z={-3.5} h={18} r={2.6} op={0.05 * Math.max(st.C, 0.2)} />
      <Beam x={YOU_BRICK.x} y={YOU_BRICK.y} z={YOU_BRICK.z} h={10} r={0.7} op={0.18 * (1 - ramp(f, reveal, 20))} />
      {[A_HIGH, A_LOW, ROUND].map((p, i) => (
        <Beam key={p} x={px(36)} y={py(p) + (p === A_LOW ? -0.8 : 0)} z={-0.8} h={11} r={1.6} op={0.16 * win(f, E("visible") + i * 5, E("checkIn"), 10, 12) * st.A} />
      ))}
      <Beam x={STACK_C[2].x} y={STACK_C[0].y} z={-0.8} h={10} r={2.2} op={0.12 * win(f, E("notYou"), 1e9, 16, 10) * st.dimEnd} />

      {/* ================= stage A: the range and the sweep ================= */}
      <Candles bars={A} st={SA} op={st.A * (inMech ? 1 : ramp(f, reveal, 20))} from={22} />
      <Volume bars={A} st={SA} op={st.A * win(f, mechIn, pollIn + 20, 14, 12)} from={26} vol={(i) => (i === HUNT ? huntVol : SERIES_A[i].v)} hot={(i) => (i === HUNT ? out3((f - volume - 10) / 10) * (1 - ramp(f, E("wickIn") + 20, 20)) : 0)} />
      <Level y={py(A_HIGH)} x0={px(A_HI) - 0.3} x1={xA1} k={inMech ? ramp(f, E("hiLevel"), 16) : 1} op={st.A} glow={same + 0.6 * win(f, E("look"), pollIn, 8, 12)} />
      <Level y={py(A_LOW)} x0={px(A_LO) - 0.3} x1={xA1} k={ramp(f, E("loLevel"), 16)} op={st.A * (inMech ? 1 : 0)} glow={same} />
      <Level y={py(ROUND)} x0={px(28)} x1={xA1} k={ramp(f, E("round"), 16)} op={st.A * (f >= pollIn ? 1 : 0)} glow={same} />
      <Bricks bricks={STACK_HI} color={COL.up} op={st.A} at={hiAt} />
      {/* one mechanism per shot: the low stack steps back while the sweep plays above */}
      <Bricks bricks={STACK_LO} color={COL.down} op={st.A * (1 - 0.75 * win(f, E("hunt"), E("wickIn") + 10, 12, 16))} at={loAt} />
      <Bricks bricks={STACK_RD} color={COL.up} op={st.A} at={rAt} />
      {/* the one-off flick through your brick in the first sentence */}
      {sweepK > 0 && sweepK < 1 && <Bead p={[YOU_BRICK.x + 0.7, YOU_BRICK.y - 0.6 + 1.6 * ease(sweepK), 0.1]} r={0.05} color={COL.warm} op={1 - sweepK} />}
      {sweepK > 0 && sweepK < 1 && (
        <mesh geometry={UNIT_CYL} position={[YOU_BRICK.x + 0.7, YOU_BRICK.y - 0.6 + 0.8 * ease(sweepK), 0.1]} scale={[0.02, 1.6 * ease(sweepK), 0.02]}>
          <meshBasicMaterial color={COL.warm} toneMapped={false} transparent opacity={0.8 * (1 - sweepK)} />
        </mesh>
      )}
      {/* "触发 → 买入 / 卖出": one brick turns into a market order */}
      <Arrow p={[STACK_HI.find((b) => b.layer === 0 && b.k === 0)!.x, STACK_HI[0].y + 0.2, -0.78]} dir={1} len={1.1 * out3((f - E("buyTag")) / 12)} color={COL.up} op={win(f, E("buyTag"), E("loLevel"), 4, 10) * st.A} />
      <Arrow p={[STACK_LO.find((b) => b.layer === 0 && b.k === 0)!.x, STACK_LO[0].y - 0.2, -0.78]} dir={-1} len={1.1 * out3((f - E("sellTag")) / 12)} color={COL.down} op={win(f, E("sellTag"), E("hidden"), 4, 10) * st.A} />
      {beads}
      <Bead p={tip()} r={0.22 * out3(knot * 1.4)} color={COL.up} op={knot * st.A} />
      {drop > 0 && drop < 1 && <Bead p={[px(HUNT), tip()[1] + (FLOOR_Y + 0.4 - tip()[1]) * ease(drop), 0.05]} r={0.2} color={COL.up} op={st.A} />}
      <Ring x={px(HUNT)} z={0} k={ringK} color={COL.up} op={st.A} />
      <Ring x={px(HUNT)} z={0} k={ringK - 0.25} color={COL.up} op={st.A * 0.6} />
      <Slab p={[GOLD_SLAB.x, GOLD_SLAB.y, GOLD_SLAB.z]} s={[GOLD_SLAB.w * (1 - 0.25 * ramp(f, counter + 10, 30)), GOLD_SLAB.h * out3(slabIn), GOLD_SLAB.d]} color="#cfc3ad" op={0.92 * slabIn * st.A} ei={0.04 + 0.45 * absorb} />

      {/* ================= ladder: order-book depth ================= */}
      {L > 0.002 &&
        ROWS.map((n, r) => {
          const y = (r - THICK) * 0.62;
          const thick = r === THICK;
          const rowIn = ramp(f, E("liqIn") + 6 + r * 2, 12);
          let len = n * (thick ? 1 + 4.2 * many : 1);
          if (thick) len *= 1 - 0.85 * done;
          const col = thick && rowHi > 0.5 ? COL.gold : COL.steel;
          return (
            <group key={`row${r}`}>
              <Slab p={[LADDER_X + 0.2 + (len * rowIn) / 2, y, -0.3]} s={[Math.max(0.02, len * rowIn), 0.42, 0.7]} color={col} op={L * (thick ? 1 : 0.75 - 0.35 * many)} ei={thick ? 0.12 + 0.4 * rowHi : 0.05} />
              <Level y={y - 0.26} x0={LADDER_X - 4.2} x1={LADDER_X + 7.5} k={rowIn} op={L * (thick ? 0.6 * rowHi : 0)} />
            </group>
          );
        })}
      {L > 0.002 &&
        (() => {
          const k = ease((f - fill) / 20);
          const w = 2.4 * (1 - 0.8 * done);
          const x = LADDER_X - 6 + (LADDER_X + 0.1 - w / 2 - (LADDER_X - 6)) * k;
          return <Slab p={[x, 0, -0.3]} s={[w, 0.5, 0.8]} color={COL.warm} op={L * clamp01((f - fill) / 6)} ei={0.2 + 0.8 * done} />;
        })()}

      {/* ================= stage B: the checks, the test, a stop hugging the level ================= */}
      <Candles bars={Bb} st={SB} op={st.B} from={6} />
      {/* the volume of stage B stands on its own glass tray just under the chart */}
      <Slab p={[(px(14, SB) + px(33, SB)) / 2, VB_TRAY - 0.03, -0.1]} s={[px(33, SB) - px(14, SB) + 0.8, 0.05, 1.1]} color="#1a2232" op={checkVol * 0.9} ei={0.02} r={0.02} />
      <Volume bars={Bb} st={SB} op={checkVol} from={14} k={0.36} base={VB_TRAY} hot={(i) => (i === TOUCH ? win(f, E("c1vol"), E("c2"), 6, 12) : 0)} />
      <Slab p={[(px(14, SB) + px(33, SB)) / 2, VB_TRAY + avgB * 0.36, 0.2]} s={[px(33, SB) - px(14, SB), 0.03, 0.03]} color={COL.warm} op={checkVol * ramp(f, E("c1vol"), 10)} ei={0.8} r={0.01} />
      <Level y={py(B_HIGH, SB)} x0={px(B_HI, SB) - 0.3} x1={px(SPIKE_I, SB) + 0.6} k={ramp(f, checkIn + 8, 18)} op={st.B} glow={0.6 * win(f, E("c2hold"), E("c3"), 6, 12)} />
      <Bricks bricks={STACK_B} color={COL.up} op={st.B} at={bAt} />
      {/* a buyer catches the retest */}
      <Slab p={[px(TOUCH + 3, SB), py(B_HIGH, SB) - 0.12, 0.25]} s={[0.55, 0.2, 0.4]} color={COL.up} op={win(f, E("c3catch"), E("testIn"), 8, 10) * st.B} ei={0.8} />
      {/* your stop hugging the level: inside the stack, taken by the probe */}
      <Slab p={[px(31, SB), py(BAD_STOP, SB) - 0.6 * ease(clamp01((f - E("badHit") - 10) / 16)), 0.25]} s={[0.5, 0.12, 0.5]} color={badBroken > 0.5 ? COL.up : COL.warm} op={badOp * (1 - 0.6 * ramp(f, E("badHit") + 14, 16))} ei={0.6 + 1.2 * badBroken} />
      <Slab p={[(px(20, SB) + px(SPIKE_I, SB) + 0.6) / 2, py(BAD_STOP, SB), 0.36]} s={[px(SPIKE_I, SB) + 0.6 - px(20, SB), 0.035, 0.035]} color={COL.warm} op={badOp * (1 - badBroken * 0.75)} ei={0.8} r={0.01} />

      {/* ================= stage C: same market, the stop beyond the structure ================= */}
      <Candles bars={Cb} st={SC} op={st.C * st.bars} from={6} />
      <Level y={py(B_HIGH, SC)} x0={px(B_HI, SC) - 0.3} x1={px(SPIKE_I, SC) + 0.6} k={1} op={st.C * st.dimEnd} />
      <Bricks bricks={STACK_C} color={COL.up} op={st.C * (0.5 + 0.5 * st.dimEnd)} at={cAt} />
      {/* structure high and the buffer above it */}
      <Slab p={[(px(20, SC) + px(SPIKE_I, SC) + 0.6) / 2, py(TEST_WICK, SC), 0.36]} s={[px(SPIKE_I, SC) + 0.6 - px(20, SC), 0.025, 0.025]} color={COL.warm} op={bandOp * 0.6 * st.bars} ei={0.4} r={0.01} />
      <mesh position={[(px(20, SC) + px(SPIKE_I, SC) + 0.6) / 2, (py(TEST_WICK, SC) + py(goodStop, SC)) / 2, -0.2]}>
        <boxGeometry args={[px(SPIKE_I, SC) + 0.6 - px(20, SC), Math.max(0.01, py(goodStop, SC) - py(TEST_WICK, SC)), 1.1]} />
        <meshPhysicalMaterial color={COL.warm} emissive={COL.warm} emissiveIntensity={0.15} transparent opacity={0.1 * bandOp} depthWrite={false} roughness={0.1} />
      </mesh>
      <Slab p={[(px(20, SC) + px(SPIKE_I, SC) + 0.6) / 2, py(goodStop, SC), 0.36]} s={[px(SPIKE_I, SC) + 0.6 - px(20, SC), 0.04, 0.04]} color={COL.warm} op={goodOp} ei={0.9 + awayGlow} r={0.015} />
      <Slab p={[px(31, SC), py(goodStop, SC) + 0.08, 0.25]} s={[0.5, 0.12, 0.5]} color={COL.warm} op={goodOp} ei={0.8 + 1.2 * awayGlow} />
    </>
  );
};
