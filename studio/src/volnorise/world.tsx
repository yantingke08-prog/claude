// The 3D stage. Bevelled clear-coat candles over a reflective floor, a volume panel of rounded glass-and-colour
// columns under each chart, gold glass price lines, glass support shelves, light shafts, dust and fog.
// Palette: deep blue-black, warm white (text, glass), gold (key lines, highlights), red (up), green (down). Nothing else.
// Everything is a pure function of the frame.
import { MeshReflectorMaterial } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { aBars, bBars, hookBars, type LiveBar } from "./acts";
import { E, clamp01, ease, out3, ramp, win } from "./cue";
import { A, A_H, A_LEVEL, B_H, B_LEVEL, Bc, FLOOR_Y, HOOK, HOOK_H, X, cx, cy, vy, type Chart } from "./data";
import { cam, presence } from "./director";

export const COL = {
  bg: "#04070d",
  fog: "#070c16",
  up: "#e5484d",
  down: "#25b07a",
  gold: "#e9b44c",
  warm: "#f3ead9",
  glass: "#dfe3ea",
  steel: "#5d6778",
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
    s.left = -16;
    s.right = 16;
    s.top = 16;
    s.bottom = -16;
    s.near = 1;
    s.far = 70;
    return l;
  }, []);
  light.position.set(c.t[0] + 4, c.t[1] + 14, c.t[2] + 10);
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
type Bx = { o: number; h: number; l: number; c: number };
/** one candle: rounded clear-coat body + wick; grey = pressed into the dark, hot = lit; wickHot lights the lower wick only */
const Candle: React.FC<{ x: number; y: (p: number) => number; b: Bx; op: number; hot?: number; grey?: number; w?: number; wickHot?: number }> = ({ x, y, b, op, hot = 0, grey = 0, w = 0.2, wickHot = 0 }) => {
  if (op <= 0.002) return null;
  const up = b.c >= b.o;
  const base = new THREE.Color(up ? COL.up : COL.down).lerp(new THREE.Color(COL.steel), grey * 0.9);
  const col = `#${base.getHexString()}`;
  const bh = Math.max(0.035, Math.abs(y(b.c) - y(b.o)));
  const top = Math.max(y(b.o), y(b.c));
  const bot = Math.min(y(b.o), y(b.c));
  const tr = op < 0.995;
  const wr = Math.max(0.012, w * 0.075);
  return (
    <group>
      {y(b.h) - top > 0.01 && (
        <mesh geometry={UNIT_CYL} position={[x, (y(b.h) + top) / 2, 0]} scale={[wr, y(b.h) - top, wr]} castShadow>
          <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.25 + 1.1 * hot} roughness={0.35} clearcoat={1} transparent={tr} opacity={op} />
        </mesh>
      )}
      {bot - y(b.l) > 0.01 && (
        <mesh geometry={UNIT_CYL} position={[x, (bot + y(b.l)) / 2, 0]} scale={[wr * (1 + 0.8 * wickHot), bot - y(b.l), wr * (1 + 0.8 * wickHot)]} castShadow>
          <meshPhysicalMaterial color={wickHot > 0.05 ? COL.gold : col} emissive={wickHot > 0.05 ? COL.gold : col} emissiveIntensity={0.25 + 1.1 * hot + 1.4 * wickHot} roughness={0.35} clearcoat={1} transparent={tr} opacity={op} />
        </mesh>
      )}
      <mesh geometry={rbox(w, bh, w, 0.04)} position={[x, (y(b.c) + y(b.o)) / 2, 0]} castShadow receiveShadow>
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

/** a glass slab (support shelf): clear body, lit edges, a bright front-top edge */
const Glass: React.FC<{ p: [number, number, number]; s: [number, number, number]; op: number; glow?: number; edge?: string }> = ({ p, s, op, glow = 0, edge = COL.warm }) => {
  if (op <= 0.002 || s[0] <= 0.015) return null;
  return (
    <group position={p}>
      <mesh geometry={rbox(s[0], s[1], s[2], 0.03)} receiveShadow>
        <meshPhysicalMaterial color={COL.glass} emissive={edge} emissiveIntensity={0.04 + 0.5 * glow} roughness={0.06} clearcoat={1} clearcoatRoughness={0.05} transparent opacity={op * (0.18 + 0.14 * glow)} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={edges(s[0], s[1], s[2])}>
        <lineBasicMaterial color={edge} toneMapped={false} transparent opacity={op * (0.4 + 0.6 * glow)} />
      </lineSegments>
      <Bar x0={-s[0] / 2} x1={s[0] / 2} y={s[1] / 2} z={s[2] / 2} color={edge} op={op * (0.55 + 0.45 * glow)} r={0.012 + 0.01 * glow} />
    </group>
  );
};

/** gold price line drawn from x0 to the right, with a faint glass plane behind it */
const Level: React.FC<{ y: number; x0: number; x1: number; k: number; op: number; glow?: number; color?: string; z?: number }> = ({ y, x0, x1, k, op, glow = 0, color = COL.gold, z = 0.3 }) => {
  if (k <= 0.002 || op <= 0.002) return null;
  const w = Math.max(0.02, (x1 - x0) * out3(k));
  return (
    <group>
      <mesh position={[x0 + w / 2, y, -0.3]}>
        <boxGeometry args={[w, 0.01, 1.4]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.05 + 0.15 * glow} roughness={0.1} transparent opacity={(0.05 + 0.05 * glow) * op} depthWrite={false} />
      </mesh>
      <Bar x0={x0} x1={x0 + w} y={y} z={z} color={color} op={op * (0.7 + 0.3 * glow)} r={0.016 + 0.008 * glow} />
    </group>
  );
};

/** translucent zone over a range of bars */
const Zone: React.FC<{ x0: number; x1: number; y0: number; y1: number; color: string; op: number }> = ({ x0, x1, y0, y1, color, op }) =>
  op <= 0.002 ? null : (
    <group>
      <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, -0.12]}>
        <boxGeometry args={[x1 - x0, y1 - y0, 0.6]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.2} transparent opacity={0.09 * op} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges(x1 - x0, y1 - y0, 0.6)} position={[(x0 + x1) / 2, (y0 + y1) / 2, -0.12]}>
        <lineBasicMaterial color={color} toneMapped={false} transparent opacity={0.65 * op} />
      </lineSegments>
    </group>
  );

/** a vertical bracket (how far price moved) */
const Bracket: React.FC<{ x: number; y0: number; y1: number; k: number; op: number; color?: string }> = ({ x, y0, y1, k, op, color = COL.gold }) => {
  if (k <= 0.002 || op <= 0.002) return null;
  const yy = y0 + (y1 - y0) * out3(k);
  return (
    <group>
      <Seg a={[x, y0, 0.3]} b={[x, yy, 0.3]} color={color} op={op} r={0.02} />
      <Bar x0={x - 0.12} x1={x + 0.04} y={y0} z={0.3} color={color} op={op} r={0.016} />
      <Bar x0={x - 0.12} x1={x + 0.04} y={yy} z={0.3} color={color} op={op} r={0.016} />
    </group>
  );
};

/** an order hitting a shelf from above: one bright pulse with a head */
const Pulse: React.FC<{ x: number; z: number; y0: number; y1: number; color: string; op: number; r?: number }> = ({ x, z, y0, y1, color, op, r = 0.045 }) => {
  if (op <= 0.002) return null;
  const dir = y1 >= y0 ? 1 : -1;
  const len = Math.abs(y1 - y0);
  const head = 0.22;
  return (
    <group>
      {len > head && (
        <mesh geometry={UNIT_CYL} position={[x, (y0 + y1) / 2 - (dir * head) / 2, z]} scale={[r, len - head, r]}>
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op * 0.85} depthWrite={false} />
        </mesh>
      )}
      <mesh geometry={CONE} position={[x, y1 - (dir * head) / 2, z]} rotation={[dir > 0 ? 0 : Math.PI, 0, 0]} scale={[r * 2.6, head, r * 2.6]}>
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op} />
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
    for (let i = 0; i < 2400; i++) pts.push(-16 + r() * 52, FLOOR_Y + r() * 16, -10 + r() * 14);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color={COL.warm} size={0.03} sizeAttenuation transparent opacity={0.28} depthWrite={false} />
    </points>
  );
};
const Floor: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, FLOOR_Y, -2]}>
    <planeGeometry args={[90, 110]} />
    <MeshReflectorMaterial resolution={1024} blur={[400, 120]} mixBlur={1} mixStrength={2.0} mixContrast={1} roughness={0.85} depthScale={0.8} minDepthThreshold={0.4} maxDepthThreshold={1.2} color="#0a0f19" metalness={0.5} mirror={0.6} />
  </mesh>
);
// ---------------------------------------------------------------- a chart: candles + volume panel
type Look = { op: number; grey?: number; volOp?: number; hot?: (i: number) => number; volHot?: (i: number) => number; wickHot?: (i: number) => number };
const VOL_W = 0.2;
const ChartBars: React.FC<{ ch: Chart; bars: LiveBar[]; look: Look }> = ({ ch, bars, look }) => {
  const { op, grey = 0, volOp = op, hot = () => 0, volHot = () => 0, wickHot = () => 0 } = look;
  if (op <= 0.002 && volOp <= 0.002) return null;
  const y = (p: number) => cy(ch, p);
  const w = ch.xs * 0.62;
  return (
    <group>
      {/* volume panel floor line */}
      <Bar x0={cx(ch, 0) - 0.3} x1={cx(ch, ch.bars.length - 1) + 0.3} y={ch.vb - 0.01} z={0.2} color={COL.warm} op={0.18 * volOp} r={0.008} />
      {bars.map((b, i) => {
        if (b.g <= 0) return null;
        const vh = Math.max(0.02, (vy(ch, b.v) - ch.vb) * 1);
        const up = b.c >= b.o;
        const vc = new THREE.Color(up ? COL.up : COL.down).lerp(new THREE.Color(COL.steel), 0.35 + 0.5 * grey);
        const vhk = volHot(i);
        const vcol = vhk > 0.05 ? COL.gold : `#${vc.getHexString()}`;
        return (
          <React.Fragment key={i}>
            <Candle x={cx(ch, i)} y={y} b={b} op={op} hot={hot(i)} grey={grey} w={w} wickHot={wickHot(i)} />
            {volOp > 0.002 && (
              <mesh geometry={rbox(VOL_W * (ch.xs / 0.34), vh, VOL_W, 0.03)} position={[cx(ch, i), ch.vb + vh / 2, 0]} castShadow receiveShadow>
                <meshPhysicalMaterial color={vcol} emissive={vcol} emissiveIntensity={0.1 + 1.0 * vhk} roughness={0.3} clearcoat={1} clearcoatRoughness={0.15} transparent opacity={volOp * (0.55 + 0.4 * Math.max(vhk, 0.2))} />
              </mesh>
            )}
          </React.Fragment>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- timing helpers shared with the HUD
/** which chart the voice is on: 1 = A only, -1 = B only, 0 = both */
export const focus = (f: number) => {
  const spans: [string, string, number][] = [
    ["posA", "posB", 1],
    ["posB", "posSum", -1],
    ["vA", "vB", 1],
    ["vB", "c1", -1],
    ["cA", "cB", 1],
    ["cB", "b1", -1],
    ["bA", "bB", 1],
    ["bB", "sIn", -1],
  ];
  let v = 0;
  for (const [a, b, who] of spans) v += who * win(f, E(a), E(b), 14, 14);
  return v;
};
/** the hook chart is pressed into the dark at the end of the countdown, and comes back when the voice explains it */
export const hookDark = (f: number) => ramp(f, E("punch"), 8) * (1 - ramp(f, E("wIn"), 14));

// ---------------------------------------------------------------- the world
export const World: React.FC<{ f: number }> = ({ f }) => {
  const pr = presence(f);
  const c = cam(f);

  // ---------- hook
  const dark = hookDark(f);
  const tense = 0.25 * win(f, E("cd0"), E("punch"), 10, 4) * (1 - dark);
  const hHot = ramp(f, E("hHi"), 10) * (1 - 0.6 * dark);
  const hookLook: Look = {
    op: pr.hook * (1 - 0.82 * dark) * (1 - tense),
    grey: 0.85 * dark,
    volOp: pr.hook * (1 - 0.35 * dark) * (1 - tense * 0.5),
    hot: (i) => (i === HOOK_H ? 0.9 * hHot * (1 - dark) : 0),
    volHot: (i) => (i === HOOK_H ? hHot * (1 - 0.4 * dark) + 0.6 * win(f, E("wSell"), E("abIn"), 8, 8) : 0),
  };

  // ---------- A / B
  const fo = focus(f);
  const aOp = pr.ab * (1 - 0.8 * clamp01(-fo));
  const bOp = pr.ab * (1 - 0.8 * clamp01(fo));
  const hGlow = win(f, E("abNot"), E("pos1"), 8, 12);
  const aLow = win(f, E("posLow"), E("vol1"), 8, 10);
  const bHigh = win(f, E("posHigh"), E("vol1"), 8, 10);
  const pullK = (i: number) => (i > A_H && i <= A_H + 4 ? win(f, E("vShrink") + (i - A_H - 1) * 5, E("c1"), 6, 10) : 0);
  const aLook: Look = {
    op: aOp,
    volOp: aOp,
    hot: (i) => (i === A_H ? Math.max(hGlow, aLow) : 0) + (i === A_H + 5 ? 0.6 * win(f, E("cWick"), E("b1"), 8, 10) : 0),
    volHot: (i) => (i === A_H ? 0.7 * hGlow : 0) + pullK(i),
    wickHot: (i) => (i === A_H + 5 ? win(f, E("cWick"), E("b1"), 8, 12) : 0),
  };
  const bLook: Look = {
    op: bOp,
    volOp: bOp,
    hot: (i) => (i === B_H ? Math.max(hGlow, bHigh) : 0),
    volHot: (i) => (i === B_H ? 0.7 * hGlow : 0) + (i === B_H + 1 ? win(f, E("vBUp"), E("vBRe") + 10, 6, 10) : 0) + (i === B_H + 3 ? 0.8 * win(f, E("cBreak") + 10, E("cShort") + 20, 6, 10) : 0),
  };
  const xa0 = cx(A, 0);
  const xa1 = cx(A, A.bars.length - 1);
  const xb1 = cx(Bc, Bc.bars.length - 1);

  // A: the pullback's volume falling, as a gold line over the column tops
  const shrinkK = ramp(f, E("vShrink"), 18) * (1 - ramp(f, E("c1"), 12));
  const vTop = (i: number) => vy(A, A.bars[i].v) + 0.08;
  // catch: the shelf under A's line, and B's shelf that breaks
  const aLineK = ramp(f, E("cLow"), 16);
  const aShelf = ramp(f, E("cCatch") - 2, 10);
  const aShelfGlow = win(f, E("cCatch"), E("b1"), 6, 12);
  const bLineK = ramp(f, E("cBHere"), 14);
  const bShelf = ramp(f, E("cBHere") + 4, 10);
  const brk = clamp01((f - E("cBreak") - 4) / 12);
  const bPulse = f >= E("cBreak") - 2 && f < E("cBreak") + 26 ? clamp01((f - E("cBreak") + 2) / 10) : 0;
  // back: higher lows on A
  const hlK = ramp(f, E("bHigher"), 18);
  const lows = [A_H + 5, A_H + 6, A_H + 7].map((i) => [cx(A, i), cy(A, A.bars[i].l) - 0.09] as const);
  // logic: the bars after the heavy candle are where the answer is
  const ansK = win(f, E("lAns"), E("eIn") + 10, 12, 12);

  return (
    <>
      <Rig f={f} />
      <color attach="background" args={[COL.bg]} />
      <fog attach="fog" args={[COL.fog, 16, 56]} />
      <ambientLight intensity={0.22} color="#9fb2d6" />
      <hemisphereLight args={["#2a3550", "#05070c", 0.5]} />
      <KeyLight f={f} />
      <pointLight position={[c.t[0] - 5, c.t[1] + 3, -4]} intensity={16} distance={22} color="#ffd9a0" />
      <Floor />
      <Dust />
      <Shaft x={X.hook - 2} y={FLOOR_Y} z={-3.6} h={18} r={3.2} op={0.05 * pr.hook} />
      <Shaft x={X.ab - 1} y={FLOOR_Y} z={-3.4} h={18} r={3.2} op={0.05 * pr.ab} />

      {/* ================= hook ================= */}
      <ChartBars ch={HOOK} bars={hookBars(f)} look={hookLook} />
      <Shaft x={cx(HOOK, HOOK_H)} y={cy(HOOK, 12.5)} z={-0.4} h={5} r={0.7} op={0.16 * pr.hook * hHot * (1 - dark)} color={COL.gold} />

      {/* ================= A / B ================= */}
      <ChartBars ch={A} bars={aBars(f)} look={aLook} />
      <ChartBars ch={Bc} bars={bBars(f)} look={bLook} />

      {/* 01 position: A's base platform and how far each has risen */}
      <Zone x0={xa0 - 0.2} x1={cx(A, 6) + 0.2} y0={cy(A, 9.94)} y1={cy(A, 10.34)} color={COL.gold} op={aOp * win(f, E("posABase"), E("vol1"), 10, 10)} />
      <Bracket x={cx(A, A_H) + 0.32} y0={cy(A, 10.16)} y1={cy(A, A.bars[A_H].c)} k={ramp(f, E("posARise"), 16)} op={aOp * win(f, E("posARise"), E("vol1"), 1, 10)} />
      <Bracket x={cx(Bc, B_H) + 0.32} y0={cy(Bc, 10.0)} y1={cy(Bc, Bc.bars[B_H].c)} k={ramp(f, E("posBRise"), 20)} op={bOp * win(f, E("posBRise"), E("vol1"), 1, 10)} />
      <Bar x0={cx(Bc, 0) - 0.2} x1={cx(Bc, B_H) + 0.4} y={cy(Bc, 10.0)} z={0.3} color={COL.warm} op={0.5 * bOp * win(f, E("posBFar"), E("vol1"), 10, 10)} r={0.01} />

      {/* 02 volume: A's pullback volume falls day by day */}
      {shrinkK > 0.002 &&
        [A_H + 1, A_H + 2, A_H + 3].map((i, k) => (
          <Seg key={i} a={[cx(A, i), vTop(i), 0.25]} b={[cx(A, i + 1), vTop(i + 1), 0.25]} color={COL.gold} op={aOp * clamp01(shrinkK * 3 - k)} r={0.018} />
        ))}

      {/* 03 catch: the heavy candle's low as a line; a shelf on A that holds, one on B that breaks */}
      <Level y={cy(A, A_LEVEL)} x0={cx(A, A_H) - 0.2} x1={xa1 + 0.35} k={aLineK} op={aOp * (1 - ramp(f, E("lIn"), 14))} glow={aShelfGlow} />
      <Glass p={[cx(A, A_H + 5), cy(A, A_LEVEL) - 0.2 - 0.12, 0.05]} s={[1.0, 0.13, 0.5]} op={aOp * aShelf * (1 - ramp(f, E("bHigher") + 30, 14))} glow={aShelfGlow} edge={aShelfGlow > 0.1 ? COL.gold : COL.warm} />
      <Level y={cy(Bc, B_LEVEL)} x0={cx(Bc, B_H) - 0.2} x1={xb1 + 0.35} k={bLineK} op={bOp * (1 - ramp(f, E("lIn"), 14))} glow={win(f, E("bFail"), E("sIn"), 8, 10)} />
      <Glass p={[cx(Bc, B_H + 3), cy(Bc, B_LEVEL) - 0.1, 0.05]} s={[1.0 * (1 - 0.9 * brk), 0.13, 0.5]} op={bOp * bShelf * (1 - brk)} glow={win(f, E("cBreak"), E("cBreak") + 16, 3, 8)} edge={brk > 0.02 ? COL.down : COL.warm} />
      {bPulse > 0 && <Pulse x={cx(Bc, B_H + 3)} z={0.45} y0={cy(Bc, 15.5)} y1={cy(Bc, 15.5) + (cy(Bc, 14.66) - cy(Bc, 15.5)) * ease(bPulse)} color={COL.down} op={bOp * (1 - clamp01((f - E("cBreak") - 14) / 12))} />}

      {/* 04 back: A's lows rising */}
      {hlK > 0.002 && (
        <group>
          {lows.map(([x, y], k) => (
            <Dot key={k} p={[x, y, 0.3]} r={0.06} color={COL.gold} op={aOp * clamp01(hlK * 3 - k) * (1 - ramp(f, E("lIn"), 14))} />
          ))}
          {lows.slice(0, -1).map(([x, y], k) => (
            <Seg key={`s${k}`} a={[x, y, 0.3]} b={[lows[k + 1][0], lows[k + 1][1], 0.3]} color={COL.gold} op={aOp * clamp01(hlK * 3 - k - 1) * (1 - ramp(f, E("lIn"), 14))} r={0.016} />
          ))}
        </group>
      )}

      {/* logic: the answer is in the bars after the heavy candle */}
      <Zone x0={cx(A, A_H) + 0.18} x1={xa1 + 0.22} y0={cy(A, 10.95)} y1={cy(A, 12.2)} color={COL.gold} op={pr.ab * ansK} />
      <Zone x0={cx(Bc, B_H) + 0.18} x1={xb1 + 0.22} y0={cy(Bc, 13.9)} y1={cy(Bc, 15.75)} color={COL.gold} op={pr.ab * ansK} />
    </>
  );
};
