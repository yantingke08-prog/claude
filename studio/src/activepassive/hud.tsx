// 2D layer over the 3D stage. It draws exactly what scene.ts plans, inside the zones of layout.ts:
//   status 0–260 (chapter, topic, progress, risk) · data 300–1760 (labels on the 3D data) ·
//   conclusion 1780–1950 (one sentence) · captions 1980–2320 (subtitles only) · 64 px side margins.
// At most two data labels, one conclusion and one caption at a time; an old element has faded out before a new one
// fades in. scripts/activepassive-layout.mjs checks the same plan frame by frame.
import React from "react";
import { bookAbsorb } from "./acts";
import { E, captions, clamp01, out3 } from "./cue";
import { projector } from "./director";
import { num, sans, serif } from "./fonts";
import { CAP, CHIP, LAYOUT, LBL, STATUS_ROWS, captionLayout, nearest, verdictLayout } from "./layout";
import { absorbMid, labelsAt, statusAt, verdictAt, type LabelNow } from "./scene";
import { T, type Accent } from "./text";
import { COL } from "./world";

const M = LAYOUT.margin;
const INK = "#f3ead9";
const SOFT = "rgba(243,234,217,0.62)";
const PLATE = "rgba(5,8,14,0.86)";
const tone = (a: Accent) => (a === "up" ? COL.up : a === "down" ? COL.down : a === "gold" ? COL.gold : INK);

// ================================================================= status band (0–260)
const StatusBar: React.FC<{ f: number }> = ({ f }) => {
  const s = statusAt(f);
  const W = LAYOUT.W - 2 * M;
  return (
    <>
      <div style={{ position: "absolute", left: M, top: STATUS_ROWS.r1 - 20, ...sans(700), fontSize: 28, color: SOFT, letterSpacing: 1 }}>
        {T.series}
        <span style={{ marginLeft: 18, ...sans(500), fontSize: 22, color: "rgba(243,234,217,0.45)" }}>{T.tagData}</span>
      </div>
      <div style={{ position: "absolute", right: M, top: STATUS_ROWS.r1 - 22, ...sans(700), fontSize: 26, color: COL.gold, padding: "1px 14px 3px", border: "2px solid rgba(233,180,76,0.55)", borderRadius: 8 }}>{T.risk}</div>
      <div style={{ position: "absolute", left: M, top: STATUS_ROWS.r2 - 6, ...sans(900), fontSize: 54, lineHeight: 1.2, color: INK, whiteSpace: "nowrap" }}>{T.title}</div>
      <div style={{ position: "absolute", left: M, right: M, top: STATUS_ROWS.r3 - 4, display: "flex", alignItems: "center", gap: 16, height: 46 }}>
        {s.n && <div style={{ ...num(700), fontSize: 30, color: "#06080d", background: COL.gold, borderRadius: 7, padding: "0 12px" }}>{s.n}</div>}
        <div style={{ ...sans(900), fontSize: 38, color: COL.gold, whiteSpace: "nowrap" }}>{s.name}</div>
        <div style={{ flex: 1 }} />
        {s.steps.map((t, i) => {
          const on = i <= s.step;
          const cur = i === s.step;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, opacity: on ? 1 : 0.38 }}>
              <div style={{ ...num(700), fontSize: 24, width: 34, height: 34, borderRadius: 17, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", color: cur ? "#06080d" : INK, background: cur ? COL.gold : "transparent", border: `2px solid ${cur ? COL.gold : "rgba(243,234,217,0.5)"}` }}>{i + 1}</div>
              <div style={{ ...sans(700), fontSize: 26, color: cur ? INK : SOFT, whiteSpace: "nowrap" }}>{t}</div>
            </div>
          );
        })}
      </div>
      <svg width={LAYOUT.W} height={LAYOUT.H} style={{ position: "absolute", inset: 0 }}>
        <rect x={M} y={STATUS_ROWS.bar} width={W} height={6} rx={3} fill="rgba(243,234,217,0.14)" />
        <rect x={M} y={STATUS_ROWS.bar} width={W * s.progress} height={6} rx={3} fill={COL.gold} />
        {s.marks.map((m, i) => (
          <rect key={i} x={M + W * m - 1.5} y={STATUS_ROWS.bar - 4} width={3} height={14} fill={m <= s.progress ? COL.gold : "rgba(243,234,217,0.4)"} />
        ))}
      </svg>
    </>
  );
};

// ================================================================= data labels (data zone)
const Label: React.FC<{ l: LabelNow }> = ({ l }) => {
  const c = tone(l.accent);
  const end = nearest(l.rect, l.anchor);
  const k = out3(l.a);
  return (
    <>
      <svg width={LAYOUT.W} height={LAYOUT.H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={l.anchor.x} y1={l.anchor.y} x2={l.anchor.x + (end.x - l.anchor.x) * k} y2={l.anchor.y + (end.y - l.anchor.y) * k} stroke={c} strokeWidth={2.5} opacity={0.85 * l.a} />
        <circle cx={l.anchor.x} cy={l.anchor.y} r={8} fill="none" stroke={c} strokeWidth={3} opacity={l.a} />
        <circle cx={l.anchor.x} cy={l.anchor.y} r={3} fill={c} opacity={l.a} />
      </svg>
      {l.chip ? (
        <div style={{ position: "absolute", left: l.rect.x, top: l.rect.y, width: l.rect.w, height: l.rect.h, opacity: l.a, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <div style={{ ...sans(900), fontSize: CHIP.k, lineHeight: 1.1, color: c, background: PLATE, border: `3px solid ${c}`, borderRadius: 16, padding: `0 ${CHIP.padX - 3}px 8px` }}>{l.k}</div>
          <div style={{ ...sans(700), fontSize: CHIP.v, color: SOFT, whiteSpace: "nowrap" }}>{l.v}</div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: l.rect.x, top: l.rect.y, width: l.rect.w, height: l.rect.h, opacity: l.a, boxSizing: "border-box", padding: `0 ${LBL.padX}px`, background: PLATE, borderLeft: `${LBL.bar}px solid ${c}`, borderRadius: 10, display: "flex", alignItems: "center", gap: LBL.gapKV, whiteSpace: "nowrap" }}>
          {l.k && <span style={{ ...sans(700), fontSize: LBL.k, color: SOFT }}>{l.k}</span>}
          <span style={{ ...num(700), fontSize: LBL.v, color: l.accent === "ink" ? INK : c }}>{l.v}</span>
        </div>
      )}
    </>
  );
};

/** 05: after the absorption, two dashed arrows — which way does the price go? */
const Arrows: React.FC<{ f: number }> = ({ f }) => {
  const a = clamp01((f - E("abWhere")) / LAYOUT.IN) * clamp01((E("logicIn") - f) / LAYOUT.OUT);
  if (a <= 0.002) return null;
  const mid = absorbMid(projector(f), bookAbsorb(f));
  const k = out3((f - E("abWhere")) / 14);
  return (
    <svg width={LAYOUT.W} height={LAYOUT.H} style={{ position: "absolute", inset: 0, opacity: a }}>
      {[-1, 1].map((d) => {
        const y0 = mid.y + d * 30;
        const y1 = y0 + d * 190 * k;
        const c = d < 0 ? COL.up : COL.down;
        return (
          <g key={d}>
            <line x1={mid.x} y1={y0} x2={mid.x} y2={y1} stroke={c} strokeWidth={8} strokeDasharray="16 12" strokeLinecap="round" opacity={0.85} />
            <polygon points={`${mid.x - 18},${y1} ${mid.x + 18},${y1} ${mid.x},${y1 + d * 30}`} fill={c} opacity={k} />
          </g>
        );
      })}
      <text x={mid.x + 30} y={mid.y + 22} fill={INK} fontSize={60} style={{ ...sans(900) }}>
        ?
      </text>
    </svg>
  );
};

// ================================================================= conclusion band (1780–1950)
const Verdict: React.FC<{ f: number }> = ({ f }) => {
  const v = verdictAt(f);
  if (!v) return null;
  const L = verdictLayout(
    v.rows.map((r) => r.map((s) => s[0]).join("")),
    v.big,
  );
  return (
    <div style={{ position: "absolute", left: L.rect.x, top: L.rect.y, width: L.rect.w, height: L.rect.h, opacity: v.a, boxSizing: "border-box", background: "rgba(5,8,14,0.78)", borderTop: `3px solid ${COL.gold}`, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {v.rows.map((r, i) => (
        <div key={i} style={{ ...(v.big ? serif(900) : sans(900)), fontSize: L.sizes[i], lineHeight: L.lh, whiteSpace: "nowrap", opacity: 0.15 + 0.85 * v.rowA[i] }}>
          {r.map(([t, c], j) => (
            <span key={j} style={{ color: tone(c ?? "ink") }}>
              {t}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

// ================================================================= captions (1980–2320)
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = captions.find((x) => f >= x.from && f < x.to);
  if (!c) return null;
  const a = Math.min(clamp01((f - c.from) / 4), clamp01((c.to - f) / 4));
  const L = captionLayout(c.rows);
  return (
    <div style={{ position: "absolute", left: L.rect.x, top: L.rect.y, width: L.rect.w, height: L.rect.h, opacity: a, boxSizing: "border-box", background: "rgba(3,5,10,0.8)", borderRadius: 16, padding: `${CAP.padY / 2}px ${CAP.padX}px`, textAlign: "center" }}>
      {c.rows.map((r, i) => (
        <div key={i} style={{ ...sans(700), fontSize: CAP.size, lineHeight: `${CAP.lh}px`, color: INK, whiteSpace: "nowrap" }}>
          {r}
        </div>
      ))}
    </div>
  );
};

// ================================================================= the HUD
export const Hud: React.FC<{ f: number }> = ({ f }) => {
  const pr = projector(f);
  const labels = labelsAt(f, pr);
  return (
    <div style={{ position: "absolute", inset: 0, width: LAYOUT.W, height: LAYOUT.H, overflow: "hidden" }}>
      {/* soft shades behind the status band and the bottom bands, so the 3D never fights the text */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: LAYOUT.status.bottom + 30, background: "linear-gradient(180deg, rgba(4,7,13,0.92) 0%, rgba(4,7,13,0.75) 75%, rgba(4,7,13,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: LAYOUT.verdict.top - 30, bottom: 0, background: "linear-gradient(180deg, rgba(4,7,13,0) 0%, rgba(4,7,13,0.7) 12%, rgba(4,7,13,0.85) 100%)" }} />
      <StatusBar f={f} />
      {f >= E("abWhere") && f < E("logicIn") && <Arrows f={f} />}
      {labels.map((l) => (
        <Label key={l.id} l={l} />
      ))}
      <Verdict f={f} />
      <Captions f={f} />
    </div>
  );
};
