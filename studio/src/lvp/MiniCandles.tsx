import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../lib/rng";
import { ease } from "../lib/gsap";
import { BRAND } from "./brand";
import { FP, type FpSession, rowY } from "./footprint";
import { dissolveDelay, goldAt } from "./FootprintCandles";
import { SYMBOL_CENTER, SYMBOL_WORLD_SCALE, SYMBOL_WORLD_Y, symbolMask } from "./logo";

const STEP_X = 0.036;
const STEP_Y = 0.082;
const H_END = 0.068; // height of a landed mini candle
const H_START = 0.1;
const flyEase = ease("power3.inOut");

/** A unit-height candlestick (wick + rounded body), body placed per variant. */
const candleGeometry = (bodyH: number, bodyY: number) => {
  const wick = new THREE.BoxGeometry(0.075, 1, 0.075).toNonIndexed();
  const body = new RoundedBoxGeometry(0.4, bodyH, 0.24, 2, 0.06).toNonIndexed();
  body.translate(0, bodyY, 0);
  for (const g of [wick, body]) for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
  return mergeGeometries([wick, body])!;
};
const VARIANTS = [candleGeometry(0.62, 0.02), candleGeometry(0.34, 0.16), candleGeometry(0.16, -0.12)];

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The footprint breaks into tiny gold candlesticks. Each is born out of a volume bar in the
 * side's colour, turns gold as it flies, and lands on a grid inside the mark - so the mark is
 * first drawn as rows of little charts - then melts into the cast metal as the sweep passes.
 */
export const MiniCandles: React.FC<{ session: FpSession; converge: number; gold: number; time: number; level: number }> = ({
  session,
  converge,
  gold,
  time,
  level,
}) => {
  const data = useMemo(() => {
    const rand = mulberry32(55);
    // landing grid inside the mark, each row a gently wandering mini chart
    const { inside } = symbolMask(1000);
    const targets: [number, number][] = [];
    for (let y = SYMBOL_WORLD_Y - 1.5; y <= SYMBOL_WORLD_Y + 1.5; y += STEP_Y) {
      for (let x = -1.8; x <= 1.8; x += STEP_X) {
        const wy = y + 0.012 * Math.sin(x * 7 + y * 13);
        const sx = x / SYMBOL_WORLD_SCALE + SYMBOL_CENTER.x;
        const sy = -(wy - SYMBOL_WORLD_Y) / SYMBOL_WORLD_SCALE + SYMBOL_CENTER.y;
        if (inside(sx, sy)) targets.push([x, wy]);
      }
    }
    // sources: volume bars of the main session, weighted by their size
    const cells: { x: number; y: number; len: number; buy: boolean; cx: number; w: number }[] = [];
    for (const c of session.candles)
      for (const r of c.rows) {
        const inner = FP.BODY_W / 2 + FP.GAP;
        const lb = (r.bid / session.maxVol) * FP.BAR_MAX;
        const la = (r.ask / session.maxVol) * FP.BAR_MAX;
        cells.push({ x: c.x - inner - lb / 2, y: rowY(session, r.r), len: lb, buy: false, cx: c.x, w: lb + 0.02 });
        cells.push({ x: c.x + inner + la / 2, y: rowY(session, r.r), len: la, buy: true, cx: c.x, w: la + 0.02 });
      }
    const totalW = cells.reduce((s, c) => s + c.w, 0);
    const pick = () => {
      let u = rand() * totalW;
      for (const c of cells) if ((u -= c.w) <= 0) return c;
      return cells[cells.length - 1];
    };
    const items = targets.map(([tx, ty]) => {
      const cell = pick();
      const axis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      return {
        sx: cell.x + (rand() - 0.5) * cell.len,
        sy: cell.y + (rand() - 0.5) * FP.RH * 0.5,
        cx: cell.cx,
        buy: cell.buy,
        tx,
        ty,
        delay: dissolveDelay(cell.cx) + rand() * 0.08,
        axis,
        spin: (2 + rand() * 5) * (rand() < 0.5 ? -1 : 1),
        swirl: [rand() - 0.5, rand() - 0.5, rand()] as const,
        arc: 0.5 + rand() * 1.6,
        variant: Math.floor(rand() * 3),
        flip: rand() < 0.45, // bearish: body hangs low
      };
    });
    const material = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 1,
      roughness: 0.26,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      emissive: new THREE.Color(BRAND.gold),
      emissiveIntensity: 0.12,
    });
    const meshes = VARIANTS.map((g, v) => {
      const m = new THREE.InstancedMesh(g, material, items.filter((it) => it.variant === v).length);
      m.frustumCulled = false;
      return m;
    });
    return { items, meshes };
  }, [session]);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();
  const goldC = new THREE.Color("#E7B759");
  const buy = new THREE.Color(BRAND.buy);
  const sell = new THREE.Color(BRAND.sellRed);
  const counts = [0, 0, 0];

  for (const it of data.items) {
    const born = smooth(it.delay, it.delay + 0.07, converge);
    const p = Math.min(1, Math.max(0, (converge - it.delay - 0.04) / 0.52));
    const e = flyEase(p);
    const fl = Math.sin(p * Math.PI);
    pos.set(
      it.sx + (it.tx - it.sx) * e + fl * it.swirl[0] * 1.4,
      it.sy + (it.ty - it.sy) * e + fl * it.swirl[1] * 1.0 + (1 - e) * 0.006 * Math.sin(time * 4 + it.spin),
      0.03 + fl * it.arc,
    );
    q.setFromAxisAngle(it.axis, fl * it.spin);
    if (it.flip) q.multiply(qFlip);
    // melt into the casting as the sweep passes
    const handoff = p >= 1 ? smooth(level - 0.02, level + 0.16, it.ty) : 1;
    const h = (H_START + (H_END - H_START) * e) * born * handoff;
    scl.setScalar(Math.max(h, 0.00001));
    m.compose(pos, q, scl);
    const mesh = data.meshes[it.variant];
    const i = counts[it.variant]++;
    mesh.setMatrixAt(i, m);
    col.copy(it.buy ? buy : sell).lerp(goldC, Math.max(goldAt(gold, it.cx), smooth(0.05, 0.6, e)));
    mesh.setColorAt(i, col);
  }
  for (const mesh of data.meshes) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  return (
    <>
      {data.meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </>
  );
};
