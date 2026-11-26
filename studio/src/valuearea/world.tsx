// The 3D stage. Seven sets stand side by side along x (data.ts SX); the camera travels laterally between them.
// Each set is built from the same parts: a price-ladder rail, faint price grid, the volume profile (3D bars),
// a translucent value-area slab, a gold POC rod, VAH/VAL rulers, candles and a volume/Delta strip.
// Palette: deep navy-black, warm white, gold, red (up), green (down). Red/green always come with text or an arrow
// in the HUD. Everything is a pure function of the frame (no clocks, no unseeded randomness).
import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { acceptAct, endAct, hookAct, mainAct, mapAct, partial, rejectAct, watchAct } from "./acts";
import { clamp01, ease, lerp, out3 } from "./cue";
import {
  ACCEPT, AC_DRIVE, AC_TEST, BRANCH_DN, BRANCH_UP, CANDLE_DX, CH_X0, CH_X1, HOOK, HOOK_BREAK, HOOK_HOLD, LADDER_X, LINE_P, LVN_I, MAGNET, MAIN, NEW_VA,
  POC, POC_I, PROFILE, PROF_L, PROF_X, P_HI, P_LO, REJECT, RJ_MIRROR, RJ_POKE, ROWS, ROW_H, SX, VA, VAH, VAL, VOL_H, WATCH, volBase, cxOf, py, rng, rowPrice,
  type Candle, type SetId,
} from "./data";
import { cam, presence } from "./director";
import { LAYOUT } from "./layout";

export const COL = {
  bg: "#05080f",
  navy: "#0b1424",
  wall: "#0a1120",
  up: "#e5484d",
  down: "#22b07a",
  gold: "#e9b44c",
  warm: "#f3ead9",
  steel: "#7d889c",
  dim: "#3a4458",
};

// ---------------------------------------------------------------- shared geometry
const UNIT = new THREE.BoxGeometry(1, 1, 1);
const SPHERE = new THREE.SphereGeometry(1, 32, 20);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
const TORUS = new THREE.TorusGeometry(1, 0.06, 10, 48);
const geoCache = new Map<string, THREE.BufferGeometry>();
const rbox = (w: number, h: number, d: number, r = 0.04) => {
  const q = (v: number) => Math.max(0.02, Math.round(v * 50) / 50);
  const key = `${q(w)}|${q(h)}|${q(d)}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(q(w), q(h), q(d), 3, Math.min(r, q(h) / 2 - 0.004, q(w) / 2 - 0.004));
    geoCache.set(key, g);
  }
  return g;
};

type BoxP = { p: [number, number, number]; s: [number, number, number]; c: string; e?: string; ei?: number; o?: number; rough?: number; metal?: number; dw?: boolean };
const Box: React.FC<BoxP> = ({ p, s, c, e, ei = 0, o = 1, rough = 0.45, metal = 0.1, dw }) => {
  if (o <= 0.004 || s[0] <= 0 || s[1] <= 0) return null;
  return (
    <mesh geometry={UNIT} position={p} scale={s}>
      <meshStandardMaterial color={c} emissive={e ?? c} emissiveIntensity={ei} roughness={rough} metalness={metal} transparent={o < 1} opacity={o} depthWrite={dw ?? o >= 1} />
    </mesh>
  );
};

// ---------------------------------------------------------------- common parts (set-local coordinates)
const XR = PROF_X + PROF_L + 0.15; // right end of rulers and bands

/** the price ladder: a vertical rail with a tick per row, longer at whole prices */
const Ladder: React.FC<{ a: number }> = ({ a }) => (
  <group>
    <Box p={[LADDER_X, (py(P_LO) + py(P_HI)) / 2, 0]} s={[0.04, py(P_HI) - py(P_LO), 0.04]} c={COL.steel} e={COL.warm} ei={0.15} o={0.8 * a} />
    {Array.from({ length: ROWS }, (_, i) => {
      const p = rowPrice(i);
      const whole = Math.abs(p - Math.round(p)) < 1e-6;
      return <Box key={i} p={[LADDER_X + (whole ? 0.14 : 0.08), py(p), 0]} s={[whole ? 0.28 : 0.16, 0.02, 0.03]} c={COL.warm} e={COL.warm} ei={0.3} o={(whole ? 0.6 : 0.3) * a} />;
    })}
  </group>
);

/** faint horizontal price grid at whole prices, set back from the data */
const Grid: React.FC<{ a: number }> = ({ a }) => (
  <group>
    {Array.from({ length: P_HI - P_LO + 1 }, (_, k) => (
      <Box key={k} p={[(LADDER_X + XR) / 2, py(P_LO + k), -0.7]} s={[XR - LADDER_X, 0.012, 0.012]} c={COL.warm} e={COL.warm} ei={0.2} o={0.07 * a} />
    ))}
  </group>
);

/** the volume profile: one 3D bar per price row, growing from the spine to the right */
const Profile: React.FC<{ a: number; len: (i: number) => number; tone: (i: number) => { c: string; ei: number; o: number } }> = ({ a, len, tone }) => (
  <group>
    <Box p={[PROF_X - 0.03, (py(P_LO) + py(P_HI)) / 2, 0]} s={[0.035, py(P_HI) - py(P_LO) + ROW_H, 0.5]} c={COL.steel} o={0.6 * a} />
    {PROFILE.map((v, i) => {
      const L = Math.max(0, len(i)) * PROF_L;
      if (L < 0.01) return null;
      const t = tone(i);
      return (
        <mesh key={i} geometry={rbox(L, ROW_H * 0.78, 0.56, 0.05)} position={[PROF_X + L / 2, py(rowPrice(i)), 0]}>
          <meshPhysicalMaterial color={t.c} emissive={t.c} emissiveIntensity={t.ei} roughness={0.32} metalness={0.05} clearcoat={0.6} clearcoatRoughness={0.25} transparent opacity={t.o * a} depthWrite={t.o * a > 0.9} />
        </mesh>
      );
    })}
  </group>
);
const profTone = (opts: { dense?: number; poc?: number; dim?: number; band?: [number, number] }) => (i: number) => {
  const [lo, hi] = opts.band ?? [VA.lo, VA.hi];
  const inVa = i >= lo && i <= hi;
  const d = opts.dense ?? 0;
  if (i === POC_I && (opts.poc ?? 0) > 0) return { c: COL.gold, ei: 0.25 + 0.6 * (opts.poc ?? 0), o: 1 };
  const base = inVa ? lerp(0.78, 0.95, d) : lerp(0.78, 0.38, d);
  return { c: inVa && d > 0 ? "#cfc6b4" : "#9aa4b5", ei: inVa ? 0.06 + 0.12 * d : 0.03, o: base * (1 - 0.5 * (opts.dim ?? 0)) };
};

/** the value area: a translucent slab between two prices, opening from `from` outward as k goes 0→1 */
const Band: React.FC<{ lo: number; hi: number; k: number; a: number; c?: string; from?: number; o?: number }> = ({ lo, hi, k, a, c = COL.gold, from, o = 0.11 }) => {
  if (k <= 0.002 || a <= 0.002) return null;
  const mid = from ?? (lo + hi) / 2;
  const top = lerp(mid, hi, ease(k)) + 0.125;
  const bot = lerp(mid, lo, ease(k)) - 0.125;
  const y0 = py(bot);
  const y1 = py(top);
  return (
    <group>
      <mesh geometry={UNIT} position={[(LADDER_X + 0.2 + XR) / 2, (y0 + y1) / 2, -0.15]} scale={[XR - LADDER_X - 0.2, y1 - y0, 1.1]}>
        <meshPhysicalMaterial color={c} emissive={c} emissiveIntensity={0.25} roughness={0.15} metalness={0} transparent opacity={o * a} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {[y0, y1].map((y, j) => (
        <Box key={j} p={[(LADDER_X + 0.2 + XR) / 2, y, 0.42]} s={[XR - LADDER_X - 0.2, 0.025, 0.025]} c={c} e={c} ei={0.9} o={0.7 * a} />
      ))}
    </group>
  );
};

/** a level: thin glowing rod across the set (POC gold, VAH/VAL warm rulers with end ticks) */
const Level: React.FC<{ p: number; c: string; a: number; glow?: number; x0?: number; x1?: number; thick?: number; ticks?: boolean }> = ({ p, c, a, glow = 0.6, x0 = LADDER_X + 0.15, x1 = XR, thick = 0.05, ticks }) => {
  if (a <= 0.003 || x1 <= x0) return null;
  const y = py(p);
  return (
    <group>
      <mesh geometry={CYL} position={[(x0 + x1) / 2, y, 0.35]} rotation={[0, 0, Math.PI / 2]} scale={[thick, x1 - x0, thick]}>
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow} roughness={0.3} metalness={0.4} transparent opacity={a} />
      </mesh>
      {ticks &&
        [x0, x1].map((x, j) => <Box key={j} p={[x, y, 0.35]} s={[0.04, 0.32, 0.04]} c={c} e={c} ei={glow} o={a} />)}
    </group>
  );
};

/** candles (bevelled bodies + wicks) — red up, green down; `n` = how many have printed (fractional = the last grows) */
const Candles: React.FC<{ data: Candle[]; n: number; a: number; dim?: (i: number) => number; glow?: (i: number) => number }> = ({ data, n, a, dim, glow }) => (
  <group>
    {data.map((c, i) => {
      if (i >= n) return null;
      const q = partial(c, i, n);
      const up = q.c >= c.o;
      const col = up ? COL.up : COL.down;
      const o = a * (1 - (dim ? dim(i) : 0));
      const top = Math.max(c.o, q.c);
      const bot = Math.min(c.o, q.c);
      const bh = Math.max(0.04, py(top) - py(bot));
      const x = cxOf(i);
      const ei = 0.12 + (glow ? glow(i) : 0) * 0.7;
      return (
        <group key={i}>
          <mesh geometry={rbox(CANDLE_DX * 0.66, bh, 0.24, 0.03)} position={[x, (py(top) + py(bot)) / 2, 0.1]}>
            <meshPhysicalMaterial color={col} emissive={col} emissiveIntensity={ei} roughness={0.28} metalness={0.05} clearcoat={0.8} clearcoatRoughness={0.2} transparent={o < 1} opacity={o} depthWrite={o >= 1} />
          </mesh>
          <Box p={[x, (py(q.h) + py(q.l)) / 2, 0.1]} s={[0.025, Math.max(0.02, py(q.h) - py(q.l)), 0.025]} c={col} e={col} ei={0.3} o={o * 0.95} />
        </group>
      );
    })}
  </group>
);

/** volume strip under the candles: glass column = volume, solid core = |Delta| in the candle's direction colour */
const Vols: React.FC<{ data: Candle[]; n: number; a: number; hi?: (i: number) => number }> = ({ data, n, a, hi }) => {
  const vmax = 2.2;
  const VOL_BASE = volBase(data);
  return (
    <group>
      <Box p={[(CH_X0 - 0.25 + CH_X1) / 2, VOL_BASE - 0.02, 0]} s={[CH_X1 - CH_X0 + 0.25, 0.02, 0.4]} c={COL.steel} o={0.5 * a} />
      {data.map((c, i) => {
        if (i >= n) return null;
        const k = clamp01(n - i);
        const h = (c.v / vmax) * VOL_H * ease(k);
        const dh = (Math.abs(c.d) / vmax) * VOL_H * ease(k);
        const col = c.d >= 0 ? COL.up : COL.down;
        const hk = hi ? hi(i) : 0;
        return (
          <group key={i}>
            <Box p={[cxOf(i), VOL_BASE + h / 2, 0]} s={[CANDLE_DX * 0.62, h, 0.22]} c={COL.warm} e={COL.warm} ei={0.05 + 0.4 * hk} o={(0.22 + 0.3 * hk) * a} />
            <Box p={[cxOf(i), VOL_BASE + dh / 2, 0]} s={[CANDLE_DX * 0.3, dh, 0.12]} c={col} e={col} ei={0.25 + 0.5 * hk} o={0.9 * a} />
          </group>
        );
      })}
    </group>
  );
};

const Marker: React.FC<{ x: number; y: number; a: number; z?: number; c?: string; r?: number }> = ({ x, y, a, z = 0.45, c = COL.gold, r = 0.13 }) =>
  a <= 0.003 ? null : (
    <group position={[x, y, z]}>
      <mesh geometry={SPHERE} scale={r}>
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.6} transparent opacity={a} />
      </mesh>
      <mesh geometry={SPHERE} scale={r * 2.6}>
        <meshBasicMaterial color={c} transparent opacity={0.14 * a} depthWrite={false} />
      </mesh>
    </group>
  );

const Ring: React.FC<{ x: number; y: number; k: number; c: string; z?: number }> = ({ x, y, k, c, z = 0.5 }) =>
  k <= 0.003 ? null : (
    <mesh geometry={TORUS} position={[x, y, z]} scale={0.2 + 0.55 * out3(1 - k)}>
      <meshBasicMaterial color={c} transparent opacity={0.9 * k} depthWrite={false} />
    </mesh>
  );

/** a path drawn as rod segments up to fraction k (branches, pull arc) */
const Path: React.FC<{ pts: [number, number][]; k: number; c: string; a: number; r?: number; z?: number; dash?: boolean }> = ({ pts, k, c, a, r = 0.035, z = 0.45, dash }) => {
  if (k <= 0.002 || a <= 0.002) return null;
  const segs: React.ReactNode[] = [];
  const total = pts.length - 1;
  const upto = k * total;
  for (let i = 0; i < total; i++) {
    if (i >= upto) break;
    const f = Math.min(1, upto - i);
    const [x0, y0] = pts[i];
    const x1 = x0 + (pts[i + 1][0] - x0) * f;
    const y1 = y0 + (pts[i + 1][1] - y0) * f;
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 0.005) continue;
    if (dash && i % 2 === 1) continue;
    segs.push(
      <mesh key={i} geometry={CYL} position={[(x0 + x1) / 2, (y0 + y1) / 2, z]} rotation={[0, 0, Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2]} scale={[r, len, r]}>
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.0} transparent opacity={a} />
      </mesh>,
    );
  }
  return <group>{segs}</group>;
};
/** smooth points through prices at successive x positions */
const curve = (x0: number, dx: number, ps: number[], steps = 8): [number, number][] => {
  const c = new THREE.CatmullRomCurve3(ps.map((p, i) => new THREE.Vector3(x0 + i * dx, py(p), 0)));
  return c.getPoints(ps.length * steps).map((v) => [v.x, v.y]);
};

/** soft radial light behind each set, for depth */
const glowTex = (() => {
  let t: THREE.Texture | null = null;
  return () => {
    if (t || typeof document === "undefined") return t;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const g = cv.getContext("2d")!;
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, "rgba(40,60,96,1)");
    gr.addColorStop(0.45, "rgba(18,28,48,0.6)");
    gr.addColorStop(1, "rgba(5,8,15,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    t = new THREE.CanvasTexture(cv);
    return t;
  };
})();
const BackGlow: React.FC<{ y?: number; s?: number; a: number; z?: number }> = ({ y = -1, s = 30, a, z = -3 }) => {
  const tex = glowTex();
  if (!tex) return null;
  return (
    <mesh position={[0, y, z]} scale={[s * 0.8, s, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent opacity={0.9 * a} depthWrite={false} />
    </mesh>
  );
};

/** a set: positioned on its x, rising in as it enters, stepping back (smaller, higher, darker) as the next one enters */
const SetGroup: React.FC<{ id: SetId; f: number; children: (a: number) => React.ReactNode }> = ({ id, f, children }) => {
  const pr = presence(f, id);
  if (!pr.on) return null;
  return (
    <group position={[SX[id], pr.dy, 0]} scale={pr.scale}>
      <BackGlow a={pr.alpha} />
      {children(pr.alpha)}
    </group>
  );
};

// ================================================================= the sets
const HookSet: React.FC<{ f: number }> = ({ f }) => {
  const s = hookAct(f);
  const holdX = cxOf(HOOK_HOLD);
  const brX = cxOf(HOOK_BREAK);
  return (
    <SetGroup id="hook" f={f}>
      {(a) => (
        <>
          <Grid a={a} />
          <Ladder a={a} />
          <Candles data={HOOK} n={s.n} a={a} />
          <Vols data={HOOK} n={s.n} a={a} hi={(i) => (i === HOOK_HOLD ? s.hold : i === HOOK_BREAK ? s.pierce : 0)} />
          {/* "that line": the support everyone draws, white, later greyed */}
          <Level p={LINE_P} c={s.line < 0.5 ? COL.steel : COL.warm} a={a * Math.max(0.25, s.line)} glow={0.4 * s.line} x0={CH_X0 - 0.3} x1={CH_X1 + 0.3} thick={0.035} />
          <Ring x={holdX} y={py(LINE_P)} k={s.hold} c={COL.up} />
          <Ring x={brX} y={py(LINE_P)} k={s.pierce} c={COL.down} />
          {/* the profile behind the line, rising on 成交最挤 */}
          <Profile a={a * s.profile} len={(i) => PROFILE[i] * ease(s.profile)} tone={profTone({ dense: 0.6 })} />
          {[VA.lo, POC_I, VA.hi].map((r, k) => (
            <Box key={k} p={[PROF_X - 0.2, py(rowPrice(r)), 0.4]} s={[0.22, 0.22, 0.22]} c={COL.gold} e={COL.gold} ei={1.2} o={a * s.marks[k]} />
          ))}
          {/* 先别急着划支撑: a dashed line starts across the chart and is taken back */}
          <Path pts={Array.from({ length: 13 }, (_, k) => [lerp(CH_X0 - 0.3, CH_X1 + 0.3, k / 12), py(LINE_P + 0.75)] as [number, number])} k={s.draw} c={COL.warm} a={a * 0.8} r={0.022} dash />
        </>
      )}
    </SetGroup>
  );
};

const MainSet: React.FC<{ f: number }> = ({ f }) => {
  const s = mainAct(f);
  const len = (i: number) => PROFILE[i] * s.grow(i, PROFILE[i]);
  const scanRow = s.scan >= 0 ? Math.round((1 - s.scan) * (ROWS - 1)) : -1;
  const lvl = (k: "poc" | "vah" | "val") => (s.focus === k ? s.focusK : 0);
  const rep = s.replay;
  const repI = Math.floor(Math.max(0, rep));
  const repP = rep >= 0 ? lerp(MAIN[repI].c, MAIN[Math.min(MAIN.length - 1, repI + 1)].c, rep - repI) : 0;
  const chips: React.ReactNode[] = [];
  if (s.chips >= 0) {
    const t = s.chips;
    const span = s.chipEnd - (f - t);
    for (let k = 0; k < 90; k++) {
      const born = k * lerp(3.2, 1.6, s.chipRate);
      if (born > span) break;
      const age = t - born;
      if (age < 0 || age > 16) continue;
      const g = rng(1000 + k);
      // heavier rows get more chips: pick a row by the profile's weights
      let pick = g() * PROFILE.reduce((x, v) => x + v, 0);
      let row = 0;
      while (row < ROWS - 1 && pick > PROFILE[row]) pick -= PROFILE[row++];
      const k01 = ease(age / 14);
      const x = lerp(CH_X0 + 1 + g() * 3, PROF_X + len(row) * PROF_L + 0.12, k01);
      const y = py(rowPrice(row)) + Math.sin(k01 * Math.PI) * 0.5;
      chips.push(<Box key={k} p={[x, y, 0.55]} s={[0.12, 0.12, 0.12]} c={COL.gold} e={COL.gold} ei={1.4} o={clamp01((16 - age) / 3)} />);
    }
  }
  return (
    <SetGroup id="main" f={f}>
      {(a) => (
        <>
          <Grid a={a} />
          <Ladder a={a * Math.max(0.35, s.ladder)} />
          {/* the period that built the profile: faint context, then replayed by the price marker */}
          <Candles data={MAIN} n={rep >= 0 ? MAIN.length : s.period > 0 ? MAIN.length : 0} a={a * Math.max(s.period, rep >= 0 ? 0.3 : 0)} glow={(i) => (rep >= 0 && Math.abs(i - rep) < 1 ? 1 - Math.abs(i - rep) : 0)} dim={(i) => (rep >= 0 && i <= rep + 1 ? 1 : 0)} />
          {rep >= 0 && <Candles data={MAIN} n={rep + 1} a={a} />}
          <Vols data={MAIN} n={rep >= 0 ? rep + 1 : 0} a={a * 0.8} />
          <Profile a={a} len={len} tone={(i) => (i === scanRow ? { c: COL.warm, ei: 0.7, o: 1 } : profTone({ dense: s.dense, poc: s.pocRow })(i))} />
          {s.caps > 0 && PROFILE.map((_, i) => <Box key={i} p={[PROF_X + len(i) * PROF_L + 0.02, py(rowPrice(i)), 0.3]} s={[0.04, ROW_H * 0.7, 0.04]} c={COL.warm} e={COL.warm} ei={1} o={a * s.caps} />)}
          <Band lo={VAL} hi={VAH} k={s.band} a={a * (1 - 0.4 * s.trick)} from={POC} o={0.1 + 0.06 * s.edges} />
          {chips}
          <Level p={POC} c={COL.gold} a={a * Math.max(s.pocRow * 0.6, s.pocLine)} glow={0.6 + 1.2 * lvl("poc")} x0={lerp(PROF_X, LADDER_X + 0.15, ease(s.pocLine))} thick={0.06 + 0.02 * lvl("poc")} />
          <Level p={VAH} c={COL.warm} a={a * s.vahLine} glow={0.4 + 1.2 * Math.max(lvl("vah"), s.edges)} ticks thick={0.035 + 0.015 * lvl("vah")} />
          <Level p={VAL} c={COL.warm} a={a * s.vahLine} glow={0.4 + 1.2 * Math.max(lvl("val"), s.edges * 0.6)} ticks thick={0.035 + 0.015 * lvl("val")} />
          {/* 不是一堵墙: for a moment the edges look like solid walls, then they melt back into rulers */}
          {s.wall > 0 &&
            [VAH, VAL].map((p, j) => <Box key={j} p={[(LADDER_X + XR) / 2, py(p) + (j === 0 ? 0.18 : -0.18), 0]} s={[XR - LADDER_X, 0.36, 1.4 * s.wall]} c={COL.steel} e={COL.warm} ei={0.08} rough={0.7} o={a * s.wall * 0.95} />)}
          {rep >= 0 && <Marker x={cxOf(rep)} y={py(repP)} a={a} />}
          {s.poll > 0 && rep >= 0 && <Ring x={cxOf(MAIN.length - 1)} y={py(VAH)} k={0.5 + 0.5 * Math.sin(f / 9) ** 2 * (1 - s.trick)} c={COL.gold} />}
        </>
      )}
    </SetGroup>
  );
};

const AcceptSet: React.FC<{ f: number }> = ({ f }) => {
  const s = acceptAct(f);
  return (
    <SetGroup id="accept" f={f}>
      {(a) => (
        <>
          <Grid a={a} />
          <Ladder a={a} />
          <Profile a={a * 0.55} len={(i) => PROFILE[i] * 0.85} tone={profTone({ dense: 1, poc: 0.4 })} />
          <Band lo={VAL} hi={VAH} k={1} a={a} />
          <Band lo={NEW_VA.lo} hi={NEW_VA.hi} k={s.newVa} a={a} c={COL.warm} o={0.08} from={NEW_VA.lo} />
          <Level p={POC} c={COL.gold} a={a * 0.8} glow={0.6} />
          <Level p={VAH} c={COL.warm} a={a} glow={1.1} ticks />
          <Level p={VAL} c={COL.warm} a={a * 0.7} glow={0.4} ticks />
          <Candles data={ACCEPT} n={s.n} a={a} glow={(i) => (i === AC_TEST ? s.test : 0)} />
          <Vols data={ACCEPT} n={s.n} a={a} hi={(i) => (i >= AC_DRIVE[0] && i <= AC_DRIVE[1] ? s.volHi : 0)} />
          <Ring x={cxOf(AC_TEST)} y={py(ACCEPT[AC_TEST].l)} k={s.test} c={COL.up} />
        </>
      )}
    </SetGroup>
  );
};

const RejectSet: React.FC<{ f: number }> = ({ f }) => {
  const s = rejectAct(f);
  return (
    <SetGroup id="reject" f={f}>
      {(a) => (
        <>
          <Grid a={a} />
          <Ladder a={a} />
          <Profile a={a * 0.55} len={(i) => PROFILE[i] * 0.85} tone={profTone({ dense: 1, poc: 0.4 })} />
          <Band lo={VAL} hi={VAH} k={1} a={a} />
          <Level p={POC} c={COL.gold} a={a * 0.8} glow={0.6} />
          <Level p={VAH} c={COL.warm} a={a} glow={1.1} ticks />
          <Level p={VAL} c={COL.warm} a={a} glow={0.4 + 0.8 * s.mirror} ticks />
          <Candles data={REJECT} n={s.n} a={a} glow={(i) => (i === RJ_POKE ? s.thin * 0.4 : 0)} />
          <Vols data={REJECT} n={s.n} a={a} hi={(i) => (i === RJ_POKE ? s.thin : 0)} />
          <Ring x={cxOf(RJ_POKE + 1)} y={py(VAH)} k={s.snap} c={COL.down} />
          <Ring x={cxOf(RJ_MIRROR + 1)} y={py(VAL)} k={s.mirror} c={COL.up} />
        </>
      )}
    </SetGroup>
  );
};

const WatchSet: React.FC<{ f: number }> = ({ f }) => {
  const s = watchAct(f);
  const last = WATCH.length - 1;
  const x0 = cxOf(last);
  const up = useMemo(() => curve(x0, CANDLE_DX * 1.15, BRANCH_UP), [x0]);
  const dn = useMemo(() => curve(x0, CANDLE_DX * 1.15, BRANCH_DN), [x0]);
  const endDn = dn[dn.length - 1];
  const pull = useMemo(() => {
    const pts: [number, number][] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      pts.push([lerp(endDn[0] + 0.15, cxOf(4), t), lerp(endDn[1], py(POC), t) + Math.sin(t * Math.PI) * 0.7]);
    }
    return pts;
  }, [endDn]);
  return (
    <SetGroup id="watch" f={f}>
      {(a) => (
        <>
          <Grid a={a} />
          <Ladder a={a} />
          <Profile a={a * 0.55} len={(i) => PROFILE[i] * 0.85} tone={profTone({ dense: 1, poc: 0.4 + 0.6 * s.pull })} />
          <Band lo={VAL} hi={VAH} k={1} a={a} o={0.1 + 0.05 * s.middle} />
          <Band lo={NEW_VA.lo} hi={NEW_VA.hi} k={s.newVa} a={a * (1 - 0.5 * s.down)} c={COL.warm} o={0.07} from={NEW_VA.lo} />
          <Level p={POC} c={COL.gold} a={a} glow={0.6 + 1.2 * s.pull} />
          <Level p={VAH} c={COL.warm} a={a} glow={0.4 + 1.2 * s.edges} ticks />
          <Level p={VAL} c={COL.warm} a={a} glow={0.4 + 1.0 * s.edges} ticks />
          <Candles data={WATCH} n={s.n} a={a} glow={(i) => (i < 10 ? s.middle * 0.5 : 0)} />
          <Vols data={WATCH} n={s.n} a={a * 0.8} />
          <Ring x={x0} y={py(VAH)} k={s.touch} c={COL.gold} />
          <Path pts={up} k={s.up} c={COL.up} a={a} />
          <Path pts={dn} k={s.down} c={COL.down} a={a} />
          <Path pts={pull} k={s.pull} c={COL.gold} a={a * 0.9} r={0.025} dash />
          {s.down > 0.98 && <Marker x={endDn[0]} y={endDn[1]} a={a} c={COL.warm} r={0.1} />}
        </>
      )}
    </SetGroup>
  );
};

// the map: the same profile laid down as terrain — price runs into the distance, height = volume
const MZ = (p: number) => -(p - 104) * 1.3;
const MAP_W = 4.2;
const MAP_HK = 1.5; // height of the tallest row on the map
const MapSet: React.FC<{ f: number }> = ({ f }) => {
  const s = mapAct(f);
  const z0 = MZ(VAH + 0.75);
  const z1 = MZ(POC + 0.25);
  const mz = lerp(z0, z1, ease(s.back));
  const rowAt = Math.round((-(mz / 1.3) + 104 - P_LO) / 0.25);
  const mh = PROFILE[Math.max(0, Math.min(ROWS - 1, rowAt))] * MAP_HK * s.rise(rowAt);
  return (
    <SetGroup id="map" f={f}>
      {(a) => (
        <>
          {PROFILE.map((v, i) => {
            const p = rowPrice(i);
            const h = 0.03 + v * MAP_HK * s.rise(i);
            const inVa = i >= VA.lo && i <= VA.hi;
            const isPoc = i === POC_I;
            const thin = Math.abs(i - LVN_I) <= 1;
            const c = isPoc && s.poc > 0 ? COL.gold : thin && s.thin > 0 ? COL.warm : inVa ? "#b9b2a3" : "#6f7a8e";
            const ei = isPoc ? 0.2 + 1.0 * s.poc : thin ? 0.05 + 0.8 * s.thin : inVa ? 0.08 : 0.03;
            return (
              <mesh key={i} geometry={rbox(MAP_W, h, 1.3 * 0.25 * 0.84, 0.04)} position={[0, h / 2, MZ(p)]}>
                <meshPhysicalMaterial color={c} emissive={c} emissiveIntensity={ei} roughness={0.35} clearcoat={0.5} transparent opacity={a * (thin && s.thin > 0 ? 1 : 0.92)} />
              </mesh>
            );
          })}
          {/* value-area sheet on the ground and its two rulers */}
          <mesh position={[0, 0.02, (MZ(VAL - 0.125) + MZ(VAH + 0.125)) / 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[MAP_W + 1.2, MZ(VAL - 0.125) - MZ(VAH + 0.125), 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={COL.gold} transparent opacity={0.16 * a * s.rise(VA.lo)} depthWrite={false} />
          </mesh>
          {[VAH + 0.125, VAL - 0.125].map((p, j) => (
            <Box key={j} p={[0, 0.05, MZ(p)]} s={[MAP_W + 1.2, 0.04, 0.04]} c={COL.warm} e={COL.warm} ei={0.9} o={a * s.rise(VA.lo)} />
          ))}
          <Marker x={1.2} y={mh + 0.35} z={mz} a={a * s.backOn} r={0.16} />
          {/* 买卖按钮: two glass keys that sink away as the map rises */}
          {s.button > 0.003 &&
            [-1, 1].map((d) => (
              <mesh key={d} geometry={rbox(1.5, 0.9, 0.5, 0.18)} position={[d * 0.95, 0.45 - 0.12 * s.press - 0.8 * (1 - s.button), 2.6]}>
                <meshPhysicalMaterial color={d < 0 ? COL.up : COL.down} emissive={d < 0 ? COL.up : COL.down} emissiveIntensity={0.35} roughness={0.2} clearcoat={1} transparent opacity={a * s.button * 0.9} />
              </mesh>
            ))}
        </>
      )}
    </SetGroup>
  );
};
export const mapPoint = (row: number, x = 0, lift = 0.2) => ({ x: SX.map + x, y: 0.03 + PROFILE[row] * MAP_HK + lift, z: MZ(rowPrice(row)) });
export const MAP_Z = MZ;

const EndSet: React.FC<{ f: number }> = ({ f }) => {
  const s = endAct(f);
  return (
    <SetGroup id="end" f={f}>
      {(a) => (
        <>
          <Grid a={a} />
          <Ladder a={a} />
          <Profile a={a * 0.8} len={(i) => PROFILE[i]} tone={profTone({ dense: 1, poc: 0.4 + 0.6 * s.poc })} />
          <Band lo={VAL} hi={VAH} k={1} a={a * 0.8} />
          <Level p={POC} c={COL.gold} a={a} glow={0.7 + 1.4 * s.poc} thick={0.06 + 0.03 * s.poc} />
          <Level p={VAH} c={COL.warm} a={a * 0.6} glow={0.4} ticks />
          <Level p={VAL} c={COL.warm} a={a * 0.6} glow={0.4} ticks />
          {s.magnet > 0 &&
            MAGNET.map((m, i) => {
              const k = ease((s.magnet - m.delay) / (1 - m.delay));
              const p = lerp(m.p0, POC + (m.p0 > POC ? 0.12 : -0.12), k);
              const x = lerp(m.x0, m.x0 * 0.85 + 0.2, k);
              const start: [number, number] = [m.x0, py(m.p0)];
              return (
                <group key={i}>
                  <Path pts={[start, [x, py(p)]]} k={1} c={COL.gold} a={a * 0.35 * clamp01(s.magnet * 3)} r={0.012} />
                  <Marker x={x} y={py(p)} a={a * clamp01(s.magnet * 4)} r={0.09} c={m.p0 > POC ? COL.up : COL.down} />
                </group>
              );
            })}
        </>
      )}
    </SetGroup>
  );
};

// ================================================================= camera rig, lights, world
const Rig: React.FC<{ f: number }> = ({ f }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const c = cam(f);
  camera.fov = c.fov;
  camera.near = 0.1;
  camera.far = 400;
  camera.setViewOffset(LAYOUT.W, LAYOUT.H, 0, LAYOUT.viewShift, LAYOUT.W, LAYOUT.H);
  camera.updateProjectionMatrix();
  camera.position.set(...c.p);
  camera.lookAt(...c.t);
  camera.updateMatrixWorld();
  return null;
};

export const World: React.FC<{ f: number }> = ({ f }) => {
  const c = cam(f);
  return (
    <>
      <Rig f={f} />
      <color attach="background" args={[COL.bg]} />
      <fog attach="fog" args={[COL.bg, 34, 95]} />
      <ambientLight intensity={0.35} color="#9fb0d0" />
      <hemisphereLight args={["#c8d4ec", "#05080f", 0.35]} />
      {/* key light follows the camera's subject so every set is lit the same way */}
      <directionalLight position={[c.t[0] + 6, c.t[1] + 10, 14]} intensity={1.6} color="#fff1dc" />
      <pointLight position={[c.t[0] - 5, c.t[1] + 2, 6]} intensity={30} distance={30} color="#e9b44c" />
      <pointLight position={[c.t[0] + 7, c.t[1] - 4, 8]} intensity={18} distance={30} color="#7d9ccc" />
      <HookSet f={f} />
      <MainSet f={f} />
      <AcceptSet f={f} />
      <RejectSet f={f} />
      <WatchSet f={f} />
      <MapSet f={f} />
      <EndSet f={f} />
    </>
  );
};
