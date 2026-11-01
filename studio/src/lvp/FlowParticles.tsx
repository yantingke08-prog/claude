import { useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "../lib/rng";
import { SIMPLEX_3D, SOFT_POINT_FRAG } from "../lib/glsl";
import { BRAND } from "./brand";
import { MARKET } from "./market";
import { SYMBOL, sampleSymbol, symbolToWorld } from "./logo";

const vertex = /* glsl */ `
uniform float uProgress;
uniform float uTime;
uniform float uHeadX;
uniform float uSee;
uniform float uLevel;
uniform float uSize;
uniform float uOpacity;
uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec3 uLine;
uniform vec3 uGold;
attribute vec3 aStart;
attribute vec4 aRand;
attribute vec3 aInfo; // group (0 liquidity, 1 price line), liquidity, distance to price
varying vec3 vColor;
varying float vAlpha;
${SIMPLEX_3D}
float easeInOutCubic(float t){ return t < 0.5 ? 4.0*t*t*t : 1.0 - pow(-2.0*t + 2.0, 3.0) / 2.0; }

void main(){
  float isLine = aInfo.x;
  float L = aInfo.y;

  // Convergence: price-line particles leave first, deep liquidity last.
  float delay = mix(aRand.x * 0.4 + 0.08, aRand.x * 0.25, isLine);
  float p = clamp((uProgress - delay) / 0.55, 0.0, 1.0);
  float e = easeInOutCubic(p);
  vec3 pos = mix(aStart, position, e);
  float flight = sin(p * 3.14159);
  vec3 q = aStart * 0.32 + vec3(0.0, 0.0, uTime * 0.3);
  pos += flight * vec3(snoise(q), snoise(q + 17.3), snoise(q + 41.7)) * (0.45 + aRand.y * 0.8);
  pos.z += flight * (0.4 + aRand.z * 1.8);

  // Before convergence you only "see" what the price has revealed:
  // the line up to its head, and liquidity spreading out from the line.
  float history = smoothstep(uHeadX + 0.35, uHeadX - 0.15, aStart.x);
  float seen = isLine > 0.5 ? step(aStart.x, uHeadX) : history * smoothstep(uSee, uSee - 0.8, aInfo.z);
  float vis = max(seen, smoothstep(0.0, 0.35, p));

  // Hand-off: once arrived, particles dissolve into the metal as the sweep passes them.
  float handoff = mix(1.0, smoothstep(uLevel - 0.03, uLevel + 0.22, position.y), step(0.999, p));

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = isLine > 0.5 ? 1.5 : 0.4 + L * 0.9;
  gl_PointSize = uSize * size * (1.0 + flight * 0.2) * mix(1.0, 0.6, e) * (34.0 / max(-mv.z, 0.5));

  vec3 heat = L < 0.5 ? mix(uLow, uMid, L * 2.0) : mix(uMid, uHigh, (L - 0.5) * 2.0);
  vec3 c = isLine > 0.5 ? uLine : heat;
  vColor = mix(c, uGold, smoothstep(0.2, 1.0, e));
  float a = isLine > 0.5 ? 0.95 : 0.1 + L * 0.5;
  vAlpha = uOpacity * vis * handoff * mix(a, 0.75, e) * (1.0 - flight * 0.3);
}
`;

const DOT_SHARE = SYMBOL.dots.length;

/**
 * Every particle on screen in V1: resting liquidity (the heatmap) and the traced price line.
 * Each one already knows where it lives in the mark: liquidity fills the body and becomes the
 * dot mesh, the price line becomes the contour.
 */
export const FlowParticles: React.FC<{
  progress: number;
  time: number;
  headX: number;
  see: number;
  level: number;
  size?: number;
  opacity?: number;
}> = ({ progress, time, headX, see, level, size = 1.15, opacity = 1 }) => {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(77);
    const starts: number[] = [];
    const info: number[] = [];

    // Liquidity cells, kept where something actually rests.
    // Dense along x, sparse along y: rows of points read as the horizontal streaks of a heatmap.
    for (let y = -3.1; y <= 3.1; y += 0.04) {
      for (let x = MARKET.X0; x <= MARKET.X1; x += 0.026) {
        const L = MARKET.liquidity(x, y);
        if (L < 0.12 || rand() > 0.25 + L) continue;
        starts.push(x + (rand() - 0.5) * 0.01, y + (rand() - 0.5) * 0.006, -0.05 - rand() * 0.05);
        info.push(0, L, Math.abs(y - MARKET.priceAt(x)));
      }
    }
    const heatCount = info.length / 3;
    // The price line, densely.
    const lineCount = 2600;
    for (let i = 0; i < lineCount; i++) {
      const x = MARKET.X0 + ((MARKET.X1 - MARKET.X0) * i) / (lineCount - 1);
      starts.push(x, MARKET.priceAt(x) + (rand() - 0.5) * 0.012, 0.02);
      info.push(1, 1, 0);
    }
    const count = heatCount + lineCount;

    // Targets: the first DOT_SHARE liquidity cells become the dot mesh exactly; the rest
    // of the liquidity fills the body; the price line traces the outline.
    const fill = sampleSymbol(heatCount, "fill", 9);
    const edge = sampleSymbol(lineCount, "edge", 4);
    const targets = new Float32Array(count * 3);
    // pick dot cells spread through the heatmap so the mesh doesn't fly in from one corner
    const stride = Math.max(1, Math.floor(heatCount / DOT_SHARE));
    for (let i = 0; i < count; i++) {
      let sx: number, sy: number;
      if (i < heatCount) {
        const dotIdx = i % stride === 0 ? i / stride : -1;
        if (dotIdx >= 0 && dotIdx < DOT_SHARE) [sx, sy] = SYMBOL.dots[dotIdx];
        else [sx, sy] = [fill[i * 2], fill[i * 2 + 1]];
      } else {
        const j = i - heatCount;
        [sx, sy] = [edge[j * 2], edge[j * 2 + 1]];
      }
      const [wx, wy] = symbolToWorld(sx, sy);
      targets.set([wx, wy, 0.01], i * 3);
    }

    const r4 = new Float32Array(count * 4);
    for (let i = 0; i < r4.length; i++) r4[i] = rand();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(targets, 3));
    geometry.setAttribute("aStart", new THREE.BufferAttribute(new Float32Array(starts), 3));
    geometry.setAttribute("aInfo", new THREE.BufferAttribute(new Float32Array(info), 3));
    geometry.setAttribute("aRand", new THREE.BufferAttribute(r4, 4));
    const c = (hex: string, k = 1) => new THREE.Color(hex).multiplyScalar(k);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: SOFT_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uHeadX: { value: 0 },
        uSee: { value: 0 },
        uLevel: { value: -10 },
        uSize: { value: size },
        uOpacity: { value: opacity },
        uLow: { value: c("#123a9c", 0.8) },
        uMid: { value: c(BRAND.sell, 0.75) },
        uHigh: { value: c(BRAND.softGold, 1.0) },
        uLine: { value: c("#FFF1CF", 1.4) },
        uGold: { value: c(BRAND.softGold, 1.0) },
      },
    });
    return { geometry, material };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const u = material.uniforms;
  u.uProgress.value = progress;
  u.uTime.value = time;
  u.uHeadX.value = headX;
  u.uSee.value = see;
  u.uLevel.value = level;
  u.uSize.value = size;
  u.uOpacity.value = opacity;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};
