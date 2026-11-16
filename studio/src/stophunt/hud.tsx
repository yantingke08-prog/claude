// 2D layer over the 3D set: callouts pinned to projected 3D anchors, chapter headers, cards, captions.
// Safe area: x 60..1380, labels stay between y 380 and 1900; captions own y 1960..2170; nothing below 2200.
import React from "react";
import { E, captions, clamp01, out3, ramp, win, backOut } from "./cue";
import { A_HIGH, A_LOW, CUBE, HUNT, ROUND, SERIES_A, SERIES_REAL, TEST_WICK, TOUCH, avgVol, px, py } from "./data";
import { LADDER_X, YOU, projector, type Proj } from "./director";
import { num, sans, serif } from "./fonts";
import { T } from "./text";
import { COL, GOLD, VA_Y, VB_Y, barsA, barsB, ladderBlock, stopPlan } from "./world";

export const SAFE = { l: 60, r: 1380, top: 380, bottom: 1900, cap: 1965 };
const INK = "#f3f6fb";
const SOFT = "rgba(222,231,245,0.72)";
const PLATE = "rgba(6,9,16,0.9)";

type Pt = { x: number; y: number };
const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? 0.56 : 1) * size, 0);

/**
 * Callout: dot on the 3D anchor, a leader, and a plate. The plate is placed by `dx/dy` from the anchor
 * (screen px) and then clamped into the safe area, so it never leaves the phone frame.
 */
const Callout: React.FC<{ f: number; a: number; at: Pt; dx: number; dy: number; zh: string; sub?: string; color: string; size?: number; dot?: boolean }> = ({ f, a, at, dx, dy, zh, sub, color, size = 46, dot = true }) => {
  if (a <= 0.002) return null;
  const subSize = Math.round(size * 0.66);
  const pad = Math.round(size * 0.5);
  const w = Math.max(textW(zh, size), sub ? textW(sub, subSize) : 0) + pad * 2 + 8;
  const h = size * 1.3 + (sub ? subSize * 1.35 : 0) + pad * 0.9;
  let x = at.x + dx - (dx < 0 ? w : 0);
  let y = at.y + dy - (dy < 0 ? h : 0);
  x = Math.min(SAFE.r - w, Math.max(SAFE.l, x));
  y = Math.min(SAFE.bottom - h, Math.max(SAFE.top, y));
  const ex = Math.min(x + w, Math.max(x, at.x));
  const ey = at.y < y ? y : at.y > y + h ? y + h : y + h / 2;
  const lead = out3(a * 1.4);
  const rise = (1 - out3(a)) * 14;
  return (
    <>
      <svg width={1440} height={2560} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {dot && <circle cx={at.x} cy={at.y} r={9 + 5 * (1 - out3(a))} fill="none" stroke={color} strokeWidth={4} opacity={a} />}
        {dot && <circle cx={at.x} cy={at.y} r={4} fill={color} opacity={a} />}
        <line x1={at.x} y1={at.y} x2={at.x + (ex - at.x) * lead} y2={at.y + (ey - at.y) * lead} stroke={color} strokeWidth={3} opacity={0.85 * a} />
      </svg>
      <div style={{ position: "absolute", left: x, top: y + rise, width: w, opacity: a, padding: `${pad * 0.45}px ${pad}px ${pad * 0.5}px`, background: PLATE, border: `3px solid ${color}`, borderRadius: 16, boxSizing: "border-box", whiteSpace: "nowrap" }}>
        <div style={{ ...sans(900), fontSize: size, lineHeight: 1.3, color: INK }}>{zh}</div>
        {sub && <div style={{ ...sans(700), fontSize: subSize, lineHeight: 1.35, color }}>{sub}</div>}
      </div>
    </>
  );
};

/** card in the top band (definitions, verdicts): never near the chart's busy middle */
const Card: React.FC<{ a: number; y?: number; children: React.ReactNode; color?: string; center?: boolean }> = ({ a, y = 420, children, color = COL.level, center = true }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: 0, right: 0, top: y + (1 - out3(a)) * 20, display: "flex", justifyContent: center ? "center" : "flex-start", paddingLeft: center ? 0 : SAFE.l, opacity: a }}>
      <div style={{ background: PLATE, border: `3px solid ${color}`, borderRadius: 22, padding: "22px 40px 26px", maxWidth: SAFE.r - SAFE.l, boxSizing: "border-box" }}>{children}</div>
    </div>
  );

const TopBar: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: SAFE.l, top: 104, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 16, height: 16, borderRadius: 8, background: COL.buyStop }} />
      <div style={{ ...sans(900), fontSize: 36, color: INK, letterSpacing: 2 }}>{T.series}</div>
      <div style={{ ...sans(700), fontSize: 30, color: SOFT }}>{T.seriesSub}</div>
    </div>
    <div style={{ position: "absolute", right: SAFE.l, top: 108, ...sans(700), fontSize: 30, color: "rgba(255,214,140,0.92)", padding: "4px 16px", border: "2px solid rgba(255,214,140,0.5)", borderRadius: 10 }}>{T.risk}</div>
  </>
);

const Header: React.FC<{ f: number; id: string; from: number; to: number }> = ({ f, id, from, to }) => {
  const a = win(f, from + 4, to, 12, 10);
  if (a <= 0.002) return null;
  const [n, zh] = T.heads[id];
  const k = out3((f - from - 4) / 16);
  return (
    <div style={{ position: "absolute", left: SAFE.l, top: 196, opacity: a, display: "flex", alignItems: "center", gap: 22 }}>
      <div style={{ ...num(700), ...(n.length > 2 ? sans(900) : {}), fontSize: 38, color: "#05070b", background: COL.level, borderRadius: 10, padding: "4px 16px", transform: `translateX(${(1 - k) * -30}px)` }}>{n}</div>
      <div style={{ ...sans(900), fontSize: 62, color: INK, transform: `translateY(${(1 - k) * 16}px)` }}>{zh}</div>
    </div>
  );
};

const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to);
  if (!c) return null;
  const a = Math.min(clamp01((f - c.from) / 4), clamp01((c.to - f) / 3));
  return (
    <div style={{ position: "absolute", left: SAFE.l - 20, right: SAFE.l - 20, top: SAFE.cap, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ ...sans(700), fontSize: 64, lineHeight: "88px", color: INK, padding: "4px 34px 10px", background: "rgba(3,5,10,0.82)", borderRadius: 16, whiteSpace: "nowrap" }}>{c.text}</div>
    </div>
  );
};

/** a ring on a 3D point (your stop) */
const Ring: React.FC<{ at: Pt; a: number; f: number; color?: string }> = ({ at, a, f, color = "#ffffff" }) =>
  a <= 0.002 ? null : (
    <svg width={1440} height={2560} style={{ position: "absolute", inset: 0 }}>
      <circle cx={at.x} cy={at.y} r={58 + 6 * Math.sin(f / 9)} fill="none" stroke={color} strokeWidth={4} opacity={a * 0.9} />
      <circle cx={at.x} cy={at.y} r={84 + ((f * 1.6) % 50)} fill="none" stroke={color} strokeWidth={2} opacity={a * 0.5 * (1 - ((f * 1.6) % 50) / 50)} />
    </svg>
  );

// ================================================================= sections
const Hook: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const reveal = E("reveal");
  const titleA = 1 - ramp(f, reveal + 10, 16);
  const k1 = backOut((f - 2) / 16);
  const k2 = out3((f - 10) / 16);
  const you = pr(...YOU);
  const youA = win(f, 6, E("seeYou") + 8, 10, 14);
  const pileC = pr(px(35), py(A_HIGH) + 0.42, -0.9);
  return (
    <>
      {titleA > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 300, opacity: titleA, textAlign: "center" }}>
          <div style={{ ...serif(900), fontSize: 132, lineHeight: 1.15, color: INK, transform: `scale(${0.9 + 0.1 * k1})`, opacity: clamp01(k1 * 2) }}>{T.hook1}</div>
          <div style={{ ...sans(900), fontSize: 86, lineHeight: 1.3, color: COL.level, transform: `translateY(${(1 - k2) * 24}px)`, opacity: k2 }}>{T.hook2}</div>
        </div>
      )}
      <Ring at={you} a={youA} f={f} />
      <Callout f={f} a={win(f, 14, reveal + 16, 10, 10)} at={you} dx={-110} dy={140} zh={T.you} color="#ffffff" size={52} dot={false} />
      <Callout f={f} a={win(f, reveal + 34, E("seeLiq") - 2, 12, 10)} at={pileC} dx={-60} dy={-210} zh={T.crowd} color={COL.buyStop} size={46} />
      <Callout f={f} a={win(f, E("seeLiq"), E("liqIn") + 4, 10, 10)} at={pileC} dx={-80} dy={-230} zh={T.liq} sub={T.liqSub} color={COL.level} size={72} />
    </>
  );
};

const Liq: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("mechIn") - 2;
  const defA = win(f, E("liqIn") + 30, end, 14, 10);
  const many = win(f, E("liqMany"), end, 12, 10);
  const thick = pr(LADDER_X + 0.4 + 9 * 0.72, 0.75, 0);
  const thin = pr(LADDER_X + 0.4 + 2 * 0.72 + 0.1, 2 * 0.86 + 0.2, 0);
  const blk = ladderBlock(f, 12);
  const big = pr(blk.x - blk.w / 2 + 0.2, -0.35, 0.35);
  return (
    <>
      <Card a={defA} y={400}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <div style={{ ...sans(900), fontSize: 70, color: COL.level }}>{T.liqDef1}</div>
          <div style={{ ...sans(700), fontSize: 44, color: INK }}>{T.liqDef2}</div>
        </div>
      </Card>
      {many > 0.002 && (
        <>
          <div style={{ position: "absolute", left: Math.min(SAFE.r - 200, thick.x - 80), top: thick.y - 70, opacity: many, ...sans(900), fontSize: 48, color: COL.gold, background: PLATE, padding: "0 14px", borderRadius: 10 }}>{T.thick}</div>
          <div style={{ position: "absolute", left: Math.min(SAFE.r - 200, thin.x + 24), top: thin.y - 30, opacity: many * 0.9, ...sans(700), fontSize: 42, color: SOFT, background: PLATE, padding: "0 14px", borderRadius: 10 }}>{T.thin}</div>
        </>
      )}
      <Callout f={f} a={win(f, E("liqFill") + 8, end, 12, 10)} at={big} dx={-20} dy={600} zh={T.bigFill} color={COL.gold} size={48} />
    </>
  );
};

const Mech: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const hiC = pr(px(31), py(A_HIGH) + 0.4, -0.9);
  const loC = pr(px(31), py(A_LOW) - 0.4, -0.9);
  const hunt = barsA(f)[HUNT];
  const tip = pr(px(HUNT), py(Math.max(hunt.h, hunt.c)), 0);
  const vTop = pr(px(HUNT), VA_Y + 4.4 * 0.42 * ramp(f, E("fire"), 34) + 0.1, 0);
  const gold = pr(GOLD.x, GOLD.y - GOLD.h / 2, GOLD.z + GOLD.d / 2);
  const wickIn = E("wickIn");
  const hidden = E("hidden");
  const pile = E("pile");
  const shown = Math.round(230 * (0.4 + 0.6 * ramp(f, pile, 60)) + 200 * (0.4 + 0.6 * ramp(f, pile, 60)));
  return (
    <>
      <Callout f={f} a={win(f, E("shortStops") + 4, hidden + 4, 12, 10)} at={hiC} dx={-40} dy={-200} zh={T.shortStop} sub={T.shortStopSub} color={COL.buyStop} size={50} />
      <Callout f={f} a={win(f, E("longStops") + 4, hidden + 4, 12, 10)} at={loC} dx={-40} dy={150} zh={T.longStop} sub={T.longStopSub} color={COL.sellStop} size={50} />
      <Card a={win(f, hidden + 6, E("hunt") - 10, 12, 10)} y={400} color={COL.buyStop}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 26 }}>
          <div style={{ ...sans(900), fontSize: 52, color: INK }}>{T.hidden}</div>
          <div style={{ ...num(700), fontSize: 60, color: COL.buyStop }}>{f < pile ? 172 : shown}</div>
          <div style={{ ...sans(700), fontSize: 34, color: SOFT }}>{T.hiddenUnit}</div>
        </div>
      </Card>
      <Callout f={f} a={win(f, E("hunt") + 6, E("volume") - 2, 10, 10)} at={tip} dx={-120} dy={-170} zh={T.hunt} color={COL.buyStop} size={50} />
      <Callout f={f} a={win(f, E("volume") + 4, E("counter") - 2, 10, 10)} at={vTop} dx={-160} dy={-330} zh={T.volume} sub={T.volumeSub} color={COL.gold} size={50} />
      <Callout f={f} a={win(f, E("counter") + 2, wickIn + 4, 10, 10)} at={gold} dx={10} dy={190} zh={T.counter} sub={T.counterSub} color={COL.gold} size={50} />
    </>
  );
};

const Wick: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const tip = pr(px(HUNT), py(SERIES_A[HUNT].h), 0);
  const under = pr(px(35), py(A_HIGH) + 0.4, -0.9);
  return (
    <>
      <Callout f={f} a={win(f, E("wickTag"), E("pileUnder") - 2, 10, 10)} at={tip} dx={60} dy={-150} zh={T.wick} color={COL.level} size={64} />
      <Callout f={f} a={win(f, E("pileUnder") + 8, E("pollIn") + 4, 12, 10)} at={under} dx={-40} dy={-230} zh={T.under} color={COL.buyStop} size={48} />
    </>
  );
};

const Poll: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("checkIn");
  // level names sit at the left end of each line, where the line is clear of piles and the sweep wick
  const lvl = (y: number) => pr(px(27), y, 0.34);
  const hi = lvl(py(A_HIGH));
  const lo = lvl(py(A_LOW));
  const rd = lvl(py(ROUND));
  const tag = (p: Pt, zh: string, extra: string, color: string, a: number, below = false) =>
    a <= 0.002 ? null : (
      <div style={{ position: "absolute", left: SAFE.l, top: p.y + (below ? 12 : -66), opacity: a, display: "flex", gap: 12, alignItems: "baseline", background: PLATE, padding: "2px 14px", borderRadius: 10, borderLeft: `6px solid ${color}` }}>
        <span style={{ ...sans(900), fontSize: 42, color }}>{zh}</span>
        <span style={{ ...num(700), fontSize: 34, color: SOFT }}>{extra}</span>
      </div>
    );
  const d0 = E("danmaku");
  return (
    <>
      {tag(hi, T.lvHigh, A_HIGH.toFixed(2), COL.level, win(f, E("levels"), end, 10, 10), true)}
      {tag(lo, T.lvLow, A_LOW.toFixed(2), COL.level, win(f, E("levels") + 8, end, 10, 10), true)}
      {tag(rd, T.lvRound, ROUND.toFixed(2), COL.round, win(f, E("round") + 4, end, 10, 10))}
      {T.danmaku.map((s, i) => {
        const t0 = d0 + i * 8;
        const u = (f - t0) / 96;
        if (u < 0 || u > 1) return null;
        const w = textW(s, 46) + 60;
        const x = 1440 - (1440 + w) * u;
        const lane = [0, 2, 1, 0, 2, 1, 0, 2, 1, 0][i];
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 300 + lane * 76, ...sans(700), fontSize: 42, color: s.includes("整") ? COL.round : COL.level, background: "rgba(10,14,24,0.72)", borderRadius: 30, padding: "4px 28px", whiteSpace: "nowrap", opacity: 0.95 }}>
            {s}
          </div>
        );
      })}
      <Card a={win(f, E("visible"), end, 12, 10)} y={400}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <div style={{ ...sans(900), fontSize: 56, color: INK }}>{T.visible}</div>
          <div style={{ ...sans(900), fontSize: 56, color: COL.level }}>→ {T.visibleSub}</div>
        </div>
      </Card>
    </>
  );
};

const CHECK_DONE = () => [E("c1vol") + 12, E("c2") + 30, E("c3catch") + 16];
const CHECK_FAIL = () => [E("back") + 4, E("back") + 16, E("noFollow") + 10];
const Checks: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const a = win(f, E("c1") - 6, E("testTag") - 2, 12, 10);
  const B = barsB(f);
  const testIn = E("testIn");
  const act = [E("c1"), E("c2"), E("c3")];
  const done = CHECK_DONE();
  const fail = CHECK_FAIL();
  const volTop = pr(px(TOUCH), VB_Y + SERIES_REAL[TOUCH].v * 0.38 + 0.08, 0);
  const avg = avgVol(SERIES_REAL, TOUCH);
  const hold = pr(px(TOUCH + 1), py(SERIES_REAL[TOUCH + 1].h) + 0.1, 0);
  const catchP = pr(px(TOUCH + 3), py(SERIES_REAL[TOUCH + 3].l) - 0.05, 0);
  const tip = pr(px(TOUCH), py(Math.max(B[TOUCH].h, B[TOUCH].c)) + 0.05, 0);
  return (
    <>
      <Card a={win(f, E("notWick") - 4, E("c1") - 4, 10, 8)} y={400} color={COL.level}>
        <div style={{ ...sans(900), fontSize: 58, color: INK }}>{T.notWick}</div>
      </Card>
      {a > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, top: 380, opacity: a, background: PLATE, border: "3px solid rgba(255,194,74,0.55)", borderRadius: 22, padding: "18px 30px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {T.checks.map(([t, q], i) => {
            const on = ramp(f, act[i] - 2, 8);
            const ok = f < testIn ? ramp(f, done[i], 8) : 0;
            const no = f >= testIn ? ramp(f, fail[i], 8) : 0;
            const cur = f < testIn && f >= act[i] && (i === 2 || f < act[i + 1]);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, opacity: 0.35 + 0.65 * on }}>
                <div style={{ width: 54, height: 54, borderRadius: 27, background: cur ? COL.level : "rgba(255,194,74,0.18)", color: cur ? "#05070b" : COL.level, display: "flex", alignItems: "center", justifyContent: "center", ...num(700), fontSize: 34 }}>{i + 1}</div>
                <div style={{ ...sans(900), fontSize: 44, color: INK, width: 200 }}>{t}</div>
                <div style={{ ...sans(700), fontSize: 42, color: SOFT, width: 360 }}>{q}</div>
                <div style={{ width: 56, ...sans(900), fontSize: 50, color: no > 0.01 ? COL.bad : COL.good, opacity: Math.max(ok, no), transform: `scale(${0.6 + 0.4 * backOut(Math.max(ok, no))})` }}>{no > 0.01 ? "✗" : "✓"}</div>
              </div>
            );
          })}
        </div>
      )}
      <Callout f={f} a={win(f, E("c1vol") + 4, E("c2") - 2, 10, 10)} at={volTop} dx={60} dy={-170} zh={T.c1} sub={`${T.avg} ${avg.toFixed(2)}  →  ${SERIES_REAL[TOUCH].v.toFixed(2)}`} color={COL.gold} size={46} />
      <Callout f={f} a={win(f, E("c2") + 16, E("c3") - 2, 10, 10)} at={hold} dx={90} dy={-150} zh={T.c2} color={COL.good} size={46} />
      <Callout f={f} a={win(f, E("c3catch") + 4, testIn - 2, 10, 10)} at={catchP} dx={110} dy={110} zh={T.c3} color={COL.good} size={46} />
      <Callout f={f} a={win(f, E("pierce") + 8, E("testTag") - 2, 10, 10)} at={tip} dx={90} dy={-150} zh={T.pierce} color={COL.bad} size={48} />
      <Card a={win(f, E("testTag") + 4, E("stopIn") + 2, 8, 12)} y={400} color={COL.bad}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, transform: `scale(${0.85 + 0.15 * backOut((f - E("testTag")) / 12)})` }}>
          <div style={{ ...sans(900), fontSize: 72, color: INK }}>{T.verdict1}</div>
          <div style={{ ...sans(900), fontSize: 72, color: COL.bad }}>{T.verdict2}</div>
        </div>
      </Card>
    </>
  );
};

const Stop: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const sp = stopPlan(f);
  const end = E("coreIn") + 2;
  const line = pr(px(22), py(sp.price), 0.36);
  const band = pr(px(21), (py(TEST_WICK) + py(sp.price)) / 2, 0.36);
  const st = pr(px(18), py(TEST_WICK), 0.36);
  const tuneA = win(f, E("tune"), end, 12, 10);
  const hiVol = ramp(f, E("vol"), 14);
  return (
    <>
      <Callout f={f} a={win(f, E("badStop") + 4, E("buffer") + 2, 10, 10)} at={line} dx={-40} dy={-340} zh={T.bad} color={COL.bad} size={48} />
      <Callout f={f} a={win(f, E("buffer") + 14, end, 12, 10)} at={band} dx={-40} dy={-240} zh={T.good} color={COL.good} size={52} />
      {win(f, E("buffer") + 24, end, 12, 10) > 0.002 && (
        <div style={{ position: "absolute", right: 1440 - SAFE.r, top: st.y + 14, opacity: win(f, E("buffer") + 24, end, 12, 10), ...sans(700), fontSize: 34, color: SOFT, background: PLATE, padding: "0 12px", borderRadius: 8 }}>
          {T.structure} {TEST_WICK.toFixed(2)}
        </div>
      )}
      <Card a={tuneA} y={400} color={COL.good}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div style={{ ...sans(900), fontSize: 42, color: INK }}>{T.volMeter}</div>
          <div style={{ position: "relative", width: 300, height: 18, borderRadius: 9, background: "rgba(62,224,143,0.18)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(20 + 75 * hiVol) * Math.min(1, ramp(f, E("tune"), 14) * 1.5)}%`, borderRadius: 9, background: COL.good }} />
          </div>
          <div style={{ ...sans(700), fontSize: 38, color: COL.good, width: 340 }}>{f < E("vol") ? T.lowVol : T.highVol}</div>
        </div>
      </Card>
    </>
  );
};

const Core: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const coreIn = E("coreIn");
  const endIn = E("endIn");
  const a = win(f, coreIn + 6, endIn + 2, 14, 12);
  const k2 = ramp(f, E("notYou") - 2, 14);
  const k3 = ramp(f, E("away"), 16);
  const sp = stopPlan(f);
  const you = pr(px(31), py(sp.price) + CUBE * 0.6, 0.05);
  return (
    <>
      {a > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 360, opacity: a, textAlign: "center" }}>
          <div style={{ ...serif(900), fontSize: 100, lineHeight: 1.25, color: INK }}>{T.core1}</div>
          <div style={{ ...serif(900), fontSize: 124, lineHeight: 1.25, color: COL.level, opacity: k2, transform: `translateY(${(1 - k2) * 20}px)` }}>{T.core2}</div>
          <div style={{ ...sans(700), fontSize: 50, lineHeight: 1.6, color: SOFT, opacity: k3, marginTop: 14 }}>{T.core3}</div>
        </div>
      )}
      <Ring at={you} a={win(f, E("away") + 6, endIn + 2, 12, 10)} f={f} color={COL.good} />
      <Callout f={f} a={win(f, E("away") + 14, endIn + 2, 12, 10)} at={you} dx={80} dy={120} zh={T.youSafe} color={COL.good} size={46} dot={false} />
    </>
  );
};

const End: React.FC<{ f: number }> = ({ f }) => {
  const endIn = E("endIn");
  const next = E("next");
  const qa = win(f, endIn + 4, next, 14, 10);
  const na = ramp(f, next + 2, 14);
  const pickA = ramp(f, E("endIn") + 40, 10);
  const pickB = ramp(f, E("q2"), 10);
  const chip = (s: string, k: number, color: string) => (
    <div style={{ ...sans(900), fontSize: 64, color: k > 0.5 ? "#05070b" : color, background: k > 0.5 ? color : "transparent", border: `4px solid ${color}`, borderRadius: 18, padding: "8px 46px 12px", transform: `scale(${0.9 + 0.1 * backOut(k)})` }}>{s}</div>
  );
  return (
    <>
      {qa > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 520, opacity: qa, display: "flex", flexDirection: "column", alignItems: "center", gap: 46, background: PLATE, borderRadius: 30, padding: "60px 30px", border: "3px solid rgba(255,194,74,0.5)" }}>
          <div style={{ ...sans(900), fontSize: 76, color: INK }}>{T.q1}</div>
          <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
            {chip(T.qA, pickA, COL.level)}
            <div style={{ ...sans(700), fontSize: 46, color: SOFT }}>还是</div>
            {chip(T.qB, pickB, COL.bad)}
          </div>
          <div style={{ ...sans(700), fontSize: 50, color: COL.buyStop, opacity: ramp(f, E("comment"), 10) }}>{T.q2}</div>
        </div>
      )}
      {na > 0.002 && (
        <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 500, opacity: na, transform: `translateY(${(1 - na) * 30}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 34, background: PLATE, borderRadius: 30, padding: "56px 30px 60px", border: `3px solid ${COL.buyStop}` }}>
          <div style={{ ...sans(900), fontSize: 40, color: "#05070b", background: COL.buyStop, borderRadius: 12, padding: "4px 22px" }}>{T.nextTag}</div>
          <div style={{ ...sans(900), fontSize: 84, color: INK }}>{T.next1}</div>
          <NextRow f={f} at={E("push")} up text={T.nextUp} />
          <NextRow f={f} at={E("absorb")} text={T.nextAbs} />
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1800, textAlign: "center", opacity: ramp(f, endIn + 10, 20), ...sans(700), fontSize: 40, color: "rgba(255,214,140,0.95)" }}>{T.risk}</div>
    </>
  );
};
const NextRow: React.FC<{ f: number; at: number; up?: boolean; text: string }> = ({ f, at, up, text }) => {
  const k = ramp(f, at - 4, 14);
  const color = up ? COL.up : COL.gold;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 30, opacity: 0.25 + 0.75 * k }}>
      <svg width={150} height={90}>
        {up ? (
          <>
            <polyline points={`10,78 ${10 + 60 * k},${78 - 50 * k} ${10 + 120 * k},${78 - 64 * k}`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={10 + 120 * k} cy={78 - 64 * k} r={9} fill={color} />
          </>
        ) : (
          <>
            <line x1={10} y1={46} x2={10 + 100 * k} y2={46} stroke={color} strokeWidth={8} strokeLinecap="round" />
            {[0, 1, 2].map((j) => (
              <rect key={j} x={112 + j * 0} y={20 + j * 18} width={28} height={14} rx={3} fill={color} opacity={k > 0.3 + j * 0.2 ? 1 : 0.2} />
            ))}
          </>
        )}
      </svg>
      <div style={{ ...sans(900), fontSize: 56, color }}>{text}</div>
    </div>
  );
};

// ================================================================= the HUD
export const Hud: React.FC<{ f: number }> = ({ f }) => {
  const pr = projector(f);
  const heads: [string, number, number][] = [
    ["liq", E("liqIn"), E("mechIn")],
    ["mech", E("mechIn"), E("wickIn")],
    ["wick", E("wickIn"), E("pollIn")],
    ["poll", E("pollIn"), E("checkIn")],
    ["check", E("checkIn"), E("testIn")],
    ["test", E("testIn"), E("stopIn")],
    ["stop", E("stopIn"), E("coreIn")],
  ];
  return (
    <div style={{ position: "absolute", inset: 0, width: 1440, height: 2560, overflow: "hidden" }}>
      <TopBar />
      {heads.map(([id, a, b]) => (f >= a - 2 && f < b + 12 ? <Header key={id} f={f} id={id} from={a} to={b} /> : null))}
      {f < E("liqIn") + 16 && <Hook f={f} pr={pr} />}
      {f >= E("liqIn") && f < E("mechIn") + 8 && <Liq f={f} pr={pr} />}
      {f >= E("mechIn") && f < E("wickIn") + 12 && <Mech f={f} pr={pr} />}
      {f >= E("wickIn") && f < E("pollIn") + 12 && <Wick f={f} pr={pr} />}
      {f >= E("pollIn") && f < E("checkIn") + 12 && <Poll f={f} pr={pr} />}
      {f >= E("checkIn") && f < E("stopIn") + 14 && <Checks f={f} pr={pr} />}
      {f >= E("stopIn") && f < E("coreIn") + 14 && <Stop f={f} pr={pr} />}
      {f >= E("coreIn") && f < E("endIn") + 14 && <Core f={f} pr={pr} />}
      {f >= E("endIn") && <End f={f} />}
      <Captions f={f} />
      <div style={{ position: "absolute", right: SAFE.l, top: 162, ...sans(500), fontSize: 24, color: "rgba(200,210,225,0.5)" }}>{T.tagB}</div>
    </div>
  );
};

