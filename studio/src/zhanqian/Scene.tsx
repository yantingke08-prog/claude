// The 3D set. Materials: polished graphite floors, brushed metal pieces, lacquered order bricks and
// glass candles lit from inside. Red means up / buying and green means down / selling throughout.
import { Environment, Lightformer, Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CameraRig } from "../components/Stage";
import { mulberry32 } from "../lib/rng";
import { BW, FIRST_HIT, HOPS, LEVELS, MINES, MINES_IN, PASSIVE, PASSIVE_AT, REFILLS, beadK, hitAt, isStop, ky } from "./book";
import { FPS, L, Lc, Le, S, clamp01, cubicInOut, expoOut, hold, pulse, smooth, span } from "./cue";
import { CASE_X, PIECES, X, type Dir } from "./director";

export const PAL = { bg: "#06070b", up: "#ff3b4e", down: "#18c37e", gold: "#f2bd62", amber: "#ff8a1f", steel: "#8c97ad" };

const BG_LIGHTS = () => (
  <Environment resolution={256} frames={1}>
    <Lightformer form="rect" intensity={3} color="#fff4e2" position={[0, 8, 5]} scale={[10, 1.6, 1]} />
    <Lightformer form="rect" intensity={1.6} color="#7f9cff" position={[-8, 3, -3]} rotation={[0, Math.PI / 2, 0]} scale={[7, 3, 1]} />
    <Lightformer form="ring" intensity={2.2} color="#ffd9a8" position={[6, 4, 7]} scale={3} />
  </Environment>
);

// ------------------------------------------------------------------ shared pieces
const softFrag = /* glsl */ `
varying vec3 vC; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a * vA, a * vA); }`;

/** a cloud of orders drifting upward, used inside the candle */
const Swarm: React.FC<{ t: number; k: number; box: [number, number, number]; y0?: number; n?: number; size?: number; x?: number }> = ({ t, k, box, y0 = 0, n = 5200, size = 70, x = 0 }) => {
  const { geo, mat } = useMemo(() => {
    const r = mulberry32(77);
    const p = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    const s = new Float32Array(n);
    const red = new THREE.Color(PAL.up).multiplyScalar(1.8);
    const grn = new THREE.Color(PAL.down).multiplyScalar(1.5);
    const gold = new THREE.Color(PAL.gold).multiplyScalar(1.8);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (r() - 0.5) * box[0];
      p[i * 3 + 1] = r() * box[1];
      p[i * 3 + 2] = (r() - 0.5) * box[2];
      s[i] = 0.3 + r() * 1.4;
      const u = r();
      const col = u < 0.5 ? red : u < 0.92 ? grn : gold;
      c.set([col.r, col.g, col.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    geo.setAttribute("aC", new THREE.BufferAttribute(c, 3));
    geo.setAttribute("aS", new THREE.BufferAttribute(s, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uK: { value: 0 }, uH: { value: box[1] }, uS: { value: size } },
      vertexShader: `attribute vec3 aC; attribute float aS; uniform float uT,uK,uH,uS; varying vec3 vC; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y + uT * aS * 0.9, uH);
          p.x += sin(uT * aS + position.z * 3.0) * 0.12; p.z += cos(uT * aS * 0.8 + position.x * 3.0) * 0.12;
          vC = aC; vA = uK * smoothstep(0.0, 0.5, p.y) * (1.0 - smoothstep(uH - 0.5, uH, p.y));
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = min(46.0, uS * (0.5 + aS * 0.4) / max(0.5, -mv.z)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: softFrag,
    });
    return { geo, mat };
  }, [n, box, size]);
  mat.uniforms.uT.value = t;
  mat.uniforms.uK.value = k;
  if (k < 0.01) return null;
  return <points geometry={geo} material={mat} position={[x, y0, 0]} frustumCulled={false} />;
};

/** a burst of sparks; age in seconds */
const Burst: React.FC<{ age: number; at: [number, number, number]; color: string; n?: number; seed?: number; power?: number }> = ({ age, at, color, n = 70, seed = 3, power = 3.4 }) => {
  const { geo, mat, vel } = useMemo(() => {
    const r = mulberry32(seed);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(r() * 2 - 1);
      const s = 0.6 + r() * 1.6;
      vel.set([Math.sin(ph) * Math.cos(th) * s, Math.cos(ph) * s, Math.sin(ph) * Math.sin(th) * s], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new THREE.PointsMaterial({ size: 0.16, color: new THREE.Color(color).multiplyScalar(2.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    return { geo, mat, vel };
  }, [n, seed, color]);
  if (age < 0 || age > 1.1) return null;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const k = power * (1 - Math.exp(-age * 3.4));
  for (let i = 0; i < n; i++) pos.setXYZ(i, vel[i * 3] * k, vel[i * 3 + 1] * k - 1.6 * age * age, vel[i * 3 + 2] * k);
  pos.needsUpdate = true;
  mat.opacity = Math.pow(1 - age / 1.1, 1.5);
  return <points geometry={geo} material={mat} position={at} frustumCulled={false} />;
};

const Ring: React.FC<{ age: number; y?: number; color: string; scale?: number }> = ({ age, y = 0.02, color, scale = 16 }) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [color]);
  if (age < 0 || age > 1) return null;
  mat.opacity = (1 - age) ** 2;
  const s = 0.5 + expoOut(age) * scale;
  return (
    <mesh material={mat} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[s, s, 1]}>
      <ringGeometry args={[0.92, 1, 80]} />
    </mesh>
  );
};

const Floor: React.FC<{ size?: number; y?: number; color?: string }> = ({ size = 200, y = 0, color = "#0b0d13" }) => (
  <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[size, size]} />
    <meshStandardMaterial color={color} roughness={0.2} metalness={0.85} />
  </mesh>
);

// ------------------------------------------------------------------ candles
const boxes = new Map<string, THREE.BufferGeometry>();
const rounded = (w: number, h: number, d: number, r = 0.08) => {
  const key = [w, h, d, r].map((x) => x.toFixed(3)).join();
  if (!boxes.has(key)) boxes.set(key, new RoundedBoxGeometry(w, Math.max(h, r * 2.2), d, 4, r));
  return boxes.get(key)!;
};
const Candle: React.FC<{ x?: number; z?: number; lo: number; o: number; c: number; hi: number; w?: number; op?: number; glow?: number; grow?: number }> = ({ x = 0, z = 0, lo, o, c, hi, w = 1, op = 1, glow = 0.3, grow = 1 }) => {
  const up = c >= o;
  const col = up ? PAL.up : PAL.down;
  const mats = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({ color: col, emissive: col, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15, transparent: true, side: THREE.DoubleSide }),
      wick: new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.5), transparent: true, toneMapped: false }),
    }),
    [col],
  );
  if (op <= 0.005 || grow <= 0.01) return null;
  mats.body.opacity = op;
  mats.body.depthWrite = op > 0.9;
  mats.body.emissiveIntensity = glow;
  mats.wick.opacity = Math.min(1, op * 1.6);
  const bot = Math.min(o, c);
  const top = bot + (Math.max(o, c) - bot) * grow;
  const h = lo + (hi - lo) * grow;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={rounded(w, top - bot, w, Math.min(0.12, w * 0.08))} material={mats.body} position={[0, (top + bot) / 2, 0]} />
      <mesh material={mats.wick} position={[0, (h + lo) / 2, 0]}>
        <cylinderGeometry args={[w * 0.05, w * 0.05, Math.max(0.01, h - lo), 12]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ hook
const HISTORY = (() => {
  const r = mulberry32(11);
  return Array.from({ length: 14 }, (_, i) => {
    const up = r() > 0.42;
    const b = 0.6 + r() * 1.8 + i * 0.03;
    const h = 0.8 + r() * 2.8;
    return { x: -3.6 - i * 2.05, z: -i * 0.5, o: up ? b : b + h, c: up ? b + h : b, lo: b - 0.2 - r() * 0.5, hi: b + h + 0.2 + r() * 0.6 };
  });
})();
export const HERO = { lo: 0, o: 0.8, c: 8.4, hi: 10, w: 3 };
const Hook: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const slam = L("h1");
  const g = span(f, slam - 8, slam, (x) => x * x);
  const glass = 1 - 0.8 * span(f, L("h2") + 10, L("h2") + 56, smooth);
  const swarm = span(f, L("h2") + 8, L("h2") + 50, smooth);
  return (
    <group>
      <Floor />
      <Candle {...HERO} grow={g} op={glass} glow={0.34 + 0.5 * pulse(f, slam, 10)} />
      <Swarm t={d.t} k={swarm} box={[2.7, 9, 2.7]} y0={0.3} size={90} />
      {HISTORY.map((b, i) => (
        <Candle key={i} {...b} w={1.2} grow={span(f, 2 + i * 1.5, 12 + i * 1.5, expoOut)} glow={0.18} />
      ))}
      <Ring age={(f - slam) / 26} color="#ffc4a0" />
      <Burst age={(f - slam) / FPS} at={[0, 0.2, 1.5]} color="#ffb48a" n={140} power={6} seed={9} />
      {/* point light that makes the floor catch the candle */}
      <pointLight position={[0, 4, 4]} intensity={70 * g} color={PAL.up} distance={36} />
    </group>
  );
};

// ------------------------------------------------------------------ the order book
type BrickAt = { x: number; y: number; z: number; s: number; col: THREE.Color; glow: number };
const RED = new THREE.Color("#d92a3e");
const GRN = new THREE.Color("#12a86a");
const dropIn = (f: number, at: number) => span(f, at, at + 12, expoOut);

const brickState = (f: number) => {
  const out: BrickAt[] = [];
  const comets: { from: THREE.Vector3; to: THREE.Vector3; u: number; stop: boolean }[] = [];
  const passivePulse = hold(f, PASSIVE_AT - 4, PASSIVE_AT + 70, 12);
  for (const l of LEVELS) {
    const appear = dropIn(f, l.at);
    if (appear <= 0) continue;
    const y = ky(l.k);
    for (let j = 0; j < l.n; j++) {
      const x = (j - (l.n - 1) / 2) * BW;
      const stag = dropIn(f, l.at + j * 1.1);
      if (stag <= 0) continue;
      let s = stag;
      let glow = l.side === "bid" ? passivePulse * 0.35 : 0;
      if (l.side === "ask") {
        const hit = hitAt(l.k, j);
        if (f >= hit) {
          s = 1 - clamp01((f - hit) / 5);
          glow = 1.6;
        } else if (f > hit - 14) {
          const u = (f - (hit - 14)) / 14;
          const stop = isStop(l.k);
          const to = new THREE.Vector3(x, y, 0.4);
          const from = stop ? new THREE.Vector3(x * 0.7, y - 0.4, -2.3) : new THREE.Vector3(x * 0.4 - 1.2, y - 8, 11);
          comets.push({ from, to, u, stop });
          glow = u * 0.8;
        }
      }
      if (s > 0.01) out.push({ x, y: y + (1 - stag) * (l.side === "ask" ? 2.2 : -2.2), z: 0, s, col: l.side === "bid" ? RED : GRN, glow });
    }
  }
  for (const r of REFILLS) {
    for (let j = 0; j < r.n; j++) {
      const s = dropIn(f, r.at + j * 1.4);
      if (s > 0) out.push({ x: (j - (r.n - 1) / 2) * BW, y: ky(r.k) - (1 - s) * 2, z: 0, s, col: RED, glow: (1 - s) * 1.2 });
    }
  }
  // new limit orders queueing in front of the bid wall while the narration explains them
  for (const r of PASSIVE) {
    for (let j = 0; j < r.n; j++) {
      const s = dropIn(f, r.at + j * 4);
      if (s > 0) out.push({ x: (j - (r.n - 1) / 2) * BW * 1.3, y: ky(r.k) - (1 - s) * 2.4, z: 1.15, s, col: RED, glow: 0.4 + (1 - s) * 1.6 });
    }
  }
  // "挂单可以撤": the asks just above the price are pulled back out of the book and go dark
  const pull = span(f, Lc("r2", "挂单"), Lc("r2", "挂单") + 18, cubicInOut);
  if (pull > 0) {
    const y0 = ky(beadK(f));
    for (const b of out) {
      const dy = b.y - y0;
      if (b.col === GRN && dy > 0.4 && dy < 2.6) {
        b.z -= 2.8 * pull;
        b.s *= 1 - 0.2 * pull;
        b.col = b.col.clone().multiplyScalar(1 - 0.78 * pull);
        b.glow = 0;
      }
    }
  }
  return { bricks: out, comets };
};

const BOOK_MAX = 190;
const Bricks: React.FC<{ f: number }> = ({ f }) => {
  const { body, glow, comet } = useMemo(() => {
    const g = new RoundedBoxGeometry(0.62, 0.8, 1.05, 3, 0.08);
    const body = new THREE.InstancedMesh(g, new THREE.MeshPhysicalMaterial({ roughness: 0.26, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 }), BOOK_MAX);
    const glow = new THREE.InstancedMesh(new THREE.BoxGeometry(0.66, 0.84, 1.09), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), BOOK_MAX);
    const comet = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.075, 1, 4, 10), new THREE.MeshBasicMaterial({ toneMapped: false }), 120);
    body.frustumCulled = glow.frustumCulled = comet.frustumCulled = false;
    return { body, glow, comet };
  }, []);
  const { bricks, comets } = brickState(f);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  bricks.slice(0, BOOK_MAX).forEach((b, i) => {
    m.compose(new THREE.Vector3(b.x, b.y, b.z), q.identity(), new THREE.Vector3(b.s, b.s, b.s));
    body.setMatrixAt(i, m);
    body.setColorAt(i, b.col);
    const gs = b.glow > 0.02 ? b.s : 0;
    m.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(gs, gs, gs));
    glow.setMatrixAt(i, m);
    glow.setColorAt(i, c.copy(b.col).multiplyScalar(b.glow * 1.5).addScalar(b.glow * 0.25));
  });
  body.count = glow.count = Math.min(BOOK_MAX, bricks.length);
  comets.slice(0, 120).forEach((k, i) => {
    const e = k.u * k.u;
    const p = k.from.clone().lerp(k.to, e);
    const dir = k.to.clone().sub(k.from).normalize();
    m.compose(p, q.setFromUnitVectors(up, dir), new THREE.Vector3(1, k.stop ? 1 : 1.5, 1));
    comet.setMatrixAt(i, m);
    comet.setColorAt(i, c.set(k.stop ? PAL.amber : PAL.up).multiplyScalar(3));
  });
  comet.count = Math.min(120, comets.length);
  body.instanceMatrix.needsUpdate = glow.instanceMatrix.needsUpdate = comet.instanceMatrix.needsUpdate = true;
  if (body.instanceColor) body.instanceColor.needsUpdate = true;
  if (glow.instanceColor) glow.instanceColor.needsUpdate = true;
  if (comet.instanceColor) comet.instanceColor.needsUpdate = true;
  return (
    <group>
      <primitive object={body} />
      <primitive object={glow} />
      <primitive object={comet} />
    </group>
  );
};

const railGeo = new THREE.BoxGeometry(9.6, 0.05, 1.4);
const railMat = new THREE.MeshStandardMaterial({ color: "#1b1f2a", roughness: 0.4, metalness: 0.9 });
const Rails: React.FC = () => (
  <group>
    {Array.from({ length: 19 }, (_, i) => i - 7).map((k) => (
      <mesh key={k} geometry={railGeo} material={railMat} position={[0, ky(k) - 0.43, 0]} />
    ))}
    <mesh position={[0, 3.5, -3.4]}>
      <planeGeometry args={[60, 80]} />
      <meshStandardMaterial color="#0c0e15" roughness={0.42} metalness={0.8} />
    </mesh>
  </group>
);

const Bead: React.FC<{ f: number; t: number; x?: number }> = ({ f, t }) => {
  const y = ky(beadK(f));
  const k = span(f, S("auction") + 6, S("auction") + 26, smooth);
  const pulseK = 1 + 0.06 * Math.sin(t * 5);
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.gold).multiplyScalar(1.8), toneMapped: false, transparent: true }), []);
  lineMat.opacity = 0.9 * k;
  if (k < 0.01) return null;
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, 0.1]} scale={k * pulseK}>
        <sphereGeometry args={[0.32, 32, 24]} />
        <meshPhysicalMaterial color={PAL.gold} emissive={PAL.gold} emissiveIntensity={1.5} roughness={0.2} metalness={0.8} toneMapped={false} />
      </mesh>
      <mesh material={lineMat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 9.8, 6]} />
      </mesh>
      <pointLight intensity={14} distance={10} color={PAL.gold} />
    </group>
  );
};

/** the gavel that hangs over the auction and never comes down */
const Gavel: React.FC<{ f: number; t: number }> = ({ f, t }) => {
  const k = hold(f, S("auction") - 8, L("a2") + 30, 16);
  if (k < 0.01) return null;
  const wood = { color: "#6e3b1e", roughness: 0.42, metalness: 0.08, clearcoat: 0.6 } as const;
  const lift = 11 - span(f, S("auction") - 8, S("auction") + 34, expoOut) * 3.2 + span(f, L("a2") - 6, L("a2") + 30, smooth) * 14;
  return (
    <group position={[0.6, lift, 1.5]} rotation={[0.1, 0.5 + Math.sin(t * 0.7) * 0.1, -0.42 + Math.sin(t * 1.3) * 0.05]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1, 1, 3.1, 48]} />
        <meshPhysicalMaterial {...wood} />
      </mesh>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.05, 1.05, 0.2, 48]} />
          <meshStandardMaterial color={PAL.gold} roughness={0.25} metalness={1} />
        </mesh>
      ))}
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.18, 0.26, 5.2, 24]} />
        <meshPhysicalMaterial {...wood} />
      </mesh>
    </group>
  );
};

const Mine: React.FC<{ at: [number, number, number]; show: number; f: number; boom: number; seed: number }> = ({ at, show, f, boom, seed }) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a4410", emissive: PAL.amber, roughness: 0.3, metalness: 0.7, flatShading: true }), []);
  const age = f - boom;
  mat.emissiveIntensity = 0.7 + 0.6 * Math.sin(f * 0.3 + seed) + (age > -14 && age < 0 ? (14 + age) * 0.3 : 0);
  const pop = age >= 0 ? 1 - clamp01(age / 3) : 1;
  return (
    <group position={at}>
      {show * pop > 0.01 && (
        <mesh material={mat} scale={show * pop} rotation={[seed, seed * 2, 0]}>
          <icosahedronGeometry args={[0.3, 0]} />
        </mesh>
      )}
      <Burst age={age / FPS} at={[0, 0, 0]} color={PAL.amber} seed={seed + 20} n={46} power={2.4} />
    </group>
  );
};

const Book: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const show = span(f, MINES_IN - 4, MINES_IN + 14, smooth);
  return (
    <group position={[X.book, 0, 0]}>
      <Rails />
      <Bricks f={f} />
      <Bead f={f} t={d.t} />
      <Gavel f={f} t={d.t} />
      {MINES.flatMap((m) =>
        Array.from({ length: m.n }, (_, i) => <Mine key={`${m.k}${i}`} at={[(i - (m.n - 1) / 2) * 1.5, ky(m.k), -1.7]} show={show} f={f} boom={m.at + i * 2} seed={m.k * 3 + i} />),
      )}
      <Burst age={(f - FIRST_HIT) / FPS} at={[-2.8, ky(1), 0.6]} color={PAL.gold} n={40} power={1.8} seed={4} />
      {Object.entries(HOPS).map(([k, at]) => (
        <Burst key={k} age={(f - at) / FPS} at={[0, ky(Number(k)), 0.4]} color={Number(k) >= 4 ? PAL.amber : PAL.gold} n={36} power={2.6} seed={Number(k) + 40} />
      ))}
      <spotLight position={[3, 16, 16]} angle={0.7} penumbra={0.9} intensity={420} distance={70} color="#fff1df" target-position={[0, 2, 0]} />
    </group>
  );
};

// ------------------------------------------------------------------ participants
const metal = (color: string, roughness = 0.3) => <meshStandardMaterial color={color} roughness={roughness} metalness={0.95} />;
const Plinth: React.FC<{ p: readonly [number, number]; lit: number; color: string; children: React.ReactNode }> = ({ p, lit, color, children }) => (
  <group position={[p[0], 0, p[1]]}>
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[2.5, 2.7, 0.4, 64]} />
      {metal("#232833", 0.34)}
    </mesh>
    <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.26, 2.4, 80]} />
      <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(0.5 + 2 * lit)} toneMapped={false} />
    </mesh>
    <group position={[0, 0.4, 0]}>{children}</group>
    <pointLight position={[0, 6, 2.5]} intensity={40 + 140 * lit} distance={16} color="#fff0dd" />
  </group>
);

const Chip: React.FC<{ y: number; col: string }> = ({ y, col }) => (
  <mesh position={[0, y, 0]}>
    <cylinderGeometry args={[0.46, 0.46, 0.14, 40]} />
    <meshPhysicalMaterial color={col} roughness={0.3} metalness={0.3} clearcoat={1} />
  </mesh>
);
/** market maker: a balance with a stack on each side; inventory tips it */
const MM: React.FC<{ t: number; f: number }> = ({ t, f }) => {
  const ki = span(f, L("p2") + 30, Le("p2"), smooth);
  const tilt = 0.06 * Math.sin(t * 1.3) + 0.2 * ki;
  const nL = 5 + Math.round(5 * ki);
  const nR = 5 - Math.round(2 * ki);
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.14, 0.34, 3.2, 28]} />
        {metal(PAL.gold, 0.26)}
      </mesh>
      <group position={[0, 3.2, 0]} rotation={[0, 0, tilt]}>
        <mesh>
          <boxGeometry args={[4.6, 0.14, 0.3]} />
          {metal(PAL.gold, 0.22)}
        </mesh>
        <group position={[-2.1, 0.08, 0]}>
          {Array.from({ length: nL }, (_, i) => <Chip key={i} y={i * 0.16} col={PAL.up} />)}
        </group>
        <group position={[2.1, 0.08, 0]}>
          {Array.from({ length: nR }, (_, i) => <Chip key={i} y={i * 0.16} col={PAL.down} />)}
        </group>
      </group>
    </group>
  );
};
/** institution: one heavy block, shaved off into a queue of small ones */
const Inst: React.FC<{ f: number }> = ({ f }) => {
  const a = L("p3") + 10,
    b = Le("p3") + 16;
  const u = span(f, a, b, (x) => x);
  const n = 16;
  return (
    <group>
      <mesh position={[-0.9, 1.3 * (1 - 0.55 * u), 0]} scale={[1, 1 - 0.55 * u, 1]} geometry={rounded(2.6, 2.6, 2.6, 0.12)}>
        <meshPhysicalMaterial color="#9fb0d0" roughness={0.26} metalness={0.9} clearcoat={0.6} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const k = u * n - i;
        if (k <= 0) return null;
        const go = Math.min(1, k / 3);
        return (
          <mesh key={i} position={[0.5 + go * (0.5 + (n - i) * 0.24 * Math.min(1, (u * n - i) / 8)), 0.26, 1.5 * Math.sin(i * 1.4) * 0.3]} geometry={rounded(0.42, 0.42, 0.42, 0.05)}>
            <meshPhysicalMaterial color={PAL.gold} roughness={0.3} metalness={1} />
          </mesh>
        );
      })}
    </group>
  );
};
/** hedger: a shield in front of what it protects */
const Hedge: React.FC<{ t: number; f: number }> = ({ t, f }) => {
  const k = hold(f, L("p4") + 6, Le("p4") + 14, 10);
  return (
    <group>
      <mesh position={[0, 0.5, -0.8]} geometry={rounded(2.2, 1, 1.1, 0.08)}>
        <meshStandardMaterial color={PAL.gold} roughness={0.28} metalness={1} />
      </mesh>
      <group position={[0, 2.5, 1.1]} rotation={[Math.PI / 2 + 0.05, Math.sin(t * 0.8) * 0.12, 0]}>
        <mesh>
          <cylinderGeometry args={[2.1, 2.1, 0.16, 6]} />
          <meshPhysicalMaterial color="#3a5f9f" roughness={0.3} metalness={0.85} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 0.08, 6]} />
          {metal("#a9b7d2", 0.25)}
        </mesh>
      </group>
      {[0, 1, 2, 3, 4].map((i) => {
        const u = ((t * 0.9 + i * 0.2) % 1) * k;
        const x = -1.4 + i * 0.7;
        return k > 0.01 ? (
          <mesh key={i} position={[x, 1.2 + i * 0.38, 7 - u * 5.6]}>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshBasicMaterial color={new THREE.Color(PAL.amber).multiplyScalar(2.5)} transparent opacity={1 - u * 0.4} toneMapped={false} />
          </mesh>
        ) : null;
      })}
    </group>
  );
};
/** short-term trader: darts whipping round a pole */
const Short: React.FC<{ t: number }> = ({ t }) => (
  <group>
    <mesh position={[0, 1.7, 0]}>
      <cylinderGeometry args={[0.08, 0.14, 3.4, 16]} />
      {metal("#b4bdcd", 0.24)}
    </mesh>
    {[0, 1, 2, 3].map((i) => {
      const a = t * (2.2 + i * 0.36) + i * 1.9;
      const r = 1.5 + 0.2 * i;
      return (
        <group key={i} position={[Math.cos(a) * r, 1 + i * 0.68, Math.sin(a) * r]} rotation={[0, -a, -Math.PI / 2 + 0.2 * Math.sin(a * 2)]}>
          <mesh>
            <coneGeometry args={[0.2, 0.84, 18]} />
            <meshPhysicalMaterial color={i % 2 ? PAL.up : PAL.down} emissive={i % 2 ? PAL.up : PAL.down} emissiveIntensity={0.6} roughness={0.2} clearcoat={1} />
          </mesh>
        </group>
      );
    })}
  </group>
);

const STREAM_N = 90;
/** every piece's orders run into the middle and meet */
const Clash: React.FC<{ f: number; t: number }> = ({ f, t }) => {
  const k = hold(f, L("p6") - 8, S("anatomy") + 8, 16);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), STREAM_N * 4);
    m.frustumCulled = false;
    return m;
  }, []);
  const all = [PIECES.mm, PIECES.inst, PIECES.hedge, PIECES.short];
  const mat = new THREE.Matrix4();
  const c = new THREE.Color();
  const col = [PAL.up, PAL.down];
  all.forEach((p, a) => {
    for (let i = 0; i < STREAM_N; i++) {
      const u = (t * 0.42 + i / STREAM_N + a * 0.07) % 1;
      const wob = Math.sin(i * 9.1 + a) * 0.6 * (1 - u);
      mat.makeTranslation(p[0] * (1 - u) + wob, 1.1 + 2.3 * Math.sin(u * Math.PI) * 0.3, p[1] * (1 - u) + wob * 0.5);
      mat.scale(new THREE.Vector3(k, k, k));
      mesh.setMatrixAt(a * STREAM_N + i, mat);
      mesh.setColorAt(a * STREAM_N + i, c.set(col[(i + a) % 2]).multiplyScalar(2.6));
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  const g = 1 + 0.12 * Math.sin(t * 8);
  return k < 0.01 ? null : (
    <group>
      <primitive object={mesh} />
      <mesh position={[0, 1.2, 0]} scale={k * g}>
        <sphereGeometry args={[0.8, 32, 24]} />
        <meshBasicMaterial color={new THREE.Color(PAL.gold).multiplyScalar(3.2)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.5, 0]} intensity={80 * k} distance={22} color={PAL.gold} />
    </group>
  );
};

export const lit = (f: number, id: string) => hold(f, L(id) - 4, Le(id) + 16, 12);
const Table: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  return (
    <group position={[X.table, 0, 0]}>
      <Floor color="#0a0c12" />
      <mesh position={[0, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.4, 9.56, 128]} />
        <meshBasicMaterial color={new THREE.Color(PAL.gold).multiplyScalar(0.8)} toneMapped={false} />
      </mesh>
      <Plinth p={PIECES.mm} lit={lit(f, "p2")} color={PAL.gold}>
        <MM t={d.t} f={f} />
      </Plinth>
      <Plinth p={PIECES.inst} lit={lit(f, "p3")} color={PAL.gold}>
        <Inst f={f} />
      </Plinth>
      <Plinth p={PIECES.hedge} lit={lit(f, "p4")} color={PAL.gold}>
        <Hedge t={d.t} f={f} />
      </Plinth>
      <Plinth p={PIECES.short} lit={lit(f, "p5")} color={PAL.gold}>
        <Short t={d.t} />
      </Plinth>
      <Clash f={f} t={d.t} />
      <spotLight position={[0, 26, 10]} angle={0.72} penumbra={0.9} intensity={560} distance={70} color="#fff1df" />
    </group>
  );
};

// ------------------------------------------------------------------ the candle, cut open
/** seeded intrabar path used to show what the candle throws away */
export const PATH = (() => {
  const r = mulberry32(5);
  const n = 46;
  return Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    const drift = HERO.o + (HERO.c - HERO.o) * u;
    return Math.min(HERO.hi, Math.max(HERO.lo, drift + (r() - 0.5) * 2.6 * Math.sin(u * Math.PI)));
  });
})();
export const FOLLOW = {
  a: [
    [8.4, 9.4],
    [9.4, 10.6],
    [10.6, 11.4],
    [11.4, 12.8],
  ],
  b: [
    [8.4, 7.2],
    [7.2, 7.8],
    [7.8, 5.6],
    [5.6, 4],
  ],
};
const TIERS = 7;
const tierY = (i: number) => HERO.o + ((i + 0.5) * (HERO.c - HERO.o)) / TIERS;

const CaseA: React.FC<{ f: number; run: number; x: number }> = ({ f, run, x }) => (
  <group position={[x, 0, 0]}>
    {Array.from({ length: TIERS }, (_, i) => {
      const hitK = run * TIERS - i;
      const s = 1 - clamp01(hitK);
      return s > 0.01 ? (
        <mesh key={i} position={[0, tierY(i) + clamp01(run * 1.2) * 0.1, 0]} scale={[s, 1, s]} geometry={rounded(2.4, 0.5, 2.4, 0.06)}>
          <meshPhysicalMaterial color={GRN} emissive={GRN} emissiveIntensity={0.4} roughness={0.3} clearcoat={1} />
        </mesh>
      ) : null;
    })}
    {run > 0.001 && run < 1.02 && (
      <mesh position={[0, HERO.o + (HERO.c - HERO.o) * Math.min(1, run), 0]}>
        <sphereGeometry args={[0.42, 24, 18]} />
        <meshBasicMaterial color={new THREE.Color(PAL.up).multiplyScalar(3)} toneMapped={false} />
      </mesh>
    )}
    <Swarm t={f / FPS} k={0.6 * Math.min(1, run * 4)} box={[1.4, HERO.c - HERO.o, 1.4]} y0={HERO.o} n={600} size={80} />
  </group>
);
const CaseB: React.FC<{ f: number; at: number; end: number; x: number }> = ({ f, at, end, x }) => (
  <group position={[x, 0, 0]}>
    {Array.from({ length: TIERS }, (_, i) => {
      const t0 = at + ((end - at) * i) / TIERS;
      return <Mine key={i} at={[0, tierY(i), 0]} show={span(f, at - 30, at - 10, smooth)} f={f} boom={t0} seed={i * 2 + 1} />;
    })}
  </group>
);

const Anatomy: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const split = span(f, L("w3") - 14, L("w3") + 18, cubicInOut);
  const glass = 1 - 0.84 * split;
  const moved = span(f, L("w5") - 4, L("w5") + 30, cubicInOut); // make room for what comes next
  const ax = CASE_X.a - 3.7 * moved,
    bx = CASE_X.b - 1.7 * moved;
  const aFrom = Lc("w3", "可能是"),
    aTo = Le("w3") - 4;
  const bFrom = Lc("w4", "止损被") + 6,
    bTo = Lc("w4", "打完");
  const run = span(f, aFrom, aTo, (x) => x);
  // the path collapsing into a single bar
  const sq = 1 - span(f, Lc("w2", "过程"), Lc("w2", "过程") + 34, cubicInOut);
  const pathK = hold(f, L("w2") + 6, L("w3") - 12, 12);
  const pts = PATH.map((y, i) => [-(PATH.length - 1 - i) * 0.12 * sq - 0.0, y, 1.8] as [number, number, number]);
  const follow = (arr: number[][], x0: number) =>
    arr.map(([o, c], i) => {
      const a = L("w5") + 28 + i * 10;
      return <Candle key={i} x={x0 + 2.3 + i * 1.3} o={o} c={c} lo={Math.min(o, c) - 0.25} hi={Math.max(o, c) + 0.3} w={1.2} grow={span(f, a, a + 12, expoOut)} glow={0.3} />;
    });
  return (
    <group position={[X.anatomy, 0, 0]}>
      <Floor y={-1.2} />
      <Candle {...HERO} x={split > 0 ? ax : 0} op={glass} glow={0.3} />
      {split > 0.001 && <Candle {...HERO} x={bx * split + 0} op={glass} glow={0.3} />}
      {split > 0.5 && <CaseA f={f} run={run} x={ax} />}
      {split > 0.5 && <CaseB f={f} at={bFrom} end={bTo} x={bx} />}
      {pathK > 0.01 && <Line points={pts} color={new THREE.Color(PAL.gold).multiplyScalar(2)} lineWidth={5} transparent opacity={pathK} toneMapped={false} />}
      {follow(FOLLOW.a, ax)}
      {follow(FOLLOW.b, bx)}
      <spotLight position={[0, 24, 16]} angle={0.7} penumbra={0.9} intensity={520} distance={80} color="#fff1df" />
      <pointLight position={[0, 4, 8]} intensity={60} distance={30} color={PAL.up} />
    </group>
  );
};

export const Scene: React.FC<{ d: Dir }> = ({ d }) => (
  <>
    <CameraRig position={d.pos.toArray() as [number, number, number]} target={d.target.toArray() as [number, number, number]} fov={d.fov} />
    <fog attach="fog" args={[PAL.bg, 40, 130]} />
    <ambientLight intensity={0.14} />
    <directionalLight position={[6, 12, 8]} intensity={1.4} color="#fff1df" />
    <directionalLight position={[-8, 5, -6]} intensity={1.1} color="#7f9cff" />
    <BG_LIGHTS />
    {d.world === "hook" && <Hook d={d} />}
    {d.world === "book" && <Book d={d} />}
    {d.world === "table" && <Table d={d} />}
    {d.world === "anatomy" && <Anatomy d={d} />}
    {d.world === "hook" && d.lay === "h.shadow" && <pointLight position={[0, 9, -7]} intensity={260} distance={40} color="#ffd2b0" />}
  </>
);
