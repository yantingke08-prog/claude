// 2D layer over the 3D stage. Rules: one main label per sentence (at most one callout at a time), at most two cards,
// every element appears on the word that names it (events), each caption shows a whole meaning unit, and the
// previous scene's labels are gone before the next scene's appear.
// Safe area: x 48..1392; labels y 400..1880; captions y >= 1962 and nothing else below 1900.
import React from "react";
import { E, backOut, captions, clamp01, out3, ramp, win } from "./cue";
import { A, A_H, A_LEVEL, B_H, B_LEVEL, Bc, HOOK, HOOK_H, cx, cy, vy, type Chart } from "./data";
import { projector, type Proj } from "./director";
import { num, sans, serif } from "./fonts";
import { T } from "./text";
import { COL, focus, hookDark } from "./world";

export const SAFE = { l: 48, r: 1392, top: 400, bottom: 1880, cap: 1962 };
const INK = "#f3ead9";
const SOFT = "rgba(243,234,217,0.62)";
const PLATE = "rgba(5,8,14,0.84)";
type Pt = { x: number; y: number };
const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? 0.56 : 1) * size, 0);

/** one callout: a ring on the 3D anchor, a short leader, a plate placed by dx/dy and clamped into the safe area */
const Callout: React.FC<{ a: number; at: Pt; dx: number; dy: number; zh: string; sub?: string; accent: string; size?: number }> = ({ a, at, dx, dy, zh, sub, accent, size = 50 }) => {
  if (a <= 0.002) return null;
  const subSize = Math.round(size * 0.7);
  const padX = 26;
  const w = Math.max(textW(zh, size), sub ? textW(sub, subSize) : 0) + padX * 2 + 10;
  const h = size * 1.32 + (sub ? subSize * 1.42 : 0) + 22;
  let x = at.x + dx - (dx < 0 ? w : 0);
  let y = at.y + dy - (dy < 0 ? h : 0);
  x = Math.min(SAFE.r - w, Math.max(SAFE.l, x));
  y = Math.min(SAFE.bottom - h, Math.max(SAFE.top, y));
  const ex = Math.min(x + w, Math.max(x, at.x));
  const ey = at.y < y ? y : at.y > y + h ? y + h : y + h / 2;
  const k = out3(a);
  return (
    <>
      <svg width={1440} height={2560} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <circle cx={at.x} cy={at.y} r={9} fill="none" stroke={accent} strokeWidth={3.5} opacity={a} />
        <circle cx={at.x} cy={at.y} r={3.5} fill={accent} opacity={a} />
        <line x1={at.x} y1={at.y} x2={at.x + (ex - at.x) * k} y2={at.y + (ey - at.y) * k} stroke={accent} strokeWidth={2.5} opacity={0.8 * a} />
      </svg>
      <div style={{ position: "absolute", left: x, top: y + (1 - k) * 12, width: w, opacity: a, padding: `10px ${padX}px 12px`, background: PLATE, borderLeft: `6px solid ${accent}`, borderRadius: 12, boxSizing: "border-box", whiteSpace: "nowrap" }}>
        <div style={{ ...sans(900), fontSize: size, lineHeight: 1.32, color: INK }}>{zh}</div>
        {sub && <div style={{ ...sans(700), fontSize: subSize, lineHeight: 1.42, color: accent === INK ? SOFT : accent }}>{sub}</div>}
      </div>
    </>
  );
};

/** small muted tag next to a 3D point (orientation only, no plate) */
const Tag: React.FC<{ a: number; at: Pt; text: string; color?: string; align?: "left" | "right" | "center"; size?: number; plate?: boolean }> = ({ a, at, text, color = SOFT, align = "left", size = 32, plate }) => {
  if (a <= 0.002) return null;
  const w = textW(text, size) + (plate ? 28 : 0);
  let x = align === "left" ? at.x : align === "right" ? at.x - w : at.x - w / 2;
  x = Math.min(SAFE.r - w, Math.max(SAFE.l, x));
  return (
    <div style={{ position: "absolute", left: x, top: at.y - size * 0.72, opacity: a, ...sans(700), fontSize: size, color, whiteSpace: "nowrap", padding: plate ? "0 14px 4px" : 0, background: plate ? "rgba(5,8,14,0.72)" : "none", borderRadius: 8 }}>
      {text}
    </div>
  );
};

/** the section's single main message, in the top band */
const Headline: React.FC<{ f: number; id: string; from: number; to: number }> = ({ f, id, from, to }) => {
  const a = win(f, from, to, 10, 10);
  if (a <= 0.002) return null;
  const [n, zh] = T.head[id];
  const k = out3((f - from) / 14);
  return (
    <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 226, opacity: a, display: "flex", alignItems: "center", gap: 20 }}>
      {n && <div style={{ ...num(700), fontSize: 36, color: "#06080d", background: COL.gold, borderRadius: 8, padding: "2px 14px", flexShrink: 0 }}>{n}</div>}
      <div style={{ ...sans(900), fontSize: 66, lineHeight: 1.2, color: INK, transform: `translateY(${(1 - k) * 14}px)`, whiteSpace: "nowrap" }}>{zh}</div>
    </div>
  );
};

const TopBar: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: SAFE.l, top: 112, display: "flex", alignItems: "baseline", gap: 16 }}>
      <div style={{ ...sans(900), fontSize: 34, color: INK, letterSpacing: 2 }}>{T.series}</div>
      <div style={{ ...sans(700), fontSize: 28, color: SOFT }}>{T.seriesSub}</div>
    </div>
    <div style={{ position: "absolute", right: SAFE.l, top: 110, ...sans(700), fontSize: 28, color: COL.gold, padding: "2px 14px", border: `2px solid rgba(233,180,76,0.5)`, borderRadius: 8 }}>{T.risk}</div>
    <div style={{ position: "absolute", right: SAFE.l, top: 164, ...sans(500), fontSize: 22, color: SOFT }}>{T.tagData}</div>
  </>
);

const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to);
  if (!c) return null;
  const a = Math.min(clamp01((f - c.from) / 4), clamp01((c.to - f) / 4));
  return (
    <div style={{ position: "absolute", left: SAFE.l - 20, right: SAFE.l - 20, top: SAFE.cap, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ background: "rgba(3,5,10,0.8)", borderRadius: 16, padding: "6px 30px 12px", textAlign: "center" }}>
        {c.rows.map((r, i) => (
          <div key={i} style={{ ...sans(700), fontSize: 60, lineHeight: "82px", color: INK, whiteSpace: "nowrap" }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
};

/** a callout schedule: each runs from its event to the next one's start, so two never overlap */
type Spec = { at: number; until?: number; draw: (a: number) => React.ReactNode };
const Sequence: React.FC<{ f: number; items: Spec[]; end: number }> = ({ f, items, end }) => (
  <>
    {items.map((s, i) => {
      const until = Math.min(s.until ?? (i + 1 < items.length ? items[i + 1].at : end), end);
      const a = win(f, s.at, until, 8, 8);
      return a > 0.002 ? <React.Fragment key={i}>{s.draw(a)}</React.Fragment> : null;
    })}
  </>
);

/** a card: a plate with rows; left = its x (or centred across the safe width) */
const Card: React.FC<{ a: number; top: number; left?: number; children: React.ReactNode; accent?: string; center?: boolean }> = ({ a, top, left, children, accent = COL.gold, center }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: left ?? SAFE.l, right: left === undefined ? SAFE.l : undefined, top, opacity: a, display: "flex", justifyContent: center ? "center" : "flex-start" }}>
      <div style={{ background: PLATE, borderLeft: `6px solid ${accent}`, borderRadius: 14, padding: "16px 30px 18px", display: "flex", flexDirection: "column", gap: 8, transform: `translateY(${(1 - out3(a)) * 10}px)` }}>{children}</div>
    </div>
  );

// ================================================================= hook: question, 5-second countdown, punch line
/** a thin gold frame around a candle and its volume column */
const FocusFrame: React.FC<{ a: number; pr: Proj; ch: Chart; i: number }> = ({ a, pr, ch, i }) => {
  if (a <= 0.002) return null;
  const b = ch.bars[i];
  const p0 = pr(cx(ch, i) - ch.xs * 0.7, cy(ch, b.h) + 0.18, 0.2);
  const p1 = pr(cx(ch, i) + ch.xs * 0.7, ch.vb - 0.08, 0.2);
  const x = Math.min(p0.x, p1.x);
  const y = Math.min(p0.y, p1.y);
  return <div style={{ position: "absolute", left: x, top: y, width: Math.abs(p1.x - p0.x), height: Math.abs(p1.y - p0.y), border: `3px solid ${COL.gold}`, borderRadius: 14, opacity: a, boxShadow: "0 0 24px rgba(233,180,76,0.35)" }} />;
};

const Hook: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const punch = E("punch");
  const dark = hookDark(f);
  const qA = ramp(f, E("hQ"), 10) * (1 - ramp(f, punch - 8, 8));
  const k1 = backOut((f - E("hQ")) / 14);
  const cdA = ramp(f, E("cdText"), 10) * (1 - ramp(f, punch - 8, 8));
  const cds = ["cd0", "cd1", "cd2", "cd3", "cd4"].map((n) => E(n));
  const cdOn = f >= cds[0] && f < punch;
  const idx = cds.reduce((k, t, i) => (f >= t ? i : k), 0);
  const left = cdOn ? clamp01(1 - (f - cds[0]) / (punch - cds[0])) : 0;
  const digitA = cdOn ? Math.min(clamp01((f - cds[idx]) / 5), clamp01((punch - f) / 6)) : 0;
  const R = 118;
  const circ = 2 * Math.PI * R;
  const pA = ramp(f, punch, 8) * (1 - ramp(f, E("wIn"), 10));
  const pK = out3((f - punch) / 12);
  const enough = ramp(f, E("pEnough"), 6);
  const frameA = ramp(f, E("hHi"), 8) * (1 - 0.65 * dark) * (1 - ramp(f, E("wSell"), 10));
  const hv = pr(cx(HOOK, HOOK_H), vy(HOOK, HOOK.bars[HOOK_H].v) - 0.25, 0.25);
  return (
    <>
      <FocusFrame a={frameA} pr={pr} ch={HOOK} i={HOOK_H} />
      {qA > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 290, textAlign: "center", opacity: qA, transform: `scale(${0.94 + 0.06 * k1})` }}>
          <div style={{ ...serif(900), fontSize: 132, lineHeight: 1.16, color: INK }}>{T.q1}</div>
          <div style={{ ...serif(900), fontSize: 132, lineHeight: 1.16, color: COL.gold }}>{T.q2}</div>
        </div>
      )}
      {cdA > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 628, textAlign: "center", opacity: cdA }}>
          <div style={{ ...sans(900), fontSize: 62, lineHeight: 1.3, color: INK }}>{T.cd1}</div>
          <div style={{ ...num(500), fontSize: 40, lineHeight: 1.3, color: SOFT, letterSpacing: 1 }}>{T.cd2}</div>
        </div>
      )}
      {cdOn && (
        <div style={{ position: "absolute", left: 720 - 160, top: 790, width: 320, height: 320, opacity: Math.min(clamp01((f - cds[0]) / 6), clamp01((punch - f) / 6)) }}>
          <svg width={320} height={320} style={{ position: "absolute", inset: 0 }}>
            <circle cx={160} cy={160} r={R} fill="rgba(5,8,14,0.72)" stroke="rgba(243,234,217,0.16)" strokeWidth={6} />
            <circle cx={160} cy={160} r={R} fill="none" stroke={COL.gold} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${circ * left} ${circ}`} transform="rotate(-90 160 160)" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", ...num(700), fontSize: 168, color: INK, opacity: digitA, transform: `scale(${1.06 - 0.06 * out3((f - cds[idx]) / 8)})` }}>{5 - idx}</div>
        </div>
      )}
      {pA > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 860, textAlign: "center", opacity: pA }}>
          <div style={{ ...sans(900), fontSize: 96, lineHeight: 1.3, color: INK, transform: `translateY(${(1 - pK) * 10}px)` }}>{T.punch1}</div>
          <div style={{ width: 120 * pK, height: 4, background: COL.gold, margin: "26px auto 18px", opacity: 0.8 }} />
          <div style={{ ...serif(900), fontSize: 250, lineHeight: 1.1, color: COL.gold, opacity: 0.35 + 0.65 * Math.max(enough, pK * 0.7) }}>{T.punch2}</div>
        </div>
      )}
      <Sequence
        f={f}
        end={E("abIn") + 4}
        items={[{ at: E("wSell"), draw: (a) => <Callout a={a} at={hv} dx={-80} dy={-330} zh={T.heavy} sub={f >= E("wBuy") ? T.heavySub : " "} accent={COL.gold} /> }]}
      />
    </>
  );
};

// ================================================================= A / B
const ChartTags: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  // on the charts while both are in view; while the camera is on one of them, its letter sits at the right of the top band
  const a = win(f, E("abIn") + 14, E("eIn"), 10, 10);
  const fo = focus(f);
  const both = a * (1 - Math.abs(fo)) ** 2;
  const chip = (at: Pt, s: string, op: number, size = 54) =>
    op <= 0.002 ? null : (
      <div style={{ position: "absolute", left: Math.max(SAFE.l, at.x), top: at.y - size * 0.74, opacity: op, ...num(700), fontSize: size, color: "#06080d", background: INK, borderRadius: 12, padding: "0 20px 2px", lineHeight: `${Math.round(size * 1.4)}px` }}>{s}</div>
    );
  return a <= 0.002 ? null : (
    <>
      {chip(pr(cx(A, 0) - 0.15, cy(A, 11.95), 0.3), T.tagA, both)}
      {chip(pr(cx(Bc, 0) - 0.15, cy(Bc, 16.35), 0.3), T.tagB, both)}
      {chip({ x: SAFE.r - 76, y: 262 }, T.tagA, a * clamp01(fo), 60)}
      {chip({ x: SAFE.r - 76, y: 262 }, T.tagB, a * clamp01(-fo), 60)}
    </>
  );
};

const What: React.FC<{ f: number }> = ({ f }) => {
  const a = win(f, E("abIn") + 10, E("pos1"), 10, 10);
  const w = ramp(f, E("abWash"), 8);
  const d = ramp(f, E("abDist"), 8);
  const n = ramp(f, E("abNot"), 10);
  const chip = (s: string, k: number) => <span style={{ display: "inline-block", ...sans(900), fontSize: 70, color: INK, opacity: 0.25 + 0.75 * k, padding: "0 10px" }}>{s}</span>;
  return (
    <Card a={a} top={226} center>
      <div style={{ textAlign: "center" }}>
        {chip(T.wash, w)}
        <span style={{ ...sans(700), fontSize: 44, color: SOFT, opacity: d }}>{T.or}</span>
        {chip(T.dist, d)}
      </div>
      {n > 0.002 && (
        <div style={{ textAlign: "center", opacity: n }}>
          <div style={{ ...sans(700), fontSize: 44, color: SOFT }}>{T.notOne}</div>
          <div style={{ ...sans(900), fontSize: 50, color: COL.gold, marginTop: 4 }}>
            <span style={{ opacity: 0.25 + 0.75 * ramp(f, E("abWhere"), 8) }}>{T.where}</span>
            <span style={{ color: SOFT, padding: "0 16px" }}>·</span>
            <span style={{ opacity: 0.25 + 0.75 * ramp(f, E("abAfter"), 8) }}>{T.after}</span>
          </div>
        </div>
      )}
    </Card>
  );
};

const Pos: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("vol1");
  const base = pr(cx(A, 3), cy(A, 10.34) + 0.05, 0.2);
  const rally = pr(cx(Bc, B_H) + 0.32, cy(Bc, 13.0), 0.3);
  const aH = pr(cx(A, A_H), cy(A, A.bars[A_H].h) + 0.08, 0.1);
  const bH = pr(cx(Bc, B_H), cy(Bc, Bc.bars[B_H].h) + 0.08, 0.1);
  return (
    <>
      <Headline f={f} id="pos" from={E("pos1")} to={end} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: E("posABase"), until: E("posB"), draw: (a) => <Callout a={a} at={base} dx={-40} dy={-250} zh={T.base} sub={f >= E("posARise") ? T.baseSub : " "} accent={COL.gold} /> },
          { at: E("posBRise"), until: E("posSum"), draw: (a) => <Callout a={a} at={rally} dx={-420} dy={-120} zh={T.rally} sub={f >= E("posBFar") ? T.rallySub : " "} accent={COL.gold} /> },
          { at: E("posLow"), until: E("posHigh"), draw: (a) => <Callout a={a} at={aH} dx={50} dy={60} zh={T.low} accent={COL.gold} size={44} /> },
          { at: E("posHigh"), draw: (a) => <Callout a={a} at={bH} dx={50} dy={60} zh={T.high} accent={INK} size={44} /> },
        ]}
      />
    </>
  );
};

const Vol: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("c1");
  const pull = pr(cx(A, A_H + 2.5), vy(A, 1.2) + 0.1, 0.25);
  const drop = pr(cx(Bc, B_H + 1), vy(Bc, Bc.bars[B_H + 1].v) + 0.06, 0.25);
  const re = pr(cx(Bc, B_H + 2), vy(Bc, Bc.bars[B_H + 2].v) + 0.06, 0.25);
  return (
    <>
      <Headline f={f} id="vol" from={E("vol1")} to={end} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: E("vShrink"), until: E("vB"), draw: (a) => <Callout a={a} at={pull} dx={-100} dy={-300} zh={T.shrink} sub={f >= E("vLight") ? T.shrinkSub : " "} accent={COL.gold} /> },
          { at: E("vBUp"), until: E("vBRe"), draw: (a) => <Callout a={a} at={drop} dx={-120} dy={-330} zh={T.dropVol} accent={COL.down} /> },
          { at: E("vBRe"), draw: (a) => <Callout a={a} at={re} dx={-120} dy={-330} zh={T.bounceVol} sub={f >= E("vRush") ? T.bounceSub : " "} accent={INK} /> },
        ]}
      />
    </>
  );
};

/** the tag at the right end of a key line */
const LineTag: React.FC<{ a: number; pr: Proj; ch: Chart; level: number; text: string; color?: string }> = ({ a, pr, ch, level, text, color = COL.gold }) => (
  <Tag a={a} at={pr(cx(ch, ch.bars.length - 1) + 0.35, cy(ch, level) + 0.2, 0.3)} text={text} color={color} align="right" size={34} plate />
);

const Catch: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("b1");
  const wick = pr(cx(A, A_H + 5), cy(A, 11.12), 0.2);
  const brk = pr(cx(Bc, B_H + 3), cy(Bc, 14.7), 0.2);
  return (
    <>
      <Headline f={f} id="catch" from={E("c1")} to={end} />
      <LineTag a={win(f, E("cLow") + 10, E("cB") + 4, 10, 8)} pr={pr} ch={A} level={A_LEVEL} text={T.levelTag} />
      <LineTag a={win(f, E("cBHere") + 8, E("cBreak"), 10, 8)} pr={pr} ch={Bc} level={B_LEVEL} text={T.levelTag} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: E("cWick"), until: E("cB"), draw: (a) => <Callout a={a} at={wick} dx={-120} dy={150} zh={T.wick} sub={f >= E("cCatch") ? T.wickSub : " "} accent={COL.gold} /> },
          { at: E("cBreak") + 6, draw: (a) => <Callout a={a} at={brk} dx={-140} dy={150} zh={T.broke} sub={f >= E("cShort") ? T.brokeSub : " "} accent={COL.down} /> },
        ]}
      />
    </>
  );
};

const Back: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("sIn");
  const up = pr(cx(A, A_H + 6), cy(A, A.bars[A_H + 6].l) - 0.12, 0.3);
  const fail = pr(cx(Bc, B_H + 5), cy(Bc, Bc.bars[B_H + 5].h) + 0.04, 0.2);
  const flip = f >= E("bFlip");
  return (
    <>
      <Headline f={f} id="back" from={E("b1")} to={end} />
      <LineTag a={win(f, E("bBack"), E("bB") + 4, 10, 8)} pr={pr} ch={A} level={A_LEVEL} text={T.sup} />
      <LineTag a={win(f, E("bSup"), end, 10, 10)} pr={pr} ch={Bc} level={B_LEVEL} text={flip ? T.res : T.sup} color={flip ? INK : COL.gold} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: E("bHigher"), until: E("bB"), draw: (a) => <Callout a={a} at={up} dx={-120} dy={170} zh={T.higher} sub={T.higherSub} accent={COL.gold} /> },
          { at: E("bFail"), until: E("bSup"), draw: (a) => <Callout a={a} at={fail} dx={-140} dy={-250} zh={T.fail} accent={COL.down} /> },
          { at: E("bFlip"), draw: (a) => <Callout a={a} at={fail} dx={-140} dy={-250} zh={T.fail} sub={T.failSub} accent={COL.down} /> },
        ]}
      />
    </>
  );
};

/** the two summary cards, each in the empty upper-left of its chart */
const Sum: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const out = E("lIn");
  const aA = win(f, E("sIn"), out, 10, 10);
  const bA = win(f, E("sB"), out, 10, 10);
  const ta = pr(cx(A, 0) - 0.15, cy(A, 11.95), 0.3);
  const tb = pr(cx(Bc, 0) - 0.15, cy(Bc, 16.35), 0.3);
  const row = (items: string[], evs: string[], verdict: string, vEv: string, color: string) => (
    <>
      <div style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
        {items.map((s, i) => (
          <span key={i} style={{ ...sans(900), fontSize: 40, color: INK, opacity: 0.25 + 0.75 * ramp(f, E(evs[i]), 8) }}>
            {s}
            {i < items.length - 1 ? <span style={{ color: SOFT }}>、</span> : null}
          </span>
        ))}
      </div>
      <div style={{ ...sans(900), fontSize: 56, color, opacity: ramp(f, E(vEv), 10) }}>→ {verdict}</div>
    </>
  );
  return (
    <>
      <Card a={aA} top={ta.y + 50} left={SAFE.l + 120}>
        {row(T.sumA, ["sA1", "sA2", "sA3", "sA4"], T.sumAV, "sAV", COL.gold)}
      </Card>
      <Card a={bA} top={tb.y + 50} left={SAFE.l + 120} accent={INK}>
        {row(T.sumB, ["sB1", "sB2", "sB3", "sB4"], T.sumBV, "sBV", INK)}
      </Card>
    </>
  );
};

const Logic: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("eIn");
  const head = win(f, E("lIn"), E("l2"), 10, 10);
  const rulesA = win(f, E("l2"), end, 10, 10);
  const acts = [E("lGo"), E("lAvoid"), E("lStop")];
  return (
    <>
      {head > 0.002 && (
        <Card a={head} top={226} center>
          <div style={{ ...sans(900), fontSize: 62, color: INK, textAlign: "center" }}>{T.head.logic[1]}</div>
          <div style={{ ...sans(700), fontSize: 46, color: COL.gold, textAlign: "center", opacity: 0.25 + 0.75 * ramp(f, E("lNoRush"), 8) }}>{T.noRush}</div>
        </Card>
      )}
      <Tag a={win(f, E("lAns"), E("l2") + 6, 10, 10)} at={pr(cx(Bc, B_H + 4), cy(Bc, 15.75) + 0.75, 0.2)} text={T.answer} color={COL.gold} align="center" size={42} plate />
      <Card a={rulesA} top={pr(A.x0, A.vb, 0).y + 26} center>
        {T.rules.map(([a, b], i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 18, opacity: 0.25 + 0.75 * ramp(f, acts[i], 8) }}>
            <div style={{ ...sans(900), fontSize: 44, lineHeight: 1.25, color: INK, width: 300 }}>{a}</div>
            <div style={{ ...sans(700), fontSize: 36, color: SOFT }}>→</div>
            <div style={{ ...sans(900), fontSize: 44, lineHeight: 1.25, color: i === 1 ? INK : COL.gold }}>{b}</div>
          </div>
        ))}
      </Card>
    </>
  );
};

const End: React.FC<{ f: number }> = ({ f }) => {
  const risk = E("eRisk");
  const qa = win(f, E("eIn"), risk, 12, 10);
  const ra = ramp(f, risk, 14);
  const dim = ramp(f, E("eIn"), 14) * (1 - ra);
  return (
    <>
      {dim > 0.002 && <div style={{ position: "absolute", inset: 0, background: "rgba(4,7,13,0.5)", opacity: dim }} />}
      {qa > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 300, opacity: qa, textAlign: "center" }}>
          <div style={{ display: "inline-block", background: PLATE, borderRadius: 22, padding: "30px 46px 36px" }}>
            <div style={{ ...serif(900), fontSize: 84, lineHeight: 1.25, color: INK }}>{T.e1}</div>
            <div style={{ ...serif(900), fontSize: 84, lineHeight: 1.25, color: COL.gold, opacity: 0.3 + 0.7 * ramp(f, E("eQ"), 8) }}>{T.e2}</div>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 30 }}>
              {T.eChips.map((s, i) => (
                <div key={i} style={{ ...sans(900), fontSize: 50, color: INK, border: `3px solid rgba(243,234,217,0.6)`, borderRadius: 14, padding: "2px 24px 6px", opacity: ramp(f, E("eQ") + 6 + i * 5, 8) }}>{s}</div>
              ))}
            </div>
            <div style={{ ...sans(700), fontSize: 46, color: COL.gold, marginTop: 28, opacity: ramp(f, E("eCmt"), 10) }}>{T.eCmt}</div>
          </div>
        </div>
      )}
      {ra > 0.002 && (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(4,7,13,0.72)", opacity: ra }} />
          <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 820, textAlign: "center", opacity: ra }}>
            <div style={{ ...serif(900), fontSize: 120, lineHeight: 1.3, color: INK }}>{T.r1}</div>
            <div style={{ width: 120, height: 4, background: COL.gold, margin: "24px auto 30px", opacity: 0.8 }} />
            <div style={{ ...serif(900), fontSize: 92, lineHeight: 1.3, color: COL.gold }}>{T.r2}</div>
          </div>
        </>
      )}
    </>
  );
};

// ================================================================= the HUD
/** a new scene's labels wait until the camera has started carrying the previous set out of frame */
const In: React.FC<{ f: number; at: string; children: React.ReactNode }> = ({ f, at, children }) => {
  const a = ramp(f, E(at) + 6, 8);
  return a <= 0.002 ? null : <div style={{ position: "absolute", inset: 0, opacity: a }}>{children}</div>;
};
export const Hud: React.FC<{ f: number }> = ({ f }) => {
  const pr = projector(f);
  /** a section is mounted from its first event until just after the next one starts (its own fades end there) */
  const S = (a: string, b: string | null) => f >= E(a) - 1 && (b === null || f < E(b) + 12);
  return (
    <div style={{ position: "absolute", inset: 0, width: 1440, height: 2560, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 420, background: "linear-gradient(180deg, rgba(4,7,13,0.92) 0%, rgba(4,7,13,0.78) 62%, rgba(4,7,13,0) 100%)" }} />
      <TopBar />
      {f < E("abIn") + 14 && <Hook f={f} pr={pr} />}
      {S("abIn", null) && (
        <In f={f} at="abIn">
          <ChartTags f={f} pr={pr} />
        </In>
      )}
      {S("abIn", "pos1") && <What f={f} />}
      {S("pos1", "vol1") && <Pos f={f} pr={pr} />}
      {S("vol1", "c1") && <Vol f={f} pr={pr} />}
      {S("c1", "b1") && <Catch f={f} pr={pr} />}
      {S("b1", "sIn") && <Back f={f} pr={pr} />}
      {S("sIn", "lIn") && <Sum f={f} pr={pr} />}
      {S("lIn", "eIn") && <Logic f={f} pr={pr} />}
      {S("eIn", null) && <End f={f} />}
      <Captions f={f} />
    </div>
  );
};

