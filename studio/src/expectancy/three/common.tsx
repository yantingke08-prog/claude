// Shared toolkit for the 3D chapters: keyframed cameras, exact 3D -> screen projection for
// crisp HTML labels, spatial glass cards, and studio lighting for solid geometry.
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
import { ease } from "../../lib/gsap";

export type Cam = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export type Shot = (f: number) => Cam;

/**
 * Camera as a pure function of the frame: named shots (each may itself depend on the
 * frame, e.g. tracking a moving point) blended between keyframes with an S-curve.
 */
export const makeCamera = <K extends string>(shots: Record<K, Shot>, keys: [number, K][], curve = "power2.inOut") => {
  const e = ease(curve);
  return (f: number): Cam => {
    let i = 0;
    while (i < keys.length - 2 && f >= keys[i + 1][0]) i++;
    const [f0, a] = keys[i];
    const [f1, b] = keys[i + 1];
    const t = e(Math.min(1, Math.max(0, (f - f0) / (f1 - f0))));
    const A = shots[a](f);
    const B = shots[b](f);
    return { pos: A.pos.lerp(B.pos, t), target: A.target.lerp(B.target, t), fov: A.fov + (B.fov - A.fov) * t };
  };
};

/** Adds a decaying handheld shake to a camera (impacts, crashes). */
export const withShake = (cam: Cam, f: number, at: number, strength = 0.06, frames = 16): Cam => {
  const k = f - at;
  if (k < 0 || k > frames) return cam;
  const d = (1 - k / frames) ** 2 * strength;
  const off = v(Math.sin(k * 7.3) * d, Math.cos(k * 9.1) * d, 0);
  return { ...cam, pos: cam.pos.clone().add(off), target: cam.target.clone().add(off) };
};

/** World -> screen pixels with exactly the camera the WebGL scene uses. */
export const projector = (cam: Cam, width: number, height: number) => {
  const c = new THREE.PerspectiveCamera(cam.fov, width / height, 0.01, 400);
  c.position.copy(cam.pos);
  c.lookAt(cam.target);
  c.updateMatrixWorld();
  return (p: THREE.Vector3) => {
    const ndc = p.clone().project(c);
    const dist = c.position.distanceTo(p);
    return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height, dist, visible: ndc.z < 1 && Math.abs(ndc.x) < 1.15 && Math.abs(ndc.y) < 1.15 };
  };
};

export const Label: React.FC<{
  x: number;
  y: number;
  o: number;
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  style?: React.CSSProperties;
}> = ({ x, y, o, children, align = "left", style }) =>
  o <= 0.01 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: o,
        transform: `translate(${align === "left" ? "0" : align === "right" ? "-100%" : "-50%"}, -50%)`,
        whiteSpace: "nowrap",
        textShadow: "0 2px 12px rgba(0,0,0,0.9)",
        ...style,
      }}
    >
      {children}
    </div>
  );

/**
 * Spatial glass: frosted (backdrop blur over whatever moves behind it), a lit top edge,
 * a specular sheen that slides as the card turns, and a real perspective tilt.
 */
export const GlassCard: React.FC<{
  children: React.ReactNode;
  rx?: number;
  ry?: number;
  z?: number;
  tint?: string;
  style?: React.CSSProperties;
  perspective?: number;
}> = ({ children, rx = 0, ry = 0, z = 0, tint = "120,170,255", style, perspective = 1400 }) => {
  const frame = useCurrentFrame();
  const sheen = ((ry * 2 + frame * 0.15) % 200) - 50;
  return (
    <div style={{ perspective, ...style }}>
      <div
        style={{
          position: "relative",
          transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
          transformStyle: "preserve-3d",
          borderRadius: 22,
          background: `linear-gradient(150deg, rgba(${tint},0.16) 0%, rgba(${tint},0.05) 45%, rgba(10,12,30,0.38) 100%)`,
          backdropFilter: "blur(22px) saturate(150%)",
          WebkitBackdropFilter: "blur(22px) saturate(150%)",
          border: `1px solid rgba(${tint},0.28)`,
          boxShadow: `0 40px 90px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(${tint},0.12)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(105deg, transparent ${sheen}%, rgba(255,255,255,0.09) ${sheen + 10}%, transparent ${sheen + 22}%)`,
          }}
        />
        {children}
      </div>
    </div>
  );
};

/** Soft key + rim lights so solid geometry reads as volume, not flat colour. */
export const StudioLights: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => (
  <>
    <ambientLight intensity={0.35 * intensity} />
    <directionalLight position={[6, 10, 8]} intensity={1.4 * intensity} color="#dfe8ff" />
    <directionalLight position={[-8, 4, -6]} intensity={0.9 * intensity} color="#7b5cff" />
    <directionalLight position={[0, -6, 4]} intensity={0.35 * intensity} color="#5ce8ff" />
  </>
);

export const glassPlaneMat = (color: string, opacity: number) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const span = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
