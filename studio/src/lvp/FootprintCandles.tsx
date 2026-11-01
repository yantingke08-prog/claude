import { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender } from "remotion";
import * as THREE from "three";
import { UI } from "../lib/fonts";
import { BRAND } from "./brand";
import { FP, type FpCandle, type FpSession, priceRowAt, rowY } from "./footprint";

// ---------------------------------------------------------------------------------------------
// Glyph atlas: the few characters a footprint needs, drawn once into a mipmapped texture so
// defocus can be faked with a mip bias.
// ---------------------------------------------------------------------------------------------
const CHARS = "0123456789.K-+DeltaoT";
const CELL_W = 64;
const CELL_H = 88;
const COLS = 8;
export const glyphIndex = (ch: string) => CHARS.indexOf(ch);

const buildAtlas = () => {
  const rows = Math.ceil(CHARS.length / COLS);
  const c = document.createElement("canvas");
  c.width = CELL_W * COLS;
  c.height = CELL_H * rows;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 50px ${UI.fontFamily}`;
  [...CHARS].forEach((ch, i) => ctx.fillText(ch, (i % COLS) * CELL_W + CELL_W / 2, Math.floor(i / COLS) * CELL_H + CELL_H / 2 + 2));
  const tex = new THREE.CanvasTexture(c);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 8;
  tex.flipY = true;
  return { tex, cols: COLS, rows };
};

/** The glyph atlas, built once the UI font has loaded (holds the render until then). */
export const useGlyphAtlas = () => {
  const [atlas, setAtlas] = useState<ReturnType<typeof buildAtlas> | null>(null);
  useEffect(() => {
    const handle = delayRender("Footprint glyph atlas");
    UI.waitUntilDone()
      .then(() => document.fonts.load(`700 50px ${UI.fontFamily}`))
      .then(() => setAtlas(buildAtlas()))
      .finally(() => continueRender(handle));
  }, []);
  return atlas;
};

// ---------------------------------------------------------------------------------------------
// Shaders. Both fake depth of field: anything off the focus distance gets softer edges.
// ---------------------------------------------------------------------------------------------
const DOF = /* glsl */ `
uniform float uFocus;
uniform float uDof;
float defocus(float viewZ){ return clamp(abs(-viewZ - uFocus) * uDof, 0.0, 0.09); }
`;

const rectVertex = /* glsl */ `
attribute vec4 aRect;   // centre x, y, width, height
attribute vec4 aColor;  // linear rgb, alpha
attribute vec4 aStyle;  // z, corner radius, glow, gloss
varying vec2 vLocal;
varying vec2 vHalf;
varying vec4 vColor;
varying vec4 vStyle;
varying float vSoft;
${DOF}
void main(){
  vec4 c = modelViewMatrix * vec4(aRect.xy, aStyle.x, 1.0);
  float blur = defocus(c.z);
  vec2 hs = aRect.zw * 0.5;
  float pad = blur * 1.5 + 0.004 + aStyle.z * 0.03;
  vec2 p = position.xy * 2.0 * (hs + pad);
  vLocal = p;
  vHalf = hs;
  vColor = aColor;
  vStyle = aStyle;
  vSoft = 0.0012 * max(-c.z, 0.5) / 4.0 + blur;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(aRect.xy + p, aStyle.x, 1.0);
}
`;

const rectFragment = /* glsl */ `
varying vec2 vLocal;
varying vec2 vHalf;
varying vec4 vColor;
varying vec4 vStyle;
varying float vSoft;
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  float r = min(vStyle.y, min(vHalf.x, vHalf.y));
  float d = sdRound(vLocal, vHalf, r);
  float a = 1.0 - smoothstep(-vSoft, vSoft, d);
  // acrylic: lit from above, a bright lip along the top edge, darker toward the base
  float ty = clamp(vLocal.y / max(vHalf.y, 1e-4), -1.0, 1.0);
  vec3 c = vColor.rgb * (0.78 + 0.32 * ty * vStyle.w + 0.1 * (1.0 - vStyle.w));
  float lip = smoothstep(-0.012 - vSoft, 0.0, d) * smoothstep(0.2, 1.0, ty);
  c += mix(vColor.rgb, vec3(1.0), 0.4) * lip * 0.55 * vStyle.w;
  float halo = vStyle.z * exp(-max(d, 0.0) * 55.0) * 0.5;
  float alpha = a * vColor.a;
  gl_FragColor = vec4(c * alpha + vColor.rgb * halo, alpha);
  #include <colorspace_fragment>
}
`;

const glyphVertex = /* glsl */ `
attribute vec4 aPos;    // x, y, z, glyph index
attribute vec4 aColor;
attribute float aSize;  // cap height in world units
uniform vec2 uGrid;
varying vec2 vUv;
varying vec4 vColor;
varying float vBias;
varying vec2 vSpread;
${DOF}
void main(){
  vec4 c = modelViewMatrix * vec4(aPos.xyz, 1.0);
  float blur = defocus(c.z);
  vec2 size = vec2(${(CELL_W / CELL_H).toFixed(4)}, 1.0) * aSize * 2.5;
  vec3 p = aPos.xyz + vec3(position.xy * size, 0.0);
  float col = mod(aPos.w, uGrid.x);
  float row = floor(aPos.w / uGrid.x);
  vUv = vec2((col + position.x + 0.5) / uGrid.x, 1.0 - (row + 0.5 - position.y) / uGrid.y);
  vColor = aColor;
  vBias = min(blur * 30.0, 2.0);
  vSpread = vec2(blur / (size.x * uGrid.x), blur / (size.y * uGrid.y)) * 0.6;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const glyphFragment = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec4 vColor;
varying float vBias;
varying vec2 vSpread;
void main(){
  // a small disc of taps for defocus; the mip bias smooths what's between them
  float a = texture2D(uAtlas, vUv, vBias).a * 0.12;
  for (int i = 0; i < 6; i++) {
    float ang = float(i) * 1.047198;
    a += texture2D(uAtlas, vUv + vec2(cos(ang), sin(ang)) * vSpread * 0.5, vBias).a * 0.06;
    a += texture2D(uAtlas, vUv + vec2(cos(ang + 0.52), sin(ang + 0.52)) * vSpread, vBias).a * 0.0866;
  }
  a *= vColor.a;
  gl_FragColor = vec4(vColor.rgb * a, a);
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------------------------------------
// Instanced quads, refilled every frame on the CPU (a few thousand at most).
// ---------------------------------------------------------------------------------------------
type Batch = { geo: THREE.InstancedBufferGeometry; attrs: Record<string, THREE.InstancedBufferAttribute>; n: number };

const makeBatch = (cap: number, layout: Record<string, number>): Batch => {
  const plane = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = plane.index;
  geo.setAttribute("position", plane.getAttribute("position"));
  const attrs: Record<string, THREE.InstancedBufferAttribute> = {};
  for (const [name, size] of Object.entries(layout)) {
    attrs[name] = new THREE.InstancedBufferAttribute(new Float32Array(cap * size), size);
    attrs[name].setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute(name, attrs[name]);
  }
  return { geo, attrs, n: 0 };
};

const flush = (b: Batch) => {
  b.geo.instanceCount = b.n;
  for (const a of Object.values(b.attrs)) a.needsUpdate = true;
};

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const fmtK = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toFixed(2)}K` : `${Math.round(a)}`;
  return v < 0 ? `-${s}` : s;
};

const C = {
  buy: new THREE.Color(BRAND.buy),
  sell: new THREE.Color(BRAND.sellRed),
  lime: new THREE.Color("#B4F55A"),
  pink: new THREE.Color("#FF4FA8"),
  gold: new THREE.Color(BRAND.gold),
  soft: new THREE.Color(BRAND.softGold),
  ink: new THREE.Color("#F2F4F7"),
  label: new THREE.Color("#8C93A3"),
  plate: new THREE.Color("#0A0E16"),
  poc: new THREE.Color("#FFFFFF"),
};

/** Per-candle stage of the hand-off to the mini candles: 0 still a footprint, 1 gone. */
export const dissolveDelay = (x: number) => ((x + 7.2) / 14) * 0.34;

export type FootprintFrame = {
  headX: number;
  /** 0→1: red / green sweep into gold, oldest candles first */
  gold: number;
  /** convergence progress shared with the mini candles */
  converge: number;
  z: number;
  dim: number;
  focus: number;
  dof: number;
};

/** How far candle `x` has turned gold for a given global `gold`. */
export const goldAt = (gold: number, x: number) => smooth(0, 1, gold * 1.7 - ((x + 7.2) / 14) * 0.7);

/**
 * One footprint session: each candle a body and wick in the middle, sellers' volume printed on
 * the left with red bars growing outward, buyers' on the right in green, imbalances lit and
 * marked, the POC row highlighted and a Delta / Total plate under every finished candle.
 * Candles print as the head passes, their numbers counting up as price trades each row.
 */
export const FootprintSession: React.FC<{ session: FpSession; frame: FootprintFrame; atlas: ReturnType<typeof buildAtlas>; order: number }> = ({
  session,
  frame,
  atlas,
  order,
}) => {
  const parts = useMemo(() => {
    const rowsTotal = session.candles.reduce((s, c) => s + c.rows.length, 0);
    const rects = makeBatch(session.candles.length * 6 + rowsTotal * 6, { aRect: 4, aColor: 4, aStyle: 4 });
    const glyphs = makeBatch(session.candles.length * 26 + rowsTotal * 8, { aPos: 4, aColor: 4, aSize: 1 });
    const dof = { uFocus: { value: 5 }, uDof: { value: 0.03 } };
    const common = { transparent: true, depthWrite: false, premultipliedAlpha: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
    const rectMat = new THREE.ShaderMaterial({ vertexShader: rectVertex, fragmentShader: rectFragment, uniforms: dof, ...common });
    const glyphMat = new THREE.ShaderMaterial({
      vertexShader: glyphVertex,
      fragmentShader: glyphFragment,
      uniforms: { ...dof, uAtlas: { value: atlas.tex }, uGrid: { value: new THREE.Vector2(atlas.cols, atlas.rows) } },
      ...common,
    });
    const rectMesh = new THREE.Mesh(rects.geo, rectMat);
    const glyphMesh = new THREE.Mesh(glyphs.geo, glyphMat);
    rectMesh.frustumCulled = glyphMesh.frustumCulled = false;
    rectMesh.renderOrder = order * 2;
    glyphMesh.renderOrder = order * 2 + 1;
    return { rects, glyphs, rectMesh, glyphMesh, dof };
  }, [session, atlas, order]);

  const { rects, glyphs } = parts;
  rects.n = 0;
  glyphs.n = 0;
  parts.dof.uFocus.value = frame.focus;
  parts.dof.uDof.value = frame.dof;
  const tmp = new THREE.Color();

  const rect = (x: number, y: number, w: number, h: number, z: number, col: THREE.Color, a: number, radius = 0.006, glow = 0, gloss = 1) => {
    if (a <= 0.003 || w <= 0 || h <= 0) return;
    const i = rects.n++;
    rects.attrs.aRect.setXYZW(i, x, y, w, h);
    rects.attrs.aColor.setXYZW(i, col.r, col.g, col.b, Math.min(1, a));
    rects.attrs.aStyle.setXYZW(i, z, radius, glow, gloss);
  };
  /** Text from `x`: align 1 right-aligns to x, 0 left-aligns from it. */
  const text = (s: string, x: number, y: number, z: number, h: number, col: THREE.Color, a: number, align: 0 | 1) => {
    if (a <= 0.003) return;
    const adv = FP.ADV * (h / FP.GLYPH_H);
    const narrow = (ch: string) => (ch === "." ? 0.45 : ch === "l" ? 0.5 : ch === "-" ? 0.7 : 1);
    const width = [...s].reduce((w, ch) => w + adv * narrow(ch), 0);
    let cx = align ? x - width : x;
    for (const ch of s) {
      const w = adv * narrow(ch);
      const gi = glyphIndex(ch);
      if (gi >= 0) {
        const i = glyphs.n++;
        glyphs.attrs.aPos.setXYZW(i, cx + w / 2, y, z, gi);
        glyphs.attrs.aColor.setXYZW(i, col.r, col.g, col.b, Math.min(1, a));
        glyphs.attrs.aSize.setX(i, h);
      }
      cx += w;
    }
  };

  const { headX, z, dim } = frame;
  const side = (base: THREE.Color, g: number, k = 1) => tmp.copy(base).lerp(C.gold, g).multiplyScalar(k * dim);

  session.candles.forEach((c: FpCandle) => {
    const cp = Math.min(1, Math.max(0, (headX - c.xl) / (c.xr - c.xl)));
    if (cp <= 0) return;
    const g = goldAt(frame.gold, c.x);
    const delay = dissolveDelay(c.x);
    const alive = 1 - smooth(delay, delay + 0.1, frame.converge);
    if (alive <= 0) return;
    const born = smooth(0, 0.08, cp) * alive;
    const now = priceRowAt(c, cp);
    const seen = c.rows.filter((r) => r.t <= cp);
    const lo = Math.min(now, ...seen.map((r) => r.r));
    const hi = Math.max(now, ...seen.map((r) => r.r));
    const up = now >= c.open;
    const inner = FP.BODY_W / 2 + FP.GAP;

    // POC band behind the whole row
    const pocRow = c.rows.find((r) => r.r === c.poc);
    if (pocRow && pocRow.t <= cp) {
      const k = smooth(pocRow.t, pocRow.t + 0.2, cp);
      const span = Math.max(pocRow.bid, pocRow.ask) / session.maxVol;
      rect(c.x, rowY(session, c.poc), (inner + FP.BAR_MAX * span) * 2 + 0.05, FP.RH * 0.98, z - 0.012, side(C.buy, 0.5 + g * 0.5, 0.3), 0.45 * k * born, 0.004, 0, 0);
    }
    // wick and body
    const wickCol = side(up ? C.buy : C.sell, g, 0.75);
    rect(c.x, rowY(session, (lo + hi) / 2), 0.009, (hi - lo) * FP.RH + FP.RH * 0.7, z - 0.004, wickCol, 0.9 * born, 0.004, 0, 0);
    const b0 = Math.min(c.open, now);
    const b1 = Math.max(c.open, now);
    rect(c.x, rowY(session, (b0 + b1) / 2), FP.BODY_W, (b1 - b0) * FP.RH + FP.RH * 0.86, z, side(up ? C.buy : C.sell, g, 1.05), 0.96 * born, 0.01, 0.25, 1);

    for (const row of c.rows) {
      if (row.t > cp) continue;
      const k = smooth(row.t, row.t + 0.28, cp);
      const y = rowY(session, row.r);
      const isPoc = row.r === c.poc;
      // seller bars grow left, buyer bars right
      const lenB = (row.bid / session.maxVol) * FP.BAR_MAX * k;
      const lenA = (row.ask / session.maxVol) * FP.BAR_MAX * k;
      const nb = row.bid / session.maxVol;
      const na = row.ask / session.maxVol;
      rect(c.x - inner - lenB / 2, y, lenB, FP.RH * 0.84, z, side(C.sell, g, row.imbBid ? 1.05 : 0.62), (row.imbBid ? 0.95 : 0.3 + nb * 0.45) * born, 0.006, row.imbBid ? 0.5 : 0, 1);
      rect(c.x + inner + lenA / 2, y, lenA, FP.RH * 0.84, z, side(C.buy, g, row.imbAsk ? 1.05 : 0.62), (row.imbAsk ? 0.95 : 0.3 + na * 0.45) * born, 0.006, row.imbAsk ? 0.5 : 0, 1);
      // imbalance markers hug the body
      if (row.imbBid) rect(c.x - inner + 0.006, y, 0.009, FP.RH * 0.84, z + 0.004, side(C.pink, g, 1.3), born * k, 0.003, 0.9, 0);
      if (row.imbAsk) rect(c.x + inner - 0.006, y, 0.009, FP.RH * 0.84, z + 0.004, side(C.lime, g, 1.3), born * k, 0.003, 0.9, 0);
      // the numbers, counting up while the row trades
      const ink = (lit: boolean) => tmp.copy(C.ink).lerp(C.soft, g * 0.85).multiplyScalar(dim * (lit ? 1.0 : 0.82));
      const ty = y - FP.GLYPH_H * 0.06;
      text(`${Math.round(row.bid * k)}`, c.x - inner - 0.012, ty, z + 0.01, FP.GLYPH_H, ink(row.imbBid || isPoc), born, 1);
      text(`${Math.round(row.ask * k)}`, c.x + inner + 0.012, ty, z + 0.01, FP.GLYPH_H, ink(row.imbAsk || isPoc), born, 0);
    }

    // Delta / Total plate once the candle has closed
    const pf = smooth(0, 0.35, headX - c.xr) * alive;
    if (pf > 0) {
      const py = rowY(session, c.low) - FP.RH * 0.9 - 0.11 + (1 - pf) * 0.04;
      const pz = z + 0.03;
      rect(c.x, py, 0.6, 0.19, pz - 0.002, tmp.copy(C.plate).lerp(new THREE.Color("#1a1408"), g), 0.88 * pf, 0.022, 0, 0.4);
      const lh = FP.GLYPH_H * 0.82;
      const lab = tmp.copy(C.label).multiplyScalar(dim);
      text("Delta", c.x - 0.25, py + 0.042, pz, lh, lab, pf, 0);
      text("Total", c.x - 0.25, py - 0.042, pz, lh, lab, pf, 0);
      text(fmtK(c.delta), c.x + 0.25, py + 0.042, pz, lh, side(c.delta >= 0 ? C.buy : C.sell, g, 1.25), pf, 1);
      text(fmtK(c.total), c.x + 0.25, py - 0.042, pz, lh, tmp.copy(C.ink).lerp(C.soft, g).multiplyScalar(dim), pf, 1);
    }
  });

  flush(rects);
  flush(glyphs);
  return (
    <>
      <primitive object={parts.rectMesh} />
      <primitive object={parts.glyphMesh} />
    </>
  );
};
