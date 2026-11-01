// Expectancy as a physical object. A tray of 100 slots = 100 trades. A win raises a green
// column by its payoff, a loss sinks a red shaft by its loss. Sorted, the tray seen from
// the side *is* the area chart: width = probability (rows), height = payoff.
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { ease } from "../../lib/gsap";
import { mulberry32 } from "../../lib/rng";
import { clamp01, v } from "./common";
import { depthTwin, energyMaterial, setEnergy, unitColumn } from "./Energy";

export const SLOT = 0.34;
export const GAP = 0.05;
export const PITCH = SLOT + GAP;
export const KH = 0.34; // world units per 1 unit of payoff
export const N = 100;
const SIDE = 10;
export const TRAY_W = SIDE * PITCH;

export type TrayParams = { p: number; win: number; loss: number };

/** Seeded trade order: exactly p*100 wins, shuffled. */
const outcomesFor = (p: number, seed: number) => {
  const wins = Math.round(p * N);
  const arr = Array.from({ length: N }, (_, i) => i < wins);
  const rand = mulberry32(seed);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Slot index -> local (x, z). Rows run front to back so the side view shows rows as width. */
const slotXZ = (slot: number) => {
  const row = Math.floor(slot / SIDE);
  const col = slot % SIDE;
  return { x: (row - (SIDE - 1) / 2) * PITCH, z: (col - (SIDE - 1) / 2) * PITCH };
};

export const trayBlocks = (p: number) => {
  const winRows = Math.round(p * N) / SIDE;
  return {
    // centre x of the green and red blocks once sorted, in tray-local units
    winX: (-SIDE / 2 + winRows / 2) * PITCH,
    lossX: (-SIDE / 2 + winRows + (SIDE - winRows) / 2) * PITCH,
    winWidth: winRows * PITCH,
    lossWidth: (SIDE - winRows) * PITCH,
  };
};

const tmp = new THREE.Object3D();

/**
 * pop: 0..1 how many of the 100 trades have landed (in shuffled order)
 * sort: 0..1 columns glide from arrival slot to their sorted block
 * win/loss: current column heights (animatable - chapter 4 shrinks wins, deepens losses)
 */
export const Tray: React.FC<{
  params: TrayParams;
  win?: number;
  loss?: number;
  pop: number;
  sort: number;
  position: [number, number, number];
  seed: number;
  dim?: number;
  plate?: number;
}> = ({ params, win = params.win, loss = params.loss, pop, sort, position, seed, dim = 0, plate = 1 }) => {
  const frame = useCurrentFrame();
  const { winMesh, lossMesh, winDepth, lossDepth, plan } = useMemo(() => {
    const outcomes = outcomesFor(params.p, seed);
    let w = 0;
    let l = Math.round(params.p * N);
    const plan = outcomes.map((won, i) => ({ won, from: i, to: won ? w++ : l++ }));
    const geo = unitColumn();
    const winMesh = new THREE.InstancedMesh(geo, energyMaterial("#3ff2a4", true), N);
    const lossMesh = new THREE.InstancedMesh(geo, energyMaterial("#ff4d6d", false), N);
    winMesh.frustumCulled = lossMesh.frustumCulled = false;
    return { winMesh, lossMesh, winDepth: depthTwin(winMesh), lossDepth: depthTwin(lossMesh), plan };
  }, [params.p, seed]);

  let wi = 0;
  let li = 0;
  plan.forEach((t, i) => {
    const landed = clamp01((pop * N - i) / 3); // each column takes ~3 trade-slots to spring up
    const grow = ease("elastic.out(1, 0.55)")(landed);
    const k = ease("power3.inOut")(clamp01(sort * 1.5 - (t.to / N) * 0.5));
    const a = slotXZ(t.from);
    const b = slotXZ(t.to);
    const x = a.x + (b.x - a.x) * k;
    const z = a.z + (b.z - a.z) * k;
    const h = (t.won ? win : loss) * KH * grow;
    tmp.position.set(x, t.won ? 0 : -h, z);
    // not-yet-landed trades must not draw at all (a zero-height box still shows its top face)
    if (landed <= 0) tmp.scale.set(0, 0, 0);
    else tmp.scale.set(SLOT, Math.max(0.0001, h), SLOT);
    tmp.updateMatrix();
    if (t.won) winMesh.setMatrixAt(wi++, tmp.matrix);
    else lossMesh.setMatrixAt(li++, tmp.matrix);
  });
  winMesh.count = winDepth.count = wi;
  lossMesh.count = lossDepth.count = li;
  winMesh.instanceMatrix.needsUpdate = lossMesh.instanceMatrix.needsUpdate = true;
  for (const m of [winMesh, lossMesh]) setEnergy(m.material as THREE.Material, 1 - dim * 0.75, frame / 30);

  return (
    <group position={position}>
      <primitive object={winDepth} />
      <primitive object={lossDepth} />
      <primitive object={winMesh} />
      <primitive object={lossMesh} />
      <Plate opacity={plate * (1 - dim * 0.6)} />
    </group>
  );
};

/** The y = 0 glass plate the columns stand on / hang from. */
const Plate: React.FC<{ opacity: number }> = ({ opacity }) => {
  const { fill, edge, fillMat, edgeMat } = useMemo(() => {
    const s = TRAY_W + 0.3;
    const fill = new THREE.PlaneGeometry(s, s);
    fill.rotateX(-Math.PI / 2);
    const edge = new THREE.EdgesGeometry(new THREE.BoxGeometry(s, 0.02, s));
    return {
      fill,
      edge,
      fillMat: new THREE.MeshBasicMaterial({ color: "#8fb4ff", transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }),
      edgeMat: new THREE.LineBasicMaterial({ color: "#9fc2ff", transparent: true, opacity: 0.5 }),
    };
  }, []);
  fillMat.opacity = 0.08 * opacity;
  edgeMat.opacity = 0.5 * opacity;
  return (
    <>
      <mesh geometry={fill} material={fillMat} />
      <lineSegments geometry={edge} material={edgeMat} />
    </>
  );
};

/** World-space anchors for labels around a sorted tray. */
export const trayAnchors = (params: TrayParams, position: [number, number, number], win = params.win, loss = params.loss) => {
  const [px, py, pz] = position;
  const b = trayBlocks(params.p);
  const front = pz + TRAY_W / 2 + 0.25;
  return {
    title: v(px, py + Math.max(win * KH, 0.6) + 1.0, pz),
    winTop: v(px + b.winX, py + win * KH + 0.35, front),
    lossBottom: v(px + b.lossX, py - loss * KH - 0.4, front),
    winWidthLine: [v(px - TRAY_W / 2, py - 0.25, front), v(px - TRAY_W / 2 + b.winWidth, py - 0.25, front)] as const,
    winHeightLine: [v(px - TRAY_W / 2 - 0.25, py, front), v(px - TRAY_W / 2 - 0.25, py + win * KH, front)] as const,
    center: v(px, py, pz),
  };
};
