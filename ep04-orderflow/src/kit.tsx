// Shared look + 3D primitives. CSS 3D (perspective + preserve-3d): real depth and camera moves,
// no WebGL, so studio / stills / renders work on machines without a GPU.
import React, { createContext, useContext } from "react";
import { AbsoluteFill } from "remotion";
import { normalise, type Unit } from "./timelineCore";

export const W = 1080;
export const H = 1920;
// Platform UI covers y < 260 and y > 1520. Captions sit at 1400–1490, so scene content stays in SAFE.
export const SAFE = { top: 290, bottom: 1340, left: 40, right: W - 40 };
export const CAPTION_Y = 1445;

export const C = {
  bg0: "#05080f",
  bg1: "#0c1526",
  grid: "rgba(110,150,220,0.16)",
  up: "#ff4d5e", // 主动买 / 上涨
  upD: "#a3162a",
  down: "#1fd38a", // 主动卖 / 下跌
  downD: "#0b7a4b",
  passive: "#4cb4ff", // 被动挂单
  passiveD: "#1a5a99",
  forced: "#ffb020", // 被迫成交 / 止损
  forcedD: "#a86500",
  text: "#eef3ff",
  dim: "rgba(238,243,255,0.5)",
  faint: "rgba(238,243,255,0.18)",
};
export const FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC","Source Han Sans SC","Hiragino Sans GB",sans-serif';
export const MONO = '"Consolas","SF Mono","Menlo","DejaVu Sans Mono",monospace';

// ---------- easing ----------
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeIO = (x: number) => {
  const v = clamp01(x);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
};
/** 0→1 eased, starting at time a (s) over d seconds. */
export const ramp = (t: number, a: number, d = 0.45) => ease((t - a) / d);
export const rampIO = (t: number, a: number, d = 0.8) => easeIO((t - a) / d);
/** pop-in with a little overshoot */
export const pop = (t: number, a: number, d = 0.35) => {
  const x = clamp01((t - a) / d);
  const c = 1.9;
  return x >= 1 ? 1 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** visible between a and b (s) with short fades */
export const win = (t: number, a: number, b = Infinity, f = 0.25) => clamp01((t - a) / f) * clamp01((b - t) / f);

// ---------- shot context: every time a scene uses comes from here ----------
export type ShotCtx = {
  t: number; // seconds since this shot started
  dur: number; // shot length (s)
  units: Unit[]; // caption units in this shot (times are global)
  start: number; // global start of the shot
  /** local time (s) at which the voiceover starts saying `text` inside this shot */
  at: (text: string, nth?: number) => number;
  /** local time at which `text` finishes */
  end: (text: string, nth?: number) => number;
  /** local start of the k-th caption unit of this shot */
  unit: (k: number) => number;
};
const Ctx = createContext<ShotCtx | null>(null);
export const ShotProvider = Ctx.Provider;
export const useShot = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShot outside a shot");
  return v;
};

const warned = new Set<string>();
export const makeShotCtx = (units: Unit[], start: number, dur: number, t: number): ShotCtx => {
  const spoken = units.map((u) => u.spoken).join("");
  const times = units.flatMap((u) => u.words);
  const find = (text: string, nth: number) => {
    const q = normalise(text);
    let idx = -1;
    for (let k = 0; k <= nth; k++) idx = spoken.indexOf(q, idx + 1);
    if (idx < 0 || !q) {
      const key = `${units[0]?.shot}:${text}`;
      if (!warned.has(key)) {
        warned.add(key);
        console.warn(`[anchor] "${text}" not found in shot ${units[0]?.shot}; using shot start`);
      }
      return null;
    }
    return { idx, len: q.length };
  };
  return {
    t,
    dur,
    units,
    start,
    at: (text, nth = 0) => {
      const f = find(text, nth);
      return f ? times[f.idx].start - start : 0;
    },
    end: (text, nth = 0) => {
      const f = find(text, nth);
      return f ? times[f.idx + f.len - 1].end - start : 0;
    },
    unit: (k) => (units[Math.min(k, units.length - 1)]?.start ?? start) - start,
  };
};

// ---------- 3D stage ----------
export type Cam = { x: number; y: number; z: number; rx: number; ry: number };
export const cam = (x = 0, y = 0, z = 0, rx = 0, ry = 0): Cam => ({ x, y, z, rx, ry });
export const camLerp = (a: Cam, b: Cam, p: number): Cam => ({
  x: lerp(a.x, b.x, p),
  y: lerp(a.y, b.y, p),
  z: lerp(a.z, b.z, p),
  rx: lerp(a.rx, b.rx, p),
  ry: lerp(a.ry, b.ry, p),
});
/** camera path: list of [time, Cam]; eased between keys */
export const camPath = (t: number, keys: [number, Cam][]): Cam => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    const [t1, c1] = keys[k];
    const [t0, c0] = keys[k - 1];
    if (t < t1) return camLerp(c0, c1, easeIO((t - t0) / Math.max(0.001, t1 - t0)));
  }
  return keys[keys.length - 1][1];
};

/**
 * Beat camera: holds still, then on each key time makes a quick eased move (d seconds) to that pose.
 * Moves land on the voiceover word instead of creeping across the whole gap between anchors.
 */
export const camSteps = (t: number, keys: [number, Cam][], d = 0.65): Cam => {
  let c = keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    const [tk, ck] = keys[k];
    if (t < tk) break;
    c = camLerp(c, ck, easeIO((t - tk) / d));
  }
  return c;
};

/** short decaying shake starting at a (s) */
export const shake = (t: number, a: number, amp = 10, d = 0.45) =>
  t > a && t < a + d ? Math.sin((t - a) * 70) * amp * (1 - (t - a) / d) : 0;

/**
 * Aim the camera so world point (px, py) sits at the centre of the content band (screen y≈845),
 * magnified `zoom` times. Perspective 1700, origin (540, 806).
 */
export const aim = (px: number, pyy: number, zoom = 1, rx = 6, ry = -4): Cam => {
  const s = Math.max(0.5, zoom);
  return { x: px - 540, y: pyy - 806 - 39 / s, z: 1700 - 1700 / s, rx, ry };
};

export const Stage: React.FC<{ cam: Cam; children: React.ReactNode; floorY?: number; drift?: number }> = ({
  cam: c,
  children,
  floorY = 1290,
  drift = 0,
}) => (
  <AbsoluteFill
    style={{
      perspective: 1700,
      perspectiveOrigin: "540px 806px",
      overflow: "hidden",
      // 3D content never reaches the platform UI / header (top) or the caption band (bottom)
      WebkitMaskImage: "linear-gradient(180deg, transparent 300px, #000 340px, #000 1330px, transparent 1372px)",
      maskImage: "linear-gradient(180deg, transparent 300px, #000 340px, #000 1330px, transparent 1372px)",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        transformStyle: "preserve-3d",
        transformOrigin: "540px 800px",
        transform: `translate3d(${-c.x}px, ${-c.y}px, ${c.z}px) rotateX(${c.rx}deg) rotateY(${c.ry + drift}deg)`,
      }}
    >
      <Floor y={floorY} />
      {children}
    </div>
  </AbsoluteFill>
);

const Floor: React.FC<{ y: number }> = ({ y }) => (
  <div
    style={{
      position: "absolute",
      left: -1600,
      top: y,
      width: W + 3200,
      height: 3600,
      transformOrigin: "50% 0",
      transform: "translateZ(700px) rotateX(90deg)",
      backgroundImage: `linear-gradient(${C.grid} 2px, transparent 2px), linear-gradient(90deg, ${C.grid} 2px, transparent 2px)`,
      backgroundSize: "120px 120px",
      WebkitMaskImage: "radial-gradient(ellipse 45% 55% at 50% 30%, #000 30%, transparent 75%)",
      maskImage: "radial-gradient(ellipse 45% 55% at 50% 30%, #000 30%, transparent 75%)",
    }}
  />
);

/** place children at a 3D point (world px; y down, z toward camera) */
export const At: React.FC<{
  x: number;
  y: number;
  z?: number;
  ry?: number;
  rx?: number;
  s?: number;
  o?: number;
  children: React.ReactNode;
}> = ({ x, y, z = 0, ry = 0, rx = 0, s = 1, o = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      transformStyle: "preserve-3d",
      transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${s})`,
      opacity: o,
    }}
  >
    {children}
  </div>
);

// ---------- pseudo-3D box (front gradient + side + top, highlight) ----------
export const Box: React.FC<{
  x: number; // left
  y: number; // top
  w: number;
  h: number;
  d?: number; // depth
  color: string;
  dark: string;
  glow?: number; // 0..1
  o?: number;
  dashed?: boolean;
}> = ({ x, y, w, h, d = 26, color, dark, glow = 0, o = 1, dashed }) => {
  if (w <= 0.5 || h <= 0.5) return null;
  const front = dashed
    ? { border: `3px dashed ${color}`, background: `${color}22` }
    : {
        background: `linear-gradient(90deg, ${shade(color, 0.25)} 0%, ${color} 38%, ${dark} 100%)`,
        boxShadow: `inset 0 2px 0 rgba(255,255,255,0.35), 0 0 ${18 + 40 * glow}px ${color}${glow ? "aa" : "55"}`,
      };
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transformStyle: "preserve-3d", opacity: o }}>
      {!dashed && (
        <>
          <div
            style={{
              position: "absolute",
              left: w,
              top: 0,
              width: d,
              height: h,
              background: `linear-gradient(90deg, ${dark}, ${shade(dark, -0.35)})`,
              transformOrigin: "0 0",
              transform: "rotateY(90deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: w,
              height: d,
              background: `linear-gradient(180deg, ${shade(color, 0.45)}, ${color})`,
              transformOrigin: "0 0",
              transform: "rotateX(-90deg)",
            }}
          />
        </>
      )}
      <div style={{ position: "absolute", inset: 0, borderRadius: 3, ...front }} />
    </div>
  );
};

/** lighten (p>0) / darken (p<0) a #rrggbb colour */
export const shade = (hex: string, p: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(p >= 0 ? v + (255 - v) * p : v * (1 + p)),
  );
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/** pseudo-3D candle: open/close/high/low already in world y px (y down) */
export const Candle: React.FC<{
  cx: number;
  open: number;
  close: number;
  high: number;
  low: number;
  w?: number;
  o?: number;
  glow?: number;
}> = ({ cx, open, close, high, low, w = 54, o = 1, glow = 0 }) => {
  const up = close <= open; // y down: smaller y = higher price
  const col = up ? C.up : C.down;
  const dark = up ? C.upD : C.downD;
  const top = Math.min(open, close);
  const h = Math.max(4, Math.abs(open - close));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", opacity: o }}>
      <div
        style={{
          position: "absolute",
          left: cx - 2.5,
          top: high,
          width: 5,
          height: Math.max(0, low - high),
          background: shade(col, 0.2),
          transform: `translateZ(${-w * 0.25}px)`,
          borderRadius: 3,
        }}
      />
      <Box x={cx - w / 2} y={top} w={w} h={h} d={w * 0.5} color={col} dark={dark} glow={glow} />
    </div>
  );
};

/** Terminal-style tag: short, object-coloured text placed within 16 px of its object. No card, no leader, no dot. */
export const Tag: React.FC<{
  x: number;
  y: number;
  text: string;
  color: string;
  size?: number;
  o?: number;
  align?: "left" | "right" | "center";
  z?: number;
  weight?: number;
}> = ({ x, y, text, color, size = 40, o = 1, align = "left", z = 2, weight = 800 }) => {
  if (o <= 0.001) return null;
  const tx = align === "left" ? "0" : align === "right" ? "-100%" : "-50%";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate3d(0,0,${z}px) translate(${tx}, -50%) translateY(${(1 - o) * 10}px)`,
        opacity: o,
        color,
        fontFamily: FONT,
        fontWeight: weight,
        fontSize: size,
        letterSpacing: 1,
        whiteSpace: "nowrap",
        textShadow: `0 0 18px ${color}88, 0 2px 0 rgba(0,0,0,0.6)`,
      }}
    >
      {text}
    </div>
  );
};

export const Txt: React.FC<{ x: number; y: number; text: string; size?: number; color?: string; o?: number; mono?: boolean; align?: "left" | "center" | "right" }> = ({
  x,
  y,
  text,
  size = 28,
  color = C.dim,
  o = 1,
  mono,
  align = "left",
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(${align === "left" ? "0" : align === "right" ? "-100%" : "-50%"}, -50%)`,
      color,
      opacity: o,
      fontSize: size,
      fontFamily: mono ? MONO : FONT,
      fontWeight: mono ? 600 : 500,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

/** glowing projectile (an aggressive / forced order) */
export const Pellet: React.FC<{ x: number; y: number; color: string; r?: number; o?: number }> = ({ x, y, color, r = 14, o = 1 }) =>
  o <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x - r * 1.6,
        top: y - r / 1.4,
        width: r * 3.2,
        height: r * 1.4,
        borderRadius: r,
        background: `linear-gradient(90deg, transparent, ${color})`,
        boxShadow: `0 0 ${r * 1.6}px ${color}`,
        opacity: o,
        transform: "translateZ(14px)",
      }}
    />
  );

/** horizontal line in world space (price level, key level …) */
export const HLine: React.FC<{ x: number; y: number; w: number; color: string; o?: number; dashed?: boolean; thick?: number }> = ({
  x,
  y,
  w,
  color,
  o = 1,
  dashed,
  thick = 3,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y - thick / 2,
      width: w,
      height: dashed ? 0 : thick,
      borderTop: dashed ? `${thick}px dashed ${color}` : undefined,
      background: dashed ? undefined : color,
      boxShadow: dashed ? undefined : `0 0 14px ${color}`,
      opacity: o,
    }}
  />
);

export const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 90% 60% at 50% 38%, ${C.bg1} 0%, ${C.bg0} 70%)`,
    }}
  />
);

/** deterministic pseudo-random */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Rewind look (2D overlay, content band only): scanlines rolling upward, a bright tracking bar and a ◀◀ glyph.
 * o = 0..1 strength; the scene itself plays its motion backwards while this is on.
 */
export const RewindFx: React.FC<{ o: number; t: number }> = ({ o, t }) => {
  if (o <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: 300, width: W, height: 1070, overflow: "hidden", pointerEvents: "none", zIndex: 50 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: -12,
          width: W,
          height: 1100,
          background: "repeating-linear-gradient(180deg, rgba(200,220,255,0.07) 0 2px, transparent 2px 7px)",
          transform: `translateY(${-((t * 420) % 7)}px)`,
          opacity: o,
        }}
      />
      <div style={{ position: "absolute", left: 0, top: 1070 - ((t * 1500) % 1170), width: W, height: 46, background: "linear-gradient(180deg, transparent, rgba(220,235,255,0.12), transparent)", opacity: o }} />
      <div
        style={{
          position: "absolute",
          left: W / 2,
          top: 90,
          transform: "translate(-50%,-50%)",
          fontFamily: FONT,
          fontSize: 76,
          fontWeight: 900,
          letterSpacing: -10,
          color: "#ffffff",
          opacity: o * (0.75 + 0.25 * Math.sin(t * 18)),
          textShadow: "0 0 24px rgba(255,255,255,0.6)",
        }}
      >
        ◀◀
      </div>
    </div>
  );
};
