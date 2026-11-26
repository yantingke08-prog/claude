// Shared geometry: where every cell sits in 3D, and screen projection for HTML tags.
import * as THREE from "three";
import { CH, COLS, CW, HEIGHT, PLANE_W, ROWS, WIDTH, cellX, cellY, clamp, lerp } from "./config.ts";
import type { View, WorldState } from "./timeline.ts";

export const LADDER_LEFT = -1.9; // ladder bars start here before sliding to column 0
export const LADDER_MAX = 3.8; // longest bar
export const SNAP_W = 0.46; // width of the snapshot column before it joins the heatmap

export const cellValue = (s: WorldState, c: number, r: number) => s.market.field[c * ROWS + Math.round(clamp(r, 0, ROWS - 1))];

export const cellHeight = (s: WorldState, v: number) => 0.035 + s.hz * (0.015 + 0.62 * Math.pow(v, 2.6));

/** Ladder (column 0) bar geometry: left edge and length. */
export const ladderBar = (s: WorldState, v: number) => {
  const left = lerp(LADDER_LEFT, -PLANE_W / 2, s.slide);
  const len = lerp((0.22 + v * LADDER_MAX) * s.grow, lerp(SNAP_W, CW * 0.98, s.slide), s.ladder);
  return { left, len };
};

/** Top-centre of a cell (or ladder bar end) in world space. */
export const cellTop = (s: WorldState, c: number, r: number, ladderEnd = false): [number, number, number] => {
  const cc = clamp(c, 0, COLS - 1);
  const ci = Math.round(cc);
  const v = cellValue(s, ci, r);
  const h = cellHeight(s, v);
  if (ci === 0 && (s.ladder < 1 || s.slide < 1)) {
    const { left, len } = ladderBar(s, v);
    const thick = lerp(0.14, h, s.ladder);
    return [ladderEnd ? left + len : left + len / 2, cellY(r), thick];
  }
  return [cellX(cc), cellY(r), h];
};

/** Point on the price line at column c. */
export const pathPoint = (s: WorldState, c: number): [number, number, number] => {
  const ci = Math.round(clamp(c, 0, COLS - 1));
  const r = s.market.path[ci];
  return [cellX(ci), cellY(r), cellHeight(s, cellValue(s, ci, r)) + 0.06];
};

const cam = new THREE.PerspectiveCamera(30, WIDTH / HEIGHT, 0.1, 400);
const tmp = new THREE.Vector3();

export const applyView = (camera: THREE.PerspectiveCamera, v: View) => {
  if (camera.fov !== v.fov || camera.aspect !== WIDTH / HEIGHT) {
    camera.fov = v.fov;
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
  }
  camera.position.set(...v.pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(...v.tgt);
  camera.updateMatrixWorld();
};

/** World → screen pixels (1080×1920). */
export const project = (v: View, p: [number, number, number]): [number, number] => {
  applyView(cam, v);
  tmp.set(...p).project(cam);
  return [((tmp.x + 1) / 2) * WIDTH, ((1 - tmp.y) / 2) * HEIGHT];
};

export const cellSizeX = CW;
export const cellSizeY = CH;
