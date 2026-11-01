import data from "./logo.json";
import { mulberry32 } from "../lib/rng";
import { LAYOUT, PX_PER_UNIT, pxToWorld } from "./brand";

/** Geometry extracted from the brand SVGs by scripts/lvp-logo-geometry.py (SVG units, y down). */
export const SYMBOL = data.symbol as {
  box: [number, number, number, number];
  outline: string[];
  dots: [number, number, number][];
  beads: [number, number, number][];
};
export const WORDMARK = data.wordmark as { box: [number, number, number, number]; paths: string[] };

const [bx, by, bw, bh] = SYMBOL.box;
export const SYMBOL_CENTER = { x: bx + bw / 2, y: by + bh / 2 };

/** SVG units → px on the end card. */
export const SYMBOL_PX_SCALE = LAYOUT.symbol.h / bh;
/** SVG units → world units at the final camera. */
export const SYMBOL_WORLD_SCALE = SYMBOL_PX_SCALE / PX_PER_UNIT;
const [, cyWorld] = pxToWorld(LAYOUT.symbol.cx, LAYOUT.symbol.cy);
export const SYMBOL_WORLD_Y = cyWorld;

/** SVG point → world point on the end-card plane (z = 0). */
export const symbolToWorld = (x: number, y: number): [number, number] => [
  (x - SYMBOL_CENTER.x) * SYMBOL_WORLD_SCALE,
  -(y - SYMBOL_CENTER.y) * SYMBOL_WORLD_SCALE + SYMBOL_WORLD_Y,
];

const outlinePaths = () => SYMBOL.outline.map((d) => new Path2D(d));

/** Rasterised symbol silhouette (without the dot mesh), `res` px on its long side. */
export function symbolMask(res = 1000) {
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.scale(res / 1000, res / 1000);
  ctx.fillStyle = "#fff";
  for (const p of outlinePaths()) ctx.fill(p);
  const rgba = ctx.getImageData(0, 0, res, res).data;
  const mask = new Uint8Array(res * res);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4 + 3] > 127 ? 1 : 0;
  /** Is the SVG-unit point inside the symbol? */
  const inside = (x: number, y: number) => {
    const px = Math.floor((x * res) / 1000);
    const py = Math.floor((y * res) / 1000);
    return px >= 0 && py >= 0 && px < res && py < res && mask[py * res + px] === 1;
  };
  return { mask, res, inside };
}

/**
 * Random points on the symbol in SVG units: `fill` covers the body, `edge` hugs its outline
 * (stroke of the outline paths), so a line of particles can trace the silhouette.
 */
export function sampleSymbol(count: number, mode: "fill" | "edge", seed = 5): Float32Array {
  const res = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  for (const p of outlinePaths()) (mode === "fill" ? ctx.fill(p) : ctx.stroke(p));
  const rgba = ctx.getImageData(0, 0, res, res).data;
  const hits: number[] = [];
  for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) if (rgba[(y * res + x) * 4 + 3] > 140) hits.push(x, y);
  const rand = mulberry32(seed);
  const out = new Float32Array(count * 2);
  const n = hits.length / 2;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(rand() * n) * 2;
    out[i * 2] = hits[j] + rand();
    out[i * 2 + 1] = hits[j + 1] + rand();
  }
  return out;
}
