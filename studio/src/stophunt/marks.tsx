// Annotation layer added in v4: more information on screen, all of it keyed to the voice.
//  • Emphasis stickers on contrast / degree words (不是…是…, 但, 更, 最, 不代表…): they pop on the word.
//  • Pins: small tags on 3D points (prices, numbered checks, counts); several may stand together.
//  • A price ruler on the right edge of whichever chart is on screen.
//  • Order-book quantities on the ladder.
import React from "react";
import { E, Le, Lw, backOut, out3, ramp, win } from "./cue";
import {
  A_HIGH, A_LOW, BAD_STOP, B_HIGH, HUNT, LADDER_X, ROUND, SA, SB, SC, SERIES_A, SERIES_REAL, SERIES_TEST, SPIKE, SPIKE_I, STACK_B, STACK_HI, STACK_LO,
  TEST_WICK, TOUCH, YOU_BRICK, avgVol, px, py, type Stage,
} from "./data";
import { stage, type Proj } from "./director";
import { num, sans } from "./fonts";
import { T } from "./text";
import { COL, LADDER_ROWS, VB_TRAY, barsB, ladderRow } from "./world";

const INK = "#f3ead9";
const PLATE = "rgba(5,8,14,0.86)";
type Pt = { x: number; y: number };
const clampX = (x: number, w: number) => Math.min(1380 - w, Math.max(60, x));
const clampY = (y: number) => Math.min(1600, Math.max(300, y));
const tw = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? 0.56 : 1) * size, 0);

// ================================================================= pins
/** a small tag on a 3D point: dot, short leader, plate offset by (dx, dy) */
export const Pin: React.FC<{ a: number; at: Pt; dx: number; dy: number; text: string; sub?: string; color: string; size?: number; n?: string }> = ({ a, at, dx, dy, text, sub, color, size = 36, n }) => {
  if (a <= 0.002) return null;
  const subS = Math.round(size * 0.8);
  const w = Math.max(tw(text, size) + (n ? size * 1.1 : 0), sub ? tw(sub, subS) : 0) + 34;
  const h = size * 1.3 + (sub ? subS * 1.3 : 0) + 14;
  const x = clampX(at.x + dx - (dx < 0 ? w : 0), w);
  const y = clampY(at.y + dy - (dy < 0 ? h : 0));
  const ex = Math.min(x + w, Math.max(x, at.x));
  const ey = at.y < y ? y : at.y > y + h ? y + h : y + h / 2;
  const k = out3(a);
  return (
    <>
      <svg width={1440} height={2560} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <circle cx={at.x} cy={at.y} r={6} fill={color} opacity={a} />
        <line x1={at.x} y1={at.y} x2={at.x + (ex - at.x) * k} y2={at.y + (ey - at.y) * k} stroke={color} strokeWidth={2.5} opacity={0.75 * a} />
      </svg>
      <div style={{ position: "absolute", left: x, top: y, width: w, boxSizing: "border-box", opacity: a, transform: `scale(${0.9 + 0.1 * backOut(a)})`, transformOrigin: "left center", padding: "5px 16px 7px", background: PLATE, border: `2px solid ${color}`, borderRadius: 10, whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {n && <span style={{ ...num(700), fontSize: size * 0.8, color: "#06080d", background: color, borderRadius: 999, width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>}
          <span style={{ ...sans(900), fontSize: size, lineHeight: 1.3, color: INK }}>{text}</span>
        </div>
        {sub && <div style={{ ...num(700), fontSize: subS, lineHeight: 1.3, color }}>{sub}</div>}
      </div>
    </>
  );
};

/** price ruler pinned to the right edge, ticks projected from the chart on screen */
const Ruler: React.FC<{ a: number; pr: Proj; st: Stage; i: number; prices: number[]; hot?: number[] }> = ({ a, pr, st, i, prices, hot = [] }) =>
  a <= 0.002 ? null : (
    <>
      {prices.map((p) => {
        const q = pr(px(i, st), py(p, st), -0.8);
        if (q.y < 300 || q.y > 1600) return null;
        const h = hot.includes(p);
        return (
          <div key={p} style={{ position: "absolute", right: 34, top: q.y - 18, opacity: a * (h ? 1 : 0.62), display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 2, background: h ? COL.gold : "rgba(243,234,217,0.5)" }} />
            <div style={{ ...num(h ? 700 : 500), fontSize: 30, color: h ? COL.gold : INK }}>{p.toFixed(2)}</div>
          </div>
        );
      })}
    </>
  );

// ================================================================= emphasis stickers
type Kind = "no" | "yes" | "hot";
type Emp = { line: string; word: string; text: string; kind: Kind; slot: "tl" | "tr" | "tc" | "bl" | "br" | "bc" };
const EMPH: Emp[] = [
  { line: "L01", word: "不是被扫", text: "不是被扫", kind: "no", slot: "bl" },
  { line: "L01", word: "是自己", text: "是放得太显眼", kind: "yes", slot: "br" },
  { line: "L02", word: "不是看见了你", text: "不是盯上你", kind: "no", slot: "bl" },
  { line: "L02", word: "是看见了那里", text: "是盯上流动性", kind: "yes", slot: "br" },
  { line: "L05", word: "但会", text: "但：关键位越堆越多", kind: "hot", slot: "tr" },
  { line: "L06", word: "本来就", text: "本来就堆着止损", kind: "hot", slot: "tc" },
  { line: "L08", word: "最直观", text: "最直观", kind: "hot", slot: "tl" },
  { line: "L08", word: "最容易", text: "最容易扎堆", kind: "hot", slot: "tr" },
  { line: "L11", word: "更像", text: "更像流动性测试", kind: "hot", slot: "tr" },
  { line: "L11", word: "不代表", text: "不代表真突破", kind: "no", slot: "tr" },
  { line: "L12", word: "最显眼", text: "最显眼 = 最拥挤", kind: "hot", slot: "tr" },
  { line: "L13", word: "不是你", text: "不是追你", kind: "no", slot: "bl" },
  { line: "L13", word: "是流动性", text: "是追流动性", kind: "yes", slot: "br" },
  { line: "L13", word: "不是跟它斗", text: "不跟它斗", kind: "no", slot: "bl" },
  { line: "L13", word: "最容易被拿", text: "避开最容易被拿的位置", kind: "hot", slot: "br" },
  { line: "L14", word: "最冤", text: "最冤的一次", kind: "hot", slot: "tc" },
];
const SLOT_Y = { t: 312, b: 1540 };
const Sticker: React.FC<{ f: number; e: Emp; from: number; to: number }> = ({ f, e, from, to }) => {
  const a = win(f, from, to, 6, 8);
  if (a <= 0.002) return null;
  const k = backOut((f - from) / 10);
  const strike = out3((f - from - 4) / 10);
  const size = e.kind === "hot" ? 58 : 54;
  const bg = e.kind === "yes" ? COL.gold : e.kind === "hot" ? COL.up : PLATE;
  const fg = e.kind === "yes" ? "#06080d" : INK;
  const side = e.slot[1];
  const pos: React.CSSProperties = side === "l" ? { left: 60 } : side === "r" ? { right: 60 } : { left: 0, right: 0, display: "flex", justifyContent: "center" };
  return (
    <div style={{ position: "absolute", top: e.slot[0] === "t" ? SLOT_Y.t : SLOT_Y.b, ...pos, opacity: a }}>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 12, padding: "6px 26px 10px", background: bg, border: e.kind === "no" ? `3px solid ${COL.up}` : "none", borderRadius: 14, transform: `scale(${0.7 + 0.3 * k}) rotate(${e.kind === "hot" ? -2 : 0}deg)`, transformOrigin: side === "r" ? "right center" : side === "l" ? "left center" : "center", boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
        <span style={{ ...sans(900), fontSize: size * 0.8, color: e.kind === "no" ? COL.up : fg }}>{e.kind === "no" ? "✗" : e.kind === "yes" ? "✓" : "!"}</span>
        <span style={{ ...sans(900), fontSize: size, lineHeight: 1.2, color: fg, whiteSpace: "nowrap" }}>{e.text}</span>
        {e.kind === "no" && <div style={{ position: "absolute", left: 70, top: "52%", height: 5, width: `calc((100% - 96px) * ${strike})`, background: COL.up, borderRadius: 3 }} />}
      </div>
    </div>
  );
};
export const Stickers: React.FC<{ f: number }> = ({ f }) => (
  <>
    {EMPH.map((e, i) => {
      const from = Lw(e.line, e.word);
      // stays until the next sticker in the same slot, or a second after its line ends
      const next = EMPH.slice(i + 1).find((x) => x.slot === e.slot);
      const to = Math.min(next ? Lw(next.line, next.word) : 1e9, Le(e.line, 30), from + 75);
      return <Sticker key={i} f={f} e={e} from={from} to={to} />;
    })}
  </>
);

// ================================================================= chart pins per section
export const ChartMarks: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const st = stage(f);
  const S = T.marks;
  const pollIn = E("pollIn");
  const checkIn = E("checkIn");
  const testIn = E("testIn");
  const stopIn = E("stopIn");
  const inA = f >= E("mechIn") && f < checkIn + 6;
  const hiStack = STACK_HI.find((b) => b.layer === 2 && b.k === 3) ?? STACK_HI[STACK_HI.length - 1];
  const loStack = STACK_LO.find((b) => b.layer === 2 && b.k === 3) ?? STACK_LO[STACK_LO.length - 1];
  const hx = px(HUNT);
  const Bb = barsB(f);
  const avg = avgVol(SERIES_REAL, TOUCH);
  const lvl = (p: number, s: Stage, i: number) => pr(px(i, s), py(p, s), 0.36);
  return (
    <>
      {/* opening: the price your stop sits at */}
      <Pin a={win(f, E("sweepYou"), E("reveal") + 10, 8, 8)} at={pr(YOU_BRICK.x + YOU_BRICK.w / 2, YOU_BRICK.y, YOU_BRICK.z)} dx={60} dy={-150} text={S.youAt} sub="99.68" color={INK} />
      {/* ---------- chart A: levels with prices, stack counts, the sweep's numbers ---------- */}
      <Ruler a={(inA ? 1 : 0) * st.A * win(f, E("mechIn") + 10, checkIn, 12, 10)} pr={pr} st={SA} i={44} prices={[96, 96.48, 97, 98, 99, 99.62, 100]} hot={[96.48, 99.62]} />
      <Pin a={st.A * win(f, E("hiLevel") + 6, E("loLevel"), 8, 8)} at={lvl(A_HIGH, SA, 30)} dx={-20} dy={60} text={T.lvHigh} sub={A_HIGH.toFixed(2)} color={COL.gold} />
      <Pin a={st.A * win(f, E("loLevel") + 6, E("hidden"), 8, 8)} at={lvl(A_LOW, SA, 24)} dx={-20} dy={70} text={T.lvLow} sub={A_LOW.toFixed(2)} color={COL.gold} />
      <Pin a={st.A * win(f, E("pile") + 14, E("hunt"), 8, 8)} at={pr(hiStack.x, hiStack.y + 0.1, hiStack.z)} dx={50} dy={-90} text={S.stackHi} color={COL.up} />
      <Pin a={st.A * win(f, E("pile") + 22, E("hunt"), 8, 8)} at={pr(loStack.x, loStack.y - 0.1, loStack.z)} dx={50} dy={70} text={S.stackLo} color={COL.down} />
      <Pin a={st.A * win(f, E("fire") + 30, E("volume"), 8, 8)} at={pr(hx, py(SERIES_A[HUNT].h), 0)} dx={50} dy={-40} text={S.high} sub={SERIES_A[HUNT].h.toFixed(2)} color={COL.up} />
      <Pin a={st.A * win(f, E("wickTag") + 10, pollIn, 8, 8)} at={pr(hx, py(SERIES_A[HUNT].h), 0)} dx={-60} dy={-30} text={S.reach} sub={SERIES_A[HUNT].h.toFixed(2)} color={COL.up} />
      <Pin a={st.A * win(f, E("look") + 6, pollIn, 8, 8)} at={pr(hx, py(SERIES_A[HUNT].c), 0)} dx={60} dy={60} text={S.closeBack} sub={SERIES_A[HUNT].c.toFixed(2)} color={COL.down} />
      <Pin a={st.A * win(f, E("gather") + 10, checkIn, 8, 8)} at={pr(px(38), py(ROUND) + 0.5, -0.8)} dx={60} dy={-80} text={S.stackRd} color={COL.up} />
      {/* ---------- chart B: the three checks, then the same spot as a liquidity test ---------- */}
      <Ruler a={st.B * win(f, E("c1"), stopIn, 12, 10)} pr={pr} st={SB} i={36} prices={[98.5, 99, 99.5, B_HIGH, 100, 100.5]} hot={[B_HIGH]} />
      <Pin a={st.B * win(f, checkIn + 20, stopIn, 8, 8)} at={lvl(B_HIGH, SB, 16)} dx={-20} dy={50} text={T.lvHigh} sub={B_HIGH.toFixed(2)} color={COL.gold} />
      {/* real breakout */}
      <Pin a={st.B * win(f, E("c1") + 12, testIn, 8, 8)} at={pr(px(TOUCH, SB), py(SERIES_REAL[TOUCH].l, SB), 0)} dx={-60} dy={70} n="1" text={S.touch} color={COL.gold} />
      <Pin a={st.B * win(f, E("c1vol") + 4, testIn, 8, 8)} at={pr(px(TOUCH, SB), VB_TRAY + SERIES_REAL[TOUCH].v * 0.36, 0)} dx={50} dy={-60} text={`${(SERIES_REAL[TOUCH].v / avg).toFixed(1)}× ${T.avg}`} sub={`${SERIES_REAL[TOUCH].v.toFixed(1)} vs ${avg.toFixed(1)}`} color={COL.up} />
      <Pin a={st.B * win(f, E("c1vol") + 10, testIn, 8, 8)} at={pr(px(17, SB), VB_TRAY + avg * 0.36, 0.2)} dx={-10} dy={-70} text={T.avg} sub={avg.toFixed(1)} color={INK} size={30} />
      <Pin a={st.B * win(f, E("c2hold") + 2, testIn, 8, 8)} at={pr(px(TOUCH + 1, SB), py(SERIES_REAL[TOUCH + 1].h, SB), 0)} dx={30} dy={-150} n="2" text={S.hold} sub={SERIES_REAL[TOUCH + 1].c.toFixed(2)} color={COL.gold} />
      <Pin a={st.B * win(f, E("c3catch") + 2, testIn, 8, 8)} at={pr(px(TOUCH + 3, SB), py(SERIES_REAL[TOUCH + 3].l, SB), 0)} dx={50} dy={80} n="3" text={S.retest} sub={SERIES_REAL[TOUCH + 3].l.toFixed(2)} color={COL.gold} />
      <Pin a={st.B * win(f, E("c3catch") + 18, testIn, 8, 8)} at={pr(px(TOUCH + 5, SB), py(SERIES_REAL[TOUCH + 5].h, SB), 0)} dx={-40} dy={-90} text={S.goOn} sub={SERIES_REAL[TOUCH + 5].c.toFixed(2)} color={COL.up} />
      {/* liquidity test */}
      <Pin a={st.B * win(f, E("pierce") + 8, stopIn, 8, 8)} at={pr(px(TOUCH, SB), py(TEST_WICK, SB), 0)} dx={-40} dy={-110} text={S.pierceTo} sub={TEST_WICK.toFixed(2)} color={COL.up} />
      <Pin a={st.B * win(f, E("back") + 2, stopIn, 8, 8)} at={pr(px(TOUCH, SB), py(SERIES_TEST[TOUCH].c, SB), 0)} dx={60} dy={40} text={S.backTo} sub={SERIES_TEST[TOUCH].c.toFixed(2)} color={COL.down} />
      <Pin a={st.B * win(f, E("back") + 10, stopIn, 8, 8)} at={pr(px(TOUCH, SB), VB_TRAY + (Bb[TOUCH]?.v ?? 1) * 0.36, 0)} dx={50} dy={-50} text={S.noVol} sub={`${SERIES_TEST[TOUCH].v.toFixed(2)} ≈ ${avg.toFixed(1)}`} color={COL.down} />
      <Pin a={st.B * win(f, E("noFollow") + 8, stopIn, 8, 8)} at={pr(px(TOUCH + 2, SB), py(SERIES_TEST[TOUCH + 2].l, SB), 0)} dx={40} dy={70} text={S.noOne} color={COL.down} />
      {/* ---------- stop placement: the numbers on both stages ---------- */}
      <Pin a={st.B * win(f, E("badStop") + 10, E("goodIn"), 8, 8)} at={pr(px(25, SB), py(BAD_STOP, SB), 0.36)} dx={-30} dy={-110} text={S.badAt} sub={BAD_STOP.toFixed(2)} color={INK} />
      <Pin a={st.B * win(f, E("badHit") - 2, E("goodIn"), 6, 8)} at={pr(px(SPIKE_I, SB), py(SPIKE.h, SB), 0)} dx={-40} dy={-100} text={S.probe} sub={SPIKE.h.toFixed(2)} color={COL.up} />
      <Pin a={st.C * win(f, E("goodHold") + 16, E("coreIn"), 8, 8)} at={pr(px(SPIKE_I, SC), py(SPIKE.h, SC), 0)} dx={-40} dy={60} text={S.probe} sub={SPIKE.h.toFixed(2)} color={COL.up} />
      <Pin a={st.C * win(f, E("buffer") + 18, E("coreIn"), 8, 8)} at={pr(px(25, SC), py(STACK_B[0].price, SC) + 0.1, -0.78)} dx={-20} dy={-150} text={S.crowd} color={COL.up} />
    </>
  );
};

/** order-book ladder: price on the left of each row, resting size at the end of each bar */
export const LadderMarks: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const st = stage(f);
  if (st.ladder <= 0.002) return null;
  return (
    <>
      {LADDER_ROWS.map((_, r) => {
        const row = ladderRow(f, r);
        const a = st.ladder * row.rowIn;
        const left = pr(LADDER_X - 0.1, row.y, -0.3);
        const end = pr(LADDER_X + 0.2 + row.len, row.y, 0.05);
        const qty = Math.round(row.len * 60);
        const price = (100.0 + (r - 4) * 0.1).toFixed(2);
        return (
          <React.Fragment key={r}>
            <div style={{ position: "absolute", left: Math.max(60, left.x - 160), top: left.y - 20, opacity: a, ...num(row.thick ? 700 : 500), fontSize: 30, color: row.thick ? COL.gold : "rgba(243,234,217,0.6)" }}>{price}</div>
            <div style={{ position: "absolute", left: Math.min(1290, end.x + 14), top: end.y - 20, opacity: a * ramp(f, E("liqRow") - 4, 10), ...num(700), fontSize: row.thick ? 34 : 28, color: row.thick ? COL.gold : "rgba(243,234,217,0.7)" }}>
              {qty}
              <span style={{ ...sans(700), fontSize: 22 }}> {T.marks.lots}</span>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

