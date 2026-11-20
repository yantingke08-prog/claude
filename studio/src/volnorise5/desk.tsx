// v5 transition sets for the lines a chart cannot show: a desk seen from above with an open notebook (L14, the plan is
// written down by hand, line by line, on the word) and a monitor on a desk (L15, the question to the viewer; L16 the
// risk notice). Both stand far from the charts and are reached by a straight cut (director.ts keys + hud.tsx dip).
// The notebook's handwriting is drawn by hud.tsx in page coordinates (NOTE) and scaled with the page; the pen here
// follows the writing tip (noteTip).
import React, { useMemo } from "react";
import * as THREE from "three";
import { E, clamp01, ramp } from "./cue";
import { HOOK } from "./data";
import { COL } from "./palette";

// ---------------------------------------------------------------- where the sets stand
export const DESK = { x: -60, y: 0 } as const;
export const MON = { x: -60, y: 40 } as const;
/** the notebook page: world size, and page px per world unit the handwriting is laid out in */
export const PAGE = { w: 6.2, h: 7.1, z: 0.06, k: 200 } as const;
export const pageTopLeft = (): [number, number, number] => [DESK.x - PAGE.w / 2, DESK.y + PAGE.h / 2, PAGE.z];
export const MONITOR = { w: 11.2, h: 6.6, sw: 10.7, sh: 6.0 } as const;

// ---------------------------------------------------------------- the handwriting plan (page px, 1240 × 1420)
export const NOTE = {
  rule0: 250,
  ruleStep: 125,
  margin: 112,
  title: { x: 150, base: 362, size: 128, ev: "xNo" },
  lines: [
    { x: 150, base: 612, size: 86, ev: "xLow", key: 0 },
    { x: 150, base: 862, size: 86, ev: "xHigh", key: 1 },
    { x: 150, base: 1112, size: 86, ev: "xStop", key: 2 },
  ],
  sketch: { x: 760, y: 1170, w: 360, h: 200 },
} as const;
/** frames per handwritten character */
const PER_CHAR = 2.6;
const chars = (s: string) => Array.from(s).length;
/** writing progress 0..1 of a line of n characters starting at frame a */
export const writeK = (f: number, a: number, n: number) => clamp01((f - a) / (n * PER_CHAR));
/** the text of each written line (keyword, gap, rest) and how wide it runs in page px */
export const noteRows = (rules: [string, string][], title: string) => [
  { text: title, x: NOTE.title.x, base: NOTE.title.base, size: NOTE.title.size, at: E(NOTE.title.ev), n: chars(title), k: "", v: "" },
  ...NOTE.lines.map((l) => {
    const [k, v] = rules[l.key];
    return { text: `${k}  ${v}`, x: l.x, base: l.base, size: l.size, at: E(l.ev), n: chars(k) + 2 + chars(v), k, v };
  }),
];
/** where the pen tip is (page px) at frame f, and whether it is writing */
export const noteTip = (f: number, rows: ReturnType<typeof noteRows>) => {
  let tip = { x: 980, y: 1260, writing: 0 };
  for (const r of rows) {
    if (f < r.at - 10) break;
    const k = writeK(f, r.at, r.n);
    const w = r.n * r.size * 0.92;
    // move to the start of the line in the 10 frames before it, then write along it
    if (f < r.at) {
      const m = clamp01((f - (r.at - 10)) / 10);
      tip = { x: tip.x + (r.x - tip.x) * m, y: tip.y + (r.base - 10 - tip.y) * m, writing: 0 };
    } else tip = { x: r.x + w * k, y: r.base - 10 + Math.sin(f * 1.7) * 6 * (k < 1 ? 1 : 0), writing: k < 1 ? 1 : 0 };
  }
  return tip;
};

// ---------------------------------------------------------------- primitives
const Box: React.FC<{ p: [number, number, number]; s: [number, number, number]; color: string; rough?: number; metal?: number; emissive?: string; ei?: number; shadow?: boolean }> = ({ p, s, color, rough = 0.7, metal = 0, emissive, ei = 0, shadow = true }) => (
  <mesh position={p} castShadow={shadow} receiveShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? "#000000"} emissiveIntensity={ei} />
  </mesh>
);

/** a pen lying on the page, its tip at (x, y), lifted while it moves between lines */
const Pen: React.FC<{ x: number; y: number; lift: number }> = ({ x, y, lift }) => {
  const ang = -0.62; // the body runs up and to the right from the tip
  const len = 3.6;
  const dir = new THREE.Vector3(Math.cos(Math.PI / 2 + ang), Math.sin(Math.PI / 2 + ang), 0);
  const mid = new THREE.Vector3(x, y, 0.16 + lift).addScaledVector(dir, len / 2 + 0.18);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const tipP = new THREE.Vector3(x, y, 0.16 + lift).addScaledVector(dir, 0.09);
  return (
    <group>
      <mesh position={mid} quaternion={q} castShadow>
        <cylinderGeometry args={[0.11, 0.11, len, 20]} />
        <meshPhysicalMaterial color="#14161b" roughness={0.25} clearcoat={1} metalness={0.2} />
      </mesh>
      <mesh position={new THREE.Vector3(x, y, 0.16 + lift).addScaledVector(dir, len - 0.3)} quaternion={q} castShadow>
        <cylinderGeometry args={[0.115, 0.115, 0.5, 20]} />
        <meshStandardMaterial color={COL.gold} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={tipP} quaternion={q} castShadow>
        <coneGeometry args={[0.11, 0.18, 20]} />
        <meshStandardMaterial color="#c9b98f" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- the desk + notebook (seen from above)
export const DeskSet: React.FC<{ f: number; on: boolean; rows: ReturnType<typeof noteRows> }> = ({ f, on, rows }) => {
  if (!on) return null;
  const [x0, y1] = pageTopLeft();
  const tip = noteTip(f, rows);
  const lift = tip.writing ? 0 : 0.18;
  const rulesY = Array.from({ length: 10 }, (_, i) => NOTE.rule0 + i * NOTE.ruleStep);
  return (
    <group>
      {/* desk top: dark walnut; the camera looks straight down at it */}
      <Box p={[DESK.x, DESK.y, -0.3]} s={[40, 40, 0.4]} color="#2b1d14" rough={0.82} shadow={false} />
      {/* keyboard edge at the top of the frame */}
      <Box p={[DESK.x + 0.4, DESK.y + 6.35, -0.02]} s={[9.6, 2.3, 0.18]} color="#1a1c21" rough={0.5} />
      {Array.from({ length: 3 }, (_, r) =>
        Array.from({ length: 13 }, (_, c) => <Box key={`${r}-${c}`} p={[DESK.x + 0.4 - 4.5 + c * 0.75, DESK.y + 5.6 + r * 0.66, 0.11]} s={[0.6, 0.52, 0.1]} color="#2a2d34" rough={0.45} shadow={false} />),
      )}
      {/* the open notebook: left page mostly out of frame, spine, right page with rules */}
      <Box p={[x0 - PAGE.w / 2 - 0.02, DESK.y, 0.0]} s={[PAGE.w, PAGE.h, 0.06]} color="#d9d1bf" rough={0.9} />
      <Box p={[x0, DESK.y, 0.02]} s={[0.1, PAGE.h, 0.05]} color="#9d9584" rough={0.9} shadow={false} />
      <Box p={[DESK.x, DESK.y, 0.0]} s={[PAGE.w, PAGE.h, 0.06]} color="#ebe4d3" rough={0.92} />
      {rulesY.map((py, i) => (
        <Box key={i} p={[DESK.x, y1 - py / PAGE.k, 0.035]} s={[PAGE.w - 0.2, 0.012, 0.004]} color="#9fb4ca" rough={1} shadow={false} />
      ))}
      <Box p={[x0 + NOTE.margin / PAGE.k, DESK.y, 0.035]} s={[0.014, PAGE.h, 0.004]} color="#d38b8b" rough={1} shadow={false} />
      {/* a mug at the bottom right, half out of frame */}
      <mesh position={[DESK.x + 4.1, DESK.y - 5.6, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.05, 1.2, 40, 1, true]} />
        <meshStandardMaterial color="#d8d4cc" roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[DESK.x + 4.1, DESK.y - 5.6, 1.0]}>
        <circleGeometry args={[0.98, 40]} />
        <meshStandardMaterial color="#2a1608" roughness={0.2} />
      </mesh>
      <Pen x={x0 + tip.x / PAGE.k} y={y1 - tip.y / PAGE.k} lift={lift} />
      {/* a warm desk lamp from the upper left */}
      <pointLight position={[DESK.x - 4, DESK.y + 5, 7]} intensity={70} distance={26} color="#ffd9a8" />
    </group>
  );
};

// ---------------------------------------------------------------- the monitor (seen from the front)
const screenTexture = () => {
  const W = 1280;
  const H = 720;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0a0e15";
  g.fillRect(0, 0, W, H);
  // grid
  g.strokeStyle = "rgba(160,175,200,0.12)";
  g.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    g.beginPath();
    g.moveTo(40, (H * 0.72 * i) / 6);
    g.lineTo(W - 40, (H * 0.72 * i) / 6);
    g.stroke();
  }
  const bars = HOOK.bars;
  const lo = Math.min(...bars.map((b) => b.l));
  const hi = Math.max(...bars.map((b) => b.h));
  const vmax = Math.max(...bars.map((b) => b.v));
  const x = (i: number) => 70 + (i * (W - 160)) / (bars.length - 1);
  const y = (p: number) => 40 + (1 - (p - lo) / (hi - lo)) * (H * 0.62);
  const bw = ((W - 160) / bars.length) * 0.6;
  bars.forEach((b, i) => {
    const up = b.c >= b.o;
    const last = i === bars.length - 1;
    const col = up ? COL.up : COL.down;
    g.strokeStyle = col;
    g.fillStyle = col;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x(i), y(b.h));
    g.lineTo(x(i), y(b.l));
    g.stroke();
    const t = y(Math.max(b.o, b.c));
    g.fillRect(x(i) - bw / 2, t, bw, Math.max(4, y(Math.min(b.o, b.c)) - t));
    const vh = (b.v / vmax) * H * 0.2;
    g.fillStyle = last ? COL.gold : up ? "rgba(229,72,77,0.75)" : "rgba(37,176,122,0.75)";
    g.fillRect(x(i) - bw / 2, H - 30 - vh, bw, vh);
  });
  // the high of the last bar, as a dashed gold line
  g.strokeStyle = COL.gold;
  g.setLineDash([14, 10]);
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x(bars.length - 8), y(bars[bars.length - 1].h));
  g.lineTo(W - 40, y(bars[bars.length - 1].h));
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

export const MonitorSet: React.FC<{ f: number; on: boolean }> = ({ f, on }) => {
  const tex = useMemo(() => (typeof document === "undefined" ? null : screenTexture()), []);
  if (!on) return null;
  const glow = 0.85 + 0.15 * ramp(f, E("eIn") + 6, 20);
  const deskTop = MON.y - MONITOR.h / 2 - 2.1;
  return (
    <group>
      {/* wall */}
      <Box p={[MON.x, MON.y + 2, -3.2]} s={[60, 40, 0.2]} color="#10141c" rough={0.95} shadow={false} />
      {/* desk */}
      <Box p={[MON.x, deskTop - 0.3, 1.2]} s={[34, 0.6, 9]} color="#2b1d14" rough={0.8} />
      {/* stand */}
      <Box p={[MON.x, deskTop + 1.1, -0.55]} s={[0.9, 2.4, 0.35]} color="#1b1d22" rough={0.4} metal={0.5} />
      <Box p={[MON.x, deskTop + 0.08, -0.2]} s={[3.4, 0.16, 2.0]} color="#1b1d22" rough={0.4} metal={0.5} />
      {/* monitor */}
      <Box p={[MON.x, MON.y, -0.2]} s={[MONITOR.w, MONITOR.h, 0.36]} color="#0d0f13" rough={0.35} metal={0.4} />
      {tex && (
        <mesh position={[MON.x, MON.y, -0.01]}>
          <planeGeometry args={[MONITOR.sw, MONITOR.sh]} />
          <meshBasicMaterial map={tex} toneMapped={false} color={new THREE.Color(glow, glow, glow)} />
        </mesh>
      )}
      {/* keyboard + mug */}
      <Box p={[MON.x - 0.5, deskTop + 0.12, 2.6]} s={[7.4, 0.24, 2.4]} color="#1d2026" rough={0.5} />
      <mesh position={[MON.x + 5.6, deskTop + 0.75, 2.4]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 1.5, 36]} />
        <meshStandardMaterial color="#d8d4cc" roughness={0.35} />
      </mesh>
      {/* the screen's light on the desk and a warm lamp from the left */}
      <pointLight position={[MON.x, MON.y - 1, 2.5]} intensity={30} distance={14} color="#9fb6d8" />
      <pointLight position={[MON.x - 9, MON.y + 4, 5]} intensity={60} distance={28} color="#ffd9a8" />
    </group>
  );
};
