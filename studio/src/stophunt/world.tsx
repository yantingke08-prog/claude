// The 3D set: candles standing in space, glass level shelves, piles of resting stop orders (cubes) behind the levels,
// an order-book ladder, volume floors. Everything is a pure function of the frame.
import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import * as THREE from "three";
import { E, clamp01, ease, out3, ramp, win } from "./cue";
import { A_HIGH, A_HI, A_LO, A_LOW, A_N, B_HI, B_HIGH, B_N, CUBE, HUNT, ROUND, SERIES_A, SERIES_REAL, SERIES_TEST, TEST_WICK, TOUCH, XS, YS, avgVol, pile, px, py, type Bar, type Cube } from "./data";
import { LADDER_X, YOU, cam, huntCross, stage } from "./director";

export const COL = {
  bg: "#04060b",
  up: "#1fcf8f",
  down: "#f0475d",
  buyStop: "#39d4ff", // shorts' stops: buy orders
  sellStop: "#ff5f9e", // longs' stops: sell orders
  level: "#ffc24a",
  round: "#a98bff",
  gold: "#ffcf5a",
  good: "#3ee08f",
  bad: "#ff5468",
  you: "#ffffff",
  grid: "#7f93b5",
  steel: "#6f88ad",
};

// ---------------------------------------------------------------- camera rig
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

// ---------------------------------------------------------------- candles (real boxes, lit)
type Live = Bar & { g: number; hot?: number };
const Candles: React.FC<{ bars: Live[]; i0: number; op: number }> = ({ bars, i0, op }) => {
  if (op <= 0.002) return null;
  return (
    <group>
      {bars.map((b, i) => {
        if (b.g <= 0.001) return null;
        const wk = out3(b.g / 0.4);
        const bk = out3((b.g - 0.4) / 0.6);
        const up = b.c >= b.o;
        const close = b.o + (b.c - b.o) * bk;
        const hi = b.o + (b.h - b.o) * wk;
        const lo = b.o - (b.o - b.l) * wk;
        const x = px(i, i0);
        const col = up ? COL.up : COL.down;
        const hb = Math.max(0.035, Math.abs(close - b.o) * YS);
        const hot = b.hot ?? 0;
        return (
          <group key={i}>
            <mesh position={[x, (py(hi) + py(lo)) / 2, 0]}>
              <boxGeometry args={[0.055, Math.max(0.02, py(hi) - py(lo)), 0.055]} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.35 + hot} transparent opacity={op} roughness={0.5} />
            </mesh>
            {bk > 0 && (
              <mesh position={[x, (py(close) + py(b.o)) / 2, 0]}>
                <boxGeometry args={[XS * 0.62, hb, XS * 0.62]} />
                <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.16 + hot} transparent opacity={op} roughness={0.32} metalness={0.15} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- piles of stop orders (instanced)
type CubeState = { x: number; y: number; z: number; s: number; heat: number } | null;
const Pile: React.FC<{ cubes: Cube[]; color: string; op: number; ghost?: number; glow?: number; at: (j: number, c: Cube) => CubeState }> = ({ cubes, color, op, ghost = 0, glow = 0, at }) => {
  const mesh = useMemo(() => {
    const g = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
    const m = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: color, emissiveIntensity: 0.4, roughness: 0.35, metalness: 0.1, transparent: true });
    const im = new THREE.InstancedMesh(g, m, cubes.length);
    im.frustumCulled = false;
    return im;
  }, [cubes, color]);
  const base = useMemo(() => new THREE.Color(color), [color]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), c: new THREE.Color(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.opacity = op * (1 - 0.72 * ghost);
  mat.emissiveIntensity = (0.32 + 0.9 * glow) * (1 - 0.7 * ghost);
  mat.depthWrite = ghost < 0.5;
  mesh.visible = op > 0.002;
  cubes.forEach((c, j) => {
    const st = op > 0.002 ? at(j, c) : null;
    const s = st ? st.s : 0;
    tmp.p.set(st?.x ?? 0, st?.y ?? 0, st?.z ?? 0);
    tmp.s.set(s, s, s);
    tmp.m.compose(tmp.p, tmp.q, tmp.s);
    mesh.setMatrixAt(j, tmp.m);
    const k = 0.55 + 0.25 * c.k;
    tmp.c.copy(base).multiplyScalar(k * (1 + (st?.heat ?? 0) * 3));
    mesh.setColorAt(j, tmp.c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---------------------------------------------------------------- glass level shelf with a bright front edge
const Shelf: React.FC<{ y: number; x0: number; x1: number; color: string; k: number; op: number; z0?: number; z1?: number; glow?: number }> = ({ y, x0, x1, color, k, op, z0 = 0.34, z1 = -2.3, glow = 0 }) => {
  if (k <= 0.002 || op <= 0.002) return null;
  const w = (x1 - x0) * out3(k);
  return (
    <group>
      <mesh position={[x0 + w / 2, y, (z0 + z1) / 2]}>
        <boxGeometry args={[w, 0.02, z0 - z1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.05 + 0.4 * glow} transparent opacity={(0.035 + 0.07 * glow) * op} depthWrite={false} />
      </mesh>
      <mesh position={[x0 + w / 2, y, z0]}>
        <boxGeometry args={[w, 0.035, 0.035]} />
        <meshBasicMaterial color={color} transparent opacity={0.95 * op} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Box: React.FC<{ p: [number, number, number]; s: [number, number, number]; color: string; op: number; ei?: number; basic?: boolean }> = ({ p, s, color, op, ei = 0.3, basic }) =>
  op <= 0.002 || s[0] <= 0.001 || s[1] <= 0.001 ? null : (
    <mesh position={p}>
      <boxGeometry args={s} />
      {basic ? <meshBasicMaterial color={color} transparent opacity={op} toneMapped={false} depthWrite={false} /> : <meshStandardMaterial color={color} emissive={color} emissiveIntensity={ei} transparent opacity={op} roughness={0.4} />}
    </mesh>
  );

// ---------------------------------------------------------------- back wall grid + depth dust
const Grid: React.FC<{ op: number }> = ({ op }) => {
  const geo = useMemo(() => {
    const pts: number[] = [];
    // one wall from the charts to the ladder, so the camera always flies past structure, never through a void
    for (let y = -7; y <= 8.01; y += 1) pts.push(-16, y, -2.7, 58, y, -2.7);
    for (let x = -16; x <= 58.01; x += 2) pts.push(x, -7, -2.7, x, 8, -2.7);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  if (op <= 0.002) return null;
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={COL.grid} transparent opacity={0.11 * op} />
    </lineSegments>
  );
};
const Dust: React.FC = () => {
  const geo = useMemo(() => {
    let s = 5;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pts: number[] = [];
    for (let i = 0; i < 1600; i++) pts.push(-30 + r() * 90, -14 + r() * 30, -4 - r() * 26);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#7d95c4" size={0.06} sizeAttenuation transparent opacity={0.5} depthWrite={false} />
    </points>
  );
};

// ---------------------------------------------------------------- data on stage
const PH = pile(31, A_HIGH, 1, 27, 41, 230);
const PL = pile(47, A_LOW, -1, 26, 41, 200);
const PR = pile(53, ROUND, 1, 31, 41, 110);
const PB = pile(61, B_HIGH, 1, 14, 27, 210);
const PRICE = (y: number) => y / YS + 98.3;
export const GOLD = { x: px(44), y: (py(99.7) + py(100.12)) / 2, h: py(100.12) - py(99.7), w: 0.9, z: -0.9, d: 1.2 };
/** the big order on the ladder: slides in, eats the thick row from the front, shrinks as it fills */
export const ladderBlock = (f: number, n: number) => {
  const fill = E("liqFill");
  const k = ease((f - (fill - 26)) / 26);
  let eaten = 0;
  for (let j = 0; j < n; j++) eaten += ramp(f, fill + 10 + j * 3.2, 6);
  const w = 2.4 * (1 - 0.82 * (eaten / n));
  const contact = LADDER_X + 0.05 + eaten * 0.72;
  return { x: LADDER_X - 7 + (contact - w / 2 - (LADDER_X - 7)) * k, w, done: eaten / n, op: clamp01((f - (fill - 26)) / 8) };
};
const hash = (j: number) => {
  const x = Math.sin(j * 127.1 + 11.7) * 43758.5453;
  return x - Math.floor(x);
};
export const VA_Y = py(A_LOW) - 1.55;
export const VB_Y = -1.85;
const VOLK = 0.42;

/** a bar that prints live: up to its extreme first, then back to its close */
export const liveBar = (f: number, b: Bar, a: number, top: number, end: number, upFirst = true): Live => {
  if (f < a) return { ...b, g: 0 };
  const ext = upFirst ? b.h : b.l;
  let p: number;
  let reach: number;
  if (f < top) {
    p = b.o + (ext - b.o) * ease((f - a) / Math.max(1, top - a));
    reach = p;
  } else {
    p = ext + (b.c - ext) * ease((f - top) / Math.max(1, end - top));
    reach = ext;
  }
  const done = clamp01((f - end) / 8);
  return upFirst
    ? { o: b.o, h: Math.max(b.o, reach), l: Math.min(p, b.o) - (Math.min(p, b.o) - b.l) * done, c: p, v: b.v, g: 1 }
    : { o: b.o, l: Math.min(b.o, reach), h: Math.max(p, b.o) + (b.h - Math.max(p, b.o)) * done, c: p, v: b.v, g: 1 };
};

export const barsA = (f: number): Live[] =>
  SERIES_A.map((b, i) => {
    if (i < HUNT) return { ...b, g: 1 };
    if (i === HUNT) return { ...liveBar(f, b, E("hunt"), E("fire") + 16, E("counter") + 6), hot: 0.5 * win(f, E("fire"), E("wickIn"), 6, 20) };
    return { ...b, g: clamp01((f - (E("wickIn") + 4 + (i - HUNT - 1) * 6)) / 10) };
  });

const realG = (f: number, i: number) => {
  const at = [E("c1"), E("c2"), E("c2") + 12, E("c3"), E("c3catch"), E("c3catch") + 10][i - TOUCH];
  return clamp01((f - at) / 14);
};
export const barsB = (f: number): Live[] => {
  const testIn = E("testIn");
  const collapse = 1 - ramp(f, testIn, 10);
  const real = f < testIn + 10;
  return (real ? SERIES_REAL : SERIES_TEST).map((b, i) => {
    if (i < TOUCH) return { ...b, g: clamp01((f - (E("checkIn") - 8 + i * 0.9)) / 9) };
    if (real) return { ...b, g: realG(f, i) * collapse, hot: i === TOUCH ? 0.6 * win(f, E("c1vol"), E("c2"), 6, 12) : i === TOUCH + 3 ? 0.6 * win(f, E("c3catch"), testIn, 6, 10) : 0 };
    if (i === TOUCH) return { ...liveBar(f, b, E("pierce") - 10, E("pierce") + 8, E("back") + 6), hot: 0.5 * win(f, E("pierce"), E("noFollow"), 6, 12) };
    const at = i <= TOUCH + 3 ? E("noFollow") + (i - TOUCH - 1) * 7 : E("notReal") + (i - TOUCH - 4) * 7;
    return { ...b, g: clamp01((f - at) / 12) };
  });
};

/** price of the buffer stop at frame f (series B), and which state it is in */
export const stopPlan = (f: number) => {
  const bad = B_HIGH + 0.06;
  const good = TEST_WICK + 0.24;
  const move = ramp(f, E("buffer") - 4, 26);
  const span = 0.24 + (0.1 - 0.24) * ramp(f, E("tune"), 18) + (0.4 - 0.1) * ramp(f, E("vol"), 18) + (0.24 - 0.4) * ramp(f, E("coreIn"), 24);
  const good2 = TEST_WICK + span;
  return { price: bad + (good2 - bad) * move, bad, good, good2, move, span };
};

// ---------------------------------------------------------------- the world
export const World: React.FC<{ f: number }> = ({ f }) => {
  const st = stage(f);
  const A = barsA(f);
  const B = barsB(f);
  const xA1 = px(A_N - 1) + 0.6;
  const xB1 = px(B_N - 1) + 0.6;

  // ---- pile above the series-A high
  const mechIn = E("mechIn");
  // switch to the mechanism state while series A is off stage (between the opening and the ladder's exit)
  const inMech = f >= E("liqIn") + 14;
  const buildHi = inMech ? 0.4 * ramp(f, E("shortStops"), 40) + 0.6 * ramp(f, E("pile"), 60) : 1;
  const buildLo = inMech ? 0.4 * ramp(f, E("longStops"), 40) + 0.6 * ramp(f, E("pile"), 60) : 0;
  const ghost = inMech ? ramp(f, E("hidden"), 10) * (1 - ramp(f, E("pile") + 20, 30)) : 0;
  const huntH = SERIES_A[HUNT].h;
  const huntO = SERIES_A[HUNT].o;
  const pollIn = E("pollIn");
  const refill = ramp(f, pollIn + 6, 30);
  const underGhost = ramp(f, E("pileUnder"), 14);
  const youHeat = 1 - ramp(f, E("seeYou"), 16);
  const hiAt = (j: number, c: Cube): CubeState => {
    if (f >= pollIn + 6) return c.t < refill ? { x: c.x, y: c.y, z: c.z, s: out3((refill - c.t) * 8), heat: 0 } : null;
    if (c.t >= buildHi) return null;
    const grow = out3((buildHi - c.t) * 8);
    if (!inMech) {
      const isYou = Math.abs(c.x - YOU[0]) < 0.12 && Math.abs(c.y - YOU[1]) < 0.05 && Math.abs(c.z - YOU[2]) < 0.05;
      return { x: c.x, y: c.y, z: c.z, s: grow, heat: isYou ? 0 : 0 };
    }
    const launch = huntCross(PRICE(c.y) - CUBE / YS / 2, huntO, huntH) + hash(j) * 16;
    if (f < launch) return { x: c.x, y: c.y, z: c.z, s: grow, heat: 0.4 * win(f, E("pile"), E("hunt"), 20, 10) * (c.k > 0.7 ? 1 : 0) };
    const u = (f - launch) / 24;
    if (u >= 1) {
      // gone; shown again as a ghost when the voice asks what was sitting there
      return underGhost > 0 && f < pollIn + 6 ? { x: c.x, y: c.y, z: c.z, s: underGhost, heat: 0 } : null;
    }
    const tx = GOLD.x - GOLD.w / 2 + 0.1 + hash(j + 3) * 0.3;
    const ty = GOLD.y + (hash(j + 5) - 0.5) * GOLD.h * 0.8;
    const tz = GOLD.z + (hash(j + 7) - 0.5) * GOLD.d * 0.8;
    const k = ease(u);
    return { x: c.x + (tx - c.x) * k, y: c.y + (ty - c.y) * k + Math.sin(Math.PI * k) * 0.7, z: c.z + (tz - c.z) * k, s: 1 - 0.5 * k, heat: 1 };
  };
  const ghostHi = f >= E("pileUnder") && f < pollIn + 6 ? 1 : ghost;
  const loAt = (_j: number, c: Cube): CubeState => (c.t < buildLo || !inMech ? (inMech ? { x: c.x, y: c.y, z: c.z, s: out3((buildLo - c.t) * 8), heat: 0 } : null) : null);
  const buildR = ramp(f, E("round"), 30);
  const rAt = (_j: number, c: Cube): CubeState => (f >= pollIn && c.t < buildR ? { x: c.x, y: c.y, z: c.z, s: out3((buildR - c.t) * 8), heat: 0 } : null);
  const gatherGlow = win(f, E("visible"), E("checkIn"), 14, 12);

  // ---- pile above the series-B high
  const buildB = ramp(f, E("checkIn") + 26, 40);
  const testTop = TEST_WICK;
  const pierceA = E("pierce") - 10;
  const pierceT = E("pierce") + 8;
  const stopIn = E("stopIn");
  const refillB = ramp(f, stopIn + 4, 26);
  const bAt = (j: number, c: Cube): CubeState => {
    if (c.t >= buildB) return null;
    const grow = out3((buildB - c.t) * 8);
    const p = PRICE(c.y) - CUBE / YS / 2;
    if (p > testTop || f < pierceA) return { x: c.x, y: c.y, z: c.z, s: grow, heat: 0 };
    const k0 = clamp01((p - SERIES_TEST[TOUCH].o) / (testTop - SERIES_TEST[TOUCH].o));
    const launch = pierceA + (pierceT - pierceA) * k0 + hash(j) * 6;
    if (f < launch) return { x: c.x, y: c.y, z: c.z, s: grow, heat: 0 };
    if (f >= stopIn + 4) return c.t < refillB ? { x: c.x, y: c.y, z: c.z, s: out3((refillB - c.t) * 8), heat: 0 } : null;
    const u = (f - launch) / 14;
    if (u >= 1) return null;
    const tx = px(TOUCH) + 0.05;
    return { x: c.x + (tx - c.x) * ease(u), y: c.y + 0.4 * Math.sin(Math.PI * u), z: c.z * (1 - ease(u)), s: 1 - 0.7 * u, heat: 1 };
  };
  const ghostB = win(f, E("checkIn"), E("testIn"), 20, 10) * 0.55;
  const glowB = win(f, E("coreIn") + 10, 1e9, 20, 10);

  // ---- volume floors
  const volA = win(f, mechIn + 8, pollIn, 14, 12) * st.seriesA;
  const huntVol = 0.9 + (SERIES_A[HUNT].v - 0.9) * ramp(f, E("fire"), 34);
  const volB = win(f, E("c1") - 10, stopIn, 12, 12) * st.seriesB;
  const avgB = avgVol(SERIES_REAL, TOUCH);

  // ---- gold counterparty block
  const goldOp = win(f, E("hunt") - 4, E("wickIn") + 6, 12, 14) * st.seriesA;
  const goldHit = win(f, E("fire") + 4, E("counter") + 30, 6, 24);

  // ---- stop plan (series B)
  const sp = stopPlan(f);
  const planOp = win(f, E("badStop") - 10, 1e9, 12, 12) * st.seriesB;
  const bandOp = ramp(f, E("buffer") + 8, 16) * planOp;
  const stopCol = sp.move < 0.5 ? COL.bad : COL.good;

  // ---- ladder
  const L = st.ladder;
  const ROWS = [3, 2, 4, 2, 12, 3, 2, 4, 2];
  const fill = E("liqFill");
  const many = ramp(f, E("liqMany"), 14);
  const rowHi = ramp(f, E("liqRow"), 12);

  return (
    <>
      <Rig f={f} />
      <color attach="background" args={[COL.bg]} />
      <fog attach="fog" args={[COL.bg, 30, 70]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 9, 12]} intensity={1.5} />
      <directionalLight position={[-8, 3, -6]} intensity={0.55} color="#7fa7ff" />
      <Dust />
      <Grid op={st.dimEnd} />

      {/* series A */}
      {/* the opening starts on the cube alone; the chart arrives with the pull-back */}
      <Candles bars={A} i0={24} op={st.seriesA * (inMech ? 1 : ramp(f, E("reveal") - 6, 26))} />
      <Shelf y={py(A_HIGH)} x0={px(A_HI) - 0.3} x1={xA1} color={COL.level} k={1} op={st.seriesA} glow={gatherGlow * 0.8} />
      <Shelf y={py(A_LOW)} x0={px(A_LO) - 0.3} x1={xA1} color={COL.level} k={ramp(f, E("longStops") - 14, 24)} op={st.seriesA} glow={gatherGlow * 0.8} />
      <Shelf y={py(ROUND)} x0={px(28)} x1={xA1} color={COL.round} k={ramp(f, E("round") - 8, 22)} op={st.seriesA * (f >= pollIn ? 1 : 0)} glow={gatherGlow * 0.8} />
      <Pile cubes={PH} color={COL.buyStop} op={st.seriesA} ghost={ghostHi} glow={gatherGlow} at={hiAt} />
      <Pile cubes={PL} color={COL.sellStop} op={st.seriesA} ghost={ghost} glow={gatherGlow} at={loAt} />
      <Pile cubes={PR} color={COL.round} op={st.seriesA} glow={gatherGlow} at={rAt} />
      {/* your stop in the opening: one white cube in the crowd */}
      <Box p={YOU} s={[CUBE * 1.04, CUBE * 1.04, CUBE * 1.04].map((v) => v * (1 - ramp(f, E("seeYou") + 10, 14) * 0.04)) as [number, number, number]} color={youHeat > 0.02 ? COL.you : COL.buyStop} op={st.seriesA * (inMech ? 0 : 1)} ei={0.4 + 1.6 * youHeat} />
      <Box p={[GOLD.x, GOLD.y, GOLD.z]} s={[GOLD.w, GOLD.h * out3(goldOp), GOLD.d]} color={COL.gold} op={goldOp * 0.8} ei={0.12 + 0.35 * goldHit} />
      {volA > 0.002 &&
        A.map((b, i) => {
          if (b.g <= 0.001 || i < 18) return null;
          const v = i === HUNT ? huntVol : b.v;
          const h = v * VOLK * out3(b.g);
          return <Box key={`va${i}`} p={[px(i), VA_Y + h / 2, 0]} s={[XS * 0.5, h, XS * 0.5]} color={i === HUNT ? COL.gold : COL.steel} op={volA * (i === HUNT ? 1 : 0.55)} ei={i === HUNT ? 0.6 : 0.15} />;
        })}

      {/* order-book ladder */}
      {L > 0.002 &&
        ROWS.map((n, r) => {
          const y = (r - 4) * 0.86;
          const thick = r === 4;
          const rowIn = ramp(f, E("liqIn") - 4 + r * 2, 12);
          return (
            <group key={`row${r}`}>
              <Box p={[LADDER_X + 4.1, y, 0.42]} s={[9.6 * rowIn, 0.03, 0.03]} color={thick ? COL.gold : COL.grid} op={L * (thick ? 0.4 + 0.6 * rowHi : 0.35)} basic />
              {Array.from({ length: n }, (_, j) => {
                const eat = thick ? ramp(f, fill + 10 + j * 3.2, 6) : 0;
                const s = rowIn * (1 - eat);
                const col = thick ? (many > 0.5 ? COL.gold : COL.steel) : COL.steel;
                return <Box key={j} p={[LADDER_X + 0.4 + j * 0.72, y, -0.1]} s={[0.6 * s, 0.6 * s, 0.7 * s]} color={col} op={L * (thick ? 1 : 1 - 0.45 * many)} ei={thick ? 0.25 + 0.5 * many : 0.12} />;
              })}
            </group>
          );
        })}
      {L > 0.002 &&
        (() => {
          const b = ladderBlock(f, ROWS[4]);
          return <Box p={[b.x, 0, -0.1]} s={[b.w, 0.7, 0.9]} color={COL.gold} op={L * b.op} ei={0.3 + 0.4 * b.done} />;
        })()}

      {/* series B */}
      <Candles bars={B} i0={24} op={st.seriesB * st.dimEnd} />
      <Shelf y={py(B_HIGH)} x0={px(B_HI) - 0.3} x1={xB1} color={COL.level} k={ramp(f, E("checkIn") + 10, 24)} op={st.seriesB * st.dimEnd} glow={glowB} />
      <Pile cubes={PB} color={COL.buyStop} op={st.seriesB * (0.4 + 0.6 * st.dimEnd)} ghost={ghostB} glow={glowB} at={bAt} />
      {volB > 0.002 &&
        B.map((b, i) => {
          if (b.g <= 0.001 || i < 16) return null;
          const h = b.v * 0.38 * out3(b.g);
          const hot = i === TOUCH ? win(f, E("c1vol"), E("c2"), 6, 14) + win(f, E("pierce"), E("noFollow"), 6, 14) : 0;
          return <Box key={`vb${i}`} p={[px(i), VB_Y + h / 2, 0]} s={[XS * 0.5, h, XS * 0.5]} color={hot > 0.05 ? COL.gold : COL.steel} op={volB * (0.55 + 0.45 * hot)} ei={0.15 + 0.6 * hot} />;
        })}
      <Box p={[(px(16) + xB1) / 2, VB_Y + avgB * 0.38, 0.3]} s={[xB1 - px(16), 0.025, 0.025]} color="#cfd8e6" op={volB * 0.6 * ramp(f, E("c1vol") - 4, 12)} basic />
      {/* stop plan */}
      <Box p={[(px(18) + xB1) / 2, py(sp.price), 0.36]} s={[xB1 - px(18), 0.05, 0.05]} color={stopCol} op={planOp} basic />
      <Box p={[(px(18) + xB1) / 2, (py(TEST_WICK) + py(sp.price)) / 2, -0.35]} s={[xB1 - px(18), Math.max(0.01, py(sp.price) - py(TEST_WICK)), 1.4]} color={COL.good} op={bandOp * 0.1} ei={0.25} />
      <Box p={[(px(18) + xB1) / 2, py(TEST_WICK), 0.36]} s={[xB1 - px(18), 0.03, 0.03]} color="#ffffff" op={bandOp * 0.7} basic />
      <Box p={[px(31), py(sp.price) + CUBE * 0.6, 0.05]} s={[CUBE * 1.2, CUBE * 1.2, CUBE * 1.2]} color={COL.you} op={planOp} ei={1.4} />
    </>
  );
};

export { PRICE as priceOfY };
