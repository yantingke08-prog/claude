// 2D layer over the 3D stage. Chart labels are terminal tags (tags.ts): a label and a number, in the object's colour,
// right beside the object — no cards, leaders or dots. Big centred text (no punctuation) only where no chart is drawn:
// the band y 380–720 above the framed charts. The top line sits below the phone's top safe area (y 250); captions are
// at y 2120 and nothing else goes lower than y 2060. Lines whose words appear as big text are not captioned (nocap).
import React from "react";
import { E, backOut, captions, clamp01, out3, ramp, win } from "./cue";
import { CUTS } from "./director";
import { mono, sans, serif } from "./fonts";
import { COL } from "./palette";
import SC from "./script.json";
import { placedAt, type Placed } from "./tags";
import { T } from "./text";

export const SAFE = { l: 48, r: 1392, top: 380, band: 720, bottom: 2060, cap: 2120, bar: 250 };
const INK = "#f3ead9";
const SOFT = "rgba(243,234,217,0.62)";
const SHADOW = "0 2px 10px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)";
const NOCAP = new Set(SC.lines.filter((l) => (l as { nocap?: boolean }).nocap).map((l) => l.id));

type Rect = { x0: number; x1: number; y0: number; y1: number };
const BAND: Rect = { x0: SAFE.l, x1: SAFE.r, y0: SAFE.top, y1: SAFE.band };
const FULL: Rect = { x0: SAFE.l, x1: SAFE.r, y0: SAFE.top, y1: SAFE.bottom };
const Centered: React.FC<{ band: Rect; a: number; children: React.ReactNode }> = ({ band, a, children }) =>
  a <= 0.002 ? null : (
    <div style={{ position: "absolute", left: band.x0, width: band.x1 - band.x0, top: band.y0, height: band.y1 - band.y0, opacity: a, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>{children}</div>
  );

// ================================================================= top line + steps
const TopBar: React.FC<{ f: number }> = ({ f }) => (
  <>
    <div style={{ position: "absolute", left: SAFE.l, top: SAFE.bar, display: "flex", alignItems: "baseline", gap: 14 }}>
      <div style={{ ...sans(900), fontSize: 34, color: INK, letterSpacing: 2 }}>{T.series}</div>
      <div style={{ ...mono(700), fontSize: 32, color: COL.gold }}>{T.ep}</div>
      <div style={{ ...sans(700), fontSize: 30, color: SOFT, marginLeft: 8 }}>{T.topic}</div>
    </div>
    <div style={{ position: "absolute", right: SAFE.l, top: SAFE.bar - 2, ...sans(700), fontSize: 28, color: COL.gold, padding: "2px 14px", border: "2px solid rgba(242,184,75,0.5)", borderRadius: 8 }}>{T.demo}</div>
    <Steps f={f} />
  </>
);
const Steps: React.FC<{ f: number }> = ({ f }) => {
  const a = win(f, E("u1In"), E("xIn"), 12, 10);
  if (a <= 0.002) return null;
  const cur = f >= E("u3In") ? 2 : f >= E("u2In") ? 1 : 0;
  return (
    <div style={{ position: "absolute", left: SAFE.l, right: SAFE.l, top: SAFE.bar + 62, display: "flex", justifyContent: "center", gap: 46, opacity: a }}>
      {T.steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, opacity: i === cur ? 1 : i < cur ? 0.5 : 0.32 }}>
          <span style={{ ...mono(700), fontSize: 34, color: i === cur ? COL.gold : INK }}>{i + 1}</span>
          <span style={{ ...sans(900), fontSize: 36, color: INK }}>{s}</span>
        </div>
      ))}
    </div>
  );
};

// ================================================================= tags
const TagView: React.FC<{ t: Placed }> = ({ t }) => {
  const k = out3(t.a);
  const shift = t.side === "above" ? (1 - k) * 8 : t.side === "below" ? -(1 - k) * 8 : t.side === "right" ? -(1 - k) * 8 : (1 - k) * 8;
  const horiz = t.side === "left" || t.side === "right";
  return (
    <div style={{ position: "absolute", left: t.x0 + (horiz ? shift : 0), top: t.y0 + (horiz ? 0 : shift), width: t.w, height: t.h, opacity: t.a * (t.quiet ? 0.8 : 1), display: "flex", alignItems: "baseline", justifyContent: t.side === "left" ? "flex-end" : t.side === "right" ? "flex-start" : t.align === "start" ? "flex-start" : "center", gap: t.size * 0.3, whiteSpace: "nowrap", color: t.color, textShadow: SHADOW, lineHeight: `${t.h}px` }}>
      <span style={{ ...sans(900), fontSize: t.size }}>{t.k}</span>
      {t.v && <span style={{ ...mono(700), fontSize: t.size * (t.quiet ? 0.86 : 1) }}>{t.v}</span>}
    </div>
  );
};

// ================================================================= big text
const Title: React.FC<{ a: number; k: number; l1: string; l2?: string; c2?: string; size?: number }> = ({ a, k, l1, l2, c2 = COL.gold, size = 120 }) => (
  <Centered band={BAND} a={a}>
    <div style={{ transform: `scale(${0.95 + 0.05 * backOut(k)})` }}>
      <div style={{ ...serif(900), fontSize: size, lineHeight: 1.16, color: INK, textShadow: SHADOW }}>{l1}</div>
      {l2 && <div style={{ ...serif(900), fontSize: size, lineHeight: 1.16, color: c2, textShadow: SHADOW }}>{l2}</div>}
    </div>
  </Centered>
);
const Big: React.FC<{ f: number }> = ({ f }) => {
  const k = (e: string) => (f - E(e)) / 14;
  const step = (i: number, a: string, b: string) => {
    const al = win(f, E(a), E(b), 8, 10);
    return al > 0.002 ? (
      <Centered band={BAND} a={al}>
        <div style={{ ...sans(700), fontSize: 50, color: SOFT, letterSpacing: 10, textShadow: SHADOW }}>{T.stepWord[i]}</div>
        <div style={{ ...serif(900), fontSize: 150, lineHeight: 1.12, color: COL.gold, textShadow: SHADOW, transform: `translateY(${(1 - out3((f - E(a)) / 12)) * 12}px)` }}>{T.steps[i]}</div>
      </Centered>
    ) : null;
  };
  const three = win(f, E("uThree"), E("u1In"), 8, 8);
  return (
    <>
      <Title a={win(f, E("hQ"), E("wIn") + 4, 10, 10)} k={k("hQ")} l1={T.q1} l2={T.q2} size={112} />
      <Title a={win(f, E("yIn"), E("yStay") + 4, 8, 10)} k={k("yIn")} l1={T.y1} size={118} />
      {three > 0.002 && (
        <Centered band={BAND} a={three}>
          <div style={{ ...serif(900), fontSize: 150, lineHeight: 1.1, color: COL.gold, textShadow: SHADOW }}>{T.threeHead}</div>
          <div style={{ display: "flex", gap: 44, marginTop: 26 }}>
            {T.steps.map((s, i) => (
              <div key={i} style={{ opacity: ramp(f, E("uThree") + 6 + i * 6, 8), whiteSpace: "nowrap", textShadow: SHADOW }}>
                <span style={{ ...mono(700), fontSize: 52, color: COL.gold }}>{i + 1}</span>
                <span style={{ ...sans(900), fontSize: 58, color: INK, marginLeft: 10 }}>{s}</span>
              </div>
            ))}
          </div>
        </Centered>
      )}
      {step(0, "u1In", "u1Days")}
      {step(1, "u2In", "u2Prior")}
      {step(2, "u3In", "u3Near")}
    </>
  );
};

// ================================================================= ending: probability, the question, the notice
const End: React.FC<{ f: number }> = ({ f }) => {
  const pa = win(f, E("zIn") + 6, E("zQ"), 12, 10);
  const qa = win(f, E("zQ"), E("zRisk"), 10, 10);
  const ra = ramp(f, E("zRisk"), 14);
  return (
    <>
      <Centered band={BAND} a={pa}>
        <div style={{ ...serif(900), fontSize: 92, lineHeight: 1.3, color: INK, textShadow: SHADOW }}>信号只代表概率</div>
        <div style={{ ...serif(900), fontSize: 92, lineHeight: 1.3, color: COL.gold, textShadow: SHADOW }}>不是保证</div>
      </Centered>
      <Centered band={BAND} a={qa}>
        <div style={{ ...serif(900), fontSize: 100, lineHeight: 1.26, color: INK, textShadow: SHADOW }}>{T.endQ1}</div>
        <div style={{ ...serif(900), fontSize: 100, lineHeight: 1.26, color: COL.gold, textShadow: SHADOW }}>{T.endQ2}</div>
        <div style={{ ...sans(900), fontSize: 56, color: INK, marginTop: 30, opacity: ramp(f, E("zCmt"), 10), textShadow: SHADOW }}>{T.endCmt}</div>
      </Centered>
      {ra > 0.002 && <div style={{ position: "absolute", inset: 0, background: "rgba(4,6,10,0.84)", opacity: ra }} />}
      <Centered band={FULL} a={ra}>
        <div style={{ ...serif(900), fontSize: 124, lineHeight: 1.3, color: INK }}>{T.risk1}</div>
        <div style={{ width: 120, height: 4, background: COL.gold, margin: "24px auto 30px", opacity: 0.8 }} />
        <div style={{ ...serif(900), fontSize: 104, lineHeight: 1.3, color: COL.gold }}>{T.risk2}</div>
        <div style={{ ...sans(700), fontSize: 40, color: SOFT, marginTop: 40 }}>{T.demo}</div>
      </Centered>
    </>
  );
};

const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to);
  if (!c || NOCAP.has(c.line)) return null;
  const a = Math.min(clamp01((f - c.from) / 4), clamp01((c.to - f) / 4));
  return (
    <div style={{ position: "absolute", left: SAFE.l - 20, right: SAFE.l - 20, top: SAFE.cap, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ background: "rgba(3,5,8,0.8)", borderRadius: 16, padding: "6px 30px 12px", textAlign: "center" }}>
        {c.rows.map((r, i) => (
          <div key={i} style={{ ...sans(700), fontSize: 58, lineHeight: "80px", color: INK, whiteSpace: "nowrap" }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Hud: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "absolute", inset: 0, width: 1440, height: 2560, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 380, background: "linear-gradient(180deg, rgba(4,6,10,0.92) 0%, rgba(4,6,10,0.7) 70%, rgba(4,6,10,0) 100%)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 520, background: "linear-gradient(0deg, rgba(4,6,10,0.85) 0%, rgba(4,6,10,0.5) 60%, rgba(4,6,10,0) 100%)" }} />
    <TopBar f={f} />
    <Big f={f} />
    {placedAt(f).map((t) => (
      <TagView key={t.id} t={t} />
    ))}
    {f >= E("zIn") && <End f={f} />}
    <div style={{ position: "absolute", inset: 0, background: "#04060a", opacity: Math.max(...CUTS().map((c) => clamp01(1 - Math.abs(f - c + 0.5) / 7))) }} />
    <Captions f={f} />
  </div>
);
