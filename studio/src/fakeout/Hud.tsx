// 2D layer over the set: the comparison page's labels / dimming / highlight frames, focus frames,
// minimap, callouts pinned to 3D points, cards, title hits and captions.
// Type: Noto Serif SC 600 for titles / conclusions, Noto Sans SC 500 (700 for label titles) for
// captions and labels, IBM Plex Mono 500 for numbers. Every label sits on its own dark plate.
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "./copy";
import { FPS, L, Le, S, TL, backOut, clamp01, expoOut, hold, pulse, smooth, span } from "./cue";
import { E, PUSH, REGION, ROW_BAND, ROW_DELTA_Y, ROW_I0, ROW_VOL_Y, X_ROWS, ry, type Dir } from "./director";
import { mono, sans, serif } from "./fonts";
import { AFTER, CHART, LEVEL, N_AFTER, PRIOR_HIGH, bx, fmt, path0, path1, py, type Outcome } from "./market";
import { PAL, mainBars } from "./Scene";

const INK = "#F5F7FA";
const SOFT = "rgba(245,247,250,0.78)";
const PLATE = "rgba(8,11,18,0.82)";
const unpy = (y: number) => LEVEL + (y - 2.2) / 0.085;
const OUT: Outcome[] = ["A", "B", "C"];
const ROW_COL: Record<Outcome, string> = { A: PAL.up, B: PAL.amber, C: PAL.down };

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

/**
 * Callout pinned to a 3D point. Reveal order: marker + leader, then the name/value, then the
 * conclusion, each 7 frames (≈0.23 s) apart. Text never sits directly on a candle: it has a plate.
 */
const Tag: React.FC<{ f: number; a: number; b: number; at: P; title: string; note?: string; color?: string; side?: "l" | "r"; dy?: number; reach?: number }> = ({ f, a, b, at, title, note, color = PAL.amber, side = "r", dy = -90, reach = 60 }) => {
  const { width, height } = useVideoConfig();
  const out = 1 - span(f, b - 8, b, smooth);
  if (f < a || out < 0.01 || !at.ok) return null;
  const s = side === "r" ? 1 : -1;
  const ex = at.x + s * reach;
  const ey = at.y + dy;
  const draw = span(f, a, a + 8, (x) => x);
  const kt = span(f, a + 7, a + 15, expoOut);
  const kn = span(f, a + 14, a + 22, expoOut);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <circle cx={at.x} cy={at.y} r={9 + (1 - draw) * 14} fill="none" stroke={color} strokeWidth={3} opacity={draw} />
        <circle cx={at.x} cy={at.y} r={3.5} fill={color} />
        <polyline points={`${at.x},${at.y} ${at.x + (ex - at.x) * draw},${at.y + (ey - at.y) * draw} ${ex + s * 30 * span(draw, 0.6, 1)},${ey}`} fill="none" stroke={color} strokeWidth={3} />
      </svg>
      <div
        style={{
          position: "absolute",
          top: ey - 38,
          left: side === "r" ? ex + 34 : undefined,
          right: side === "l" ? width - ex + 34 : undefined,
          padding: "8px 18px 10px",
          background: PLATE,
          borderRadius: 10,
          borderLeft: side === "r" ? `6px solid ${color}` : undefined,
          borderRight: side === "l" ? `6px solid ${color}` : undefined,
          textAlign: side === "r" ? "left" : "right",
          opacity: kt,
          transform: `translateX(${s * (1 - kt) * -18}px)`,
        }}
      >
        <div style={{ ...sans(700), fontSize: 38, lineHeight: 1.25, color: INK, whiteSpace: "nowrap" }}>{title}</div>
        {note && <div style={{ ...sans(500), fontSize: 34, lineHeight: 1.3, color: SOFT, marginTop: 2, whiteSpace: "nowrap", opacity: kn }}>{note}</div>}
      </div>
    </div>
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
        ].map(([x, y, sx, sy], i) => (
          <polyline key={i} points={`${x},${y + sy * c} ${x},${y} ${x + sx * c},${y}`} fill="none" stroke={PAL.amber} strokeWidth={6} />
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
        {mainBars(d).map(({ b: bar, i }) => {
          const col = bar.c >= bar.o ? PAL.up : PAL.down;
          const x = X(bx(i));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={Y(bar.h)} y2={Y(bar.l)} stroke={col} strokeWidth={1} />
              <rect x={x - 1.2} y={Y(Math.max(bar.o, bar.c))} width={2.4} height={Math.max(1, Y(Math.min(bar.o, bar.c)) - Y(Math.max(bar.o, bar.c)))} fill={col} />
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
const Big: React.FC<{ k: number; top: number; lines: [string, string?]; size?: number; accent?: string }> = ({ k, top, lines, size = 96, accent = PAL.amber }) =>
  k < 0.01 ? null : (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 1100, height: 360, transform: "translate(-50%,-50%)", background: "radial-gradient(closest-side, rgba(4,6,12,0.88), rgba(4,6,12,0))", opacity: k }} />
      {lines.filter(Boolean).map((l, i) => {
        const ki = span(k, i * 0.3, 0.7 + i * 0.3, backOut);
        return (
          <div key={i} style={{ position: "relative", ...serif(), fontSize: size, lineHeight: 1.3, color: i ? accent : INK, opacity: Math.min(1, ki * 1.5), transform: `translateY(${(1 - ki) * 24}px)`, letterSpacing: 2 }}>
            {l}
          </div>
        );
      })}
    </div>
  );

// ---------------------------------------------------------------- captions
const KEY = ["假突破", "失败突破", "回踩确认", "直接接受", "回踩", "接受度", "接受", "吸收", "止损", "Delta", "失效点", "限价卖单", "概率", "违规", "背离", "缩小"];
const NO_BURN = new Set(["c5", "e3", "e4"]);
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

// ---------------------------------------------------------------- comparison page
/** project a row-local point (the row group is scaled about its origin) */
const rowPt = (d: Dir, pr: Proj, o: Outcome, x: number, y: number): P => pr(X_ROWS + x * d.rows.s[o], d.rows.y[o] + y * d.rows.s[o], 0);
const rowRect = (d: Dir, pr: Proj, o: Outcome) => {
  const a = rowPt(d, pr, o, bx(ROW_I0) - 0.7, ROW_BAND.y1);
  const b = rowPt(d, pr, o, bx(N_AFTER) + 0.7, ROW_BAND.y0);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
};

const Rows: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  const R = d.rows;
  if (d.world !== "rows") return null;
  const labels = span(f, E("forkEnd") - 6, E("forkEnd") + 10);
  return (
    <>
      {OUT.map((o) => {
        const r = rowRect(d, pr, o);
        const act = R.act[o];
        const dim = 0.7 * R.focus * (1 - act); // inactive rows drop to ~30% brightness
        const lv = rowPt(d, pr, o, bx(N_AFTER) + 0.7, ry(LEVEL));
        const vol = rowPt(d, pr, o, bx(ROW_I0) - 0.4, ROW_VOL_Y + 0.5);
        const del = rowPt(d, pr, o, bx(ROW_I0) - 0.4, ROW_DELTA_Y);
        return (
          <div key={o}>
            {/* spotlight on the active row */}
            {act > 0.01 && <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 14, background: "radial-gradient(60% 70% at 62% 45%, rgba(255,236,200,0.16), rgba(255,236,200,0))", mixBlendMode: "screen", opacity: act }} />}
            {/* row label */}
            <div style={{ position: "absolute", left: r.x + 18, top: r.y + 12, display: "flex", alignItems: "center", gap: 12, opacity: R.op[o] * labels, padding: "4px 14px 6px 6px", background: PLATE, borderRadius: 10 }}>
              <span style={{ ...mono(), fontSize: 30, color: "#04060c", background: ROW_COL[o], borderRadius: 8, padding: "0 10px" }}>{o}</span>
              <span style={{ ...sans(700), fontSize: 38, color: INK }}>{C.rows[o][1]}</span>
            </div>
            <div style={{ position: "absolute", left: lv.x - 104, top: lv.y - 42, ...mono(), fontSize: 28, color: SOFT, opacity: R.op[o] * labels }}>5000</div>
            {R.vol[o] > 0.01 && <div style={{ position: "absolute", left: vol.x + 6, top: vol.y - 20, ...sans(500), fontSize: 30, color: SOFT, padding: "0 10px", background: PLATE, borderRadius: 6, opacity: R.vol[o] }}>{C.vol}</div>}
            {R.delta[o] > 0.01 && <div style={{ position: "absolute", left: del.x + 6, top: del.y - 20, ...mono(), fontSize: 30, color: SOFT, padding: "0 10px", background: PLATE, borderRadius: 6, opacity: R.delta[o] }}>{C.delta}</div>}
            {/* everything not being explained drops back */}
            {dim > 0.01 && <div style={{ position: "absolute", left: r.x - 6, top: r.y - 6, width: r.w + 12, height: r.h + 12, background: "#04060c", opacity: dim, borderRadius: 16 }} />}
            {/* frame on the active row */}
            {act > 0.01 && <div style={{ position: "absolute", left: r.x - 4, top: r.y - 4, width: r.w + 8, height: r.h + 8, borderRadius: 16, border: `3px solid ${ROW_COL[o]}`, boxShadow: `0 0 36px ${ROW_COL[o]}55`, opacity: act }} />}
          </div>
        );
      })}
    </>
  );
};

/** a dashed price line across one row from bar i0 to the right edge, with a label */
const RowLine: React.FC<{ d: Dir; pr: Proj; o: Outcome; p: number; i0: number; k: number; label: string }> = ({ d, pr, o, p, i0, k, label }) => {
  if (k < 0.01) return null;
  const a = rowPt(d, pr, o, bx(i0) - 0.3, ry(p));
  const b = rowPt(d, pr, o, bx(N_AFTER) + 0.4, ry(p));
  const draw = span(k, 0, 0.6, (x) => x);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: k }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * draw} y2={b.y} stroke={PAL.amber} strokeWidth={4} strokeDasharray="14 10" />
      </svg>
      <div style={{ position: "absolute", right: 1080 - b.x, top: b.y + 8, ...sans(500), fontSize: 34, color: INK, padding: "2px 14px 4px", background: PLATE, borderRadius: 8, borderRight: `5px solid ${PAL.amber}`, opacity: span(k, 0.4, 1) }}>{label}</div>
    </div>
  );
};

// ---------------------------------------------------------------- main
export const Hud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const { project: pr, ground } = useCam(d);
  const R = d.rows;
  const rows = d.world === "rows";
  const main = d.world === "main";
  const m0 = S("mechanism"),
    s0 = S("signals"),
    r0 = S("respond"),
    e0 = S("close");
  const full = main ? clamp01((d.view.w - 30) / 12) : 0;
  const rp = (o: Outcome, i: number, p: number) => rowPt(d, pr, o, bx(i), ry(p));
  const rv = (o: Outcome, i: number) => rowPt(d, pr, o, bx(i), ROW_VOL_Y + (AFTER[o][i - 1].v / 3400) * 0.7);

  // ---- hook ticker (the shared breakout bar)
  const price = path0(R.u0);
  const tickK = 1 - span(f, E("fork") + 6, E("fork") + 20);
  const above = price >= LEVEL;
  const kick = pulse(f, E("hookPierce"), 6);
  // ---- title hit
  const titleK = rows ? span(f, E("title"), E("title") + 8) * (1 - span(f, L("c5") - 10, L("c5"))) : 0;
  const tShake = pulse(f, E("title"), 5);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,6,12,0.7) 0%, rgba(4,6,12,0) 16%, rgba(4,6,12,0) 70%, rgba(4,6,12,0.75) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: d.flash * 0.12, mixBlendMode: "screen" }} />

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
      <div style={{ position: "absolute", left: 48, right: 48, top: 112, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 3 }}>{C.series}</span>
        <span style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 2, padding: "2px 12px", background: "rgba(8,11,18,0.6)", border: "1px solid rgba(245,247,250,0.25)", borderRadius: 6 }}>{C.tag}</span>
      </div>
      <MiniMap d={d} ground={ground} />

      {/* ================= HOOK ================= */}
      {rows && tickK > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", opacity: tickK, transform: `scale(${1 + kick * 0.08}) translate(${Math.sin(f * 7) * kick * 10}px, 0)` }}>
          <div style={{ display: "inline-block", padding: "6px 30px 10px", borderRadius: 18, background: "rgba(6,8,14,0.72)" }}>
            <div style={{ ...mono(), fontSize: 120, letterSpacing: -2, color: PAL.up, textShadow: `0 0 36px ${PAL.up}55` }}>▲{fmt(Math.round(price * 4) / 4)}</div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "center", marginTop: 4 }}>
              <span style={{ ...sans(500), fontSize: 34, color: SOFT }}>{C.levelShort}</span>
              <span style={{ ...mono(), fontSize: 34, color: INK }}>5000.00</span>
              <span style={{ ...sans(700), fontSize: 34, color: "#04060c", background: above ? PAL.up : "rgba(245,247,250,0.7)", padding: "0 14px", borderRadius: 6 }}>{above ? C.status.above : C.status.near}</span>
            </div>
          </div>
        </div>
      )}
      {titleK > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 168, textAlign: "center", opacity: titleK, transform: `scale(${1.2 - 0.2 * span(f, E("title"), E("title") + 8, expoOut)}) translateX(${Math.sin(f * 9) * tShake * 14}px)` }}>
          <div style={{ position: "relative", height: 96 }}>
            {[PAL.up, PAL.down, INK].map((c, i) => (
              <div key={i} style={{ position: "absolute", left: 0, right: 0, ...serif(), fontSize: 76, lineHeight: 1.2, color: c, opacity: i === 2 ? 1 : 0.85, transform: `translate(${(i === 0 ? -1 : i === 1 ? 1 : 0) * (2 + tShake * 16)}px, 0)`, mixBlendMode: i === 2 ? "normal" : "screen" }}>
                {C.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= COMPARE ================= */}
      {rows &&
        (() => {
          // the shared history and the fork point, for all three rows at once
          const k = hold(f, L("c1") + 10, L("c2") - 8, 10);
          if (k < 0.01) return null;
          const top = rowRect(d, pr, "A"),
            bot = rowRect(d, pr, "C");
          const x0 = rp("A", ROW_I0, LEVEL).x - 14,
            x1 = rp("A", -1, LEVEL).x + 14,
            xb = rp("A", 0, LEVEL).x;
          const k2 = span(f, L("c1") + 60, L("c1") + 70);
          return (
            <div style={{ position: "absolute", inset: 0, opacity: k }}>
              <div style={{ position: "absolute", left: x0, top: top.y, width: x1 - x0, height: bot.y + bot.h - top.y, background: "rgba(245,247,250,0.06)", border: "2px dashed rgba(245,247,250,0.45)", borderRadius: 12 }} />
              <div style={{ position: "absolute", left: x0 + 10, top: bot.y + bot.h - 62, ...sans(700), fontSize: 38, color: INK, padding: "2px 14px", background: PLATE, borderRadius: 8 }}>{C.same[0]}</div>
              <div style={{ position: "absolute", left: xb - 3, top: top.y, width: 6, height: bot.y + bot.h - top.y, background: PAL.amber, opacity: k2, boxShadow: `0 0 18px ${PAL.amber}` }} />
              <div style={{ position: "absolute", right: 1080 - xb + 14, top: top.y + top.h - 62, opacity: k2, ...sans(700), fontSize: 36, color: INK, whiteSpace: "nowrap", padding: "2px 14px", background: PLATE, borderRadius: 8, borderRight: `5px solid ${PAL.amber}` }}>{C.same[1]}</div>
            </div>
          );
        })()}
      {rows && (
        <>
          <Tag f={f} a={L("c2") + 40} b={L("c3") - 6} at={rp("A", 4, 5027)} title={C.a[0][0]} note={C.a[0][1]} color={PAL.up} side="l" dy={-60} reach={40} />
          <Tag f={f} a={L("c2") + 90} b={L("c3") - 6} at={rv("A", 3)} title={C.a[1][0]} note={C.a[1][1]} color={PAL.up} side="l" dy={30} reach={40} />
          <Tag f={f} a={L("c3") + 50} b={L("c4") - 6} at={rp("B", 2, 4999.5)} title={C.b[0][0]} note={C.b[0][1]} color={PAL.amber} side="l" dy={-90} reach={40} />
          <Tag f={f} a={L("c3") + 90} b={L("c4") - 6} at={rv("B", 4)} title={C.b[1][0]} note={C.b[1][1]} color={PAL.amber} side="l" dy={40} reach={60} />
          <Tag f={f} a={L("c3") + 150} b={L("c4") - 6} at={rp("B", 5, 5010)} title={C.b[2][0]} note={C.b[2][1]} color={PAL.up} side="r" dy={-60} reach={30} />
          <Tag f={f} a={L("c4") + 50} b={L("c5") - 6} at={rp("C", 1, 5016)} title={C.c[0][0]} note={C.c[0][1]} color={PAL.down} side="r" dy={-40} reach={40} />
          <Tag f={f} a={L("c4") + 100} b={L("c5") - 6} at={rp("C", 2, 4978)} title={C.c[1][0]} note={C.c[1][1]} color={PAL.down} side="r" dy={30} reach={40} />
          <Tag f={f} a={L("c4") + 140} b={L("c5") - 6} at={rowPt(d, pr, "C", bx(1), ROW_DELTA_Y + (180 / 1150) * 0.38)} title={C.c[2][0]} note={C.c[2][1]} color={PAL.amber} side="l" dy={20} reach={60} />
        </>
      )}
      <Big k={rows ? hold(f, L("c5") + 2, L("c5") + 76, 10) : 0} top={150} lines={[C.knock[0], C.knock[1]]} size={64} />
      <Big k={rows ? hold(f, L("c5") + 70, m0 + 8, 10) : 0} top={180} lines={[C.toC]} size={64} />

      {/* fade between the two places */}
      {d.dip > 0.01 && <div style={{ position: "absolute", inset: 0, background: "#04060c", opacity: smooth(d.dip) }} />}

      {/* ================= MECHANISM (main chart) ================= */}
      {main && (
        <>
          <Tag f={f} a={PUSH.prior[1] + 2} b={L("m2") + 6} at={pr(bx(PRIOR_HIGH), py(5000), 0)} title={C.priorHigh[0]} note={C.priorHigh[1]} side="r" dy={-150} reach={40} />
          <Tag f={f} a={L("m2") + 34} b={L("m4") - 6} at={pr(-0.9, py(5006.5), 0.3)} title={C.buyStops[0]} note={C.buyStops[1]} side="l" dy={-200} reach={20} />
          <Tag f={f} a={L("m4") + 32} b={L("m5") + 24} at={pr(bx(1) - 1.15, py(5016), 0.4)} title={C.sellWall[0]} note={C.sellWall[1]} color={PAL.violet} side="l" dy={-150} reach={30} />
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
              <Tag f={f} a={a + 30} b={b} at={pr(bx(PRIOR_HIGH), py(5000), 0)} title={C.deltaPrior[0]} note={C.deltaPrior[1]} side="r" dy={-150} reach={30} />
              <Tag f={f} a={a + 76} b={b} at={pr(bx(1), py(5016), 0)} title={C.deltaNew[0]} note={C.deltaNew[1]} color={PAL.laser} side="l" dy={170} reach={30} />
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
          <Tag f={f} a={L("m7") + 30} b={Le("m7") + 14} at={pr(bx(2), py(5018), 0.7)} title={C.accept[0]} note={C.accept[1]} side="r" dy={-190} reach={20} />
          <Tag f={f} a={E("crash") + 10} b={L("m9") - 4} at={pr(bx(2) - 1.2, py(4992), 0.4)} title={C.sellStops[0]} note={C.sellStops[1]} color={PAL.down} side="r" dy={230} reach={40} />
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
          <Tag f={f} a={L("s2") + 16} b={L("s3") - 2} at={pr(bx(2) + 0.19, py(4978), 0.2)} title={C.closeIn[0]} note={C.closeIn[1]} color={PAL.down} side="r" dy={130} reach={40} />
          <Tag f={f} a={L("s4") + 20} b={L("s5") + 4} at={pr(bx(4), py(4998.5), 0)} title={C.reject[0]} note={C.reject[1]} color={PAL.down} side="r" dy={-130} />
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

      {/* ================= RESPOND (comparison page) ================= */}
      {rows &&
        f >= r0 - 10 &&
        f < e0 + 10 &&
        (() => {
          const k = hold(f, r0 + 4, e0 + 6, 12);
          const steps = [L("r1"), L("r1") + 50, L("r2"), L("r4"), L("r4") + 54];
          const cur = steps.filter((a) => f >= a).length - 1;
          const kc = span(f, steps[Math.max(0, cur)], steps[Math.max(0, cur)] + 8, expoOut);
          return (
            <div style={{ position: "absolute", left: 48, right: 48, top: 176, opacity: k, display: "flex", alignItems: "center", gap: 22 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {C.steps.map((_, i) => (
                  <span key={i} style={{ width: 46, height: 46, borderRadius: 23, display: "flex", alignItems: "center", justifyContent: "center", background: i <= cur ? PAL.amber : "transparent", border: `2px solid ${PAL.amber}`, ...mono(), fontSize: 26, color: i <= cur ? "#04060c" : PAL.amber, opacity: i <= cur ? 1 : 0.5 }}>
                    {i + 1}
                  </span>
                ))}
              </div>
              {cur >= 0 && <span style={{ ...sans(700), fontSize: 44, color: INK, opacity: kc, transform: `translateX(${(1 - kc) * 14}px)`, padding: "0 16px 4px", background: PLATE, borderRadius: 10 }}>{C.steps[cur]}</span>}
            </div>
          );
        })()}
      {rows &&
        (() => {
          // do not chase the breakout bar: one column through all three rows
          const k = hold(f, L("r1") + 4, L("r2") - 2, 10);
          if (k < 0.01) return null;
          const top = rowRect(d, pr, "A"),
            bot = rowRect(d, pr, "C");
          const xb = rp("A", 0, LEVEL).x;
          return (
            <div style={{ position: "absolute", inset: 0, opacity: k }}>
              <div style={{ position: "absolute", left: xb - 18, top: top.y, width: 36, height: bot.y + bot.h - top.y, background: "rgba(20,196,124,0.10)", border: `2px solid ${PAL.down}`, borderRadius: 10 }} />
              <div style={{ position: "absolute", right: 1080 - xb + 24, top: top.y + top.h - 64, ...sans(700), fontSize: 40, color: INK, whiteSpace: "nowrap", padding: "2px 16px 4px", background: PLATE, borderRadius: 8, borderRight: `5px solid ${PAL.down}` }}>✕ {C.noChase[0]} · {C.noChase[1]}</div>
            </div>
          );
        })()}
      {rows && (
        <>
          <Tag f={f} a={L("r2") + 20} b={L("r4") + 10} at={rp("B", 4, 5000.75)} title={C.planB[0]} note={C.planB[1]} color={PAL.amber} side="l" dy={-80} reach={40} />
          <RowLine d={d} pr={pr} o="B" p={4998.5} i0={2} k={hold(f, L("r2") + 60, e0 + 4, 12)} label={C.invalidB} />
          <Tag f={f} a={L("r3") + 20} b={L("r4") + 10} at={rp("C", 4, 4998.5)} title={C.planC[0]} note={C.planC[1]} color={PAL.down} side="l" dy={-40} reach={40} />
          <RowLine d={d} pr={pr} o="C" p={5001} i0={3} k={hold(f, L("r3") + 60, e0 + 4, 12)} label={C.invalidC} />
          {(() => {
            const k = hold(f, L("r4") + 50, e0 + 4, 10);
            if (k < 0.01) return null;
            const a = rowRect(d, pr, "A");
            return (
              <div style={{ position: "absolute", left: 0, right: 0, top: a.y + a.h / 2 - 40, textAlign: "center", opacity: k }}>
                <span style={{ ...serif(), fontSize: 48, color: PAL.amber, padding: "6px 24px 10px", background: "rgba(6,8,14,0.9)", borderRadius: 12, border: `2px solid ${PAL.amber}` }}>{C.risk}</span>
              </div>
            );
          })()}
        </>
      )}

      {/* ================= CLOSE (comparison page) ================= */}
      <Big k={rows ? hold(f, L("e1") - 4, L("e3") - 4, 10) : 0} top={170} lines={[C.why]} size={60} />
      {rows &&
        (() => {
          const k = hold(f, L("e2") + 4, L("e3") - 4, 12);
          if (k < 0.01) return null;
          const top = rowRect(d, pr, "A"),
            bot = rowRect(d, pr, "C");
          const x0 = rp("A", 1, LEVEL).x - 14,
            x1 = rp("A", N_AFTER, LEVEL).x + 16;
          return (
            <div style={{ position: "absolute", inset: 0, opacity: k }}>
              <div style={{ position: "absolute", left: x0, top: top.y, width: x1 - x0, height: bot.y + bot.h - top.y, background: "rgba(255,177,61,0.06)", border: `2px dashed ${PAL.amber}`, borderRadius: 12 }} />
              {OUT.map((o, i) => {
                const r = rowRect(d, pr, o);
                const ki = span(f, L("e2") + 60 + i * 30, L("e2") + 70 + i * 30, expoOut);
                return (
                  <div key={o} style={{ position: "absolute", right: 1080 - x1 + 10, top: r.y + r.h - 66, ...sans(700), fontSize: 40, color: INK, padding: "2px 16px 4px", background: PLATE, borderRadius: 8, borderRight: `5px solid ${ROW_COL[o]}`, opacity: ki, transform: `translateX(${(1 - ki) * 20}px)` }}>
                    {C.verdict[o]}
                  </div>
                );
              })}
            </div>
          );
        })()}
      <Big k={rows ? hold(f, L("e3"), FPS * 999, 10) : 0} top={700} lines={[C.endQ1]} size={60} />
      <Big k={rows ? hold(f, L("e4") - 4, FPS * 999, 10) : 0} top={810} lines={[C.endQ2]} size={110} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1480, textAlign: "center", opacity: span(f, L("e4") + 30, L("e4") + 50) }}>
        <span style={{ ...sans(500), fontSize: 34, letterSpacing: 3, color: INK, padding: "6px 22px", background: "rgba(6,8,14,0.78)", borderRadius: 10 }}>{C.disclaimer}</span>
      </div>

      <Captions f={f} />
    </div>
  );
};

