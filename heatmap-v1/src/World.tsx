import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo } from "react";
import { continueRender, delayRender, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { C, CH, COLS, CW, HEIGHT, PLANE_H, PLANE_W, ROWS, WIDTH, cellX, cellY, clamp, rampInto } from "./config.ts";
import { applyView, cellHeight, ladderBar, pathPoint } from "./geom.ts";
import { camAt, worldAt, type WorldState } from "./timeline.ts";

const N = COLS * ROWS;

/** Lit cell material whose emissive follows each instance's colour, so the ramp reads true head-on
 * while the sides of tall cells still pick up light in the terrain shots. */
const makeCellMaterial = () => {
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.62, metalness: 0.05 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.86;",
    );
  };
  return m;
};

const Cells: React.FC<{ s: WorldState }> = ({ s }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), makeCellMaterial(), N);
    m.frustumCulled = false;
    m.setColorAt(0, new THREE.Color());
    return m;
  }, []);
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  const rgb: [number, number, number] = [0, 0, 0];
  const neutral = [0.8, 0.82, 0.88];
  const nowC = Math.floor(s.reveal);

  for (let c = 0; c < COLS; c++) {
    const wc = clamp(s.reveal - c);
    for (let r = 0; r < ROWS; r++) {
      const i = c * ROWS + r;
      const v = s.market.field[i];
      let h = cellHeight(s, v);
      let x = cellX(c);
      let sx = CW * 0.985;
      rampInto(v, rgb);
      let cr = rgb[0];
      let cg = rgb[1];
      let cb = rgb[2];
      if (c === 0 && (s.ladder < 1 || s.slide < 1)) {
        // the order-book ladder: one snapshot, bars ∝ resting size
        const { left, len } = ladderBar(s, v);
        sx = len;
        x = left + len / 2;
        const k = s.ladder;
        const g = 0.34 + 0.66 * v;
        cr = neutral[0] * g * (1 - k) + cr * k;
        cg = neutral[1] * g * (1 - k) + cg * k;
        cb = neutral[2] * g * (1 - k) + cb * k;
        h = 0.14 * (1 - k) + h * k;
      } else if (wc <= 0) {
        mat.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, mat);
        continue;
      } else if (wc < 1) {
        sx = CW * wc;
        x = cellX(c) - CW / 2 + sx / 2;
      }
      let b = s.dim;
      if ((c === nowC || c === nowC - 1) && s.reveal < COLS) b *= 1.12; // the snapshot being printed
      if (s.focus) {
        const f = s.focus;
        const inside = r >= f.r0 && r <= f.r1 && c >= f.c0 && c <= f.c1;
        if (!inside) b *= 1 - 0.7 * f.k;
      }
      if (s.spot) {
        const keep = s.spot.kind === "hot" ? clamp((v - 0.42) / 0.2) : clamp((0.3 - v) / 0.12);
        const lift = s.spot.kind === "cold" ? 1 + 1.6 * keep * s.spot.k : 1;
        b *= (1 - s.spot.k * 0.82 * (1 - keep)) * lift;
      }
      pos.set(x, cellY(r), h / 2);
      scl.set(Math.max(sx, 1e-5), CH * 0.88, h);
      mat.compose(pos, q, scl);
      mesh.setMatrixAt(i, mat);
      col.setRGB(cr * b, cg * b, cb * b, THREE.SRGBColorSpace);
      mesh.setColorAt(i, col);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** The traded price: a flat ribbon riding on the book, red where it rises, green where it falls. */
const PriceLine: React.FC<{ s: WorldState }> = ({ s }) => {
  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COLS * 6 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(COLS * 6 * 3), 3));
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    return { geo: g, mat: m };
  }, []);
  const n = Math.min(COLS - 1, s.pathReveal - 1);
  const P = geo.getAttribute("position") as THREE.BufferAttribute;
  const Cc = geo.getAttribute("color") as THREE.BufferAttribute;
  const up = new THREE.Color(C.up);
  const dn = new THREE.Color(C.down);
  let last = up;
  let k = 0;
  const half = 0.035;
  for (let c = 0; c < Math.ceil(n); c++) {
    const a = pathPoint(s, c);
    const b0 = pathPoint(s, c + 1);
    const t = Math.min(1, n - c);
    const b: [number, number, number] = [a[0] + (b0[0] - a[0]) * t, a[1] + (b0[1] - a[1]) * t, a[2] + (b0[2] - a[2]) * t];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * half;
    const ny = (dx / len) * half;
    const dr = s.market.path[c + 1] - s.market.path[c];
    if (dr > 0.15) last = up;
    else if (dr < -0.15) last = dn;
    const quad = [
      [a[0] - nx, a[1] - ny, a[2]],
      [a[0] + nx, a[1] + ny, a[2]],
      [b[0] + nx, b[1] + ny, b[2]],
      [a[0] - nx, a[1] - ny, a[2]],
      [b[0] + nx, b[1] + ny, b[2]],
      [b[0] - nx, b[1] - ny, b[2]],
    ];
    for (const p of quad) {
      P.setXYZ(k, p[0], p[1], p[2]);
      Cc.setXYZ(k, last.r * 1.35, last.g * 1.35, last.b * 1.35);
      k++;
    }
  }
  for (; k < COLS * 6; k++) P.setXYZ(k, 0, 0, -50);
  P.needsUpdate = true;
  Cc.needsUpdate = true;
  geo.computeBoundingSphere();
  mat.opacity = s.pathOpacity * Math.min(1, s.dim * 1.2);
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={5} visible={s.pathOpacity > 0.01 && n > 0} />;
};

/** The slab the book sits on: gives the heatmap a physical edge in the oblique shots. */
const Slab: React.FC<{ s: WorldState }> = ({ s }) => {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0b0f19", roughness: 0.5, metalness: 0.35 }), []);
  const show = s.slide >= 1 ? 1 : 0;
  mat.color.setRGB(0.043 * s.dim, 0.058 * s.dim, 0.098 * s.dim, THREE.SRGBColorSpace);
  return (
    <mesh position={[0, 0, -0.14]} material={mat} scale={show ? 1 : 0.0001}>
      <boxGeometry args={[PLANE_W + 0.36, PLANE_H + 0.36, 0.26]} />
    </mesh>
  );
};

const Rig: React.FC = () => {
  const frame = useCurrentFrame();
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  applyView(camera, camAt(frame));
  return null;
};

/** ThreeCanvas renders once before the composer has its passes — render again after mount. */
const PostMountRender: React.FC = () => {
  const advance = useThree((st) => st.advance);
  const frame = useCurrentFrame();
  useEffect(() => {
    const handle = delayRender("post-mount render");
    const raf = requestAnimationFrame(() => {
      advance(performance.now());
      continueRender(handle);
    });
    return () => {
      cancelAnimationFrame(raf);
      continueRender(handle);
    };
  }, [advance, frame]);
  return null;
};

export const World: React.FC<{ lite?: boolean }> = ({ lite = false }) => {
  const frame = useCurrentFrame();
  const s = worldAt(frame);
  return (
    <ThreeCanvas
      width={WIDTH}
      height={HEIGHT}
      dpr={1}
      flat
      camera={{ fov: 30, position: [0, 0, 36], near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={[C.bg]} />
      <fog attach="fog" args={[C.bg, 26, 62]} />
      <Rig />
      <ambientLight intensity={0.12} />
      <directionalLight position={[-6, -10, 14]} intensity={0.42} color="#fff1e0" />
      <directionalLight position={[9, 12, 5]} intensity={0.3} color="#9fb4ff" />
      <Slab s={s} />
      <Cells s={s} />
      <PriceLine s={s} />
      {lite ? null : (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.68} luminanceSmoothing={0.3} radius={0.72} />
          <Vignette eskil={false} offset={0.28} darkness={0.7} />
        </EffectComposer>
      )}
      <PostMountRender />
    </ThreeCanvas>
  );
};
