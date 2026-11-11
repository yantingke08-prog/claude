// 2D layer over the set: the data panels (tape, ladder, flow, last price), the annotations and the big type.
// v5 design system, built for a phone screen:
//   zones   key text stays inside x 60–960, y 140–1340; captions own 1360–1500; the bottom 340 px and the
//           right 120 px (platform buttons) carry nothing that matters
//   grid    12 columns over 60–960 (75 px each): data columns left (cols 0–4) and right (8–12), the 3D
//           subject in the middle, cards in the low band
//   type    body 34 · labels 40–48 · data 48–80 · captions 58 · conclusions 90–140; no text under 34 px
//   panels  graphite glass with a hairline metal edge and one thin accent bar; no neon borders
//   beats   every shot opens on its subject, then adds data, then a conclusion, one beat every 1.5–2.5 s;
//           all reveals are smooth ease in / out, no pops
// Rules carried over: nothing narrative appears before the narration reaches it; emphasis inside a shot is an
// in-frame focus box, never a cut.
// v6 (one focus per sentence):
//   per sentence  at most ONE main label (a card, chip or conclusion line) plus ONE layer of supporting data;
//                 labels hand over to each other, they do not pile up
//   timing        a label keyed to a word starts LEAD frames before the word is spoken (`cueAt`), stays fully on
//                 24+ frames (cards 36+) and is never cut away early; it only appears once the shot's camera
//                 move has settled (shot.mv)
//   order         categories go overview -> the current one lit -> its evidence -> its conclusion
//   QA            every label carries data-qa-kind (card / chip / type = main; data = supporting; chrome / mark =
//                 not counted), data-qa-group (pieces of one label) and data-qa-cue (its word's frame)
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { C } from "./copy";
import { CONVERT, FIRST_HIT, JUMP, JUMP2, MINES, PASSIVE_AT, TRADES, TRIGGER_K, beadK, ky, lastK, lots, px, sizeAt, volIn, type Side } from "./book";
import { FRAMES, L, Lc, Le, TL, clamp01, cubicInOut, smooth, span } from "./cue";
import { PIECES, RECAP_CARDS, SHOTS, X, type Dir } from "./director";
import { mono, sans, serif } from "./fonts";
import { HERO, PAL } from "./Scene";

const INK = "#F2F4F8";
const SOFT = "rgba(242,244,248,0.80)";
const DIM = "rgba(242,244,248,0.48)";
const BLUE = "#8fb2ff";
const RED = "#ff5468";
const num = (v: number, d = 0) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
/** every reveal: smooth in over ~0.4 s */
const ease = (f: number, a: number, d = 12) => span(f, a, a + d, smooth);
const fin = ease;
/** a label keyed to a narration word starts this many frames before the word */
const LEAD = 6;
const cueAt = (cue: number) => ({ a: cue - LEAD, cue });
const shotOf = (lay: string) => SHOTS.find((x) => x.lay === lay)!;

// ---------------------------------------------------------------- zones and grid
const SAFE = { l: 60, r: 960, t: 140, b: 1340 };
const COL = (i: number) => SAFE.l + i * 75;
const PROG = 140; // chapter progress
const STRIP = 222; // types / players / spread
const MAIN = 322; // first row of the data columns
const LOW = SAFE.b; // labels end here
const CAP_TOP = 1374;
const LEFT = { x: COL(0), w: 300 };
const RIGHT = { x: COL(8), w: 300 };
const BAND = { x: SAFE.l, w: SAFE.r - SAFE.l }; // low band for cards
/** rough width of a run of text: CJK is square, Latin / digits about 0.6 em */
const tw = (s: string, size: number) => [...s].reduce((w, ch) => w + (ch.codePointAt(0)! > 0x2e80 ? size : size * 0.6), 0);
const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- type scale and surfaces
const T = { body: 34, label: 42, data: 52, dataL: 72, cap: 58 };
const LINE = 2; // every leader, ring and frame
/** graphite glass with a hairline metal edge; the accent is a thin bar, not a glowing border */
const GLASS = (accent?: string, edge: "top" | "left" = "top") => ({
  background: "linear-gradient(180deg, rgba(30,34,44,0.82), rgba(15,18,25,0.88))",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(206,214,230,0.20)",
  boxShadow: `0 14px 34px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)${accent ? `, inset ${edge === "left" ? `4px 0 0 ${accent}` : `0 3px 0 ${accent}`}` : ""}`,
  borderRadius: 14,
});

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

// ================================================================ components (each relation has its own look)
/** conclusion type: the picture recedes, characters arrive as they are spoken, the key words light up */
type SLine = { text: string; at: number; size: number; hl?: string; color?: string };
/** each line's `at` is the frame its keyword is spoken; the characters start LEAD frames before it */
const Statement: React.FC<{ f: number; lines: SLine[]; end: number; top: number; kicker?: string; scrim?: number; rule?: boolean; hot?: string }> = ({ f, lines, end, top, kicker, scrim = 1, rule = true, hot = PAL.gold }) => {
  const a = lines[0].at - LEAD;
  const k = span(f, a - 4, a + 6, smooth) * (1 - span(f, end - 6, end, smooth));
  const grp = `stmt:${lines[0].text}`;
  if (k < 0.01) return null;
  const STEP = 1.6;
  const h = lines.reduce((s, l) => s + l.size * 1.3, 0) + (kicker ? 60 : 0);
  const last = lines[lines.length - 1];
  const done = last.at - LEAD + [...last.text].length * STEP;
  const kr = span(f, done - 4, done + 16, smooth);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: k * scrim, background: "rgba(5,6,9,0.40)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: top - 140, height: h + 280, opacity: k * scrim, background: "linear-gradient(180deg, rgba(8,9,12,0) 0%, rgba(8,9,12,0.9) 26%, rgba(8,9,12,0.9) 74%, rgba(8,9,12,0) 100%)" }} />
      <div style={{ position: "absolute", left: SAFE.l, right: 1080 - SAFE.r, top, textAlign: "center", opacity: span(k, 0, 0.4) }}>
        {kicker && <div data-qa={`type:kicker:${kicker}`} data-qa-into="type:" data-qa-kind="type" data-qa-group={grp} data-qa-cue={lines[0].at} style={{ ...mono(), fontSize: T.body, letterSpacing: 8, color: hot, marginBottom: 24 }}>{kicker}</div>}
        {lines.map((l, i) => {
          const hs = l.hl ? l.text.indexOf(l.hl) : -1;
          const he = hs + (l.hl?.length ?? 0);
          return (
            <div key={i} data-qa={f >= l.at - LEAD - 2 ? `type:${l.text}` : undefined} data-qa-into="type:" data-qa-text="1" data-qa-kind="type" data-qa-group={grp} data-qa-cue={l.at} style={{ ...serif(), fontSize: l.size, lineHeight: 1.3, letterSpacing: 2, whiteSpace: "nowrap" }}>
              {[...l.text].map((ch, j) => {
                const kj = span(f, l.at - LEAD + j * STEP, l.at - LEAD + j * STEP + 10, smooth);
                const isHot = j >= hs && j < he;
                return (
                  <span key={j} style={{ display: "inline-block", opacity: kj, transform: `translateY(${(1 - kj) * 0.18 * l.size}px)`, color: isHot ? hot : (l.color ?? INK), textShadow: "0 4px 18px rgba(0,0,0,0.9)" }}>
                    {ch}
                  </span>
                );
              })}
            </div>
          );
        })}
        {rule && <div style={{ margin: "20px auto 0", width: Math.min(640, [...last.text].length * last.size * 0.8) * kr, height: 3, borderRadius: 2, background: hot, opacity: 0.85 }} />}
      </div>
    </>
  );
};

/** relation / cause: a ring on the subject, a thin leader, a glass plate with an accent bar on the leader side */
const Tag: React.FC<{ f: number; a: number; b: number; at: P; plate: P; side: "l" | "r"; color?: string; title: string; notes?: [string, number][]; size?: number; mono?: boolean; cue?: number; qa?: string }> = ({ f, a, b, at, plate, side, color = PAL.gold, title, notes = [], size = T.label, mono: m, cue, qa }) => {
  const { width, height } = useVideoConfig();
  const out = 1 - span(f, b - 6, b, smooth);
  if (f < a || f >= b || out < 0.01) return null;
  const draw = span(f, a, a + 8, smooth);
  const kp = span(f, a + 3, a + 13, smooth);
  // the plate must fit: flip to the other side of the anchor if it runs off, then clamp into the safe area
  const pw = Math.max(tw(title, size), ...notes.map(([n]) => tw(n, T.body))) + 56;
  const ph = size * 1.25 + notes.length * T.body * 1.3 + 28;
  if (side === "r" && plate.x + pw > SAFE.r && at.x - (plate.x - at.x) - pw >= SAFE.l) (side = "l"), (plate = { ...plate, x: at.x - (plate.x - at.x) });
  if (side === "l" && plate.x - pw < SAFE.l && at.x + (at.x - plate.x) + pw <= SAFE.r) (side = "r"), (plate = { ...plate, x: at.x + (at.x - plate.x) });
  plate = { x: side === "r" ? clampN(plate.x, SAFE.l, SAFE.r - pw) : clampN(plate.x, SAFE.l + pw, SAFE.r), y: clampN(plate.y, MAIN + ph / 2, LOW - ph / 2) };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <circle cx={at.x} cy={at.y} r={9} fill="none" stroke={color} strokeWidth={LINE} opacity={draw} />
        <circle cx={at.x} cy={at.y} r={3} fill={color} opacity={draw} />
        <line x1={at.x} y1={at.y} x2={at.x + (plate.x - at.x) * draw} y2={at.y + (plate.y - at.y) * draw} stroke={color} strokeWidth={LINE} opacity={0.9} />
      </svg>
      <div data-qa={qa ?? `tag:${title}`} data-qa-kind={notes.length ? "card" : "chip"} data-qa-cue={cue} style={{ position: "absolute", top: plate.y, left: side === "r" ? plate.x : undefined, right: side === "l" ? width - plate.x : undefined, transform: `translate(0, calc(-50% + ${(1 - kp) * 10}px))`, opacity: kp, padding: "12px 24px 14px", whiteSpace: "nowrap", textAlign: side === "r" ? "left" : "right", ...GLASS(color, "left"), boxShadow: `0 14px 34px rgba(0,0,0,0.45), inset ${side === "r" ? 4 : -4}px 0 0 ${color}` }}>
        <div style={{ ...(m ? mono() : sans(700)), fontSize: size, lineHeight: 1.25, color: INK }}>{title}</div>
        {notes.map(([n, t], i) => {
          const ki = fin(f, t);
          return (
            <div key={i} style={{ ...sans(500), fontSize: T.body, lineHeight: 1.3, color: i === notes.length - 1 && notes.length > 1 ? color : SOFT, opacity: ki, transform: `translateY(${(1 - ki) * 6}px)` }}>
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** number: a figure with a small label above it, no frame (sits on a soft dark wash) */
const DataChip: React.FC<{ x: number; y: number; label: string; value: string; color?: string; k?: number; sub?: string; size?: number; align?: "left" | "right"; qa?: string; cue?: number; group?: string }> = ({ x, y, label, value, color = INK, k = 1, sub, size = T.data, align = "left", qa, cue, group }) =>
  k < 0.01 ? null : (
    <div data-qa={qa ?? `num:${label}`} data-qa-kind="data" data-qa-cue={cue} data-qa-group={group} style={{ position: "absolute", left: align === "left" ? x : undefined, right: align === "right" ? 1080 - x : undefined, top: y, opacity: k, transform: `translateY(${(1 - k) * 8}px)`, padding: "8px 18px 10px", borderRadius: 12, background: "linear-gradient(180deg, rgba(10,12,17,0.82), rgba(10,12,17,0.66))", textAlign: align }}>
      <div style={{ ...sans(500), fontSize: T.body, lineHeight: 1.25, color: SOFT }}>{label}</div>
      <div style={{ ...mono(), fontSize: size, lineHeight: 1.1, color }}>{value}</div>
      {sub && <div style={{ ...sans(500), fontSize: T.body, lineHeight: 1.3, color: DIM }}>{sub}</div>}
    </div>
  );

/** result: a solid pill in the accent colour with dark text (a consequence, not an explanation) */
const Result: React.FC<{ f: number; a: number; x: number; y: number; text: string; color?: string; b?: number; qa?: string; cue?: number; group?: string; kind?: string }> = ({ f, a, x, y, text, color = PAL.gold, b = FRAMES + 1, qa, cue, group, kind = "chip" }) => {
  const k = ease(f, a, 10) * (1 - span(f, b - 6, b, smooth));
  if (k < 0.01) return null;
  const w = tw(text, T.label) + 40;
  x = clampN(x, SAFE.l + w / 2, SAFE.r - w / 2);
  return (
    <div data-qa={qa ?? `result:${text}`} data-qa-kind={kind} data-qa-cue={cue} data-qa-group={group} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, ${(1 - k) * 8}px)`, opacity: k, ...sans(700), fontSize: T.label, lineHeight: 1.2, color: "#0b0d12", background: color, padding: "6px 20px 8px", borderRadius: 999, whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(0,0,0,0.4)" }}>
      {text}
    </div>
  );
};

/** key level: a dashed horizontal reference across the subject, labelled at its left end */
const KeyLine: React.FC<{ f: number; a: number; y: number; x0?: number; x1?: number; label: string; color?: string; b?: number; below?: boolean; cue?: number }> = ({ f, a, y, x0 = SAFE.l, x1 = SAFE.r, label, color = INK, b = FRAMES + 1, below, cue }) => {
  const k = ease(f, a, 14) * (1 - span(f, b - 6, b, smooth));
  if (k < 0.01 || y < MAIN || y > LOW - 30) return null;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: k * 0.85 }}>
        <line x1={x0} x2={x0 + (x1 - x0) * k} y1={y} y2={y} stroke={color} strokeWidth={LINE} strokeDasharray="12 10" />
      </svg>
      <div data-qa={`line:${label}`} data-qa-kind="chip" data-qa-cue={cue} style={{ position: "absolute", left: x0, top: below ? y + 10 : y - 54, opacity: k, ...mono(), fontSize: T.body, lineHeight: 1.25, color, padding: "2px 12px", borderRadius: 8, background: "rgba(10,12,17,0.82)", whiteSpace: "nowrap" }}>
        {label}
      </div>
    </>
  );
};

/** comparison: two values on one bar, left vs right */
const VsBar: React.FC<{ x: number; y: number; w: number; l: [string, number]; r: [string, number]; k?: number; colors?: [string, string]; qa?: string; cue?: number; group?: string }> = ({ x, y, w, l, r, k = 1, colors = [PAL.up, PAL.down], qa, cue, group }) => {
  if (k < 0.01) return null;
  const tot = Math.max(1, l[1] + r[1]);
  const lw = (l[1] / tot) * 100;
  return (
    <div data-qa={qa ?? `vs:${l[0]}`} data-qa-kind="data" data-qa-cue={cue} data-qa-group={group} style={{ position: "absolute", left: x, top: y, width: w, opacity: k }}>
      <div style={{ display: "flex", justifyContent: "space-between", ...sans(500), fontSize: T.body, lineHeight: 1.3 }}>
        <span style={{ color: colors[0] }}>
          {l[0]} <span style={{ ...mono() }}>{num(l[1])}</span>
        </span>
        <span style={{ color: colors[1] }}>
          {r[0]} <span style={{ ...mono() }}>{num(r[1])}</span>
        </span>
      </div>
      <div style={{ display: "flex", height: 12, marginTop: 6, borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${lw}%`, background: colors[0] }} />
        <div style={{ flex: 1, background: r[1] ? colors[1] : "transparent" }} />
      </div>
    </div>
  );
};

/** a glass panel with a heading */
const Panel: React.FC<{ x: number; y: number; w: number; h?: number; head?: string; color?: string; k?: number; children: React.ReactNode; pad?: string; qa?: string; kind?: "data" | "card"; cue?: number; group?: string }> = ({ x, y, w, h, head, color = BLUE, k = 1, children, pad = "12px 18px 14px", qa, kind = "data", cue, group }) =>
  k < 0.01 ? null : (
    <div data-qa={qa ?? `panel:${head ?? ""}`} data-qa-kind={kind} data-qa-cue={cue} data-qa-group={group} style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: Math.min(1, k * 1.2), transform: `translateY(${(1 - k) * 10}px)`, padding: pad, boxSizing: "border-box", overflow: "hidden", ...GLASS(color) }}>
      {head && <div style={{ ...sans(700), fontSize: T.body, lineHeight: 1.3, letterSpacing: 2, color, marginBottom: 6 }}>{head}</div>}
      {children}
    </div>
  );

// ================================================================ chapter progress
const CHAPTERS: [string, string][] = [
  ["hook", "开场"],
  ["auction", "拍卖与盘口"],
  ["orders", "三种订单"],
  ["stops", "止损"],
  ["players", "参与者"],
  ["anatomy", "K线解剖"],
  ["recap", "回顾"],
];
const Progress: React.FC<{ f: number }> = ({ f }) => {
  const first = { hook: "h.rise", auction: "a.open", orders: "o.three", stops: "s.hidden", players: "p.who", anatomy: "w.candle", recap: "r.cards" } as Record<string, string>;
  const at = CHAPTERS.map(([id]) => shotOf(first[id]).at);
  const i = Math.max(0, at.filter((a) => f >= a).length - 1);
  const u = clamp01((f - at[i]) / ((at[i + 1] ?? FRAMES) - at[i]));
  return (
    <div style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: PROG, opacity: clamp01(f / 12) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span data-qa="hdr:chapter" data-qa-kind="chrome" style={{ ...sans(700), fontSize: T.body, color: INK }}>
          <span style={{ ...mono(), color: PAL.gold, marginRight: 14 }}>0{i + 1}</span>
          {CHAPTERS[i][1]}
        </span>
        <span data-qa="hdr:tag" data-qa-kind="chrome" style={{ ...sans(500), fontSize: T.body, color: DIM }}>{C.tag}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {CHAPTERS.map(([id], j) => (
          <div key={id} style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
            <div style={{ width: `${j < i ? 100 : j === i ? u * 100 : 0}%`, height: "100%", background: j === i ? PAL.gold : "rgba(255,255,255,0.55)" }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ================================================================ data panels
/** price ladder: bid size | price | ask size, seven rows centred on the last price, 34 px figures */
const LAD = { x: RIGHT.x, y: MAIN, w: RIGHT.w, row: 50, up: 3 };
const ladRowY = (f: number, q: number) => LAD.y + 64 + (Math.round(beadK(f)) + LAD.up - q) * LAD.row;
const Ladder: React.FC<{ f: number; k?: number; hidden?: boolean; mark?: { k: number; color: string }[]; cue?: number }> = ({ f, k = 1, hidden, mark = [], cue }) => {
  if (k < 0.01) return null;
  const c = Math.round(beadK(f));
  const lk = lastK(f);
  const rows = Array.from({ length: 7 }, (_, i) => c + LAD.up - i);
  const MAX = 70;
  return (
    <Panel x={LAD.x} y={LAD.y} w={LAD.w} head={C.ladder} k={k} qa="ladder" pad="12px 12px 12px" cue={cue}>
      {rows.map((q) => {
        const b = sizeAt(f, "bid", q),
          a = sizeAt(f, "ask", q);
        const hit = TRADES.some((t) => t.k === q && f >= t.f && f < t.f + 6);
        const isLast = q === lk && f >= FIRST_HIT;
        const m = mark.find((mm) => mm.k === q);
        const mine = hidden && MINES.find((mm) => mm.k === q && f < mm.at);
        return (
          <div key={q} style={{ position: "relative", display: "flex", height: LAD.row, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.07)", background: hit ? "rgba(255,255,255,0.16)" : isLast ? "rgba(242,189,98,0.12)" : undefined, outline: m ? `${LINE}px solid ${m.color}` : isLast ? `1px solid ${PAL.gold}aa` : undefined, outlineOffset: -2, borderRadius: 6 }}>
            <div style={{ width: 62, position: "relative", height: LAD.row - 12 }}>
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${Math.min(1, b / MAX) * 100}%`, background: `${PAL.up}55`, borderRadius: 4 }} />
              <div style={{ position: "absolute", right: 4, ...mono(), fontSize: T.body, lineHeight: `${LAD.row - 12}px`, color: INK }}>{b || ""}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", ...mono(), fontSize: T.body, color: isLast ? PAL.gold : SOFT }}>{px(q)}</div>
            <div style={{ width: 62, position: "relative", height: LAD.row - 12 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(1, a / MAX) * 100}%`, background: `${PAL.down}55`, borderRadius: 4 }} />
              <div style={{ position: "absolute", left: 4, ...mono(), fontSize: T.body, lineHeight: `${LAD.row - 12}px`, color: INK }}>{a ? a : TRADES.some((t) => t.k === q && t.f <= f) ? "0" : ""}</div>
              {mine && <div style={{ position: "absolute", right: -2, top: (LAD.row - 12) / 2 - 9, width: 18, height: 18, transform: "rotate(45deg)", border: `${LINE}px dashed ${PAL.amber}`, background: `${PAL.amber}33` }} />}
            </div>
          </div>
        );
      })}
    </Panel>
  );
};
type Box = { x0: number; y0: number; x1: number; y1: number };
const ladBox = (f: number, hi: number, lo: number): Box => ({ x0: LAD.x + 8, y0: ladRowY(f, hi) - 3, x1: LAD.x + LAD.w - 8, y1: ladRowY(f, lo) + LAD.row + 3 });

/** time and sales: price · lots, newest on top */
const TAPE = { x: LEFT.x, w: LEFT.w, row: 46 };
const Tape: React.FC<{ f: number; y: number; n?: number; k?: number }> = ({ f, y, n = 5, k = 1 }) => {
  if (k < 0.01) return null;
  const rows = TRADES.filter((t) => t.f <= f).slice(-n).reverse();
  return (
    <Panel x={TAPE.x} y={y} w={TAPE.w} head={C.tape} k={k} qa="tape">
      {rows.length === 0 && <div style={{ ...sans(500), fontSize: T.body, color: DIM, padding: "6px 0" }}>{C.tapeWait}</div>}
      {rows.map((t, i) => {
        const fresh = 1 - clamp01((f - t.f) / 12);
        const col = t.stop ? PAL.amber : PAL.up;
        return (
          <div key={`${t.f}-${i}`} style={{ display: "flex", justifyContent: "space-between", ...mono(), fontSize: T.body, lineHeight: `${TAPE.row}px`, color: INK, background: `rgba(255,255,255,${0.14 * fresh})`, borderLeft: `3px solid ${col}`, paddingLeft: 10, paddingRight: 6, borderRadius: 4 }}>
            <span style={{ color: col }}>{px(t.k)}</span>
            <span>{t.q}</span>
          </div>
        );
      })}
    </Panel>
  );
};
const tapeBox = (y: number, n: number): Box => ({ x0: TAPE.x + 8, y0: y + 60, x1: TAPE.x + TAPE.w - 8, y1: y + 64 + n * TAPE.row });

/** mini thumbnail: the price path since the open (or volume bars) */
const Spark: React.FC<{ f: number; x: number; y: number; w: number; k?: number; from: number; mode?: "path" | "vol"; h?: number; cue?: number }> = ({ f, x, y, w, k = 1, from, mode = "path", h = 96, cue }) => {
  if (k < 0.01) return null;
  const H = h;
  const n = 40;
  const t = (i: number) => from + ((f - from) * i) / (n - 1);
  const pts = [...Array(n)].map((_, i) => beadK(t(i)));
  const lo = Math.min(0, ...pts),
    hi = Math.max(2, ...pts);
  const W = w - 36;
  return (
    <Panel x={x} y={y} w={w} head={mode === "path" ? C.pathThumb : C.vol} k={k} qa={`spark:${mode}`} color={mode === "path" ? PAL.gold : PAL.amber} cue={cue}>
      <svg width={W} height={H}>
        {mode === "path" ? (
          <polyline points={pts.map((p, i) => `${(i / (n - 1)) * W},${H - 6 - ((p - lo) / (hi - lo)) * (H - 12)}`).join(" ")} fill="none" stroke={PAL.gold} strokeWidth={LINE + 1} strokeLinejoin="round" />
        ) : (
          [...Array(n)].map((_, i) => {
            const v = volIn(t(i) - (f - from) / n, t(i));
            const stop = TRADES.some((tr) => tr.stop && tr.f <= t(i) && tr.f > t(i) - (f - from) / n);
            return <rect key={i} x={(i / n) * W} width={W / n - 2} y={H - Math.min(1, v / 14) * H} height={Math.min(1, v / 14) * H} fill={stop ? PAL.amber : `${PAL.up}aa`} rx={2} />;
          })
        )}
      </svg>
    </Panel>
  );
};

/** the three ways to act, as a progress strip */
const Types: React.FC<{ f: number; k: number }> = ({ f, k }) => {
  if (k < 0.01) return null;
  const at = [Lc("o2", "被动订单"), Lc("o3", "主动订单"), Lc("o6", "止损订单")].map((a) => a - LEAD);
  const cur = at.filter((a) => f >= a).length - 1;
  return (
    <div data-qa="types" data-qa-kind="chrome" style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: STRIP, display: "flex", gap: 12, opacity: k }}>
      {C.three.map((s, i) => {
        const on = i === cur;
        const col = [PAL.up, PAL.gold, PAL.amber][i];
        const named = f >= at[i];
        return (
          <div key={s} style={{ flex: 1, textAlign: "center", padding: "8px 0 10px", ...sans(700), fontSize: 36, lineHeight: 1.2, color: on ? INK : named ? SOFT : DIM, ...GLASS(on ? col : undefined) }}>
            {named ? s : `0${i + 1}`}
          </div>
        );
      })}
    </div>
  );
};

/** a case card in the low band: kicker, title, notes that arrive with the narration */
const CaseCard: React.FC<{ f: number; a: number; n: number; title: string; notes: [string, number][]; color: string; y?: number; tag?: string; w?: number; cue?: number }> = ({ f, a, n, title, notes, color, y, tag, w = 520, cue }) => {
  const k = fin(f, a, 12);
  if (k < 0.01) return null;
  const h = 46 + 80 + notes.length * 48 + 36;
  return (
    <div data-qa={`case:${title}`} data-qa-kind="card" data-qa-cue={cue} style={{ position: "absolute", left: BAND.x, top: y ?? LOW - h - 16, width: w, boxSizing: "border-box", opacity: k, transform: `translateY(${(1 - k) * 12}px)`, padding: "14px 28px 18px", ...GLASS(color, "left") }}>
      <div style={{ ...mono(), fontSize: T.body, letterSpacing: 4, color }}>{tag ?? C.caseN[n]}</div>
      <div style={{ ...serif(), fontSize: 64, lineHeight: 1.25, color: INK }}>{title}</div>
      {notes.map(([s, t], i) => {
        const ki = fin(f, t);
        return (
          <div key={i} style={{ ...sans(500), fontSize: 36, lineHeight: 1.35, color: i === notes.length - 1 ? color : SOFT, opacity: ki, transform: `translateY(${(1 - ki) * 6}px)` }}>
            {s}
          </div>
        );
      })}
    </div>
  );
};

/** the graphite backdrop of the flat shots: a 12-column grid, very faint */
const Grid: React.FC<{ k?: number }> = ({ k = 1 }) => (
  <div style={{ position: "absolute", inset: 0, opacity: k, background: `radial-gradient(ellipse at 45% 38%, #171a22 0%, ${PAL.bg} 72%)` }}>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
      {Array.from({ length: 13 }, (_, i) => (
        <line key={`v${i}`} y1={0} y2={1920} x1={COL(i)} x2={COL(i)} stroke="#232833" strokeWidth={1} />
      ))}
      {Array.from({ length: 26 }, (_, i) => (
        <line key={`h${i}`} x1={0} x2={1080} y1={i * 75} y2={i * 75} stroke="#1c2029" strokeWidth={1} />
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
    <div style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: CAP_TOP, textAlign: "center", opacity: k }}>
      <span data-qa="caption" data-qa-kind="cap" style={{ display: "inline-block", padding: "6px 26px 10px", borderRadius: 14, background: "rgba(8,9,12,0.86)", ...sans(500), fontSize: T.cap, lineHeight: 1.3, color: INK, whiteSpace: "nowrap" }}>
        {c.text.split(re).map((s, i) => (KEY.includes(s) ? <span key={i} style={{ color: PAL.gold }}>{s}</span> : s))}
      </span>
    </div>
  );
};

// ================================================================ in-frame emphasis
const FOCUS_EASE = 24; // 0.8 s in, the same out
const focusK = (f: number, a: number, b: number) => span(f, a, a + FOCUS_EASE, smooth) * (1 - span(f, b - FOCUS_EASE, b, smooth));
/** emphasis inside a shot (never a cut to a close-up): the rest of the frame dims ~13%, a thin frame marks the
 *  box, and the 2D layer inside it is redrawn, clipped to the box, growing smoothly up to `z` (≤ 1.15).
 *  `move` slides the box to a second region mid-shot (a beat without a cut). */
const Focus: React.FC<{ f: number; a: number; b: number; box: Box; to?: [number, Box]; z?: number; color?: string; layer?: React.ReactNode; children?: React.ReactNode }> = ({ f, a, b, box, to, z = 1.12, color = PAL.gold, layer, children }) => {
  const k = focusK(f, a, b);
  if (k < 0.01) return null;
  if (to) {
    const m = span(f, to[0], to[0] + 20, cubicInOut);
    box = { x0: box.x0 + (to[1].x0 - box.x0) * m, y0: box.y0 + (to[1].y0 - box.y0) * m, x1: box.x1 + (to[1].x1 - box.x1) * m, y1: box.y1 + (to[1].y1 - box.y1) * m };
  }
  const s = 1 + (Math.min(z, 1.15) - 1) * k;
  const cx = (box.x0 + box.x1) / 2,
    cy = (box.y0 + box.y1) / 2;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <path d={`M0 0H1080V1920H0Z M${box.x0} ${box.y0}V${box.y1}H${box.x1}V${box.y0}Z`} fill="#000" fillRule="evenodd" opacity={0.13 * k} />
      </svg>
      {layer && (
        <div data-qa-skip="1" style={{ position: "absolute", inset: 0, clipPath: `inset(${box.y0}px ${1080 - box.x1}px ${1920 - box.y1}px ${box.x0}px round 10px)` }}>
          <div style={{ position: "absolute", left: box.x0, top: box.y0, width: box.x1 - box.x0, height: box.y1 - box.y0, background: "#10131a" }} />
          <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: `${cx}px ${cy}px` }}>{layer}</div>
        </div>
      )}
      {children}
      <div style={{ position: "absolute", left: box.x0 - 3, top: box.y0 - 3, width: box.x1 - box.x0 + 6, height: box.y1 - box.y0 + 6, border: `${LINE}px solid ${color}`, borderRadius: 12, boxShadow: `0 0 10px ${color}66`, opacity: k }} />
    </>
  );
};

/** a hidden stop order: a grey dashed ghost until the price touches the trigger, then it flips over into an
 *  amber market buy and flies at the asks */
const GhostOrder: React.FC<{ f: number; a: number; x: number; y: number; flip: number; to: P; cue?: number }> = ({ f, a, x, y, flip, to, cue }) => {
  const k = fin(f, a, 12);
  if (k < 0.01) return null;
  const turn = span(f, flip - 3, flip + 9, cubicInOut);
  const fly = span(f, flip + 14, flip + 32, (t) => t * t);
  const live = turn > 0.5;
  const ang = live ? (1 - turn) * 180 : turn * 180;
  const col = live ? PAL.amber : "rgba(206,214,230,0.7)";
  const gx = x + (to.x - x) * fly,
    gy = y + (to.y - y) * fly;
  return (
    <div data-qa="ghost" data-qa-kind="data" data-qa-into="ladder" data-qa-cue={cue} style={{ position: "absolute", left: gx, top: gy, transform: `translate(-50%, -50%) perspective(900px) rotateY(${ang}deg)`, opacity: k * (1 - span(fly, 0.6, 1)), width: 340, whiteSpace: "nowrap", padding: "12px 18px 14px", borderRadius: 14, textAlign: "center", background: live ? "rgba(40,24,6,0.94)" : "rgba(22,26,34,0.62)", border: `${LINE}px ${live ? "solid" : "dashed"} ${col}` }}>
      <div style={{ ...sans(700), fontSize: T.label, lineHeight: 1.2, color: live ? INK : "rgba(230,236,245,0.75)" }}>{live ? C.ghost[2] : C.ghost[0]}</div>
      <div style={{ ...sans(500), fontSize: T.body, lineHeight: 1.3, color: col }}>{live ? C.ghost[3] : C.ghost[1]}</div>
    </div>
  );
};

/** two order tickets, 4 lots each, slide into one trade slip and lock together */
const Receipt: React.FC<{ f: number; a: number; lock: number; y: number; cue?: number }> = ({ f, a, lock, y, cue }) => {
  const q = lots(1, 0);
  const u = span(f, a, lock, cubicInOut);
  if (f < a) return null;
  const W = 280;
  const cx = 510 - W / 2;
  const locked = span(f, lock, lock + 10, smooth);
  const ticket = (side: 0 | 1) => {
    const x0 = side ? SAFE.r - W : SAFE.l;
    const col = side ? PAL.down : PAL.up;
    return (
      <div data-qa={`ticket:${side}`} data-qa-kind="card" data-qa-group="receipt" data-qa-into="ticket:,receipt" data-qa-cue={cue} style={{ position: "absolute", left: x0 + (cx - x0) * u, top: y, width: W, boxSizing: "border-box", padding: "10px 20px 12px", opacity: fin(f, a) * (1 - locked), ...GLASS(col) }}>
        <div style={{ ...sans(700), fontSize: T.body, color: col }}>{side ? C.sellQty : C.buyQty}</div>
        <div style={{ ...mono(), fontSize: T.dataL, lineHeight: 1.05, color: INK }}>
          {q} <span style={{ ...sans(500), fontSize: T.body, color: SOFT }}>{C.lots}</span>
        </div>
      </div>
    );
  };
  return (
    <>
      {ticket(0)}
      {ticket(1)}
      {locked > 0.01 && (
        <div data-qa="receipt" data-qa-kind="card" data-qa-group="receipt" style={{ position: "absolute", left: cx - 60, top: y - 16, width: W + 120, boxSizing: "border-box", padding: "12px 24px 14px", opacity: locked, ...GLASS(PAL.gold) }}>
          <div style={{ display: "flex", justifyContent: "space-between", ...sans(700), fontSize: T.body, color: PAL.gold }}>
            <span>{C.receipt}</span>
            <span style={{ ...mono() }}>{px(1)}</span>
          </div>
          {/* the two sides line up digit for digit: one trade, one number */}
          <div style={{ display: "flex", ...mono(), fontSize: T.dataL, lineHeight: 1.1, color: INK, borderTop: "1px solid rgba(255,255,255,0.14)", marginTop: 6, paddingTop: 4 }}>
            <div style={{ flex: 1, textAlign: "center", borderRight: `${LINE}px solid ${PAL.gold}88` }}>
              <div style={{ ...sans(500), fontSize: T.body, color: PAL.up }}>{C.buyQty}</div>
              {q}
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ ...sans(500), fontSize: T.body, color: PAL.down }}>{C.sellQty}</div>
              {q}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ================================================================ hook
const HookHud: React.FC<{ d: Dir; pr: Proj }> = ({ d }) => {
  const f = d.f;
  if (!d.lay.startsWith("h.")) return null;
  const lay = d.lay;
  const e0 = d.shot.end + 6; // labels stay fully on until the cut
  const hid = Lc("h2", "藏在");
  const nOrd = Math.round(12480 * span(f, hid - LEAD, hid + 44, (x) => x));
  return (
    <>
      {/* h1: the line alone over the candle (no data yet) */}
      {lay === "h.rise" && <Statement f={f} top={300} end={e0} scrim={0.45} rule={false} lines={[{ text: C.report[0], at: L("h1"), size: 120 }, { text: C.report[1], at: Lc("h1", "只是"), size: 140, hl: "战报" }]} />}
      {/* h2: once inside, one figure: how many orders the candle hides */}
      {lay === "h.dive" && (
        <>
          <DataChip x={SAFE.l} y={1040} label={C.ordersN} value={num(nOrd)} color={PAL.gold} k={ease(f, hid - LEAD)} size={T.dataL} cue={hid} group="orders" />
          <VsBar x={SAFE.l} y={1230} w={SAFE.r - SAFE.l} l={[C.legend[0], Math.round(nOrd / 2)]} r={[C.legend[1], nOrd - Math.round(nOrd / 2)]} k={ease(f, hid + 18)} group="orders" />
        </>
      )}
      {/* h3: the title; the episode's three topics are the overview of what follows */}
      {lay === "h.title" && C.topics.map((t, i) => <Result key={t} f={f} {...cueAt(Lc("h3", "先把") + i * 8)} x={[250, 510, 770][i]} y={1080} text={t} color={[PAL.up, PAL.gold, BLUE][i]} kind="data" group="topics" />)}
      {lay === "h.title" && <Statement f={f} top={640} end={e0} kicker={`${C.ep} · ${C.titleEn}`} lines={[{ text: C.title, at: L("h3"), size: 150, hl: C.title }, { text: C.sub, at: Lc("h3", "先把"), size: 64 }]} />}
    </>
  );
};

// ================================================================ the order book
// v6: each wall shot has its own composition (director.ts `comp`) and ONE data layer: the ladder, the tape, a
// counter or the price path, never all of them at once. The main label hands over sentence by sentence.
const BookHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  const lay = d.lay;
  const e0 = d.shot.end + 6,
    mv = d.shot.mv;
  const P = (x: number, k: number, z = 0.5) => pr(X.book + x, ky(k), z);
  const is = (...l: string[]) => l.includes(lay);
  const lvl = (side: Side) => [...Array(6)].map((_, i) => (side === "bid" ? -1 - i : 1 + i)).filter((q) => sizeAt(f, side, q) > 0);
  const lotsOf = (side: Side) => lvl(side).reduce((s, q) => s + sizeAt(f, side, q), 0);
  const kIn = fin(f, mv, 12); // the shot's data layer, in once the camera has settled
  const types = is("o.passive", "o.active", "o.hop", "s.hidden", "s.trigger");
  return (
    <>
      <Types f={f} k={types ? 1 : 0} />

      {/* a1 · 仰拍 · 拍卖锤: the auction line, nothing else */}
      {is("a.open") && (
        <div data-qa="live" data-qa-kind="chrome" style={{ position: "absolute", left: SAFE.l, top: STRIP, ...mono(), fontSize: T.body, letterSpacing: 3, color: INK, padding: "6px 18px", opacity: kIn, ...GLASS(PAL.up, "left") }}>
          <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 7, background: PAL.up, marginRight: 12, opacity: 0.55 + 0.45 * Math.sin(f / 4) }} />
          {C.live}
        </div>
      )}
      {is("a.open") && <Statement f={f} top={940} end={e0} scrim={0.5} lines={[{ text: C.auction[0], at: Lc("a1", "永不落槌"), size: 130, hl: C.auction[0] }, { text: C.auction[1], at: Lc("a1", "拍卖"), size: 90 }]} />}

      {/* a2 + a3 (first half) · 正面全景 · 价格阶梯: bids, then asks, then the ladder; the spread is framed on the ladder */}
      {is("a.walls") &&
        (() => {
          const bidW = Lc("a2", "买方"),
            askW = Lc("a2", "卖方"),
            board = Lc("a2", "一层层"),
            gap = Lc("a3", "缺口");
          const box = ladBox(f, 1, -1);
          return (
            <>
              {f < askW - LEAD && <DataChip x={SAFE.l} y={MAIN} label={C.bidCount} value={`${lotsOf("bid")}`} sub={`${lvl("bid").length} ${C.levels} · ${C.lots}`} color={PAL.up} k={fin(f, Math.max(bidW - LEAD, mv))} cue={bidW} group="count" />}
              {f >= askW - LEAD && f < board - LEAD && <DataChip x={SAFE.l} y={MAIN} label={C.askCount} value={`${lotsOf("ask")}`} sub={`${lvl("ask").length} ${C.levels} · ${C.lots}`} color={PAL.down} k={fin(f, askW - LEAD)} cue={askW} group="count" />}
              {f >= board - LEAD && <Ladder f={f} k={fin(f, board - LEAD)} cue={board} />}
              {(() => {
                const m = span(f, askW - LEAD, askW - LEAD + 10, cubicInOut);
                const p0 = P(-1.4, -2, 0.6),
                  p1 = P(-1.4, 3, 0.6);
                const ask = f >= askW - LEAD + 4;
                return <Tag f={f} {...cueAt(bidW)} b={gap - LEAD} at={{ x: p0.x + (p1.x - p0.x) * m, y: p0.y + (p1.y - p0.y) * m }} plate={{ x: SAFE.l, y: 820 }} side="r" color={ask ? PAL.down : PAL.up} title={ask ? `${C.ask} ↓` : `${C.bid} ↑`} qa="tag:walls" />;
              })()}
              <Focus f={f} a={gap - LEAD} b={e0 + FOCUS_EASE} box={box} layer={<Ladder f={f} />}>
                <Tag f={f} {...cueAt(gap)} b={e0} at={{ x: box.x0 - 4, y: (box.y0 + box.y1) / 2 }} plate={{ x: box.x0 - 50, y: 1000 }} side="l" color={PAL.gold} title={C.spread} notes={[[`0.50 · ${C.ticks}`, Lc("a3", "买卖价差") - LEAD]]} qa="tag:spread" />
              </Focus>
            </>
          );
        })()}

      {/* a4 · 左侧远景 · 文字版式: the myth, with the head count as its only data */}
      {is("a.myth") && <Statement f={f} top={520} end={e0} scrim={0.9} kicker={C.mythStamp} hot={PAL.amber} lines={[{ text: C.myth[0], at: Lc("a4", "买的人多"), size: 110 }, { text: C.myth[1], at: Lc("a4", "所以涨"), size: 130, hl: "所以涨" }]} />}
      {is("a.myth") && <VsBar x={150} y={960} w={720} l={[C.heads[0], 126]} r={[C.heads[1], 84]} k={fin(f, Lc("a4", "买的人多") - LEAD)} qa="vs:heads" cue={Lc("a4", "买的人多")} />}

      {/* a5 · 近景特写 · 成交凭证: the trade counter, then one slip with equal sides */}
      {is("a.trade") && <DataChip x={RIGHT.x} y={MAIN} label={C.tradesN} value={f >= FIRST_HIT ? "1" : "0"} color={f >= FIRST_HIT ? PAL.gold : SOFT} sub={f >= FIRST_HIT ? `${lots(1, 0)} ${C.lots}` : C.blocked} k={kIn} qa="num:trades" />}
      {is("a.trade") && <Receipt f={f} {...cueAt(Lc("a5", "买入量"))} lock={Lc("a5", "永远") - 2} y={LOW - 190} />}

      {/* a6 · 低机位侧面 · 成交带: the tape alone; the urgent side is framed on it */}
      {is("a.urgent") &&
        (() => {
          const w = Lc("a6", "哪一边");
          return (
            <>
              <Tape f={f} y={MAIN} k={kIn} />
              <Focus f={f} a={w - LEAD} b={e0 + FOCUS_EASE} box={tapeBox(MAIN, 4)} color={PAL.up} layer={<Tape f={f} y={MAIN} />}>
                <Tag f={f} {...cueAt(w)} b={e0} at={{ x: TAPE.x + TAPE.w - 4, y: MAIN + 160 }} plate={{ x: 400, y: 1060 }} side="r" color={PAL.up} title={C.urgent} notes={[[C.urgentNote, Lc("a6", "更急") - LEAD]]} qa="tag:urgent" />
              </Focus>
            </>
          );
        })()}

      {/* o2 · 俯拍买墙 · 价格阶梯: the category lit, the queue on the ladder, a market sell filled on contact */}
      {is("o.passive") && <CaseCard f={f} {...cueAt(Lc("o2", "被动订单"))} n={0} title={C.passive[0]} color={PAL.up} notes={[[C.passive[1], Lc("o2", "限价单") - LEAD], [C.passive[2], Lc("o2", "提供") - LEAD]]} />}
      {is("o.passive") &&
        (() => {
          const sweepAt = Lc("o2", "提供") - LEAD;
          const box = ladBox(f, -1, -3);
          const scan = span(f, sweepAt + 8, sweepAt + 32, (t) => t);
          const hit = sweepAt + 52;
          const chip = span(f, hit - 16, hit, (t) => t * t);
          const row = ladRowY(f, -1) + LAD.row / 2;
          const lit = [-1, -2, -3].filter((_, i) => scan > (i + 0.5) / 3).map((k) => ({ k, color: f >= hit && k === -1 ? "#ffffff" : BLUE }));
          const mark = f >= PASSIVE_AT - LEAD && f < sweepAt ? [{ k: -1, color: PAL.up }] : [];
          return (
            <>
              <Ladder f={f} k={kIn} mark={mark} />
              <Focus f={f} a={sweepAt} b={e0 + FOCUS_EASE} box={box} color={BLUE} layer={<Ladder f={f} mark={lit} />}>
                {scan > 0 && scan < 1 && <div style={{ position: "absolute", left: box.x0, width: box.x1 - box.x0, top: box.y0 + scan * (box.y1 - box.y0), height: 2, background: BLUE }} />}
                {chip > 0 && f < hit + 10 && (
                  <div data-qa="chip:mkt" data-qa-kind="data" data-qa-group="ladder" data-qa-into="ladder" style={{ position: "absolute", left: 320 + (box.x0 - 250 - 320) * chip, top: row - 30, opacity: 1 - span(f, hit + 2, hit + 10), ...sans(700), fontSize: T.body, color: INK, padding: "6px 14px", ...GLASS(PAL.down, "left") }}>
                    {C.mktSell} →
                  </div>
                )}
              </Focus>
            </>
          );
        })()}

      {/* o3 · 近景特写 · 卖一: the category lit, the ask rows framed while they are eaten */}
      {is("o.active") && <CaseCard f={f} {...cueAt(Lc("o3", "主动订单"))} n={1} title={C.active[0]} color={PAL.gold} notes={[[C.active[1], Lc("o3", "不等") - LEAD], [C.active[2], Lc("o3", "消耗") - LEAD]]} />}
      {is("o.active") &&
        (() => {
          const eatAt = Lc("o3", "直接吃掉") - LEAD;
          const mk = [{ k: 1, color: PAL.gold }];
          return (
            <>
              <Ladder f={f} k={kIn} mark={mk} />
              <Focus f={f} a={eatAt} b={e0 + FOCUS_EASE} box={ladBox(f, 2, 0)} layer={<Ladder f={f} mark={mk} />} />
            </>
          );
        })()}

      {/* o4 + o5 (first half) · 分屏版式 · 价格路径: the book above, the price path large below, one hop pill */}
      {is("o.hop") && <Spark f={f} x={SAFE.l} y={880} w={SAFE.r - SAFE.l} h={250} from={L("o3")} k={kIn} />}
      {is("o.hop") && <Result f={f} {...cueAt(JUMP)} b={JUMP2 - LEAD} x={760} y={560} text={`+1 ${C.jumps}`} qa="result:hop1" group="hop" />}
      {is("o.hop") && <Result f={f} {...cueAt(JUMP2)} x={760} y={560} text={`+2 ${C.jumps}`} qa="result:hop2" group="hop" />}

      {/* o6 + s1 · 背面反打 · 隐藏止损: the category lit, the hidden order as its evidence */}
      {is("s.hidden") && <CaseCard f={f} {...cueAt(Lc("o6", "止损订单"))} n={2} title={C.stop[0]} color={PAL.amber} notes={[[C.stop[1], Lc("s1", "不显示") - LEAD], [C.stop[2], Lc("s1", "地雷") - LEAD]]} />}
      {is("s.hidden") && <GhostOrder f={f} {...cueAt(Lc("s1", "不显示"))} x={LEFT.x + 174} y={MAIN + 70} flip={FRAMES} to={{ x: 0, y: 0 }} />}

      {/* s3 · 近景特写 · 触发价: the trigger line, the hidden order flips and flies at the asks */}
      {is("s.trigger") &&
        (() => {
          const tg = P(0.6, TRIGGER_K, 0.5);
          return (
            <>
              <KeyLine f={f} {...cueAt(Lc("s3", "触发价"))} b={e0} y={P(0, TRIGGER_K).y} x0={SAFE.l} x1={SAFE.r - 40} label={`${C.trigger} ${px(TRIGGER_K)}`} color={PAL.amber} />
              <GhostOrder f={f} a={mv} x={LEFT.x + 174} y={MAIN + 250} flip={CONVERT} to={tg} />
            </>
          );
        })()}

      {/* s4 · 拉远全景 · 连环触发: one counter, then the result */}
      {is("s.boom") &&
        (() => {
          const n = MINES.filter((m) => f >= m.at).length;
          return (
            <>
              <DataChip x={RIGHT.x} y={MAIN} label={C.chainCount} value={`${n} / ${MINES.length}`} sub={`+${lastK(f)} ${C.jumps}`} color={PAL.amber} k={fin(f, Lc("s4", "引爆") - LEAD)} qa="num:chain" cue={Lc("s4", "引爆")} />
              <Result f={f} {...cueAt(Lc("s4", "扫空"))} x={510} y={1000} text={C.swept} color={PAL.amber} />
            </>
          );
        })()}
    </>
  );
};

// ---------------------------------------------------------------- flat (2D-only) shots of the book chapters
/** depth chart: an order tries to cross the spread and is stopped at the gap; the trade counter stays at 0 */
const DepthChart: React.FC<{ f: number; a: number; e: number }> = ({ f, a, e }) => {
  const X0 = 100,
    X1 = 900,
    Y0 = 1150,
    Y1 = 560;
  const xk = (q: number) => X0 + ((q + 6.5) / 16.5) * (X1 - X0);
  let acc = 0;
  const bids = [-1, -2, -3, -4, -5, -6].map((q) => ((acc += sizeAt(f, "bid", q)), { q, v: acc }));
  acc = 0;
  const asks = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((q) => ((acc += sizeAt(f, "ask", q)), { q, v: acc }));
  const MAX = 380;
  const yv = (v: number) => Y0 - (v / MAX) * (Y0 - Y1);
  const g = span(f, a, a + 18, smooth);
  const step = (arr: { q: number; v: number }[], dir: number) => {
    const pts = [`${xk(arr[0].q - dir * 0.5)},${Y0}`];
    arr.forEach((p) => pts.push(`${xk(p.q - dir * 0.5)},${yv(p.v * g)}`, `${xk(p.q + dir * 0.5)},${yv(p.v * g)}`));
    pts.push(`${xk(arr[arr.length - 1].q + dir * 0.5)},${Y0}`);
    return pts.join(" ");
  };
  const gapBox: Box = { x0: xk(-0.5) - 70, y0: Y1 - 50, x1: xk(0.5) + 70, y1: Y0 + 10 };
  const tryAt = Lc("a3", "没人");
  // two attempts: a buy order runs at the gap and bounces off its edge
  const dots = [0, 26].map((o, i) => {
    const t = (f - tryAt - 4 - o) / 22;
    if (t < 0 || t > 1.4) return null;
    const reach = xk(-0.5) - 6;
    const x = t < 1 ? xk(-4) + (reach - xk(-4)) * t * t : reach - (t - 1) * 140;
    const y = 900 - i * 90;
    const hitK = 1 - clamp01(Math.abs(t - 1) * 5);
    return (
      <g key={i}>
        <circle cx={x} cy={y} r={13} fill={PAL.up} opacity={1 - clamp01((t - 1) * 3)} />
        <line x1={xk(-0.5)} x2={xk(-0.5)} y1={y - 46} y2={y + 46} stroke="#ffffff" strokeWidth={4} opacity={hitK} />
      </g>
    );
  });
  const chart = (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <rect x={xk(-0.5)} y={Y1 - 40} width={xk(0.5) - xk(-0.5)} height={Y0 - Y1 + 40} fill={`${PAL.gold}1c`} stroke={PAL.gold} strokeDasharray="8 8" strokeWidth={LINE} />
      <polygon points={step(bids, -1)} fill={`${PAL.up}44`} stroke={PAL.up} strokeWidth={LINE + 1} />
      <polygon points={step(asks, 1)} fill={`${PAL.down}44`} stroke={PAL.down} strokeWidth={LINE + 1} />
      <line x1={X0} x2={X1} y1={Y0} y2={Y0} stroke="rgba(255,255,255,0.4)" strokeWidth={LINE} />
      {dots}
    </svg>
  );
  return (
    <>
      <div data-qa="depth:title" style={{ position: "absolute", left: SAFE.l, top: STRIP, ...sans(700), fontSize: T.body, letterSpacing: 3, color: BLUE }}>{C.depth}</div>
      {chart}
      {[-4, 0, 4].map((q) => (
        <div key={q} data-qa={`axis:${q}`} style={{ position: "absolute", left: xk(q) - 80, width: 160, top: Y0 + 16, textAlign: "center", ...mono(), fontSize: T.body, color: SOFT }}>
          {px(q)}
        </div>
      ))}
      <div data-qa="depth:axis" style={{ position: "absolute", left: X0, top: Y0 + 80, ...sans(500), fontSize: T.body, color: DIM }}>
        ← {C.bid} · {C.ask} →
      </div>
      <DataChip x={SAFE.l} y={MAIN} label={C.tradesN} value="0" color={PAL.gold} k={fin(f, a + 4)} qa="num:trades0" />
      <Result f={f} {...cueAt(Lc("a3", "没有成交"))} x={200} y={506} text={C.bounced} color={RED} />
      <Focus f={f} a={tryAt - 6} b={e + 6 + FOCUS_EASE} box={gapBox} z={1.1} layer={chart} />
    </>
  );
};

const Three: React.FC<{ f: number; a: number }> = ({ f, a }) => (
  <>
    <div data-qa="three:title" data-qa-kind="type" data-qa-cue={Lc("o1", "三种")} style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: MAIN + 60, textAlign: "center", ...serif(), fontSize: 92, color: INK, opacity: fin(f, Lc("o1", "三种") - LEAD) }}>{C.threeHead}</div>
    <div style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: 600, display: "flex", gap: 26 }}>
      {[PAL.up, PAL.gold, PAL.amber].map((c, i) => {
        const k = ease(f, Lc("o1", "三种") - LEAD + 6 + i * 8, 12);
        return (
          <div key={i} data-qa={`three:${i}`} data-qa-kind="data" data-qa-group="three" style={{ flex: 1, height: 560, opacity: k, transform: `translateY(${(1 - k) * 30}px)`, ...GLASS(c), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
            <div style={{ ...mono(), fontSize: 110, color: c }}>0{i + 1}</div>
            <svg width={180} height={180} viewBox="-100 -100 200 200">
              {i === 0 && [0, 1, 2].map((r) => <rect key={r} x={-70} y={-60 + r * 44} width={140} height={32} rx={6} fill={`${c}${r === 2 ? "" : "55"}`} />)}
              {i === 1 && (
                <>
                  <rect x={-70} y={-40} width={140} height={32} rx={6} fill={`${PAL.down}55`} />
                  <line x1={0} y1={90} x2={0} y2={0} stroke={c} strokeWidth={8} strokeLinecap="round" />
                  <polygon points="-22,10 22,10 0,-24" fill={c} />
                </>
              )}
              {i === 2 && <polygon points="0,-70 60,0 0,70 -60,0" fill="none" stroke={c} strokeWidth={5} strokeDasharray="14 10" />}
            </svg>
          </div>
        );
      })}
    </div>
  </>
);

const Chain: React.FC<{ f: number; a: number; e: number }> = ({ f, a, e }) => {
  const xs = [210, 510, 810];
  const cols = [PAL.gold, PAL.down, PAL.up];
  const loops = Math.min(3, Math.max(0, Math.floor((f - a - 34) / 22) + 1));
  return (
    <>
      <Statement f={f} top={MAIN + 20} end={e + 6} scrim={0} rule lines={[{ text: C.minimal[0], at: Lc("o5", "价格移动"), size: 90 }, { text: C.minimal[1], at: Lc("o5", "最小"), size: 120, hl: C.minimal[1] }]} />
      {C.chain.map((s, i) => {
        const k = ease(f, a + 4 + i * 10, 12);
        return (
          <div key={s} data-qa={`chain:${s}`} data-qa-kind="data" data-qa-group="chain" style={{ position: "absolute", left: xs[i] - 135, top: 840, width: 270, boxSizing: "border-box", textAlign: "center", padding: "26px 0", opacity: k, transform: `translateY(${(1 - k) * 10}px)`, ...sans(700), fontSize: T.label, color: INK, ...GLASS(cols[i]) }}>
            {s}
          </div>
        );
      })}
      <Arrow f={f} a={a + 12} from={{ x: 348, y: 905 }} to={{ x: 372, y: 905 }} color={PAL.gold} />
      <Arrow f={f} a={a + 22} from={{ x: 648, y: 905 }} to={{ x: 672, y: 905 }} color={PAL.gold} />
      {f > a + 30 && (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fin(f, a + 30) }}>
          <path d="M810,990 C810,1130 210,1130 210,990" fill="none" stroke={BLUE} strokeWidth={LINE + 1} strokeDasharray="12 10" strokeDashoffset={-f * 2} />
          <polygon points="196,1008 224,1008 210,984" fill={BLUE} />
        </svg>
      )}
      {loops > 0 && <Result f={f} a={a + 34} x={510} y={1150} text={`${C.repeat} ×${loops}`} color={BLUE} qa="result:loops" kind="data" group="chain" />}
    </>
  );
};

const Arrow: React.FC<{ f: number; a: number; from: P; to: P; color: string }> = ({ f, a, from, to, color }) => {
  const k = ease(f, a, 10);
  if (k < 0.01) return null;
  const e = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const hd = 16;
  const p1 = { x: e.x - hd * Math.cos(ang - 0.5), y: e.y - hd * Math.sin(ang - 0.5) };
  const p2 = { x: e.x - hd * Math.cos(ang + 0.5), y: e.y - hd * Math.sin(ang + 0.5) };
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <line x1={from.x} y1={from.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={LINE + 1} strokeLinecap="round" />
      <polygon points={`${e.x},${e.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={color} />
    </svg>
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
const StopChart: React.FC<{ f: number; a: number; e: number }> = ({ f, a, e }) => {
  // the whole chart, the stops above the high included, fits between the strip and the captions
  const PX = 100;
  const x0 = SAFE.l,
    w = 700,
    yp = (p: number) => 1150 - (p + 1.2) * PX; // p in ticks above 5000.00
  const n = STOPCHART.length;
  const cw = w / n;
  const rev = span(f, a, a + 18, (t) => t) * n;
  const hiY = yp(3);
  const stopAt = Lc("s2", "止损买单");
  const nStops = Math.round(18 * span(f, stopAt - LEAD, stopAt + 6, (t) => t));
  const stops = (
    <>
      {[4, 5, 6, 7].map((q, j) => {
        const k = ease(f, stopAt - LEAD + j * 3, 8);
        return [...Array(6 - j)].map((_, i) => (
          <div key={`${q}-${i}`} style={{ position: "absolute", left: x0 + 470 + i * 38, top: yp(q) - 12, width: 24, height: 24, transform: `rotate(45deg) scale(${k * 0.8})`, background: `${PAL.amber}aa`, border: `${LINE}px solid ${PAL.amber}` }} />
        ));
      })}
    </>
  );
  return (
    <>
      <div data-qa="chart:title" style={{ position: "absolute", left: SAFE.l, top: STRIP, ...sans(700), fontSize: T.body, letterSpacing: 3, color: BLUE }}>{C.chart5m}</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[0, 3, 6].map((p) => (
          <line key={p} x1={x0} x2={x0 + w} y1={yp(p)} y2={yp(p)} stroke="rgba(206,214,230,0.12)" />
        ))}
        {STOPCHART.map((c, i) => {
          if (i > rev) return null;
          const up = c.c >= c.o;
          const col = up ? PAL.up : PAL.down;
          const cx = x0 + i * cw + cw / 2;
          return (
            <g key={i} opacity={clamp01(rev - i)}>
              <line x1={cx} x2={cx} y1={yp(c.hi)} y2={yp(c.lo)} stroke={col} strokeWidth={LINE + 1} />
              <rect x={cx - cw * 0.32} y={yp(Math.max(c.o, c.c))} width={cw * 0.64} height={Math.max(4, Math.abs(c.c - c.o) * PX)} fill={col} rx={3} />
            </g>
          );
        })}
      </svg>
      {[0, 6].map((p) => (
        <div key={p} data-qa={`axis:${p}`} style={{ position: "absolute", left: x0 + w + 8, top: yp(p) - 24, ...mono(), fontSize: T.body, color: DIM }}>
          {px(p)}
        </div>
      ))}
      <KeyLine f={f} {...cueAt(Lc("s2", "前高"))} y={hiY} x0={x0} x1={x0 + w} label={`${C.priorHigh} ${px(3)}`} color={INK} />
      {[12, 15, 17].map((i, j) => {
        const k = ease(f, Lc("s2", "做空") - LEAD + j * 5, 10);
        const cx = x0 + i * cw + cw / 2;
        return k > 0.01 ? (
          <div key={i} data-qa={`short:${i}`} data-qa-kind="mark" style={{ position: "absolute", left: cx - 26, top: yp(STOPCHART[i].hi) + 30 + (j % 2) * 0, width: 52, textAlign: "center", ...sans(700), fontSize: T.body, color: "#0b0d12", background: PAL.down, borderRadius: 8, opacity: k }}>
            {C.shortMark}
          </div>
        ) : null;
      })}
      {stops}
      <DataChip x={SAFE.l} y={MAIN} label={C.stopCount} value={`${nStops}`} color={PAL.amber} k={fin(f, stopAt - LEAD)} cue={stopAt} />
      <Focus f={f} a={Lc("s2", "上方") - LEAD} b={e + 6 + FOCUS_EASE} box={{ x0: x0 + 450, y0: yp(7) - 30, x1: x0 + 700, y1: yp(4) + 30 }} color={PAL.amber} layer={stops} />
    </>
  );
};

const FlatBookHud: React.FC<{ d: Dir }> = ({ d }) => {
  const f = d.f,
    a = d.shot.at,
    e = d.shot.end;
  const lay = d.lay;
  return (
    <>
      {lay === "a.depth" && <DepthChart f={f} a={a} e={e} />}
      {lay === "o.three" && <Three f={f} a={a} />}
      {lay === "o.chain" && <Chain f={f} a={a} e={e} />}
      {lay === "s.chart" && <StopChart f={f} a={a} e={e} />}
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
  const named = (w: Who, id: string) => f >= Lc(id, C.players[w][0]) - LEAD;
  const cur = ORDER.findIndex(([w, id], i) => named(w, id) && (i === 3 || !named(...ORDER[i + 1])));
  return (
    <div data-qa="track" data-qa-kind="chrome" style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: STRIP, display: "flex", gap: 10, opacity: k }}>
      {ORDER.map(([w, id], i) => {
        const on = i === cur;
        return (
          <div key={w} style={{ flex: 1, textAlign: "center", padding: "8px 0 10px", ...sans(700), fontSize: T.body, lineHeight: 1.2, color: on ? INK : named(w, id) ? SOFT : DIM, ...GLASS(on ? PAL.gold : undefined) }}>
            {named(w, id) ? C.players[w][0] : `0${i + 1}`}
          </div>
        );
      })}
    </div>
  );
};

const Gauge: React.FC<{ f: number; a: number; x: number; y: number; w: number }> = ({ f, a, x, y, w }) => {
  const v = Math.round(35 * span(f, a, a + 46, smooth));
  const W = w - 40;
  const mid = W / 2;
  const warn = v > 25;
  return (
    <Panel x={x} y={y} w={w} head={C.inventory[0]} color={warn ? PAL.amber : BLUE} qa="panel:inventory" k={fin(f, a)} cue={a + LEAD}>
      <div style={{ position: "relative", height: 70 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 44, height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 5 }} />
        <div style={{ position: "absolute", left: mid + (25 / 50) * mid, right: 0, top: 44, height: 10, background: `${PAL.amber}55`, borderRadius: 5 }} />
        <div style={{ position: "absolute", left: mid, width: (v / 50) * mid, top: 44, height: 10, background: warn ? PAL.amber : PAL.up, borderRadius: 5 }} />
        <div style={{ position: "absolute", left: mid - 1, top: 34, width: 2, height: 30, background: INK }} />
        <div style={{ position: "absolute", left: mid + (v / 50) * mid - 50, top: -4, width: 100, textAlign: "center", ...mono(), fontSize: T.body, color: INK }}>+{v}</div>
      </div>
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
    return <CaseCard f={f} {...cueAt(Lc(id, name))} n={0} tag={`PLAYER 0${ORDER.findIndex(([k]) => k === w) + 1}`} title={name} color={PAL.gold} notes={[[a, words[0] - LEAD], [b, words[1] - LEAD]]} />;
  };
  const split = Lc("p1", "而是");
  return (
    <>
      <Track f={f} k={["p.mm", "p.inst", "p.hedge", "p.short"].includes(lay) ? 1 : 0} />
      {lay === "p.who" &&
        (() => {
          // one big shadow ("a dealer?") cracks into four pieces; each flies to its player and becomes a role chip
          const u = span(f, split, split + 22, cubicInOut);
          const cx = 510,
            cy = 880;
          const quads: [Who, number, number][] = [
            ["mm", -1, -1],
            ["inst", 1, -1],
            ["hedge", -1, 1],
            ["short", 1, 1],
          ];
          const shape = "M-120,-190 a120,120 0 1,0 240,0 a120,120 0 1,0 -240,0 Z M-290,330 C-290,60 -150,-60 0,-60 C150,-60 290,60 290,330 Z";
          return (
            <>
              <div data-qa="who:title" data-qa-text="1" data-qa-kind="type" data-qa-cue={Lc("p1", "不是")} style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: MAIN, textAlign: "center", ...serif(), fontSize: 96, color: INK, opacity: fin(f, Lc("p1", "不是") - LEAD) * (1 - span(f, split - 8, split + 2)), textShadow: "0 4px 18px #000" }}>
                {C.who[0]}
              </div>
              <div data-qa="who:after" data-qa-text="1" data-qa-kind="type" data-qa-cue={Lc("p1", "目的")} style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: MAIN, textAlign: "center", ...serif(), fontSize: 90, color: PAL.gold, opacity: fin(f, Lc("p1", "目的") - LEAD), textShadow: "0 4px 18px #000" }}>
                {C.who[1]}
              </div>
              <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fin(f, s0 + 4) * (1 - span(f, split + 10, split + 26)) }}>
                <defs>
                  <linearGradient id="shadowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#20242e" />
                    <stop offset="1" stopColor="#05060a" />
                  </linearGradient>
                  {quads.map(([w, sx, sy]) => (
                    <clipPath key={w} id={`q-${w}`}>
                      <rect x={sx < 0 ? -400 : 0} y={sy < 0 ? -460 : -20} width={400} height={480} />
                    </clipPath>
                  ))}
                </defs>
                {quads.map(([w, sx, sy]) => {
                  const p = at(w, 2);
                  const dx = (p.x - cx) * u,
                    dy = (p.y - cy) * u;
                  return (
                    <g key={w} transform={`translate(${cx + dx + sx * 14 * u}, ${cy + dy + sy * 14 * u}) scale(${0.85 - 0.5 * u})`} clipPath={`url(#q-${w})`}>
                      <path d={shape} fill="url(#shadowFill)" stroke="#9aa6bf" strokeWidth={LINE + 1} />
                    </g>
                  );
                })}
              </svg>
              {quads.map(([w], i) => {
                const p = at(w, 2);
                const k = span(f, split + 14 + i * 4, split + 28 + i * 4, smooth);
                const up = p.y < 960 ? -1 : 1;
                const lx = clampN(p.x, 200, 820),
                  ly = clampN(p.y + up * 110, MAIN + 220, LOW - 60);
                return k > 0.01 ? (
                  <div key={w}>
                    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: k }}>
                      <line x1={p.x} y1={p.y} x2={lx} y2={ly} stroke={PAL.gold} strokeWidth={LINE} />
                      <circle cx={p.x} cy={p.y} r={8} fill="none" stroke={PAL.gold} strokeWidth={LINE} />
                    </svg>
                    <div data-qa={`role:${w}`} data-qa-kind="data" data-qa-group="roles" style={{ position: "absolute", left: lx, top: ly, transform: "translate(-50%, -50%)", opacity: k, ...sans(700), fontSize: T.label, color: INK, padding: "6px 22px 8px", whiteSpace: "nowrap", ...GLASS(PAL.gold, "left") }}>
                      {C.players[w][0]}
                    </div>
                  </div>
                ) : null;
              })}
            </>
          );
        })()}
      {lay === "p.mm" && head("mm", "p2")}
      {lay === "p.mm" && f < Lc("p2", "最怕") - 6 && (
        <div data-qa="quotes" data-qa-kind="data" data-qa-cue={Lc("p2", "两边")} style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: 840, display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", opacity: fin(f, Lc("p2", "两边") - LEAD) }}>
          {[
            [`${C.quote[0]} ${px(-1)}`, PAL.up],
            [`${C.quote[1]} ${px(1)}`, PAL.down],
          ].map(([s, c]) => (
            <span key={s} style={{ ...mono(), fontSize: 40, color: INK, padding: "8px 20px 10px", ...GLASS(c, "left") }}>
              {s}
            </span>
          ))}
          <span style={{ ...sans(700), fontSize: 40, color: "#0b0d12", background: PAL.gold, padding: "8px 22px 10px", borderRadius: 999, opacity: fin(f, Lc("p2", "赚价差") - LEAD) }}>
            {C.quote[2]} 0.50
          </span>
        </div>
      )}
      {lay === "p.mm" && f >= Lc("p2", "最怕") - 6 && <Gauge f={f} a={Lc("p2", "最怕") - 6} x={210} y={820} w={600} />}
      {lay === "p.inst" && head("inst", "p3")}
      {lay === "p.inst" && f < Lc("p3", "拆成") - LEAD && <DataChip x={SAFE.l} y={760} label={C.parent[0]} value={`2,000 ${C.lots}`} color={BLUE} k={fin(f, Lc("p3", "单子") - LEAD)} cue={Lc("p3", "单子")} qa="num:parent" />}
      {lay === "p.inst" &&
        f >= Lc("p3", "拆成") - LEAD &&
        (() => {
          const a = Lc("p3", "拆成") - LEAD;
          const done = Math.round(40 * span(f, a, d.shot.end + 20, (x) => x));
          return (
            <>
              <Panel x={210} y={720} w={600} head={`${C.parent[1]} 50 ${C.lots} × 40 · ${Math.round((done / 40) * 100)}%`} color={BLUE} k={fin(f, a)} qa="panel:child" cue={a + LEAD}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {[...Array(40)].map((_, i) => (
                    <div key={i} style={{ width: 47, height: 26, borderRadius: 5, background: i < done ? PAL.gold : "rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
              </Panel>
            </>
          );
        })()}
      {lay === "p.hedge" && head("hedge", "p4")}
      {lay === "p.hedge" &&
        (() => {
          // the shield takes small P&L hits that do not matter (each is struck out); what shrinks is the exposure
          const shield = at("hedge", 2.6);
          const a = Lc("p4", "不太") - LEAD;
          const shrink = span(f, Lc("p4", "对冲"), Lc("p4", "对冲") + 30, cubicInOut);
          return (
            <>
              {C.pnlChips.map((t, i) => {
                const t0 = a + i * 9;
                const u = span(f, t0, t0 + 10, (x) => x * x);
                if (u <= 0) return null;
                const x0 = SAFE.r - 150,
                  y0 = 450 + i * 92;
                const x = x0 + (shield.x + 120 - x0) * u;
                const cross = span(f, t0 + 11, t0 + 17, smooth);
                return (
                  <div key={t} data-qa={`pnl:${t}`} data-qa-kind="data" data-qa-group="hedge" style={{ position: "absolute", left: clampN(x, SAFE.l, SAFE.r - 150), top: y0, width: 140, textAlign: "center", ...mono(), fontSize: 40, color: t.startsWith("+") ? PAL.up : PAL.down, padding: "4px 0 6px", ...GLASS() }}>
                    {t}
                    <svg width={140} height={60} style={{ position: "absolute", left: 0, top: 0 }}>
                      <line x1={14} y1={10} x2={14 + 112 * cross} y2={10 + 40 * cross} stroke={RED} strokeWidth={LINE + 2} strokeLinecap="round" />
                      <line x1={126} y1={10} x2={126 - 112 * cross} y2={10 + 40 * cross} stroke={RED} strokeWidth={LINE + 2} strokeLinecap="round" />
                    </svg>
                  </div>
                );
              })}
              <Panel x={SAFE.l} y={MAIN + 20} w={360} head={C.exposure} color={PAL.gold} k={fin(f, Lc("p4", "对冲") - LEAD)} qa="panel:hedge" group="hedge" cue={Lc("p4", "对冲")}>
                <div style={{ ...mono(), fontSize: T.data, lineHeight: 1.15, color: INK }}>{shrink > 0.95 ? "≈ 0" : num(Math.round(1000 * (1 - shrink)))}</div>
                <div style={{ position: "relative", height: 12, marginTop: 8, background: "rgba(255,255,255,0.08)", borderRadius: 6 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${100 * (1 - 0.97 * shrink)}%`, background: PAL.gold, borderRadius: 6 }} />
                </div>
                <div style={{ ...sans(500), fontSize: T.body, color: SOFT, marginTop: 6 }}>{C.hedgeNote}</div>
              </Panel>
            </>
          );
        })()}
      {lay === "p.short" && head("short", "p5")}
      {lay === "p.short" &&
        (() => {
          const W = 560,
            H = 220;
          const n = 40;
          const k = span(f, d.shot.mv, Lc("p5", "止损"), (x) => x);
          const pts = [...Array(n)].map((_, i) => [i * (W / (n - 1)), H / 2 - Math.sin(i * 0.7) * 50 - Math.sin(i * 2.3) * 22] as const);
          const shown = pts.slice(0, Math.max(2, Math.round(n * k)));
          const entry = pts[22];
          const stopK = fin(f, Lc("p5", "止损") - LEAD);
          return (
            <>
              <Panel x={210} y={700} w={W + 40} head={C.shortChart} color={PAL.gold} pad="12px 20px 14px" qa="panel:short" k={fin(f, d.shot.mv)}>
                <svg width={W} height={H}>
                  <polyline points={shown.map((p) => p.join(",")).join(" ")} fill="none" stroke={PAL.gold} strokeWidth={LINE + 1} />
                  <g opacity={stopK}>
                    <circle cx={entry[0]} cy={entry[1]} r={9} fill={PAL.up} />
                    <line x1={entry[0]} x2={W} y1={entry[1] + 30} y2={entry[1] + 30} stroke={PAL.amber} strokeWidth={LINE} strokeDasharray="10 8" />
                  </g>
                </svg>
              </Panel>
            </>
          );
        })()}
      {lay === "p.manip" &&
        (() => {
          // proportion carries the point: a small red evidence card on the left, the everyday flow fills the rest
          const fl = { x0: 380, y0: 500, x1: SAFE.r, y1: 1200 };
          const streams = ORDER.map(([w], i) => ({ w, y: fl.y0 + 150 + i * 150, col: [PAL.gold, BLUE, "#b6c8ff", PAL.up][i] }));
          return (
            <>
              <div data-qa="manip:title" data-qa-text="1" data-qa-kind="type" data-qa-cue={Lc("p6", "操纵")} style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: MAIN, textAlign: "center", ...serif(), fontSize: 90, color: INK, opacity: fin(f, Lc("p6", "操纵") - LEAD) * (1 - 0.7 * span(f, Lc("p6", "违规") - LEAD - 10, Lc("p6", "违规") - LEAD)) }}>
                {C.manip[0]}
              </div>
              <div data-qa="manip:evidence" data-qa-kind="card" data-qa-cue={Lc("p6", "违规")} style={{ position: "absolute", left: SAFE.l, top: 740, width: 300, boxSizing: "border-box", padding: "14px 18px 16px", borderRadius: 12, whiteSpace: "nowrap", opacity: fin(f, Lc("p6", "违规") - LEAD), background: "rgba(40,10,14,0.9)", border: `${LINE}px solid ${RED}` }}>
                <div style={{ ...sans(700), fontSize: T.label, color: "#ff8a96" }}>{C.evidence[0]}</div>
                <div style={{ ...sans(500), fontSize: T.body, color: SOFT, marginTop: 4 }}>{C.evidence[1]}</div>
              </div>
              <div data-qa="manip:flow" data-qa-kind="data" style={{ position: "absolute", left: fl.x0, top: fl.y0, width: fl.x1 - fl.x0, height: fl.y1 - fl.y0, boxSizing: "border-box", opacity: fin(f, L("p6") + 8), ...GLASS(BLUE) }}>
                <div style={{ ...sans(700), fontSize: T.label, color: BLUE, padding: "12px 22px" }}>{C.flow}</div>
              </div>
              <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fin(f, L("p6") + 12) }}>
                {streams.map((s, i) =>
                  [...Array(12)].map((_, j) => {
                    const x = fl.x0 + 24 + ((j * 47 + (f - s0) * (3 + i)) % (fl.x1 - fl.x0 - 48));
                    return <circle key={`${i}-${j}`} cx={x} cy={s.y + 40 + Math.sin(j + f / 9) * 10} r={7} fill={s.col} opacity={0.85} />;
                  }),
                )}
              </svg>
              {streams.map((s) => (
                <div key={s.w} data-qa={`flow:${s.w}`} style={{ position: "absolute", left: fl.x0 + 24, top: s.y - 34, ...sans(500), fontSize: T.body, color: SOFT, opacity: fin(f, L("p6") + 16) }}>
                  {C.players[s.w][0]}
                </div>
              ))}
            </>
          );
        })()}
      {lay === "p.clash" && (
        <>
          <Statement f={f} top={MAIN} end={d.shot.end + 6} scrim={0} rule={false} lines={[{ text: C.crash[0], at: Lc("p6", "这些需求"), size: 112, hl: "碰撞" }]} />
          <Panel x={SAFE.l} y={LOW - 252} w={SAFE.r - SAFE.l} color={PAL.gold} k={fin(f, Lc("p6", "日常波动") - LEAD)} qa="panel:compare" cue={Lc("p6", "日常波动")}>
            {ORDER.map(([w]) => (
              <div key={w} style={{ display: "flex", ...sans(700), fontSize: 36, lineHeight: "52px", color: INK, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ flex: 1.2 }}>{C.players[w][0]}</div>
                <div style={{ flex: 1, color: PAL.gold }}>{C.aims[w]}</div>
                <div style={{ flex: 0.6, ...mono(), color: SOFT, textAlign: "right" }}>{C.pace[w]}</div>
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
const PathChart: React.FC<{ f: number; x: number; y: number; w: number; g: number; side: "a" | "b"; hot: number; verdict: number; k: number }> = ({ f, x, y, w, g, side, hot, verdict, k }) => {
  const H = 130,
    VH = 46;
  const p = PATHS[side],
    v = side === "a" ? PATHS.va : PATHS.vb;
  const n = Math.max(2, Math.round(PATHS.n * g));
  const xp = (i: number) => (i / (PATHS.n - 1)) * (w - 40);
  const yp = (q: number) => H - ((q + 1) / 14) * H;
  const col = side === "a" ? PAL.up : PAL.amber;
  return (
    <Panel x={x} y={y} w={w} color={col} k={k} pad="10px 18px 12px" qa={`panel:path${side}`} group="paths">
      {/* the running volume ticks up as the path grows */}
      <div style={{ display: "flex", justifyContent: "space-between", ...sans(700), fontSize: T.body, lineHeight: 1.3, color: col }}>
        <span>{side === "a" ? C.caseA[0] : C.caseB[0]}</span>
        <span style={{ ...mono(), color: INK }}>{num(v.slice(0, n).reduce((s, q) => s + q, 0) * 4)}</span>
      </div>
      <svg width={w - 38} height={H + VH + 8} style={{ opacity: 0.6 + 0.4 * hot }}>
        <line x1={0} x2={w} y1={yp(11.25)} y2={yp(11.25)} stroke={DIM} strokeDasharray="6 6" />
        <polyline points={p.slice(0, n).map((q, i) => `${xp(i)},${yp(q)}`).join(" ")} fill="none" stroke={col} strokeWidth={LINE + 1} />
        {v.slice(0, n).map((q, i) => (
          <rect key={i} x={xp(i) - 3} y={H + 8 + VH - (q / 42) * VH} width={Math.max(3, (w - 40) / PATHS.n - 2)} height={(q / 42) * VH} fill={`${col}aa`} />
        ))}
      </svg>
      {/* the verdict lands in the panel, in the column's colour */}
      <div style={{ ...sans(700), fontSize: T.label, lineHeight: 1.25, color: col, opacity: fin(f, verdict) }}>✓ {side === "a" ? C.caseA[2] : C.caseB[2]}</div>
    </Panel>
  );
};

const AnatomyHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  const lay = d.lay;
  if (!lay.startsWith("w.")) return null;
  const words = ["开", "高", "低", "收"].map((c) => Lc("w2", c));
  const OHLC: [number, string, number][] = [
    // y, price, anchor x (wick 0 for high / low, body edge for open / close)
    [HERO.o, "5000.00", 1.5],
    [HERO.hi, "5012.75", 0],
    [HERO.lo, "4999.50", 0],
    [HERO.c, "5011.25", 1.5],
  ];
  const g = span(f, shotOf("w.split").mv, Le("w4"), (x) => x);
  const sep = 510;
  const lab = (i: 0 | 1) => {
    const c = i === 0 ? C.caseA : C.caseB;
    const a = i === 0 ? Lc("w3", "可能是") : Lc("w4", "可能只是");
    const col = i === 0 ? PAL.up : PAL.amber;
    const other = Lc("w4", "可能只是") - LEAD;
    const k = fin(f, a - LEAD, 12) * (i === 0 ? 1 - 0.6 * span(f, other - 10, other) : 1);
    return k < 0.01 ? null : (
      <div key={i} data-qa={`case:${c[0]}`} data-qa-kind="card" data-qa-cue={a} style={{ position: "absolute", left: i === 0 ? SAFE.l : sep + 10, width: 440, boxSizing: "border-box", top: MAIN, textAlign: "center", opacity: k, padding: "8px 0 12px", ...GLASS(col) }}>
        <div style={{ ...mono(), fontSize: T.body, color: col, letterSpacing: 3 }}>{c[0]}</div>
        <div style={{ ...sans(700), fontSize: T.label, color: INK, lineHeight: 1.25 }}>{c[1]}</div>
      </div>
    );
  };
  const split = lay === "w.split";
  const sq = Lc("w2", "过程") - LEAD - 4;
  const ohlc = lay === "w.candle" && f < sq;
  const squeeze = lay === "w.candle" && f >= sq;
  const bSide = f >= L("w4") - 2;
  return (
    <>
      {ohlc &&
        (() => {
          // fixed four-row card on the right; every price runs level to one shared rail, along it, then level into its row.
          // Lines never cross; the row being read is lit, the others step back.
          const PXL = 610,
            PY = 520,
            RH = 70;
          const k0 = fin(f, words[0] - LEAD, 12);
          const anchors = OHLC.map(([y, , ax]) => pr(X.anatomy + ax, y, 1.6));
          const rail = Math.min(PXL - 30, Math.max(...anchors.map((p) => p.x)) + 40);
          // the row being read is lit; once all four are read they settle back to equal weight
          const cur = f > words[3] + 24 ? -1 : words.filter((w) => f >= w - LEAD).length - 1;
          return (
            <>
              <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
                {OHLC.map((_, i) => {
                  const p = anchors[i];
                  const ry = PY + 58 + i * RH + RH / 2;
                  const draw = span(f, words[i] - LEAD, words[i] - LEAD + 12, smooth);
                  if (draw <= 0) return null;
                  const pts = [`${p.x},${p.y}`, `${rail},${p.y}`, `${rail},${ry}`, `${PXL - 6},${ry}`];
                  const lit = cur < 0 || i === cur;
                  // draw the path out from the candle, segment by segment
                  const segs = pts.length - 1;
                  const upto = draw * segs;
                  const shown = pts.slice(0, Math.floor(upto) + 1);
                  if (upto < segs) {
                    const j = Math.floor(upto),
                      t = upto - j;
                    const [x0, y0] = pts[j].split(",").map(Number),
                      [x1, y1] = pts[j + 1].split(",").map(Number);
                    shown.push(`${x0 + (x1 - x0) * t},${y0 + (y1 - y0) * t}`);
                  }
                  return (
                    <g key={i} opacity={lit ? 1 : 0.35}>
                      <circle cx={p.x} cy={p.y} r={8} fill="none" stroke={PAL.gold} strokeWidth={LINE} />
                      <polyline points={shown.join(" ")} fill="none" stroke={PAL.gold} strokeWidth={lit ? LINE + 1 : LINE} strokeLinejoin="round" />
                    </g>
                  );
                })}
              </svg>
              <Panel x={PXL} y={PY} w={SAFE.r - PXL} head="OHLC" color={PAL.gold} k={k0} qa="panel:ohlc" kind="card" cue={words[0]}>
                {OHLC.map(([, val], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", whiteSpace: "nowrap", height: RH, borderTop: "1px solid rgba(255,255,255,0.08)", opacity: f < words[i] - LEAD ? 0.15 : cur < 0 || i === cur ? 1 : 0.45, background: i === cur ? "rgba(242,189,98,0.12)" : undefined, borderRadius: 6, padding: "0 6px" }}>
                    <span style={{ ...sans(700), fontSize: T.body, color: i === cur ? PAL.gold : SOFT }}>{C.ohlc[i]}</span>
                    <span style={{ ...mono(), fontSize: 40, color: INK }}>{val}</span>
                  </div>
                ))}
              </Panel>
            </>
          );
        })()}
      {squeeze && (
        <>
          <Statement f={f} top={MAIN} end={d.shot.end + 6} scrim={0} rule={false} lines={[{ text: C.squeeze, at: Lc("w2", "过程"), size: 92, hl: "压缩" }]} />
          <DataChip x={SAFE.r} align="right" y={760} label="1 BAR" value={`${num(Math.round(1286 * (1 - span(f, Lc("w2", "压缩"), Lc("w2", "压缩") + 20)) + 4 * span(f, Lc("w2", "压缩"), Lc("w2", "压缩") + 20)))}`} color={PAL.gold} sub={f >= Lc("w2", "压缩") + 20 ? C.squeezeN[1] : C.squeezeN[0]} k={fin(f, Lc("w2", "压缩") - LEAD)} size={T.dataL} qa="num:bar" cue={Lc("w2", "压缩")} />
        </>
      )}
      {split && (
        <>
          <div style={{ position: "absolute", left: sep - 1, top: MAIN - 10, height: LOW - 350 - MAIN, width: 2, background: `linear-gradient(180deg, ${BLUE}00, ${BLUE}, ${BLUE}00)` }} />
          {lab(0)}
          {lab(1)}
          <PathChart f={f} x={SAFE.l} y={LOW - 330} w={440} g={g} side="a" hot={bSide ? 0 : 1} verdict={Le("w3") - 16} k={fin(f, d.shot.mv)} />
          <PathChart f={f} x={sep + 10} y={LOW - 330} w={440} g={g} side="b" hot={bSide ? 1 : 0} verdict={Lc("w4", "打完") + 4} k={fin(f, d.shot.mv)} />
        </>
      )}
      {lay === "w.same" && (
        <>
          <Statement f={f} top={MAIN - 20} end={d.shot.end + 6} scrim={0} rule={false} lines={[{ text: C.same, at: Lc("w5", "结果"), size: 90 }, { text: C.diff, at: Lc("w5", "原因"), size: 110, hl: C.diff }]} />
          <Panel x={SAFE.l} y={LOW - 252} w={SAFE.r - SAFE.l} color={PAL.gold} k={fin(f, Lc("w5", "原因") - LEAD)} qa="panel:cmp" cue={Lc("w5", "原因")}>
            {[C.cmp[0], ...C.cmp.slice(2)].filter((_, i) => i < 3 || f >= Lc("w5", "后面")).map((r, i) => (
              <div key={i} style={{ display: "flex", ...sans(i ? 700 : 500), fontSize: i ? 36 : T.body, lineHeight: i ? "54px" : "44px", color: INK, borderTop: i ? "1px solid rgba(255,255,255,0.08)" : undefined, opacity: i < 3 || f >= Lc("w5", "后面") ? 1 : 0.15 }}>
                <div style={{ flex: 0.7, color: DIM }}>{r[0]}</div>
                <div style={{ flex: 1, color: PAL.up }}>{r[1]}</div>
                <div style={{ flex: 1, color: PAL.amber }}>{r[2]}</div>
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
const FP_ROWS = 8;
const FP = [...Array(FP_ROWS)].map((_, i) => {
  const r = (s: number) => Math.abs(Math.sin(i * 7.3 + s) * 0.5 + 0.5);
  return { k: lastK(FRAMES - 1) + 4 - i, b: Math.round(12 + r(1) * 58), s: Math.round(10 + r(5) * 50) };
});
const Footprint: React.FC<{ f: number; a: number; y: number }> = ({ f, a, y }) => {
  const rh = 58;
  const poc = FP.reduce((m, r, i) => (r.b + r.s > FP[m].b + FP[m].s ? i : m), 0);
  return (
    <Panel x={SAFE.l + 60} y={y} w={780} color={BLUE} qa="panel:footprint" pad="12px 20px 14px" k={fin(f, a)}>
      <div style={{ display: "flex", justifyContent: "space-between", ...sans(700), fontSize: T.body, lineHeight: 1.3, color: BLUE, marginBottom: 6 }}>
        <span>{C.footprint}</span>
        {f >= Le("r3") + 40 && <span style={{ color: PAL.gold, opacity: ease(f, Le("r3") + 40) }}>{C.poc}</span>}
      </div>
      {FP.map((r, i) => {
        const g = span(f, a + 4 + i * 2, a + 22 + i * 2, smooth);
        const b = Math.round(r.b * g),
          s = Math.round(r.s * g);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", height: rh, ...mono(), fontSize: T.body, borderTop: "1px solid rgba(255,255,255,0.06)", outline: i === poc && g > 0.9 ? `${LINE}px solid ${PAL.gold}` : undefined, outlineOffset: -2, borderRadius: 6 }}>
            <div style={{ width: 170, color: SOFT }}>{px(r.k)}</div>
            <div style={{ flex: 1, position: "relative", height: rh - 16 }}>
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${(b / 70) * 100}%`, background: `${PAL.up}77`, borderRadius: 4 }} />
              <div style={{ position: "absolute", right: 12, lineHeight: `${rh - 16}px`, color: INK }}>{b}</div>
            </div>
            <div style={{ width: 40, textAlign: "center", color: DIM }}>×</div>
            <div style={{ flex: 1, position: "relative", height: rh - 16 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(s / 70) * 100}%`, background: `${PAL.down}77`, borderRadius: 4 }} />
              <div style={{ position: "absolute", left: 12, lineHeight: `${rh - 16}px`, color: INK }}>{s}</div>
            </div>
          </div>
        );
      })}
    </Panel>
  );
};

const RecapHud: React.FC<{ d: Dir; pr: Proj }> = ({ d, pr }) => {
  const f = d.f;
  const lay = d.lay;
  const a = d.shot.at;
  if (!lay.startsWith("r.")) return null;
  const q1 = L("r1") - 20; // the card steps back before the question comes in
  return (
    <>
      {lay === "r.cards" && (
        <>
          {/* one card, three rows landing in turn; it steps back when the question comes in */}
          <div data-qa="recap" data-qa-kind="card" style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, boxSizing: "border-box", top: 430, padding: "18px 36px 22px", opacity: fin(f, d.shot.mv - 8) * (1 - 0.92 * span(f, q1, q1 + 10)), ...GLASS(PAL.gold) }}>
            <div style={{ ...mono(), fontSize: T.body, letterSpacing: 6, color: PAL.gold, marginBottom: 6 }}>{C.recapHead}</div>
            {C.recap.map(([n, t1, t2], i) => {
              const col = [PAL.up, PAL.gold, PAL.amber][i];
              const k = ease(f, RECAP_CARDS[i], 10);
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 26, padding: "14px 0", borderTop: "1px solid rgba(255,255,255,0.1)", opacity: k, transform: `translateY(${(1 - k) * 10}px)` }}>
                  <div style={{ ...mono(), fontSize: 80, width: 70, color: col }}>{n}</div>
                  <div style={{ ...serif(), fontSize: 60, lineHeight: 1.25, color: INK }}>
                    {t1}
                    <span style={{ color: col }}>{t2}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <Statement f={f} top={600} end={shotOf("r.cards").end + 6} lines={[{ text: C.q1[0], at: L("r1"), size: 92 }, { text: C.q1[1], at: Lc("r1", "它涨"), size: 130, hl: "涨没涨" }]} />
      <Statement f={f} top={600} end={shotOf("r.who").end + 6} kicker="WHO · WHY" lines={[{ text: C.q2[0], at: Lc("r1", "是谁"), size: 130, hl: "是谁" }, { text: C.q2[1], at: Lc("r1", "为什么"), size: 130, hl: "为什么" }]} />
      {(lay === "r.caveat" || lay === "r.next") &&
        (() => {
          // the caveats hold over the pool; at r.next one wipe (top to bottom) turns the pool into the footprint.
          // The pool keeps rendering under a dark plate, so the picture never drops to black or flat grey.
          const w0 = lay === "r.next" ? a : FRAMES;
          const wipe = span(f, w0, w0 + 16, cubicInOut);
          const edge = 120 + wipe * 1640;
          const pullAt = Lc("r2", "挂单");
          const probAt = Lc("r2", "订单流");
          const fill = 0.7 * span(f, probAt - LEAD + 4, probAt + 30, cubicInOut);
          const pulled = pr(X.book, ky(beadK(f)) + 1.5, -1.4);
          return (
            <>
              <div data-qa-clip={`${edge},1920`} style={{ position: "absolute", inset: 0, clipPath: `inset(${wipe > 0 ? edge : 0}px 0 0 0)` }}>
                {/* the resting orders above the price are pulled out of the book (Scene) and the tag names it */}
                <Tag f={f} {...cueAt(pullAt)} b={FRAMES} at={pulled} plate={{ x: pulled.x + 140, y: MAIN + 80 }} side="r" color={BLUE} title={C.pull[0]} notes={[[C.pull[1], Lc("r2", "可以撤") - LEAD]]} />
                {/* only raises the odds: a gauge that stops at 70%, with the rest left open */}
                <Panel x={SAFE.l} y={LOW - 200} w={SAFE.r - SAFE.l} color={PAL.gold} k={fin(f, probAt - LEAD) * (1 - span(f, shotOf("r.next").at - 8, shotOf("r.next").at))} qa="panel:prob" cue={probAt}>
                  <div style={{ display: "flex", justifyContent: "space-between", ...sans(700), fontSize: T.label, color: INK }}>
                    <span>{C.prob[0]}</span>
                    <span style={{ ...mono(), color: PAL.gold }}>{Math.round(fill * 100)}%</span>
                  </div>
                  <div style={{ position: "relative", height: 26, marginTop: 10, borderRadius: 8, background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.1) 0 8px, rgba(255,255,255,0.03) 8px 16px)" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, borderRadius: 8, background: PAL.gold }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", ...sans(500), fontSize: T.body, color: SOFT, marginTop: 6 }}>
                    <span>{C.prob[1]}</span>
                    <span style={{ color: DIM, opacity: span(f, probAt + 30, probAt + 42) }}>{C.prob[2]}</span>
                  </div>
                </Panel>
              </div>
              {wipe > 0 && (
                <div data-qa-clip={`0,${edge}`} style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 ${1920 - edge}px 0)` }}>
                  <div style={{ position: "absolute", inset: 0, background: "rgba(8,9,12,0.7)" }} />
                  <Statement f={f} top={MAIN - 40} end={FRAMES + 10} kicker={C.title} scrim={0} rule={false} lines={[{ text: C.next[0], at: L("r3"), size: 90 }, { text: C.next[1], at: Lc("r3", "走进"), size: 120, hl: "足迹图" }]} />
                  <Footprint f={f} a={d.shot.mv} y={672} />
                </div>
              )}
              {wipe > 0 && wipe < 1 && <div style={{ position: "absolute", left: 0, right: 0, top: edge - 1, height: 2, background: BLUE, boxShadow: `0 0 16px ${BLUE}` }} />}
              <div data-qa="disclaimer" data-qa-kind="chrome" style={{ position: "absolute", left: SAFE.l, width: SAFE.r - SAFE.l, top: 1250, textAlign: "center", opacity: span(f, Le("r3") + 6, Le("r3") + 20) }}>
                <span style={{ ...sans(500), fontSize: T.body, color: SOFT, padding: "6px 22px", background: "rgba(8,9,12,0.8)", borderRadius: 10 }}>{C.disclaimer}</span>
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
      {flat && <Grid />}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,9,12,0.72) 0%, rgba(8,9,12,0) 15%, rgba(8,9,12,0) 66%, rgba(8,9,12,0.82) 82%, rgba(8,9,12,0.9) 100%)" }} />
      <Progress f={f} />
      {d.world === "hook" && <HookHud d={d} pr={pr} />}
      {d.world === "book" && <BookHud d={d} pr={pr} />}
      {flat && <FlatBookHud d={d} />}
      <TableHud d={d} pr={pr} />
      {d.world === "anatomy" && <AnatomyHud d={d} pr={pr} />}
      <RecapHud d={d} pr={pr} />
      <div style={{ position: "absolute", inset: 0, background: d.flashColor, opacity: d.flash * 0.16, mixBlendMode: "screen" }} />
      <Captions f={f} />
    </div>
  );
};
