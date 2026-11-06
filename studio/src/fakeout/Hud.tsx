// 2D layer over the set: callouts pinned to 3D points, the comparison page's dimming / highlight frames,
// focus frames, minimap, cards, title hits and captions.
// Type: Noto Serif SC 600 for titles / conclusions, Noto Sans SC 500 (700 for label titles) for
// captions and labels, IBM Plex Mono 500 for every number. Every label sits on its own dark plate.
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "./copy";
import { L, Le, S, TL, backOut, clamp01, expoOut, hold, pulse, smooth, span } from "./cue";
import { E, PUSH, REGION, ROW_BAND, ROW_I0, ROW_VOL_Y, ST_I0, ST_VOL, X_ROWS, ry, stX, sy, type Dir } from "./director";
import { mono, sans, serif } from "./fonts";
import { AFTER, CHART, LEVEL, N_AFTER, PRIOR_HIGH, bar, bx, fmt, path0, path1, py, type Outcome } from "./market";
import { PAL, TRAIL_COL, mainBars } from "./Scene";

const INK = "#F5F7FA";
const SOFT = "rgba(245,247,250,0.78)";
const PLATE = "rgba(8,11,18,0.84)";
const unpy = (y: number) => LEVEL + (y - 2.2) / 0.085;
const OUT: Outcome[] = ["A", "B", "C"];
const ROW_COL = TRAIL_COL;

type P = { x: number; y: number; ok: boolean };
type Proj = (x: number, y: number, z?: number) => P;
const useCam = (d: Dir) => {
  const { width, height } = useVideoConfig();
  const cam = new THREE.PerspectiveCamera(d.cam.fov, width / height, 0.1, 3000);
  cam.position.copy(d.cam.pos);
  cam.lookAt(d.cam.target);
  cam.updateMatrixWorld();
  const project: Proj = (x, y, z = 0) => {
    const v = new THREE.Vector3(x, y, z).project(cam);
    return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, ok: v.z < 1 && Math.abs(v.x) < 1.3 && Math.abs(v.y) < 1.3 };
  };
  /** where a screen corner (NDC) lands on the chart plane z = 0 */
  const ground = (nx: number, ny: number) => {
    const p = new THREE.Vector3(nx, ny, 0.5).unproject(cam);
    const dir = p.sub(cam.position).normalize();
    const t = -cam.position.z / dir.z;
    return cam.position.clone().add(dir.multiplyScalar(t));
  };
  return { project, ground };
};

// ---------------------------------------------------------------- the callout system
/** draw a polyline up to fraction k of its length */
const partial = (pts: { x: number; y: number }[], k: number) => {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  let left = segs.reduce((a, b) => a + b, 0) * clamp01(k);
  const out = [pts[0]];
  for (let i = 0; i < segs.length && left > 0; i++) {
    const t = Math.min(1, left / Math.max(1e-6, segs[i]));
    out.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t });
    left -= segs[i];
  }
  return out.map((p) => `${p.x},${p.y}`).join(" ");
};
type Count = { from: number; to: number; dp: number };
/** prices count in quarter-point ticks, sizes in whole contracts */
const fmtN = (x: number, dp: number) => (dp ? (Math.round(x * 4) / 4).toFixed(dp) : Math.round(x).toLocaleString("en-US"));
const TYPE = {
  md: { num: 46, title: 38, note: 34, pad: "10px 20px 12px" },
  lg: { num: 50, title: 52, note: 38, pad: "14px 26px 16px" },
};
/**
 * Every annotation in the film. Reveal order: the target is ringed, the leader grows out to the plate,
 * the key number lands first (counting up when it is a value), then the title, then the note.
 * The plate is placed by a projected 3D point, so it drifts with the camera like the chart does.
 */
const Callout: React.FC<{
  f: number;
  a: number;
  b: number;
  at: P;
  plate: P;
  via?: P;
  side: "l" | "r";
  color?: string;
  num?: string;
  count?: Count;
  title: string;
  note?: string;
  size?: "md" | "lg";
  mark?: "ring" | "dot";
}> = ({ f, a, b, at, plate, via, side, color = PAL.amber, num, count, title, note, size = "md", mark = "ring" }) => {
  const { width, height } = useVideoConfig();
  const out = 1 - span(f, b - 8, b, smooth);
  if (f < a || out < 0.01 || !at.ok) return null;
  const T = TYPE[size];
  const s = side === "r" ? 1 : -1;
  const ring = span(f, a, a + 8, expoOut);
  const draw = span(f, a + 3, a + 14, smooth);
  const kn = span(f, a + 12, a + 20, expoOut);
  const kc = span(f, a + 12, a + 30, expoOut);
  const kt = span(f, a + 20, a + 28, expoOut);
  const kd = span(f, a + 26, a + 34, expoOut);
  const end = { x: plate.x - s * 2, y: plate.y };
  const shown = count ? fmtN(count.from + (count.to - count.from) * kc, count.dp) : num;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {mark === "ring" && <circle cx={at.x} cy={at.y} r={11 + (1 - ring) * 22} fill="none" stroke={color} strokeWidth={3} opacity={ring} />}
        <circle cx={at.x} cy={at.y} r={4.5} fill={color} opacity={ring} />
        <polyline points={partial([at, ...(via ? [via] : []), end], draw)} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
      </svg>
      <div
        style={{
          position: "absolute",
          top: plate.y,
          left: side === "r" ? plate.x : undefined,
          right: side === "l" ? width - plate.x : undefined,
          transform: `translate(${s * (1 - kn) * 26}px, -50%)`,
          opacity: kn,
          padding: T.pad,
          background: PLATE,
          borderRadius: 12,
          borderLeft: side === "r" ? `6px solid ${color}` : undefined,
          borderRight: side === "l" ? `6px solid ${color}` : undefined,
          textAlign: side === "r" ? "left" : "right",
          boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap",
        }}
      >
        {shown && <div style={{ ...mono(), fontSize: T.num, lineHeight: 1.15, color }}>{shown}</div>}
        <div style={{ ...(size === "lg" ? serif() : sans(700)), fontSize: T.title, lineHeight: 1.25, color: INK, opacity: kt, transform: `translateY(${(1 - kt) * 8}px)` }}>{title}</div>
        {note && <div style={{ ...sans(500), fontSize: T.note, lineHeight: 1.3, color: SOFT, marginTop: 2, opacity: kd, transform: `translateY(${(1 - kd) * 8}px)` }}>{note}</div>}
      </div>
    </div>
  );
};

/** a bracket from p0 to p1 with end ticks pointing toward the data (nx, ny), drawn from the middle out */
const Bracket: React.FC<{ f: number; a: number; b: number; p0: P; p1: P; n: [number, number]; color?: string }> = ({ f, a, b, p0, p1, n, color = PAL.amber }) => {
  const { width, height } = useVideoConfig();
  const k = span(f, a, a + 10, smooth) * (1 - span(f, b - 8, b, smooth));
  if (k < 0.01) return null;
  const mx = (p0.x + p1.x) / 2,
    my = (p0.y + p1.y) / 2;
  const q0 = { x: mx + (p0.x - mx) * k, y: my + (p0.y - my) * k };
  const q1 = { x: mx + (p1.x - mx) * k, y: my + (p1.y - my) * k };
  const t = 16;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: k }}>
      <polyline points={`${q0.x + n[0] * t},${q0.y + n[1] * t} ${q0.x},${q0.y} ${q1.x},${q1.y} ${q1.x + n[0] * t},${q1.y + n[1] * t}`} fill="none" stroke={color} strokeWidth={3} />
    </svg>
  );
};

/** translucent focus frame + spotlight on a chart region, drawn before the push and riding it in */
const Focus: React.FC<{ f: number; a: number; b: number; region: readonly [number, number, number, number]; project: Proj }> = ({ f, a, b, region, project }) => {
  const k = span(f, a, a + 10, expoOut) * (1 - span(f, b - 10, b, smooth));
  if (k < 0.01) return null;
  const [i0, i1, p0, p1] = region;
  const pts = [project(bx(i0) - 0.4, py(p0), 0.25), project(bx(i1) + 0.4, py(p0), 0.25), project(bx(i0) - 0.4, py(p1), 0.25), project(bx(i1) + 0.4, py(p1), 0.25)];
  const x0 = Math.min(...pts.map((p) => p.x)),
    x1 = Math.max(...pts.map((p) => p.x)),
    y0 = Math.min(...pts.map((p) => p.y)),
    y1 = Math.max(...pts.map((p) => p.y));
  const grow = 1 + (1 - span(f, a, a + 10, expoOut)) * 0.18;
  const w = (x1 - x0) * grow,
    h = (y1 - y0) * grow;
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;
  const c = 34;
  return (
    <div style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, opacity: k }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 10, boxShadow: "0 0 0 4000px rgba(2,4,8,0.5)", background: "rgba(255,177,61,0.05)", border: "2px solid rgba(255,177,61,0.55)" }} />
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {[
          [0, 0, 1, 1],
          [w, 0, -1, 1],
          [0, h, 1, -1],
          [w, h, -1, -1],
        ].map(([x, y, sx, sy_], i) => (
          <polyline key={i} points={`${x},${y + sy_ * c} ${x},${y} ${x + sx * c},${y}`} fill="none" stroke={PAL.amber} strokeWidth={6} />
        ))}
      </svg>
    </div>
  );
};

/** overview of the whole chart in a corner, with the current view boxed in the same amber as the focus frame */
const MiniMap: React.FC<{ d: Dir; ground: (x: number, y: number) => THREE.Vector3 }> = ({ d, ground }) => {
  const k = d.world === "main" ? clamp01((26 - d.view.w) / 8) : 0;
  if (k < 0.01) return null;
  const W = 300,
    H = 160,
    pad = 10;
  const X = (x: number) => pad + ((x - CHART.x0) / (CHART.x1 - CHART.x0)) * (W - pad * 2);
  const Y = (p: number) => H - pad - ((p - 4630) / (5040 - 4630)) * (H - pad * 2);
  const a = ground(-1, 1),
    b = ground(1, -1);
  const vx0 = X(Math.min(a.x, b.x)),
    vx1 = X(Math.max(a.x, b.x));
  const vy0 = Y(unpy(Math.max(a.y, b.y))),
    vy1 = Y(unpy(Math.min(a.y, b.y)));
  return (
    <div style={{ position: "absolute", right: 40, top: 196, opacity: k, transform: `translateY(${(1 - k) * -12}px)` }}>
      <div style={{ ...sans(500), fontSize: 28, color: SOFT, textAlign: "right", marginBottom: 6 }}>{C.overview}</div>
      <svg width={W} height={H} style={{ display: "block", background: PLATE, borderRadius: 12, border: "1px solid rgba(245,247,250,0.18)" }}>
        <line x1={X(bx(-13))} x2={X(bx(N_AFTER + 1))} y1={Y(LEVEL)} y2={Y(LEVEL)} stroke={PAL.laser} strokeWidth={1} opacity={0.7} />
        {mainBars(d).map(({ b: bar_, i }) => {
          const col = bar_.c >= bar_.o ? PAL.up : PAL.down;
          const x = X(bx(i));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={Y(bar_.h)} y2={Y(bar_.l)} stroke={col} strokeWidth={1} />
              <rect x={x - 1.2} y={Y(Math.max(bar_.o, bar_.c))} width={2.4} height={Math.max(1, Y(Math.min(bar_.o, bar_.c)) - Y(Math.max(bar_.o, bar_.c)))} fill={col} />
            </g>
          );
        })}
        <rect x={Math.max(1, vx0)} y={Math.max(1, vy0)} width={Math.max(4, Math.min(W - 1, vx1) - Math.max(1, vx0))} height={Math.max(4, Math.min(H - 1, vy1) - Math.max(1, vy0))} fill="rgba(255,177,61,0.12)" stroke={PAL.amber} strokeWidth={2.5} rx={3} />
      </svg>
    </div>
  );
};

/** card panel for lists; contents stagger in on their own */
const Panel: React.FC<{ k: number; top: number; right?: number; children: React.ReactNode }> = ({ k, top, right = 56, children }) =>
  k < 0.01 ? null : (
    <div style={{ position: "absolute", left: 56, right, top, opacity: k, transform: `translateY(${(1 - k) * 24}px)`, padding: "24px 32px", background: "rgba(8,11,18,0.86)", border: "1px solid rgba(245,247,250,0.14)", borderRadius: 20, boxShadow: "0 24px 70px rgba(0,0,0,0.5)" }}>
      {children}
    </div>
  );

/** centred serif statement on a soft dark plate */
const Big: React.FC<{ k: number; top: number; lines: [string, string?]; size?: number; accent?: string; glow?: number }> = ({ k, top, lines, size = 96, accent = PAL.amber, glow = 0 }) =>
  k < 0.01 ? null : (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 1100, height: 360, transform: "translate(-50%,-50%)", background: "radial-gradient(closest-side, rgba(4,6,12,0.88), rgba(4,6,12,0))", opacity: k }} />
      {lines.filter(Boolean).map((l, i) => {
        const ki = span(k, i * 0.3, 0.7 + i * 0.3, backOut);
        return (
          <div key={i} style={{ position: "relative", ...serif(), fontSize: size, lineHeight: 1.3, color: i ? accent : INK, opacity: Math.min(1, ki * 1.5), transform: `translateY(${(1 - ki) * 24}px)`, letterSpacing: 2, textShadow: glow ? `0 0 ${30 * glow}px rgba(230,246,255,${0.5 * glow})` : undefined }}>
            {l}
          </div>
        );
      })}
    </div>
  );

// ---------------------------------------------------------------- captions
const KEY = ["假突破", "失败突破", "回踩确认", "直接接受", "回踩", "接受度", "接受", "吸收", "止损", "Delta", "失效点", "限价卖单", "概率", "违规", "背离", "缩小"];
const NO_BURN = new Set(["c5", "r0", "e3", "e4"]);
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = TL.captions.find((k) => f >= k.from && f < k.to);
  if (!c || NO_BURN.has(c.line)) return null;
  const k = span(f, c.from, c.from + 4) * (1 - span(f, c.to - 3, c.to));
  const re = new RegExp(`(${KEY.join("|")})`);
  return (
    <div style={{ position: "absolute", left: 48, right: 48, top: 1440, textAlign: "center", opacity: k }}>
      <span style={{ display: "inline-block", maxWidth: 984, padding: "8px 28px 10px", borderRadius: 14, background: "rgba(6,8,14,0.78)", ...sans(500), fontSize: 56, lineHeight: 1.3, color: INK, letterSpacing: 1 }}>
        {c.text.split(re).map((s, i) => (KEY.includes(s) ? <span key={i} style={{ color: PAL.amber, ...(s === "Delta" ? mono() : {}) }}>{s}</span> : s))}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------- story chart: hook, fan, the three solos
/** where each solo's callouts go: target, optional elbow, plate (bar index, price), side */
type Spot = { at: [number, number]; via?: [number, number]; plate: [number, number]; side: "l" | "r"; vol?: boolean };
const SOLO_SPOTS: Record<Outcome, Spot[]> = {
  A: [
    { at: [2, 5009], via: [2, 4991], plate: [2.7, 4991], side: "r" },
    { at: [1, 2400], plate: [2.7, 4964], side: "r", vol: true },
    { at: [11, 5045], plate: [-2.4, 5036], side: "l" },
  ],
  B: [
    { at: [2, 4999.5], via: [2, 4988], plate: [2.7, 4988], side: "r" },
    { at: [3, 1050], plate: [2.7, 4962], side: "r", vol: true },
    { at: [5, 5010], plate: [-2.4, 5024], side: "l" },
  ],
  C: [
    { at: [1, 5016], plate: [3, 5030], side: "r" },
    { at: [2, 4978], plate: [-2.2, 4956], side: "l" },
    { at: [12, 4950.5], plate: [7, 4936], side: "l" },
  ],
};
const SOLO_COUNTS: Record<Outcome, (Count | undefined)[]> = {
  A: [{ from: 5000, to: 5009, dp: 2 }, { from: 0, to: 2400, dp: 0 }, { from: 5009, to: 5040, dp: 2 }],
  B: [{ from: 5008, to: 4999.5, dp: 2 }, undefined, { from: 0, to: 2300, dp: 0 }],
  C: [{ from: 5008, to: 5016, dp: 2 }, { from: 5016, to: 4978, dp: 2 }, { from: 4978, to: 4950.5, dp: 2 }],
};
const SOLO_AXIS: Record<Outcome, number[]> = { A: [5000, 5020, 5040], B: [5000, 5020], C: [4960, 4980, 5000] };

/** a plate position offset from its target in screen pixels (used on the main chart's close-ups) */
const off = (at: P, dx: number, dy: number): P => ({ x: at.x + dx, y: at.y + dy, ok: at.ok });

const Story: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  if (d.world !== "story") return null;
  const St = d.story;
  const sp = (i: number, p: number, z = 0) => pr(stX(i), sy(p), z);
  const vp = (i: number, v: number) => pr(stX(i), ST_VOL.y + (v / 3400) * ST_VOL.h, 0);

  // ---- hook ticker: the newest close while the chart builds, then the breakout bar live
  const nIdx = Math.max(0, Math.min(-ST_I0 - 1, Math.ceil(St.n) - 1));
  const price = St.u0 > 0 ? path0(St.u0) : bar("C", ST_I0 + nIdx).o + (bar("C", ST_I0 + nIdx).c - bar("C", ST_I0 + nIdx).o) * clamp01(St.n - nIdx);
  const tickK = span(f, E("revealFrom") + 6, E("revealFrom") + 16) * (1 - span(f, E("fanFrom") + 10, E("fanFrom") + 24));
  const above = price >= LEVEL;
  const kick = pulse(f, E("hookPierce"), 6);
  const near = clamp01((price - 4980) / 6);

  // ---- fan: one badge at each trail head
  const fanK = span(f, E("fanTo") - 16, E("fanTo") - 2, expoOut) * (1 - span(f, E("soloA") - 2, E("soloA") + 10));
  return (
    <>
      {tickK > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 196, textAlign: "center", opacity: tickK, transform: `scale(${1 + kick * 0.1}) translate(${Math.sin(f * 7) * kick * 12}px, 0)` }}>
          <div style={{ display: "inline-block", padding: "6px 30px 10px", borderRadius: 18, background: "rgba(6,8,14,0.72)" }}>
            <div style={{ ...mono(), fontSize: 116, letterSpacing: -2, color: above ? PAL.up : INK, textShadow: above ? `0 0 ${20 + kick * 40}px ${PAL.up}88` : undefined }}>
              {above ? "▲" : ""}
              {fmt(Math.round(price * 4) / 4)}
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "center", marginTop: 4 }}>
              <span style={{ ...sans(500), fontSize: 34, color: SOFT }}>{C.levelShort}</span>
              <span style={{ ...mono(), fontSize: 34, color: INK }}>5000.00</span>
              <span style={{ ...sans(700), fontSize: 34, color: "#04060c", background: above ? PAL.up : "rgba(245,247,250,0.75)", padding: "0 14px", borderRadius: 6, opacity: above ? 1 : near, transform: `scale(${1 + kick * 0.3})` }}>
                {above ? C.status.above : C.status.near}
              </span>
            </div>
          </div>
        </div>
      )}
      {fanK > 0.01 &&
        OUT.map((o) => {
          // A sits above its trail, B in the gap between B and the level, C under its own head
          const anchor = o === "A" ? sp(9, 5046, 0.25) : o === "B" ? sp(9, 5009, 0.25) : sp(11, 4944, 0.25);
          return (
            <div key={o} style={{ position: "absolute", right: 1080 - anchor.x, top: anchor.y - 26, display: "flex", alignItems: "center", gap: 10, padding: "3px 14px 5px 5px", background: PLATE, borderRadius: 10, opacity: fanK, transform: `translateX(${(1 - fanK) * 20}px)`, whiteSpace: "nowrap" }}>
              <span style={{ ...mono(), fontSize: 30, color: "#04060c", background: ROW_COL[o], borderRadius: 7, padding: "0 10px" }}>{o}</span>
              <span style={{ ...sans(700), fontSize: 34, color: INK }}>{C.rows[o][1]}</span>
            </div>
          );
        })}

      {OUT.map((o) => {
        const k = St.solo[o] * (o === "C" ? 1 - span(f, L("c5") - 6, L("c5") + 4) : 1);
        if (k < 0.01) return null;
        const kt = span(k, 0, 1, expoOut);
        const spots = SOLO_SPOTS[o];
        const copy = C[o.toLowerCase() as "a" | "b" | "c"];
        const line = o === "A" ? "c2" : o === "B" ? "c3" : "c4";
        const at0 = [L(line) + 50, L(line) + 96, L(line) + (o === "B" ? 156 : 136)];
        const end = o === "A" ? E("swapB") + 4 : o === "B" ? E("swapC") + 4 : L("c5") + 2;
        return (
          <div key={o}>
            {/* title in the empty band above the chart */}
            <div style={{ position: "absolute", left: 56, top: 186, opacity: kt, transform: `translateX(${(1 - kt) * -30}px)`, display: "flex", alignItems: "center", gap: 20 }}>
              <span style={{ ...mono(), fontSize: 64, lineHeight: 1, color: "#04060c", background: ROW_COL[o], borderRadius: 14, padding: "8px 20px 10px", boxShadow: `0 0 40px ${ROW_COL[o]}66` }}>{o}</span>
              <div>
                <div style={{ ...serif(), fontSize: 76, lineHeight: 1.1, color: INK, letterSpacing: 4 }}>{C.rows[o][1]}</div>
                <div style={{ ...mono(), fontSize: 26, letterSpacing: 6, color: ROW_COL[o], marginTop: 6 }}>
                  ENDING {o} · {C.soloEn[o]}
                </div>
              </div>
            </div>
            {/* price axis on the right edge */}
            {SOLO_AXIS[o].map((p) => {
              const at = sp(N_AFTER + 1.4, p, 0);
              return (
                <div key={p} style={{ position: "absolute", left: at.x, top: at.y - 18, ...mono(), fontSize: 26, color: p === LEVEL ? INK : SOFT, padding: "1px 8px", background: "rgba(8,11,18,0.7)", borderRadius: 6, opacity: kt * 0.95 }}>
                  {p}
                </div>
              );
            })}
            {St.vol > 0.01 && (o === "A" || o === "B") && (
              <div style={{ position: "absolute", left: vp(ST_VOL.i0, 0).x - 8, top: vp(ST_VOL.i0, 0).y + 10, ...sans(500), fontSize: 28, color: SOFT, opacity: St.vol * kt }}>{C.vol}</div>
            )}
            {o === "B" && (
              <Bracket f={f} a={at0[1] - 6} b={end} p0={vp(1.75, 1150)} p1={vp(4.25, 1150)} n={[0, 1]} color={PAL.amber} />
            )}
            {spots.map((s, i) => {
              const [ai, ap] = s.at;
              const at = s.vol ? vp(ai, ap) : sp(ai, ap, 0.2);
              const [num, title, note] = copy[i];
              return (
                <Callout
                  key={i}
                  f={f}
                  a={at0[i]}
                  b={end}
                  at={o === "B" && i === 1 ? vp(3, 1150 + 300) : at}
                  via={s.via ? sp(s.via[0], s.via[1], 0.2) : undefined}
                  plate={sp(s.plate[0], s.plate[1], 0.2)}
                  side={s.side}
                  color={o === "C" && i === 0 ? PAL.amber : ROW_COL[o]}
                  num={num}
                  count={SOLO_COUNTS[o][i]}
                  title={title}
                  note={note}
                  mark={o === "B" && i === 1 ? "dot" : "ring"}
                />
              );
            })}
          </div>
        );
      })}

      <Big k={hold(f, L("c5") + 2, L("c5") + 76, 10)} top={168} lines={[C.knock[0], C.knock[1]]} size={66} />
      <Big k={hold(f, L("c5") + 70, S("mechanism") + 8, 10)} top={196} lines={[C.toC]} size={66} />
    </>
  );
};

// ---------------------------------------------------------------- comparison page
/** project a row-local point (the row group is scaled about its origin) */
const rowPt = (d: Dir, pr: Proj, o: Outcome, x: number, y: number, z = 0): P => pr(X_ROWS + x * d.rows.s[o], d.rows.y[o] + y * d.rows.s[o], z);
const rowRect = (d: Dir, pr: Proj, o: Outcome) => {
  const a = rowPt(d, pr, o, bx(ROW_I0) - 0.7, ROW_BAND.y1);
  const b = rowPt(d, pr, o, bx(N_AFTER) + 0.7, ROW_BAND.y0);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
};

const Rows: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const R = d.rows;
  if (d.world !== "rows" || R.chrome < 0.01) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: R.chrome }}>
      {OUT.map((o) => {
        const r = rowRect(d, pr, o);
        const act = R.act[o];
        const dim = 0.7 * R.focus * (1 - act); // inactive rows drop to ~30% brightness
        const lv = rowPt(d, pr, o, bx(N_AFTER) + 0.7, ry(LEVEL));
        const vol = rowPt(d, pr, o, bx(ROW_I0) - 0.4, ROW_VOL_Y + 0.5);
        return (
          <div key={o}>
            {act > 0.01 && <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 14, background: "radial-gradient(60% 70% at 62% 45%, rgba(255,236,200,0.16), rgba(255,236,200,0))", mixBlendMode: "screen", opacity: act }} />}
            <div style={{ position: "absolute", left: r.x + 18, top: r.y + 12, display: "flex", alignItems: "center", gap: 12, padding: "4px 14px 6px 6px", background: PLATE, borderRadius: 10 }}>
              <span style={{ ...mono(), fontSize: 30, color: "#04060c", background: ROW_COL[o], borderRadius: 8, padding: "0 10px" }}>{o}</span>
              <span style={{ ...sans(700), fontSize: 38, color: INK }}>{C.rows[o][1]}</span>
            </div>
            <div style={{ position: "absolute", left: lv.x - 104, top: lv.y - 42, ...mono(), fontSize: 28, color: SOFT }}>5000</div>
            {R.vol[o] > 0.01 && <div style={{ position: "absolute", left: vol.x + 6, top: vol.y - 20, ...sans(500), fontSize: 30, color: SOFT, padding: "0 10px", background: PLATE, borderRadius: 6, opacity: R.vol[o] }}>{C.vol}</div>}
            {dim > 0.01 && <div style={{ position: "absolute", left: r.x - 6, top: r.y - 6, width: r.w + 12, height: r.h + 12, background: "#04060c", opacity: dim, borderRadius: 16 }} />}
            {act > 0.01 && <div style={{ position: "absolute", left: r.x - 4, top: r.y - 4, width: r.w + 8, height: r.h + 8, borderRadius: 16, border: `3px solid ${ROW_COL[o]}`, boxShadow: `0 0 36px ${ROW_COL[o]}55`, opacity: act }} />}
          </div>
        );
      })}
    </div>
  );
};

/** a dashed price line across one row from bar i0 to the right edge, with a mono label */
const RowLine: React.FC<{ d: Dir; pr: Proj; o: Outcome; p: number; i0: number; k: number; label: string; color?: string }> = ({ d, pr, o, p, i0, k, label, color = PAL.amber }) => {
  if (k < 0.01) return null;
  const a = rowPt(d, pr, o, bx(i0) - 0.3, ry(p));
  const b = rowPt(d, pr, o, bx(N_AFTER) + 0.4, ry(p));
  const draw = span(k, 0, 0.6, (x) => x);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: k }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * draw} y2={b.y} stroke={color} strokeWidth={4} strokeDasharray="14 10" />
      </svg>
      <div style={{ position: "absolute", right: 1080 - b.x, top: b.y + 8, ...mono(), fontSize: 30, color: INK, padding: "2px 14px 4px", background: PLATE, borderRadius: 8, borderRight: `5px solid ${color}`, opacity: span(k, 0.4, 1) }}>{label}</div>
    </div>
  );
};

const Respond: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  if (d.world !== "rows") return null;
  const rp = (o: Outcome, i: number, p: number, z = 0.2) => rowPt(d, pr, o, bx(i), ry(p), z);
  const r0 = S("respond"),
    e0 = S("close");
  const steps = [L("r1"), L("r1") + 44, L("r2"), L("r4"), L("r4") + 54];
  const cur = steps.filter((a) => f >= a).length - 1;
  const kc = span(f, steps[Math.max(0, cur)], steps[Math.max(0, cur)] + 8, expoOut);
  const kSteps = hold(f, L("r1") - 4, e0 + 6, 12);
  const top = rowRect(d, pr, "A"),
    bot = rowRect(d, pr, "C");
  const xb = rp("A", 0, LEVEL).x;
  const kNo = hold(f, L("r1") + 2, L("r2") - 2, 10);
  const kRisk = hold(f, L("r4") + 26, Le("r4") + 14, 12);
  const cRow = rowRect(d, pr, "C");
  const entry = rp("B", 5, 5009);
  const stop = rp("B", 5, 4998.5);
  const riskV = span(f, L("r4") + 50, L("r4") + 80, expoOut);
  return (
    <>
      <Big k={hold(f, r0 + 2, L("r1") - 4, 10)} top={820} lines={[C.howQ]} size={78} />

      {/* five steps along the top; the current one is spelled out */}
      {kSteps > 0.01 && (
        <div style={{ position: "absolute", left: 48, right: 48, top: 176, opacity: kSteps, display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {C.steps.map((_, i) => (
              <span key={i} style={{ width: 46, height: 46, borderRadius: 23, display: "flex", alignItems: "center", justifyContent: "center", background: i <= cur ? PAL.amber : "transparent", border: `2px solid ${PAL.amber}`, ...mono(), fontSize: 26, color: i <= cur ? "#04060c" : PAL.amber, opacity: i <= cur ? 1 : 0.5 }}>
                {i + 1}
              </span>
            ))}
          </div>
          {cur >= 0 && <span style={{ ...sans(700), fontSize: 44, color: INK, opacity: kc, transform: `translateX(${(1 - kc) * 14}px)`, padding: "0 16px 4px", background: PLATE, borderRadius: 10 }}>{C.steps[cur]}</span>}
        </div>
      )}

      {/* do not chase the breakout bar: one band through all three rows, the note in A's empty sky */}
      {kNo > 0.01 && (
        <div style={{ position: "absolute", inset: 0, opacity: kNo }}>
          <div style={{ position: "absolute", left: xb - 18, top: top.y, width: 36, height: (bot.y + bot.h - top.y) * span(f, L("r1") + 2, L("r1") + 16, smooth), background: "rgba(20,196,124,0.12)", border: `2px solid ${PAL.down}`, borderRadius: 10, boxShadow: `0 0 30px ${PAL.down}44` }} />
        </div>
      )}
      <Callout f={f} a={L("r1") + 10} b={L("r2") - 2} at={rp("A", 0, 5011)} via={rp("A", -1.2, 5036)} plate={rp("A", -1.6, 5036)} side="l" color={PAL.down} title={C.noChase[0]} note={C.noChase[1]} mark="dot" />

      {/* B: the plan lives in the dimmed A row, the leader runs down to B's retest */}
      <Callout f={f} a={L("r2") + 12} b={L("r3") - 4} at={rp("B", 3, 5000.75)} plate={rp("A", -1.5, 4971)} side="l" color={PAL.amber} count={{ from: 5008, to: 4999.5, dp: 2 }} title={C.planB[0]} note={C.planB[1]} size="lg" />
      <RowLine d={d} pr={pr} o="B" p={4998.5} i0={2} k={Math.max(hold(f, L("r2") + 46, L("r3") - 2, 12), hold(f, L("r4") - 4, Le("r4") + 14, 12))} label={C.invalidB} />

      {/* C: the plan lives in the dimmed B row, the leader runs down to C's failed rebound */}
      <Callout f={f} a={L("r3") + 12} b={L("r4") - 4} at={rp("C", 4, 4998.5)} plate={rp("B", -1.5, 4971)} side="l" color={PAL.down} count={{ from: 4978, to: 4998.5, dp: 2 }} title={C.planC[0]} note={C.planC[1]} size="lg" />
      <RowLine d={d} pr={pr} o="C" p={5000} i0={3} k={hold(f, L("r3") + 46, L("r4") - 2, 12)} label={C.invalidC} color={PAL.down} />

      {/* risk: a wide card across the dimmed C row, tied back to B's entry and invalidation */}
      {kRisk > 0.01 && (
        <div style={{ position: "absolute", inset: 0, opacity: kRisk }}>
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            <line x1={entry.x + 30} y1={entry.y} x2={entry.x + 30} y2={stop.y} stroke={PAL.amber} strokeWidth={3} />
            <line x1={entry.x + 22} y1={entry.y} x2={entry.x + 38} y2={entry.y} stroke={PAL.amber} strokeWidth={3} />
            <polyline points={partial([{ x: entry.x + 30, y: (entry.y + stop.y) / 2 }, { x: entry.x + 30, y: cRow.y + 40 }], span(f, L("r4") + 26, L("r4") + 40))} fill="none" stroke={PAL.amber} strokeWidth={3} />
          </svg>
          <div style={{ position: "absolute", left: 56, right: 56, top: cRow.y + 40, padding: "18px 30px 20px", background: "rgba(8,11,18,0.9)", border: `2px solid ${PAL.amber}`, borderRadius: 18, transform: `translateY(${(1 - kRisk) * 24}px)` }}>
            <div style={{ ...serif(), fontSize: 50, color: PAL.amber }}>{C.riskTitle}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
              {[
                [C.riskRows[0], C.riskEntry, INK],
                [C.riskRows[1], C.riskStop, INK],
                [C.riskRows[2], `${(10.5 * riskV).toFixed(2)} ${C.pts}`, PAL.amber],
              ].map(([k, v, col], i) => {
                const ki = span(f, L("r4") + 34 + i * 10, L("r4") + 44 + i * 10, expoOut);
                return (
                  <div key={k} style={{ opacity: ki, transform: `translateY(${(1 - ki) * 10}px)` }}>
                    <div style={{ ...sans(500), fontSize: 34, color: SOFT }}>{k}</div>
                    <div style={{ ...mono(), fontSize: 46, color: col }}>{v}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ ...sans(500), fontSize: 36, color: INK, marginTop: 10, opacity: span(f, L("r4") + 80, L("r4") + 90) }}>{C.riskNote}</div>
          </div>
        </div>
      )}
    </>
  );
};

const Close: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  if (d.world !== "rows") return null;
  const rp = (o: Outcome, i: number, p: number) => rowPt(d, pr, o, bx(i), ry(p), 0);
  const kAfter = hold(f, L("e2") + 30, E("rewind0") + 4, 12);
  const top = rowRect(d, pr, "A"),
    bot = rowRect(d, pr, "C");
  const xb = rp("A", 0.5, LEVEL).x;
  const lvl = pr(X_ROWS + bx(-3), d.rows.y.B + ry(LEVEL), 0);
  const qK = span(f, E("question"), E("question") + 12, expoOut);
  return (
    <>
      <Big k={hold(f, L("e1") - 4, L("e3") - 10, 10)} top={150} lines={[C.why]} size={60} />
      {kAfter > 0.01 && (
        <div style={{ position: "absolute", inset: 0, opacity: kAfter }}>
          <div style={{ position: "absolute", left: xb - 2, top: top.y, width: 4, height: (bot.y + bot.h - top.y) * span(f, L("e2") + 30, L("e2") + 46, smooth), background: PAL.amber, boxShadow: `0 0 16px ${PAL.amber}` }} />
          <div style={{ position: "absolute", left: xb + 14, top: top.y - 58, ...sans(700), fontSize: 36, color: INK, whiteSpace: "nowrap", padding: "2px 14px 4px", background: PLATE, borderRadius: 8, borderLeft: `5px solid ${PAL.amber}` }}>{C.after} →</div>
          {OUT.map((o, i) => {
            const r = rowRect(d, pr, o);
            const ki = span(f, L("e2") + 96 + i * 30, L("e2") + 106 + i * 30, expoOut);
            return (
              <div key={o} style={{ position: "absolute", right: 1080 - (r.x + r.w) + 18, top: r.y + r.h - 70, ...serif(), fontSize: 42, color: INK, padding: "2px 18px 6px", background: PLATE, borderRadius: 10, borderRight: `6px solid ${ROW_COL[o]}`, opacity: ki, transform: `translateX(${(1 - ki) * 24}px)` }}>
                {C.verdict[o]}
              </div>
            );
          })}
        </div>
      )}
      <Big k={hold(f, L("e3") - 2, E("question") + 2, 10)} top={560} lines={[C.endQ1]} size={60} />
      {qK > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: lvl.y + 70, textAlign: "center", opacity: qK, transform: `translateY(${(1 - qK) * 30}px) scale(${1.08 - 0.08 * qK})` }}>
          <div style={{ ...serif(), fontSize: 110, color: INK, letterSpacing: 4, textShadow: "0 0 40px rgba(230,246,255,0.35)" }}>{C.endQ2}</div>
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1480, textAlign: "center", opacity: span(f, E("question") + 24, E("question") + 40) }}>
        <span style={{ ...sans(500), fontSize: 34, letterSpacing: 3, color: INK, padding: "6px 22px", background: "rgba(6,8,14,0.78)", borderRadius: 10 }}>{C.disclaimer}</span>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- main
export const Hud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const { project: pr, ground } = useCam(d);
  const main = d.world === "main";
  const s0 = S("signals"),
    r0 = S("respond");
  const full = main ? clamp01((d.view.w - 30) / 12) : 0;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,6,12,0.7) 0%, rgba(4,6,12,0) 16%, rgba(4,6,12,0) 70%, rgba(4,6,12,0.75) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: d.flash * 0.14, mixBlendMode: "screen" }} />

      <Rows d={d} pr={pr} />

      {/* main chart: focus frames before each push, price axis in the full view */}
      {main && <Focus f={f} a={PUSH.prior[0] - 22} b={PUSH.prior[1] + 14} region={REGION.prior} project={pr} />}
      {main && <Focus f={f} a={PUSH.close[0] - 22} b={PUSH.close[1] + 14} region={REGION.close} project={pr} />}
      {full > 0.01 &&
        [4700, 4800, 4900, 5000].map((p) => {
          const at = pr(bx(N_AFTER + 2) + 0.9, py(p), 0);
          return (
            <div key={p} style={{ position: "absolute", left: Math.min(at.x + 8, 1080 - 128), top: at.y - 20, ...mono(), fontSize: 28, color: SOFT, opacity: full * 0.9, padding: "2px 8px", background: "rgba(8,11,18,0.6)", borderRadius: 6 }}>
              {p}
            </div>
          );
        })}

      {/* chrome */}
      <div style={{ position: "absolute", left: 48, right: 48, top: 112, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: span(f, 4, 18) }}>
        <span style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 3 }}>{C.series}</span>
        <span style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 2, padding: "2px 12px", background: "rgba(8,11,18,0.6)", border: "1px solid rgba(245,247,250,0.25)", borderRadius: 6 }}>{C.tag}</span>
      </div>
      <MiniMap d={d} ground={ground} />

      <Story d={d} pr={pr} />
      <Respond d={d} pr={pr} />
      <Close d={d} pr={pr} />

      {/* fade between places */}
      {d.dip > 0.01 && <div style={{ position: "absolute", inset: 0, background: "#04060c", opacity: smooth(d.dip) }} />}

      {/* ================= MECHANISM (main chart) ================= */}
      {main && (
        <>
          <Callout f={f} a={PUSH.prior[1] + 2} b={L("m2") + 6} at={pr(bx(PRIOR_HIGH), py(5000), 0)} plate={off(pr(bx(PRIOR_HIGH), py(5000), 0), 74, -138)} side="r" num="5000.00" title={C.priorHigh[0].replace(" 5000.00", "")} note={C.priorHigh[1]} />
          <Callout f={f} a={L("m2") + 34} b={L("m4") - 6} at={pr(-0.9, py(5006.5), 0.3)} plate={off(pr(-0.9, py(5006.5), 0.3), -54, -188)} side="l" title={C.buyStops[0]} note={C.buyStops[1]} />
          <Callout f={f} a={L("m4") + 32} b={L("m5") + 24} at={pr(bx(1) - 1.15, py(5016), 0.4)} plate={off(pr(bx(1) - 1.15, py(5016), 0.4), -64, -138)} side="l" color={PAL.violet} title={C.sellWall[0]} note={C.sellWall[1]} />
        </>
      )}
      {main &&
        (() => {
          const k = hold(f, L("m5") + 16, L("m6") + 4, 10);
          if (k < 0.01) return null;
          const t0 = L("m5") + 16;
          const buys = Math.round(span(f, t0 + 14, Le("m5"), (x) => x) * 2400);
          const u1 = d.main.u[1];
          const p = Math.round(path1(u1) * 4) / 4;
          return (
            <Panel k={k} top={390}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ ...serif(), fontSize: 64, color: INK }}>{C.absorb}</span>
                <span style={{ ...sans(500), fontSize: 30, color: SOFT }}>{C.absorbNote}</span>
              </div>
              {[
                [C.absorbRows[0], `+${buys.toLocaleString("en-US")}`, Math.min(1, buys / 2400), PAL.up, t0 + 7],
                [C.absorbRows[1], fmt(p), 0.04, INK, t0 + 14],
              ].map(([name, val, w, col, at]) => {
                const ki = span(f, at as number, (at as number) + 8, expoOut);
                return (
                  <div key={name as string} style={{ display: "grid", gridTemplateColumns: "150px 1fr 230px", alignItems: "center", gap: 18, marginTop: 14, opacity: ki }}>
                    <span style={{ ...sans(500), fontSize: 36, color: SOFT }}>{name}</span>
                    <div style={{ height: 14, background: "rgba(255,255,255,0.08)", borderRadius: 7 }}>
                      <div style={{ width: `${(w as number) * 100}%`, height: "100%", borderRadius: 7, background: col as string }} />
                    </div>
                    <span style={{ ...mono(), fontSize: 42, color: INK, textAlign: "right" }}>{val}</span>
                  </div>
                );
              })}
              <div style={{ ...serif(), fontSize: 44, color: PAL.amber, marginTop: 16, opacity: span(f, Le("m5") - 50, Le("m5") - 40) }}>{C.absorbEnd}</div>
            </Panel>
          );
        })()}
      {main &&
        (() => {
          // delta divergence: definition, the two values on the chart, then the conclusion
          const both = (a: number, b: number, ka: number) => (
            <>
              <Panel k={hold(f, a, b, 10)} top={390}>
                <div style={{ ...sans(700), fontSize: 40, color: INK }}>{C.deltaDef}</div>
                <div style={{ ...sans(500), fontSize: 34, color: SOFT, marginTop: 4 }}>{C.deltaNot}</div>
                <div style={{ ...serif(), fontSize: 44, color: PAL.amber, marginTop: 12, opacity: span(f, ka, ka + 10) }}>{C.deltaEnd}</div>
              </Panel>
              <Callout f={f} a={a + 30} b={b} at={pr(bx(PRIOR_HIGH), py(5000), 0)} plate={off(pr(bx(PRIOR_HIGH), py(5000), 0), 64, -138)} side="r" count={{ from: 0, to: 620, dp: 0 }} title={C.deltaPrior[0].replace(" +620", "")} note={C.deltaPrior[1]} />
              <Callout f={f} a={a + 76} b={b} at={pr(bx(1), py(5016), 0)} plate={off(pr(bx(1), py(5016), 0), -64, 182)} side="l" color={PAL.laser} count={{ from: 0, to: 180, dp: 0 }} title={C.deltaNew[0].replace(" +180", "")} note={C.deltaNew[1]} />
            </>
          );
          return (
            <>
              {both(L("m6") + 6, Le("m6") + 14, L("m6") + 170)}
              {both(L("s3") + 6, Le("s3") + 10, L("s3") + 60)}
              {(() => {
                const k = d.deltaStrip;
                if (k < 0.01) return null;
                const at = pr(bx(-14) - 0.6, py(4930), 0);
                return <div style={{ position: "absolute", left: at.x - 120, top: at.y - 22, ...mono(), fontSize: 30, color: SOFT, padding: "0 10px", background: PLATE, borderRadius: 6, opacity: k }}>{C.delta}</div>;
              })()}
            </>
          );
        })()}
      {main && (
        <>
          <Callout f={f} a={L("m7") + 30} b={Le("m7") + 14} at={pr(bx(2), py(5018), 0.7)} plate={off(pr(bx(2), py(5018), 0.7), 54, -178)} side="r" num="≈ 0" title={C.accept[0].replace(" ≈ 0", "")} note={C.accept[1]} />
          <Callout f={f} a={E("crash") + 10} b={L("m9") - 4} at={pr(bx(2) - 1.2, py(4992), 0.4)} plate={off(pr(bx(2) - 1.2, py(4992), 0.4), 74, 242)} side="r" color={PAL.down} title={C.sellStops[0]} note={C.sellStops[1]} />
        </>
      )}
      {main &&
        (() => {
          const k = hold(f, L("m9") - 4, s0 + 6, 12);
          return (
            <Panel k={k} top={250}>
              {C.normal.map((s, i) => {
                const ki = span(f, L("m9") + 6 + i * 8, L("m9") + 16 + i * 8, expoOut);
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 10, opacity: ki, transform: `translateX(${(1 - ki) * 24}px)` }}>
                    <span style={{ ...mono(), fontSize: 30, color: PAL.amber }}>0{i + 1}</span>
                    <span style={{ ...sans(500), fontSize: 40, color: INK }}>{s}</span>
                  </div>
                );
              })}
              <div style={{ ...serif(), fontSize: 60, color: PAL.amber, opacity: span(f, L("m9") + 50, L("m9") + 60), marginTop: 2 }}>{C.notManip}</div>
              <div style={{ height: 1, background: "rgba(245,247,250,0.18)", margin: "14px 0", opacity: span(f, L("m9") + 80, L("m9") + 90) }} />
              <div style={{ opacity: span(f, L("m9") + 96, L("m9") + 106) }}>
                <div style={{ ...sans(700), fontSize: 40, color: "#ff97a3" }}>{C.spoof[0]}</div>
                <div style={{ ...sans(500), fontSize: 34, color: SOFT, marginTop: 4, opacity: span(f, L("m9") + 104, L("m9") + 114) }}>{C.spoof[1]}</div>
              </div>
            </Panel>
          );
        })()}

      {/* ================= SIGNALS (main chart) ================= */}
      <Big k={main ? hold(f, L("s1"), PUSH.close[0] + 4, 10) : 0} top={330} lines={[C.signalsTitle]} size={96} />
      {main &&
        (() => {
          const k = hold(f, PUSH.close[0], r0, 12);
          if (k < 0.01) return null;
          const at = [L("s2"), L("s3"), L("s4")];
          return (
            <div style={{ position: "absolute", left: 48, right: 360, top: 200, opacity: k, display: "flex", flexDirection: "column", gap: 8 }}>
              {C.signals.map((s, i) => {
                const live = f >= at[i] && f < (at[i + 1] ?? L("s5"));
                const done = f >= (at[i + 1] ?? L("s5"));
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 16px", borderRadius: 10, background: live ? "rgba(46,32,10,0.9)" : PLATE, border: `2px solid ${live ? PAL.amber : "rgba(245,247,250,0.12)"}`, opacity: live ? 1 : done ? 0.75 : 0.5 }}>
                    <span style={{ ...mono(), fontSize: 30, color: live || done ? PAL.amber : SOFT }}>0{i + 1}</span>
                    <span style={{ ...sans(500), fontSize: 34, color: INK }}>{s}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      {main && (
        <>
          <Callout f={f} a={L("s2") + 16} b={L("s3") - 2} at={pr(bx(2) + 0.19, py(4978), 0.2)} plate={off(pr(bx(2) + 0.19, py(4978), 0.2), 74, 142)} side="r" color={PAL.down} count={{ from: 5003, to: 4978, dp: 2 }} title={C.closeIn[0].replace(" 4978.00", "")} note={C.closeIn[1]} />
          <Callout f={f} a={L("s4") + 20} b={L("s5") + 4} at={pr(bx(4), py(4998.5), 0)} plate={off(pr(bx(4), py(4998.5), 0), 94, -118)} side="r" color={PAL.down} count={{ from: 4978, to: 4998.5, dp: 2 }} title={C.reject[0].replace(" 4998.50", "")} note={C.reject[1]} />
        </>
      )}
      {main &&
        (() => {
          const k = hold(f, L("s5"), r0 - 8, 8);
          const st = span(f, L("s5"), L("s5") + 10, backOut);
          return k < 0.01 ? null : (
            <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", opacity: k }}>
              <span style={{ display: "inline-block", ...serif(), fontSize: 96, color: PAL.amber, padding: "4px 34px 10px", border: `6px solid ${PAL.amber}`, borderRadius: 18, transform: `rotate(-4deg) scale(${1.6 - 0.6 * st})`, background: "rgba(6,8,14,0.8)" }}>{C.prob}</span>
            </div>
          );
        })()}

      <Captions f={f} />
    </div>
  );
};

