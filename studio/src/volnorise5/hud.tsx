// 2D layer over the 3D stage (v4: terminal-native labels). Nothing on the charts is a card, a plate, a bracket box, a
// leader line or a dot: every chart label is a tag from tags.ts — a label and a number at most, set right against the
// candle, volume column or key line it is about, in that object's colour. The captions explain; the picture only
// carries data, short tags, highlights and numbers that move. Big centred text is kept for the hook (question,
// countdown, answer) and the ending, in screen areas no chart uses. v5: the top line sits below the phone's top
// safe area (y 250), big text starts at y 360, captions are lower (y 2120) and nothing else goes below y 2060.
import React from "react";
import { BANDS, type Rect } from "./bands";
import { E, backOut, captions, clamp01, out3, ramp, win } from "./cue";
import { hand, num, sans, serif } from "./fonts";
import { NOTE, PAGE, noteRows, pageTopLeft, writeK } from "./desk";
import { projector } from "./director";
import { COL } from "./palette";
import { placedAt, type Placed } from "./tags";
import { T } from "./text";

export const SAFE = { l: 48, r: 1392, top: 360, bottom: 2060, cap: 2120, bar: 250 };
const INK = "#f3ead9";
const SOFT = "rgba(243,234,217,0.62)";
/** a soft dark halo around the glyphs only (legibility on the glow), never a plate */
const SHADOW = "0 2px 8px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)";
/** big text goes in the middle of the free space it has, not against an edge */
const Centered: React.FC<{ band: Rect; a: number; children: React.ReactNode; pad?: number }> = ({ band, a, children, pad = 0 }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: band.x0, width: band.x1 - band.x0, top: band.y0 + pad, height: band.y1 - band.y0 - pad, opacity: a, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>{children}</div>
  );

// ================================================================= building blocks
const TopBar: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: SAFE.l, top: SAFE.bar + 2, display: "flex", alignItems: "baseline", gap: 16 }}>
      <div style={{ ...sans(900), fontSize: 34, color: INK, letterSpacing: 2 }}>{T.series}</div>
      <div style={{ ...sans(700), fontSize: 28, color: SOFT }}>{T.seriesSub}</div>
    </div>
    <div style={{ position: "absolute", right: SAFE.l, top: SAFE.bar, ...sans(700), fontSize: 28, color: COL.gold, padding: "2px 14px", border: `2px solid rgba(233,180,76,0.5)`, borderRadius: 8 }}>{T.risk}</div>
    <div style={{ position: "absolute", right: SAFE.l, top: SAFE.bar + 54, ...sans(500), fontSize: 22, color: SOFT }}>{T.tagData}</div>
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

/** one tag: label + value on one line, in the object's colour, no background */
const TagView: React.FC<{ t: Placed }> = ({ t }) => {
  const k = out3(t.a);
  const shift = t.side === "above" ? (1 - k) * 8 : t.side === "below" ? -(1 - k) * 8 : t.side === "right" ? -(1 - k) * 8 : (1 - k) * 8;
  const horiz = t.side === "left" || t.side === "right";
  return (
    <div style={{ position: "absolute", left: t.x0 + (horiz ? shift : 0), top: t.y0 + (horiz ? 0 : shift), width: t.w, height: t.h, opacity: t.a * (t.quiet ? 0.8 : 1), display: "flex", alignItems: "baseline", justifyContent: t.side === "left" ? "flex-end" : t.side === "right" ? "flex-start" : "center", gap: t.size * 0.3, whiteSpace: "nowrap", color: t.color, textShadow: SHADOW, lineHeight: `${t.h}px` }}>
      <span style={{ ...sans(900), fontSize: t.size }}>{t.k}</span>
      {t.v && <span style={{ ...num(700), fontSize: t.size * (t.quiet ? 0.86 : 1) }}>{t.v}</span>}
    </div>
  );
};
const Tags: React.FC<{ f: number }> = ({ f }) => (
  <>
    {placedAt(f).map((t) => (
      <TagView key={t.id} t={t} />
    ))}
  </>
);

// ================================================================= hook: question, countdown, the answer
const Hook: React.FC<{ f: number }> = ({ f }) => {
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
  return (
    <>
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
        <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 56, marginTop: 44 }}>
          {T.thesis.map(([a, b], i) => {
            const k = ramp(f, E(i ? "tHigh" : "tLow"), 8);
            return (
              <div key={i} style={{ opacity: k, transform: `translateY(${(1 - out3(k)) * 10}px)`, whiteSpace: "nowrap", textShadow: SHADOW }}>
                <span style={{ ...sans(900), fontSize: 72, color: i ? INK : COL.gold }}>{a}</span>
                <span style={{ ...sans(900), fontSize: 72, color: INK, marginLeft: 16 }}>{b}</span>
              </div>
            );
          })}
        </div>
      </Centered>
    </>
  );
};

// ================================================================= the notebook (L14): the plan written by hand, each line on its word
const INKC = "#1f2638";
const RED = "#b3262e";
const Note: React.FC<{ f: number }> = ({ f }) => {
  const pr = projector(f);
  const [wx, wy, wz] = pageTopLeft();
  const o = pr(wx, wy, wz);
  const k = (pr(wx + 1, wy, wz).x - o.x) / PAGE.k;
  const rows = noteRows(T.rules, T.x1);
  const W = PAGE.w * PAGE.k;
  const H = PAGE.h * PAGE.k;
  const sk = NOTE.sketch;
  const skK = clamp01((f - E("xIn") - 6) / 26);
  const ul = writeK(f, rows[0].at + rows[0].n * 2.6, 6);
  return (
    <div style={{ position: "absolute", left: o.x, top: o.y, width: W, height: H, transform: `scale(${k})`, transformOrigin: "0 0" }}>
      <div style={{ position: "absolute", left: NOTE.margin + 26, top: 70, ...hand(), fontSize: 50, color: INKC, opacity: 0.75 }}>{T.noteDate}</div>
      <div style={{ position: "absolute", right: 70, top: 70, ...hand(), fontSize: 50, color: RED, opacity: 0.85 }}>{T.noteTag}</div>
      {/* a quick ink sketch of the candle being noted: long upper wick, tiny body, tall volume column */}
      <svg style={{ position: "absolute", left: sk.x, top: sk.y, overflow: "visible" }} width={sk.w} height={sk.h}>
        {[
          "M 40 150 L 40 120 M 30 120 L 50 120 L 50 100 L 30 100 Z M 40 100 L 40 80",
          "M 90 140 L 90 110 M 80 110 L 100 110 L 100 85 L 80 85 Z M 90 85 L 90 60",
          "M 150 140 L 150 92 M 138 92 L 162 92 L 162 80 L 138 80 Z M 150 80 L 150 6",
          "M 138 200 L 138 160 L 162 160 L 162 200 M 78 200 L 78 186 L 102 186 L 102 200 M 28 200 L 28 190 L 52 190 L 52 200",
          "M 175 8 L 300 8",
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke={i === 4 ? RED : INKC} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(skK * 5 - i)} opacity={0.85} />
        ))}
      </svg>
      {rows.map((r, i) => {
        const p = writeK(f, r.at, r.n);
        if (p <= 0) return null;
        const style: React.CSSProperties = { position: "absolute", left: r.x, top: r.base - r.size * 0.95, ...hand(), fontSize: r.size, lineHeight: 1, whiteSpace: "pre", color: INKC, clipPath: `inset(-20% ${(1 - p) * 100}% -20% 0)` };
        return i === 0 ? (
          <div key={i} style={style}>{r.text}</div>
        ) : (
          <div key={i} style={style}>
            <span style={{ color: RED }}>{r.k}</span>
            {"  "}
            {r.v}
          </div>
        );
      })}
      {/* a gold marker stroke under the title, after it is written */}
      <div style={{ position: "absolute", left: rows[0].x - 10, top: rows[0].base + 14, width: (rows[0].n * rows[0].size * 0.92 + 20) * ul, height: 16, background: "rgba(233,180,76,0.55)", borderRadius: 8 }} />
    </div>
  );
};

const FULL: Rect = { x0: SAFE.l, x1: SAFE.r, y0: SAFE.top, y1: SAFE.bottom };
/** over the monitor: the dark wall above it */
const WALL: Rect = { x0: SAFE.l, x1: SAFE.r, y0: SAFE.top, y1: 1010 };
// ================================================================= ending: the monitor on the desk, the question on the wall above it, then the notice
const End: React.FC<{ f: number }> = ({ f }) => {
  const risk = E("eRisk");
  const qa = win(f, E("eIn") + 30, risk, 12, 10);
  const ra = ramp(f, risk + 4, 14);
  return (
    <>
      {qa > 0.002 && (
        <Centered band={WALL} a={qa}>
          <div style={{ ...serif(900), fontSize: 112, lineHeight: 1.3, color: INK }}>{T.e1}</div>
          <div style={{ ...serif(900), fontSize: 112, lineHeight: 1.3, color: COL.gold, opacity: 0.3 + 0.7 * ramp(f, E("eQ"), 8) }}>{T.e2}</div>
          <div style={{ ...sans(900), fontSize: 60, color: INK, marginTop: 44, opacity: ramp(f, E("eCmt"), 10), textShadow: SHADOW }}>{T.eCmt}</div>
        </Centered>
      )}
      {ra > 0.002 && <div style={{ position: "absolute", inset: 0, background: "rgba(5,7,10,0.82)", opacity: ra }} />}
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
  /** a section is mounted from its first event until just after the next one starts (its own fades end there) */
  const S = (a: string, b: string | null) => f >= E(a) - 1 && (b === null || f < E(b) + 12);
  return (
    <div style={{ position: "absolute", inset: 0, width: 1440, height: 2560, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 360, background: "linear-gradient(180deg, rgba(5,7,10,0.9) 0%, rgba(5,7,10,0.7) 70%, rgba(5,7,10,0) 100%)" }} />
      <TopBar />
      {f < E("wIn") + 14 && <Hook f={f} />}
      <Tags f={f} />
      {f > E("xIn") && f <= E("eIn") && <Note f={f} />}
      {S("eIn", null) && <End f={f} />}
      {/* a short dip to black around each straight cut */}
      <div style={{ position: "absolute", inset: 0, background: "#05070a", opacity: Math.max(...[E("xIn"), E("eIn")].map((c) => clamp01(1 - Math.abs(f - c - 0.5) / 6))) }} />
      <Captions f={f} />
    </div>
  );
};

