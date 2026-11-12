import { Environment, Lightformer } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { HERO, LANES, type LaneId } from "./data";
import { type Dir, type LaneState, IDS, K, VMAX, px, py, slot, toWorld } from "./director";

/** Candles: red = up, green = down. Lane identity colours never use red or green. */
export const PAL = {
  bg: "#04060b",
  up: "#ff2e43",
  upDeep: "#7a0512",
  down: "#12c482",
  downDeep: "#035238",
  gold: "#ffd166",
  lane: { A: "#4cc9ff", B: "#a98bff", C: "#f2b84b" } as Record<LaneId, string>,
};

// ---------------------------------------------------------------- rounded boxes of any size, instanced
// Base: a unit "rounded box" whose flat parts have zero size (radius 0.5). Each instance stretches it with
// aHalf (half extents minus radius) and aR (corner radius), so corners stay round at every size.
const BASE = new RoundedBoxGeometry(1, 1, 1, 3, 0.4999);
const stretch = (m: THREE.MeshPhysicalMaterial) => {
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aHalf;")
      .replace("#include <begin_vertex>", "vec3 transformed = position * 2.0 * aHalf.w + sign(position) * aHalf.xyz;");
  };
  return m;
};
const phys = (color: string, deep: string, opacity = 1) =>
  stretch(
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.22,
      metalness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: deep,
      emissiveIntensity: 0.6,
      sheen: 0.35,
      sheenColor: new THREE.Color("#ffffff"),
      transparent: true,
      opacity,
    }),
  );

type Box = { x: number; y: number; w: number; h: number; d: number; r: number }; // px
const MAXN = 160;

const Instanced: React.FC<{ mat: THREE.MeshPhysicalMaterial; boxes: Box[]; opacity: number; glow?: number }> = ({ mat, boxes, opacity, glow }) => {
  const mesh = useMemo(() => {
    const g = BASE.clone();
    g.setAttribute("aHalf", new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 4), 4));
    const m = new THREE.InstancedMesh(g, mat, MAXN);
    m.frustumCulled = false;
    return m;
  }, [mat]);
  const half = mesh.geometry.getAttribute("aHalf") as THREE.InstancedBufferAttribute;
  const tmp = new THREE.Matrix4();
  const n = Math.min(MAXN, boxes.length);
  for (let i = 0; i < n; i++) {
    const b = boxes[i];
    const [x, y] = toWorld(b.x, b.y);
    tmp.makeTranslation(x, y, 0);
    mesh.setMatrixAt(i, tmp);
    const r = Math.min(b.r, b.w / 2, b.h / 2, b.d / 2) * K;
    half.setXYZW(i, Math.max(0, (b.w / 2) * K - r), Math.max(0, (b.h / 2) * K - r), Math.max(0, (b.d / 2) * K - r), r);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  half.needsUpdate = true;
  mat.opacity = opacity;
  mat.depthWrite = opacity > 0.98;
  if (glow !== undefined) mat.emissiveIntensity = glow;
  mesh.visible = n > 0 && opacity > 0.004;
  return <primitive object={mesh} />;
};

// ---------------------------------------------------------------- one lane
type Mats = Record<"preUp" | "preDown" | "postUp" | "postDown" | "hero" | "vPreUp" | "vPreDown" | "vPostUp" | "vPostDown" | "vHero", THREE.MeshPhysicalMaterial>;
const makeMats = (): Mats => ({
  preUp: phys(PAL.up, PAL.upDeep),
  preDown: phys(PAL.down, PAL.downDeep),
  postUp: phys(PAL.up, PAL.upDeep),
  postDown: phys(PAL.down, PAL.downDeep),
  hero: phys("#ff3a4e", "#a40818"),
  vPreUp: phys(PAL.up, PAL.upDeep),
  vPreDown: phys(PAL.down, PAL.downDeep),
  vPostUp: phys(PAL.up, PAL.upDeep),
  vPostDown: phys(PAL.down, PAL.downDeep),
  vHero: phys("#ff3a4e", "#a40818"),
});

/** a bar that is still growing draws from its open toward its close */
const grown = (id: LaneId, i: number, g: number) => {
  const b = LANES[id][i];
  const k = Math.min(1, g * 1.25);
  const c = b.o + (b.c - b.o) * k;
  const w = Math.max(0, Math.min(1, (g - 0.35) / 0.65));
  return { o: b.o, c, h: Math.max(b.o, c) + (b.h - Math.max(b.o, c)) * w, l: Math.min(b.o, c) - (Math.min(b.o, c) - b.l) * w, v: b.v * Math.min(1, g * 1.4), up: b.c >= b.o };
};

const LaneMesh: React.FC<{ id: LaneId; s: LaneState }> = ({ id, s }) => {
  const m = useMemo(makeMats, []);
  const p = s.p;
  const groups: Record<keyof Mats, Box[]> = { preUp: [], preDown: [], postUp: [], postDown: [], hero: [], vPreUp: [], vPreDown: [], vPostUp: [], vPostDown: [], vHero: [] };
  const sl = slot(p);
  const bw = Math.min(56, sl * (sl < 26 ? 0.72 : 0.64));
  const ww = Math.max(2.2, Math.min(5, sl * 0.075));
  const bars = LANES[id];
  for (let i = 0; i < bars.length; i++) {
    const g = i <= HERO ? 1 : Math.max(0, Math.min(1, s.post - (i - HERO - 1)));
    if (g <= 0) continue;
    const x = px(p, i);
    if (x < p.r.x - 1 || x > p.r.x + p.r.w + 1) continue;
    const b = grown(id, i, g);
    const kind = i === HERO ? "hero" : i < HERO ? (b.up ? "preUp" : "preDown") : b.up ? "postUp" : "postDown";
    const yT = py(p, Math.max(b.o, b.c));
    const yB = py(p, Math.min(b.o, b.c));
    const bh = Math.max(2, yB - yT);
    if (p.a > 0.01) {
      groups[kind].push({ x, y: (yT + yB) / 2, w: bw, h: bh, d: bw * 0.9, r: Math.min(6, bw * 0.16) });
      const yH = py(p, b.h);
      const yL = py(p, b.l);
      if (yL - yH > bh + 1) groups[kind].push({ x, y: (yH + yL) / 2, w: ww, h: yL - yH, d: ww, r: ww / 2 });
    }
    if (p.va > 0.01 && p.vr.h > 1) {
      const vh = Math.max(2, (b.v / VMAX) * p.vr.h);
      const vk = (i === HERO ? "vHero" : i < HERO ? (b.up ? "vPreUp" : "vPreDown") : b.up ? "vPostUp" : "vPostDown") as keyof Mats;
      groups[vk].push({ x, y: p.vr.y + p.vr.h - vh / 2, w: bw * 1.02, h: vh, d: bw * 0.9, r: Math.min(5, bw * 0.14) });
    }
  }
  const A = p.a * s.focus;
  const V = p.va * s.focus;
  const pre = A * s.dimPre;
  const post = A * s.dimPost;
  const heroGlow = 0.6 + 1.5 * s.glow;
  return (
    <group>
      <Instanced mat={m.preUp} boxes={groups.preUp} opacity={pre} />
      <Instanced mat={m.preDown} boxes={groups.preDown} opacity={pre} />
      <Instanced mat={m.postUp} boxes={groups.postUp} opacity={post} />
      <Instanced mat={m.postDown} boxes={groups.postDown} opacity={post} />
      <Instanced mat={m.hero} boxes={groups.hero} opacity={A * Math.max(s.dimPre, 0.55)} glow={heroGlow} />
      <Instanced mat={m.vPreUp} boxes={groups.vPreUp} opacity={V * 0.62} />
      <Instanced mat={m.vPreDown} boxes={groups.vPreDown} opacity={V * 0.62} />
      <Instanced mat={m.vPostUp} boxes={groups.vPostUp} opacity={V * 0.62} />
      <Instanced mat={m.vPostDown} boxes={groups.vPostDown} opacity={V * 0.62} />
      <Instanced mat={m.vHero} boxes={groups.vHero} opacity={V} glow={heroGlow} />
    </group>
  );
};

// ---------------------------------------------------------------- panel slabs (dark glass behind each chart)
const slabMat = () => new THREE.MeshPhysicalMaterial({ color: "#04070c", roughness: 0.42, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.35, transparent: true, opacity: 0.94 });
const Slab: React.FC<{ x: number; y: number; w: number; h: number; a: number }> = ({ x, y, w, h, a }) => {
  const mat = useMemo(slabMat, []);
  const geo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.02), []);
  if (w < 2 || h < 2 || a < 0.01) return null;
  mat.opacity = 0.94 * a;
  const [cx, cy] = toWorld(x + w / 2, y + h / 2);
  return <mesh geometry={geo} material={mat} position={[cx, cy, -0.7]} scale={[w * K, h * K, 0.4]} />;
};

// ---------------------------------------------------------------- the static light column through the three heroes
const beamMat = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color("#ffd9a0") }, uOpacity: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main(){
        float d = abs(vUv.x - 0.5) * 2.0;
        float core = exp(-d * d * 70.0) * 0.55 + exp(-d * d * 7.0) * 0.18;
        float v = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        gl_FragColor = vec4(uColor, core * v * uOpacity);
      }`,
  });
const Beam: React.FC<{ d: Dir }> = ({ d }) => {
  const mat = useMemo(beamMat, []);
  if (d.beam < 0.01) return null;
  const a = d.lanes.A.p;
  const c = d.lanes.C.p;
  const x = px(a, HERO);
  const y0 = a.r.y - 20;
  const y1 = c.r.y + c.r.h + 20;
  const [wx, wy] = toWorld(x, (y0 + y1) / 2);
  mat.uniforms.uOpacity.value = d.beam;
  return (
    <mesh position={[wx, wy, -0.3]} material={mat}>
      <planeGeometry args={[150 * K, (y1 - y0) * K]} />
    </mesh>
  );
};

// ---------------------------------------------------------------- backdrop: deep, static
const backMat = () =>
  new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {},
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec2 vUv;
      void main(){
        vec2 p = vUv - vec2(0.5, 0.56);
        float r = length(p * vec2(1.0, 0.62));
        vec3 c = mix(vec3(0.03, 0.04, 0.066), vec3(0.008, 0.01, 0.018), smoothstep(0.0, 0.7, r));
        vec2 g = abs(fract(vUv * vec2(28.0, 50.0)) - 0.5);
        float line = smoothstep(0.485, 0.5, max(g.x, g.y)) * 0.012 * (1.0 - smoothstep(0.2, 0.7, r));
        gl_FragColor = vec4(c + line, 1.0);
      }`,
  });
const Backdrop: React.FC = () => {
  const mat = useMemo(backMat, []);
  return (
    <mesh position={[0, 0, -30]} material={mat}>
      <planeGeometry args={[60, 90]} />
    </mesh>
  );
};

/** slabs follow the panels: big/solo, thumbs, rows and volume columns */
const slabsFor = (s: LaneState) => {
  const p = s.p;
  const out: { x: number; y: number; w: number; h: number; a: number }[] = [];
  if (p.a > 0.01) out.push({ x: p.r.x - 14, y: p.r.y - 14, w: p.r.w + 28, h: p.r.h + 28, a: p.a * Math.max(0.5, s.focus) });
  if (p.va > 0.01 && p.vr.h > 4) out.push({ x: p.vr.x - 14, y: p.vr.y - 14, w: p.vr.w + 28, h: p.vr.h + 28, a: p.va * Math.max(0.5, s.focus) });
  return out;
};

export const Scene: React.FC<{ d: Dir }> = ({ d }) => {
  return (
    <>
      <Environment frames={1} resolution={256}>
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[-6, 9, 6]} scale={[14, 5, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#9fc8ff" position={[8, 1, 5]} scale={[4, 12, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffb48a" position={[-8, -6, 4]} scale={[6, 6, 1]} />
        <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 0, 12]} scale={6} />
      </Environment>
      <ambientLight intensity={0.25} />
      <directionalLight position={[-4, 6, 10]} intensity={1.4} />
      <Backdrop />
      {IDS.flatMap((id) => slabsFor(d.lanes[id]).map((b, k) => <Slab key={`${id}${k}`} {...b} />))}
      <Beam d={d} />
      {IDS.map((id) => (
        <LaneMesh key={id} id={id} s={d.lanes[id]} />
      ))}
    </>
  );
};
