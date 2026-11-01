import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { BRAND } from "./brand";
import { SYMBOL, SYMBOL_WORLD_SCALE, SYMBOL_WORLD_Y, symbolToWorld } from "./logo";

/**
 * Product-shot environment: a black room with a few soft-box strips. Gold reflects mostly
 * darkness with crisp bright bands, which reads as polished metal instead of grey plastic.
 */
export const GoldEnvironment: React.FC<{ rotation?: number; intensity?: number }> = ({ rotation = 0, intensity = 1 }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const env = useMemo(() => {
    const room = new THREE.Scene();
    room.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: "#050505", side: THREE.BackSide })));
    const box = (w: number, h: number, pos: [number, number, number], color: string, power: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      room.add(m);
    };
    box(30, 14, [0, 3, 19], "#ffefd2", 1.5); // big key behind the lens: the flat front face mirrors it
    box(26, 3, [0, 14, 6], "#fff6e4", 3.2); // top strip: the long highlight across the horns
    box(4, 18, [-16, 2, 8], "#ffe2a8", 2.0); // warm side soft-box
    box(3, 14, [15, -3, 6], "#cfe0ff", 1.3); // cool rim from the other side
    box(18, 2.2, [0, -12, 10], "#ffd38a", 1.1); // low fill under the chin
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(room, 0.03).texture;
    pm.dispose();
    return tex;
  }, [gl]);
  scene.environment = env;
  scene.environmentRotation.set(0, rotation, 0);
  scene.environmentIntensity = intensity;
  gl.localClippingEnabled = true;
  return null;
};

const PAD = 40; // SVG units of empty margin around the mark on the relief plane

/**
 * The mark as a relief: the exact SVG silhouette as an alpha map, plus a normal map from its
 * blurred edges so every contour catches light like a rounded bevel. (Extruding the outline
 * fails here: its overlapping channel sub-paths break triangulation.)
 */
const buildRelief = (res = 2048) => {
  const [x, y, w, h] = SYMBOL.box;
  const span = Math.max(w, h) + PAD * 2;
  const ox = x + w / 2 - span / 2;
  const oy = y + h / 2 - span / 2;
  const k = res / span;
  const canvas = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = res;
    c.height = res;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    draw(ctx);
    return c;
  };
  const mask = canvas((ctx) => {
    ctx.setTransform(k, 0, 0, k, -ox * k, -oy * k);
    ctx.fillStyle = "#fff";
    for (const d of SYMBOL.outline) ctx.fill(new Path2D(d));
  });
  const alpha = (c: HTMLCanvasElement) => {
    const rgba = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, res, res).data;
    const out = new Float32Array(res * res);
    for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4 + 3] / 255;
    return out;
  };
  const blurred = (px: number) =>
    alpha(
      canvas((ctx) => {
        ctx.filter = `blur(${px}px)`;
        ctx.drawImage(mask, 0, 0);
      }),
    );
  const m = alpha(mask);
  const fine = blurred(res * 0.0035);
  const broad = blurred(res * 0.011);
  // 0 on the contour, 1 a little way in: a rounded shoulder with a flat top
  const shoulder = (v: number) => Math.min(1, Math.max(0, (v - 0.5) * 2));
  const height = new Float32Array(res * res);
  for (let i = 0; i < height.length; i++) height[i] = m[i] * (0.65 * shoulder(fine[i]) + 0.35 * shoulder(broad[i]));

  // Canvas rows run down, texture rows run up: write rows flipped.
  const normal = new Uint8Array(res * res * 4);
  const alphaTex = new Uint8Array(res * res * 4);
  const S = 26;
  for (let r = 1; r < res - 1; r++) {
    for (let c = 1; c < res - 1; c++) {
      const i = r * res + c;
      const dx = height[i + 1] - height[i - 1];
      const dy = height[i + res] - height[i - res];
      let nx = -dx * S;
      let ny = dy * S;
      const len = Math.hypot(nx, ny, 1);
      nx /= len;
      ny /= len;
      const o = ((res - 1 - r) * res + c) * 4;
      normal[o] = (nx * 0.5 + 0.5) * 255;
      normal[o + 1] = (ny * 0.5 + 0.5) * 255;
      normal[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      normal[o + 3] = 255;
      const a = m[i] * 255;
      alphaTex[o] = a;
      alphaTex[o + 1] = a;
      alphaTex[o + 2] = a;
      alphaTex[o + 3] = 255;
    }
  }
  const tex = (data: Uint8Array, srgb: boolean) => {
    const t = new THREE.DataTexture(data, res, res, THREE.RGBAFormat);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  };
  return { normalMap: tex(normal, false), alphaMap: tex(alphaTex, false), worldSize: span * SYMBOL_WORLD_SCALE };
};

/** World-space pose of bead `i` on the symbol: where trade bubbles must land. */
export const beadWorld = (i: number) => {
  const [x, y, r] = SYMBOL.beads[i];
  const [wx, wy] = symbolToWorld(x, y);
  return { x: wx, y: wy, z: 0, r: r * 0.94 * SYMBOL_WORLD_SCALE };
};

/** World y of the symbol's lowest and highest points, for sweeps. */
export const SYMBOL_WORLD_SPAN = (() => {
  const [, y, , h] = SYMBOL.box;
  return { bottom: symbolToWorld(0, y + h)[1], top: symbolToWorld(0, y)[1] };
})();

/** World y of the reveal sweep's front for a given `reveal` (shared with particles that hand off to it). */
export const revealLevel = (reveal: number) =>
  SYMBOL_WORLD_SPAN.bottom + (SYMBOL_WORLD_SPAN.top - SYMBOL_WORLD_SPAN.bottom + 0.3) * reveal - 0.05;

export const goldMaterial = (roughness: number) =>
  new THREE.MeshPhysicalMaterial({
    color: "#E7B759",
    metalness: 1,
    roughness,
    clearcoat: 0.5,
    clearcoatRoughness: 0.12,
    emissive: new THREE.Color(BRAND.gold),
    emissiveIntensity: 0,
  });

/**
 * The gold mark on the end-card plane (front face at z = 0).
 * `reveal` 0→1 sweeps it into existence from the candle tip upward behind a light bar;
 * `heat` makes the metal glow like a fresh casting.
 */
export const GoldSymbol: React.FC<{
  reveal?: number;
  heat?: number;
  beads?: boolean;
  dots?: number;
  rotY?: number;
  rotX?: number;
}> = ({ reveal = 1, heat = 0, beads = true, dots = 1, rotY = 0, rotX = 0 }) => {
  const parts = useMemo(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const relief = buildRelief();
    const body = goldMaterial(0.2);
    body.normalMap = relief.normalMap;
    body.alphaMap = relief.alphaMap;
    body.alphaTest = 0.5;
    body.clippingPlanes = [plane];
    const bead = goldMaterial(0.1);
    bead.clippingPlanes = [plane];
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(SYMBOL.dots.flatMap(([x, y]) => [...symbolToWorld(x, y), 0.004])), 3),
    );
    const dotMat = new THREE.PointsMaterial({ color: new THREE.Color(BRAND.softGold).multiplyScalar(0.8), size: 1.7, sizeAttenuation: false, transparent: true, clippingPlanes: [plane] });
    const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.softGold).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    return { plane, body, bead, size: relief.worldSize, sphere: new THREE.SphereGeometry(1, 40, 24), dotGeo, dotMat, barMat };
  }, []);

  const level = revealLevel(reveal);
  parts.plane.constant = level;
  parts.body.emissiveIntensity = heat * 0.9;
  parts.bead.emissiveIntensity = heat * 0.9;
  parts.dotMat.opacity = dots;
  const sweeping = reveal > 0 && reveal < 1;
  parts.barMat.opacity = sweeping ? Math.sin(reveal * Math.PI) : 0;

  return (
    <group>
      <group position={[0, SYMBOL_WORLD_Y, 0]} rotation={[rotX, rotY, 0]}>
        <group position={[0, -SYMBOL_WORLD_Y, 0]}>
          <mesh position={[0, SYMBOL_WORLD_Y, 0]} material={parts.body}>
            <planeGeometry args={[parts.size, parts.size]} />
          </mesh>
          {beads &&
            SYMBOL.beads.map((_, i) => {
              const b = beadWorld(i);
              return <mesh key={i} geometry={parts.sphere} material={parts.bead} position={[b.x, b.y, 0]} scale={[b.r, b.r, b.r * 0.6]} />;
            })}
          {dots > 0 && <points geometry={parts.dotGeo} material={parts.dotMat} />}
        </group>
      </group>
      {sweeping && (
        <mesh position={[0, level, 0.3]} material={parts.barMat}>
          <planeGeometry args={[4.2, 0.035]} />
        </mesh>
      )}
    </group>
  );
};
