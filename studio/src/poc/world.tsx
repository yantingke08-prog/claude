// The 3D stage. Bevelled clear-coat candles over a dark reflective floor, rounded volume columns, and beside each
// session its volume profile as a stack of glass bricks (one brick per price, length = volume at that price). The POC
// is a gold line of light: a core, a soft additive glow and drifting sparks, whose strength G (0..1) is the film's motif —
// a faint glimmer at the start, lit by volume, a magnet line with field lines at the end.
// Palette: graphite black, warm white (glass, text), gold (POC only), red (up / buy), green (down / sell). Pure function of the frame.
import { MeshReflectorMaterial } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { live, rowsAt, type LiveBar } from "./acts";
import { E, clamp01, ease, out3, ramp, win } from "./cue";
import { A, A_HOOK, B, C, C_TEST, D1, D2, D3, PROF_W, W, W_DROP, YS, cx, cy, prof, rowLen, valueArea, vy, type Day } from "./data";
import { cam, presence } from "./director";
import { dom, lineState, type LineSpec } from "./lines";
import { COL } from "./palette";
import { levelEnd, markA } from "./tags";

// ---------------------------------------------------------------- shared geometry
const geoCache = new Map<string, THREE.BufferGeometry>();
const rbox = (w: number, h: number, d: number, r = 0.05) => {
  const q = (v: number) => Math.max(0.01, Math.round(v * 100) / 100);
  const key = `${q(w)}|${q(h)}|${q(d)}|${r}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(q(w), q(h), q(d), 3, Math.min(r, q(h) / 2 - 0.002, q(w) / 2 - 0.002, q(d) / 2 - 0.002));
    geoCache.set(key, g);
  }
  return g;
};
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 16);

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
    const l = new THREE.DirectionalLight("#fff1dc", 2.6);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.radius = 6;
    l.shadow.blurSamples = 10;
    l.shadow.bias = -0.0004;
    const s = l.shadow.camera as THREE.OrthographicCamera;
    s.left = -22;
    s.right = 22;
    s.top = 22;
    s.bottom = -22;
    s.near = 1;
    s.far = 80;
    return l;
  }, []);
  light.position.set(c.t[0] + 5, c.t[1] + 15, c.t[2] + 12);
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
const Bar3: React.FC<{ x0: number; x1: number; y: number; z: number; color: string; op: number; r?: number }> = ({ x0, x1, y, z, color, op, r = 0.016 }) =>
  op <= 0.002 || x1 - x0 <= 0.01 ? null : (
    <mesh geometry={UNIT_CYL} position={[(x0 + x1) / 2, y, z]} rotation={[0, 0, Math.PI / 2]} scale={[r, x1 - x0, r]}>
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={op} depthWrite={false} />
    </mesh>
  );
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

/** one candle: rounded clear-coat body + wick; grey = pressed into the dark, hot = lit, rim = a gold edge (touched the POC) */
const Candle: React.FC<{ x: number; d: Day; b: LiveBar; op: number; hot?: number; grey?: number; rim?: number }> = ({ x, d, b, op, hot = 0, grey = 0, rim = 0 }) => {
  if (op <= 0.002 || b.g <= 0) return null;
  const y = (p: number) => cy(d, p);
  const w = d.xs * 0.64;
  const up = b.c >= b.o;
  const base = new THREE.Color(up ? COL.up : COL.down).lerp(new THREE.Color(COL.steel), grey * 0.85);
  if (rim > 0) base.lerp(new THREE.Color(COL.goldHot), 0.35 * rim);
  const col = `#${base.getHexString()}`;
  const bh = Math.max(0.03, Math.abs(y(b.c) - y(b.o)));
  const top = Math.max(y(b.o), y(b.c));
  const bot = Math.min(y(b.o), y(b.c));
  const tr = op < 0.995;
  const wr = Math.max(0.012, w * 0.075);
  return (
    <group>
      {y(b.h) - top > 0.01 && (
        <mesh geometry={UNIT_CYL} position={[x, (y(b.h) + top) / 2, 0]} scale={[wr, y(b.h) - top, wr]} castShadow>
          <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.3 + 1.0 * hot} roughness={0.35} clearcoat={1} transparent={tr} opacity={op} />
        </mesh>
      )}
      {bot - y(b.l) > 0.01 && (
        <mesh geometry={UNIT_CYL} position={[x, (bot + y(b.l)) / 2, 0]} scale={[wr, bot - y(b.l), wr]} castShadow>
          <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.3 + 1.0 * hot} roughness={0.35} clearcoat={1} transparent={tr} opacity={op} />
        </mesh>
      )}
      <mesh geometry={rbox(w, bh, w, 0.035)} position={[x, (y(b.c) + y(b.o)) / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={0.24 + 0.8 * hot + 0.5 * rim} roughness={0.22} metalness={0.05} clearcoat={1} clearcoatRoughness={0.1} sheen={0.5} sheenColor="#ffffff" transparent={tr} opacity={op} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- the POC line: core + glow + sparks
const GLOW_V = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GLOW_F = /* glsl */ `
uniform vec3 uC;
uniform float uO;
uniform float uT;
varying vec2 vUv;
void main(){
  float y = abs(vUv.y - 0.5) * 2.0;
  float x = min(vUv.x, 1.0 - vUv.x);
  float ends = smoothstep(0.0, 0.06, x);
  float core = exp(-y * y * 60.0);
  float halo = pow(max(0.0, 1.0 - y), 2.6);
  float shimmer = 0.85 + 0.15 * sin(vUv.x * 80.0 - uT * 2.0) * sin(vUv.x * 23.0 + uT * 1.3);
  float a = uO * ends * (0.55 * core + 0.45 * halo) * shimmer;
  gl_FragColor = vec4(uC * a, a);
}`;
const Glow: React.FC<{ x0: number; x1: number; y: number; h: number; op: number; t: number; color?: string }> = ({ x0, x1, y, h, op, t, color = COL.gold }) => {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: GLOW_V, fragmentShader: GLOW_F, uniforms: { uC: { value: new THREE.Color(color) }, uO: { value: 0 }, uT: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    [color],
  );
  mat.uniforms.uO.value = op;
  mat.uniforms.uT.value = t;
  if (op <= 0.002 || x1 - x0 < 0.02) return null;
  return (
    <mesh position={[(x0 + x1) / 2, y, 0.05]} material={mat}>
      <planeGeometry args={[x1 - x0, h]} />
    </mesh>
  );
};
/** sparks drifting along a lit line (deterministic per line) */
const Sparks: React.FC<{ x0: number; x1: number; y: number; g: number; f: number; seed: number }> = ({ x0, x1, y, g, f, seed }) => {
  const N = 90;
  const base = useMemo(() => {
    let s = seed * 9301 + 49297;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: N }, () => [r(), r() * 2 - 1, r() * 2 - 1, 0.4 + r()] as const);
  }, [seed]);
  const geo = useMemo(() => {
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    return g2;
  }, []);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const L = x1 - x0;
  base.forEach(([u, v, w, sp], i) => {
    const k = (u + (f / 30) * 0.02 * sp) % 1;
    pos.setXYZ(i, x0 + k * L, y + v * (0.03 + 0.1 * g) * Math.sin((f / 30) * sp + i), w * 0.18);
  });
  pos.needsUpdate = true;
  if (g <= 0.05 || L < 0.1) return null;
  return (
    <points geometry={geo}>
      <pointsMaterial color={COL.goldHot} size={0.03 + 0.02 * g} sizeAttenuation transparent opacity={Math.min(1, g * 0.9)} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};
export const PocLine: React.FC<{ s: LineSpec; f: number; seed: number }> = ({ s, f, seed }) => {
  if (s.op <= 0.002 || s.g <= 0.002) return null;
  const g = s.g;
  const color = s.color ?? COL.gold;
  const r = 0.008 + 0.028 * g;
  return (
    <group>
      <Bar3 x0={s.x0} x1={s.x1} y={s.y} z={0.16} color={g > 0.5 ? COL.goldHot : color} op={s.op * (0.3 + 0.7 * Math.min(1, g * 1.4))} r={r} />
      <Glow x0={s.x0 - 0.2} x1={s.x1 + 0.2} y={s.y} h={0.18 + 1.1 * g} op={s.op * (0.25 + 0.95 * g)} t={f / 30} color={color} />
      {s.sparks !== false && <Sparks x0={s.x0} x1={s.x1} y={s.y} g={g * s.op} f={f} seed={seed} />}
    </group>
  );
};

/** magnetic field: particles flowing along arcs from above and below into the line */
const Field: React.FC<{ x0: number; x1: number; y: number; k: number; f: number; spread?: number }> = ({ x0, x1, y, k, f, spread = 2.4 }) => {
  const ARCS = 14;
  const PER = 16;
  const N = ARCS * PER;
  const geo = useMemo(() => {
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    return g2;
  }, [N]);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let a = 0; a < ARCS; a++) {
    const side = a % 2 ? 1 : -1;
    const u = (a + 0.5) / ARCS;
    const xs = x0 + (x1 - x0) * u;
    const h = spread * (0.55 + 0.45 * Math.sin(a * 2.3)) * side;
    const xe = xs + (x1 - x0) * 0.08 * Math.sin(a * 1.7);
    for (let p = 0; p < PER; p++) {
      const t = ((p / PER + (f / 30) * 0.18 + a * 0.071) % 1 + 1) % 1;
      // a curve that starts far from the line and bends into it, tangent to the line at the end
      const e = t * t;
      const xx = xs + (xe - xs) * t + Math.sin(t * Math.PI) * 0.35 * side;
      const yy = y + h * (1 - e) * (1 - e);
      pos.setXYZ(a * PER + p, xx, yy, 0.1 + 0.25 * Math.sin(a + t * 3));
    }
  }
  pos.needsUpdate = true;
  if (k <= 0.002) return null;
  return (
    <points geometry={geo}>
      <pointsMaterial color={COL.goldHot} size={0.045} sizeAttenuation transparent opacity={0.75 * k} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

/** chips settling on the line: particles from round the bars that touched the POC, falling onto it */
const Chips: React.FC<{ d: Day; y: number; k: number; op: number }> = ({ d, y, k, op }) => {
  const N = 260;
  const base = useMemo(() => {
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: N }, () => [cx(d, Math.floor(r() * A_HOOK)), (r() * 2 - 1) * 2.2, r(), r() * 0.3] as const);
  }, [d]);
  const geo = useMemo(() => {
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    return g2;
  }, []);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  base.forEach(([x, dy, delay, z], i) => {
    const t = ease(clamp01((k - delay * 0.5) / 0.5));
    pos.setXYZ(i, x + (delay - 0.5) * 0.2, y + dy * (1 - t), z);
  });
  pos.needsUpdate = true;
  if (op <= 0.002) return null;
  return (
    <points geometry={geo}>
      <pointsMaterial color={COL.goldHot} size={0.05} sizeAttenuation transparent opacity={op} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// ---------------------------------------------------------------- atmosphere
const Dust: React.FC = () => {
  const geo = useMemo(() => {
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pts: number[] = [];
    for (let i = 0; i < 5200; i++) pts.push(-70 + r() * 160, -20 + r() * 70, -30 + r() * 26);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color={COL.warm} size={0.03} sizeAttenuation transparent opacity={0.16} depthWrite={false} />
    </points>
  );
};
const FLOOR_Y = -16;
const Floor: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, FLOOR_Y, -4]}>
    <planeGeometry args={[150, 120]} />
    <MeshReflectorMaterial resolution={1024} blur={[400, 120]} mixBlur={1} mixStrength={1.6} mixContrast={1} roughness={0.85} depthScale={0.8} minDepthThreshold={0.4} maxDepthThreshold={1.2} color="#080c15" metalness={0.5} mirror={0.55} />
  </mesh>
);
/** a faint price grid standing behind a session */
const Grid: React.FC<{ d: Day; lo: number; hi: number; op: number; step?: number }> = ({ d, lo, hi, op, step = 5 }) => {
  if (op <= 0.002) return null;
  const x0 = cx(d, 0) - 0.3;
  const x1 = d.px + PROF_W + 0.2;
  const ps: number[] = [];
  for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) ps.push(p);
  return (
    <group>
      {ps.map((p) => (
        <Bar3 key={p} x0={x0} x1={x1} y={cy(d, p)} z={-0.5} color={COL.steel} op={0.3 * op} r={0.006} />
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- a session: candles, volume, profile
type Look = { op: number; volOp?: number; grey?: (i: number) => number; hot?: (i: number) => number; rim?: (i: number) => number; volHot?: (i: number) => number; volCol?: (i: number) => string | undefined };
const Session: React.FC<{ d: Day; f: number; look: Look }> = ({ d, f, look }) => {
  const { op, volOp = op, grey = () => 0, hot = () => 0, rim = () => 0, volHot = () => 0, volCol = () => undefined } = look;
  if (op <= 0.002) return null;
  const bars = live(d, f);
  const vw = d.xs * 0.6;
  return (
    <group>
      <Bar3 x0={cx(d, 0) - 0.25} x1={cx(d, d.bars.length - 1) + 0.25} y={d.vb - 0.01} z={0.2} color={COL.warm} op={0.16 * volOp} r={0.007} />
      {bars.map((b, i) => {
        if (b.g <= 0) return null;
        const vh = Math.max(0.02, vy(d, b.v) - d.vb);
        const g = clamp01(grey(i));
        const vc = volCol(i) ?? `#${new THREE.Color(b.c >= b.o ? COL.up : COL.down).lerp(new THREE.Color(COL.steel), 0.2 + 0.6 * g).getHexString()}`;
        const vhk = volHot(i);
        return (
          <React.Fragment key={i}>
            <Candle x={cx(d, i)} d={d} b={b} op={op} hot={hot(i)} grey={g} rim={rim(i)} />
            {volOp > 0.002 && (
              <mesh geometry={rbox(vw, vh, vw * 0.8, 0.025)} position={[cx(d, i), d.vb + vh / 2, 0]} castShadow receiveShadow>
                <meshPhysicalMaterial color={vhk > 0.05 ? COL.gold : vc} emissive={vhk > 0.05 ? COL.gold : vc} emissiveIntensity={0.25 + 1.0 * vhk} roughness={0.3} clearcoat={1} clearcoatRoughness={0.15} transparent opacity={volOp * (0.75 - 0.35 * g)} />
              </mesh>
            )}
          </React.Fragment>
        );
      })}
    </group>
  );
};

type ProfLook = { op: number; poc?: number; hi?: (p: number) => number; tint?: (p: number) => string | undefined; scale?: number };
/** the profile: one glass brick per price, from the session's right edge; the POC brick lights gold with poc */
const Profile: React.FC<{ d: Day; f: number; look: ProfLook }> = ({ d, f, look }) => {
  const { op, poc = 0, hi = () => 0, tint = () => undefined, scale = 1 } = look;
  if (op <= 0.002) return null;
  const { rows, n } = rowsAt(d, f);
  if (n <= 0.01) return null;
  const pc = prof(d, Math.max(1, Math.round(n))).poc;
  const h = YS * 0.78;
  return (
    <group>
      {/* the profile's spine */}
      <Seg a={[d.px - 0.04, cy(d, Math.min(...rows.keys())) - 0.12, 0]} b={[d.px - 0.04, cy(d, Math.max(...rows.keys())) + 0.12, 0]} color={COL.warm} op={0.25 * op} r={0.006} />
      {[...rows].map(([p, v]) => {
        const L = rowLen(v) * scale;
        if (L < 0.015) return null;
        const isPoc = p === pc ? poc : 0;
        const hk = clamp01(hi(p));
        const tc = tint(p);
        const c = isPoc > 0.05 ? COL.gold : tc ?? COL.glass;
        return (
          <mesh key={p} geometry={rbox(L, h, 0.42, 0.03)} position={[d.px + L / 2, cy(d, p), 0]} castShadow receiveShadow>
            <meshPhysicalMaterial color={c} emissive={isPoc > 0.05 ? COL.goldHot : tc ?? COL.ice} emissiveIntensity={0.05 + 0.9 * isPoc + 0.55 * hk} roughness={0.12} metalness={0.1} clearcoat={1} clearcoatRoughness={0.06} transparent opacity={op * (0.34 + 0.4 * isPoc + 0.3 * hk)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** a translucent band across a session (value area recap, LVN) */
const Band: React.FC<{ x0: number; x1: number; y0: number; y1: number; color: string; op: number }> = ({ x0, x1, y0, y1, color, op }) =>
  op <= 0.002 ? null : (
    <group>
      <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, -0.25]}>
        <boxGeometry args={[x1 - x0, Math.max(0.01, y1 - y0), 0.5]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.2} transparent opacity={0.1 * op} depthWrite={false} />
      </mesh>
      <Bar3 x0={x0} x1={x1} y={y1} z={0.05} color={color} op={0.5 * op} r={0.008} />
      <Bar3 x0={x0} x1={x1} y={y0} z={0.05} color={color} op={0.5 * op} r={0.008} />
    </group>
  );

// ---------------------------------------------------------------- the order book beside the test of the prior POC
const Dom: React.FC<{ f: number }> = ({ f }) => {
  const s = dom(f);
  if (s.op <= 0.002) return null;
  const h = YS * 0.8;
  return (
    <group>
      {s.rows.map((r) => {
        const y = cy(C, r.p);
        return (
          <group key={r.p}>
            <mesh geometry={rbox(s.w, h, 0.3, 0.025)} position={[s.x, y, -0.05]}>
              <meshPhysicalMaterial color={COL.glass} emissive={COL.ice} emissiveIntensity={0.04} roughness={0.08} clearcoat={1} transparent opacity={s.op * 0.12} depthWrite={false} />
            </mesh>
            {r.bid > 1 && (
              <mesh geometry={rbox(r.bidL, h * 0.72, 0.34, 0.02)} position={[s.x - 0.05 - r.bidL / 2, y, 0]}>
                <meshPhysicalMaterial color={COL.up} emissive={COL.up} emissiveIntensity={0.35 + 0.9 * r.hot} roughness={0.25} clearcoat={1} transparent opacity={s.op * 0.85} />
              </mesh>
            )}
            {r.ask > 1 && (
              <mesh geometry={rbox(r.askL, h * 0.72, 0.34, 0.02)} position={[s.x + 0.05 + r.askL / 2, y, 0]}>
                <meshPhysicalMaterial color={COL.down} emissive={COL.down} emissiveIntensity={0.35 + 0.9 * r.hot} roughness={0.25} clearcoat={1} transparent opacity={s.op * 0.85} />
              </mesh>
            )}
          </group>
        );
      })}
      {/* the spread: the last traded price */}
      <Bar3 x0={s.x - s.w / 2} x1={s.x + s.w / 2} y={cy(C, s.last)} z={0.2} color={COL.warm} op={s.op * 0.7} r={0.008} />
      {/* a limit order you would have parked in advance: a hollow outline that never fills, then fades */}
      {s.ghost > 0.002 && (
        <lineSegments position={[s.x - 0.05 - 0.6, cy(C, s.ghostP), 0.25]}>
          <edgesGeometry args={[new THREE.BoxGeometry(1.2, h * 0.72, 0.36)]} />
          <lineBasicMaterial color={COL.warm} toneMapped={false} transparent opacity={s.ghost} />
        </lineSegments>
      )}
    </group>
  );
};

// ---------------------------------------------------------------- the world
export const World: React.FC<{ f: number }> = ({ f }) => {
  const pr = presence(f);
  const c = cam(f);
  const camDist = Math.hypot(c.p[0] - c.t[0], c.p[1] - c.t[1], c.p[2] - c.t[2]);
  const L = lineState(f);

  // ---------- A: the first day
  const stay = win(f, E("yStay"), E("yVol") + 6, 10, 10); // bars that touched the POC get a gold rim
  const aPoc = prof(A, A_HOOK).poc;
  const touched = (i: number) => A.bars[i].l <= aPoc && A.bars[i].h >= aPoc && i < A_HOOK;
  const thinHi = win(f, E("yFar"), E("yPull") + 20, 10, 12); // the rows above value: short, little traded
  const aDevHi = win(f, E("aNone"), E("aFill"), 8, 12);
  const va = valueArea(prof(A, A_HOOK));
  const vaK = win(f, E("wVa"), E("pNotZone") + 18, 12, 22) * (1 - 0.7 * ramp(f, E("pLine"), 18));
  const aLook: Look = {
    op: pr.A * (1 - 0.4 * pr.ctx),
    volOp: pr.A * pr.vol,
    grey: (i) => 0.55 * stay * (touched(i) ? 0 : 1) + (f > E("mIn") ? 0.25 * ramp(f, E("mIn"), 20) : 0),
    rim: (i) => (touched(i) ? stay : 0),
    hot: (i) => (i >= A_HOOK && i < A_HOOK + 4 ? aDevHi * 0.5 : 0),
  };
  const aRowHi = (p: number) => (p >= 5019 && p <= 5023 ? thinHi : 0) + (p >= 5024 ? aDevHi : 0) + (p === aPoc ? 0.6 * win(f, E("yVol"), E("yChips"), 8, 10) : 0);
  const chipsK = ramp(f, E("yChips"), 40);
  const chipsOp = win(f, E("yChips"), E("yFar"), 6, 16);

  // ---------- B: migration
  const bBreak = (i: number) => (i >= 6 && i <= 9 ? win(f, E("mBreak"), E("mHold") + 10, 6, 14) : 0);
  const bLook: Look = { op: pr.B * (1 - 0.4 * pr.ctx), volOp: pr.B * pr.vol, volHot: bBreak, hot: (i) => 0.5 * bBreak(i) };

  // ---------- C: targets + entry
  const cLook: Look = {
    op: pr.C,
    volOp: pr.C * pr.vol,
    volCol: (i) => (i >= C_TEST && i < C_TEST + 3 ? (i < C_TEST + 2 ? COL.down : COL.up) : undefined),
    volHot: (i) => (i === C_TEST ? win(f, E("e1"), E("dIn"), 6, 10) : i === C_TEST + 1 ? win(f, E("e2"), E("dIn"), 6, 10) : i === C_TEST + 2 ? win(f, E("e3"), E("dIn"), 6, 10) : 0) * 0.6,
  };
  const domOp = dom(f).op;

  // ---------- W: through the POC and the LVN
  const lvnK = win(f, E("xLvn"), E("zIn"), 10, 1);
  const denseK = win(f, E("xDense"), E("zIn"), 10, 1);
  const wLook: Look = { op: pr.W, hot: (i) => (i >= W_DROP && i <= W_DROP + 2 ? 0.4 * win(f, E("xThru"), E("zIn"), 6, 1) : 0) };

  // ---------- context days in the five-day pull-back
  const ctxLook: Look = { op: pr.ctx, volOp: 0 };
  const tinted = (lo: number, hi: number, col: string, k: number) => (p: number) => (k > 0.02 && p >= lo && p <= hi ? col : undefined);

  // the ending: a magnet line with field lines and the last bars resting on it
  const endK = f >= E("zIn") ? ramp(f, E("zIn") + 4, 40) : 0;
  const stairK = ramp(f, E("u1Days"), 40) * pr.ctx;
  const stairPts = [D1, D2, D3, A, B].map((d) => {
    const p = prof(d).poc;
    return { x0: cx(d, 0) - 0.2, x1: d.px + rowLen(prof(d).pocV), y: cy(d, p) };
  });

  return (
    <>
      <Rig f={f} />
      <color attach="background" args={[COL.bg]} />
      <fog attach="fog" args={[COL.fog, camDist * 0.85, camDist * 3.4]} />
      <ambientLight intensity={0.4} color="#b4bfd2" />
      <hemisphereLight args={["#28303e", "#05070a", 0.5]} />
      <KeyLight f={f} />
      <pointLight position={[c.t[0] - 4, c.t[1] + 3, -4]} intensity={20} distance={28} color="#ffd9a0" />
      <Floor />
      <Dust />

      {/* ============ the five sessions of the continuous series ============ */}
      <Grid d={A} lo={5000} hi={5030} op={pr.A * (1 - pr.ctx) * (f > E("hLook") ? ramp(f, E("hLook"), 40) : 0)} />
      <Band x0={cx(A, 0) - 0.3} x1={A.px - 0.1} y0={cy(A, va.lo) - YS / 2} y1={cy(A, va.hi) + YS / 2} color={COL.ice} op={pr.A * vaK} />
      <Session d={A} f={f} look={aLook} />
      <Profile d={A} f={f} look={{ op: pr.A * (f < E("pBuild") ? 0 : 1), poc: ramp(f, E("pLong"), 14), hi: aRowHi }} />
      <Chips d={A} y={cy(A, aPoc)} k={chipsK} op={pr.A * chipsOp} />

      <Grid d={B} lo={5010} hi={5035} op={pr.B * (1 - pr.ctx)} />
      <Session d={B} f={f} look={bLook} />
      <Profile d={B} f={f} look={{ op: pr.B, poc: ramp(f, E("mMove"), 14) }} />

      {[D1, D2, D3].map((d) => (
        <React.Fragment key={d.id}>
          <Session d={d} f={f} look={ctxLook} />
          <Profile d={d} f={f} look={{ op: pr.ctx, poc: 1 }} />
        </React.Fragment>
      ))}
      {/* five-day staircase: each day's POC joined to the next */}
      {stairK > 0.002 &&
        stairPts.slice(0, -1).map((a, k) => {
          const b = stairPts[k + 1];
          const kk = clamp01(stairK * 4 - k);
          return (
            <React.Fragment key={k}>
              <Seg a={[a.x1, a.y, 0.2]} b={[a.x1 + (b.x0 - a.x1) * kk, a.y + (b.y - a.y) * kk, 0.2]} color={COL.goldHot} op={0.9 * kk} r={0.03} />
            </React.Fragment>
          );
        })}

      <Grid d={C} lo={5030} hi={5055} op={pr.C * (1 - pr.ctx)} />
      <Session d={C} f={f} look={cLook} />
      <Profile d={C} f={f} look={{ op: pr.C * (1 - domOp), poc: ramp(f, E("u2Today"), 12) }} />
      <Dom f={f} />

      {/* ============ W: a separate day ============ */}
      <Grid d={W} lo={5045} hi={5070} op={pr.W} />
      <Band x0={cx(W, 0) - 0.3} x1={W.px - 0.1} y0={cy(W, 5052) - YS / 2} y1={cy(W, 5062) + YS / 2} color={COL.ice} op={pr.W * lvnK} />
      <Session d={W} f={f} look={wLook} />
      <Profile d={W} f={f} look={{ op: pr.W, poc: 1, hi: (p) => (p >= 5052 && p <= 5062 ? lvnK : 0) + (p >= 5044 && p <= 5050 ? 0.6 * denseK : 0), tint: tinted(5052, 5062, COL.ice, lvnK) }} />

      {/* ============ every POC line (lines.ts decides where and how bright) ============ */}
      {L.map((s, i) => (
        <PocLine key={s.id} s={s} f={f} seed={i + 3} />
      ))}
      <Field x0={cx(A, 22)} x1={A.px + rowLen(prof(A).pocV)} y={cy(A, aPoc)} k={endK * pr.A} f={f} />
      {/* why: a faint field reaching up to the thin rows, pulling back down */}
      <Field x0={cx(A, 14)} x1={cx(A, A_HOOK - 1)} y={cy(A, aPoc)} k={0.6 * win(f, E("yPull") - 4, E("aIn") + 10, 8, 14) * pr.A} f={f} spread={1.8} />
      {/* the deviation's distance from the POC, while the voice says it */}
      <Seg a={[cx(A, A_HOOK + 3) + 0.32, cy(A, aPoc), 0.3]} b={[cx(A, A_HOOK + 3) + 0.32, cy(A, aPoc) + (cy(A, 5030) - cy(A, aPoc)) * out3(ramp(f, E("aDev") - 6, 14)), 0.3]} color={COL.warm} op={pr.A * markA(f, "aDev")} r={0.014} />
      {/* entry + stop at the test of the prior POC */}
      <Bar3 x0={cx(C, C_TEST + 3) - 0.15} x1={levelEnd(f)} y={cy(C, C.bars[C_TEST + 3].o)} z={0.3} color={COL.up} op={pr.C * markA(f, "cEntry")} r={0.012} />
      <Bar3 x0={cx(C, C_TEST) - 0.15} x1={levelEnd(f)} y={cy(C, Math.min(...C.bars.slice(C_TEST, C_TEST + 3).map((b) => b.l)) - 1)} z={0.3} color={COL.down} op={pr.C * markA(f, "cStop")} r={0.012} />
    </>
  );
};
