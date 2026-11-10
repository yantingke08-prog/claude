// 2D layer over the set: the data panels (ladder, tape, volume, spread), the annotations and the big type.
// Rules carried over from earlier reviews: no narrative text appears before the narration reaches it, and
// anything over a busy picture sits on a solid plate with a thin glowing edge. Each shot has one focus;
// the panels around it come and go with the shot (hard cuts), not all at once.
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "./copy";
import { ARMED, CHAIN, CONVERT, FIRST_HIT, GONE, JUMP, JUMP2, MINES, PASSIVE_AT, TRADES, TRIGGER_K, beadK, ky, lastK, lots, px, sizeAt, volIn, volTo, type Side } from "./book";
import { FPS, FRAMES, L, Lc, Le, S, TL, backOut, clamp01, cubicInOut, expoOut, hold, smooth, span } from "./cue";
import { PIECES, X, type Dir } from "./director";
import { mono, sans, serif } from "./fonts";
import { HERO, PAL } from "./Scene";

const INK = "#F5F7FA";
const SOFT = "rgba(245,247,250,0.78)";
const DIM = "rgba(245,247,250,0.42)";
const BLUE = "#7fa8ff";
const FX = (c: string, a = 0.92) => ({ background: `rgba(6,8,14,${a})`, border: `1.5px solid ${c}`, boxShadow: `0 0 0 1px #000, 0 0 18px ${c}55, 0 8px 26px rgba(0,0,0,0.55)` });
const num = (v: number, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const pop = (f: number, a: number, d = 9) => span(f, a, a + d, backOut);

// Screen zones (1080×1920). Every label stays inside SAFE and out of the caption band; a top strip holds the
// progress bars, the main area runs from MAIN to LOW, and a short bottom strip under the captions holds volume.
const SAFE = { l: 40, r: 1040, t: 120, b: 1740 };
const HDR = 124;
const STRIP = 190;
const MAIN = 300;
const LOW = 1440;
const CAP_TOP = 1480;
const BOT = 1606;
/** rough width of a run of text: CJK is square, Latin / digits about 0.6 em */
const tw = (s: string, size: number) => [...s].reduce((w, ch) => w + (ch.codePointAt(0)! > 0x2e80 ? size : size * 0.6), 0);
const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fin = (f: number, a: number, d = 8) => span(f, a, a + d, expoOut);

type P = { x: number; y: number };
type Proj = (x: number, y: number, z?: number) => P;
const useProj = (d: Dir): Proj => {
  const { width, height } = useVideoConfig();
  const cam = new THREE.PerspectiveCamera(d.fov, width / height, 0.1, 3000);
  cam.position.copy(d.pos);
  cam.lookAt(d.target);
  cam.updateMatrixWorld();
  return (x, y, z = 0) => {
    const v = new THREE.Vector3(x, y, z).project(cam);
    return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
  };
};

// ================================================================ primitives
/** big type: the picture recedes, characters arrive as they are spoken, the key words light up */
type SLine = { text: string; at: number; size: number; hl?: string; color?: string };
const Statement: React.FC<{ f: number; lines: SLine[]; end: number; top: number; kicker?: string; scrim?: number; rule?: boolean; hot?: string }> = ({ f, lines, end, top, kicker, scrim = 1, rule = true, hot = PAL.gold }) => {
  const a = lines[0].at;
  const k = span(f, a - 4, a + 5, smooth) * (1 - span(f, end - 5, end, smooth));
  if (k < 0.01) return null;
  const STEP = 1.6;
  const h = lines.reduce((s, l) => s + l.size * 1.32, 0) + (kicker ? 56 : 0);
  const last = lines[lines.length - 1];
  const done = last.at + [...last.text].length * STEP;
  const kr = span(f, done - 4, done + 14, expoOut);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: k * scrim, background: "rgba(3,5,10,0.42)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: top - 150, height: h + 300, opacity: k * scrim, background: "linear-gradient(180deg, rgba(3,5,10,0) 0%, rgba(3,5,10,0.88) 28%, rgba(3,5,10,0.88) 72%, rgba(3,5,10,0) 100%)" }} />
      <div data-qa={`type:${lines[0].text}`} data-qa-text="1" data-qa-kind="type" style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", opacity: span(k, 0, 0.4) }}>
        {kicker && <div style={{ ...mono(), fontSize: 30, letterSpacing: 12, color: hot, marginBottom: 22, textShadow: `0 0 18px ${hot}88` }}>— {kicker} —</div>}
        {lines.map((l, i) => {
          const hs = l.hl ? l.text.indexOf(l.hl) : -1;
          const he = hs + (l.hl?.length ?? 0);
          return (
            <div key={i} style={{ ...serif(), fontSize: l.size, lineHeight: 1.32, letterSpacing: 3, whiteSpace: "nowrap" }}>
              {[...l.text].map((ch, j) => {
                const kj = span(f, l.at + j * STEP, l.at + j * STEP + 9, expoOut);
                const isHot = j >= hs && j < he;
                return (
                  <span key={j} style={{ display: "inline-block", opacity: kj, transform: `translateY(${(1 - kj) * 0.3 * l.size}px)`, filter: kj < 0.98 ? `blur(${(1 - kj) * 10}px)` : undefined, color: isHot ? hot : (l.color ?? INK), textShadow: isHot ? `0 0 ${18 + 22 * kr}px ${hot}aa, 0 3px 0 #000, 0 0 3px #000` : "0 4px 20px rgba(0,0,0,0.95), 0 0 3px #000" }}>
                    {ch}
                  </span>
                );
              })}
            </div>
          );
        })}
        {rule && <div style={{ margin: "18px auto 0", width: Math.min(900, [...last.text].length * last.size * 0.9) * kr, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${hot}00, ${hot}, ${hot}00)`, boxShadow: `0 0 22px ${hot}` }} />}
      </div>
    </>
  );
};

/** a plate pinned to a screen point: ring, leader, then title and notes */
const Tag: React.FC<{ f: number; a: number; b: number; at: P; plate: P; side: "l" | "r"; color?: string; title: string; notes?: [string, number][]; size?: number; mono?: boolean }> = ({ f, a, b, at, plate, side, color = PAL.gold, title, notes = [], size = 46, mono: m }) => {
  const { width, height } = useVideoConfig();
  const out = 1 - span(f, b - 4, b, smooth);
  if (f < a || f >= b || out < 0.01) return null;
  const draw = span(f, a + 1, a + 9, smooth);
  const kp = span(f, a + 6, a + 14, expoOut);
  // the plate must fit: flip to the other side of the anchor if it runs off, then clamp into the safe area
  const pw = Math.max(tw(title, size), ...notes.map(([n]) => tw(n, 34))) + 50;
  const ph = size * 1.2 + notes.length * 34 * 1.3 + 26;
  if (side === "r" && plate.x + pw > SAFE.r && at.x - (plate.x - at.x) - pw >= SAFE.l) (side = "l"), (plate = { ...plate, x: at.x - (plate.x - at.x) });
  if (side === "l" && plate.x - pw < SAFE.l && at.x + (at.x - plate.x) + pw <= SAFE.r) (side = "r"), (plate = { ...plate, x: at.x + (at.x - plate.x) });
  plate = { x: side === "r" ? clampN(plate.x, SAFE.l, SAFE.r - pw) : clampN(plate.x, SAFE.l + pw, SAFE.r), y: clampN(plate.y, STRIP + ph / 2, LOW - ph / 2) };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <circle cx={at.x} cy={at.y} r={10 + 8 * (1 - draw)} fill="none" stroke={color} strokeWidth={3} opacity={draw} />
        <circle cx={at.x} cy={at.y} r={3.5} fill={color} opacity={draw} />
        <line x1={at.x} y1={at.y} x2={at.x + (plate.x - at.x) * draw} y2={at.y + (plate.y - at.y) * draw} stroke={color} strokeWidth={2.5} />
      </svg>
      <div data-qa={`tag:${title}`} data-qa-kind="card" style={{ position: "absolute", top: plate.y, left: side === "r" ? plate.x : undefined, right: side === "l" ? width - plate.x : undefined, transform: `translate(0, calc(-50% + ${(1 - kp) * 12}px))`, opacity: kp, padding: "10px 22px 12px", borderRadius: 12, whiteSpace: "nowrap", textAlign: side === "r" ? "left" : "right", ...FX(color) }}>
        <div style={{ ...(m ? mono() : serif()), fontSize: size, lineHeight: 1.2, color: INK }}>{title}</div>
        {notes.map(([n, t], i) => {
          const ki = fin(f, t);
          return (
            <div key={i} style={{ ...sans(500), fontSize: 34, lineHeight: 1.3, color: i === notes.length - 1 && notes.length > 1 ? color : SOFT, opacity: ki, transform: `translateY(${(1 - ki) * 8}px)` }}>
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** a status stamp: thick double border, lands with a slam */
const Stamp: React.FC<{ f: number; a: number; x: number; y: number; text: string; color: string; rot?: number; size?: number }> = ({ f, a, x, y, text, color, rot = -7, size = 54 }) => {
  if (f < a) return null;
  const k = span(f, a, a + 7, expoOut);
  const hw = ((tw(text, size) + 4 * [...text].length + 60) / 2) * 1.12 + Math.abs(rot) * 2,
    hh = (size * 1.45 + 24) / 2 + Math.abs(rot) * 4;
  x = clampN(x, SAFE.l + hw, SAFE.r - hw);
  y = clampN(y, STRIP + hh, LOW - hh);
  return (
    <div data-qa={`stamp:${text}`} data-qa-kind="card" style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${1.3 - 0.3 * k})`, opacity: k, ...sans(700), fontSize: size, color, padding: "4px 22px 8px", border: `4px double ${color}`, borderRadius: 10, background: "rgba(6,8,14,0.86)", whiteSpace: "nowrap", letterSpacing: 4, textShadow: `0 0 16px ${color}aa`, boxShadow: `0 0 26px ${color}55` }}>
      {text}
    </div>
  );
};

const Arrow: React.FC<{ f: number; a: number; from: P; to: P; color: string; w?: number; d?: number }> = ({ f, a, from, to, color, w = 5, d = 10 }) => {
  const k = span(f, a, a + d, expoOut);
  if (k < 0.01) return null;
  const e = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const hd = 22;
  const p1 = { x: e.x - hd * Math.cos(ang - 0.45), y: e.y - hd * Math.sin(ang - 0.45) };
  const p2 = { x: e.x - hd * Math.cos(ang + 0.45), y: e.y - hd * Math.sin(ang + 0.45) };
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 0 6px ${color})` }}>
      <line x1={from.x} y1={from.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`${e.x},${e.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={color} />
    </svg>
  );
};

/** corner brackets round a box (a selection / scan reticle) */
const Corners: React.FC<{ f: number; a: number; x0: number; y0: number; x1: number; y1: number; color: string; label?: string }> = ({ f, a, x0, y0, x1, y1, color, label }) => {
  const k = span(f, a, a + 10, expoOut);
  if (k < 0.01) return null;
  const g = (1 - k) * 60;
  const L0 = 46;
  const c = (x: number, y: number, sx: number, sy: number) => `M${x + sx * L0},${y} L${x},${y} L${x},${y + sy * L0}`;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: k, filter: `drop-shadow(0 0 6px ${color})` }}>
        <path d={[c(x0 - g, y0 - g, 1, 1), c(x1 + g, y0 - g, -1, 1), c(x0 - g, y1 + g, 1, -1), c(x1 + g, y1 + g, -1, -1)].join(" ")} fill="none" stroke={color} strokeWidth={4} />
      </svg>
      {label && <div data-qa={`corners:${label}`} style={{ position: "absolute", left: x0 - g, top: y0 - g - 54, ...mono(), fontSize: 28, letterSpacing: 4, color, opacity: k, padding: "2px 12px", background: "rgba(6,8,14,0.86)", border: `1px solid ${color}88`, borderRadius: 6 }}>{label}</div>}
    </>
  );
};

/** a solid plate with a small header */
const Panel: React.FC<{ x: number; y: number; w: number; h?: number; head?: string; color?: string; k?: number; children: React.ReactNode; pad?: string; qa?: string; kind?: "data" | "card" }> = ({ x, y, w, h, head, color = BLUE, k = 1, children, pad = "10px 14px 12px", qa, kind = "data" }) =>
  k < 0.01 ? null : (
    <div data-qa={qa ?? `panel:${head ?? ""}`} data-qa-kind={kind} style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: Math.min(1, k * 1.3), transform: `translateY(${(1 - k) * 14}px)`, borderRadius: 12, padding: pad, boxSizing: "border-box", overflow: "hidden", ...FX(color, 0.88) }}>
      {head && <div style={{ ...sans(700), fontSize: 24, letterSpacing: 3, color, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>{head}</div>}
      {children}
    </div>
  );

// ================================================================ data panels
const clock = (f: number) => {
  const s = 9 * 3600 + 31 * 60 + f / FPS;
  const hh = Math.floor(s / 3600),
    mm = Math.floor((s % 3600) / 60),
    ss = s % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${ss.toFixed(1).padStart(4, "0")}`;
};

/** price ladder (DOM): bid size | price | ask size, centred on the last price */
const Ladder: React.FC<{ f: number; x: number; y: number; w: number; row?: number; up?: number; down?: number; k?: number; hidden?: boolean; mark?: { side: Side; k: number; color: string }[]; head?: boolean }> = ({ f, x, y, w, row = 46, up = 6, down = 4, k = 1, hidden, mark = [], head = true }) => {
  if (k < 0.01) return null;
  const c = Math.round(beadK(f));
  const lk = lastK(f);
  const rows = Array.from({ length: up + down + 1 }, (_, i) => c + up - i);
  const fs = Math.min(row * 0.5, (w - 16) * 0.42 / 7 / 0.62);
  const inner = w - 16;
  const side = inner * 0.29,
    mid = inner - 2 * side;
  const MAX = 70;
  return (
    <Panel x={x} y={y} w={w} head={head ? C.ladder : undefined} k={k} pad="10px 8px 10px" qa="ladder">
      {head && (
        <div style={{ display: "flex", ...sans(500), fontSize: fs * 0.72, color: DIM, marginBottom: 4 }}>
          {C.ladderCols.map((s) => (
            <div key={s} style={{ width: s === C.ladderCols[1] ? mid : side, textAlign: "center" }}>
              {s}
            </div>
          ))}
        </div>
      )}
      {rows.map((q) => {
        const b = sizeAt(f, "bid", q),
          a = sizeAt(f, "ask", q);
        const hit = TRADES.some((t) => t.k === q && f >= t.f && f < t.f + 6);
        const isLast = q === lk && f >= FIRST_HIT;
        const m = mark.find((mm) => mm.k === q);
        const mine = hidden && MINES.find((mm) => mm.k === q && f < mm.at);
        return (
          <div key={q} style={{ position: "relative", display: "flex", height: row, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", background: hit ? "rgba(255,255,255,0.22)" : isLast ? "rgba(242,189,98,0.14)" : undefined, outline: m ? `2px solid ${m.color}` : isLast ? `1.5px solid ${PAL.gold}aa` : undefined, outlineOffset: -2, borderRadius: 4 }}>
            <div style={{ width: side, position: "relative", height: row - 10 }}>
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${Math.min(1, b / MAX) * 100}%`, background: `${PAL.up}66`, borderRadius: 3 }} />
              <div style={{ position: "absolute", right: 6, top: 0, ...mono(), fontSize: fs, lineHeight: `${row - 10}px`, color: b ? INK : DIM }}>{b ? b : ""}</div>
            </div>
            <div style={{ width: mid, textAlign: "center", ...mono(), fontSize: fs, color: isLast ? PAL.gold : SOFT }}>{px(q)}</div>
            <div style={{ width: side, position: "relative", height: row - 10 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(1, a / MAX) * 100}%`, background: `${PAL.down}66`, borderRadius: 3 }} />
              <div style={{ position: "absolute", left: 6, top: 0, ...mono(), fontSize: fs, lineHeight: `${row - 10}px`, color: a ? INK : DIM }}>{a ? a : TRADES.some((t) => t.k === q && t.f <= f) ? "0" : ""}</div>
              {mine && <div style={{ position: "absolute", right: 2, top: (row - 10) / 2 - 11, width: 22, height: 22, transform: "rotate(45deg) scale(0.8)", border: `2px dashed ${PAL.amber}`, background: `${PAL.amber}44`, boxShadow: `0 0 10px ${PAL.amber}` }} />}
            </div>
          </div>
        );
      })}
    </Panel>
  );
};

/** time and sales */
const Tape: React.FC<{ f: number; x: number; y: number; w: number; n?: number; k?: number }> = ({ f, x, y, w, n = 8, k = 1 }) => {
  if (k < 0.01) return null;
  const rows = TRADES.filter((t) => t.f <= f).slice(-n).reverse();
  return (
    <Panel x={x} y={y} w={w} head={C.tape} k={k} qa="tape">
      <div style={{ display: "flex", ...sans(500), fontSize: 20, color: DIM, marginBottom: 2 }}>
        {C.tapeCols.map((s, i) => (
          <div key={s} style={{ flex: [1.25, 1.45, 0.6][i], textAlign: i === 0 ? "left" : "right" }}>
            {s}
          </div>
        ))}
      </div>
      {rows.length === 0 && <div style={{ ...sans(500), fontSize: 26, color: DIM, padding: "12px 0", opacity: 0.6 + 0.4 * Math.sin(f / 5) }}>{C.tapeWait} …</div>}
      {rows.map((t, i) => {
        const fresh = 1 - clamp01((f - t.f) / 10);
        const col = t.stop ? PAL.amber : PAL.up;
        return (
          <div key={`${t.f}-${i}`} style={{ display: "flex", ...mono(), fontSize: 23, lineHeight: "34px", color: INK, background: `rgba(255,255,255,${0.2 * fresh})`, borderLeft: `3px solid ${col}`, paddingLeft: 6, marginTop: 2 }}>
            <div style={{ flex: 1.25, color: SOFT, fontSize: 18 }}>{clock(t.f).slice(3)}</div>
            <div style={{ flex: 1.45, textAlign: "right", color: col, fontSize: 21 }}>{px(t.k)}</div>
            <div style={{ flex: 0.6, textAlign: "right" }}>{t.q}</div>
          </div>
        );
      })}
    </Panel>
  );
};

/** volume histogram (one bar per 10 frames) with the running total and delta */
const Vol: React.FC<{ f: number; x: number; y: number; w: number; h?: number; n?: number; k?: number; delta?: boolean }> = ({ f, x, y, w, h = 150, n = 30, k = 1, delta = true }) => {
  if (k < 0.01) return null;
  const B = 10;
  const end = Math.floor(f / B) * B;
  const bars = Array.from({ length: n }, (_, i) => {
    const a = end - (n - 1 - i) * B;
    return { v: volIn(a, a + B), stop: TRADES.some((t) => t.stop && t.f >= a && t.f < a + B) };
  });
  const tot = volTo(f);
  const bw = (w - 28) / n;
  return (
    <Panel x={x} y={y} w={w} k={k} qa="vol">
      <div style={{ display: "flex", justifyContent: "space-between", ...sans(700), fontSize: 24, letterSpacing: 2, color: BLUE }}>
        <span>
          {C.vol} <span style={{ ...mono(), color: INK, fontSize: 30 }}>{num(tot)}</span> <span style={{ ...sans(500), fontSize: 22, color: SOFT }}>{C.lots}</span>
        </span>
        {delta && (
          <span>
            <span style={{ ...sans(500), fontSize: 22, color: SOFT }}>{C.delta} </span>
            <span style={{ ...mono(), color: tot ? PAL.up : INK, fontSize: 30 }}>{tot ? "+" : ""}{num(tot)}</span>
          </span>
        )}
      </div>
      <div style={{ position: "relative", height: h, marginTop: 6, borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
        {bars.map((b, i) => (
          <div key={i} style={{ position: "absolute", left: i * bw, bottom: 0, width: bw - 3, height: Math.min(1, b.v / 16) * h, background: b.stop ? PAL.amber : PAL.up, boxShadow: b.v ? `0 0 10px ${b.stop ? PAL.amber : PAL.up}88` : undefined, borderRadius: "3px 3px 0 0" }} />
        ))}
      </div>
    </Panel>
  );
};

const bestBid = (f: number) => [...Array(17)].map((_, i) => 10 - i).find((q) => sizeAt(f, "bid", q) > 0) ?? -1;
const bestAsk = (f: number) => [...Array(17)].map((_, i) => i - 6).find((q) => sizeAt(f, "ask", q) > 0) ?? 1;
/** best bid · spread · best ask */
const Spread: React.FC<{ f: number; y?: number; k?: number }> = ({ f, y = STRIP, k = 1 }) => {
  if (k < 0.01) return null;
  const b = bestBid(f),
    a = bestAsk(f);
  const cell = (lab: string, v: string, c: string) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ ...sans(500), fontSize: 22, color: SOFT }}>{lab}</div>
      <div style={{ ...mono(), fontSize: 38, color: c }}>{v}</div>
    </div>
  );
  return (
    <Panel x={150} y={y} w={780} k={k} pad="6px 10px 8px" qa="spread">
      <div style={{ display: "flex", alignItems: "center" }}>
        {cell(C.bid1, px(b), PAL.up)}
        {cell(C.spread, ((a - b) * 0.25).toFixed(2), PAL.gold)}
        {cell(C.ask1, px(a), PAL.down)}
      </div>
    </Panel>
  );
};

/** the three ways to act, as a progress bar across the top */
const Types: React.FC<{ f: number; k: number }> = ({ f, k }) => {
  if (k < 0.01) return null;
  const at = [Lc("o2", "被动订单"), Lc("o3", "主动订单"), Lc("o6", "止损订单")];
  const cur = at.filter((a) => f >= a).length - 1;
  return (
    <div data-qa="types" style={{ position: "absolute", left: SAFE.l, right: 1080 - SAFE.r, top: STRIP, display: "flex", gap: 12, opacity: k }}>
      {C.three.map((s, i) => {
        const on = i === cur;
        const col = [PAL.up, PAL.gold, PAL.amber][i];
        const named = f >= at[i];
        return (
          <div key={s} style={{ flex: 1, textAlign: "center", padding: "4px 0 8px", borderRadius: 10, ...sans(700), fontSize: 36, color: on ? "#06070b" : named ? INK : DIM, background: on ? col : "rgba(8,11,18,0.88)", border: `1.5px solid ${col}${on ? "" : "66"}`, boxShadow: on ? `0 0 22px ${col}aa` : undefined }}>
            <span style={{ ...mono(), fontSize: 24, marginRight: 8, opacity: 0.8 }}>0{i + 1}</span>
            {named ? s : "· · ·"}
          </div>
        );
      })}
    </div>
  );
};

/** a numbered case card, top left */
const CaseCard: React.FC<{ f: number; a: number; n: number; title: string; notes: [string, number][]; color: string; y?: number; tag?: string }> = ({ f, a, n, title, notes, color, y = 290, tag }) => {
  const k = fin(f, a, 10);
  if (k < 0.01) return null;
  return (
    <div data-qa={`case:${title}`} data-qa-kind="card" style={{ position: "absolute", left: 40, top: y, width: 560, opacity: k, transform: `translateY(${(1 - k) * 18}px)`, borderRadius: 14, padding: "14px 26px 18px", ...FX(color) }}>
      <div style={{ ...mono(), fontSize: 26, letterSpacing: 6, color }}>{tag ?? C.caseN[n]}</div>
      <div style={{ ...serif(), fontSize: 70, lineHeight: 1.2, color: INK }}>{title}</div>
      {notes.map(([s, t], i) => {
        const ki = fin(f, t);
        return (
          <div key={i} style={{ ...sans(500), fontSize: 36, lineHeight: 1.4, color: i === notes.length - 1 ? color : SOFT, opacity: ki, transform: `translateY(${(1 - ki) * 8}px)` }}>
            {s}
          </div>
        );
      })}
    </div>
  );
};

/** a big rolling number */
const Big: React.FC<{ x: number; y: number; label: string; value: string; color?: string; k?: number; sub?: string; align?: "left" | "center" }> = ({ x, y, label, value, color = INK, k = 1, sub, align = "left" }) =>
  k < 0.01 ? null : (
    <div style={{ position: "absolute", left: align === "center" ? 0 : x, right: align === "center" ? 0 : undefined, top: y, textAlign: align, opacity: k }}>
      <div data-qa={`big:${label}`} data-qa-kind="card" style={{ display: "inline-block", padding: "8px 24px 12px", borderRadius: 12, ...FX(color) }}>
        <div style={{ ...sans(700), fontSize: 24, letterSpacing: 3, color }}>{label}</div>
        <div style={{ ...mono(), fontSize: 72, lineHeight: 1.05, color: INK, textShadow: `0 0 18px ${color}88` }}>{value}</div>
        {sub && <div style={{ ...sans(500), fontSize: 28, color: SOFT }}>{sub}</div>}
      </div>
    </div>
  );

const Grid: React.FC<{ k?: number; z?: number }> = ({ k = 1, z = 1 }) => (
  <div style={{ position: "absolute", inset: 0, opacity: k, transform: `scale(${z})`, background: `radial-gradient(ellipse at 50% 40%, #121a2c 0%, ${PAL.bg} 70%)` }}>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
      {Array.from({ length: 28 }, (_, i) => (
        <line key={`h${i}`} x1={0} x2={1080} y1={i * 72} y2={i * 72} stroke="#2a3a5c" strokeWidth={1} />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`v${i}`} y1={0} y2={1920} x1={i * 72} x2={i * 72} stroke="#2a3a5c" strokeWidth={1} />
      ))}
    </svg>
  </div>
);

// ================================================================ captions
const KEY = ["买卖价差", "流动性", "限价单", "被动订单", "主动订单", "止损订单", "止损买单", "触发价", "做市商", "机构", "套保者", "短线交易者", "战报", "足迹图", "概率"];
const NO_BURN = new Set(["h1", "r1", "r3"]);
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = TL.captions.find((k) => f >= k.from && f < k.to);
  if (!c || NO_BURN.has(c.line)) return null;
  const k = span(f, c.from, c.from + 3) * (1 - span(f, c.to - 3, c.to));
  const re = new RegExp(`(${KEY.join("|")})`);
  return (
    <div style={{ position: "absolute", left: 48, right: 48, top: CAP_TOP, textAlign: "center", opacity: k }}>
      <span data-qa="caption" data-qa-kind="cap" style={{ display: "inline-block", maxWidth: 984, padding: "8px 28px 10px", borderRadius: 14, background: "rgba(6,8,14,0.82)", ...sans(500), fontSize: 54, lineHeight: 1.3, color: INK, letterSpacing: 1 }}>
        {c.text.split(re).map((s, i) => (KEY.includes(s) ? <span key={i} style={{ color: PAL.gold }}>{s}</span> : s))}
      </span>
    </div>
  );
};

// ================================================================ hook
const HookHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  if (!d.lay.startsWith("h.")) return null;
  const lay = d.lay;
  const climb = span(f, 1, L("h1") + 6, expoOut);
  const top = pr(0, HERO.hi, 0);
  const body = [pr(-1.6, HERO.c, 1.5), pr(1.6, HERO.o, 1.5)];
  const nOrd = Math.round(12480 * span(f, Lc("h2", "藏在"), Lc("h2", "藏在") + 50, (x) => x));
  return (
    <>
      <Statement f={f} top={260} end={L("h2") - 2} scrim={0.45} rule={false} lines={[{ text: C.report[0], at: L("h1"), size: 120 }, { text: C.report[1], at: Lc("h1", "只是"), size: 150, hl: "战报" }]} />
      {(lay === "h.shadow" || lay === "h.wick") && <Big x={48} y={1220} label="LAST" value={(5000 + 11.25 * climb).toFixed(2)} color={PAL.up} sub={`+${(0.225 * climb).toFixed(2)}%`} />}
      {lay === "h.wick" && <Tag f={f} a={d.shot.at + 2} b={d.shot.end} at={top} plate={{ x: top.x + 200, y: top.y + 120 }} side="r" color={PAL.up} title="5012.75" notes={[[C.high, d.shot.at + 10]]} mono />}
      {lay === "h.dive" && <Corners f={f} a={d.shot.at + 2} x0={Math.max(60, body[0].x)} y0={Math.max(300, body[0].y)} x1={Math.min(1020, body[1].x)} y1={Math.min(1400, body[1].y)} color={BLUE} label={C.xray} />}
      {lay === "h.dive" && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 300 + ((f - d.shot.at) * 22) % 1100, height: 3, background: `linear-gradient(90deg, ${BLUE}00, ${BLUE}, ${BLUE}00)`, boxShadow: `0 0 20px ${BLUE}` }} />
      )}
      {lay === "h.swarm" && (
        <>
          <Big x={0} y={1180} align="center" label="ORDERS" value={num(nOrd)} sub={C.orders} color={PAL.gold} k={pop(f, d.shot.at + 4)} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", gap: 20, opacity: fin(f, d.shot.at + 10) }}>
            {C.legend.map((s, i) => (
              <span key={s} style={{ ...sans(700), fontSize: 34, color: INK, padding: "4px 20px 6px", borderRadius: 10, ...FX(i ? PAL.down : PAL.up) }}>
                <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 9, background: i ? PAL.down : PAL.up, marginRight: 10, boxShadow: `0 0 12px ${i ? PAL.down : PAL.up}` }} />
                {s}
              </span>
            ))}
          </div>
        </>
      )}
      <Statement f={f} top={640} end={S("auction") - 6} kicker={`${C.ep} · ${C.titleEn}`} lines={[{ text: C.title, at: L("h3"), size: 190, hl: C.title }, { text: C.sub, at: Lc("h3", "先把"), size: 62 }]} />
    </>
  );
};

// ================================================================ the order book
const BookHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  const lay = d.lay;
  const s0 = d.shot.at;
  const P = (x: number, k: number, z = 0.5) => pr(X.book + x, ky(k), z);
  const is = (...l: string[]) => l.includes(lay);
  const bk = beadK(f);
  // panels per shot: ladder right, tape left, spread top, volume bottom
  const ladder = is("a.bids", "a.asks", "a.board", "a.urgent", "a.urgent2", "o.eat", "o.hop", "o.hop2", "s.hidden", "s.trigger", "s.convert", "s.after");
  const tape = is("a.board", "a.trade", "a.urgent", "o.eat", "s.convert", "s.boom2");
  const vol = is("a.board", "a.urgent", "a.urgent2", "o.eat", "s.after", "s.boom2");
  const spread = is("a.board", "a.gap", "a.trade", "a.urgent");
  const types = f >= L("o1") && f < S("players") && !is("o.three", "o.chain", "s.chart", "s.sweep");
  const lvl = (side: Side) => [...Array(6)].map((_, i) => (side === "bid" ? -1 - i : 1 + i)).filter((q) => sizeAt(f, side, q) > 0);
  const lotsOf = (side: Side) => lvl(side).reduce((s, q) => s + sizeAt(f, side, q), 0);
  return (
    <>
      {ladder && <Ladder f={f} x={SAFE.r - 300} y={MAIN + 10} w={300} row={42} k={fin(f, s0, 6)} hidden={is("s.hidden", "s.trigger")} mark={is("o.eat") ? [{ side: "ask", k: 1, color: PAL.gold }] : is("s.trigger") ? [{ side: "ask", k: TRIGGER_K, color: PAL.amber }] : []} />}
      {tape && <Tape f={f} x={SAFE.l} y={is("a.board", "s.boom2") ? 480 : is("o.eat") ? 820 : MAIN + 10} w={270} k={fin(f, s0, 6)} n={is("s.convert", "s.boom2") ? 10 : 8} />}
      {vol && <Vol f={f} x={SAFE.l} y={BOT} w={SAFE.r - SAFE.l} h={58} k={fin(f, s0, 6)} />}
      {spread && <Spread f={f} k={fin(f, s0, 6)} />}
      <Types f={f} k={types ? 1 : 0} />

      {/* auction */}
      <Statement f={f} top={980} end={L("a2") - 2} scrim={0.5} lines={[{ text: C.auction[0], at: Lc("a1", "永不落槌"), size: 130, hl: C.auction[0] }, { text: C.auction[1], at: Lc("a1", "拍卖"), size: 88 }]} />
      {is("a.gavel", "a.wide") && (
        <div style={{ position: "absolute", left: 48, top: 186, ...mono(), fontSize: 28, letterSpacing: 4, color: INK, padding: "6px 16px", borderRadius: 8, ...FX(PAL.up), opacity: fin(f, L("a1")) }}>
          <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 7, background: PAL.up, marginRight: 12, opacity: 0.5 + 0.5 * Math.sin(f / 3) }} />
          {C.live}
        </div>
      )}
      {is("a.bids") && <Big x={48} y={1200} label={C.bidCount} value={`${lvl("bid").length} ${C.levels} · ${lotsOf("bid")}`} sub={C.lots} color={PAL.up} k={pop(f, s0 + 2)} />}
      {is("a.bids") && <Tag f={f} a={Lc("a2", "买方") + 4} b={d.shot.end} at={P(-1.4, -2, 0.6)} plate={{ x: 90, y: 420 }} side="r" color={PAL.up} title={`${C.bid} ↑`} />}
      {is("a.asks") && <Big x={48} y={1200} label={C.askCount} value={`${lvl("ask").length} ${C.levels} · ${lotsOf("ask")}`} sub={C.lots} color={PAL.down} k={pop(f, s0 + 2)} />}
      {is("a.asks") && <Tag f={f} a={Lc("a2", "卖方") + 4} b={d.shot.end} at={P(-1.4, 3, 0.6)} plate={{ x: 90, y: 330 }} side="r" color={PAL.down} title={`${C.ask} ↓`} />}
      {is("a.board") && <Stamp f={f} a={s0 + 4} x={540} y={1330} text={C.board} color={BLUE} rot={0} size={40} />}
      {is("a.gap") &&
        (() => {
          const u = P(-0.4, 0.72),
            dn = P(-0.4, -0.72);
          const k = span(f, Lc("a3", "买卖价差") - 4, Lc("a3", "买卖价差") + 8, expoOut);
          return k > 0.01 ? (
            <div style={{ position: "absolute", inset: 0, opacity: k }}>
              <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, filter: `drop-shadow(0 0 8px ${PAL.gold})` }}>
                <polyline points={`${u.x - 150},${u.y} ${u.x - 175},${u.y} ${dn.x - 175},${dn.y} ${dn.x - 150},${dn.y}`} fill="none" stroke={PAL.gold} strokeWidth={4} />
              </svg>
              <div data-qa="tag:spread" data-qa-kind="card" style={{ position: "absolute", left: Math.max(SAFE.l, u.x - 600), top: (u.y + dn.y) / 2 - 260, padding: "8px 22px 12px", borderRadius: 12, whiteSpace: "nowrap", ...FX(PAL.gold) }}>
                <div style={{ ...serif(), fontSize: 54, color: PAL.gold }}>{C.spread}</div>
                <div style={{ ...mono(), fontSize: 40, color: INK }}>0.50 · {C.ticks}</div>
              </div>
            </div>
          ) : null;
        })()}
      <Statement f={f} top={560} end={L("a5") - 2} scrim={0.9} lines={[{ text: C.myth[0], at: Lc("a4", "买的人多"), size: 110 }, { text: C.myth[1], at: Lc("a4", "所以涨"), size: 130, hl: "所以涨" }]} />
      {is("a.myth") && <Stamp f={f} a={Lc("a4", "所以涨") + 14} x={760} y={1000} text={C.mythStamp} color={PAL.amber} />}
      {is("a.trade") && <Tag f={f} a={FIRST_HIT - 2} b={d.shot.end} at={P(-2.8, 1, 0.6)} plate={{ x: 380, y: 1150 }} side="r" color={PAL.gold} title={C.first} notes={[[`${px(1)} × ${lots(1, 0)} ${C.lots}`, FIRST_HIT + 6]]} />}
      {is("a.urgent") && <Tag f={f} a={s0 + 6} b={d.shot.end} at={P(-0.4, 1, 0.6)} plate={{ x: 380, y: 1200 }} side="r" color={PAL.up} title={C.urgentNote} size={40} />}
      {is("a.urgent2") && (
        <>
          <Tag f={f} a={Lc("a6", "更急") - 2} b={d.shot.end} at={P(0, 1, 0.6)} plate={{ x: 90, y: 420 }} side="r" color={PAL.gold} title={C.urgent} size={52} />
          <Arrow f={f} a={Lc("a6", "更急") + 6} from={{ x: 300, y: 1250 }} to={{ x: P(0, 1).x - 30, y: P(0, 1).y + 40 }} color={PAL.up} />
        </>
      )}

      {/* orders */}
      {is("o.case1", "o.passive") && <CaseCard f={f} a={Lc("o2", "被动订单")} n={0} title={C.passive[0]} color={PAL.up} y={290} notes={[[C.passive[1], Lc("o2", "限价单")], [C.passive[2], Lc("o2", "提供")]]} />}
      {is("o.passive") && <Tag f={f} a={PASSIVE_AT + 4} b={d.shot.end} at={pr(X.book, ky(-1), 1.15)} plate={{ x: 700, y: 1250 }} side="r" color={PAL.up} title={C.queue} notes={[[`${C.bid1} +${sizeAt(f, "bid", -1) - sizeAt(PASSIVE_AT - 1, "bid", -1)} ${C.lots}`, PASSIVE_AT + 10]]} />}
      {is("o.case2", "o.eat") && <CaseCard f={f} a={Lc("o3", "主动订单")} n={1} title={C.active[0]} color={PAL.gold} y={290} notes={[[C.active[1], Lc("o3", "不等")], [C.active[2], Lc("o3", "消耗")]]} />}
      {is("o.eat") && <Big x={48} y={1200} label={C.eatAsk} value={`${sizeAt(f, "ask", 1)}`} sub={`${px(1)} · ${C.lots}`} color={PAL.down} />}
      {is("o.hop") && (
        <>
          <Big x={48} y={300} label={C.last} value={px(lastK(f))} color={PAL.gold} sub={f >= JUMP ? C.step[1] : `${C.eatAsk} ${sizeAt(f, "ask", 1)} ${C.lots}`} />
          <Stamp f={f} a={JUMP} x={540} y={P(0, bk).y - 120} text={C.step[1]} color={PAL.gold} />
          <Tag f={f} a={GONE} b={JUMP} at={P(1.6, 1, 0.5)} plate={{ x: 90, y: 1200 }} side="r" color={PAL.down} title={C.step[0]} size={42} />
        </>
      )}
      {is("o.hop2") &&
        (() => {
          const rows = [
            [px(1), "9", GONE, JUMP],
            [px(2), "7", JUMP2 - 6, JUMP2],
          ] as const;
          return (
            <>
              <Panel x={40} y={300} w={560} head={C.hopTable.join("  ·  ")} color={PAL.gold}>
                {rows.map(([p, n, g, j], i) => (
                  <div key={i} style={{ display: "flex", ...mono(), fontSize: 34, lineHeight: "54px", color: INK, opacity: i === 0 || f >= L("o5") ? 1 : 0.3, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ flex: 1.2, color: PAL.down }}>{p}</div>
                    <div style={{ flex: 1 }}>{f >= g ? "0" : n}</div>
                    <div style={{ flex: 1, color: f >= g ? PAL.gold : DIM }}>{f >= g ? "✓" : "…"}</div>
                    <div style={{ flex: 1, color: f >= j ? PAL.gold : DIM }}>{f >= j ? "+1" : ""}</div>
                  </div>
                ))}
              </Panel>
              <Stamp f={f} a={JUMP2} x={540} y={P(0, bk).y - 120} text={C.step[1]} color={PAL.gold} />
            </>
          );
        })()}
      {is("o.case3") && <CaseCard f={f} a={Lc("o6", "止损订单")} n={2} title={C.stop[0]} color={PAL.amber} y={290} notes={[]} />}

      {/* stops */}
      {is("s.hidden") && <CaseCard f={f} a={s0} n={2} title={C.stop[0]} color={PAL.amber} y={290} notes={[[C.stop[1], Lc("s1", "不显示")]]} />}
      {is("s.hidden") && <Tag f={f} a={Lc("s1", "不显示")} b={d.shot.end} at={pr(X.book, ky(5), -1.7)} plate={{ x: 340, y: 1250 }} side="r" color={PAL.amber} title={C.hidden} notes={[[C.hiddenCol, Lc("s1", "不显示") + 10]]} size={44} />}
      {is("s.mine") && <Tag f={f} a={Lc("s1", "地雷") - 4} b={d.shot.end} at={pr(X.book, ky(4), -1.7)} plate={{ x: 120, y: 1220 }} side="r" color={PAL.amber} title={C.mine[0]} notes={[[C.mine[1], Lc("s1", "地雷") + 6]]} size={52} />}
      {is("s.trigger") && (
        <>
          <Big x={48} y={300} label={C.toTrigger} value={`${Math.max(0, TRIGGER_K - bk).toFixed(1)} ${C.ticksUnit}`} color={PAL.amber} sub={`${C.trigger} ${px(TRIGGER_K)}`} />
          <Stamp f={f} a={ARMED} x={420} y={P(0, TRIGGER_K).y} text={`${C.trigger} ${px(TRIGGER_K)}`} color={PAL.amber} rot={0} size={44} />
        </>
      )}
      {is("s.convert") && <Tag f={f} a={CONVERT - 4} b={d.shot.end} at={pr(X.book, ky(4), -1.7)} plate={{ x: 360, y: 1250 }} side="r" color={PAL.amber} title={C.cascade} size={52} />}
      {is("s.boom1", "s.boom2") &&
        (() => {
          const n = MINES.filter((m) => f >= m.at).length;
          return (
            <>
              <Big x={48} y={300} label={C.chainCount} value={`${n} / ${MINES.length}`} color={PAL.amber} k={1} />
              <Big x={630} y={300} label={C.last} value={px(lastK(f))} color={PAL.gold} sub={`+${lastK(f)} ${C.jumps}`} />
            </>
          );
        })()}
      {is("s.after") && (
        <>
          <Big x={48} y={300} label={C.last} value={px(lastK(f))} color={PAL.gold} sub={`5000.00 → +${lastK(f)} ${C.jumps}`} />
          <Stamp f={f} a={s0 + 8} x={300} y={1300} text={`${C.volX} ${volIn(CHAIN - 30, CHAIN + 30)} ${C.lots} / 2s`} color={PAL.amber} rot={-4} size={44} />
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------- flat (2D-only) shots of the book chapters
const DepthChart: React.FC<{ f: number; a: number }> = ({ f, a }) => {
  const X0 = 90,
    X1 = 990,
    Y0 = 1300,
    Y1 = 520;
  const ks = [...Array(16)].map((_, i) => i - 6);
  const xk = (q: number) => X0 + ((q + 6.5) / 16.5) * (X1 - X0);
  let acc = 0;
  const bids = [-1, -2, -3, -4, -5, -6].map((q) => ((acc += sizeAt(f, "bid", q)), { q, v: acc }));
  acc = 0;
  const asks = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((q) => ((acc += sizeAt(f, "ask", q)), { q, v: acc }));
  const MAX = 380;
  const yv = (v: number) => Y0 - (v / MAX) * (Y0 - Y1);
  const g = span(f, a, a + 16, expoOut);
  const step = (arr: { q: number; v: number }[], dir: number) => {
    const pts = [`${xk(arr[0].q - dir * 0.5)},${Y0}`];
    arr.forEach((p) => pts.push(`${xk(p.q - dir * 0.5)},${yv(p.v * g)}`, `${xk(p.q + dir * 0.5)},${yv(p.v * g)}`));
    pts.push(`${xk(arr[arr.length - 1].q + dir * 0.5)},${Y0}`);
    return pts.join(" ");
  };
  return (
    <>
      <div style={{ position: "absolute", left: X0, top: 330, ...sans(700), fontSize: 30, letterSpacing: 4, color: BLUE }}>{C.depth} · DEPTH</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <rect x={xk(-0.5)} y={Y1 - 40} width={xk(0.5) - xk(-0.5)} height={Y0 - Y1 + 40} fill={`${PAL.gold}22`} stroke={PAL.gold} strokeDasharray="8 8" strokeWidth={2} />
        <polygon points={step(bids, -1)} fill={`${PAL.up}55`} stroke={PAL.up} strokeWidth={3} />
        <polygon points={step(asks, 1)} fill={`${PAL.down}55`} stroke={PAL.down} strokeWidth={3} />
        <line x1={X0} x2={X1} y1={Y0} y2={Y0} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
        {ks.filter((q) => q % 4 === 0).map((q) => (
          <text key={q} x={xk(q)} y={Y0 + 40} fill={SOFT} fontSize={24} textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
            {px(q)}
          </text>
        ))}
      </svg>
      <div style={{ position: "absolute", left: X0, top: Y0 + 74, ...sans(500), fontSize: 26, color: DIM }}>
        ← {C.bid} · {C.depthAxis[1]} · {C.ask} →
      </div>
      <Tag f={f} a={a + 8} b={FRAMES} at={{ x: xk(0), y: Y1 - 40 }} plate={{ x: xk(0) + 60, y: 430 }} side="r" color={PAL.gold} title={C.spread} notes={[[C.noTrade, Lc("a3", "没人") + 4]]} size={50} />
      <Stamp f={f} a={Lc("a3", "就没有") + 2} x={330} y={640} text={C.trades0} color={PAL.gold} rot={-5} />
    </>
  );
};

const Equal: React.FC<{ f: number; a: number }> = ({ f, a }) => {
  const q = lots(1, 0);
  const card = (lab: string, col: string, i: number) => {
    const k = pop(f, a + i * 5);
    return (
      <div data-qa={`equal:${lab}`} style={{ flex: 1, textAlign: "center", padding: "26px 0 30px", borderRadius: 18, opacity: Math.min(1, k * 1.3), transform: `scale(${0.85 + 0.15 * k})`, ...FX(col) }}>
        <div style={{ ...sans(700), fontSize: 46, color: col }}>{lab}</div>
        <div style={{ ...mono(), fontSize: 150, lineHeight: 1.1, color: INK, textShadow: `0 0 26px ${col}88` }}>{q}</div>
        <div style={{ ...sans(500), fontSize: 34, color: SOFT }}>{C.lots}</div>
      </div>
    );
  };
  return (
    <>
      <div style={{ position: "absolute", left: 70, right: 70, top: 420, display: "flex", alignItems: "center", gap: 28 }}>
        {card(C.buyQty, PAL.up, 0)}
        <div data-qa="equal:=" style={{ ...mono(), fontSize: 130, color: PAL.gold, textShadow: `0 0 26px ${PAL.gold}`, opacity: pop(f, a + 8) }}>=</div>
        {card(C.sellQty, PAL.down, 1)}
      </div>
      <Panel x={190} y={960} w={700} head={C.first} color={PAL.gold} k={fin(f, a + 14)}>
        <div style={{ display: "flex", ...mono(), fontSize: 34, color: INK, lineHeight: "52px" }}>
          <div style={{ flex: 1 }}>{px(1)}</div>
          <div style={{ flex: 1, textAlign: "right" }}>
            {C.volQty} {q}
          </div>
        </div>
        <div style={{ ...sans(500), fontSize: 30, color: SOFT }}>{C.once}</div>
      </Panel>
    </>
  );
};

const Three: React.FC<{ f: number; a: number }> = ({ f, a }) => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", ...serif(), fontSize: 92, color: INK, opacity: fin(f, Lc("o1", "三种")), textShadow: "0 4px 20px #000" }}>{C.threeHead}</div>
    <div style={{ position: "absolute", left: 40, right: 40, top: 620, display: "flex", gap: 18 }}>
      {[PAL.up, PAL.gold, PAL.amber].map((c, i) => {
        const k = pop(f, Lc("o1", "三种") + 4 + i * 6);
        return (
          <div key={i} style={{ flex: 1, height: 560, borderRadius: 18, opacity: Math.min(1, k * 1.3), transform: `translateY(${(1 - k) * 60}px)`, ...FX(c), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ ...mono(), fontSize: 120, color: c, textShadow: `0 0 30px ${c}` }}>0{i + 1}</div>
            <svg width={200} height={200} viewBox="-100 -100 200 200" style={{ marginTop: 20 }}>
              {i === 0 && [0, 1, 2].map((r) => <rect key={r} x={-70} y={-60 + r * 44} width={140} height={32} rx={6} fill={`${c}${r === 2 ? "" : "55"}`} />)}
              {i === 1 && (
                <>
                  <rect x={-70} y={-40} width={140} height={32} rx={6} fill={`${PAL.down}55`} />
                  <line x1={0} y1={90} x2={0} y2={0} stroke={c} strokeWidth={10} strokeLinecap="round" />
                  <polygon points="-22,10 22,10 0,-24" fill={c} />
                </>
              )}
              {i === 2 && <polygon points="0,-70 60,0 0,70 -60,0" fill="none" stroke={c} strokeWidth={6} strokeDasharray="14 10" />}
            </svg>
          </div>
        );
      })}
    </div>
  </>
);

const BigLadder: React.FC<{ f: number; a: number; mode: "passive" | "eat" | "sweep" }> = ({ f, a, mode }) => {
  const k = fin(f, a, 8);
  const row = 70;
  const x = 220,
    y = mode === "sweep" ? 388 : 320;
  // the sweep is replayed fast: the ladder runs on its own clock through the stop chain
  const g = mode === "sweep" ? Math.round(CHAIN - 20 + span(f, a + 4, a + 34, (t) => t) * 60) : f;
  const rowY = (q: number) => y + 48 + 30 + (Math.round(beadK(g)) + 6 - q) * row + row / 2;
  return (
    <>
      <Ladder f={g} x={x} y={y} w={640} row={row} k={k} mark={mode === "passive" ? [{ side: "bid", k: -1, color: PAL.up }] : mode === "eat" ? [{ side: "ask", k: 1, color: PAL.gold }] : []} />
      {mode === "passive" && (
        <>
          <Tag f={f} a={a + 6} b={FRAMES} at={{ x: x + 120, y: rowY(-1) }} plate={{ x: 60, y: 1300 }} side="r" color={PAL.up} title={C.liquidity} size={40} notes={[[C.passive[2], Lc("o2", "提供")]]} />
        </>
      )}
      {mode === "eat" && (
        <>
          <Arrow f={f} a={a + 4} from={{ x: 980, y: 1300 }} to={{ x: x + 560, y: rowY(1) + 20 }} color={PAL.gold} />
          <Tag f={f} a={a + 8} b={FRAMES} at={{ x: x + 520, y: rowY(1) }} plate={{ x: 60, y: 1300 }} side="r" color={PAL.gold} title={`${C.eatAsk} ${sizeAt(f, "ask", 1)} ${C.lots}`} size={44} notes={[[C.active[2], Lc("o3", "消耗")]]} />
        </>
      )}
      {mode === "sweep" && (
        <>
          <Stamp f={f} a={a + 30} x={540} y={1360} text={C.swept} color={PAL.amber} />
          <Big x={0} align="center" y={STRIP} label={C.chainCount} value={`${num(volIn(CONVERT - 2, CHAIN + 50))} ${C.lots}`} color={PAL.amber} sub={C.sweptNote} k={fin(f, a + 6)} />
        </>
      )}
    </>
  );
};

const Chain: React.FC<{ f: number; a: number }> = ({ f, a }) => {
  const xs = [185, 540, 895];
  const cols = [PAL.gold, PAL.down, PAL.up];
  return (
    <>
      <Statement f={f} top={330} end={L("o6") - 2} scrim={0} rule lines={[{ text: C.minimal[0], at: Lc("o5", "价格移动"), size: 84 }, { text: C.minimal[1], at: Lc("o5", "最小"), size: 130, hl: C.minimal[1] }]} />
      {C.chain.map((s, i) => {
        const k = pop(f, a + 4 + i * 8);
        return (
          <div key={s} data-qa={`chain:${s}`} style={{ position: "absolute", left: xs[i] - 140, top: 860, width: 280, textAlign: "center", padding: "26px 0", borderRadius: 16, opacity: Math.min(1, k * 1.3), transform: `scale(${0.8 + 0.2 * k})`, ...sans(700), fontSize: 44, color: INK, ...FX(cols[i]) }}>
            {s}
          </div>
        );
      })}
      <Arrow f={f} a={a + 10} from={{ x: 340, y: 925 }} to={{ x: 386, y: 925 }} color={PAL.gold} />
      <Arrow f={f} a={a + 18} from={{ x: 690, y: 925 }} to={{ x: 736, y: 925 }} color={PAL.gold} />
      {f > a + 26 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fin(f, a + 26), filter: `drop-shadow(0 0 6px ${BLUE})` }}>
          <path d="M890,1010 C890,1160 190,1160 190,1010" fill="none" stroke={BLUE} strokeWidth={5} strokeDasharray="14 10" strokeDashoffset={-f * 2} />
          <polygon points="172,1030 208,1030 190,1000" fill={BLUE} />
        </svg>
      )}
      {f > a + 26 && <div style={{ position: "absolute", left: 0, right: 0, top: 1150, textAlign: "center", ...sans(700), fontSize: 36, color: BLUE, opacity: fin(f, a + 30) }}>{C.repeat} ×N</div>}
    </>
  );
};

/** a 2D candle chart with a prior high and the short sellers' buy stops piled above it */
const STOPCHART = (() => {
  const r = (i: number) => (Math.sin(i * 12.9898) * 43758.5453) % 1;
  const path = [0, -0.4, 0.3, 1.1, 1.9, 2.6, 3, 2.4, 1.6, 0.9, 1.4, 0.8, 0.2, 0.7, 1.5, 2.2, 1.8, 2.4, 2.75];
  return path.map((c, i) => {
    const o = i ? path[i - 1] : -0.6;
    const hi = i === 6 ? 3.0 : Math.max(o, c) + 0.2 + Math.abs(r(i)) * 0.3;
    return { o, c, hi: Math.min(hi, 3.0), lo: Math.min(o, c) - 0.2 - Math.abs(r(i + 9)) * 0.3 };
  });
})();
const StopChart: React.FC<{ f: number; a: number }> = ({ f, a }) => {
  // the whole chart, the stops above the high included, fits between the strip and the captions
  const PX = 118;
  const x0 = 80,
    w = 900,
    yp = (p: number) => 1300 - (p + 1.2) * PX; // p in ticks above 5000.00
  const n = STOPCHART.length;
  const cw = (w - 160) / n;
  const rev = span(f, a, a + 24, (t) => t) * n;
  const hiY = yp(3);
  return (
    <>
      <div style={{ position: "absolute", left: x0, top: STRIP + 10, ...sans(700), fontSize: 30, letterSpacing: 4, color: BLUE }}>5 MIN · 5000.00 +</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((p) => (
          <g key={p}>
            <line x1={x0} x2={x0 + w - 120} y1={yp(p)} y2={yp(p)} stroke="rgba(127,168,255,0.14)" />
            <text x={x0 + w - 116} y={yp(p) + 8} fill={SOFT} fontSize={21} fontFamily="IBM Plex Mono, monospace">
              {px(p)}
            </text>
          </g>
        ))}
        {STOPCHART.map((c, i) => {
          if (i > rev) return null;
          const up = c.c >= c.o;
          const col = up ? PAL.up : PAL.down;
          const cx = x0 + i * cw + cw / 2;
          return (
            <g key={i} opacity={clamp01(rev - i)}>
              <line x1={cx} x2={cx} y1={yp(c.hi)} y2={yp(c.lo)} stroke={col} strokeWidth={3} />
              <rect x={cx - cw * 0.32} y={yp(Math.max(c.o, c.c))} width={cw * 0.64} height={Math.max(4, Math.abs(c.c - c.o) * PX)} fill={col} rx={3} />
            </g>
          );
        })}
        <line x1={x0} x2={x0 + w - 120} y1={hiY} y2={hiY} stroke={INK} strokeWidth={3} strokeDasharray="14 10" opacity={fin(f, Lc("s2", "前高"))} />
      </svg>
      <Tag f={f} a={Lc("s2", "前高") - 2} b={FRAMES} at={{ x: x0 + 6.5 * cw, y: hiY }} plate={{ x: x0 + 6.5 * cw + 40, y: 1385 }} side="r" color={INK} title={`${C.priorHigh} ${px(3)}`} size={40} mono />
      {[12, 15, 17].map((i, j) => {
        const k = pop(f, Lc("s2", "做空") + j * 4);
        const cx = x0 + i * cw + cw / 2;
        return k > 0.01 ? (
          <div key={i} style={{ position: "absolute", left: cx - 26, top: yp(STOPCHART[i].hi) - 80, width: 52, textAlign: "center", ...sans(700), fontSize: 30, color: "#06070b", background: PAL.down, borderRadius: 8, transform: `scale(${k})` }}>
            {C.shortMark}
          </div>
        ) : null;
      })}
      {/* the stops: amber diamonds on the four levels above the high */}
      {[4, 5, 6, 7].map((q, j) => {
        const k = pop(f, Lc("s2", "止损买单") + j * 3);
        return [...Array(6 - j)].map((_, i) => (
          <div key={`${q}-${i}`} style={{ position: "absolute", left: x0 + 520 + i * 40, top: yp(q) - 14, width: 26, height: 26, transform: `rotate(45deg) scale(${k * 0.8})`, background: `${PAL.amber}aa`, border: `2px solid ${PAL.amber}`, boxShadow: `0 0 12px ${PAL.amber}` }} />
        ));
      })}
      <Tag f={f} a={Lc("s2", "止损买单") + 6} b={FRAMES} at={{ x: x0 + 500, y: yp(5.5) }} plate={{ x: x0, y: yp(5.6) }} side="r" color={PAL.amber} title={C.stopCluster[0]} notes={[[C.stopCluster[1], Lc("s2", "上方")]]} size={44} />
    </>
  );
};

const FlatBookHud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f,
    a = d.shot.at;
  const lay = d.lay;
  const types = f >= L("o1") && f < S("players") && ["o.passiveLadder", "o.eatLadder"].includes(lay);
  return (
    <>
      <Types f={f} k={types ? 1 : 0} />
      {lay === "a.depth" && <DepthChart f={f} a={a} />}
      {lay === "a.equal" && <Equal f={f} a={a} />}
      {lay === "o.three" && <Three f={f} a={a} />}
      {lay === "o.passiveLadder" && <BigLadder f={f} a={a} mode="passive" />}
      {lay === "o.eatLadder" && <BigLadder f={f} a={a} mode="eat" />}
      {lay === "o.chain" && <Chain f={f} a={a} />}
      {lay === "s.chart" && <StopChart f={f} a={a} />}
      {lay === "s.sweep" && <BigLadder f={f} a={a} mode="sweep" />}
    </>
  );
};

// ================================================================ participants
type Who = keyof typeof PIECES;
const ORDER: [Who, string][] = [
  ["mm", "p2"],
  ["inst", "p3"],
  ["hedge", "p4"],
  ["short", "p5"],
];
const Track: React.FC<{ f: number; k: number }> = ({ f, k }) => {
  if (k < 0.01) return null;
  const cur = ORDER.findIndex(([, id], i) => f >= L(id) - 2 && (i === 3 || f < L(ORDER[i + 1][1]) - 2));
  return (
    <div data-qa="track" style={{ position: "absolute", left: SAFE.l, right: 1080 - SAFE.r, top: STRIP, opacity: k }}>
      <div style={{ display: "flex", gap: 10 }}>
        {ORDER.map(([w, id], i) => {
          const named = f >= L(id) - 2;
          const on = i === cur && f < L("p6") - 2;
          return (
            <div key={w} style={{ flex: 1, textAlign: "center", padding: "4px 0 8px", borderRadius: 10, background: on ? PAL.gold : "rgba(8,11,18,0.88)", border: `1.5px solid ${PAL.gold}${on ? "" : "55"}`, boxShadow: on ? `0 0 22px ${PAL.gold}aa` : undefined }}>
              <div style={{ ...sans(700), fontSize: 32, color: on ? "#06070b" : named ? INK : DIM }}>{named ? C.players[w][0] : "?"}</div>
              <div style={{ ...mono(), fontSize: 20, color: on ? "#06070b" : SOFT, opacity: named ? 1 : 0 }}>{C.pace[w]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Gauge: React.FC<{ f: number; a: number; x: number; y: number }> = ({ f, a, x, y }) => {
  const v = Math.round(35 * span(f, a, a + 40, smooth));
  const W = 560;
  const mid = W / 2;
  const warn = v > 25;
  return (
    <Panel x={x} y={y} w={W + 40} head={C.inventory[0]} color={warn ? PAL.amber : BLUE}>
      <div style={{ position: "relative", height: 60 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 24, height: 12, background: "rgba(255,255,255,0.1)", borderRadius: 6 }} />
        <div style={{ position: "absolute", left: mid + (25 / 50) * mid, right: 0, top: 24, height: 12, background: `${PAL.amber}66`, borderRadius: 6 }} />
        <div style={{ position: "absolute", left: mid, width: (v / 50) * mid, top: 24, height: 12, background: warn ? PAL.amber : PAL.up, borderRadius: 6, boxShadow: `0 0 12px ${warn ? PAL.amber : PAL.up}` }} />
        <div style={{ position: "absolute", left: mid - 1, top: 10, width: 2, height: 40, background: INK }} />
        <div style={{ position: "absolute", left: mid + (v / 50) * mid - 40, top: -6, width: 80, textAlign: "center", ...mono(), fontSize: 30, color: INK }}>+{v}</div>
      </div>
      <div style={{ ...sans(700), fontSize: 30, color: PAL.amber, opacity: warn ? 1 : 0 }}>{C.inventory[1]}</div>
    </Panel>
  );
};

const TableHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  const lay = d.lay;
  const s0 = d.shot.at;
  if (d.world !== "table" && lay !== "p.manip") return null;
  const at = (w: Who, y = 3.6) => pr(X.table + PIECES[w][0], y, PIECES[w][1]);
  const head = (w: Who, id: string) => {
    const [name, a, b] = C.players[w];
    const words = [Lc(id, id === "p2" ? "两边" : id === "p3" ? "拆成" : id === "p4" ? "对冲" : "追逐"), Lc(id, id === "p2" ? "最怕" : id === "p3" ? "慢慢" : id === "p4" ? "不太" : "止损")];
    return <CaseCard f={f} a={L(id)} n={0} tag={`PLAYER 0${ORDER.findIndex(([k]) => k === w) + 1}`} title={name} color={PAL.gold} y={MAIN + 10} notes={[[a, words[0]], [b, words[1]]]} />;
  };
  return (
    <>
      <Track f={f} k={lay !== "p.who" && lay !== "p.manip" && lay !== "p.clash" && f < S("anatomy") ? 1 : 0} />
      <Statement f={f} top={300} end={Lc("p1", "而是") - 2} scrim={0.7} lines={[{ text: C.who[0], at: Lc("p1", "不是"), size: 110, hl: "庄家" }]} />
      {lay === "p.who" && <Stamp f={f} a={Lc("p1", "庄家") + 10} x={540} y={640} text={C.notOne} color={PAL.up} rot={-6} />}
      {lay === "p.wide" && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", ...serif(), fontSize: 72, color: INK, opacity: fin(f, Lc("p1", "而是")), textShadow: "0 4px 18px #000, 0 0 3px #000" }}>
          {C.who[1]}
        </div>
      )}
      {(lay === "p.mm" || lay === "p.mm2") && head("mm", "p2")}
      {lay === "p.mm" && (
        <div style={{ position: "absolute", left: 40, right: 40, top: 1220, display: "flex", gap: 14, justifyContent: "center", opacity: fin(f, Lc("p2", "两边")) }}>
          {[
            [`${C.quote[0]} ${px(-1)}`, PAL.up],
            [`${C.quote[1]} ${px(1)}`, PAL.down],
            [`${C.quote[2]} 0.50`, PAL.gold],
          ].map(([s, c]) => (
            <span key={s} style={{ ...mono(), fontSize: 36, color: INK, padding: "6px 18px 8px", borderRadius: 10, ...FX(c) }}>
              {s}
            </span>
          ))}
        </div>
      )}
      {lay === "p.mm2" && <Gauge f={f} a={Lc("p2", "最怕") - 6} x={220} y={1180} />}
      {(lay === "p.inst" || lay === "p.inst2") && head("inst", "p3")}
      {lay === "p.inst" && <Tag f={f} a={s0 + 6} b={d.shot.end} at={at("inst", 2.6)} plate={{ x: 540, y: 1250 }} side="r" color={BLUE} title={`${C.parent[0]} 2,000 ${C.lots}`} mono size={40} />}
      {lay === "p.inst2" &&
        (() => {
          const done = Math.round(40 * span(f, s0, d.shot.end + 20, (x) => x));
          return (
            <Panel x={220} y={1180} w={640} head={`${C.parent[1]} 50 ${C.lots} × 40`} color={BLUE}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[...Array(40)].map((_, i) => (
                  <div key={i} style={{ width: 22, height: 22, borderRadius: 4, background: i < done ? PAL.gold : "rgba(255,255,255,0.1)", boxShadow: i < done ? `0 0 8px ${PAL.gold}88` : undefined }} />
                ))}
              </div>
              <div style={{ ...mono(), fontSize: 30, color: INK, marginTop: 6 }}>{done} / 40</div>
            </Panel>
          );
        })()}
      {(lay === "p.hedge" || lay === "p.hedge2") && head("hedge", "p4")}
      {lay === "p.hedge" && (
        <Panel x={220} y={1170} w={640} color={BLUE} k={fin(f, Lc("p4", "对冲") - 4)}>
          {C.hedgeRows.map(([a, b], i) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between", ...sans(700), fontSize: 32, lineHeight: "50px", color: i === 2 ? PAL.gold : INK, borderTop: i ? "1px solid rgba(255,255,255,0.1)" : undefined }}>
              <span>{a}</span>
              <span style={{ ...mono(), color: i === 0 ? PAL.up : i === 1 ? PAL.down : PAL.gold }}>{b}</span>
            </div>
          ))}
        </Panel>
      )}
      {lay === "p.hedge2" && <Stamp f={f} a={Lc("p4", "不太") + 6} x={540} y={1260} text={C.pnl} color={BLUE} rot={-4} size={46} />}
      {(lay === "p.short" || lay === "p.short2") && head("short", "p5")}
      {(lay === "p.short" || lay === "p.short2") &&
        (() => {
          const W = 640,
            H = 200;
          const n = 40;
          const k = lay === "p.short" ? span(f, s0, d.shot.end, (x) => x) : 1;
          const pts = [...Array(n)].map((_, i) => [i * (W / (n - 1)), H / 2 - Math.sin(i * 0.7) * 50 - Math.sin(i * 2.3) * 22] as const);
          const shown = pts.slice(0, Math.max(2, Math.round(n * k)));
          const entry = pts[22];
          return (
            <Panel x={220} y={1170} w={W + 40} color={PAL.gold} pad="10px 20px">
              <svg width={W} height={H}>
                <polyline points={shown.map((p) => p.join(",")).join(" ")} fill="none" stroke={PAL.gold} strokeWidth={4} />
                {lay === "p.short2" && (
                  <>
                    <circle cx={entry[0]} cy={entry[1]} r={9} fill={PAL.up} />
                    <line x1={entry[0]} x2={W} y1={entry[1] + 26} y2={entry[1] + 26} stroke={PAL.amber} strokeWidth={3} strokeDasharray="10 8" />
                    <text x={W - 6} y={entry[1] + 60} fill={PAL.amber} fontSize={28} textAnchor="end" fontFamily="Noto Sans SC">
                      {C.stopNear}
                    </text>
                    <text x={entry[0] - 12} y={entry[1] - 18} fill={INK} fontSize={26} textAnchor="end" fontFamily="Noto Sans SC">
                      {C.entry}
                    </text>
                  </>
                )}
              </svg>
            </Panel>
          );
        })()}
      {lay === "p.manip" && (
        <>
          <Grid />
          <div style={{ position: "absolute", left: 90, right: 90, top: 560, textAlign: "center", padding: "40px 0 46px", borderRadius: 20, ...FX(PAL.amber) }}>
            <div style={{ ...serif(), fontSize: 90, color: INK, opacity: fin(f, L("p6")) }}>{C.manip[0]}</div>
            <div style={{ ...sans(500), fontSize: 44, color: SOFT, marginTop: 20, opacity: fin(f, Lc("p6", "但大多数") - 30) }}>{C.manip[2]}</div>
          </div>
          <Stamp f={f} a={Lc("p6", "违规")} x={830} y={470} text={C.illegal} color={PAL.up} rot={8} size={64} />
        </>
      )}
      {lay === "p.clash" && (
        <>
          {/* the table keeps the middle of the frame; the comparison sits in its own panel above the captions */}
          <Statement f={f} top={STRIP + 10} end={S("anatomy") - 6} scrim={0} rule={false} lines={[{ text: C.crash[0], at: Lc("p6", "这些需求"), size: 112, hl: "碰撞" }, { text: C.crash[1], at: Lc("p6", "这些需求") + 16, size: 50 }]} />
          <Panel x={SAFE.l} y={LOW - 262} w={SAFE.r - SAFE.l} color={PAL.gold} k={fin(f, Lc("p6", "但大多数") + 6)} qa="panel:compare" kind="card">
            <div style={{ display: "flex", ...sans(500), fontSize: 24, color: DIM }}>
              {C.cmpHead.map((h) => (
                <div key={h} style={{ flex: 1 }}>
                  {h}
                </div>
              ))}
            </div>
            {ORDER.map(([w]) => (
              <div key={w} style={{ display: "flex", ...sans(700), fontSize: 30, lineHeight: "44px", color: INK, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ flex: 1 }}>{C.players[w][0]}</div>
                <div style={{ flex: 1, color: PAL.gold }}>{C.aims[w]}</div>
                <div style={{ flex: 1, ...mono(), color: SOFT }}>{C.pace[w]}</div>
              </div>
            ))}
          </Panel>
        </>
      )}
    </>
  );
};

// ================================================================ the candle, cut open
/** two intrabar paths that open, peak and close at the same prices */
const PATHS = (() => {
  const n = 48;
  const a = [...Array(n)].map((_, i) => {
    const u = i / (n - 1);
    return 0 + 11.25 * u + Math.sin(u * 22) * 0.9 * (1 - u * 0.6) - (i === 2 ? 0.5 : 0) + (i === 38 ? 1.5 : 0);
  });
  const b = [...Array(n)].map((_, i) => {
    const u = i / (n - 1);
    const base = u < 0.55 ? 0.6 * Math.sin(u * 30) * 0.8 : u < 0.68 ? ((u - 0.55) / 0.13) * 12.75 : 12.75 - ((u - 0.68) / 0.32) * 1.5;
    return i === 3 ? -0.5 : base;
  });
  a[n - 1] = b[n - 1] = 11.25;
  const va = [...Array(n)].map((_, i) => 8 + ((i * 7) % 5) + i * 0.12);
  const vb = [...Array(n)].map((_, i) => (i > n * 0.55 && i < n * 0.7 ? 34 + (i % 3) * 4 : 3 + (i % 4)));
  return { a, b, va, vb, n };
})();
const PathChart: React.FC<{ f: number; x: number; y: number; w: number; g: number; side: "a" | "b"; hot: number; verdict: number }> = ({ f, x, y, w, g, side, hot, verdict }) => {
  const H = 150,
    VH = 52;
  const p = PATHS[side],
    v = side === "a" ? PATHS.va : PATHS.vb;
  const n = Math.max(2, Math.round(PATHS.n * g));
  const xp = (i: number) => (i / (PATHS.n - 1)) * (w - 30);
  const yp = (q: number) => H - ((q + 1) / 14) * H;
  const col = side === "a" ? PAL.up : PAL.amber;
  return (
    <Panel x={x} y={y} w={w} color={col} k={1} pad="8px 14px 10px" head={side === "a" ? C.caseA[0] : C.caseB[0]}>
      <svg width={w - 28} height={H + VH + 8}>
        <line x1={0} x2={w} y1={yp(11.25)} y2={yp(11.25)} stroke={DIM} strokeDasharray="6 6" />
        <polyline points={p.slice(0, n).map((q, i) => `${xp(i)},${yp(q)}`).join(" ")} fill="none" stroke={col} strokeWidth={4} style={{ filter: `drop-shadow(0 0 ${4 + 8 * hot}px ${col})` }} />
        {v.slice(0, n).map((q, i) => (
          <rect key={i} x={xp(i) - 3} y={H + 8 + VH - (q / 42) * VH} width={Math.max(3, (w - 40) / PATHS.n - 2)} height={(q / 42) * VH} fill={`${col}aa`} />
        ))}
      </svg>
      <div style={{ ...sans(500), fontSize: 20, color: DIM, marginTop: -4 }}>{C.pathVol}</div>
      {/* the verdict lands in the panel, in the column's colour */}
      <div style={{ ...sans(700), fontSize: 36, lineHeight: "46px", letterSpacing: 4, color: col, textShadow: `0 0 16px ${col}aa`, opacity: fin(f, verdict), transform: `scale(${1.25 - 0.25 * span(f, verdict, verdict + 7, expoOut)})`, transformOrigin: "left center" }}>
        ✓ {side === "a" ? C.caseA[2] : C.caseB[2]}
      </div>
    </Panel>
  );
};

const AnatomyHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  const lay = d.lay;
  if (!lay.startsWith("w.")) return null;
  const P = (y: number, x = 0) => pr(X.anatomy + x, y, 1.6);
  const words = ["开高低收", "开高低收", "开高低收", "开高低收"].map((w, i) => Lc("w2", w) + i * 5);
  const OHLC: [number, string, "l" | "r"][] = [
    [HERO.o, "5000.00", "r"],
    [HERO.hi, "5012.75", "r"],
    [HERO.lo, "4999.50", "l"],
    [HERO.c, "5011.25", "l"],
  ];
  const g = span(f, L("w3") - 2, Le("w4"), (x) => x);
  const sep = 540;
  const lab = (i: 0 | 1) => {
    const c = i === 0 ? C.caseA : C.caseB;
    const a = i === 0 ? Lc("w3", "可能是") : Lc("w4", "可能只是");
    const col = i === 0 ? PAL.up : PAL.amber;
    const k = fin(f, a, 10);
    return k < 0.01 ? null : (
      <div key={i} data-qa={`case:${c[0]}`} data-qa-kind="card" style={{ position: "absolute", left: i === 0 ? SAFE.l : sep + 10, width: 490, top: MAIN, textAlign: "center", opacity: k, padding: "8px 0 12px", borderRadius: 14, ...FX(col) }}>
        <div style={{ ...mono(), fontSize: 26, color: col, letterSpacing: 4 }}>{c[0]}</div>
        <div style={{ ...serif(), fontSize: 44, color: INK, lineHeight: 1.25 }}>{c[1]}</div>
      </div>
    );
  };
  const split = lay === "w.caseA" || lay === "w.caseB";
  return (
    <>
      {lay === "w.ohlc" &&
        (() => {
          // one card in the right column; each price gets a ring on the candle and a leader to its row
          const px0 = SAFE.r - 270,
            py0 = 640,
            rh = 62;
          return (
            <>
              <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
                {OHLC.map(([y, , side], i) => {
                  const at = P(y, side === "r" ? 1.5 : -1.5);
                  const k = span(f, words[i], words[i] + 8, smooth);
                  const ry = py0 + 52 + i * rh + rh / 2;
                  return k > 0.01 ? (
                    <g key={i} opacity={k} stroke={PAL.gold} fill="none">
                      <circle cx={at.x} cy={at.y} r={11} strokeWidth={3} />
                      <polyline points={`${at.x + (side === "r" ? 12 : -12)},${at.y} ${side === "r" ? at.x + 40 : at.x - 40},${at.y} ${px0 - 14},${ry}`} strokeWidth={2} opacity={0.7} />
                    </g>
                  ) : null;
                })}
              </svg>
              <Panel x={px0} y={py0} w={270} head="OHLC" color={PAL.gold} k={fin(f, words[0] - 2)} qa="panel:ohlc" kind="card">
                {OHLC.map(([, val], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", height: rh, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)", opacity: fin(f, words[i]) }}>
                    <span style={{ ...sans(700), fontSize: 30, color: SOFT }}>{C.ohlc[i]}</span>
                    <span style={{ ...mono(), fontSize: 32, color: INK }}>{val}</span>
                  </div>
                ))}
              </Panel>
            </>
          );
        })()}
      {lay === "w.squeeze" && (
        <>
          <Statement f={f} top={STRIP + 10} end={d.shot.end} scrim={0} rule={false} lines={[{ text: C.squeeze, at: Lc("w2", "过程"), size: 84, hl: "压缩" }]} />
          <Big x={SAFE.r - 270} y={820} label="1 BAR" value={`${num(Math.round(1286 * (1 - span(f, Lc("w2", "压缩"), Lc("w2", "压缩") + 20)) + 4 * span(f, Lc("w2", "压缩"), Lc("w2", "压缩") + 20)))}`} color={PAL.gold} sub={f >= Lc("w2", "压缩") + 20 ? C.squeezeN[1] : C.squeezeN[0]} />
        </>
      )}
      {split && (
        <>
          <div style={{ position: "absolute", left: sep - 2, top: MAIN - 10, bottom: 1920 - (LOW - 370), width: 4, background: `linear-gradient(180deg, ${BLUE}00, ${BLUE}, ${BLUE}00)`, boxShadow: `0 0 16px ${BLUE}` }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 380 + ((f * 9) % 760), height: 2, background: `linear-gradient(90deg, ${BLUE}00, ${BLUE}cc, ${BLUE}00)`, boxShadow: `0 0 16px ${BLUE}` }} />
          {lab(0)}
          {lab(1)}
          <PathChart f={f} x={SAFE.l} y={LOW - 350} w={490} g={g} side="a" hot={lay === "w.caseA" ? 1 : 0} verdict={Le("w3") - 16} />
          <PathChart f={f} x={SAFE.r - 490} y={LOW - 350} w={490} g={g} side="b" hot={lay === "w.caseB" ? 1 : 0} verdict={Lc("w4", "打完") + 4} />
        </>
      )}
      {lay === "w.same" && (
        <>
          <Statement f={f} top={STRIP + 10} end={d.shot.end} scrim={0} rule={false} lines={[{ text: C.same, at: Lc("w5", "结果"), size: 76 }, { text: C.diff, at: Lc("w5", "原因"), size: 96, hl: C.diff }]} />
          <Panel x={SAFE.l} y={LOW - 262} w={SAFE.r - SAFE.l} color={PAL.gold} k={fin(f, Lc("w5", "原因") + 4)} qa="panel:cmp" kind="card">
            {C.cmp.map((r, i) => (
              <div key={i} style={{ display: "flex", ...sans(i ? 700 : 500), fontSize: i ? 32 : 26, lineHeight: i ? "50px" : "34px", color: i ? INK : DIM, borderTop: i ? "1px solid rgba(255,255,255,0.08)" : undefined, opacity: i < 4 || f >= Lc("w5", "后面") ? 1 : 0.15 }}>
                <div style={{ flex: 0.8, color: DIM }}>{r[0]}</div>
                <div style={{ flex: 1, color: i === 1 ? INK : i ? PAL.up : PAL.up }}>{r[1]}</div>
                <div style={{ flex: 1, color: i === 1 ? INK : i ? PAL.amber : PAL.amber }}>{r[2]}</div>
              </div>
            ))}
          </Panel>
        </>
      )}
    </>
  );
};

// ================================================================ recap
/** footprint: traded volume at each price, buyers (red, left) × sellers (green, right). The rows are the
 *  same price levels as the order pool it grows out of; the counts fill in once and then hold. */
const FP_ROWS = 9;
const FP = [...Array(FP_ROWS)].map((_, i) => {
  const r = (s: number) => Math.abs(Math.sin(i * 7.3 + s) * 0.5 + 0.5);
  return { k: lastK(FRAMES - 1) + 4 - i, b: Math.round(12 + r(1) * 58), s: Math.round(10 + r(5) * 50) };
});
const Footprint: React.FC<{ f: number; a: number; y: number }> = ({ f, a, y }) => {
  const rh = 58;
  const poc = FP.reduce((m, r, i) => (r.b + r.s > FP[m].b + FP[m].s ? i : m), 0);
  return (
    <Panel x={190} y={y} w={700} head={C.footprint} color={BLUE} qa="panel:footprint" pad="12px 18px 14px">
      {FP.map((r, i) => {
        const g = span(f, a + 4 + i * 2, a + 22 + i * 2, expoOut);
        const b = Math.round(r.b * g),
          s = Math.round(r.s * g);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", height: rh, ...mono(), fontSize: 30, borderTop: "1px solid rgba(255,255,255,0.06)", outline: i === poc && g > 0.9 ? `2px solid ${PAL.gold}` : undefined, outlineOffset: -2, borderRadius: 4 }}>
            <div style={{ width: 150, color: SOFT, fontSize: 26 }}>{px(r.k)}</div>
            <div style={{ flex: 1, position: "relative", height: rh - 14 }}>
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${(b / 70) * 100}%`, background: `${PAL.up}88`, borderRadius: 3 }} />
              <div style={{ position: "absolute", right: 12, lineHeight: `${rh - 14}px`, color: INK }}>{b}</div>
            </div>
            <div style={{ width: 34, textAlign: "center", color: DIM }}>×</div>
            <div style={{ flex: 1, position: "relative", height: rh - 14 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(s / 70) * 100}%`, background: `${PAL.down}88`, borderRadius: 3 }} />
              <div style={{ position: "absolute", left: 12, lineHeight: `${rh - 14}px`, color: INK }}>{s}</div>
            </div>
          </div>
        );
      })}
    </Panel>
  );
};

const RecapHud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const lay = d.lay;
  const a = d.shot.at;
  if (!lay.startsWith("r.")) return null;
  const card = (i: number) => {
    const [n, t1, t2] = C.recap[i];
    const col = [PAL.up, PAL.gold, PAL.amber][i];
    const k = pop(f, a, 7);
    return (
      <>
        <Grid />
        <div data-qa={`recap:${t1}`} data-qa-text="1" style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", transform: `scale(${0.9 + 0.1 * k})`, opacity: Math.min(1, k * 1.4) }}>
          <div style={{ ...mono(), fontSize: 200, color: col, textShadow: `0 0 50px ${col}` }}>{n}</div>
          <div style={{ display: "inline-block", marginTop: 20, padding: "22px 60px 30px", borderRadius: 20, ...FX(col) }}>
            <div style={{ ...serif(), fontSize: 84, color: INK }}>{t1}</div>
            <div style={{ ...serif(), fontSize: 84, color: col }}>{t2}</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", gap: 18 }}>
          {[0, 1, 2].map((j) => (
            <div key={j} style={{ width: 120, height: 10, borderRadius: 5, background: j <= i ? col : "rgba(255,255,255,0.15)" }} />
          ))}
        </div>
      </>
    );
  };
  return (
    <>
      {lay === "r.k1" && card(0)}
      {lay === "r.k2" && card(1)}
      {lay === "r.k3" && card(2)}
      <Statement f={f} top={620} end={Lc("r1", "要问") - 2} lines={[{ text: C.q1[0], at: L("r1"), size: 92 }, { text: C.q1[1], at: Lc("r1", "它涨"), size: 136, hl: "涨没涨" }]} />
      <Statement f={f} top={620} end={L("r2") - 2} kicker="WHO · WHY" lines={[{ text: C.q2[0], at: Lc("r1", "是谁"), size: 136, hl: "是谁" }, { text: C.q2[1], at: Lc("r1", "为什么"), size: 136, hl: "为什么" }]} />
      {(lay === "r.caveat" || lay === "r.next") &&
        (() => {
          // the caveats hold over the pool; at r.next one wipe (top to bottom) turns the pool into the footprint.
          // The pool keeps rendering under a dark plate, so the picture never drops to black or flat grey.
          const w0 = lay === "r.next" ? a : FRAMES;
          const wipe = span(f, w0, w0 + 16, cubicInOut);
          const edge = 120 + wipe * 1640;
          return (
            <>
              <div data-qa-clip={`${edge},1920`} style={{ position: "absolute", inset: 0, clipPath: `inset(${wipe > 0 ? edge : 0}px 0 0 0)` }}>
                <Stamp f={f} a={Lc("r2", "挂单")} x={540} y={MAIN + 40} text={C.caveat[0]} color={BLUE} rot={-4} size={62} />
                <Stamp f={f} a={Lc("r2", "订单流")} x={540} y={LOW - 90} text={C.caveat[1]} color={PAL.gold} rot={3} size={62} />
              </div>
              {wipe > 0 && (
                <div data-qa-clip={`0,${edge}`} style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 ${1920 - edge}px 0)` }}>
                  <div style={{ position: "absolute", inset: 0, background: "rgba(5,7,12,0.66)" }} />
                  <Statement f={f} top={STRIP + 10} end={FRAMES + 10} kicker={C.title} scrim={0} lines={[{ text: C.next[0], at: L("r3"), size: 76 }, { text: C.next[1], at: Lc("r3", "走进"), size: 120, hl: "足迹图" }]} />
                  <Footprint f={f} a={a} y={700} />
                </div>
              )}
              {wipe > 0 && wipe < 1 && <div style={{ position: "absolute", left: 0, right: 0, top: edge - 2, height: 4, background: BLUE, boxShadow: `0 0 26px ${BLUE}, 0 0 60px ${BLUE}` }} />}
              <div style={{ position: "absolute", left: 0, right: 0, top: BOT + 30, textAlign: "center", opacity: span(f, Le("r3") + 6, Le("r3") + 20) }}>
                <span style={{ ...sans(500), fontSize: 32, letterSpacing: 3, color: INK, padding: "6px 22px", background: "rgba(6,8,14,0.78)", borderRadius: 10 }}>{C.disclaimer}</span>
              </div>
            </>
          );
        })()}
    </>
  );
};


export const Hud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f;
  const pr = useProj(d);
  const flat = d.world === "flat";
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* the second half of a long flat shot cuts in on the grid; the data and labels hold still so they stay in the safe area */}
      {flat && !d.lay.startsWith("r.k") && d.lay !== "p.manip" && <Grid z={d.shot.part ? 1.22 + 0.04 * d.u : 1 + 0.03 * d.u} />}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,6,12,0.7) 0%, rgba(4,6,12,0) 14%, rgba(4,6,12,0) 70%, rgba(4,6,12,0.8) 100%)" }} />
      <div style={{ position: "absolute", left: 48, right: 48, top: HDR, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: clamp01(f / 12) }}>
        <span data-qa="hdr:series" data-qa-kind="chrome" style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 3 }}>{C.series}</span>
        <span data-qa="hdr:tag" data-qa-kind="chrome" style={{ ...sans(500), fontSize: 28, color: SOFT, letterSpacing: 2, padding: "2px 12px", background: "rgba(8,11,18,0.6)", border: "1px solid rgba(245,247,250,0.25)", borderRadius: 6 }}>{C.tag}</span>
      </div>
      {d.world === "hook" && <HookHud d={d} pr={pr} />}
      {(d.world === "book" || d.lay.startsWith("a.") || d.lay.startsWith("o.") || d.lay.startsWith("s.")) && d.world !== "flat" && <BookHud d={d} pr={pr} />}
      {flat && <FlatBookHud d={d} />}
      <TableHud d={d} pr={pr} />
      {d.world === "anatomy" && <AnatomyHud d={d} pr={pr} />}
      <RecapHud d={d} />
      <div style={{ position: "absolute", inset: 0, background: d.flashColor, opacity: d.flash * 0.22, mixBlendMode: "screen" }} />
      <Captions f={f} />
    </div>
  );
};

