// Shared visual kit: backdrop, 3D stage, 3D boxes/candles, order book, terminal tags, overlays.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONT, H, L, MONO, RADIUS, T, W } from "./theme";

export const LOGO = staticFile("sanzhong/brand/lvp-logo.jpg");

// ---------- colour helpers ----------
const hex = (c: string) => {
  const m = c.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
};
export const shade = (c: string, k: number) => {
  if (!c.startsWith("#")) return c;
  const [r, g, b] = hex(c).map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return `rgb(${r},${g},${b})`;
};
export const alpha = (c: string, a: number) => {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
};

// ---------- backdrop ----------
export const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ background: `radial-gradient(120% 70% at 50% 40%, ${C.navy} 0%, #090E18 50%, ${C.bg} 100%)` }} />
    <svg width={W} height={H} style={{ position: "absolute" }}>
      <defs>
        <pattern id="sz-g-s" width={36} height={36} patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" fill="none" stroke={C.grid} strokeWidth={1} />
        </pattern>
        <pattern id="sz-g-l" width={180} height={180} patternUnits="userSpaceOnUse">
          <rect width={180} height={180} fill="url(#sz-g-s)" />
          <path d="M180 0H0V180" fill="none" stroke="rgba(92,214,255,0.08)" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#sz-g-l)" />
    </svg>
    <AbsoluteFill style={{ background: "radial-gradient(90% 60% at 50% 45%, transparent 55%, rgba(0,0,0,0.6) 100%)" }} />
  </AbsoluteFill>
);

// ---------- 3D stage ----------
export type Cam = { rx?: number; ry?: number; s?: number; x?: number; y?: number; z?: number; ox?: number; oy?: number };
/**
 * A real CSS-3D space in the 1080×1920 plane. Content is clipped (soft edge) to the stage band
 * y 262–1372, so nothing 3D can ever run into the captions or the header.
 */
export const Stage: React.FC<{ cam?: Cam; o?: number; children: React.ReactNode; clip?: boolean }> = ({ cam = {}, o = 1, children, clip = true }) => {
  const { rx = 0, ry = 0, s = 1, x = 0, y = 0, z = 0, ox = 540, oy = 817 } = cam;
  const top = L.stageTop;
  const bot = L.stageBottom;
  const mask = `linear-gradient(to bottom, transparent ${top - 6}px, #000 ${top + 22}px, #000 ${bot - 22}px, transparent ${bot + 6}px)`;
  return (
    <AbsoluteFill style={{ opacity: o, ...(clip ? { WebkitMaskImage: mask, maskImage: mask } : {}) }}>
      <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: `${ox}px ${oy}px` }}>
        <AbsoluteFill
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: `${ox}px ${oy}px`,
            transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`,
          }}
        >
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Solid 3D box. (x, y) = top-left of the front face; the front face sits at z = z0 + d/2. */
export const Box: React.FC<{ x: number; y: number; w: number; h: number; d: number; color: string; o?: number; z0?: number; glow?: number; outline?: string }> = ({
  x,
  y,
  w,
  h,
  d,
  color,
  o = 1,
  z0 = 0,
  glow = 0,
  outline,
}) => {
  if (o <= 0 || w <= 0 || h <= 0) return null;
  const base: React.CSSProperties = { position: "absolute", backfaceVisibility: "visible" };
  const side = shade(color, 0.55);
  const topC = shade(color, 1.25);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", transform: `translateZ(${z0}px)`, opacity: o }}>
      <div style={{ ...base, left: x, top: y, width: w, height: h, background: color, transform: `translateZ(${d / 2}px)`, boxShadow: glow ? `0 0 ${24 * glow}px ${alpha(color.startsWith("#") ? color : "#FFFFFF", 0.7 * glow)}` : undefined, outline: outline ? `2px solid ${outline}` : undefined }} />
      <div style={{ ...base, left: x, top: y, width: w, height: h, background: side, transform: `translateZ(${-d / 2}px)` }} />
      <div style={{ ...base, left: x + w - d / 2, top: y, width: d, height: h, background: side, transform: "rotateY(90deg)" }} />
      <div style={{ ...base, left: x - d / 2, top: y, width: d, height: h, background: side, transform: "rotateY(-90deg)" }} />
      <div style={{ ...base, left: x, top: y - d / 2, width: w, height: d, background: topC, transform: "rotateX(90deg)" }} />
      <div style={{ ...base, left: x, top: y + h - d / 2, width: w, height: d, background: side, transform: "rotateX(-90deg)" }} />
    </div>
  );
};

export type Candle = { o: number; h: number; l: number; c: number };
export type PriceMap = (p: number) => number;
export const priceMap = (pMin: number, pMax: number, yTop: number, yBot: number): PriceMap => (p) => yTop + ((pMax - p) / (pMax - pMin)) * (yBot - yTop);

/** One 3D candle. `grow` 0→1 prints it from the open to the close (the wick follows the body). */
export const Candle3D: React.FC<{ k: Candle; x: number; w: number; y: PriceMap; grow?: number; o?: number; d?: number; glow?: number; color?: string }> = ({
  k,
  x,
  w,
  y,
  grow = 1,
  o = 1,
  d,
  glow = 0,
  color,
}) => {
  if (grow <= 0 || o <= 0) return null;
  const up = k.c >= k.o;
  const col = color ?? (up ? C.green : C.red);
  const c = k.o + (k.c - k.o) * grow;
  const hi = Math.max(k.o, c) + (k.h - Math.max(k.o, k.c)) * grow;
  const lo = Math.min(k.o, c) - (Math.min(k.o, k.c) - k.l) * grow;
  const top = y(Math.max(k.o, c));
  const bot = y(Math.min(k.o, c));
  const bodyH = Math.max(3, bot - top);
  const depth = d ?? Math.min(26, w * 0.7);
  return (
    <>
      <div style={{ position: "absolute", left: x - 1.5, top: y(hi), width: 3, height: Math.max(1, y(lo) - y(hi)), background: shade(col, 0.95), opacity: o }} />
      <Box x={x - w / 2} y={top} w={w} h={bodyH} d={depth} color={col} o={o} glow={glow} />
    </>
  );
};

// ---------- tags (terminal style: object colour, ≤16 px from the object, no cards or leaders) ----------
export const Tag: React.FC<{ x: number; y: number; text: string; color: string; o?: number; align?: "l" | "r" | "c"; size?: number; z?: number; mono?: boolean }> = ({
  x,
  y,
  text,
  color,
  o = 1,
  align = "l",
  size = T.s + 4,
  z = 30,
  mono = false,
}) => {
  if (o <= 0) return null;
  const tx = align === "l" ? "0" : align === "r" ? "-100%" : "-50%";
  return (
    <div
      data-qa="tag"
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateZ(${z}px) translate(${tx}, -50%) translateY(${(1 - o) * 6}px)`,
        opacity: o,
        fontFamily: mono ? MONO : FONT,
        fontSize: size,
        fontWeight: 700,
        color,
        whiteSpace: "nowrap",
        letterSpacing: 1,
        textShadow: "0 0 6px rgba(7,9,13,0.95), 0 2px 4px rgba(7,9,13,0.95), 0 0 14px rgba(7,9,13,0.9)",
      }}
    >
      {text}
    </div>
  );
};

/** Horizontal level line (key level, entry). */
export const LevelLine: React.FC<{ x1: number; x2: number; y: number; color: string; o?: number; dash?: boolean; width?: number; z?: number }> = ({ x1, x2, y, color, o = 1, dash, width = 3, z = 14 }) => {
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x1,
        top: y - width / 2,
        width: Math.max(0, x2 - x1),
        height: width,
        transform: `translateZ(${z}px)`,
        opacity: o,
        background: dash ? `repeating-linear-gradient(90deg, ${color} 0 14px, transparent 14px 24px)` : color,
        boxShadow: dash ? undefined : `0 0 12px ${alpha(color, 0.6)}`,
      }}
    />
  );
};

/** Faint price grid behind a chart. */
export const PriceGrid: React.FC<{ x1: number; x2: number; y1: number; y2: number; step: number; o?: number }> = ({ x1, x2, y1, y2, step, o = 1 }) => {
  const rows: number[] = [];
  for (let y = y1; y <= y2 + 0.5; y += step) rows.push(y);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: o, transform: "translateZ(-20px)" }}>
      {rows.map((y, i) => (
        <div key={i} style={{ position: "absolute", left: x1, top: y, width: x2 - x1, height: 1, background: "rgba(145,160,181,0.13)" }} />
      ))}
      <div style={{ position: "absolute", left: x1, top: y1, width: 1, height: y2 - y1, background: "rgba(145,160,181,0.18)" }} />
    </div>
  );
};

// ---------- order book (DOM ladder) ----------
export type BookRow = {
  p: number; // price (ticks)
  bid?: number;
  ask?: number;
  bidColor?: string; // override bar colour (e.g. resting cyan)
  askColor?: string;
  bidGlow?: number;
  askGlow?: number;
  last?: boolean; // last traded price row
  stops?: number; // pending stop orders drawn as dashed chips in the empty ask half
  stopFire?: number; // 0→1 ignites them one after another
  stopO?: number;
};
export const BOOK = { w: 640, priceW: 140, rowH: 62 };
export const fmtPrice = (p: number) => (3400 + p * 0.25).toFixed(2);

/** Order book centred at x; row k's centre is at y + (k + 0.5) * rowH. Rows are top = highest price. */
export const Book: React.FC<{ x: number; y: number; rows: BookRow[]; max: number; o?: number; lastColor?: string; dim?: number }> = ({ x, y, rows, max, o = 1, lastColor = C.amber, dim = 0 }) => {
  if (o <= 0) return null;
  const half = (BOOK.w - BOOK.priceW) / 2;
  const left = x - BOOK.w / 2;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: o, transformStyle: "preserve-3d" }}>
      {/* panel */}
      <div style={{ position: "absolute", left: left - 18, top: y - 58, width: BOOK.w + 36, height: rows.length * BOOK.rowH + 76, borderRadius: RADIUS, background: C.panel, border: `1px solid ${C.border}`, transform: "translateZ(-14px)" }} />
      <div style={{ position: "absolute", left: left, top: y - 46, width: half, textAlign: "center", fontFamily: FONT, fontSize: T.xs, color: C.greenText, letterSpacing: 2 }}>买单 BID</div>
      <div style={{ position: "absolute", left: x + BOOK.priceW / 2, top: y - 46, width: half, textAlign: "center", fontFamily: FONT, fontSize: T.xs, color: C.redText, letterSpacing: 2 }}>卖单 ASK</div>
      {rows.map((r, k) => {
        const cy = y + k * BOOK.rowH;
        const bh = BOOK.rowH - 14;
        const bw = r.bid ? (half - 86) * Math.min(1, r.bid / max) : 0;
        const aw = r.ask ? (half - 86) * Math.min(1, r.ask / max) : 0;
        return (
          <React.Fragment key={r.p}>
            {r.last ? <div style={{ position: "absolute", left: left, top: cy + 2, width: BOOK.w, height: BOOK.rowH - 4, background: alpha(lastColor, 0.13), border: `2px solid ${alpha(lastColor, 0.75)}`, borderRadius: 8, transform: "translateZ(2px)" }} /> : null}
            <div style={{ position: "absolute", left: x - BOOK.priceW / 2, top: cy, width: BOOK.priceW, height: BOOK.rowH, lineHeight: `${BOOK.rowH}px`, textAlign: "center", fontFamily: MONO, fontSize: T.s, fontWeight: 700, color: r.last ? lastColor : C.text, opacity: 1 - dim * 0.6, transform: "translateZ(6px)" }}>
              {fmtPrice(r.p)}
            </div>
            {r.bid ? (
              <>
                <Box x={x - BOOK.priceW / 2 - 8 - bw} y={cy + 7} w={bw} h={bh} d={12} color={r.bidColor ?? C.green} o={1 - dim * 0.65} glow={r.bidGlow} />
                <div style={{ position: "absolute", left: left + 2, top: cy, width: 68, height: BOOK.rowH, lineHeight: `${BOOK.rowH}px`, textAlign: "left", fontFamily: MONO, fontSize: T.xs + 2, color: r.bidColor ?? C.greenText, opacity: 1 - dim * 0.6, transform: "translateZ(8px)" }}>
                  {Math.round(r.bid)}
                </div>
              </>
            ) : null}
            {r.ask ? (
              <>
                <Box x={x + BOOK.priceW / 2 + 8} y={cy + 7} w={aw} h={bh} d={12} color={r.askColor ?? C.red} o={1 - dim * 0.65} glow={r.askGlow} />
                <div style={{ position: "absolute", left: x + BOOK.w / 2 - 70, top: cy, width: 68, height: BOOK.rowH, lineHeight: `${BOOK.rowH}px`, textAlign: "right", fontFamily: MONO, fontSize: T.xs + 2, color: r.askColor ?? C.redText, opacity: 1 - dim * 0.6, transform: "translateZ(8px)" }}>
                  {Math.round(r.ask)}
                </div>
              </>
            ) : null}
            {r.stops
              ? Array.from({ length: r.stops }, (_, j) => {
                  const fire = Math.max(0, Math.min(1, (r.stopFire ?? 0) * r.stops! - j));
                  return (
                    <div
                      key={j}
                      style={{
                        position: "absolute",
                        left: x + BOOK.priceW / 2 + 14 + j * 40,
                        top: cy + 13,
                        width: 32,
                        height: BOOK.rowH - 26,
                        borderRadius: 4,
                        border: `2px dashed ${C.redText}`,
                        background: fire > 0 ? alpha(C.red, 0.35 + 0.65 * fire) : "transparent",
                        boxShadow: fire > 0.5 ? `0 0 16px ${alpha(C.red, 0.8)}` : undefined,
                        transform: `translateZ(${10 + 30 * fire}px)`,
                        opacity: (r.stopO ?? 1) * (1 - Math.max(0, fire - 0.8) * 5),
                      }}
                    />
                  );
                })
              : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
export const rowY = (y: number, k: number) => y + (k + 0.5) * BOOK.rowH;

/** Incoming market order: a chevron puck flying along x into a row (u 0→1). */
export const Hit: React.FC<{ x0: number; x1: number; y: number; u: number; color: string; dir?: 1 | -1; size?: number }> = ({ x0, x1, y, u, color, dir = 1, size = 34 }) => {
  if (u <= 0 || u >= 1) return null;
  const x = x0 + (x1 - x0) * u;
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, transform: "translateZ(40px)", opacity: Math.min(1, u * 5, (1 - u) * 6) }}>
      <svg width={size} height={size} viewBox="0 0 34 34">
        <path d={dir === 1 ? "M6 4 L28 17 L6 30 L12 17 Z" : "M28 4 L6 17 L28 30 L22 17 Z"} fill={color} />
      </svg>
      <div style={{ position: "absolute", top: size / 2 - 2, left: dir === 1 ? -60 : size, width: 60, height: 4, background: `linear-gradient(${dir === 1 ? "90deg" : "270deg"}, transparent, ${alpha(color, 0.8)})` }} />
    </div>
  );
};

// ---------- chrome: header, sim tag, disclaimer ----------
export const SimTag: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div
    style={{
      ...style,
      fontFamily: FONT,
      fontSize: T.xs,
      fontWeight: 700,
      color: C.amber,
      padding: "8px 14px",
      borderRadius: 999,
      border: `1px solid ${alpha(C.amber, 0.35)}`,
      background: "rgba(7,9,13,0.72)",
      letterSpacing: 1,
      whiteSpace: "nowrap",
    }}
  >
    教学示意 · 非实盘数据
  </div>
);

export const Header: React.FC<{ label: string; labelIn: number; o?: number }> = ({ label, labelIn, o = 1 }) => (
  <div style={{ position: "absolute", left: L.left, right: W - L.right, top: L.headerY, height: 96, fontFamily: FONT, opacity: o }}>
    <div style={{ position: "absolute", left: 0, top: 0, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 84, height: 84, borderRadius: RADIUS, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 6px 20px rgba(0,0,0,0.45)" }}>
        <Img src={LOGO} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div>
        <div style={{ color: C.text, fontSize: T.m, fontWeight: 700, letterSpacing: 1 }}>LVP订单流</div>
        <div style={{ color: C.sub, fontSize: T.xs, marginTop: 4, opacity: labelIn, transform: `translateY(${(1 - labelIn) * 6}px)` }}>{label} · 三种成交</div>
      </div>
    </div>
    <SimTag style={{ position: "absolute", right: 0, top: 22 }} />
  </div>
);

export const Disclaimer: React.FC = () => (
  <div style={{ position: "absolute", left: L.left, right: W - L.right, top: L.disclaimerY, textAlign: "center", fontFamily: FONT, fontSize: T.xs, color: C.sub, opacity: 0.85, letterSpacing: 1 }}>
    仅作交易教育，不构成投资建议 · 不承诺胜率与收益
  </div>
);

/** Big drawn X over the stage (先别盯 K 线). */
export const BigX: React.FC<{ u: number; cx: number; cy: number; r: number; color: string; o?: number }> = ({ u, cx, cy, r, color, o = 1 }) => {
  if (u <= 0 || o <= 0) return null;
  const a = Math.min(1, u * 2);
  const b = Math.max(0, u * 2 - 1);
  const len = r * 2 * Math.SQRT2;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
      <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} stroke={color} strokeWidth={22} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - a)} />
      <line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} stroke={color} strokeWidth={22} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - b)} />
    </svg>
  );
};
