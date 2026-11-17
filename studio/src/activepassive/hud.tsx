// 2D layer over the 3D stage. Rules: one main message per section (top band), at most one callout at a time and at
// most two explanation cards, every element appears on the word that names it (events), and each caption shows a
// whole meaning unit. Safe area: x 48..1392; labels y 400..1880; captions y >= 1962; nothing else below 1900.
import React from "react";
import { bookAbsorb, bookBuyA } from "./acts";
import { E, backOut, captions, clamp01, out3, ramp, win } from "./cue";
import { BOOK_CANDLE_DX, CHASE, CH_DIV, CH_WALL, CH_WALL_I, CH_YANG, END_BOOK_X, END_CANDLE, SIZE_W, THREE as TH, THREE_LEVEL, TH_FAR, TH_NEAR, TH_PUSH, VOL_K, X, cx, cy, ly } from "./data";
import { projector, type Proj } from "./director";
import { num, sans, serif } from "./fonts";
import { T } from "./text";
import { COL } from "./world";

export const SAFE = { l: 48, r: 1392, top: 400, bottom: 1880, cap: 1962 };
const INK = "#f3ead9";
const SOFT = "rgba(243,234,217,0.62)";
const PLATE = "rgba(5,8,14,0.84)";
type Pt = { x: number; y: number };
const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? 0.56 : 1) * size, 0);

/** one callout: a ring on the 3D anchor, a short leader, a plate placed by dx/dy and clamped into the safe area */
const Callout: React.FC<{ a: number; at: Pt; dx: number; dy: number; zh: string; sub?: string; accent: string; size?: number }> = ({ a, at, dx, dy, zh, sub, accent, size = 50 }) => {
  if (a <= 0.002) return null;
  const subSize = Math.round(size * 0.68);
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
const Tag: React.FC<{ a: number; at: Pt; text: string; color?: string; align?: "left" | "right" | "center"; size?: number }> = ({ a, at, text, color = SOFT, align = "left", size = 32 }) => {
  if (a <= 0.002) return null;
  const w = textW(text, size);
  let x = align === "left" ? at.x : align === "right" ? at.x - w : at.x - w / 2;
  x = Math.min(SAFE.r - w, Math.max(SAFE.l, x));
  return <div style={{ position: "absolute", left: x, top: at.y - size * 0.7, opacity: a, ...sans(700), fontSize: size, color, whiteSpace: "nowrap" }}>{text}</div>;
};

/** the section's single main message, in the top band */
const Headline: React.FC<{ f: number; id: string; from: number; to: number; text?: string }> = ({ f, id, from, to, text }) => {
  const a = win(f, from, to, 10, 10);
  if (a <= 0.002) return null;
  const [n, zh0] = T.head[id];
  const zh = text ?? zh0;
  const k = out3((f - from) / 14);
  return (
    <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 222, opacity: a, display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ ...num(700), fontSize: 34, color: "#06080d", background: COL.gold, borderRadius: 8, padding: "2px 14px", flexShrink: 0 }}>{n}</div>
      <div style={{ ...sans(900), fontSize: zh.length > 12 ? 54 : 62, lineHeight: 1.2, color: INK, transform: `translateY(${(1 - k) * 14}px)`, whiteSpace: "nowrap" }}>{zh}</div>
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

/** a card: a plate in the top band with one or more rows */
const Card: React.FC<{ a: number; top: number; children: React.ReactNode; accent?: string; center?: boolean }> = ({ a, top, children, accent = COL.gold, center }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top, opacity: a, display: "flex", justifyContent: center ? "center" : "flex-start" }}>
      <div style={{ background: PLATE, borderLeft: `6px solid ${accent}`, borderRadius: 14, padding: "16px 30px 18px", display: "flex", flexDirection: "column", gap: 8, transform: `translateY(${(1 - out3(a)) * 10}px)` }}>{children}</div>
    </div>
  );

// ================================================================= sections
const Hook: React.FC<{ f: number }> = ({ f }) => {
  const out = 1 - ramp(f, E("buyIn"), 10);
  const k1 = backOut((f - 1) / 16);
  const a2 = ramp(f, E("notSlow"), 10);
  const a3 = ramp(f, E("hAct"), 10);
  const a4 = ramp(f, E("hPas"), 10);
  const chip = (s: string, k: number, solid: boolean) => (
    <span style={{ display: "inline-block", ...serif(900), fontSize: 104, lineHeight: 1.2, padding: "0 26px 6px", margin: "0 8px", borderRadius: 18, color: solid ? "#fff4ec" : INK, background: solid ? "rgba(229,72,77,0.9)" : "rgba(223,227,234,0.1)", border: solid ? "none" : "3px solid rgba(243,234,217,0.75)", opacity: k, transform: `scale(${0.86 + 0.14 * backOut(k)})` }}>{s}</span>
  );
  return out <= 0.002 ? null : (
    <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 300, opacity: out, textAlign: "center" }}>
      <div style={{ ...serif(900), fontSize: 168, lineHeight: 1.15, color: INK, transform: `scale(${0.92 + 0.08 * k1})` }}>{T.hook1}</div>
      <div style={{ ...sans(900), fontSize: 76, lineHeight: 1.4, color: SOFT, opacity: a2, marginTop: 12, textDecoration: "line-through", textDecorationColor: "rgba(243,234,217,0.5)" }}>{T.hook2}</div>
      <div style={{ ...sans(900), fontSize: 76, lineHeight: 1.4, color: COL.gold, opacity: a3, marginTop: 14 }}>{T.hook3}</div>
      <div style={{ marginTop: 10 }}>
        {chip(T.act, a3, true)}
        <span style={{ ...sans(700), fontSize: 60, color: SOFT, opacity: a4 }}>和</span>
        {chip(T.pas, a4, false)}
      </div>
    </div>
  );
};

/** orientation tags of a book: asks above, bids below */
const BookTags: React.FC<{ a: number; pr: Proj; x: number }> = ({ a, pr, x }) => (
  <>
    <Tag a={a} at={pr(x + 0.95, ly(3) + 0.45, 0)} text={T.asks} align="center" size={30} />
    <Tag a={a} at={pr(x + 0.95, ly(-3) - 0.55, 0)} text={T.bids} align="center" size={30} />
  </>
);

const Buy: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("sellIn");
  const A = bookBuyA(f);
  const xA = X.buyA;
  const xB = X.buyB;
  const pulseTip = pr(xA, ly(A.pulses[0]?.y1 ?? -0.7), 0.62);
  const ask1 = pr(xA + 0.4, ly(1), 0.4);
  const mineB = pr(xB + 0.15 + 0.24, ly(-2), 0.84);
  const cmpA = win(f, E("cmp") + 20, end, 10, 10);
  const tags = win(f, E("buyIn") + 12, E("cmp"), 12, 10);
  return (
    <>
      <Headline f={f} id="buy" from={E("aBuy")} to={end} />
      <BookTags a={tags * (1 - ramp(f, E("pBuy") + 12, 8))} pr={pr} x={xA} />
      <BookTags a={tags * ramp(f, E("pBuy") + 32, 10)} pr={pr} x={xB} />
      <Sequence
        f={f}
        end={E("cmp") + 20}
        items={[
          { at: E("aMkt"), until: E("aTake"), draw: (a) => <Callout a={a} at={pulseTip} dx={-80} dy={150} zh={T.mkt} sub={T.mktSub} accent={COL.up} /> },
          { at: E("aTake"), until: E("pBuy") + 12, draw: (a) => <Callout a={a} at={ask1} dx={60} dy={-250} zh={T.take} sub={f >= E("aPush") ? T.takeSub : " "} accent={COL.up} /> },
          { at: E("pPlace"), until: E("pBetter"), draw: (a) => <Callout a={a} at={mineB} dx={60} dy={180} zh={T.limit} sub={f >= E("pProvide") ? T.provide : T.limitSub} accent={INK} /> },
          { at: E("pBetter"), until: E("cmp") + 20, draw: (a) => <Callout a={a} at={mineB} dx={60} dy={180} zh={T.better} sub={f >= E("pNoFill") + 8 ? T.noFill : T.betterSub} accent={INK} /> },
        ]}
      />
      {cmpA > 0.002 && (
        <>
          <PairCard a={cmpA} at={pr(xA - 0.55, ly(3) + 0.5, 0)} zh={T.cmpA} sub={T.cmpASub} accent={COL.up} />
          <PairCard a={cmpA} at={pr(xB - 0.55, ly(3) + 0.5, 0)} zh={T.cmpB} sub={T.cmpBSub} accent={INK} />
        </>
      )}
    </>
  );
};
/** one of the two cards above a pair of books, centred over its tower */
const PairCard: React.FC<{ a: number; at: Pt; zh: string; sub: string; accent: string }> = ({ a, at, zh, sub, accent }) => {
  const w = 600;
  const x = Math.min(SAFE.r - w, Math.max(SAFE.l, at.x - w / 2));
  const y = Math.max(SAFE.top, at.y - 190);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: a, textAlign: "center", transform: `translateY(${(1 - out3(a)) * 10}px)` }}>
      <div style={{ display: "inline-block", background: PLATE, borderTop: `6px solid ${accent}`, borderRadius: 12, padding: "8px 26px 12px" }}>
        <div style={{ ...sans(900), fontSize: 58, color: accent === INK ? INK : accent }}>{zh}</div>
        <div style={{ ...sans(700), fontSize: 38, color: SOFT }}>{sub}</div>
      </div>
    </div>
  );
};

const Sell: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("chaseIn");
  const xA = X.sellA;
  const xB = X.sellB;
  const bid1 = pr(xA + 0.4, ly(-1), 0.4);
  const mineD = pr(xB + 0.15 + 0.24, ly(2), 0.84);
  const keyA = win(f, E("keyIn"), end, 10, 10);
  const tags = win(f, E("sellIn") + 12, E("keyIn"), 12, 10);
  return (
    <>
      <Headline f={f} id="sell" from={E("sAct")} to={E("keyIn")} />
      <BookTags a={tags * (1 - ramp(f, E("sPas") + 12, 8))} pr={pr} x={xA} />
      <BookTags a={tags * ramp(f, E("sPas") + 30, 10)} pr={pr} x={xB} />
      <Sequence
        f={f}
        end={E("keyIn") + 24}
        items={[
          { at: E("sHit"), until: E("sPas") + 12, draw: (a) => <Callout a={a} at={bid1} dx={60} dy={220} zh={T.sHit} sub={f >= E("sDown") ? T.sHitSub : " "} accent={COL.down} /> },
          { at: E("sPlace"), until: E("sFill"), draw: (a) => <Callout a={a} at={mineD} dx={60} dy={110} zh={T.sPlace} sub={T.sPlaceSub} accent={INK} /> },
          { at: E("sFill") + 18, draw: (a) => <Callout a={a} at={mineD} dx={60} dy={110} zh={T.sFill} accent={COL.up} /> },
        ]}
      />
      <Card a={keyA} top={222} center>
        <div style={{ ...serif(900), fontSize: 64, color: INK, textAlign: "center" }}>{T.key1}</div>
        <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 6 }}>
          <div style={{ ...sans(900), fontSize: 48, color: COL.gold, opacity: 0.25 + 0.75 * ramp(f, E("kCross"), 10) }}>{T.key2}</div>
          <div style={{ ...sans(900), fontSize: 48, color: COL.gold, opacity: 0.25 + 0.75 * ramp(f, E("kPush"), 10) }}>{T.key3}</div>
        </div>
      </Card>
    </>
  );
};

const Chase: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("threeIn");
  const yang = pr(cx(CHASE, CH_YANG), cy(CHASE, CHASE.bars[CH_YANG].h) + 0.1, 0);
  const yangMid = pr(cx(CHASE, CH_YANG) + 0.22, cy(CHASE, (CHASE.bars[CH_YANG].o + CHASE.bars[CH_YANG].c) / 2), 0.2);
  const hi7 = pr(cx(CHASE, CH_DIV[2]), cy(CHASE, CHASE.bars[CH_DIV[2]].h) + 0.14, 0.3);
  const wall = pr(cx(CHASE, CH_WALL_I) + 0.5, cy(CHASE, CH_WALL.hi), 0.45);
  const you = pr(cx(CHASE, CH_WALL_I) + 0.2, cy(CHASE, CH_WALL.lo) - 0.1, 0.55);
  return (
    <>
      <Headline f={f} id="chase" from={E("chaseIn") + 12} to={end} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: E("cYang") + 6, until: E("cDone"), draw: (a) => <Callout a={a} at={yang} dx={-60} dy={-200} zh={T.yang} accent={COL.up} /> },
          { at: E("cDone"), until: E("cFade"), draw: (a) => <Callout a={a} at={yangMid} dx={70} dy={140} zh={T.done} accent={INK} /> },
          { at: E("cNoHigh"), until: E("cBig"), draw: (a) => <Callout a={a} at={hi7} dx={-60} dy={-210} zh={T.divPrice} sub={T.divDelta} accent={COL.gold} /> },
          { at: E("cAbs"), until: E("cYou"), draw: (a) => <Callout a={a} at={wall} dx={-40} dy={-200} zh={T.wall} sub={T.wallSub} accent={COL.up} /> },
          { at: E("cExit"), draw: (a) => <Callout a={a} at={you} dx={40} dy={230} zh={T.exit} sub={T.exitSub} accent={INK} /> },
        ]}
      />
      <Tag a={win(f, E("cYou") + 4, E("cExit"), 8, 8)} at={pr(cx(CHASE, CH_WALL_I) + 1.0, cy(CHASE, CH_WALL.lo) - 0.75, 0.55)} text={T.you} color={INK} size={38} />
    </>
  );
};

const Three: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("absIn");
  const cav = E("cav1");
  const listA = win(f, E("tThree"), cav, 10, 8);
  const act = [E("t1"), E("t2"), E("t3")];
  const dTop = pr(cx(TH, 5), TH.vb + TH.bars[5].d * VOL_K * 1.25 + 0.05, 0.2);
  const push = pr(cx(TH, TH_PUSH) - 0.31, cy(TH, (TH.bars[TH_PUSH].o + TH.bars[TH_PUSH].c) / 2), 0.3);
  const near = pr(cx(TH, TH_NEAR[0]) - 0.36, cy(TH, 101.95), 0.3);
  const far = pr(cx(TH, TH_FAR[0]) - 0.36, cy(TH, 104.2), 0.3);
  const grey = pr(cx(TH, 2), cy(TH, TH.bars[2].h) + 0.1, 0);
  return (
    <>
      <Headline f={f} id="three" from={E("threeIn") + 12} to={E("tThree")} />
      <Card a={listA} top={208}>
        {T.checks.map(([t, q], i) => {
          const on = ramp(f, act[i], 8);
          const cur = i === 2 ? on : on * (1 - ramp(f, act[i + 1], 8));
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 18, opacity: 0.3 + 0.7 * on }}>
              <div style={{ ...num(700), fontSize: 40, color: COL.gold, width: 30 }}>{i + 1}</div>
              <div style={{ ...sans(900), fontSize: 46, color: cur > 0.5 ? COL.gold : INK, width: 300 }}>{t}</div>
              <div style={{ ...sans(700), fontSize: 36, color: SOFT }}>{q}</div>
            </div>
          );
        })}
      </Card>
      <Card a={win(f, cav, end, 10, 10)} top={208} accent={COL.up}>
        <div style={{ ...sans(900), fontSize: 52, color: INK }}>{T.cav1}</div>
        <div style={{ ...sans(900), fontSize: 52, color: INK, opacity: 0.25 + 0.75 * ramp(f, E("cav2"), 10) }}>{T.cav2}</div>
      </Card>
      <Sequence
        f={f}
        end={cav}
        items={[
          { at: E("tColor"), until: E("t1"), draw: (a) => <Callout a={a} at={grey} dx={-40} dy={-200} zh={T.noColor} accent={INK} /> },
          { at: E("t1exp"), until: E("t2") + 24, draw: (a) => <Callout a={a} at={dTop} dx={70} dy={-170} zh={T.dExp} accent={COL.up} /> },
          { at: E("t2go"), until: E("t3a"), draw: (a) => <Callout a={a} at={push} dx={-80} dy={120} zh={T.advance} accent={COL.gold} /> },
          { at: E("t3a"), until: E("t3c"), draw: (a) => <Callout a={a} at={near} dx={-60} dy={-200} zh={T.near} accent={COL.gold} /> },
          { at: E("t3c"), draw: (a) => <Callout a={a} at={far} dx={-120} dy={-120} zh={T.far} accent={COL.up} /> },
        ]}
      />
      <Tag a={win(f, E("t3"), end, 10, 10)} at={pr(cx(TH, TH.bars.length - 1) + 0.45, cy(TH, THREE_LEVEL) - 0.32, 0.4)} text={T.structure} color={COL.gold} size={32} align="right" />
    </>
  );
};

const Absorb: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("logicIn");
  const s = bookAbsorb(f);
  const x = X.absorb;
  const plate = pr(x + BOOK_CANDLE_DX - 0.45, ly(s.price) - 0.2, 0.66);
  const askW = pr(x + (s.cfg.asks[0] * SIZE_W) / 2, ly(1), 0.4);
  const bidW = pr(x + (s.cfg.bids[0] * SIZE_W) / 2, ly(-1), 0.4);
  const whereA = win(f, E("abWhere"), end, 10, 10);
  const mid = pr(x + 1.45, ly(s.price), 0.6);
  return (
    <>
      <Headline f={f} id="absorb" from={E("absIn") + 12} to={E("abWhere")} />
      <Sequence
        f={f}
        end={E("abWhere")}
        items={[
          { at: E("abStill"), until: E("abPasS"), draw: (a) => <Callout a={a} at={plate} dx={-30} dy={-240} zh={T.still} accent={COL.gold} /> },
          { at: E("abPasS"), until: E("abSell"), draw: (a) => <Callout a={a} at={askW} dx={-60} dy={-240} zh={T.absS} accent={COL.up} /> },
          { at: E("abHold"), until: E("abPasB"), draw: (a) => <Callout a={a} at={plate} dx={-30} dy={200} zh={T.hold} accent={COL.gold} /> },
          { at: E("abPasB"), draw: (a) => <Callout a={a} at={bidW} dx={-60} dy={220} zh={T.absB} accent={COL.down} /> },
        ]}
      />
      <Card a={whereA} top={222} center accent={COL.gold}>
        <div style={{ ...sans(900), fontSize: 56, color: INK, textAlign: "center" }}>{T.where}</div>
        <div style={{ ...sans(900), fontSize: 50, color: COL.gold, textAlign: "center", opacity: 0.2 + 0.8 * ramp(f, E("abNo"), 10) }}>{T.noRush}</div>
      </Card>
      {whereA > 0.002 && (
        <svg width={1440} height={2560} style={{ position: "absolute", inset: 0, opacity: whereA }}>
          {[-1, 1].map((d) => {
            const k = out3((f - E("abWhere") - 4) / 16);
            const y0 = mid.y + d * 30;
            const y1 = y0 + d * 190 * k;
            return (
              <g key={d}>
                <line x1={mid.x} y1={y0} x2={mid.x} y2={y1} stroke={d < 0 ? COL.up : COL.down} strokeWidth={8} strokeDasharray="16 12" strokeLinecap="round" opacity={0.85} />
                <polygon points={`${mid.x - 18},${y1} ${mid.x + 18},${y1} ${mid.x},${y1 + d * 30}`} fill={d < 0 ? COL.up : COL.down} opacity={k} />
              </g>
            );
          })}
          <text x={mid.x + 34} y={mid.y + 22} fill={INK} fontSize={64} style={{ ...sans(900) }}>
            ?
          </text>
        </svg>
      )}
    </>
  );
};

const Logic: React.FC<{ f: number }> = ({ f }) => {
  const end = E("endIn");
  const chipsA = win(f, E("lgNo1"), E("lg1"), 10, 10);
  const stepsA = win(f, E("lg1"), end, 10, 10);
  const act = [E("lg1"), E("lg2"), E("lg3"), E("lg4")];
  const no = (s: string, k: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: 0.2 + 0.8 * k }}>
      <div style={{ ...sans(900), fontSize: 52, color: COL.up }}>✗</div>
      <div style={{ ...sans(900), fontSize: 54, color: INK }}>{s}</div>
    </div>
  );
  return (
    <>
      <Headline f={f} id="logic" from={E("logicIn") + 12} to={E("lgNo1")} />
      <Card a={chipsA} top={208} accent={COL.up}>
        {no(T.noChase, ramp(f, E("lgNo1"), 10))}
        {no(T.noFollow, ramp(f, E("lgNo2"), 10))}
      </Card>
      <Card a={stepsA} top={208}>
        {T.steps.map(([n, t, q], i) => {
          const on = ramp(f, act[i], 8);
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 18, opacity: 0.28 + 0.72 * on }}>
              <div style={{ ...num(700), fontSize: 38, color: COL.gold, width: 28 }}>{n}</div>
              <div style={{ ...sans(900), fontSize: 46, color: INK, width: 290 }}>{t}</div>
              <div style={{ ...sans(700), fontSize: 36, color: SOFT }}>{q}</div>
            </div>
          );
        })}
      </Card>
    </>
  );
};

const End: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const endIn = E("endIn");
  const next = E("next");
  const qa = win(f, endIn, next, 12, 10);
  const na = ramp(f, next + 2, 14);
  const pickA = ramp(f, E("chipYang"), 10);
  const pickB = ramp(f, E("chipAct"), 10);
  const cA = pr(END_CANDLE.x, END_CANDLE.l - 0.2, 0);
  const cB = pr(END_BOOK_X, -1.8, 0);
  const chip = (at: Pt, s: string, sub: string, k: number, show: number, color: string) => (
    <div style={{ position: "absolute", left: Math.min(SAFE.r - 600, Math.max(SAFE.l, at.x - 300)), width: 600, top: Math.min(SAFE.bottom - 150, at.y + 10), textAlign: "center", opacity: show * qa }}>
      <div style={{ display: "inline-block", ...sans(900), fontSize: 72, color: k > 0.5 ? "#06080d" : color, background: k > 0.5 ? color : "rgba(5,8,14,0.7)", border: `3px solid ${color}`, borderRadius: 16, padding: "4px 44px 10px", transform: `scale(${0.92 + 0.08 * backOut(k)})` }}>{s}</div>
      <div style={{ ...sans(700), fontSize: 36, color: SOFT, marginTop: 12 }}>{sub}</div>
    </div>
  );
  return (
    <>
      {qa > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 300, opacity: qa, textAlign: "center" }}>
          <div style={{ ...sans(900), fontSize: 84, color: INK }}>{T.q1}</div>
          <div style={{ ...sans(700), fontSize: 52, color: COL.gold, marginTop: 24, opacity: ramp(f, E("qComment"), 10) }}>{T.q2}</div>
        </div>
      )}
      {chip(cA, T.qA, T.qAsub, pickA, ramp(f, E("qYang"), 10), COL.gold)}
      {chip(cB, T.qB, T.qBsub, pickB, ramp(f, E("qAct"), 10), COL.up)}
      {na > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 320, opacity: na, transform: `translateY(${(1 - na) * 24}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
          <div style={{ ...sans(900), fontSize: 40, color: "#06080d", background: COL.gold, borderRadius: 10, padding: "2px 22px" }}>{T.nextTag}</div>
          <div style={{ ...serif(900), fontSize: 96, color: INK }}>{T.next1}</div>
          <div style={{ ...sans(900), fontSize: 64, color: INK, opacity: 0.3 + 0.7 * ramp(f, E("nAcc"), 10) }}>{T.next2}</div>
          <div style={{ ...sans(900), fontSize: 64, color: COL.gold, opacity: 0.3 + 0.7 * ramp(f, E("nDist"), 10) }}>{T.next3}</div>
        </div>
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
      <TopBar />
      {f < E("buyIn") + 12 && <Hook f={f} />}
      {S("buyIn", "sellIn") && <In f={f} at="buyIn"><Buy f={f} pr={pr} /></In>}
      {S("sellIn", "chaseIn") && <In f={f} at="sellIn"><Sell f={f} pr={pr} /></In>}
      {S("chaseIn", "threeIn") && <In f={f} at="chaseIn"><Chase f={f} pr={pr} /></In>}
      {S("threeIn", "absIn") && <In f={f} at="threeIn"><Three f={f} pr={pr} /></In>}
      {S("absIn", "logicIn") && <In f={f} at="absIn"><Absorb f={f} pr={pr} /></In>}
      {S("logicIn", "endIn") && <In f={f} at="logicIn"><Logic f={f} /></In>}
      {S("endIn", null) && <In f={f} at="endIn"><End f={f} pr={pr} /></In>}
      <Captions f={f} />
    </div>
  );
};

