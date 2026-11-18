// The 3D trading stage. Bevelled clear-coat candles over a reflective floor, glass price shelves, order books whose
// resting (passive) orders are clear glass slabs, active orders as one bright pulse that crosses the spread and eats
// what it hits, volume glass columns with a solid delta core, light shafts and fog.
// Palette: deep blue-black, warm white (text, glass), gold (key prices, last trade), red (active buy / up),
// green (active sell / down). Nothing else. Everything is a pure function of the frame.
import { MeshReflectorMaterial } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { bookAbsorb, bookBuyA, bookBuyB, bookSellA, bookSellB, chaseBars, chaseFocus, secondBook, threeFocus, hookBars, logicBars, threeBars, volumeOn, type BookState, type LiveBar } from "./acts";
import { E, clamp01, ease, out3, ramp, win } from "./cue";
import {
  BOOK_CANDLE_DX, BOOK_Y, CHASE, CHASE_LEVEL, CH_DIV, CH_WALL, CH_WALL_I, CH_YANG, END_BOOK_X, END_CANDLE, FLOOR_Y, HOOK, LG_BREAK, LG_RETEST, LOGIC,
  LOGIC_LEVEL, LV, SIZE_W, SLAB_D, SLAB_H, TOWER_W, THREE as TH, THREE_LEVEL, TH_EXPAND, TH_FAR, TH_NEAR, TH_PUSH, VOL_K, X, cx, cy, ly, type Chart,
} from "./data";
import { cam, presence } from "./director";
import { LAYOUT } from "./layout";

export const COL = {
  bg: "#04070d",
  fog: "#070c16",
  up: "#e5484d",
  down: "#25b07a",
  gold: "#e9b44c",
  warm: "#f3ead9",
  glass: "#dfe3ea",
  steel: "#7d889c",
};

// ---------------------------------------------------------------- shared geometry
const geoCache = new Map<string, THREE.BufferGeometry>();
const rbox = (w: number, h: number, d: number, r = 0.05) => {
  const q = (v: number) => Math.max(0.01, Math.round(v * 100) / 100);
  const key = `${q(w)}|${q(h)}|${q(d)}|${r}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(q(w), q(h), q(d), 4, Math.min(r, q(h) / 2 - 0.002, q(w) / 2 - 0.002, q(d) / 2 - 0.002));
    geoCache.set(key, g);
  }
  return g;
};
const edgeCache = new Map<string, THREE.BufferGeometry>();
const edges = (w: number, h: number, d: number) => {
  const q = (v: number) => Math.max(0.01, Math.round(v * 100) / 100);
  const key = `${q(w)}|${q(h)}|${q(d)}`;
  let g = edgeCache.get(key);
  if (!g) {
    g = new THREE.EdgesGeometry(new THREE.BoxGeometry(q(w), q(h), q(d)));
    edgeCache.set(key, g);
  }
  return g;
};
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 18);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 20, 14);
const CONE = new THREE.ConeGeometry(1, 1, 24);

// ---------------------------------------------------------------- camera rig + key light that follows the subject
const Rig: React.FC<{ f: number }> = ({ f }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const c = cam(f);
  camera.fov = c.fov;
  camera.near = 0.1;
  camera.far = 400;
  // centre the stage on the data zone, not on the frame (LAYOUT.viewShift)
  camera.setViewOffset(LAYOUT.W, LAYOUT.H, 0, LAYOUT.viewShift, LAYOUT.W, LAYOUT.H);
  camera.updateProjectionMatrix();
  camera.position.set(...c.p);
  camera.lookAt(...c.t);
  camera.updateMatrixWorld();
  return null;
};
const KeyLight: React.FC<{ f: number }> = ({ f }) => {
  const c = cam(f);
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight("#fff3e0", 2.4);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.radius = 6;
    l.shadow.blurSamples = 12;
    l.shadow.bias = -0.0004;
    const s = l.shadow.camera as THREE.OrthographicCamera;
    s.left = -14;
    s.right = 14;
    s.top = 14;
    s.bottom = -14;
    s.near = 1;
    s.far = 60;
    return l;
  }, []);
  light.position.set(c.t[0] + 4, c.t[1] + 13, c.t[2] + 9);
  light.target.position.set(c.t[0], c.t[1] - 2, c.t[2]);
  light.target.updateMatrixWorld();
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
};

// ---------------------------------------------------------------- primitives
/** one candle: rounded clear-coat body + wick; grey = desaturated ("don't read the colour"), hot = lit */
const Candle: React.FC<{ x: number; y: (p: number) => number; b: { o: number; h: number; l: number; c: number }; g: number; op: number; hot?: number; grey?: number; w?: number }> = ({ x, y, b, g, op, hot = 0, grey = 0, w = 0.4 }) => {
  if (g <= 0.001 || op <= 0.002) return null;
  const up = b.c >= b.o;
  const base = new THREE.Color(up ? COL.up : COL.down).lerp(new THREE.Color(COL.steel), grey * 0.85);
  const col = `#${base.getHexString()}`;
  const bh = Math.max(0.05, Math.abs(y(b.c) - y(b.o)));
  const wl = Math.max(0.02, y(b.h) - y(b.l));
  const tr = op < 0.995;
  return (
    <group>
      <mesh geometry={UNIT_CYL} position={[x, (y(b.h) + y(b.l)) / 2, 0]} scale={[0.028, wl, 0.028]} castShadow>
        <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.25 + 1.1 * hot} roughness={0.35} clearcoat={1} transparent={tr} opacity={op} />
      </mesh>
      <mesh geometry={rbox(w, bh, w, 0.06)} position={[x, (y(b.c) + y(b.o)) / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.08 + 0.8 * hot} roughness={0.22} metalness={0.05} clearcoat={1} clearcoatRoughness={0.1} sheen={0.5} sheenColor="#ffffff" transparent={tr} opacity={op} />
      </mesh>
    </group>
  );
};

/** a horizontal glowing bar (front edges, level lines) */
const Bar: React.FC<{ x0: number; x1: number; y: number; z: number; color: string; op: number; r?: number }> = ({ x0, x1, y, z, color, op, r = 0.018 }) =>
  op <= 0.002 || x1 - x0 <= 0.01 ? null : (
    <mesh geometry={UNIT_CYL} position={[(x0 + x1) / 2, y, z]} rotation={[0, 0, Math.PI / 2]} scale={[r, x1 - x0, r]}>
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op} depthWrite={false} />
    </mesh>
  );
/** a segment between two points */
const Seg: React.FC<{ a: [number, number, number]; b: [number, number, number]; color: string; op: number; r?: number }> = ({ a, b, color, op, r = 0.02 }) => {
  if (op <= 0.002) return null;
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  if (len < 0.01) return null;
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return (
    <mesh geometry={UNIT_CYL} position={mid} quaternion={q} scale={[r, len, r]}>
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op} depthWrite={false} />
    </mesh>
  );
};
const Dot: React.FC<{ p: [number, number, number]; r: number; color: string; op: number }> = ({ p, r, color, op }) =>
  op <= 0.002 || r <= 0.001 ? null : (
    <mesh geometry={UNIT_SPHERE} position={p} scale={[r, r, r]}>
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op} />
    </mesh>
  );

/** glass slab = a resting (passive) order; clear body, lit edges, a bright front-top edge */
const Glass: React.FC<{ p: [number, number, number]; s: [number, number, number]; op: number; glow?: number; tint?: string; edge?: string; solid?: number }> = ({ p, s, op, glow = 0, tint = COL.glass, edge = COL.warm, solid = 0 }) => {
  if (op <= 0.002 || s[0] <= 0.015) return null;
  return (
    <group position={p}>
      <mesh geometry={rbox(s[0], s[1], s[2], 0.04)} castShadow={op > 0.6} receiveShadow>
        <meshPhysicalMaterial color={tint} emissive={edge} emissiveIntensity={0.04 + 0.5 * glow} roughness={0.06} metalness={0} clearcoat={1} clearcoatRoughness={0.05} transparent opacity={op * (0.2 + 0.25 * solid + 0.12 * glow)} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={edges(s[0], s[1], s[2])}>
        <lineBasicMaterial color={edge} toneMapped={false} transparent opacity={op * (0.45 + 0.55 * glow)} />
      </lineSegments>
      <Bar x0={-s[0] / 2} x1={s[0] / 2} y={s[1] / 2} z={s[2] / 2} color={edge} op={op * (0.55 + 0.45 * glow)} r={0.014 + 0.01 * glow} />
    </group>
  );
};

/** the outline of what an active order took */
const Outline: React.FC<{ p: [number, number, number]; s: [number, number, number]; op: number; color: string }> = ({ p, s, op, color }) =>
  op <= 0.002 ? null : (
    <lineSegments geometry={edges(s[0], s[1], s[2])} position={p}>
      <lineBasicMaterial color={color} toneMapped={false} transparent opacity={op} />
    </lineSegments>
  );

/** an active order: one bright pulse with a head, travelling from y0 to y1 */
const PulseMesh: React.FC<{ x: number; z: number; y0: number; y1: number; dir: 1 | -1; color: string; op: number; r?: number }> = ({ x, z, y0, y1, dir, color, op, r = 0.06 }) => {
  if (op <= 0.002) return null;
  const len = Math.abs(y1 - y0);
  const head = 0.3;
  return (
    <group>
      {len > 0.02 && (
        <mesh geometry={UNIT_CYL} position={[x, (y0 + y1) / 2 - (dir * head) / 2, z]} scale={[r, Math.max(0.01, len - head), r]}>
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op * 0.9} depthWrite={false} />
        </mesh>
      )}
      <mesh geometry={CONE} position={[x, y1 - (dir * head) / 2, z]} rotation={[dir > 0 ? 0 : Math.PI, 0, 0]} scale={[r * 2.6, head, r * 2.6]}>
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op} />
      </mesh>
      <Dot p={[x, y1, z]} r={r * 1.6} color={color} op={op * 0.8} />
    </group>
  );
};

/** gold glass price level with a lit front edge */
const Level: React.FC<{ y: number; x0: number; x1: number; k: number; op: number; glow?: number; color?: string; z?: number }> = ({ y, x0, x1, k, op, glow = 0, color = COL.gold, z = 0.4 }) => {
  if (k <= 0.002 || op <= 0.002) return null;
  const w = Math.max(0.02, (x1 - x0) * out3(k));
  return (
    <group>
      <mesh position={[x0 + w / 2, y, -0.4]}>
        <boxGeometry args={[w, 0.012, 1.8]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.04 + 0.12 * glow} roughness={0.1} transparent opacity={(0.05 + 0.04 * glow) * op} depthWrite={false} />
      </mesh>
      <Bar x0={x0} x1={x0 + w} y={y} z={z} color={color} op={op * (0.75 + 0.25 * glow)} r={0.02 + 0.008 * glow} />
    </group>
  );
};

/** translucent zone (a price band over a range of bars) */
const Zone: React.FC<{ x0: number; x1: number; y0: number; y1: number; color: string; op: number }> = ({ x0, x1, y0, y1, color, op }) =>
  op <= 0.002 ? null : (
    <group>
      <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, -0.15]}>
        <boxGeometry args={[x1 - x0, y1 - y0, 0.9]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.2} transparent opacity={0.1 * op} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges(x1 - x0, y1 - y0, 0.9)} position={[(x0 + x1) / 2, (y0 + y1) / 2, -0.15]}>
        <lineBasicMaterial color={color} toneMapped={false} transparent opacity={0.7 * op} />
      </lineSegments>
    </group>
  );

/** volume = clear glass column on the floor, delta = the solid core inside it (red buy-side, green sell-side) */
const VolCol: React.FC<{ x: number; base: number; v: number; d: number; k: number; op: number; glow?: number; w?: number }> = ({ x, base, v, d, k, op, glow = 0, w = 0.36 }) => {
  if (k <= 0.002 || op <= 0.002) return null;
  const h = Math.max(0.03, v * VOL_K * out3(k));
  const dh = Math.max(0.02, Math.abs(d) * VOL_K * 1.25 * out3(k));
  const col = d >= 0 ? COL.up : COL.down;
  return (
    <group>
      <Glass p={[x, base + h / 2 + 0.01, 0]} s={[w, h, w]} op={op * 0.9} glow={0.2 * glow} />
      <mesh geometry={rbox(w * 0.56, dh, w * 0.56, 0.03)} position={[x, base + dh / 2 + 0.02, 0]} castShadow>
        <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.15 + 1.1 * glow} roughness={0.25} clearcoat={1} transparent opacity={op} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- atmosphere
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
const Shaft: React.FC<{ x: number; y: number; z: number; h: number; r: number; op: number; color?: string }> = ({ x, y, z, h, r, op, color = COL.warm }) => {
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
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pts: number[] = [];
    for (let i = 0; i < 3000; i++) pts.push(-12 + r() * 220, FLOOR_Y + r() * 13, -9 + r() * 14);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color={COL.warm} size={0.03} sizeAttenuation transparent opacity={0.3} depthWrite={false} />
    </points>
  );
};
const Floor: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[95, FLOOR_Y, -2]} receiveShadow>
    <planeGeometry args={[240, 40]} />
    <MeshReflectorMaterial resolution={1024} blur={[400, 120]} mixBlur={1} mixStrength={2.0} mixContrast={1} roughness={0.85} depthScale={0.8} minDepthThreshold={0.4} maxDepthThreshold={1.2} color="#0a0f19" metalness={0.5} mirror={0.6} />
  </mesh>
);

// ---------------------------------------------------------------- an order book tower
/** glass shelves, resting orders, the active pulses, the last-trade plate, the spread and the price-response candle */
const Book: React.FC<{ s: BookState; op: number }> = ({ s, op }) => {
  if (op <= 0.002) return null;
  const x = s.cfg.x;
  const cxL = x + BOOK_CANDLE_DX;
  const lv = [1, 2, 3];
  const passive = op * (1 - s.dimPassive);
  return (
    <group>
      {/* glass shelves, one per price level */}
      {[-3, -2, -1, 1, 2, 3].map((k) => (
        <group key={k}>
          <mesh position={[x, ly(k) - SLAB_H / 2 - 0.02, -0.05]} receiveShadow>
            <boxGeometry args={[TOWER_W * 2, 0.018, 1.3]} />
            <meshPhysicalMaterial color={COL.glass} roughness={0.08} clearcoat={1} transparent opacity={0.07 * op} depthWrite={false} />
          </mesh>
          <Bar x0={x - TOWER_W} x1={x + TOWER_W} y={ly(k) - SLAB_H / 2 - 0.02} z={0.6} color={COL.warm} op={0.16 * op} r={0.008} />
        </group>
      ))}
      {/* resting orders: asks above the spread, bids below */}
      {lv.map((k, i) => (
        <React.Fragment key={k}>
          <Glass p={[x, ly(k), 0]} s={[s.asks[i] * SIZE_W, SLAB_H, SLAB_D]} op={passive} glow={s.askHit[i]} edge={s.askHit[i] > 0.05 ? COL.up : COL.warm} />
          <Glass p={[x, ly(-k), 0]} s={[s.bids[i] * SIZE_W, SLAB_H, SLAB_D]} op={passive} glow={s.bidHit[i]} edge={s.bidHit[i] > 0.05 ? COL.down : COL.warm} />
          <Outline p={[x, ly(k), 0]} s={[s.cfg.asks[i] * SIZE_W, SLAB_H, SLAB_D]} op={op * 0.8 * s.takenA[i] * (s.asks[i] < s.cfg.asks[i] - 0.05 ? 1 : 0)} color={COL.up} />
          <Outline p={[x, ly(-k), 0]} s={[s.cfg.bids[i] * SIZE_W, SLAB_H, SLAB_D]} op={op * 0.8 * s.takenB[i] * (s.bids[i] < s.cfg.bids[i] - 0.05 ? 1 : 0)} color={COL.down} />
        </React.Fragment>
      ))}
      {/* your own resting order, in front of the queue at its level */}
      {s.mine && (
        <Glass p={[x + 0.15, ly(s.mine.level), 0.62]} s={[s.mine.size * SIZE_W, SLAB_H * 0.92, 0.42]} op={op * s.mine.op} glow={s.mine.glow} tint={COL.warm} edge={COL.warm} solid={0.6} />
      )}
      {/* the spread: the gap between best bid and best ask */}
      {s.spread > 0.01 && (
        <group>
          <Seg a={[x + TOWER_W + 0.12, ly(-1) + 0.05, 0.3]} b={[x + TOWER_W + 0.12, ly(1) - 0.05, 0.3]} color={COL.gold} op={op * s.spread} r={0.02} />
          <Bar x0={x + TOWER_W - 0.05} x1={x + TOWER_W + 0.2} y={ly(-1) + 0.05} z={0.3} color={COL.gold} op={op * s.spread} r={0.016} />
          <Bar x0={x + TOWER_W - 0.05} x1={x + TOWER_W + 0.2} y={ly(1) - 0.05} z={0.3} color={COL.gold} op={op * s.spread} r={0.016} />
        </group>
      )}
      {/* active orders */}
      {s.pulses.map((p, i) => (
        <PulseMesh key={i} x={x + (p.dx ?? 0)} z={p.z ?? 0.62} y0={ly(p.y0)} y1={ly(p.y1)} dir={p.dir} color={p.color === "up" ? COL.up : COL.down} op={op * p.op} />
      ))}
      {/* last trade */}
      <Level y={ly(s.price) + (s.price === Math.round(s.price) && s.price !== 0 ? -SLAB_H / 2 - 0.035 : 0)} x0={cxL - 0.45} x1={x + TOWER_W} k={1} op={op * (0.65 + 0.35 * s.plate)} glow={s.plate} z={0.66} />
      {/* how far the price actually moved */}
      {s.candle.h - s.candle.l > 0.04 && <Candle x={cxL} y={ly} b={s.candle} g={1} op={op} hot={s.candle.hot} w={0.42} />}
      {Math.abs(s.candle.c - s.candle.o) < 0.04 && <Bar x0={cxL - 0.22} x1={cxL + 0.22} y={ly(s.candle.c)} z={0} color={COL.warm} op={op * 0.7} r={0.02} />}
    </group>
  );
};

// ---------------------------------------------------------------- a candle chart with optional volume / delta row
const ChartBars: React.FC<{ ch: Chart; bars: LiveBar[]; op: number; vol?: number; volGlow?: (i: number) => number }> = ({ ch, bars, op, vol = 0, volGlow = () => 0 }) =>
  op <= 0.002 ? null : (
    <group>
      {bars.map((b, i) => (
        <React.Fragment key={i}>
          <Candle x={cx(ch, i)} y={(p) => cy(ch, p)} b={b} g={b.g} op={op * (b.op ?? 1)} hot={b.hot} grey={b.grey} />
          {vol > 0.002 && b.g > 0.01 && <VolCol x={cx(ch, i)} base={ch.vb} v={b.v} d={b.d} k={Math.min(vol, b.g)} op={op * (b.op ?? 1)} glow={volGlow(i)} />}
        </React.Fragment>
      ))}
    </group>
  );

// ---------------------------------------------------------------- the world
export const World: React.FC<{ f: number }> = ({ f }) => {
  const pr = presence(f);
  const c = cam(f);

  // ---------- chase
  const CB = chaseBars(f);
  const chVol = volumeOn(f, "chase") * (1 - ramp(f, E("cBig"), 12)); // the volume row steps back in the push-in on the wall
  const divK = ramp(f, E("cDelta"), 18);
  const wallIn = ramp(f, E("cBig") - 2, 10);
  const wallHit = win(f, E("cBig") + 2, E("cBig") + 26, 3, 12) + 0.7 * win(f, E("cAbs"), E("cYou"), 8, 10);
  const youK = ease((f - E("cYou")) / 16);
  const wallBite = 0.18 * clamp01((f - E("cYou") - 12) / 10);
  const chPulse = f >= E("cBig") - 4 && f < E("cBig") + 30 ? clamp01((f - E("cBig") + 4) / 12) : 0;
  const wx = cx(CHASE, CH_WALL_I);
  const wTop = cy(CHASE, CH_WALL.hi);
  const wBot = cy(CHASE, CH_WALL.lo);

  // ---------- three things
  const TB = threeBars(f);
  const thVol = volumeOn(f, "three");
  const expand = (i: number) => (TH_EXPAND.includes(i) ? win(f, E("t1keep") + (i - TH_EXPAND[0]) * 6, E("t2"), 8, 10) : 0);
  const thPulse = f >= E("t2big") && f < E("t2big") + 30 ? 1 : 0;
  const nearZ = win(f, E("t3a"), E("absIn"), 10, 8);
  const farZ = win(f, E("t3c"), E("absIn"), 10, 8) * (1 + 0.6 * win(f, E("cav1"), E("cav2"), 8, 8));
  const cavWall = win(f, E("cav2") + 2, E("absIn"), 10, 8);
  const cavCut = clamp01((f - E("cavBreak") + 6) / 10);
  const cavEaten = clamp01((f - E("cavBreak")) / 12);

  // ---------- logic
  const LB = logicBars(f);
  const lgVol = volumeOn(f, "logic");
  const catchW = ramp(f, E("lg4"), 12);
  const catchHit = win(f, E("lg4") + 12, E("endIn"), 6, 10);

  // ---------- end
  const endA = ramp(f, E("qYang"), 10) * (1 - 0.6 * ramp(f, E("qAct"), 10));
  const endB = ramp(f, E("qAct"), 10);
  const endDim = 1 - 0.55 * ramp(f, E("next"), 20);

  return (
    <>
      <Rig f={f} />
      <color attach="background" args={[COL.bg]} />
      <fog attach="fog" args={[COL.fog, 12, 44]} />
      <ambientLight intensity={0.22} color="#9fb2d6" />
      <hemisphereLight args={["#2a3550", "#05070c", 0.5]} />
      <KeyLight f={f} />
      <pointLight position={[c.t[0] - 5, c.t[1] + 3, -4]} intensity={16} distance={20} color="#ffd9a0" />
      <Floor />
      <Dust />

      {/* light shafts over each set */}
      {[X.hook, X.buyA, X.buyB, X.sellA, X.sellB, X.chase, X.three, X.absorb, X.logic, X.end].map((x, i) => (
        <Shaft key={i} x={x - 0.5} y={FLOOR_Y} z={-3.2} h={16} r={2.4} op={0.06} />
      ))}

      {/* ================= hook ================= */}
      <ChartBars ch={HOOK} bars={hookBars(f)} op={pr.hook} />
      <Shaft x={cx(HOOK, 6)} y={cy(HOOK, 100.4)} z={-0.4} h={6} r={0.9} op={0.18 * pr.hook * ramp(f, E("hookYang") + 10, 16)} color={COL.up} />

      {/* ================= 01 buy ================= */}
      <Book s={bookBuyA(f)} op={pr.buy} />
      <Book s={bookBuyB(f)} op={pr.buy * secondBook(f, "buy")} />

      {/* ================= 02 sell ================= */}
      <Book s={bookSellA(f)} op={pr.sell} />
      <Book s={bookSellB(f)} op={pr.sell * secondBook(f, "sell")} />

      {/* ================= 03 chase ================= */}
      <ChartBars ch={CHASE} bars={CB} op={pr.chase} vol={chVol} volGlow={(i) => (i === CH_YANG ? win(f, E("cVol"), E("cFade"), 8, 10) : CH_DIV.includes(i) ? 0.8 * win(f, E("cDelta"), E("cBig"), 8, 10) : i === CH_WALL_I ? 0.8 * win(f, E("cBig"), E("cYou"), 8, 10) : 0)} />
      <Level y={cy(CHASE, CHASE_LEVEL)} x0={cx(CHASE, 0) - 0.4} x1={cx(CHASE, CH_WALL_I) + 0.6} k={ramp(f, E("chaseIn") + 6, 16)} op={pr.chase * chaseFocus(f)} glow={win(f, E("cBreak"), E("cFade"), 6, 12)} />
      {/* divergence: highs rise (warm), delta peaks fall (gold) */}
      {divK > 0.002 &&
        CH_DIV.slice(0, -1).map((i, k) => {
          const j = CH_DIV[k + 1];
          const top = (b: number) => CHASE.vb + Math.abs(CHASE.bars[b].d) * VOL_K * 1.25 + 0.1;
          const op = pr.chase * clamp01(divK * 2 - k) * (1 - ramp(f, E("cBig"), 12));
          return (
            <group key={i}>
              <Seg a={[cx(CHASE, i), cy(CHASE, CHASE.bars[i].h) + 0.12, 0.3]} b={[cx(CHASE, j), cy(CHASE, CHASE.bars[j].h) + 0.12, 0.3]} color={COL.warm} op={op} r={0.022} />
              <Seg a={[cx(CHASE, i), top(i), 0.3]} b={[cx(CHASE, j), top(j), 0.3]} color={COL.gold} op={op} r={0.022} />
            </group>
          );
        })}
      {/* the passive sell wall above the highs, and the big active buy that cannot move it */}
      <Glass p={[wx - 0.3, (wTop + wBot) / 2, 0]} s={[2.0 * (1 - wallBite), wTop - wBot, 0.9]} op={pr.chase * wallIn} glow={wallHit} edge={wallHit > 0.1 ? COL.up : COL.warm} solid={0.3} />
      {chPulse > 0 && <PulseMesh x={wx} z={0.55} y0={cy(CHASE, 102.6)} y1={cy(CHASE, 102.6) + (wBot - cy(CHASE, 102.6)) * ease(chPulse)} dir={1} color={COL.up} op={pr.chase * (1 - clamp01((f - E("cBig") - 18) / 12))} r={0.09} />}
      {/* your order going into the wall */}
      {f >= E("cYou") && (
        <mesh geometry={rbox(0.3, 0.2, 0.3, 0.04)} position={[wx + 1.35 - 1.15 * youK, wBot - 0.6 + 0.5 * youK, 0.55]} castShadow>
          <meshPhysicalMaterial color={COL.warm} emissive={COL.warm} emissiveIntensity={0.4 + 0.8 * win(f, E("cYou") + 12, E("threeIn"), 4, 10)} roughness={0.2} clearcoat={1} transparent opacity={pr.chase * (1 - 0.7 * clamp01((f - E("cYou") - 18) / 10))} />
        </mesh>
      )}

      {/* ================= 04 three things ================= */}
      <ChartBars ch={TH} bars={TB} op={pr.three} vol={thVol} volGlow={expand} />
      <Level y={cy(TH, THREE_LEVEL)} x0={cx(TH, 0) - 0.4} x1={cx(TH, TH.bars.length - 1) + 0.5} k={ramp(f, E("threeIn") + 6, 16)} op={pr.three * threeFocus(f)} glow={0.5 * nearZ} />
      {thPulse > 0 && <PulseMesh x={cx(TH, TH_PUSH) + 0.3} z={0.3} y0={cy(TH, 101.1)} y1={cy(TH, 101.1) + 0.9 * ease((f - E("t2big")) / 10)} dir={1} color={COL.up} op={pr.three * (1 - clamp01((f - E("t2big") - 16) / 12))} r={0.07} />}
      {/* the advance that the buying actually bought: a gold bracket from open to close */}
      {(() => {
        const k = ramp(f, E("t2go"), 14) * (1 - ramp(f, E("t3a"), 12));
        const b = TH.bars[TH_PUSH];
        const xx = cx(TH, TH_PUSH) - 0.31;
        const y0 = cy(TH, b.o);
        const y1 = y0 + (cy(TH, b.c) - y0) * out3(k);
        return k > 0.002 ? (
          <group>
            <Seg a={[xx, y0, 0.3]} b={[xx, y1, 0.3]} color={COL.gold} op={pr.three * k} r={0.024} />
            <Bar x0={xx - 0.05} x1={xx + 0.12} y={y0} z={0.3} color={COL.gold} op={pr.three * k} />
            <Bar x0={xx - 0.05} x1={xx + 0.12} y={y1} z={0.3} color={COL.gold} op={pr.three * k} />
          </group>
        ) : null;
      })()}
      <Zone x0={cx(TH, TH_NEAR[0]) - 0.36} x1={cx(TH, TH_NEAR[1]) + 0.36} y0={cy(TH, THREE_LEVEL) - 0.12} y1={cy(TH, 101.95)} color={COL.gold} op={pr.three * nearZ} />
      <Zone x0={cx(TH, TH_FAR[0]) - 0.36} x1={cx(TH, TH_FAR[1]) + 0.36} y0={cy(TH, 102.2)} y1={cy(TH, 104.6)} color={COL.up} op={pr.three * Math.min(1.4, farZ) * 0.8} />
      {/* a big passive bid at the structure can still be taken */}
      <Glass p={[cx(TH, 8.5), cy(TH, THREE_LEVEL) - 0.2, 0.1]} s={[1.8 * (1 - 0.85 * cavEaten), 0.26, 0.8]} op={pr.three * cavWall} glow={win(f, E("cavBreak"), E("absIn"), 4, 10)} edge={cavEaten > 0.05 ? COL.down : COL.warm} />
      {cavCut > 0 && <PulseMesh x={cx(TH, 8.5)} z={0.6} y0={cy(TH, 101.6)} y1={cy(TH, 101.6) + (cy(TH, THREE_LEVEL) - 0.5 - cy(TH, 101.6)) * ease(cavCut)} dir={-1} color={COL.down} op={pr.three * (1 - clamp01((f - E("cavBreak") - 14) / 12))} r={0.07} />}

      {/* ================= 05 absorption ================= */}
      <Book s={bookAbsorb(f)} op={pr.absorb} />

      {/* ================= 06 trading logic ================= */}
      <ChartBars ch={LOGIC} bars={LB} op={pr.logic} vol={lgVol} volGlow={(i) => (i === LG_BREAK ? win(f, E("lg1"), E("lg3"), 8, 10) : 0)} />
      <Level y={cy(LOGIC, LOGIC_LEVEL)} x0={cx(LOGIC, 0) - 0.4} x1={cx(LOGIC, LOGIC.bars.length - 1) + 0.6} k={ramp(f, E("logicIn") + 6, 16)} op={pr.logic} glow={catchHit} />
      {(() => {
        const k = ramp(f, E("lg2"), 14);
        const b = LOGIC.bars[LG_BREAK];
        const xx = cx(LOGIC, LG_BREAK) - 0.31;
        const y0 = cy(LOGIC, b.o);
        const y1 = y0 + (cy(LOGIC, b.c) - y0) * out3(k);
        const op = pr.logic * k * (1 - 0.6 * ramp(f, E("lg4"), 12));
        return k > 0.002 ? (
          <group>
            <Seg a={[xx, y0, 0.3]} b={[xx, y1, 0.3]} color={COL.gold} op={op} r={0.024} />
            <Bar x0={xx - 0.05} x1={xx + 0.12} y={y0} z={0.3} color={COL.gold} op={op} />
            <Bar x0={xx - 0.05} x1={xx + 0.12} y={y1} z={0.3} color={COL.gold} op={op} />
          </group>
        ) : null;
      })()}
      <Glass p={[cx(LOGIC, LG_RETEST - 0.5), cy(LOGIC, LOGIC_LEVEL) - 0.17, 0.05]} s={[1.5, 0.26, 0.8]} op={pr.logic * catchW} glow={catchHit} edge={catchHit > 0.1 ? COL.down : COL.warm} />

      {/* ================= end ================= */}
      {pr.end > 0.002 && (
        <group>
          <Candle x={END_CANDLE.x} y={(p) => p} b={{ o: END_CANDLE.o, c: END_CANDLE.c, h: END_CANDLE.h, l: END_CANDLE.l }} g={1} op={pr.end * endDim} hot={0.7 * endA} w={0.9} />
          <Glass p={[END_BOOK_X, 1.4, 0]} s={[1.6, 0.34, 0.8]} op={pr.end * endDim} glow={0.5 * endB} />
          <Glass p={[END_BOOK_X, 1.4 + LV, 0]} s={[1.2, 0.34, 0.8]} op={pr.end * endDim * 0.8} />
          <PulseMesh x={END_BOOK_X} z={0.6} y0={-1.6} y1={-1.6 + (1.4 - 0.2 - -1.6) * (0.25 + 0.75 * ease((f - E("qAct")) / 14))} dir={1} color={COL.up} op={pr.end * endDim * (0.35 + 0.65 * endB)} r={0.09} />
        </group>
      )}
    </>
  );
};
