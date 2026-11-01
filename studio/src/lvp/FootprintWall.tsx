import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mulberry32 } from "../lib/rng";
import { BRAND } from "./brand";
import { SYMBOL_CENTER, SYMBOL_WORLD_SCALE, SYMBOL_WORLD_Y, symbolMask } from "./logo";

const COL_W = 0.085;
const ROW_H = 0.062;
const X0 = -8.2;
const Y0 = -3.7;
const NC = 194;
const NR = 120;
const DEPTH = 0.05;
const BACK_LAYERS = [
  { z: -2.4, shift: 0.5, seed: 3 },
  { z: -4.9, shift: 0.25, seed: 4 },
];

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** One footprint candle per column: a random-walk range of price cells, with volume per cell. */
const candles = (seed: number, centerRow: number) => {
  const rand = mulberry32(seed);
  let mid = centerRow + (rand() - 0.5) * 20;
  let v = 0;
  return Array.from({ length: NC }, () => {
    v = v * 0.7 + (rand() - 0.5) * 3.2 + (centerRow - mid) * 0.04;
    mid += v;
    const lo = Math.round(mid - 3 - rand() * 8);
    const hi = Math.round(mid + 3 + rand() * 8);
    const poc = Math.round(lo + (hi - lo) * (0.3 + rand() * 0.4));
    return { lo, hi, poc, ask: rand() };
  });
};

/**
 * Walls of footprint candles built from glass price cells. Imbalanced cells light up gold;
 * then the front wall's columns stretch and trim themselves to the mark's silhouette, every
 * cell inside it lit, and finally melt away as the gold mark is cast over them.
 */
export const FootprintWall: React.FC<{
  build: number; // 0→1: candles printed left to right
  time: number;
  morph: number; // 0→1: front wall becomes the mark
  backFade: number; // 0→1: back walls fall away
  level: number; // world y of the casting sweep; cells below it are gone
}> = ({ build, time, morph, backFade, level }) => {
  const data = useMemo(() => {
    const { inside } = symbolMask(1000);
    const toSvg = (x: number, y: number) => [x / SYMBOL_WORLD_SCALE + SYMBOL_CENTER.x, -(y - SYMBOL_WORLD_Y) / SYMBOL_WORLD_SCALE + SYMBOL_CENTER.y];
    const centerRow = (SYMBOL_WORLD_Y - Y0) / ROW_H;
    const front = candles(11, centerRow);
    // the mark sampled on the cell grid, and each column's extent within it
    const mask = new Uint8Array(NC * NR);
    const logo = Array.from({ length: NC }, (_, c) => {
      let lo = -1;
      let hi = -1;
      for (let r = 0; r < NR; r++) {
        const [sx, sy] = toSvg(X0 + c * COL_W, Y0 + r * ROW_H);
        if (inside(sx, sy)) {
          mask[c * NR + r] = 1;
          if (lo < 0) lo = r;
          hi = r;
        }
      }
      return { lo, hi };
    });
    const back = BACK_LAYERS.map((layer) => {
      const cs = candles(layer.seed * 97, centerRow + (layer.seed - 3.5) * 14);
      const cells: { c: number; r: number; poc: boolean; ask: number }[] = [];
      cs.forEach((cd, c) => {
        for (let r = cd.lo; r <= cd.hi; r++) cells.push({ c, r, poc: r === cd.poc, ask: cd.ask });
      });
      return { ...layer, cells };
    });
    const backCount = back.reduce((a, l) => a + l.cells.length, 0);

    const geo = new RoundedBoxGeometry(1, 1, 1, 1, 0.14);
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 0.05,
      roughness: 0.07,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      envMapIntensity: 1.6,
    });
    const glow = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const total = NC * NR + backCount;
    const glassMesh = new THREE.InstancedMesh(geo, glass, total);
    const glowMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glow, total);
    glassMesh.frustumCulled = false;
    glowMesh.frustumCulled = false;
    return { front, logo, mask, back, glassMesh, glowMesh };
  }, []);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const col = new THREE.Color();
  const gcol = new THREE.Color();
  const gold = new THREE.Color(BRAND.softGold);
  const steel = new THREE.Color(BRAND.sell);
  const amber = new THREE.Color(BRAND.gold);
  let i = 0;

  const put = (x: number, y: number, z: number, scale: number, glass: THREE.Color, glowAmt: number) => {
    p.set(x, y, z);
    s.set(COL_W * 0.86 * scale, ROW_H * 0.84 * scale, DEPTH * Math.max(scale, 0.0001));
    m.compose(p, q, s);
    data.glassMesh.setMatrixAt(i, m);
    data.glassMesh.setColorAt(i, glass);
    const g = Math.max(0, glowAmt) * scale;
    s.set(COL_W * 0.6 * g, ROW_H * 0.56 * g, DEPTH * 0.6 * Math.max(g, 0.0001));
    m.compose(p, q, s);
    data.glowMesh.setMatrixAt(i, m);
    data.glowMesh.setColorAt(i, gcol.copy(gold).multiplyScalar(1.6 * Math.min(1, glowAmt)));
    i++;
  };

  // Front wall.
  for (let c = 0; c < NC; c++) {
    const x = X0 + c * COL_W;
    const cd = data.front[c];
    const lg = data.logo[c];
    const born = smooth(0, 0.06, build * 0.8 + 0.3 - (c / NC) * 1.0); // the left of the session is already printed when we arrive
    // columns near the centre resolve first
    const mc = smooth(0, 1, morph * 1.6 - (Math.abs(x) / 8.2) * 0.6);
    const has = lg.lo >= 0;
    const lo = has ? cd.lo + (lg.lo - cd.lo) * mc : cd.lo;
    const hi = has ? cd.hi + (lg.hi - cd.hi) * mc : cd.hi;
    const shrink = has ? 1 : 1 - mc;
    for (let r = 0; r < NR; r++) {
      const y = Y0 + r * ROW_H;
      const inRange = smooth(-0.6, 0.4, Math.min(r - lo, hi - r));
      const inMask = data.mask[c * NR + r];
      const trim = 1 - smooth(0.55, 0.95, mc) * (1 - inMask);
      const cast = 1 - smooth(-0.02, 0.06, level - y);
      const scale = inRange * born * shrink * trim * cast;
      const h = hash(c, r);
      // imbalance: a few cells flash gold as the tape prints into them
      const imb = h < 0.09 ? smooth(0.55, 0.95, Math.sin(time * (2 + h * 30) + h * 90)) : 0;
      const isPoc = r === cd.poc ? 0.45 : 0;
      const glowAmt = (imb + isPoc) * (1 - mc) + inMask * smooth(0.5, 1, mc) * (0.55 + 0.45 * Math.sin(time * 2.4 - x * 1.4 + y * 2));
      col.copy(steel).lerp(amber, cd.ask * 0.8 + h * 0.2).multiplyScalar(0.6 + h * 0.5);
      col.lerp(gold, smooth(0.5, 1, mc) * inMask);
      put(x, y, 0, scale, col, glowAmt);
    }
  }
  // Back walls: parallax depth, then they drop away.
  for (const layer of data.back) {
    for (const cell of layer.cells) {
      const x = X0 + (cell.c + layer.shift) * COL_W;
      const born = smooth(0, 0.06, build * 0.8 + 0.34 - (cell.c / NC) * 1.0);
      const y = Y0 + cell.r * ROW_H - backFade * backFade * 3;
      const h = hash(cell.c + layer.z, cell.r);
      const imb = h < 0.06 ? smooth(0.6, 0.95, Math.sin(time * (2 + h * 30) + h * 70)) : 0;
      col.copy(steel).lerp(amber, cell.ask).multiplyScalar(0.45 + h * 0.4);
      put(x, y, layer.z, born * (1 - backFade), col, (imb + (cell.poc ? 0.35 : 0)) * (1 - backFade));
    }
  }
  data.glassMesh.instanceMatrix.needsUpdate = true;
  data.glowMesh.instanceMatrix.needsUpdate = true;
  if (data.glassMesh.instanceColor) data.glassMesh.instanceColor.needsUpdate = true;
  if (data.glowMesh.instanceColor) data.glowMesh.instanceColor.needsUpdate = true;
  return (
    <>
      <primitive object={data.glowMesh} />
      <primitive object={data.glassMesh} />
    </>
  );
};
