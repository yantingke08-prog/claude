// 2D layer over the 3D stage. Rules: one main message per section (top band), at most one callout at a time,
// every element appears on the word that names it (events), and captions show a whole sentence or meaning unit.
// Safe area: x 60..1380; callouts y 400..1610; explanation strip y 1600..1890; captions y >= 1960.
import React from "react";
import { E, backOut, captions, clamp01, out3, ramp, win } from "./cue";
import { A_HIGH, A_LOW, BAD_STOP, B_HIGH, GOOD_STOP, HUNT, LADDER_X, ROUND, SA, SB, SC, SERIES_A, SERIES_REAL, SPIKE_I, STACK_B, STACK_HI, STACK_LO, TEST_WICK, TOUCH, XS, YOU_BRICK, avgVol, px, py, FLOOR_Y } from "./data";
import { projector, type Proj } from "./director";
import { num, sans, serif } from "./fonts";
import { Strip } from "./strip";
import { T } from "./text";
import { COL, GOLD_SLAB, VB_TRAY, barsA, barsB, barsC, bufferSpan } from "./world";

export const SAFE = { l: 60, r: 1380, top: 400, bottom: 1610, cap: 1962 };
const INK = "#f3ead9";
const SOFT = "rgba(243,234,217,0.66)";
const PLATE = "rgba(5,8,14,0.84)";
type Pt = { x: number; y: number };
const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? 0.55 : 1) * size, 0);

/** one callout: a dot on the 3D anchor, a short leader, a plate placed by dx/dy and clamped into the safe area */
const Callout: React.FC<{ a: number; at: Pt; dx: number; dy: number; zh: string; sub?: string; accent: string; size?: number }> = ({ a, at, dx, dy, zh, sub, accent, size = 46 }) => {
  if (a <= 0.002) return null;
  const subSize = Math.round(size * 0.7);
  const padX = 26;
  const w = Math.max(textW(zh, size), sub ? textW(sub, subSize) : 0) + padX * 2 + 10;
  const h = size * 1.32 + (sub ? subSize * 1.4 : 0) + 22;
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
        <circle cx={at.x} cy={at.y} r={8} fill="none" stroke={accent} strokeWidth={3.5} opacity={a} />
        <circle cx={at.x} cy={at.y} r={3.5} fill={accent} opacity={a} />
        <line x1={at.x} y1={at.y} x2={at.x + (ex - at.x) * k} y2={at.y + (ey - at.y) * k} stroke={accent} strokeWidth={2.5} opacity={0.8 * a} />
      </svg>
      <div style={{ position: "absolute", left: x, top: y + (1 - k) * 12, width: w, opacity: a, padding: `10px ${padX}px 12px`, background: PLATE, borderLeft: `6px solid ${accent}`, borderRadius: 12, boxSizing: "border-box", whiteSpace: "nowrap" }}>
        <div style={{ ...sans(900), fontSize: size, lineHeight: 1.32, color: INK }}>{zh}</div>
        {sub && <div style={{ ...sans(700), fontSize: subSize, lineHeight: 1.4, color: accent }}>{sub}</div>}
      </div>
    </>
  );
};

/** the section's single main message, in the top band */
const Headline: React.FC<{ f: number; id: string; from: number; to: number; color?: string }> = ({ f, id, from, to, color = COL.gold }) => {
  const a = win(f, from, to, 10, 10);
  if (a <= 0.002) return null;
  const [n, zh] = T.head[id];
  const k = out3((f - from) / 14);
  return (
    <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 214, opacity: a, display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ ...(n.length > 2 ? sans(900) : num(700)), fontSize: 34, color: "#06080d", background: color, borderRadius: 8, padding: "2px 14px", flexShrink: 0 }}>{n}</div>
      <div style={{ ...sans(900), fontSize: zh.length > 14 ? 50 : 60, lineHeight: 1.2, color: INK, transform: `translateY(${(1 - k) * 14}px)` }}>{zh}</div>
    </div>
  );
};

const TopBar: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: SAFE.l, top: 110, display: "flex", alignItems: "baseline", gap: 16 }}>
      <div style={{ ...sans(900), fontSize: 34, color: INK, letterSpacing: 2 }}>{T.series}</div>
      <div style={{ ...sans(700), fontSize: 28, color: SOFT }}>{T.seriesSub}</div>
    </div>
    <div style={{ position: "absolute", right: SAFE.l, top: 110, ...sans(700), fontSize: 28, color: COL.gold, padding: "2px 14px", border: `2px solid rgba(233,180,76,0.5)`, borderRadius: 8 }}>{T.risk}</div>
    <div style={{ position: "absolute", right: SAFE.l, top: 162, ...sans(500), fontSize: 22, color: SOFT }}>{T.tagB}</div>
  </>
);

const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to);
  if (!c) return null;
  const a = Math.min(clamp01((f - c.from) / 4), clamp01((c.to - f) / 4));
  return (
    <div style={{ position: "absolute", left: SAFE.l - 30, right: SAFE.l - 30, top: SAFE.cap, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ background: "rgba(3,5,10,0.8)", borderRadius: 16, padding: "6px 30px 12px", textAlign: "center" }}>
        {c.rows.map((r, i) => (
          <div key={i} style={{ ...sans(700), fontSize: 58, lineHeight: "80px", color: INK, whiteSpace: "nowrap" }}>
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
      const until = s.until ?? (i + 1 < items.length ? items[i + 1].at : end);
      const a = win(f, s.at, until, 8, 8);
      return a > 0.002 ? <React.Fragment key={i}>{s.draw(a)}</React.Fragment> : null;
    })}
  </>
);

// ================================================================= sections
const Hook: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const reveal = E("reveal");
  const titleA = 1 - ramp(f, reveal, 14);
  const k1 = backOut((f - 1) / 14);
  const you = pr(YOU_BRICK.x, YOU_BRICK.y, YOU_BRICK.z + YOU_BRICK.d / 2);
  const mid = STACK_HI[Math.floor(STACK_HI.length / 2)];
  const pile = pr(mid.x, mid.y + 0.2, mid.z);
  return (
    <>
      {titleA > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 300, opacity: titleA, textAlign: "center" }}>
          <div style={{ ...serif(900), fontSize: 136, lineHeight: 1.15, color: INK, transform: `scale(${0.92 + 0.08 * k1})` }}>{T.hook1}</div>
          <div style={{ ...sans(900), fontSize: 84, lineHeight: 1.35, color: COL.gold }}>{T.hook2}</div>
        </div>
      )}
      <Headline f={f} id="hook" from={E("reveal") + 8} to={E("liqIn")} />
      <Sequence
        f={f}
        end={E("liqIn") + 6}
        items={[
          { at: 6, until: E("seeYou") + 8, draw: (a) => <Callout a={a} at={you} dx={-60} dy={150} zh={T.you} accent={INK} size={50} /> },
          { at: E("seeLiq"), draw: (a) => <Callout a={a} at={pile} dx={-40} dy={-260} zh={T.liq} accent={COL.gold} size={52} /> },
        ]}
      />
    </>
  );
};

const Liq: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("mechIn");
  const thick = pr(LADDER_X + 4.0, 0.3, -0.3);
  const blk = pr(LADDER_X - 0.6, 0.3, 0.1);
  return (
    <>
      <Headline f={f} id="liq" from={E("liqRow")} to={end} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: E("liqMany") + 6, draw: (a) => <Callout a={a} at={thick} dx={20} dy={-190} zh={T.thick} accent={COL.gold} /> },
          { at: E("liqDone"), draw: (a) => <Callout a={a} at={blk} dx={-20} dy={260} zh={T.fill} accent={INK} /> },
        ]}
      />
    </>
  );
};

const Mech: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  // anchors on bricks of the bottom layer, which exist from the first moment the stack starts to build
  const hi = STACK_HI.find((b) => b.layer === 0 && b.k === 3)!;
  const lo = STACK_LO.find((b) => b.layer === 0 && b.k === 3)!;
  const A = barsA(f)[HUNT];
  const tip = pr(px(HUNT), py(Math.max(A.h, A.c)), 0);
  const vTop = pr(px(HUNT), FLOOR_Y + SERIES_A[HUNT].v * 0.32 + 0.1, 0);
  const slab = pr(GOLD_SLAB.x, GOLD_SLAB.y - GOLD_SLAB.h / 2, GOLD_SLAB.z + GOLD_SLAB.d / 2);
  return (
    <>
      <Headline f={f} id="mech" from={E("buyTag")} to={E("wickIn")} />
      <Sequence
        f={f}
        end={E("wickIn") + 4}
        items={[
          { at: E("shortStops"), draw: (a) => <Callout a={a} at={pr(hi.x, hi.y + 0.1, hi.z)} dx={-60} dy={-230} zh={T.short} sub={T.shortSub} accent={COL.up} /> },
          { at: E("longStops"), draw: (a) => <Callout a={a} at={pr(lo.x, lo.y - 0.1, lo.z)} dx={-60} dy={190} zh={T.long} sub={T.longSub} accent={COL.down} /> },
          { at: E("hidden") + 4, draw: (a) => <Callout a={a} at={pr(hi.x, hi.y + 0.1, hi.z)} dx={-80} dy={-240} zh={T.hidden} accent={INK} /> },
          { at: E("fire") + 6, draw: (a) => <Callout a={a} at={tip} dx={-120} dy={-200} zh={T.fire} accent={COL.up} /> },
          { at: E("volume") + 14, draw: (a) => <Callout a={a} at={vTop} dx={-140} dy={-220} zh={T.volume} sub={T.volumeSub} accent={COL.up} /> },
          { at: E("counter") + 8, draw: (a) => <Callout a={a} at={slab} dx={20} dy={170} zh={T.counter} accent={INK} /> },
        ]}
      />
    </>
  );
};

const Wick: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const tip = pr(px(HUNT), py(SERIES_A[HUNT].h), 0);
  const mid = STACK_HI[7];
  return (
    <>
      <Headline f={f} id="wick" from={E("look")} to={E("pollIn")} />
      <Sequence
        f={f}
        end={E("pollIn") + 4}
        items={[
          { at: E("wickTag"), draw: (a) => <Callout a={a} at={tip} dx={70} dy={-150} zh={T.wick} accent={COL.gold} size={60} /> },
          { at: E("pileUnder") + 4, draw: (a) => <Callout a={a} at={pr(mid.x, mid.y + 0.2, mid.z)} dx={-40} dy={-250} zh={T.under} accent={COL.up} /> },
        ]}
      />
    </>
  );
};

const Poll: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("checkIn");
  const lvl = (p: number) => pr(px(27), py(p), 0.36);
  const tag = (p: Pt, zh: string, extra: string, a: number, above = true) =>
    a <= 0.002 ? null : (
      <div style={{ position: "absolute", left: SAFE.l, top: p.y + (above ? -60 : 12), opacity: a, display: "flex", gap: 12, alignItems: "baseline" }}>
        <span style={{ ...sans(900), fontSize: 42, color: COL.gold }}>{zh}</span>
        <span style={{ ...num(500), fontSize: 30, color: SOFT }}>{extra}</span>
      </div>
    );
  const d0 = E("danmaku");
  return (
    <>
      <Headline f={f} id="poll" from={E("pollIn") + 4} to={E("same")} />
      <Headline f={f} id="pollB" from={E("visible")} to={end} />
      {tag(lvl(A_HIGH), T.lvHigh, A_HIGH.toFixed(2), win(f, E("lvHigh"), end, 8, 10), false)}
      {tag(lvl(A_LOW), T.lvLow, A_LOW.toFixed(2), win(f, E("lvLow"), end, 8, 10), false)}
      {tag(lvl(ROUND), T.lvRound, ROUND.toFixed(2), win(f, E("round"), end, 8, 10))}
      {T.danmaku.map((s, i) => {
        const u = (f - (d0 + i * 9)) / 90;
        if (u < 0 || u > 1) return null;
        const w = textW(s, 40) + 56;
        return (
          <div key={i} style={{ position: "absolute", left: 1440 - (1440 + w) * u, top: 330 + [0, 1, 2, 0, 1, 2, 0][i] * 70, ...sans(700), fontSize: 40, color: INK, background: "rgba(10,14,24,0.7)", border: "1.5px solid rgba(243,234,217,0.25)", borderRadius: 28, padding: "2px 26px" }}>
            {s}
          </div>
        );
      })}
    </>
  );
};

const Checks: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const testIn = E("testIn");
  const listA = win(f, E("c1"), E("testTag"), 10, 8);
  const act = [E("c1"), E("c2"), E("c3")];
  const done = [E("c1vol") + 14, E("c2hold") + 10, E("c3catch") + 12];
  const fail = [E("back") + 4, E("noFollow"), E("noFollow") + 10];
  const B = barsB(f);
  const vTop = pr(px(TOUCH, SB), VB_TRAY + SERIES_REAL[TOUCH].v * 0.36 + 0.08, 0);
  const hold = pr(px(TOUCH + 1, SB), py(SERIES_REAL[TOUCH + 1].h, SB) + 0.1, 0);
  const catchP = pr(px(TOUCH + 3, SB), py(B_HIGH, SB) - 0.25, 0.3);
  const tip = pr(px(TOUCH, SB), py(Math.max(B[TOUCH].h, B[TOUCH].c), SB) + 0.05, 0);
  const avg = avgVol(SERIES_REAL, TOUCH);
  return (
    <>
      <Headline f={f} id="check" from={E("checkIn") + 4} to={E("c1")} />
      {listA > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, top: 200, opacity: listA, background: PLATE, borderLeft: `6px solid ${COL.gold}`, borderRadius: 14, padding: "14px 28px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {T.checks.map(([t, q], i) => {
            const on = ramp(f, act[i], 8);
            const ok = f < testIn ? ramp(f, done[i], 8) : 0;
            const no = f >= testIn ? ramp(f, fail[i], 8) : 0;
            const mark = Math.max(ok, no);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, opacity: 0.32 + 0.68 * on }}>
                <div style={{ ...num(700), fontSize: 34, color: COL.gold, width: 30 }}>{i + 1}</div>
                <div style={{ ...sans(900), fontSize: 44, color: INK, width: 200 }}>{t}</div>
                <div style={{ ...sans(700), fontSize: 42, color: SOFT, width: 260 }}>{q}</div>
                <div style={{ ...sans(900), fontSize: 48, width: 50, color: no > 0.01 ? COL.down : COL.gold, opacity: mark, transform: `scale(${0.6 + 0.4 * backOut(mark)})` }}>{no > 0.01 ? "✗" : "✓"}</div>
              </div>
            );
          })}
        </div>
      )}
      <Headline f={f} id="test" from={E("testTag") + 2} to={E("stopIn")} color={COL.gold} />
      <Sequence
        f={f}
        end={E("stopIn")}
        items={[
          { at: E("c1vol") + 4, draw: (a) => <Callout a={a} at={vTop} dx={60} dy={-200} zh={T.c1} sub={`${T.avg} ${avg.toFixed(1)} → ${SERIES_REAL[TOUCH].v.toFixed(1)}`} accent={COL.up} /> },
          { at: E("c2hold"), draw: (a) => <Callout a={a} at={hold} dx={80} dy={-170} zh={T.c2} accent={COL.gold} /> },
          { at: E("c3catch") + 4, until: testIn, draw: (a) => <Callout a={a} at={catchP} dx={90} dy={150} zh={T.c3} accent={COL.up} /> },
          { at: E("pierce") + 10, until: E("testTag"), draw: (a) => <Callout a={a} at={tip} dx={80} dy={-170} zh={T.pierce} accent={COL.down} /> },
        ]}
      />
    </>
  );
};

const Stop: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("coreIn");
  const bad = pr(px(31, SB), py(BAD_STOP, SB), 0.3);
  const span = bufferSpan(f);
  const band = pr(px(23, SC), (py(TEST_WICK, SC) + py(GOOD_STOP(span), SC)) / 2, 0.36);
  const tuneA = win(f, E("tune"), end, 10, 10);
  const hiVol = ramp(f, E("vol"), 14);
  const struct = pr(px(20, SC), py(TEST_WICK, SC), 0.36);
  return (
    <>
      <Headline f={f} id="stopA" from={E("badStop")} to={E("goodIn")} />
      <Headline f={f} id="stopB" from={E("buffer")} to={end} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: E("badStop") + 6, draw: (a) => <Callout a={a} at={bad} dx={60} dy={-220} zh={T.bad} accent={INK} /> },
          { at: E("badHit") + 6, until: E("goodIn") + 4, draw: (a) => <Callout a={a} at={bad} dx={60} dy={-220} zh={T.badHit} accent={COL.up} /> },
          { at: E("buffer") + 6, until: E("tune") + 2, draw: (a) => <Callout a={a} at={band} dx={-40} dy={-260} zh={T.good} accent={COL.gold} /> },
        ]}
      />
      {win(f, E("buffer") + 12, end, 10, 10) > 0.002 && (
        <div style={{ position: "absolute", left: 520, top: struct.y + 14, opacity: win(f, E("buffer") + 12, end, 10, 10), ...sans(700), fontSize: 32, color: SOFT }}>
          {T.structure} {TEST_WICK.toFixed(2)}
        </div>
      )}
      {tuneA > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 330, opacity: tuneA, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, background: PLATE, borderRadius: 14, padding: "12px 26px" }}>
            <div style={{ position: "relative", width: 260, height: 14, borderRadius: 7, background: "rgba(243,234,217,0.16)" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${25 + 70 * hiVol}%`, borderRadius: 7, background: COL.gold }} />
            </div>
            <div style={{ ...sans(700), fontSize: 40, color: INK, width: 340 }}>{f < E("vol") ? T.lowVol : T.highVol}</div>
          </div>
        </div>
      )}
    </>
  );
};

const Core: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const coreIn = E("coreIn");
  const endIn = E("endIn");
  const a = win(f, Math.max(coreIn, E("coreIn")), endIn, 12, 12);
  const k2 = ramp(f, E("notYou"), 12);
  const k3 = ramp(f, E("away"), 14);
  const you = pr(px(31, SC), py(GOOD_STOP(bufferSpan(f)), SC) + 0.1, 0.3);
  return (
    <>
      {a > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 340, opacity: a, textAlign: "center" }}>
          <div style={{ ...serif(900), fontSize: 100, lineHeight: 1.25, color: INK }}>{T.core1}</div>
          <div style={{ ...serif(900), fontSize: 128, lineHeight: 1.25, color: COL.gold, opacity: k2, transform: `translateY(${(1 - k2) * 18}px)` }}>{T.core2}</div>
          <div style={{ ...sans(700), fontSize: 48, lineHeight: 1.6, color: SOFT, opacity: k3, marginTop: 10 }}>{T.core3}</div>
        </div>
      )}
      <Callout a={win(f, E("away") + 8, endIn, 10, 10)} at={you} dx={60} dy={150} zh={T.youSafe} accent={INK} />
    </>
  );
};

const End: React.FC<{ f: number }> = ({ f }) => {
  const endIn = E("endIn");
  const next = E("next");
  const qa = win(f, endIn, next, 12, 10);
  const na = ramp(f, next + 2, 14);
  const pickA = ramp(f, E("qA"), 10);
  const pickB = ramp(f, E("q2"), 10);
  const chip = (s: string, k: number) => (
    <div style={{ ...sans(900), fontSize: 64, color: k > 0.5 ? "#06080d" : COL.gold, background: k > 0.5 ? COL.gold : "transparent", border: `3px solid ${COL.gold}`, borderRadius: 16, padding: "6px 42px 10px", transform: `scale(${0.92 + 0.08 * backOut(k)})` }}>{s}</div>
  );
  return (
    <>
      {qa > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 560, opacity: qa, display: "flex", flexDirection: "column", alignItems: "center", gap: 44 }}>
          <div style={{ ...sans(900), fontSize: 76, color: INK }}>{T.q1}</div>
          <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
            {chip(T.qA, pickA)}
            <div style={{ ...sans(700), fontSize: 44, color: SOFT }}>{T.qOr}</div>
            {chip(T.qB, pickB)}
          </div>
          <div style={{ ...sans(700), fontSize: 50, color: INK, opacity: ramp(f, E("comment"), 10) }}>{T.q2}</div>
        </div>
      )}
      {na > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 540, opacity: na, transform: `translateY(${(1 - na) * 24}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <div style={{ ...sans(900), fontSize: 38, color: "#06080d", background: COL.gold, borderRadius: 10, padding: "2px 20px" }}>{T.nextTag}</div>
          <div style={{ ...sans(900), fontSize: 84, color: INK }}>{T.next1}</div>
          <NextRow f={f} at={E("push")} up text={T.nextUp} />
          <NextRow f={f} at={E("absorb")} text={T.nextAbs} />
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1800, textAlign: "center", opacity: ramp(f, endIn + 6, 20), ...sans(700), fontSize: 40, color: COL.gold }}>{T.risk}</div>
    </>
  );
};
const NextRow: React.FC<{ f: number; at: number; up?: boolean; text: string }> = ({ f, at, up, text }) => {
  const k = ramp(f, at, 14);
  const color = up ? COL.up : INK;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, opacity: 0.3 + 0.7 * k }}>
      <svg width={140} height={80}>
        {up ? (
          <polyline points={`10,70 ${10 + 60 * k},${70 - 42 * k} ${10 + 116 * k},${70 - 58 * k}`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <>
            <line x1={10} y1={40} x2={10 + 90 * k} y2={40} stroke={color} strokeWidth={8} strokeLinecap="round" />
            <rect x={106} y={22} width={26} height={36} rx={4} fill={color} opacity={0.3 + 0.7 * k} />
          </>
        )}
      </svg>
      <div style={{ ...sans(900), fontSize: 54, color }}>{text}</div>
    </div>
  );
};

/** live price tag riding on the candle that is printing right now */
const Ticker: React.FC<{ at: Pt; price: number; a: number; color: string }> = ({ at, price, a, color }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: Math.min(SAFE.r - 170, at.x + 34), top: Math.max(300, at.y - 26), opacity: a, ...num(700), fontSize: 38, color: "#06080d", background: color, borderRadius: 8, padding: "0 12px" }}>
      {price.toFixed(2)}
    </div>
  );
const Tickers: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const A = barsA(f)[HUNT];
  const B = barsB(f);
  const C = barsC(f)[SPIKE_I];
  const tipA = pr(px(HUNT), py(A.c), 0);
  const tB = B[TOUCH];
  const sB = B[SPIKE_I] as (typeof B)[number] | undefined; // the probe bar exists only after the test
  return (
    <>
      <Ticker at={tipA} price={A.c} a={win(f, E("hunt"), E("wickIn"), 6, 10)} color={A.c >= A.o ? COL.up : COL.down} />
      <Ticker at={pr(px(TOUCH, SB), py(tB.c, SB), 0)} price={tB.c} a={win(f, E("pierce"), E("noFollow"), 6, 10)} color={tB.c >= tB.o ? COL.up : COL.down} />
      {sB && <Ticker at={pr(px(SPIKE_I, SB), py(sB.c, SB), 0)} price={sB.c} a={win(f, E("badStop") + 14, E("goodIn"), 6, 10) * (sB.g > 0 ? 1 : 0)} color={sB.c >= sB.o ? COL.up : COL.down} />}
      <Ticker at={pr(px(SPIKE_I, SC), py(C.c, SC), 0)} price={C.c} a={win(f, E("goodHold"), E("tune") + 10, 6, 10) * (C.g > 0 ? 1 : 0)} color={C.c >= C.o ? COL.up : COL.down} />
    </>
  );
};

// ================================================================= the HUD
export const Hud: React.FC<{ f: number }> = ({ f }) => {
  const pr = projector(f);
  const S = (a: string, b: string) => f >= E(a) - 1 && f < E(b) + 12;
  return (
    <div style={{ position: "absolute", inset: 0, width: 1440, height: 2560, overflow: "hidden" }}>
      <TopBar />
      {f < E("liqIn") + 12 && <Hook f={f} pr={pr} />}
      {S("liqIn", "mechIn") && <Liq f={f} pr={pr} />}
      {S("mechIn", "wickIn") && <Mech f={f} pr={pr} />}
      {S("wickIn", "pollIn") && <Wick f={f} pr={pr} />}
      {S("pollIn", "checkIn") && <Poll f={f} pr={pr} />}
      {S("checkIn", "stopIn") && <Checks f={f} pr={pr} />}
      {S("stopIn", "coreIn") && <Stop f={f} pr={pr} />}
      {S("coreIn", "endIn") && <Core f={f} pr={pr} />}
      {f >= E("endIn") - 1 && <End f={f} />}
      <Strip f={f} />
      <Tickers f={f} pr={pr} />
      <Captions f={f} />
    </div>
  );
};

