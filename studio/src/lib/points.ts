import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { mulberry32 } from "./rng";

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/**
 * Rasterises any 2D drawing (text, logo, path) and returns `count` points scattered
 * across its filled pixels, in world units centred on the origin. This is how particles
 * "know" the shape of a logo.
 */
export function samplePoints(
  draw: Draw,
  count: number,
  { width = 2048, height = 768, worldWidth = 12, depth = 0.35, seed = 7 } = {},
): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  draw(ctx, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const filled: number[] = [];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 140) filled.push(x, y);
    }
  }
  const rand = mulberry32(seed);
  const out = new Float32Array(count * 3);
  const n = filled.length / 2;
  const k = worldWidth / width;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(rand() * n) * 2;
    out[i * 3] = (filled[j] + rand() * 2 - width / 2) * k;
    out[i * 3 + 1] = -(filled[j + 1] + rand() * 2 - height / 2) * k;
    out[i * 3 + 2] = (rand() - 0.5) * depth;
  }
  return out;
}

/** Samples once the given fonts are ready, holding the render until then. */
export function useSampledPoints(
  key: string,
  fonts: string[],
  draw: Draw,
  count: number,
  opts?: Parameters<typeof samplePoints>[2],
) {
  const [points, setPoints] = useState<Float32Array | null>(null);
  const [handle] = useState(() => delayRender(`Sampling particle targets: ${key}`));
  useEffect(() => {
    Promise.all(fonts.map((f) => document.fonts.load(f)))
      .then(() => document.fonts.ready)
      .then(() => {
        setPoints(samplePoints(draw, count, opts));
        continueRender(handle);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return points;
}
