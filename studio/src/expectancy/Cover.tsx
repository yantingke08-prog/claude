import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../components/Hud";
import { zh } from "../lib/fonts";
import { ease } from "../lib/gsap";
import { appear } from "./components/Charts";
import { hookPathA, hookPathB } from "./sim.ts";
import { cue, scene, SCRIPT } from "./timeline.ts";

const CV = SCRIPT.ui.cover;
const RED = "#ff4d6d";
const FRAMES = scene("cover").frames;

// Beats (all in script.json, so the score's slam / dive / boom land on the picture)
const SLAM = cue("cover", "slam");
const DRAW = cue("cover", "riser"); // both curves start drawing with the riser
const DROP = cue("cover", "drop"); // A goes over the edge
const BOOM = cue("cover", "boom"); // ... and hits zero
const SHINE = cue("cover", "ping"); // B's endpoint lights up
const EXIT = FRAMES - SCRIPT.transition;

const clampI = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// ---------------- the key visual: the two equity curves, as a poster ----------------

const A = hookPathA();
const B = hookPathB();
const X0 = 1110;
const X1 = 1730;
const Y_ZERO = 900;
const Y_TOP = 330;
const MAX = Math.max(...A.equity, ...B);
const px = (i: number, n: number) => X0 + (i / (n - 1)) * (X1 - X0);
const py = (e: number) => Y_ZERO - (e / MAX) * (Y_ZERO - Y_TOP);

/** Light smoothing so the steps read as a curve, then a Catmull-Rom spline through them. */
const smoothPath = (vals: number[], n: number) => {
  const s = vals.map((_, i) => {
    const w = [vals[i - 1] ?? vals[i], vals[i], vals[i + 1] ?? vals[i]];
    return (w[0] + 2 * w[1] + w[2]) / 4;
  });
  s[0] = vals[0];
  s[s.length - 1] = vals[vals.length - 1];
  const pts = s.map((e, i) => [px(i, n), py(e)] as const);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const [p1, p2] = [pts[i], pts[i + 1]];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return { d, end: pts[pts.length - 1], pts };
};

// A shares B's x scale, so its crash lands visibly *before* B's finish. A is drawn as the
// run-up and the cliff separately, so the fall can be timed to its own sound.
const PATH_A = smoothPath(A.equity.slice(0, -1), B.length);
const LEDGE = PATH_A.end;
const CRASH = [px(A.equity.length - 1, B.length), Y_ZERO] as const;
const PATH_B = smoothPath(B, B.length);
const PEAK_A = PATH_A.pts.reduce((m, p) => (p[1] < m[1] ? p : m));

const KeyVisual: React.FC<{ f: number }> = ({ f }) => {
  const drawA = ease("power1.inOut")(clampI(f, DRAW, DROP));
  const fall = ease("power3.in")(clampI(f, DROP, BOOM));
  const drawB = ease("power2.inOut")(clampI(f, DRAW, SHINE - 2));
  const crashed = f >= BOOM ? 1 : 0;
  const ring = clampI(f, BOOM, BOOM + 22);
  const shine = appear(f, SHINE, 10);
  const pulse = 0.85 + 0.15 * Math.sin(f * 0.15);
  const fallY = LEDGE[1] + (CRASH[1] - LEDGE[1]) * fall;
  const fallX = LEDGE[0] + (CRASH[0] - LEDGE[0]) * fall;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="halo">
          <stop offset="0%" stopColor="#ffe2a8" stopOpacity="0.55" />
          <stop offset="35%" stopColor={C.gold} stopOpacity="0.18" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="boom">
          <stop offset="0%" stopColor={RED} stopOpacity="0.7" />
          <stop offset="100%" stopColor={RED} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* zero line: below it, the account is gone */}
      <line x1={X0 - 30} x2={X1 + 40} y1={Y_ZERO} y2={Y_ZERO} stroke="rgba(242,196,109,0.28)" strokeWidth={1.5} opacity={appear(f, 0, 10)} />
      {/* A: the high win rate, ahead most of the way - then the cliff */}
      <path d={PATH_A.d} fill="none" stroke={C.steel} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${drawA} 1`} filter="url(#glow)" opacity={0.95} />
      {fall > 0 && <line x1={LEDGE[0]} y1={LEDGE[1]} x2={fallX} y2={fallY} stroke={C.steel} strokeWidth={4} strokeLinecap="round" filter="url(#glow)" />}
      <line x1={PEAK_A[0]} y1={PEAK_A[1] - 14} x2={CRASH[0]} y2={CRASH[1]} stroke={RED} strokeWidth={2.5} strokeDasharray="10 9" opacity={appear(f, BOOM + 4, 10) * 0.75} />
      <circle cx={CRASH[0]} cy={CRASH[1]} r={40 + 130 * ring} fill="url(#boom)" opacity={crashed * (1 - ring * 0.55)} />
      <circle cx={CRASH[0]} cy={CRASH[1]} r={20 + 140 * ring} fill="none" stroke={RED} strokeWidth={3} opacity={crashed * (1 - ring)} />
      <circle cx={CRASH[0]} cy={CRASH[1]} r={9} fill={RED} opacity={crashed} filter="url(#glow)" />
      {/* B: the low win rate, slow and steady, ending in the light */}
      <path d={PATH_B.d} fill="none" stroke="#ffd98f" strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${drawB} 1`} filter="url(#glow)" />
      <line x1={X0} y1={py(B[0]) - 20} x2={PATH_B.end[0]} y2={PATH_B.end[1] - 20} stroke={C.gold} strokeWidth={2.5} strokeDasharray="12 10" opacity={shine * 0.7} />
      <circle cx={PATH_B.end[0]} cy={PATH_B.end[1]} r={170 * pulse * (0.6 + 0.4 * shine)} fill="url(#halo)" opacity={shine} />
      <circle cx={PATH_B.end[0]} cy={PATH_B.end[1]} r={11} fill="#fff6e0" opacity={shine} filter="url(#glow)" />
    </svg>
  );
};

const Tag: React.FC<{ x: number; y: number; o: number; color: string; children: React.ReactNode; align?: "left" | "right" }> = ({ x, y, o, color, children, align = "left" }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      opacity: o,
      transform: `translate(${align === "right" ? "-100%" : "0"}, ${(1 - o) * 12}px)`,
      ...zh(700),
      fontSize: 34,
      color,
      whiteSpace: "nowrap",
      textShadow: "0 2px 14px rgba(0,0,0,0.9)",
    }}
  >
    {children}
  </div>
);

// ---------------- the title block ----------------

const METAL = "linear-gradient(175deg, #fff3d6 0%, #f2c46d 38%, #a8743a 62%, #f7dca6 80%, #8a5a2b 100%)";
const TITLE: React.CSSProperties = { ...zh(900), fontSize: 190, lineHeight: 1.1, letterSpacing: 14, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };

const TitleBlock: React.FC<{ f: number }> = ({ f }) => {
  const kick = appear(f, SLAM - 3, 8);
  const slam = ease("expo.out")(clampI(f, SLAM - 4, SLAM + 6));
  const sheen = interpolate(f, [SLAM + 8, SLAM + 34], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sub = appear(f, DRAW + 6, 10);
  const tag = appear(f, DRAW + 14, 10);
  const invite = appear(f, DRAW + 22, 10);
  const [p1, w1, p2, w2] = CV.sub;
  return (
    <div style={{ position: "absolute", left: 130, top: 280 }}>
      <div style={{ ...zh(700), fontSize: 46, color: C.gold, letterSpacing: 6, opacity: kick, transform: `translateX(${(1 - kick) * -20}px)` }}>{CV.kicker}</div>
      <div style={{ position: "relative", marginTop: 6 }}>
        <div
          style={{
            ...TITLE,
            backgroundImage: METAL,
            opacity: slam,
            transform: `scale(${1.5 - 0.5 * slam})`,
            transformOrigin: "left center",
            filter: `blur(${(1 - slam) * 16}px) drop-shadow(0 10px 40px rgba(242,196,109,${0.25 * slam}))`,
          }}
        >
          {CV.title}
        </div>
        {/* one light sweep across the metal once it lands */}
        <div style={{ ...TITLE, position: "absolute", inset: 0, backgroundImage: `linear-gradient(105deg, transparent ${sheen - 12}%, rgba(255,255,255,0.85) ${sheen}%, transparent ${sheen + 12}%)`, opacity: slam }}>
          {CV.title}
        </div>
      </div>
      <div style={{ ...zh(700), fontSize: 44, color: "#fff", marginTop: 26, opacity: sub, transform: `translateY(${(1 - sub) * 16}px)`, letterSpacing: 2 }}>
        <span style={{ color: "#ffd98f" }}>{p1}</span> {w1}
        <span style={{ color: "rgba(255,255,255,0.35)", margin: "0 22px" }}>·</span>
        <span style={{ color: C.steel }}>{p2}</span> <span style={{ color: RED }}>{w2}</span>
      </div>
      <div style={{ ...zh(500), fontSize: 32, color: "rgba(255,255,255,0.72)", marginTop: 26, letterSpacing: 8, opacity: tag }}>{CV.tagline}</div>
      <div style={{ ...zh(500), fontSize: 30, color: "#ffd98f", marginTop: 30, letterSpacing: 2, opacity: invite, transform: `translateY(${(1 - invite) * 10}px)` }}>{CV.invite}</div>
    </div>
  );
};

/**
 * Cold-open cover: the conclusion first, as a poster - the counter-intuitive claim in metal
 * type on the left, the two curves that prove it on the right - fast, on hard sound beats,
 * then it punches through into the hook.
 */
export const Cover: React.FC = () => {
  const f = useCurrentFrame();
  const labels = appear(f, BOOM + 2, 8);
  // camera shake and a red flash when A hits zero
  const k = f - BOOM;
  const shake = k >= 0 && k < 12 ? (1 - k / 12) ** 2 * 14 : 0;
  const flash = k >= 0 ? Math.exp(-k / 4) * 0.22 : 0;
  // exit: push through the frame into the hook
  const out = ease("power2.in")(clampI(f, EXIT - 4, FRAMES));
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${Math.sin(k * 7.3) * shake}px, ${Math.cos(k * 9.1) * shake}px) scale(${1 + out * 0.18})`,
        filter: `blur(${out * 12}px)`,
        opacity: 1 - out,
      }}
    >
      {/* keep the left third quiet for the title */}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(3,4,11,0.9) 0%, rgba(3,4,11,0.55) 40%, rgba(3,4,11,0.1) 65%, rgba(3,4,11,0) 100%)" }} />
      <KeyVisual f={f} />
      <Tag x={X0 - 10} y={250} o={labels} color="#ffd98f">
        {CV.labelB}
      </Tag>
      <Tag x={CRASH[0] - 30} y={CRASH[1] + 34} o={labels} color={RED} align="right">
        {CV.labelA}
      </Tag>
      <TitleBlock f={f} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${(CRASH[0] / 1920) * 100}% ${(CRASH[1] / 1080) * 100}%, rgba(255,77,109,${flash * 2}) 0%, rgba(255,77,109,${flash * 0.4}) 45%, transparent 75%)` }} />
    </AbsoluteFill>
  );
};
