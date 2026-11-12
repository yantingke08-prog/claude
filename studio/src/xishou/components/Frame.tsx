import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { prog, window01 } from "../anim";
import { CAPTIONS, CHAPTERS, type Line } from "../script";
import { C, FONT, H, L, MONO, RADIUS, T, W, toneColor, type Tone } from "../theme";

export const LOGO = staticFile("assets/brand/lvp-logo.jpg");

/** Terminal backdrop: navy→black falloff, fine grid, static seeded grain, vignette. */
export const BackgroundGrid: React.FC<{ push?: number }> = ({ push = 1 }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 70% at 50% 38%, ${C.navy} 0%, #090E18 48%, ${C.bg} 100%)`,
      }}
    />
    <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 45%" }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <pattern id="xs-grid-s" width={36} height={36} patternUnits="userSpaceOnUse">
            <path d="M36 0H0V36" fill="none" stroke={C.grid} strokeWidth={1} />
          </pattern>
          <pattern id="xs-grid-l" width={180} height={180} patternUnits="userSpaceOnUse">
            <rect width={180} height={180} fill="url(#xs-grid-s)" />
            <path d="M180 0H0V180" fill="none" stroke="rgba(92,214,255,0.09)" strokeWidth={1} />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#xs-grid-l)" />
      </svg>
    </AbsoluteFill>
    {/* static grain: fixed seed, no per-frame flicker */}
    <svg width={W} height={H} style={{ position: "absolute", opacity: 0.07, mixBlendMode: "screen" }}>
      <filter id="xs-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter="url(#xs-grain)" />
    </svg>
    <AbsoluteFill style={{ background: "radial-gradient(90% 60% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
  </AbsoluteFill>
);

/** Fixed top layer: logo nameplate, chapter label, synthetic-data tag. */
export const BrandHeader: React.FC = () => {
  const f = useCurrentFrame();
  const ch = CHAPTERS.find((c) => f >= c.start && f < c.start + c.dur) ?? CHAPTERS[CHAPTERS.length - 1];
  const lf = f - ch.start;
  const labelIn = prog(lf, 0, 14);
  const isEnd = ch.id === "end";
  return (
    <div style={{ position: "absolute", left: L.left, right: W - L.right, top: L.headerY, height: 96, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 0, top: 0, display: "flex", alignItems: "center", gap: 18, opacity: isEnd ? 1 - prog(lf, 0, 16) : 1 }}>
        <div style={{ width: 84, height: 84, borderRadius: RADIUS, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 6px 20px rgba(0,0,0,0.45)" }}>
          <Img src={LOGO} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div>
          <div style={{ color: C.text, fontSize: T.m, fontWeight: 700, letterSpacing: 1 }}>LVP订单流</div>
          <div
            style={{
              color: C.sub,
              fontSize: T.xs,
              fontWeight: 400,
              marginTop: 4,
              opacity: labelIn,
              transform: `translateY(${(1 - labelIn) * 6}px)`,
            }}
          >
            {ch.label} · 吸收 Absorption
          </div>
        </div>
      </div>
      <SimTag style={{ position: "absolute", right: 0, top: 22 }} />
    </div>
  );
};

export const SimTag: React.FC<{ style?: React.CSSProperties; text?: string; color?: string }> = ({ style, text = "教学示意 · 非实盘数据", color = C.amber }) => (
  <div
    style={{
      ...style,
      fontFamily: FONT,
      fontSize: T.xs,
      fontWeight: 700,
      color,
      padding: "8px 14px",
      borderRadius: 999,
      border: `1px solid ${color}55`,
      background: "rgba(7,9,13,0.72)",
      letterSpacing: 1,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

export const Disclaimer: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: L.left,
      right: W - L.right,
      top: L.disclaimerY,
      textAlign: "center",
      fontFamily: FONT,
      fontSize: T.xs,
      color: C.sub,
      opacity: 0.85,
      letterSpacing: 1,
    }}
  >
    仅作交易教育，不构成投资建议 · 不承诺胜率与收益
  </div>
);

const units = (t: string) => Array.from(t).reduce((n, ch) => n + (/[A-Za-z0-9 .]/.test(ch) ? 0.55 : 1), 0);

/** Break a caption into ≤2 balanced lines at punctuation (never inside a highlighted word). */
export const splitCaption = (line: Line): string[] => {
  const t = line.t;
  if (units(t) <= 15) return [t];
  const chars = Array.from(t);
  const protectedIdx = new Set<number>();
  for (const w of line.hi ?? []) {
    const at = t.indexOf(w);
    if (at >= 0) for (let k = at; k < at + w.length; k++) protectedIdx.add(k);
  }
  let best = -1;
  let bestScore = Infinity;
  chars.forEach((ch, i) => {
    if (i >= chars.length - 2 || protectedIdx.has(i) || !/[，、：；。！？—]/.test(ch)) return;
    const score = Math.abs(units(chars.slice(0, i + 1).join("")) - units(chars.slice(i + 1).join("")));
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  if (best < 0) {
    // no usable punctuation: break right before the highlighted phrase, else in the middle
    const w = (line.hi ?? []).map((x) => t.indexOf(x)).find((k) => k > 2);
    best = (w ?? Math.floor(chars.length / 2)) - 1;
  }
  return [chars.slice(0, best + 1).join(""), chars.slice(best + 1).join("").trimStart()];
};

const renderHi = (text: string, line: Line) => {
  const words = (line.hi ?? []).filter((w) => text.includes(w));
  const color = line.tone ? toneColor(line.tone) : C.text;
  if (!words.length) return text;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  return text.split(re).map((part, i) =>
    words.includes(part) ? (
      <span key={i} style={{ color }}>
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
};

/** Caption band: ≤2 lines, bold, semantic keyword colour, safely above the platform UI. */
export const Caption: React.FC = () => {
  const f = useCurrentFrame();
  const cap = CAPTIONS.find((c) => f >= c.from && f < c.to);
  // the end card sets the thesis as its own title; no duplicate caption under it
  if (!cap || cap.chapter === "end") return null;
  const inP = prog(f, cap.from, 6);
  const lines = splitCaption(cap.line);
  const widest = Math.max(...lines.map(units));
  // 52–58 px, shrinking only when the widest line would not fit 952 px
  const size = Math.max(52, Math.min(T.cap, Math.floor((L.right - L.left - 16) / widest)));
  return (
    <div
      style={{
        position: "absolute",
        left: L.left,
        right: W - L.right,
        top: L.captionTop,
        height: L.captionBottom - L.captionTop,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.25,
          color: C.text,
          textAlign: "center",
          maxWidth: L.right - L.left,
          textShadow: "0 3px 10px rgba(0,0,0,0.85)",
          opacity: inP,
          transform: `translateY(${(1 - inP) * 8}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {lines.map((t, i) => (
          <div key={i}>{renderHi(t, cap.line)}</div>
        ))}
      </div>
    </div>
  );
};

/** Full-screen chapter keyword. Used for 3 chapters only. */
export const Slate: React.FC<{ f: number; big: string; small: string; tone: Tone; until: number }> = ({ f, big, small, tone, until }) => {
  const o = window01(f, 0, until, 10);
  const wipe = prog(f, 2, 16);
  const color = toneColor(tone);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ background: `rgba(7,9,13,${0.92 * o})`, alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ opacity: o, textAlign: "center" }}>
        <div style={{ clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`, fontSize: T.xxl, fontWeight: 700, color: C.text, letterSpacing: 4 }}>
          {big.split(/(≠)/).map((p, i) => (
            <span key={i} style={{ color: p === "≠" ? color : C.text }}>
              {p}
            </span>
          ))}
        </div>
        <div style={{ height: 3, width: 560 * wipe, background: color, margin: "26px auto 22px", opacity: 0.9 }} />
        <div style={{ fontSize: T.m, color: C.sub, fontWeight: 400, opacity: prog(f, 12, 12) }}>{small}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Brand seal: the original logo, unaltered, in a framed plate. Appears at key nodes only. */
export const LVPBrandMark: React.FC<{ f: number; x: number; y: number; size: number; text?: string; sub?: string; color?: string }> = ({ f, x, y, size, text, sub, color = C.amber }) => {
  const p = prog(f, 0, 16);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        opacity: p,
        transform: `scale(${0.94 + 0.06 * p})`,
        fontFamily: FONT,
        textAlign: "center",
      }}
    >
      <div style={{ width: size, height: size, borderRadius: RADIUS * 1.4, overflow: "hidden", border: `2px solid ${color}`, boxShadow: `0 0 0 6px rgba(7,9,13,0.85), 0 18px 50px rgba(0,0,0,0.6)` }}>
        <Img src={LOGO} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      {text ? <div style={{ marginTop: 22, fontSize: T.l, fontWeight: 700, color: C.text, whiteSpace: "nowrap", marginLeft: -200, marginRight: -200 }}>{text}</div> : null}
      {sub ? <div style={{ marginTop: 8, fontSize: T.s, color, whiteSpace: "nowrap", marginLeft: -200, marginRight: -200 }}>{sub}</div> : null}
    </div>
  );
};

/** Panel frame with a consistent title tab. */
export const Panel: React.FC<{ x: number; y: number; w: number; h: number; title?: string; en?: string; o?: number; accent?: string; children?: React.ReactNode }> = ({ x, y, w, h, title, en, o = 1, accent = C.border, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: RADIUS,
      border: `1px solid ${accent}`,
      background: C.panel,
      boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
      opacity: o,
      overflow: "hidden",
    }}
  >
    {title ? (
      <div style={{ position: "absolute", left: 18, top: 14, fontFamily: FONT, fontSize: T.xs, color: C.sub, letterSpacing: 1, zIndex: 2 }}>
        <span style={{ color: C.text, fontWeight: 700 }}>{title}</span>
        {en ? <span style={{ fontFamily: MONO, marginLeft: 10 }}>{en}</span> : null}
      </div>
    ) : null}
    {children}
  </div>
);

/** Annotation pill with a leader line to an exact anchor point (absolute px). */
export const Tag: React.FC<{
  x: number;
  y: number;
  ax?: number;
  ay?: number;
  text: string;
  en?: string;
  color: string;
  o: number;
  size?: number;
  align?: "left" | "right" | "center";
}> = ({ x, y, ax, ay, text, en, color, o, size = T.s, align = "left" }) => {
  if (o <= 0) return null;
  const tx = align === "left" ? "0" : align === "right" ? "-100%" : "-50%";
  return (
    <>
      {ax !== undefined && ay !== undefined ? (
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity: o }}>
          <line x1={ax} y1={ay} x2={x} y2={y} stroke={color} strokeWidth={1.5} strokeDasharray="4 4" />
          <circle cx={ax} cy={ay} r={5} fill={color} />
        </svg>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(${tx}, -50%) translateY(${(1 - o) * 6}px)`,
          opacity: o,
          fontFamily: FONT,
          fontSize: size,
          fontWeight: 700,
          color,
          background: "rgba(7,9,13,0.86)",
          border: `1px solid ${color}66`,
          borderRadius: 10,
          padding: "8px 14px",
          whiteSpace: "nowrap",
        }}
      >
        {text}
        {en ? <span style={{ fontFamily: MONO, fontWeight: 400, fontSize: size * 0.72, color: C.sub, marginLeft: 10 }}>{en}</span> : null}
      </div>
    </>
  );
};

/** Moves only by slow push / drift. One main move per shot. */
export const Cam: React.FC<{ s?: number; x?: number; y?: number; ox?: number; oy?: number; children: React.ReactNode }> = ({ s = 1, x = 0, y = 0, ox = 540, oy = 800, children }) => (
  <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: `${ox}px ${oy}px` }}>{children}</AbsoluteFill>
);
