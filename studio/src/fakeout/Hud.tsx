// 2D layer over the set: focus frames, minimap, callouts pinned to 3D points, cards, title hits, captions.
// Type system: Noto Serif SC 600 for titles / conclusions, Noto Sans SC 500 (700 for label titles) for
// captions and labels, IBM Plex Mono 500 for numbers. Every label sits on its own dark plate.
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "./copy";
import { FPS, L, Le, S, TL, backOut, clamp01, expoOut, hold, pulse, smooth, span } from "./cue";
import { EVENTS, PUSH, REGION, liveOHLC, livePrice, type Dir } from "./director";
import { mono, sans, serif } from "./fonts";
import { CHART, FAIL_BAR, GOOD_BREAK, LEVEL, OUTCOMES, PAST, bx, fmt, py, type Bar } from "./market";
import { PAL } from "./Scene";

const INK = "#F5F7FA";
const SOFT = "rgba(245,247,250,0.78)";
const PLATE = "rgba(8,11,18,0.82)";
const unpy = (y: number) => LEVEL + (y - 2.2) / 0.085;

type P = { x: number; y: number; ok: boolean };
const useCam = (d: Dir) => {
  const { width, height } = useVideoConfig();
  const cam = new THREE.PerspectiveCamera(d.cam.fov, width / height, 0.1, 3000);
  cam.position.copy(d.cam.pos);
  cam.lookAt(d.cam.target);
  cam.updateMatrixWorld();
  const project = (x: number, y: number, z = 0): P => {
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
          padding: "10px 20px 12px",
          background: PLATE,
          borderRadius: 10,
          borderLeft: side === "r" ? `6px solid ${color}` : undefined,
          borderRight: side === "l" ? `6px solid ${color}` : undefined,
          textAlign: side === "r" ? "left" : "right",
          opacity: kt,
          transform: `translateX(${s * (1 - kt) * -18}px)`,
        }}
      >
        <div style={{ ...sans(700), fontSize: 40, lineHeight: 1.25, color: INK, whiteSpace: "nowrap" }}>{title}</div>
        {note && <div style={{ ...sans(500), fontSize: 34, lineHeight: 1.3, color: SOFT, marginTop: 2, whiteSpace: "nowrap", opacity: kn }}>{note}</div>}
      </div>
    </div>
  );
};

/** translucent focus frame + spotlight on a chart region, drawn before the push and riding it in */
const Focus: React.FC<{ f: number; a: number; b: number; region: readonly [number, number, number, number]; project: (x: number, y: number, z?: number) => P }> = ({ f, a, b, region, project }) => {
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
      {/* spotlight: dim everything outside the frame */}
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
  const k = clamp01((26 - d.view.w) / 8);
  if (k < 0.01) return null;
  const W = 300,
    H = 160,
    pad = 10;
  const X = (x: number) => pad + ((x - CHART.x0) / (CHART.x1 - CHART.x0)) * (W - pad * 2);
  const Y = (p: number) => H - pad - ((p - 4630) / (5040 - 4630)) * (H - pad * 2);
  const f = d.f;
  const bar0: Bar = d.bar0.mode === "good" ? { ...GOOD_BREAK, h: GOOD_BREAK.o + (GOOD_BREAK.h - GOOD_BREAK.o) * d.bar0.grow, c: GOOD_BREAK.o + (GOOD_BREAK.c - GOOD_BREAK.o) * d.bar0.grow } : liveOHLC(f);
  const bars: { b: Bar; i: number }[] = [...PAST, { b: bar0, i: 0 }];
  (["true", "retest", "fail"] as const).forEach((id) => {
    const o = d.outcomes[id];
    if (o.op > 0.3) OUTCOMES[id].forEach((b, i) => o.n - i > 0.5 && bars.push({ b, i: i + 1 }));
  });
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
        <line x1={X(bx(-13))} x2={X(bx(9))} y1={Y(LEVEL)} y2={Y(LEVEL)} stroke={PAL.laser} strokeWidth={1} opacity={0.7} />
        {bars.map(({ b, i }) => {
          const col = b.c >= b.o ? PAL.up : PAL.down;
          const x = X(bx(i));
          return (
            <g key={i + ":" + b.o}>
              <line x1={x} x2={x} y1={Y(b.h)} y2={Y(b.l)} stroke={col} strokeWidth={1} />
              <rect x={x - 1.2} y={Y(Math.max(b.o, b.c))} width={2.4} height={Math.max(1, Y(Math.min(b.o, b.c)) - Y(Math.max(b.o, b.c)))} fill={col} />
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
    <div style={{ position: "absolute", left: 56, right, top, opacity: k, transform: `translateY(${(1 - k) * 24}px)`, padding: "26px 34px", background: "rgba(8,11,18,0.84)", border: "1px solid rgba(245,247,250,0.14)", borderRadius: 20, boxShadow: "0 24px 70px rgba(0,0,0,0.5)" }}>
      {children}
    </div>
  );

/** centred serif statement on a soft dark plate */
const Big: React.FC<{ k: number; top: number; lines: [string, string?]; size?: number; accent?: string }> = ({ k, top, lines, size = 96, accent = PAL.amber }) =>
  k < 0.01 ? null : (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 1100, height: 440, transform: "translate(-50%,-50%)", background: "radial-gradient(closest-side, rgba(4,6,12,0.85), rgba(4,6,12,0))", opacity: k }} />
      {lines.filter(Boolean).map((l, i) => {
        const ki = span(k, i * 0.3, 0.7 + i * 0.3, backOut);
        return (
          <div key={i} style={{ position: "relative", ...serif(), fontSize: size, lineHeight: 1.3, color: i ? accent : INK, opacity: Math.min(1, ki * 1.5), transform: `translateY(${(1 - ki) * 30}px)`, letterSpacing: 2 }}>
            {l}
          </div>
        );
      })}
    </div>
  );

// ---------------------------------------------------------------- captions
const KEY = ["假突破", "真突破", "失败突破", "回踩", "接受度", "接受", "吸收", "止损", "Delta", "失效点", "限价卖单", "概率", "违规"];
const NO_BURN = new Set(["d5", "e1", "e2"]);
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

// ---------------------------------------------------------------- main
export const Hud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const { project: pr, ground } = useCam(d);
  const LY = py(LEVEL);
  const d0 = S("define"),
    m0 = S("mechanism"),
    s0 = S("signals"),
    r0 = S("respond"),
    e0 = S("close");
  const full = clamp01((d.view.w - 30) / 12); // 1 in the full-chart view

  // ---- hook ticker
  const price = livePrice(f);
  const tickK = (f < d0 ? 1 : 0) * (1 - span(f, L("h3") - 6, L("h3") + 6));
  const up = price >= 4995;
  const above = price >= LEVEL;
  const kick = pulse(f, EVENTS.X_HOOK, 6) + pulse(f, EVENTS.CRASH[0], 6);

  // ---- title hit
  const titleK = hold(f, L("h3") + 14, d0 + 4, 6);
  const tShake = pulse(f, L("h3") + 14, 5);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,6,12,0.7) 0%, rgba(4,6,12,0) 20%, rgba(4,6,12,0) 66%, rgba(4,6,12,0.75) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: d.flash * 0.12, mixBlendMode: "screen" }} />

      {/* focus frames before each push */}
      <Focus f={f} a={PUSH.define[0] - 22} b={PUSH.define[1] + 14} region={REGION.define} project={pr} />
      <Focus f={f} a={PUSH.prior[0] - 22} b={PUSH.prior[1] + 14} region={REGION.prior} project={pr} />
      <Focus f={f} a={PUSH.close[0] - 22} b={PUSH.close[1] + 14} region={REGION.close} project={pr} />
      <Focus f={f} a={PUSH.plan[0] - 22} b={PUSH.plan[1] + 14} region={REGION.plan} project={pr} />

      {/* price axis in the full-chart view */}
      {full > 0.01 &&
        [4700, 4800, 4900, 5000].map((p) => {
          const at = pr(bx(9) + 0.9, py(p), 0);
          return (
            <div key={p} style={{ position: "absolute", left: Math.min(at.x + 8, 1080 - 128), top: at.y - 20, ...mono(), fontSize: 28, color: SOFT, opacity: full * 0.9, padding: "2px 8px", background: "rgba(8,11,18,0.6)", borderRadius: 6 }}>
              {p}
            </div>
          );
        })}

      {/* chrome */}
      <div style={{ position: "absolute", left: 48, right: 48, top: 124, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 3 }}>{C.series}</span>
        <span style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 2, padding: "2px 12px", background: "rgba(8,11,18,0.6)", border: "1px solid rgba(245,247,250,0.25)", borderRadius: 6 }}>{C.tag}</span>
      </div>
      <MiniMap d={d} ground={ground} />

      {/* ---------- HOOK: live ticker ---------- */}
      {tickK > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", opacity: tickK, transform: `scale(${1 + kick * 0.08}) translate(${Math.sin(f * 7) * kick * 10}px, 0)` }}>
          <div style={{ display: "inline-block", padding: "6px 30px 10px", borderRadius: 18, background: "rgba(6,8,14,0.72)" }}>
            <div style={{ ...mono(), fontSize: 120, letterSpacing: -2, color: up ? PAL.up : PAL.down, textShadow: `0 0 36px ${up ? PAL.up : PAL.down}55` }}>
              {up ? "▲" : "▼"}
              {fmt(Math.round(price * 4) / 4)}
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "center", marginTop: 4 }}>
              <span style={{ ...sans(500), fontSize: 34, color: SOFT }}>{C.levelShort}</span>
              <span style={{ ...mono(), fontSize: 34, color: INK }}>5000.00</span>
              <span style={{ ...sans(700), fontSize: 34, color: "#04060c", background: above ? PAL.up : f > EVENTS.X_HOOK ? PAL.down : "rgba(245,247,250,0.7)", padding: "0 14px", borderRadius: 6 }}>{above ? C.status.above : f > EVENTS.X_HOOK ? C.status.back : C.status.near}</span>
            </div>
          </div>
        </div>
      )}
      {/* ---------- HOOK: title hit ---------- */}
      {titleK > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", opacity: titleK, transform: `scale(${1.25 - 0.25 * span(f, L("h3") + 14, L("h3") + 22, expoOut)}) translateX(${Math.sin(f * 9) * tShake * 16}px)` }}>
          <div style={{ position: "relative", height: 270 }}>
            {[PAL.up, PAL.down, INK].map((c, i) => (
              <div key={i} style={{ position: "absolute", left: 0, right: 0, ...serif(), fontSize: 230, lineHeight: 1.15, color: c, opacity: i === 2 ? 1 : 0.85, transform: `translate(${(i === 0 ? -1 : i === 1 ? 1 : 0) * (4 + tShake * 22)}px, ${(i === 0 ? -1 : i === 1 ? 1 : 0) * 3}px)`, mixBlendMode: i === 2 ? "normal" : "screen" }}>
                {C.title}
              </div>
            ))}
          </div>
          <div style={{ ...mono(), fontSize: 30, letterSpacing: 14, color: SOFT }}>{C.titleEn}</div>
        </div>
      )}

      {/* key level in the full-chart views */}
      <Tag f={f} a={L("h3") + 30} b={PUSH.define[0] - 22} at={pr(bx(-13), LY, 0)} title={C.level[0]} note={C.level[1]} color={PAL.laser} side="l" dy={-120} reach={20} />

      {/* ---------- DEFINE ---------- */}
      <Tag f={f} a={Le("d2") - 22} b={L("d3") + 6} at={pr(bx(6), py(OUTCOMES.true[5].h), 0)} title={C.outcomes.true[0]} note={C.outcomes.true[1]} color={PAL.up} side="l" dy={-130} reach={40} />
      <Tag f={f} a={L("d3") + 34} b={L("d4") + 4} at={pr(bx(2), py(OUTCOMES.retest[1].l), 0)} title={C.outcomes.retest[0]} note={C.outcomes.retest[1]} color={PAL.up} side="r" dy={150} />
      <Tag f={f} a={L("d4") + 60} b={L("d5") - 4} at={pr(0, py(FAIL_BAR.h), 0)} title={C.outcomes.fail[0]} note={C.outcomes.fail[1]} color={PAL.down} side="r" dy={-110} />
      <Big k={hold(f, L("d5") + 4, m0 + 4, 10)} top={420} lines={[C.knock[0], C.knock[1]]} size={96} />

      {/* ---------- MECHANISM ---------- */}
      <Tag f={f} a={PUSH.prior[1] + 2} b={752} at={pr(bx(-11), py(5000), 0)} title={C.priorHigh[0]} note={C.priorHigh[1]} side="r" dy={-150} reach={40} />
      <Tag f={f} a={784} b={L("m4") - 6} at={pr(-0.9, py(5006.5), 0.3)} title={C.buyStops[0]} note={C.buyStops[1]} side="l" dy={-200} reach={20} />
      <Tag f={f} a={L("m4") + 32} b={L("m5") + 24} at={pr(-1.15, py(5016), 0.4)} title={C.sellWall[0]} note={C.sellWall[1]} color={PAL.violet} side="l" dy={-150} reach={30} />
      {(() => {
        const k = hold(f, L("m5") + 16, L("m6") + 6, 10);
        if (k < 0.01) return null;
        const t0 = L("m5") + 16;
        const buys = Math.round(span(f, t0 + 14, Le("m5"), (x) => x) * 2400);
        const p = Math.round(livePrice(f) * 4) / 4;
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
      <Tag f={f} a={L("m6") + 32} b={Le("m6") + 14} at={pr(1.1, py(5018), 0.7)} title={C.accept[0]} note={C.accept[1]} side="r" dy={-190} reach={20} />
      <Tag f={f} a={L("m7") + 28} b={L("m8") - 4} at={pr(-1.2, py(4992), 0.4)} title={C.sellStops[0]} note={C.sellStops[1]} color={PAL.down} side="r" dy={230} reach={40} />
      {(() => {
        const k = hold(f, L("m8") - 4, s0 + 6, 12);
        return (
          <Panel k={k} top={250}>
            {C.normal.map((s, i) => {
              const ki = span(f, L("m8") + 6 + i * 8, L("m8") + 16 + i * 8, expoOut);
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 10, opacity: ki, transform: `translateX(${(1 - ki) * 24}px)` }}>
                  <span style={{ ...mono(), fontSize: 30, color: PAL.amber }}>0{i + 1}</span>
                  <span style={{ ...sans(500), fontSize: 40, color: INK }}>{s}</span>
                </div>
              );
            })}
            <div style={{ ...serif(), fontSize: 60, color: PAL.amber, opacity: span(f, L("m8") + 50, L("m8") + 60), marginTop: 2 }}>{C.notManip}</div>
            <div style={{ height: 1, background: "rgba(245,247,250,0.18)", margin: "14px 0", opacity: span(f, L("m8") + 80, L("m8") + 90) }} />
            <div style={{ opacity: span(f, L("m8") + 96, L("m8") + 106) }}>
              <div style={{ ...sans(700), fontSize: 40, color: "#ff97a3" }}>{C.spoof[0]}</div>
              <div style={{ ...sans(500), fontSize: 34, color: SOFT, marginTop: 4, opacity: span(f, L("m8") + 104, L("m8") + 114) }}>{C.spoof[1]}</div>
            </div>
          </Panel>
        );
      })()}

      {/* ---------- SIGNALS ---------- */}
      <Big k={hold(f, L("s1"), PUSH.close[0] + 4, 10)} top={330} lines={[C.signalsTitle]} size={96} />
      {(() => {
        const k = hold(f, PUSH.close[0], r0 + 6, 12);
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
      <Tag f={f} a={L("s2") + 16} b={L("s3") - 2} at={pr(0.19, py(FAIL_BAR.c), 0.2)} title={C.closeIn[0]} note={C.closeIn[1]} color={PAL.down} side="r" dy={130} reach={40} />
      {(() => {
        const k = hold(f, L("s3") + 10, Le("s3") + 16, 10);
        return (
          <Panel k={k} top={430}>
            <div style={{ ...sans(700), fontSize: 40, color: INK }}>{C.deltaDef}</div>
            <div style={{ ...sans(500), fontSize: 34, color: SOFT, marginTop: 4 }}>{C.deltaNot}</div>
            <div style={{ ...serif(), fontSize: 44, color: PAL.amber, marginTop: 12, opacity: span(f, L("s3") + 128, L("s3") + 138) }}>{C.deltaEnd}</div>
          </Panel>
        );
      })()}
      <Tag f={f} a={L("s3") + 40} b={Le("s3") + 12} at={pr(bx(-11), py(5000), 0)} title={C.deltaPrior[0]} note={C.deltaPrior[1]} side="r" dy={-170} reach={30} />
      <Tag f={f} a={L("s3") + 86} b={Le("s3") + 12} at={pr(0, py(5013), 0)} title={C.deltaNew[0]} note={C.deltaNew[1]} color={PAL.laser} side="l" dy={150} reach={30} />
      <Tag f={f} a={L("s4") + 20} b={L("s5") + 4} at={pr(bx(2), py(4999.5), 0)} title={C.reject[0]} note={C.reject[1]} color={PAL.down} side="r" dy={-130} />
      {(() => {
        const k = hold(f, L("s5"), r0, 8);
        const st = span(f, L("s5"), L("s5") + 10, backOut);
        return k < 0.01 ? null : (
          <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", opacity: k }}>
            <span style={{ display: "inline-block", ...serif(), fontSize: 96, color: PAL.amber, padding: "4px 34px 10px", border: `6px solid ${PAL.amber}`, borderRadius: 18, transform: `rotate(-4deg) scale(${1.6 - 0.6 * st})`, background: "rgba(6,8,14,0.8)" }}>{C.prob}</span>
          </div>
        );
      })()}

      {/* ---------- RESPOND ---------- */}
      {(() => {
        const k = hold(f, r0 + 2, e0 + 4, 12);
        const at = [L("r1") + 10, L("r1") + 40, L("r2"), L("r2") + 34, L("r2") + 70];
        return (
          <Panel k={k} top={200} right={380}>
            {C.steps.map((s, i) => {
              const ki = span(f, at[i], at[i] + 10, expoOut);
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 18, padding: "5px 0", opacity: 0.35 + 0.65 * ki }}>
                  <span style={{ width: 44, height: 44, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", background: ki > 0.5 ? PAL.amber : "transparent", border: `2px solid ${PAL.amber}`, ...mono(), fontSize: 26, color: ki > 0.5 ? "#04060c" : PAL.amber }}>{i + 1}</span>
                  <span style={{ ...sans(500), fontSize: 40, color: INK, transform: `translateX(${(1 - ki) * 14}px)` }}>{s}</span>
                </div>
              );
            })}
            <div style={{ ...sans(500), fontSize: 28, color: SOFT, marginTop: 8 }}>{C.disclaimer}</div>
          </Panel>
        );
      })()}
      <Tag f={f} a={PUSH.plan[1] + 4} b={e0} at={pr(0, py(5008), 0.2)} title={C.noChase[0]} note={C.noChase[1]} color={PAL.down} side="l" dy={-110} reach={30} />
      <Tag f={f} a={L("r2") + 40} b={e0} at={pr(3.4, py(5016), 0.9)} title={C.invalid[0]} note={C.invalid[1]} side="l" dy={-270} reach={20} />

      {/* ---------- CLOSE ---------- */}
      <Big k={hold(f, L("e1"), FPS * 999, 10)} top={300} lines={[C.endQ1]} size={60} />
      <Big k={hold(f, L("e2") - 4, FPS * 999, 10)} top={410} lines={[C.endQ2]} size={110} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1480, textAlign: "center", opacity: span(f, L("e2") + 40, L("e2") + 60) }}>
        <span style={{ ...sans(500), fontSize: 34, letterSpacing: 3, color: INK, padding: "6px 22px", background: "rgba(6,8,14,0.78)", borderRadius: 10 }}>{C.disclaimer}</span>
      </div>

      <Captions f={f} />
    </div>
  );
};
