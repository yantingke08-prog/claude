import { geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import * as THREE from "three";
import land110 from "world-atlas/land-110m.json";

export const CITIES: Record<string, [number, number]> = {
  Beijing: [39.9, 116.4],
  Shanghai: [31.23, 121.47],
  Shenzhen: [22.54, 114.06],
  Tokyo: [35.68, 139.69],
  Seoul: [37.57, 126.98],
  Singapore: [1.35, 103.82],
  Mumbai: [19.08, 72.88],
  Dubai: [25.2, 55.27],
  Moscow: [55.76, 37.62],
  London: [51.51, -0.13],
  Paris: [48.86, 2.35],
  "New York": [40.71, -74.0],
  "San Francisco": [37.77, -122.42],
  "Sao Paulo": [-23.55, -46.63],
  Sydney: [-33.87, 151.21],
  "Cape Town": [-33.92, 18.42],
};

/** lon 0 faces +Z (the camera), east is +X, north is +Y. */
export const latLonToVec3 = (lat: number, lon: number, r = 1) => {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r);
};

const landFeature = () => {
  const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
  return feature(topo, topo.objects.land);
};

/**
 * Land mask -> dot globe. Rasterise the coastline polygons once onto an equirectangular
 * canvas, then keep the Fibonacci-sphere points whose pixel is land. O(N) lookups instead
 * of O(N * polygon) point-in-polygon tests.
 */
export const buildLandDots = (samples: number, radius: number) => {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const projection = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  geoPath(projection, ctx)(landFeature());
  ctx.fill();
  const mask = ctx.getImageData(0, 0, W, H).data;

  const pos: number[] = [];
  const lat: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2;
    const theta = golden * i;
    const la = (Math.asin(y) * 180) / Math.PI;
    let lo = ((theta * 180) / Math.PI) % 360;
    if (lo > 180) lo -= 360;
    const px = Math.floor(((lo + 180) / 360) * W) % W;
    const py = Math.min(H - 1, Math.floor(((90 - la) / 180) * H));
    if (mask[(py * W + px) * 4 + 3] > 128) {
      // A tiny deterministic jitter breaks the Fibonacci lattice's moire against the pixel grid.
      const j1 = Math.sin(i * 12.9898) * 43758.5453;
      const j2 = Math.sin(i * 78.233) * 12543.123;
      const v = latLonToVec3(la + (j1 - Math.floor(j1) - 0.5) * 0.45, lo + (j2 - Math.floor(j2) - 0.5) * 0.45, radius);
      pos.push(v.x, v.y, v.z);
      lat.push(la);
    }
  }
  return { positions: new Float32Array(pos), latitudes: new Float32Array(lat) };
};

/** 10-degree graticule as line-segment pairs on the sphere. */
export const buildGraticule = (radius: number) => {
  const lines = geoGraticule10().coordinates;
  const out: number[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = latLonToVec3(line[i][1], line[i][0], radius);
      const b = latLonToVec3(line[i + 1][1], line[i + 1][0], radius);
      out.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  return new Float32Array(out);
};

/** Great-circle arc lifted off the surface; higher lift for longer hops. */
export const arcCurve = (from: [number, number], to: [number, number], radius: number) => {
  const a = latLonToVec3(from[0], from[1], 1);
  const b = latLonToVec3(to[0], to[1], 1);
  const angle = a.angleTo(b);
  const lift = 0.08 + (angle / Math.PI) * 0.42;
  const pts: THREE.Vector3[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // true slerp (constant speed even for near-antipodal hops), lifted with a sine profile
    const s = Math.sin(angle);
    const v = new THREE.Vector3()
      .addScaledVector(a, Math.sin((1 - t) * angle) / s)
      .addScaledVector(b, Math.sin(t * angle) / s);
    v.normalize().multiplyScalar(radius * (1 + Math.sin(Math.PI * t) * lift));
    pts.push(v);
  }
  return new THREE.CatmullRomCurve3(pts);
};
