// The 3D set, three places in one world:
//   story: a tall chart that builds bar by bar from a point of light, splits into three full charts
//          stacked on one price scale (one per ending), and then shows each ending on its own;
//   main:  the 86-bar chart of ending C on a dark glass board with a laser tripwire at the prior high,
//          stop orders as amber capsules and resting sell liquidity as a violet glass brick wall;
//   rows:  the three-row comparison, which in the finale rewinds, merges and folds into the level.
import { Environment, Lightformer, Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CameraRig } from "../components/Stage";
import { mulberry32 } from "../lib/rng";
import { FPS, hold } from "./cue";
import { ROW_BAND, ROW_I0, ROW_VOL_Y, ROW_Y, ST_I0, ST_VOL, TRI, X_ROWS, X_ST, panelY, ry, sy, type Dir } from "./director";
import { AFTER, BOARD_TOP, BREAK, CHART, LEVEL, N_AFTER, OUTCOMES, PATHS, PAST, PRIOR_HIGH, bar, bx, liveBar, path0, py, type Bar, type Outcome } from "./market";

export const PAL = {
  bg: "#04060c",
  up: "#ff3049",
  down: "#14c47c",
  laser: "#e6f6ff",
  amber: "#ffb13d",
  violet: "#7d6bff",
  steel: "#8b95a8",
};

const LY = py(LEVEL);
const W = 0.38; // candle body width / depth

// ------------------------------------------------------------------ candles
const bodyGeo = new Map<string, THREE.BufferGeometry>();
const roundedBox = (h: number) => {
  const key = h.toFixed(3);
  if (!bodyGeo.has(key)) bodyGeo.set(key, new RoundedBoxGeometry(W, Math.max(0.03, h), W, 3, Math.min(0.05, Math.max(0.012, h * 0.45))));
  return bodyGeo.get(key)!;
};
const candleMat = (color: string) =>
  new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.32, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true });

const Candle: React.FC<{ bar: Bar; x: number; op?: number; glow?: number; ym?: (p: number) => number; wick?: number }> = ({ bar, x, op = 1, glow = 0, ym = py, wick: wr = 0.022 }) => {
  const up = bar.c >= bar.o;
  const mats = useMemo(() => ({ up: candleMat(PAL.up), down: candleMat(PAL.down), wickUp: new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.up).multiplyScalar(1.6), transparent: true, toneMapped: false }), wickDown: new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.down).multiplyScalar(1.6), transparent: true, toneMapped: false }) }), []);
  if (op < 0.01) return null;
  const body = up ? mats.up : mats.down;
  const wick = up ? mats.wickUp : mats.wickDown;
  body.opacity = op;
  body.depthWrite = op > 0.95;
  body.emissiveIntensity = 0.32 + glow * 1.4;
  wick.opacity = op * 0.95;
  const top = ym(Math.max(bar.o, bar.c));
  const bot = ym(Math.min(bar.o, bar.c));
  const hi = ym(bar.h);
  const lo = ym(bar.l);
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={roundedBox(top - bot)} material={body} position={[0, (top + bot) / 2, 0]} />
      <mesh material={wick} position={[0, (hi + lo) / 2, 0]}>
        <cylinderGeometry args={[wr, wr, Math.max(0.01, hi - lo), 8]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ stage
const skyFrag = /* glsl */ `
varying vec3 vP;
void main(){
  float h = normalize(vP).y;
  vec3 top = vec3(0.020, 0.030, 0.065);
  vec3 mid = vec3(0.012, 0.016, 0.030);
  vec3 bot = vec3(0.006, 0.007, 0.012);
  vec3 c = mix(bot, mid, smoothstep(-0.2, 0.05, h));
  c = mix(c, top, smoothstep(0.05, 0.7, h));
  gl_FragColor = vec4(c, 1.0);
}`;
const Sky: React.FC = () => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false }), []);
  return (
    <mesh material={mat} renderOrder={-10}>
      <sphereGeometry args={[900, 32, 16]} />
    </mesh>
  );
};

const beamFrag = /* glsl */ `
uniform vec3 uColor; uniform float uI;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
  float fall = smoothstep(0.0, 0.85, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
  float a = edge * fall * uI;
  gl_FragColor = vec4(uColor * a, a);
}`;
/** soft volumetric-looking light shafts from the rig above */
const Beam: React.FC<{ pos: [number, number, number]; r: number; h: number; color: string; i: number; tilt?: number }> = ({ pos, r, h, color, i, tilt = 0 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: beamFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: i } },
      }),
    [color],
  );
  mat.uniforms.uI.value = i;
  return (
    <mesh material={mat} position={pos} rotation={[0, 0, tilt]}>
      <cylinderGeometry args={[0.15, r, h, 40, 1, true]} />
    </mesh>
  );
};

const dustVert = /* glsl */ `
uniform float uT; attribute vec3 aR; varying float vA;
void main(){
  vec3 p = position;
  p.y += mod(uT * (0.04 + aR.x * 0.08) + aR.y * 9.0, 9.0) - 4.5;
  p.x += sin(uT * 0.3 + aR.z * 6.28) * 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.2 + aR.z * 2.5) * (14.0 / -mv.z);
  vA = (0.25 + aR.x * 0.5) * smoothstep(40.0, 4.0, -mv.z);
}`;
const softFrag = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.0) * vA; gl_FragColor = vec4(uColor * a, a); }`;
const Dust: React.FC<{ t: number }> = ({ t }) => {
  const { geo, mat } = useMemo(() => {
    const r = mulberry32(31);
    const n = 3200;
    const p = new Float32Array(n * 3);
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p.set([CHART.x0 - 6 + r() * (CHART.x1 - CHART.x0 + 12), py(4600) + r() * (py(5060) - py(4600)), -14 + r() * 20], i * 3);
      a.set([r(), r(), r()], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    geo.setAttribute("aR", new THREE.BufferAttribute(a, 3));
    const mat = new THREE.ShaderMaterial({ vertexShader: dustVert, fragmentShader: softFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uColor: { value: new THREE.Color("#9fb6ff").multiplyScalar(0.7) } } });
    return { geo, mat };
  }, []);
  mat.uniforms.uT.value = t;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
};

/** the chart itself: a dark glass board behind the candles with a price / time grid */
const Board: React.FC = () => {
  const { grid, minor, w, h, cx, cy } = useMemo(() => {
    const x0 = CHART.x0 - 1.2,
      x1 = CHART.x1 + 1.2;
    const y0 = py(CHART.p0),
      y1 = py(BOARD_TOP);
    const major: number[] = [];
    const fine: number[] = [];
    for (let p = 4650; p <= CHART.p1; p += 50) major.push(x0, py(p), 0, x1, py(p), 0);
    for (let p = 4620; p <= CHART.p1; p += 10) if (p % 50) fine.push(x0, py(p), 0, x1, py(p), 0);
    for (let i = -70; i <= 7; i += 10) major.push(bx(i), y0, 0, bx(i), y1, 0);
    const mk = (a: number[], o: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
      return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: "#9fb2d8", transparent: true, opacity: o, depthWrite: false }));
    };
    return { grid: mk(major, 0.14), minor: mk(fine, 0.05), w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }, []);
  return (
    <group>
      <mesh position={[cx, cy, -0.75]}>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial color="#070b14" roughness={0.32} metalness={0.6} clearcoat={1} clearcoatRoughness={0.2} />
      </mesh>
      <primitive object={grid} position={[0, 0, -0.7]} />
      <primitive object={minor} position={[0, 0, -0.7]} />
    </group>
  );
};

// ------------------------------------------------------------------ laser tripwire
const Laser: React.FC<{ i: number; w: number }> = ({ i, w }) => {
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: PAL.laser, toneMapped: false }), []);
  const halo = useMemo(() => new THREE.MeshBasicMaterial({ color: "#8fd8ff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  core.color.set(PAL.laser).multiplyScalar(1.4 + i * 1.2);
  halo.opacity = 0.1 + 0.08 * i;
  const x0 = bx(-13),
    x1 = bx(9);
  const th = Math.max(1, w / 9); // keep the wire visible in the full-chart view
  const len = x1 - x0;
  return (
    <group>
      <mesh material={core} position={[(x0 + x1) / 2, LY, 0]} rotation={[0, 0, Math.PI / 2]} scale={[th, 1, th]}>
        <cylinderGeometry args={[0.012, 0.012, len, 8]} />
      </mesh>
      <mesh material={halo} position={[(x0 + x1) / 2, LY, 0]} rotation={[0, 0, Math.PI / 2]} scale={[th, 1, th]}>
        <cylinderGeometry args={[0.07, 0.07, len, 12, 1, true]} />
      </mesh>
      {[x0, x1].map((x) => (
        <mesh key={x} position={[x, LY, 0]} rotation={[0, Math.PI / 2, 0]} material={core} scale={th}>
          <torusGeometry args={[0.13, 0.025, 8, 24]} />
        </mesh>
      ))}
    </group>
  );
};

// ------------------------------------------------------------------ particles and events
const burstFrag = softFrag;
const Sparks: React.FC<{ age: number; origin: [number, number, number]; color: string; n?: number; seed?: number }> = ({ age, origin, color, n = 260, seed = 3 }) => {
  const { geo, mat, vel } = useMemo(() => {
    const r = mulberry32(seed);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(r() * 2 - 1);
      const s = 0.8 + r() * 3.2;
      vel.set([Math.sin(ph) * Math.cos(th) * s * 1.4, Math.cos(ph) * s * 0.9 + 0.8, Math.sin(ph) * Math.sin(th) * s], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader: `uniform float uS; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uS * (10.0 / -mv.z); vA = 1.0; }`,
      fragmentShader: burstFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uS: { value: 3 }, uColor: { value: new THREE.Color(color) } },
    });
    return { geo, mat, vel };
  }, [n, seed, color]);
  if (age < 0 || age > 1.4) return null;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < n; i++) {
    const k = age * (0.6 + (i % 7) * 0.08);
    pos.setXYZ(i, origin[0] + vel[i * 3] * k, origin[1] + vel[i * 3 + 1] * k - 2.4 * k * k, origin[2] + vel[i * 3 + 2] * k);
  }
  pos.needsUpdate = true;
  const fade = Math.pow(1 - age / 1.4, 1.5);
  (mat.uniforms.uColor.value as THREE.Color).set(color).multiplyScalar(2.2 * fade);
  mat.uniforms.uS.value = 2.2 + 2.5 * fade;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
};

const Shockwave: React.FC<{ a: number; age: number; color: string; x?: number; y?: number }> = ({ a, age, color, x = 0, y = LY }) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [color]);
  if (a < 0.02) return null;
  mat.opacity = a * 0.9;
  const s = 0.3 + (age / FPS) * 5;
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[x, y, 0]} scale={s}>
      <ringGeometry args={[0.92, 1, 96]} />
    </mesh>
  );
};

// ------------------------------------------------------------------ orders
type Pt = { x: number; y: number; z: number; t: number; s: number };
const orderCloud = (seed: number, n: number, y0: number, y1: number): Pt[] => {
  const r = mulberry32(seed);
  const out: Pt[] = [];
  while (out.length < n) {
    const x = (r() - 0.5) * 2.8;
    const z = (r() - 0.5) * 1.6;
    if (Math.abs(x) < 0.3 && Math.abs(z) < 0.3) continue; // keep the candle column clear
    out.push({ x, y: y0 + r() * (y1 - y0), z, t: r(), s: 0.75 + r() * 0.5 });
  }
  return out;
};
const BUY_STOPS = orderCloud(11, 200, py(5001.5), py(5006.5));
const SELL_STOPS = orderCloud(12, 200, py(4986), py(4998.5)).map((p) => ({ ...p, x: p.x + bx(2) }));

/** stop orders: idle amber capsules; once triggered each becomes a streak in its direction */
const Stops: React.FC<{ pts: Pt[]; show: number; fire: number; dir: 1 | -1; t: number; to: number }> = ({ pts, show, fire, dir, t, to }) => {
  const { mesh } = useMemo(() => {
    const mesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.042, 0.11, 4, 10), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2, toneMapped: false }), pts.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return { mesh };
  }, [pts]);
  if (show < 0.01) return null;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  const amber = new THREE.Color(PAL.amber).multiplyScalar(1.3);
  const hot = new THREE.Color(dir > 0 ? PAL.up : PAL.down).multiplyScalar(3);
  // higher orders trigger first for sells (price falls through them), lower first for buys
  pts.forEach((p, i) => {
    const order = dir > 0 ? (p.y - pts[0].y) * 0 + p.t * 0.6 + (p.y - py(5001.5)) * 0.25 : p.t * 0.5 + (py(4998.5) - p.y) * 0.32;
    const a = (fire - order * 0.85) / 0.18;
    let y = p.y + Math.sin(t * 1.3 + p.t * 30) * 0.02;
    let sy = p.s * show;
    if (a >= 0 && a < 1) {
      y = p.y + (to - p.y) * a * a;
      sy = p.s * (1 + a * 5);
      col.copy(hot);
    } else if (a >= 1) {
      sy = 0;
    } else col.copy(amber).multiplyScalar(0.8 + 0.4 * Math.sin(t * 3 + p.t * 50) ** 2);
    m.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(p.s * show, sy, p.s * show));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** continuous aggressive buying flying up into the sell wall */
const Stream: React.FC<{ k: number; t: number; to: number }> = ({ k, t, to }) => {
  const n = 70;
  const { mesh, seeds } = useMemo(() => {
    const r = mulberry32(21);
    const seeds = Array.from({ length: n }, () => ({ x: bx(1) + (r() - 0.5) * 1.8, z: (r() - 0.5) * 1.1, ph: r(), sp: 0.7 + r() * 0.6 }));
    const mesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.03, 0.4, 3, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.up).multiplyScalar(3), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), n);
    mesh.frustumCulled = false;
    return { mesh, seeds };
  }, []);
  if (k < 0.01) return null;
  (mesh.material as THREE.MeshBasicMaterial).opacity = k;
  const m = new THREE.Matrix4();
  const from = LY - 0.6;
  seeds.forEach((s, i) => {
    const a = (t * s.sp + s.ph) % 1;
    m.compose(new THREE.Vector3(s.x, from + (to - from) * a, s.z), new THREE.Quaternion(), new THREE.Vector3(1, 0.6 + a, 1).multiplyScalar(k));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** resting sell limit orders: a wall of violet glass bricks that gets chewed and refills */
const WALL = { x0: bx(1) - 1.25, x1: bx(1) + 1.25, y0: py(5005.5), y1: py(5021), z0: -0.75, z1: 0.75, nx: 7, ny: 7, nz: 3 };
const Wall: React.FC<{ show: number; hit: number; t: number }> = ({ show, hit, t }) => {
  const { mesh, cells } = useMemo(() => {
    const r = mulberry32(41);
    const cells: { p: THREE.Vector3; ph: number; row: number }[] = [];
    const dx = (WALL.x1 - WALL.x0) / WALL.nx,
      dy = (WALL.y1 - WALL.y0) / WALL.ny,
      dz = (WALL.z1 - WALL.z0) / WALL.nz;
    for (let ix = 0; ix < WALL.nx; ix++)
      for (let iy = 0; iy < WALL.ny; iy++)
        for (let iz = 0; iz < WALL.nz; iz++) cells.push({ p: new THREE.Vector3(WALL.x0 + (ix + 0.5) * dx, WALL.y0 + (iy + 0.5) * dy, WALL.z0 + (iz + 0.5) * dz), ph: r(), row: iy });
    const geo = new RoundedBoxGeometry(dx * 0.86, dy * 0.8, dz * 0.86, 2, 0.025);
    const mat = new THREE.MeshPhysicalMaterial({ color: PAL.violet, emissive: PAL.violet, emissiveIntensity: 0.35, roughness: 0.12, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.6, depthWrite: false });
    const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
    mesh.frustumCulled = false;
    return { mesh, cells };
  }, []);
  if (show < 0.01) return null;
  (mesh.material as THREE.MeshPhysicalMaterial).opacity = 0.55 * show;
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  const base = new THREE.Color(PAL.violet);
  const white = new THREE.Color("#e9e4ff").multiplyScalar(2.2);
  cells.forEach((c, i) => {
    // build-in from the bottom row up; low rows take the hits: eaten, then refilled (iceberg)
    const rise = Math.min(1, Math.max(0, show * 1.6 - c.row * 0.08));
    const cyc = (t * 1.1 + c.ph * 3) % 1;
    const bite = hit * (c.row < 3 ? 1 : 0.25) * Math.max(0, Math.sin(cyc * Math.PI)) ** 6;
    const s = rise * (1 - 0.75 * bite);
    m.compose(c.p, new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, m);
    col.copy(base).lerp(white, bite);
    mesh.setColorAt(i, col);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** the "new price area" above the wire, with a fill that only builds when price is accepted */
const AcceptZone: React.FC<{ show: number; fill: number }> = ({ show, fill }) => {
  const { edges, lineMat, fillMat } = useMemo(() => {
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(4.4, py(5018) - py(5002), 1.4));
    return {
      edges,
      lineMat: new THREE.LineBasicMaterial({ color: new THREE.Color(PAL.amber).multiplyScalar(1.4), transparent: true, toneMapped: false }),
      fillMat: new THREE.MeshStandardMaterial({ color: PAL.amber, emissive: PAL.amber, emissiveIntensity: 0.5, transparent: true, depthWrite: false, roughness: 0.4 }),
    };
  }, []);
  if (show < 0.01) return null;
  lineMat.opacity = 0.7 * show;
  fillMat.opacity = 0.1 * show;
  const h = py(5018) - py(5002);
  const cx = 1.6;
  const cy = (py(5018) + py(5002)) / 2;
  return (
    <group>
      <lineSegments geometry={edges} material={lineMat} position={[cx, cy, 0]} />
      <Line points={[[cx - 2.2, py(5002), 0.7], [cx + 2.2, py(5002), 0.7], [cx + 2.2, py(5018), 0.7], [cx - 2.2, py(5018), 0.7], [cx - 2.2, py(5002), 0.7]]} color={PAL.amber} lineWidth={3} dashed dashSize={0.14} gapSize={0.09} transparent opacity={show} />
      {fill > 0.01 && (
        <mesh material={fillMat} position={[cx, py(5002) + (h * fill) / 2, 0]}>
          <boxGeometry args={[4.36, h * fill, 1.36]} />
        </mesh>
      )}
    </group>
  );
};

/** dashed line from the prior high to the new high: price higher, delta smaller */
const DeltaLine: React.FC<{ k: number }> = ({ k }) =>
  k < 0.01 ? null : <Line points={[[bx(PRIOR_HIGH), py(5000) + 0.12, 0.2], [bx(1), py(5016) + 0.12, 0.2]]} color="#ffffff" lineWidth={3} dashed dashSize={0.18} gapSize={0.12} transparent opacity={k * 0.9} />;

/** order-flow delta as glowing bars from a zero line: up when buyers lead (red), down when sellers lead (green) */
const DELTA_MAX = 1150;
const strip = {
  pos: new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.up).multiplyScalar(1.5), transparent: true, toneMapped: false }),
  neg: new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.down).multiplyScalar(1.5), transparent: true, toneMapped: false }),
  vUp: new THREE.MeshStandardMaterial({ color: PAL.up, emissive: PAL.up, emissiveIntensity: 0.25, transparent: true, roughness: 0.4 }),
  vDn: new THREE.MeshStandardMaterial({ color: PAL.down, emissive: PAL.down, emissiveIntensity: 0.25, transparent: true, roughness: 0.4 }),
  zero: new THREE.MeshBasicMaterial({ color: "#c9d4ea", transparent: true }),
  box: new THREE.BoxGeometry(1, 1, 1),
};
type Placed = { b: Bar; x: number };
const DeltaBarsAt: React.FC<{ bars: Placed[]; y0: number; half: number; k: number; w?: number }> = ({ bars, y0, half, k, w = 0.3 }) => {
  if (k < 0.01 || !bars.length) return null;
  strip.pos.opacity = strip.neg.opacity = k;
  strip.zero.opacity = 0.35 * k;
  const xs = bars.map((b) => b.x);
  const a = Math.min(...xs),
    b = Math.max(...xs);
  return (
    <group>
      <mesh geometry={strip.box} material={strip.zero} position={[(a + b) / 2, y0, 0]} scale={[b - a + 0.6, 0.012, 0.012]} />
      {bars.map(({ b: bar_, x }) => {
        const h = Math.max(0.01, (Math.abs(bar_.d) / DELTA_MAX) * half * k);
        return <mesh key={x} geometry={strip.box} material={bar_.d >= 0 ? strip.pos : strip.neg} position={[x, y0 + (bar_.d >= 0 ? h / 2 : -h / 2), 0]} scale={[w, h, w * 0.6]} />;
      })}
    </group>
  );
};
const VolumeBarsAt: React.FC<{ bars: Placed[]; y0: number; max: number; k: number }> = ({ bars, y0, max, k }) => {
  if (k < 0.01) return null;
  strip.vUp.opacity = strip.vDn.opacity = 0.85 * k;
  return (
    <group>
      {bars.map(({ b, x }) => {
        const h = Math.max(0.01, (b.v / 3400) * max * k);
        return <mesh key={x} geometry={strip.box} material={b.c >= b.o ? strip.vUp : strip.vDn} position={[x, y0 + h / 2, 0]} scale={[0.34, h, 0.2]} />;
      })}
    </group>
  );
};

const Marker: React.FC<{ k: number; at: [number, number, number] }> = ({ k, at }) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.amber).multiplyScalar(2), toneMapped: false, transparent: true }), []);
  if (k < 0.01) return null;
  mat.opacity = k;
  return (
    <mesh material={mat} position={at}>
      <torusGeometry args={[0.24 + (1 - k) * 0.3, 0.018, 8, 48]} />
    </mesh>
  );
};

// ------------------------------------------------------------------ light trails (the endings as paths)
/** close-to-close path of one ending from the breakout bar, drawn to length k (bars), optionally folded onto the level */
const trailPts = (o: Outcome, k: number, ym: (p: number) => number, fold = 0): [number, number, number][] => {
  const closes = [BREAK.c, ...AFTER[o].map((b) => b.c)];
  const p = (j: number) => ym(closes[j] + (LEVEL - closes[j]) * fold);
  const pts: [number, number, number][] = [[0, p(0), 0.25]];
  const n = Math.min(N_AFTER, k);
  for (let j = 1; j <= Math.floor(n); j++) pts.push([bx(j), p(j), 0.25]);
  const fr = n - Math.floor(n);
  if (fr > 0.01 && n < N_AFTER) {
    const j = Math.floor(n);
    pts.push([bx(j) + (bx(j + 1) - bx(j)) * fr, p(j) + (p(j + 1) - p(j)) * fr, 0.25]);
  }
  return pts;
};
export const TRAIL_COL: Record<Outcome, string> = { A: PAL.up, B: PAL.amber, C: PAL.down };
const headMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true });
const Trail: React.FC<{ o: Outcome; k: number; op: number; ym: (p: number) => number; fold?: number; width?: number }> = ({ o, k, op, ym, fold = 0, width = 5 }) => {
  if (op < 0.01 || k < 0.05) return null;
  const pts = trailPts(o, k, ym, fold);
  if (pts.length < 2) return null;
  const hot = new THREE.Color(TRAIL_COL[o]).multiplyScalar(2.2);
  const head = pts[pts.length - 1];
  headMat.opacity = op;
  return (
    <group>
      <Line points={pts} color={TRAIL_COL[o]} lineWidth={width * 3.6} transparent opacity={0.22 * op} depthWrite={false} />
      <Line points={pts} color={hot} lineWidth={width} transparent opacity={op} depthWrite={false} toneMapped={false} />
      {k < N_AFTER - 0.05 && (
        <mesh material={headMat} position={head}>
          <sphereGeometry args={[0.09, 16, 12]} />
        </mesh>
      )}
    </group>
  );
};

/** the point of light the film opens on */
const GlowPoint: React.FC<{ k: number; at: [number, number, number]; t: number }> = ({ k, at, t }) => {
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true }), []);
  const halo = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffd9a8", toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  if (k < 0.01) return null;
  const breathe = 1 + 0.12 * Math.sin(t * 9);
  core.color.set("#ffffff").multiplyScalar(2 + 2 * k);
  core.opacity = Math.min(1, k * 1.4);
  halo.opacity = 0.35 * k;
  return (
    <group position={at}>
      <mesh material={core} scale={k * breathe}>
        <sphereGeometry args={[0.07, 20, 14]} />
      </mesh>
      <mesh material={halo} scale={k * breathe}>
        <sphereGeometry args={[0.32, 20, 14]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ the story chart
/** a bar partially revealed: grows out of its open */
const grow = (b: Bar, k: number): Bar => ({ ...b, h: b.o + (b.h - b.o) * k, l: b.o + (b.l - b.o) * k, c: b.o + (b.c - b.o) * k, v: b.v * k, d: b.d * k });
const ST_X0 = bx(ST_I0) - 1.2;
const ST_X1 = bx(N_AFTER) + 1.6;
const stGrid = (() => {
  const a: number[] = [];
  for (let p = 4860; p <= 5060; p += 20) a.push(ST_X0, sy(p), 0, ST_X1, sy(p), 0);
  for (let i = -30; i <= N_AFTER; i += 6) a.push(bx(i), sy(4850), 0, bx(i), sy(5070), 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
  return g;
})();
/** the bars of one story panel on this frame, with their indices. Panel A always carries the shared
 *  history; B and C carry their own copy only while the chart is split into three. */
export const storyBars = (d: Dir, o: Outcome) => {
  const S = d.story;
  const out: { b: Bar; i: number; glow: number; op: number }[] = [];
  if (o === "A" || S.split[o] > 0.01) {
    for (let i = ST_I0; i < 0; i++) {
      const j = i - ST_I0;
      const k = Math.min(1, Math.max(0, S.n - j));
      // a fresh bar flares, then settles over the next few bars; the oldest bars sit too low for the
      // stacked panels and step out while the chart splits
      if (k > 0.01) out.push({ b: grow(bar("C", i), k), i, glow: 1.4 * (1 - Math.min(1, Math.max(0, (S.n - j - 1) / 2.5))), op: i < ST_I0 + 6 ? 1 - S.split[o] : 1 });
    }
    if (S.u0 > 0.001) out.push({ b: liveBar(BREAK, path0, S.u0), i: 0, glow: d.flash * 0.6 + 0.5 * S.split[o] * S.tri, op: 1 });
  }
  for (let i = 1; i <= N_AFTER; i++) {
    const k = Math.min(1, Math.max(0, S.ends[o] - (i - 1)));
    if (k > 0.01) out.push({ b: grow(AFTER[o][i - 1], k), i, glow: 0, op: 1 });
  }
  return out;
};
const stGlass = new THREE.MeshPhysicalMaterial({ color: "#070b14", roughness: 0.32, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.2, transparent: true });
const StoryPanel: React.FC<{ d: Dir; o: Outcome }> = ({ d, o }) => {
  const S = d.story;
  const laserMat = useMemo(() => new THREE.MeshBasicMaterial({ color: PAL.laser, toneMapped: false, transparent: true }), []);
  const haloMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#8fd8ff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), []);
  const op = S.op[o];
  if (op < 0.01) return null;
  const sp = S.split[o];
  const ym = (p: number) => panelY(o, p, sp);
  const lit = Math.min(1, S.n / 5);
  // only one wire while the chart is single (B and C would sit exactly on top of A's)
  const wire = o === "A" ? lit : sp > 0.01 ? op : 0;
  laserMat.color.set(PAL.laser).multiplyScalar(1.3 + d.laser * 1.1);
  laserMat.opacity = wire;
  haloMat.opacity = (0.08 + 0.08 * d.laser) * wire;
  const len = ST_X1 - ST_X0;
  const bars = storyBars(d, o);
  const vol = o === "A" || sp < 0.01 ? bars.filter(({ i }) => i >= ST_VOL.i0).map(({ b, i }) => ({ b, x: bx(i) })) : [];
  return (
    <group>
      {wire > 0.01 && (
        // the wire draws itself out from the left edge
        <group position={[ST_X0 + (len / 2) * lit, ym(LEVEL), 0]} scale={[1, lit, 1]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={laserMat}>
            <cylinderGeometry args={[0.016, 0.016, len, 8]} />
          </mesh>
          <mesh material={haloMat}>
            <cylinderGeometry args={[0.08, 0.08, len, 12, 1, true]} />
          </mesh>
        </group>
      )}
      {bars.map(({ b, i, glow, op: bo }) => (
        <Candle key={i} bar={b} x={bx(i)} ym={ym} wick={0.024} glow={glow} op={op * bo} />
      ))}
      {vol.length > 0 && <VolumeBarsAt bars={vol} y0={ST_VOL.y} max={ST_VOL.h} k={S.vol} />}
    </group>
  );
};
const StoryChart: React.FC<{ d: Dir }> = ({ d }) => {
  const S = d.story;
  const gridMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#9fb2d8", transparent: true, opacity: 0.1, depthWrite: false }), []);
  // the board and grid light up as the chart starts to build; the grid belongs to the single chart
  const lit = Math.min(1, S.n / 5);
  gridMat.opacity = 0.1 * lit * (1 - S.split.A);
  stGlass.opacity = lit;
  const len = ST_X1 - ST_X0;
  const mid = (ST_X0 + ST_X1) / 2;
  return (
    <group position={[X_ST, 0, 0]}>
      {lit > 0.01 && (
        <mesh material={stGlass} position={[mid, sy(4960), -0.8]}>
          <planeGeometry args={[len + 4, 60]} />
        </mesh>
      )}
      <lineSegments geometry={stGrid} material={gridMat} position={[0, 0, -0.75]} />
      {OUTCOMES.map((o) => (
        <StoryPanel key={o} d={d} o={o} />
      ))}
      <GlowPoint k={S.point} at={[bx(ST_I0), sy(bar("C", ST_I0).o), 0.1]} t={d.t} />
    </group>
  );
};

// ------------------------------------------------------------------ the comparison page: one row per outcome
const rowGlass = new THREE.MeshPhysicalMaterial({ color: "#070b14", roughness: 0.3, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.2 });
const rowGrid = (() => {
  const a: number[] = [];
  for (const p of [4950, 4975, 5025, 5050]) a.push(bx(ROW_I0) - 0.5, ry(p), 0, bx(N_AFTER) + 0.5, ry(p), 0);
  for (let i = -10; i <= N_AFTER; i += 10) a.push(bx(i), ry(4942), 0, bx(i), ry(5052), 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
  return g;
})();
/** the bars one row shows on this frame (shared history, the breakout bar, then its own ending) */
export const rowBars = (o: Outcome, d: Dir): Placed[] => {
  const out: Placed[] = [];
  for (let i = ROW_I0; i <= 0; i++) out.push({ b: bar(o, i), x: bx(i) });
  for (let i = 1; i <= N_AFTER; i++) {
    const k = Math.min(1, Math.max(0, d.rows.n - (i - 1)));
    if (k > 0.01) out.push({ b: grow(AFTER[o][i - 1], k), x: bx(i) });
  }
  return out;
};
const RowChart: React.FC<{ o: Outcome; d: Dir }> = ({ o, d }) => {
  const R = d.rows;
  const gridMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#9fb2d8", transparent: true, depthWrite: false }), []);
  const laserMat = useMemo(() => new THREE.MeshBasicMaterial({ color: PAL.laser, toneMapped: false, transparent: true }), []);
  if (R.op[o] < 0.01) return null;
  const op = R.op[o];
  const body = op * (1 - R.fade);
  gridMat.opacity = 0.12 * body * (1 - R.merge);
  laserMat.opacity = op;
  laserMat.color.set(PAL.laser).multiplyScalar(1.3 + d.laser * 0.9);
  const bars = rowBars(o, d);
  const x0 = bx(ROW_I0) - 0.7,
    x1 = bx(N_AFTER) + 0.7;
  // in the finale the level stretches past the frame: it is all that is left
  const ext = 30 * R.collapse;
  const thick = 1 + R.collapse * 1.4;
  return (
    <group position={[X_ROWS, R.y[o], 0]} scale={R.s[o]}>
      {R.merge < 0.01 && (
        <mesh material={rowGlass} position={[(x0 + x1) / 2, (ROW_BAND.y0 + ROW_BAND.y1) / 2, -0.45]}>
          <planeGeometry args={[x1 - x0, ROW_BAND.y1 - ROW_BAND.y0]} />
        </mesh>
      )}
      <lineSegments geometry={rowGrid} material={gridMat} position={[0, 0, -0.4]} />
      <mesh material={laserMat} position={[(x0 + x1) / 2, ry(LEVEL), 0]} rotation={[0, 0, Math.PI / 2]} scale={[thick, 1, thick]}>
        <cylinderGeometry args={[0.018, 0.018, x1 - x0 + ext * 2, 8]} />
      </mesh>
      {bars.map(({ b, x }) => (
        <Candle key={x} bar={b} x={x} ym={ry} wick={0.018} op={body} glow={x === 0 ? d.flash * 0.7 : 0} />
      ))}
      <VolumeBarsAt bars={bars} y0={ROW_VOL_Y} max={0.7} k={R.vol[o] * body} />
    </group>
  );
};

// ------------------------------------------------------------------ assembly
/** settled + live bars of the main chart (outcome C) on this frame */
export const mainBars = (d: Dir) => {
  const out: { b: Bar; i: number }[] = [...PAST];
  d.main.u.forEach((u, k) => {
    if (u > 0.001) out.push({ b: liveBar(k === 0 ? BREAK : AFTER.C[k - 1], PATHS[k], u), i: k });
  });
  for (let i = 3; i <= N_AFTER; i++) {
    const k = Math.min(1, Math.max(0, d.main.rest - (i - 3)));
    if (k > 0.01) out.push({ b: grow(AFTER.C[i - 1], k), i });
  }
  return out;
};

export const Scene: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const dist = d.cam.pos.distanceTo(d.cam.target);
  const prior = Math.max(hold(f, 1190, 1290, 12), d.deltaLine);
  const R = d.rows;
  return (
    <>
      <CameraRig position={d.cam.pos.toArray() as [number, number, number]} target={d.cam.target.toArray() as [number, number, number]} fov={d.cam.fov} />
      <fog attach="fog" args={[PAL.bg, dist * 0.9, dist * 2.2 + 30]} />
      <Sky />
      <ambientLight intensity={0.12} />
      <directionalLight position={[5, 9, 7]} intensity={1.6} color="#fff1df" />
      <directionalLight position={[-7, 4, -8]} intensity={1.4} color="#7fa2ff" />
      <spotLight position={[0.5, 9, 3]} angle={0.42} penumbra={0.8} intensity={60} distance={30} color="#ffffff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 6, 4]} scale={[8, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#88a8ff" position={[-6, 2, -3]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={2} color="#ffe2c4" position={[5, 3, 6]} scale={2.4} />
      </Environment>

      {d.world === "story" && (
        <>
          <spotLight position={[X_ST - 2, 24, 16]} angle={0.55} penumbra={0.9} intensity={140 * Math.min(1, d.story.n / 5)} distance={80} color="#ffffff" />
          <Beam pos={[X_ST - 18, 22, -14]} r={12} h={60} color="#3a5cff" i={0.16 * Math.min(1, d.story.n / 8)} tilt={0.18} />
          <Beam pos={[X_ST + 1, 16, -6]} r={3.4} h={26} color="#fff3e0" i={0.05 + d.flash * 0.3} tilt={-0.1} />
          <group position={[X_ST + 18, 0, 0]}>
            <Dust t={d.t} />
          </group>
          <StoryChart d={d} />
          <Sparks age={(f - d.sparks[0].at) / FPS} origin={d.sparks[0].origin} color={d.sparks[0].color} seed={5} n={320} />
          <Shockwave a={d.shock.a} age={d.shock.at} color="#dff4ff" x={d.shock.x} y={d.shock.y} />
        </>
      )}

      {d.world === "main" &&
        (() => {
          const bars = mainBars(d);
          const near = bars.filter(({ i }) => i >= -14).map(({ b, i }) => ({ b, x: bx(i) }));
          return (
            <>
              <Beam pos={[-26, 14, -16]} r={16} h={70} color="#3a5cff" i={0.2} tilt={0.18} />
              <Beam pos={[-2.6, 9.5, -5]} r={3.2} h={16} color="#ffffff" i={0.12} tilt={-0.14} />
              <Beam pos={[0.2, 9.2, -1]} r={1.8} h={11} color="#fff3e0" i={0.06 + d.flash * 0.25} />
              <Board />
              <Dust t={d.t} />
              {bars.map(({ b, i }) => (
                <Candle key={i} bar={b} x={bx(i)} glow={i === PRIOR_HIGH ? prior : 0} />
              ))}
              <Laser i={d.laser} w={d.view.w} />
              <Sparks age={(f - d.sparks[1].at) / FPS} origin={d.sparks[1].origin} color={d.sparks[1].color} seed={6} />
              <Shockwave a={d.shock.a} age={d.shock.at} color={PAL.down} x={d.shock.x} y={d.shock.y} />
              <Marker k={prior} at={[bx(PRIOR_HIGH), py(5000), 0.32]} />
              <Stops pts={BUY_STOPS} show={d.buyStops.show} fire={d.buyStops.fire} dir={1} t={d.t} to={WALL.y0 + 0.2} />
              <Stops pts={SELL_STOPS} show={d.sellStops.show} fire={d.sellStops.fire} dir={-1} t={d.t} to={py(4968)} />
              <Stream k={d.stream} t={d.t} to={WALL.y0 + 0.15} />
              <Wall show={d.wall.show} hit={d.wall.hit} t={d.t} />
              <AcceptZone show={d.accept} fill={0} />
              <DeltaLine k={d.deltaLine} />
              <DeltaBarsAt bars={near} y0={py(4930)} half={1.5} k={d.deltaStrip} w={0.34} />
            </>
          );
        })()}

      {d.world === "rows" && (
        <>
          <spotLight position={[X_ROWS, 30, 18]} angle={0.5} penumbra={0.9} intensity={160 * (1 - R.fade * 0.7)} distance={80} color="#ffffff" />
          <Beam pos={[X_ROWS - 6, 26, -14]} r={12} h={60} color="#3a5cff" i={0.16} tilt={0.18} />
          <Beam pos={[X_ROWS + 6, 26, -12]} r={9} h={60} color="#ffffff" i={0.08 + d.flash * 0.2} tilt={-0.14} />
          <group position={[X_ROWS + 25, 2, 0]}>
            <Dust t={d.t} />
          </group>
          {(["B", "A", "C"] as const).map((o) => (
            <RowChart key={o} o={o} d={d} />
          ))}
          {/* finale: the three endings leave the breakout bar as light trails, then fold onto the level */}
          <group position={[X_ROWS, ROW_Y.B, 0]}>
            {OUTCOMES.map((o) => (
              <Trail key={o} o={o} k={R.trail} op={1 - Math.min(1, Math.max(0, (R.collapse - 0.75) / 0.25))} ym={ry} fold={R.collapse} width={6} />
            ))}
          </group>
        </>
      )}
    </>
  );
};
