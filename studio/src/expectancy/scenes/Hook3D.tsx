// Opening, rebuilt in space: two capital curves race over a glass "liquidation floor".
//   x = trade number (0.5 / trade)   y = capital (0.3 / unit)   z = which trader (A front, B back)
// A's last held loser drives its line through the floor; the head shatters into particles.
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "../../components/Hud";
import { CameraRig, Stage } from "../../components/Stage";
import { MONO, zh } from "../../lib/fonts";
import { ease } from "../../lib/gsap";
import { SOFT_POINT_FRAG } from "../../lib/glsl";
import { mulberry32 } from "../../lib/rng";
import { SceneShell } from "../components/SceneShell";
import { appear, fadeOut, GREEN, RED } from "../components/Charts";
import { hookPathA, hookPathB } from "../sim.ts";
import { cue, SCRIPT } from "../timeline.ts";
import { GlassCard, glassPlaneMat, Label, makeCamera, projector, span, v, withShake, type Shot } from "../three/common";

const UI = SCRIPT.ui;
const A = hookPathA();
const B = hookPathB();
const CRASH = cue("hook", "hit");
const TITLE_AT = 440;
const KX = 0.5;
const KY = 0.3;
const ZA = 1.6;
const ZB = -1.6;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const revealA = (f: number) => interpolate(f, [40, CRASH], [0, A.liquidatedAt], clamp);
const revealB = (f: number) => interpolate(f, [40, CRASH + 8], [0, B.length - 1], clamp);

const valueAt = (eq: number[], r: number) => {
  const k = Math.min(eq.length - 1, Math.floor(r));
  if (k >= eq.length - 1) return eq[eq.length - 1];
  return eq[k] + (eq[k + 1] - eq[k]) * (r - k);
};
const headA = (f: number) => v(revealA(f) * KX, Math.max(-1.2, valueAt(A.equity, revealA(f))) * KY, ZA);
const headB = (f: number) => v(revealB(f) * KX, valueAt(B, revealB(f)) * KY, ZB);

// ---------------- camera ----------------

const SHOTS: Record<string, Shot> = {
  start: () => ({ pos: v(-6, 5.5, 11), target: v(2.5, 4.4, 0), fov: 42 }),
  track: (f) => {
    const x = headB(f).x;
    return { pos: v(x - 8.5, 8.5, 17), target: v(x - 1.8, 4.2, 0), fov: 42 };
  },
  crash: () => {
    const h = headA(CRASH);
    return { pos: v(h.x - 9.5, 8, 16), target: v(h.x - 2.8, 3.9, 0), fov: 42 };
  },
  orbit: (f) => {
    const h = headA(CRASH);
    const a = 0.4 + (f - CRASH) * 0.004;
    return { pos: v(h.x - 3 + Math.sin(a) * 12, 7, Math.cos(a) * 12), target: v(h.x - 3, 4, 0), fov: 42 };
  },
  wide: () => ({ pos: v(9.5, 21, 25), target: v(10, 4.5, 0), fov: 40 }),
};
const camAt = makeCamera(SHOTS, [
  [0, "start"],
  [70, "track"],
  [290, "track"],
  [CRASH, "crash"],
  [338, "crash"],
  [420, "orbit"],
  [TITLE_AT, "orbit"],
  [520, "wide"],
  [600, "wide"],
]);
const cameraAt = (f: number) => withShake(camAt(f), f, CRASH, 0.35, 18);

// ---------------- geometry ----------------

const pathPts = (eq: number[], r: number, z: number, floor = -Infinity): [number, number, number][] => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= Math.floor(r) && i < eq.length; i++) pts.push([i * KX, Math.max(floor, eq[i]) * KY, z]);
  if (r % 1 > 0 && Math.floor(r) + 1 < eq.length) pts.push([r * KX, Math.max(floor, valueAt(eq, r)) * KY, z]);
  return pts;
};

const Floor: React.FC<{ flash: number }> = ({ flash }) => {
  const { grid, gridMat } = useMemo(() => {
    const g: number[] = [];
    for (let i = 0; i <= 42; i += 2) g.push(i * KX, 0, -4, i * KX, 0, 4);
    for (let z = -4; z <= 4; z += 1) g.push(0, 0, z, 21, 0, z);
    const grid = new THREE.BufferGeometry();
    grid.setAttribute("position", new THREE.BufferAttribute(new Float32Array(g), 3));
    return { grid, gridMat: new THREE.LineBasicMaterial({ color: "#ff4d6d", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }) };
  }, []);
  const fill = useMemo(() => glassPlaneMat("#ff4d6d", 0.05), []);
  fill.opacity = 0.05 + flash * 0.25;
  return (
    <>
      <mesh position={[10.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={fill}>
        <planeGeometry args={[21, 8]} />
      </mesh>
      <lineSegments geometry={grid} material={gridMat} />
    </>
  );
};

/** Ripple ring on the floor where A breaks through. */
const ImpactRing: React.FC<{ f: number }> = ({ f }) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff4d6d", transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const k = (f - CRASH) / 40;
  if (k < 0 || k > 1) return null;
  mat.opacity = (1 - k) * 0.9;
  const h = headA(CRASH);
  return (
    <mesh position={[h.x, 0.01, ZA]} rotation={[-Math.PI / 2, 0, 0]} scale={0.3 + ease("expo.out")(k) * 2.4} material={mat}>
      <ringGeometry args={[0.85, 1, 64]} />
    </mesh>
  );
};

const sparkVertex = /* glsl */ `
attribute vec3 color;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(60.0 / -mv.z, 2.0, 14.0);
  vColor = color;
  vAlpha = aAlpha;
}
`;

/**
 * Particles carry the trade results: every completed trade puffs green sparks upward
 * (+) or red sparks downward (-) from the line head; A's crash is a 400-particle shatter.
 */
const Sparks: React.FC<{ f: number }> = ({ f }) => {
  const PER = 10;
  const SHATTER = 400;
  const total = (A.equity.length + B.length) * PER + SHATTER;
  const { geometry, material, seeds } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(total), 1));
    const material = new THREE.ShaderMaterial({ vertexShader: sparkVertex, fragmentShader: SOFT_POINT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const rand = mulberry32(31);
    const seeds = Array.from({ length: total }, () => [rand(), rand(), rand()]);
    return { geometry, material, seeds };
  }, [total]);
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  const col = geometry.getAttribute("color") as THREE.BufferAttribute;
  const al = geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
  let k = 0;
  // reveals are linear from frame 40 to `end` over `trades` trades, so trade i lands at:
  const emit = (eq: number[], end: number, trades: number, z: number, stopAt: number) => {
    for (let i = 1; i < eq.length; i++) {
      const t0 = 40 + (i / trades) * (end - 40);
      const age = f - t0;
      const up = eq[i] > eq[i - 1];
      for (let p = 0; p < PER; p++, k++) {
        const [r1, r2, r3] = seeds[k];
        const live = age >= 0 && age < 22 && i <= stopAt;
        const tt = Math.max(0, age) / 22;
        const dir = up ? 1 : -1;
        pos.setXYZ(k, i * KX + (r1 - 0.5) * 0.5 * tt, eq[i] * KY + dir * (0.2 + r2 * 1.2) * ease("expo.out")(tt), z + (r3 - 0.5) * 0.6 * tt);
        if (up) col.setXYZ(k, 0.25, 0.95, 0.64);
        else col.setXYZ(k, 1, 0.3, 0.42);
        al.setX(k, live ? (1 - tt) * 0.9 : 0);
      }
    }
  };
  emit(A.equity, CRASH, A.liquidatedAt, ZA, A.liquidatedAt - 1);
  emit(B, CRASH + 8, B.length - 1, ZB, B.length);
  // the shatter: burst out of A's head at the floor, then fall away under gravity
  const h = headA(CRASH);
  const age = (f - CRASH) / 30;
  for (let p = 0; p < SHATTER; p++, k++) {
    const [r1, r2, r3] = seeds[k];
    const th = r1 * Math.PI * 2;
    const sp = 1.5 + r2 * 4;
    const live = age >= 0 && age < 2.4;
    const t = Math.max(0, age);
    pos.setXYZ(k, h.x + Math.cos(th) * sp * t * 0.6, Math.max(-14, 0.2 + (r3 * 3 - 0.5) * t - 4.5 * t * t), ZA + Math.sin(th) * sp * t * 0.6);
    col.setXYZ(k, 1, 0.25 + r3 * 0.3, 0.35);
    al.setX(k, live ? Math.max(0, 1 - age / 2.4) : 0);
  }
  pos.needsUpdate = col.needsUpdate = al.needsUpdate = true;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

// ---------------- scene ----------------

const Space: React.FC<{ f: number }> = ({ f }) => {
  const cam = cameraAt(f);
  const crashed = f >= CRASH;
  const a = headA(f);
  const b = headB(f);
  const flash = crashed ? Math.max(0, 1 - (f - CRASH) / 25) : 0;
  return (
    <Stage fov={cam.fov} bloom={1.1} bloomThreshold={0.15}>
      <CameraRig position={cam.pos.toArray() as [number, number, number]} target={cam.target.toArray() as [number, number, number]} fov={cam.fov} />
      <Floor flash={flash} />
      <ImpactRing f={f} />
      {revealA(f) > 0.01 && (
        <Line points={pathPts(A.equity, revealA(f), ZA, -1.2)} color={crashed ? RED : C.cyan} lineWidth={5} />
      )}
      {revealB(f) > 0.01 && <Line points={pathPts(B, revealB(f), ZB)} color={C.amber} lineWidth={5} />}
      {!crashed && revealA(f) > 0.01 && (
        <mesh position={a} scale={0.16}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      {revealB(f) > 0.01 && (
        <mesh position={b} scale={0.16}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshBasicMaterial color="#fff4d6" />
        </mesh>
      )}
      <Sparks f={f} />
    </Stage>
  );
};

/** Glass name tags ride above each line head: spatial UI, pinned to the 3D data. */
const Tags: React.FC<{ f: number }> = ({ f }) => {
  const { width, height } = useVideoConfig();
  const proj = projector(cameraAt(f), width, height);
  const crashed = f >= CRASH;
  const tags = [
    { name: "A", rate: 70, head: headA(f), value: crashed ? 0 : valueAt(A.equity, revealA(f)), color: crashed ? RED : C.cyan, at: 8 },
    { name: "B", rate: 40, head: headB(f), value: valueAt(B, revealB(f)), color: C.amber, at: 16 },
  ];
  const o = fadeOut(f, TITLE_AT - 10, 20);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {tags.map((t) => {
        const p = proj(t.head.clone().add(v(0, 1.0, 0)));
        const k = appear(f, t.at, 24) * o;
        if (!p.visible || k <= 0) return null;
        const scale = Math.max(0.6, Math.min(1.15, 14 / p.dist));
        return (
          <div key={t.name} style={{ position: "absolute", left: p.x, top: p.y, transform: `translate(-50%,-100%) scale(${scale})`, transformOrigin: "bottom center", opacity: k }}>
            <GlassCard ry={-8} tint={t.name === "A" && crashed ? "255,77,109" : "120,170,255"}>
              <div style={{ padding: "14px 22px", display: "flex", gap: 18, alignItems: "baseline" }}>
                <span style={{ ...zh(900), fontSize: 30, color: "#fff" }}>{t.name}</span>
                <span style={{ ...zh(500), fontSize: 18, color: C.dim }}>{UI.winRate}</span>
                <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 26, color: t.color }}>{t.rate}%</span>
                <span style={{ ...zh(500), fontSize: 18, color: C.dim, marginLeft: 6 }}>{UI.capital}</span>
                <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 26, color: t.name === "A" && crashed ? RED : "#fff" }}>{Math.max(0, t.value).toFixed(1)}</span>
              </div>
            </GlassCard>
            <div style={{ width: 2, height: 30, margin: "0 auto", background: `linear-gradient(${t.color}, transparent)` }} />
          </div>
        );
      })}
      {crashed && (() => {
        const p = proj(headA(CRASH).clone().add(v(0, 4.4, 0)));
        const age = f - CRASH;
        const s = ease("back.out(2.2)")(span(age, 0, 12));
        return (
          <div
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              transform: `translate(-50%,-50%) rotate(-10deg) scale(${2.2 - s * 1.2})`,
              opacity: s * fadeOut(f, TITLE_AT - 6, 16),
              ...zh(900),
              fontSize: 88,
              color: RED,
              border: `6px solid ${RED}`,
              borderRadius: 16,
              padding: "2px 28px",
              letterSpacing: 12,
              textShadow: `0 0 30px ${RED}`,
              boxShadow: `0 0 40px ${RED}66`,
              background: "rgba(40,0,10,0.35)",
              backdropFilter: "blur(6px)",
            }}
          >
            {UI.liquidated}
          </div>
        );
      })()}
      {f >= 60 && f < TITLE_AT && (() => {
        const p = proj(v(revealB(f) * KX * 0.5 + 1, 0, 3.2));
        return (
          <Label x={p.x} y={p.y} o={appear(f, 60) * fadeOut(f, CRASH + 30)} align="center">
            <span style={{ ...zh(500), fontSize: 20, color: RED }}>
              {UI.zeroPlane} · {UI.liquidated}
            </span>
          </Label>
        );
      })()}
    </AbsoluteFill>
  );
};

export const Hook3D: React.FC = () => {
  const f = useCurrentFrame();
  const [line1, line2] = SCRIPT.title.split("，");
  const l1 = appear(f, TITLE_AT + 30, 26);
  const l2 = appear(f, TITLE_AT + 46, 26);
  const veil = appear(f, TITLE_AT + 20, 40) * 0.55;
  const pct = (s: string, first: boolean) =>
    s.split(/(\d+%)/).map((p, i) =>
      /\d+%/.test(p) ? (
        <span key={i} style={{ color: first ? C.amber : C.cyan, textShadow: "0 0 30px currentColor" }}>
          {p}
        </span>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  return (
    <SceneShell id="hook">
      <AbsoluteFill style={{ opacity: appear(f, 0, 20) }}>
        <Space f={f} />
      </AbsoluteFill>
      <Tags f={f} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(3,4,11,${veil}) 0%, rgba(3,4,11,${veil * 0.6}) 70%)` }} />
      {f >= TITLE_AT + 20 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", ...zh(900), color: "#fff", textAlign: "center", marginTop: -60, perspective: 1200 }}>
          <div style={{ fontSize: 92, opacity: l1, transform: `translateY(${(1 - l1) * 40}px) rotateX(${(1 - l1) * 40}deg)`, letterSpacing: 4 }}>{pct(line1, true)}，</div>
          <div style={{ fontSize: 92, opacity: l2, transform: `translateY(${(1 - l2) * 40}px) rotateX(${(1 - l2) * 40}deg)`, letterSpacing: 4, marginTop: 10 }}>{pct(line2, false)}</div>
        </AbsoluteFill>
      )}
    </SceneShell>
  );
};
