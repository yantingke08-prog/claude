// 2D layer over the 3D stage. The one rule of this version: text and charts never share space. Every label, card and
// marker lives in a label band (bands.ts) — the screen areas each shot leaves free above, below or beside its charts —
// and points at the chart only by its x position and its colour, never with a box or arrow drawn over a candle.
// On the chart itself there are only in-world marks (key lines, brackets, zones) that sit beside the bars.
// Also: one main label per sentence, at most two cards, everything appears on the word that names it, and a scene's
// labels are gone before the next scene's appear. Captions below y 1962.
import React from "react";
import { BANDS, type Rect } from "./bands";
import { E, backOut, captions, clamp01, out3, ramp, win } from "./cue";
import { A, A_H, B_H, Bc, HOOK, HOOK_H, box, cx, cy, vy, type Chart } from "./data";
import { projector, type Proj } from "./director";
import { num, sans, serif } from "./fonts";
import { T } from "./text";
import { COL } from "./world";

export const SAFE = { l: 48, r: 1392, top: 230, bottom: 1900, cap: 1962 };
const INK = "#f3ead9";
const SOFT = "rgba(243,234,217,0.62)";
const PLATE = "rgba(8,10,14,0.86)";
const LINE = "rgba(243,234,217,0.14)";
const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? 0.56 : 1) * size, 0);
const clampX = (x: number, w: number, b: Rect) => Math.min(b.x1 - w, Math.max(b.x0, x));
/** big text goes in the middle of the free space it has, not against an edge */
const Centered: React.FC<{ band: Rect; a: number; children: React.ReactNode; pad?: number }> = ({ band, a, children, pad = 0 }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: band.x0, width: band.x1 - band.x0, top: band.y0 + pad, height: band.y1 - band.y0 - pad, opacity: a, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>{children}</div>
  );

// ================================================================= building blocks
/**
 * a label in a band: centred on the anchor's x (clamped into the band), at a fixed y inside the band; `tick` draws a
 * short gold tick on the band's chart-side edge at the anchor's x, so the eye finds the bar it is about
 */
const BandLabel: React.FC<{ a: number; band: Rect; ax: number; y: number; zh: string; sub?: string; accent?: string; size?: number; tick?: "down" | "up" }> = ({ a, band, ax, y, zh, sub, accent = COL.gold, size = 54, tick }) => {
  if (a <= 0.002) return null;
  const subSize = Math.round(size * 0.66);
  const w = Math.max(textW(zh, size), sub ? textW(sub, subSize) : 0) + 64;
  const x = clampX(ax - w / 2, w, band);
  const k = out3(a);
  const tx = Math.min(band.x1 - 8, Math.max(band.x0 + 8, ax));
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y + (1 - k) * 10, width: w, opacity: a, padding: "10px 30px 14px", background: PLATE, borderTop: `5px solid ${accent}`, borderRadius: 12, boxSizing: "border-box", whiteSpace: "nowrap", textAlign: "center" }}>
        <div style={{ ...sans(900), fontSize: size, lineHeight: 1.3, color: INK }}>{zh}</div>
        {sub && <div style={{ ...sans(700), fontSize: subSize, lineHeight: 1.4, color: accent === INK ? SOFT : accent }}>{sub}</div>}
      </div>
      {tick && (
        <svg width={1440} height={2560} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: a }}>
          {tick === "down" ? (
            <path d={`M ${tx - 12} ${band.y1 - 18} L ${tx} ${band.y1 - 4} L ${tx + 12} ${band.y1 - 18}`} fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d={`M ${tx - 12} ${band.y0 + 18} L ${tx} ${band.y0 + 4} L ${tx + 12} ${band.y0 + 18}`} fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      )}
    </>
  );
};

/** a label in the column beside a chart, its left edge on a vertical rule, vertically centred on the anchor (clamped) */
const SideLabel: React.FC<{ a: number; band: Rect; x: number; ay: number; zh: string; sub?: string; accent?: string; size?: number }> = ({ a, band, x, ay, zh, sub, accent = COL.gold, size = 54 }) => {
  if (a <= 0.002) return null;
  const subSize = Math.round(size * 0.66);
  const h = size * 1.3 + (sub ? subSize * 1.4 : 0) + 26;
  const w = Math.max(textW(zh, size), sub ? textW(sub, subSize) : 0) + 60;
  const y = Math.min(band.y1 - h, Math.max(band.y0, ay - h / 2));
  const xx = Math.min(band.x1 - w, Math.max(band.x0, x));
  const k = out3(a);
  return (
    <div style={{ position: "absolute", left: xx + (1 - k) * 14, top: y, width: w, opacity: a, padding: "10px 26px 14px", background: PLATE, borderLeft: `6px solid ${accent}`, borderRadius: 12, boxSizing: "border-box", whiteSpace: "nowrap" }}>
      <div style={{ ...sans(900), fontSize: size, lineHeight: 1.3, color: INK }}>{zh}</div>
      {sub && <div style={{ ...sans(700), fontSize: subSize, lineHeight: 1.4, color: accent === INK ? SOFT : accent }}>{sub}</div>}
    </div>
  );
};

/** the shot's title row, at the top of the top band */
const Headline: React.FC<{ a: number; chip?: string; zh: string; color?: string }> = ({ a, chip, zh, color = INK }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: 250, opacity: a, display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
      {chip && <div style={{ ...num(700), fontSize: 50, lineHeight: "70px", color: "#06080d", background: INK, borderRadius: 12, padding: "0 20px", flexShrink: 0 }}>{chip}</div>}
      <div style={{ ...sans(900), fontSize: 68, lineHeight: 1.2, color, whiteSpace: "nowrap", transform: `translateY(${(1 - out3(a)) * 12}px)` }}>{zh}</div>
    </div>
  );

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
      <div style={{ background: "rgba(3,5,8,0.82)", borderRadius: 16, padding: "6px 30px 12px", textAlign: "center" }}>
        {c.rows.map((r, i) => (
          <div key={i} style={{ ...sans(700), fontSize: 60, lineHeight: "82px", color: INK, whiteSpace: "nowrap" }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
};

/** a schedule: each item runs from its event to the next one's start (or its own `until`), so two never overlap */
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

const Check: React.FC<{ ok: boolean; size: number; color: string }> = ({ ok, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
    <circle cx={20} cy={20} r={17} fill="none" stroke={color} strokeWidth={3} />
    {ok ? <path d="M 12 21 L 18 27 L 29 14" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : <path d="M 14 14 L 26 26 M 26 14 L 14 26" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />}
  </svg>
);
/** a row of three conditions in the band under a close-up; each one lights on its word */
const Checklist: React.FC<{ f: number; a: number; band: Rect; items: string[]; evs: string[]; ok: boolean }> = ({ f, a, band, items, evs, ok }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: band.x0, right: 1440 - band.x1, top: band.y0 + 12, opacity: a, display: "flex", justifyContent: "space-between", gap: 14 }}>
      {items.map((s, i) => {
        const k = ramp(f, E(evs[i]), 8);
        const col = ok ? COL.gold : INK;
        return (
          <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: PLATE, border: `2px solid ${k > 0.5 ? (ok ? "rgba(233,180,76,0.7)" : "rgba(243,234,217,0.55)") : LINE}`, borderRadius: 14, padding: "18px 10px 22px", opacity: 0.35 + 0.65 * k }}>
            <Check ok={ok} size={44} color={k > 0.5 ? col : SOFT} />
            <div style={{ ...sans(900), fontSize: 44, color: INK, whiteSpace: "nowrap" }}>{s}</div>
          </div>
        );
      })}
    </div>
  );

/** a thin gold frame around a candle and its volume column (on the chart, but around the bar, never over it) */
const FocusFrame: React.FC<{ a: number; pr: Proj; ch: Chart; i: number }> = ({ a, pr, ch, i }) => {
  if (a <= 0.002) return null;
  const b = ch.bars[i];
  const p0 = pr(cx(ch, i) - ch.xs * 0.72, cy(ch, b.h) + 0.16, 0.2);
  const p1 = pr(cx(ch, i) + ch.xs * 0.72, ch.vb - 0.08, 0.2);
  return <div style={{ position: "absolute", left: Math.min(p0.x, p1.x), top: Math.min(p0.y, p1.y), width: Math.abs(p1.x - p0.x), height: Math.abs(p1.y - p0.y), border: `3px solid ${COL.gold}`, borderRadius: 12, opacity: a, boxShadow: "0 0 22px rgba(233,180,76,0.3)" }} />;
};

// ================================================================= hook: question, countdown, the answer
const Hook: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const punch = E("punch");
  const qA = ramp(f, E("hQ"), 10) * (1 - ramp(f, punch - 8, 8));
  const k1 = backOut((f - E("hQ")) / 14);
  const cdA = ramp(f, E("cdText"), 10) * (1 - ramp(f, punch - 8, 8));
  const cds = ["cd0", "cd1", "cd2", "cd3", "cd4"].map((n) => E(n));
  const cdOn = f >= cds[0] - 6 && f < punch;
  const idx = cds.reduce((k, t, i) => (f >= t ? i : k), 0);
  const left = f < cds[0] ? 1 : clamp01(1 - (f - cds[0]) / (punch - cds[0]));
  const digitA = cdOn ? Math.min(clamp01((f - cds[idx]) / 5), clamp01((punch - f) / 6)) : 0;
  const R = 94;
  const circ = 2 * Math.PI * R;
  const ansA = ramp(f, punch, 8) * (1 - ramp(f, E("wIn"), 10));
  const ansK = out3((f - punch) / 12);
  const frameA = ramp(f, E("hHi"), 8) * (1 - ramp(f, E("wIn") + 4, 10));
  return (
    <>
      <FocusFrame a={frameA} pr={pr} ch={HOOK} i={HOOK_H} />
      <Centered band={BANDS.hookTop} a={Math.max(qA, cdA)}>
        <div style={{ opacity: qA / Math.max(qA, cdA, 0.001), transform: `scale(${0.94 + 0.06 * k1})` }}>
          <div style={{ ...serif(900), fontSize: 128, lineHeight: 1.14, color: INK }}>{T.q1}</div>
          <div style={{ ...serif(900), fontSize: 128, lineHeight: 1.14, color: COL.gold }}>{T.q2}</div>
        </div>
        <div style={{ height: 40 }} />
        <div style={{ position: "relative", width: 220, height: 220, opacity: cdOn ? Math.min(clamp01((f - cds[0] + 6) / 6), clamp01((punch - f) / 6)) : 0 }}>
          <svg width={220} height={220} style={{ position: "absolute", inset: 0 }}>
            <circle cx={110} cy={110} r={R} fill="rgba(8,10,14,0.8)" stroke="rgba(243,234,217,0.16)" strokeWidth={6} />
            <circle cx={110} cy={110} r={R} fill="none" stroke={COL.gold} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${circ * left} ${circ}`} transform="rotate(-90 110 110)" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", ...num(700), fontSize: 128, color: INK, opacity: digitA, transform: `scale(${1.06 - 0.06 * out3((f - cds[idx]) / 8)})` }}>{5 - idx}</div>
        </div>
        <div style={{ opacity: cdA / Math.max(qA, cdA, 0.001), marginTop: 22 }}>
          <div style={{ ...sans(900), fontSize: 62, lineHeight: 1.3, color: INK }}>{T.cd1}</div>
          <div style={{ ...num(500), fontSize: 38, lineHeight: 1.3, color: SOFT, letterSpacing: 1 }}>{T.cd2}</div>
        </div>
      </Centered>
      <Centered band={BANDS.hookTop} a={ansA}>
        <div style={{ ...sans(700), fontSize: 54, lineHeight: 1.3, color: SOFT, letterSpacing: 8 }}>{T.ans1}</div>
        <div style={{ ...serif(900), fontSize: 250, lineHeight: 1.1, color: COL.gold, transform: `translateY(${(1 - ansK) * 14}px)` }}>{T.ans2}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 40 }}>
          {T.thesis.map(([a, b], i) => {
            const k = ramp(f, E(i ? "tHigh" : "tLow"), 8);
            return (
              <div key={i} style={{ background: PLATE, borderTop: `5px solid ${i ? INK : COL.gold}`, borderRadius: 14, padding: "12px 34px 18px", opacity: k, transform: `translateY(${(1 - out3(k)) * 10}px)`, whiteSpace: "nowrap" }}>
                <span style={{ ...sans(900), fontSize: 66, color: i ? INK : COL.gold }}>{a}</span>
                <span style={{ ...sans(900), fontSize: 66, color: INK, marginLeft: 14 }}>{b}</span>
              </div>
            );
          })}
        </div>
      </Centered>
    </>
  );
};

// ================================================================= why: close-up of the heavy candle, labels to its right
const Why: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("pIn");
  const a = win(f, E("wIn") + 16, end, 10, 10);
  const hx = cx(HOOK, HOOK_H);
  const hb = HOOK.bars[HOOK_H];
  const col = BANDS.whyRight;
  const lx = pr(hx + 0.55, 0, 0).x;
  const volY = pr(hx, vy(HOOK, hb.v * 0.6), 0).y;
  const closeY = pr(hx, cy(HOOK, hb.c), 0).y;
  const highEnd = pr(hx + 0.9, cy(HOOK, hb.h), 0.3);
  const wickY = pr(hx, cy(HOOK, (hb.h + Math.max(hb.o, hb.c)) / 2), 0).y;
  return (
    <>
      <Headline a={a} zh={T.whyHead} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: Math.max(E("wVol"), E("wIn") + 20), until: E("wFlat"), draw: (k) => <SideLabel a={k * a} band={col} x={lx} ay={volY} zh={T.vol} sub={T.volSub} /> },
          { at: E("wFlat"), until: E("wCeil"), draw: (k) => <SideLabel a={k * a} band={col} x={lx} ay={closeY} zh={T.flat} sub={T.flatSub} accent={INK} /> },
          { at: E("wCeil") + 8, until: E("wChase"), draw: (k) => <SideLabel a={k * a} band={col} x={highEnd.x + 18} ay={highEnd.y} zh={T.ceil} sub={T.ceilSub} accent={COL.down} /> },
          { at: E("wTop"), draw: (k) => <SideLabel a={k * a} band={col} x={lx} ay={wickY} zh={T.chase} sub={T.chaseSub} accent={INK} /> },
        ]}
      />
    </>
  );
};

// ================================================================= the A|B comparison, wide
const chartX = (pr: Proj, ch: Chart, i?: number) => {
  const b = box(ch);
  return pr(i === undefined ? (b.x0 + b.x1) / 2 : cx(ch, i), b.pLo, 0).x;
};
const Tagged: React.FC<{ a: number; x: number; y: number; chip: string; zh: string; sub: string; accent: string }> = ({ a, x, y, chip, zh, sub, accent }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: x - 300, width: 600, top: y, opacity: a, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${(1 - out3(a)) * 10}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ ...num(700), fontSize: 50, lineHeight: "68px", color: "#06080d", background: INK, borderRadius: 12, padding: "0 18px" }}>{chip}</div>
        <div style={{ ...sans(900), fontSize: 70, color: accent }}>{zh}</div>
      </div>
      <div style={{ ...sans(700), fontSize: 42, color: SOFT, marginTop: 8 }}>{sub}</div>
    </div>
  );

const Pos: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("lIn");
  const a = win(f, E("pIn") + 24, end, 12, 10);
  const top = BANDS.wideTop;
  const bot = BANDS.wideBottom;
  const d = ramp(f, E("pDiff"), 10);
  return (
    <>
      <Centered band={top} a={a} pad={60}>
        <div style={{ ...sans(900), fontSize: 100, lineHeight: 1.3, color: INK }}>{T.posHead1}</div>
        <div style={{ width: 120, height: 4, background: COL.gold, margin: "28px auto 28px", opacity: 0.8 * d }} />
        <div style={{ ...sans(900), fontSize: 84, lineHeight: 1.3, color: COL.gold, opacity: d }}>{T.posHead2}</div>
      </Centered>
      <Tagged a={a * ramp(f, E("pLow"), 8)} x={chartX(pr, A)} y={bot.y0 + 20} chip={T.tagA} zh={T.low} sub={T.aPct} accent={COL.gold} />
      <Tagged a={a * ramp(f, E("pHigh"), 8)} x={chartX(pr, Bc)} y={bot.y0 + 20} chip={T.tagB} zh={T.high} sub={T.bPct} accent={INK} />
    </>
  );
};

// ================================================================= A close-up: low, a hand-over
const Low: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("gIn");
  const a = win(f, E("lIn") + 22, end, 10, 10);
  const top = BANDS.oneTop;
  const y = 400;
  return (
    <>
      <Headline a={a} chip={T.tagA} zh={T.aHead} color={COL.gold} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: Math.max(E("lBase"), E("lIn") + 26), until: E("lHand"), draw: (k) => <BandLabel a={k * a} band={top} ax={chartX(pr, A, 3)} y={y} zh={T.base} sub={T.baseSub} tick="down" /> },
          { at: E("lHand"), until: E("l2"), draw: (k) => <BandLabel a={k * a} band={top} ax={chartX(pr, A, A_H)} y={y} zh={T.hand} sub={f >= E("lBuy") ? `${T.handSell} → ${T.handBuy}` : f >= E("lSell") ? T.handSell : " "} tick="down" /> },
          { at: E("lHold") + 6, until: E("lDone"), draw: (k) => <BandLabel a={k * a} band={top} ax={chartX(pr, A, A_H + 5)} y={y} zh={T.lowLine} sub={f >= E("lBack") ? T.sup : " "} tick="down" /> },
          { at: E("lDone"), draw: (k) => <BandLabel a={k * a} band={top} ax={chartX(pr, A, A_H + 7)} y={y} zh={T.done} sub={T.doneSub} tick="down" /> },
        ]}
      />
      <Checklist f={f} a={a * ramp(f, E("l2"), 10)} band={BANDS.oneBottom} items={T.aChecks} evs={["lPull", "lHold", "lBack"]} ok />
    </>
  );
};

// ================================================================= B close-up: high, watch for distribution
const High: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("sIn");
  const a = win(f, E("gIn") + 24, end, 10, 10);
  const top = BANDS.oneTop;
  const y = 400;
  return (
    <>
      <Headline a={a} chip={T.tagB} zh={T.bHead} />
      <Sequence
        f={f}
        end={end}
        items={[
          { at: Math.max(E("gRise"), E("gIn") + 28), until: E("gDist"), draw: (k) => <BandLabel a={k * a} band={top} ax={chartX(pr, Bc, 8)} y={y} zh={T.rise} sub={f >= E("gFar") ? T.far : " "} accent={INK} tick="down" /> },
          { at: E("gDist"), until: E("g2"), draw: (k) => <BandLabel a={k * a} band={top} ax={chartX(pr, Bc, B_H)} y={y} zh={T.dist} sub={T.distSub} accent={INK} tick="down" /> },
          { at: E("gBreak") + 6, until: E("gFail"), draw: (k) => <BandLabel a={k * a} band={top} ax={chartX(pr, Bc, B_H + 2)} y={y} zh={T.broke} accent={COL.down} tick="down" /> },
          { at: E("gFail"), until: E("gSign"), draw: (k) => <BandLabel a={k * a} band={top} ax={chartX(pr, Bc, B_H + 4)} y={y} zh={T.flip} sub={T.flipSub} accent={COL.down} tick="down" /> },
          { at: E("gSign"), draw: (k) => <BandLabel a={k * a} band={top} ax={chartX(pr, Bc, B_H + 6)} y={y} zh={T.sign} accent={COL.down} tick="down" /> },
        ]}
      />
      <Checklist f={f} a={a * ramp(f, E("g2"), 10)} band={BANDS.oneBottom} items={T.bChecks} evs={["gDrop", "gBreak", "gFail"]} ok={false} />
    </>
  );
};

// ================================================================= summary: the wide comparison, a card under each chart
const SumCard: React.FC<{ f: number; a: number; x: number; title: string; items: string[]; evs: string[]; accent: string; ok: boolean }> = ({ f, a, x, title, items, evs, accent, ok }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: x - 310, width: 620, top: BANDS.sumBottom.y0 + 24, opacity: a, display: "flex", justifyContent: "center", transform: `translateY(${(1 - out3(a)) * 10}px)` }}>
      <div style={{ background: PLATE, borderTop: `5px solid ${accent}`, borderRadius: 14, padding: "14px 34px 22px", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
        <div style={{ ...sans(900), fontSize: 66, lineHeight: 1.3, color: accent }}>{title}</div>
        {items.map((s, i) => {
          const k = ramp(f, E(evs[i]), 8);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.3 + 0.7 * k }}>
              <Check ok={ok} size={42} color={k > 0.5 ? accent : SOFT} />
              <div style={{ ...sans(900), fontSize: 48, lineHeight: 1.3, color: INK, whiteSpace: "nowrap" }}>{s}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

const Sum: React.FC<{ f: number; pr: Proj }> = ({ f, pr }) => {
  const end = E("xIn");
  const a = win(f, E("sIn") + 20, end, 12, 10);
  return (
    <>
      <Centered band={BANDS.sumTop} a={a} pad={30}>
        <div style={{ ...serif(900), fontSize: 124, lineHeight: 1.2, color: INK }}>{T.sumHead1}</div>
        <div style={{ width: 120, height: 4, background: COL.gold, margin: "28px auto 28px", opacity: 0.8 }} />
        <div style={{ ...sans(900), fontSize: 66, lineHeight: 1.3, color: COL.gold }}>{T.sumHead2}</div>
      </Centered>
      <SumCard f={f} a={a} x={chartX(pr, A)} title={T.sumA} items={T.sumAItems} evs={["sA1", "sA2", "sA3"]} accent={COL.gold} ok />
      <SumCard f={f} a={a * ramp(f, E("sB"), 10)} x={chartX(pr, Bc)} title={T.sumB} items={T.sumBItems} evs={["sB1", "sB2", "sB3"]} accent={INK} ok={false} />
    </>
  );
};

// ================================================================= action: the charts sit low, the rules above them
const Act: React.FC<{ f: number }> = ({ f }) => {
  const end = E("eIn");
  const a = win(f, E("xIn") + 24, end, 12, 10);
  const acts = [E("xLow"), E("xHigh"), E("xStop")];
  return (
    <Centered band={BANDS.lowTop} a={a} pad={50}>
      <div style={{ ...serif(900), fontSize: 150, lineHeight: 1.15, color: COL.gold, opacity: 0.3 + 0.7 * ramp(f, E("xNo"), 8) }}>{T.x1}</div>
      <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 22, width: 1060 }}>
        {T.rules.map(([k, v], i) => {
          const on = ramp(f, acts[i], 8);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 30, background: PLATE, borderLeft: `6px solid ${i === 0 ? COL.gold : i === 1 ? INK : COL.gold}`, borderRadius: 14, padding: "16px 36px 20px", opacity: 0.3 + 0.7 * on }}>
              <div style={{ ...sans(900), fontSize: 66, color: i === 1 ? INK : COL.gold, width: 150 }}>{k}</div>
              <div style={{ ...sans(700), fontSize: 50, color: SOFT }}>→</div>
              <div style={{ ...sans(900), fontSize: 66, color: INK }}>{v}</div>
            </div>
          );
        })}
      </div>
    </Centered>
  );
};

const FULL: Rect = { x0: SAFE.l, x1: SAFE.r, y0: 230, y1: 1900 };
// ================================================================= ending: up in the dark, nothing of the set behind the cards
const End: React.FC<{ f: number }> = ({ f }) => {
  const risk = E("eRisk");
  const qa = win(f, E("eIn") + 30, risk, 12, 10);
  const ra = ramp(f, risk + 4, 14);
  return (
    <>
      {qa > 0.002 && (
        <Centered band={FULL} a={qa}>
          <div style={{ ...serif(900), fontSize: 112, lineHeight: 1.3, color: INK }}>{T.e1}</div>
          <div style={{ ...serif(900), fontSize: 112, lineHeight: 1.3, color: COL.gold, opacity: 0.3 + 0.7 * ramp(f, E("eQ"), 8) }}>{T.e2}</div>
          <div style={{ display: "inline-block", ...sans(900), fontSize: 58, color: INK, border: `3px solid rgba(243,234,217,0.6)`, borderRadius: 16, padding: "6px 40px 12px", marginTop: 60, opacity: ramp(f, E("eCmt"), 10) }}>{T.eCmt}</div>
        </Centered>
      )}
      {ra > 0.002 && (
        <Centered band={FULL} a={ra}>
          <div style={{ ...serif(900), fontSize: 124, lineHeight: 1.3, color: INK }}>{T.r1}</div>
          <div style={{ width: 120, height: 4, background: COL.gold, margin: "24px auto 30px", opacity: 0.8 }} />
          <div style={{ ...serif(900), fontSize: 94, lineHeight: 1.3, color: COL.gold }}>{T.r2}</div>
        </Centered>
      )}
    </>
  );
};

// ================================================================= the HUD
export const Hud: React.FC<{ f: number }> = ({ f }) => {
  const pr = projector(f);
  /** a section is mounted from its first event until just after the next one starts (its own fades end there) */
  const S = (a: string, b: string | null) => f >= E(a) - 1 && (b === null || f < E(b) + 12);
  return (
    <div style={{ position: "absolute", inset: 0, width: 1440, height: 2560, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 230, background: "linear-gradient(180deg, rgba(5,7,10,0.9) 0%, rgba(5,7,10,0.6) 70%, rgba(5,7,10,0) 100%)" }} />
      <TopBar />
      {f < E("wIn") + 14 && <Hook f={f} pr={pr} />}
      {S("wIn", "pIn") && <Why f={f} pr={pr} />}
      {S("pIn", "lIn") && <Pos f={f} pr={pr} />}
      {S("lIn", "gIn") && <Low f={f} pr={pr} />}
      {S("gIn", "sIn") && <High f={f} pr={pr} />}
      {S("sIn", "xIn") && <Sum f={f} pr={pr} />}
      {S("xIn", "eIn") && <Act f={f} />}
      {S("eIn", null) && <End f={f} />}
      <Captions f={f} />
    </div>
  );
};

