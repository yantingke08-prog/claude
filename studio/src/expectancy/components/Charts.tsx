import { interpolate } from "remotion";
import { C } from "../../components/Hud";
import { MONO, zh } from "../../lib/fonts";
import { ease } from "../../lib/gsap";
import { SCRIPT } from "../timeline.ts";

const UI = SCRIPT.ui;
export const GREEN = "#3ff2a4";
export const RED = "#ff4d6d";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const glass: React.CSSProperties = {
  background: "linear-gradient(160deg, rgba(18,22,52,0.78), rgba(6,8,22,0.7))",
  border: "1px solid rgba(140,180,255,0.18)",
  borderRadius: 20,
  boxShadow: "0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
};

// ---------------- hook: equity race ----------------

/**
 * An equity curve revealed trade by trade. `reveal` is fractional so the line head glides
 * between trades instead of jumping.
 */
export const EquityPanel: React.FC<{
  name: string;
  winRate: number;
  equity: number[];
  reveal: number;
  liquidatedAt?: number;
  color: string;
  frame: number;
  crashFrame?: number;
  width?: number;
  height?: number;
}> = ({ name, winRate, equity, reveal, liquidatedAt = -1, color, frame, crashFrame = -1, width = 780, height = 470 }) => {
  const pad = { l: 70, r: 40, t: 90, b: 50 };
  const W = width - pad.l - pad.r;
  const H = height - pad.t - pad.b;
  const yMin = -6;
  const yMax = 42;
  const X = (i: number) => pad.l + (i / 40) * W;
  const Y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * H;

  const last = Math.min(reveal, equity.length - 1);
  const whole = Math.floor(last);
  const pts: [number, number][] = equity.slice(0, whole + 1).map((v, i) => [X(i), Y(v)]);
  if (last > whole && whole + 1 < equity.length) {
    const f = last - whole;
    const v = equity[whole] + (equity[whole + 1] - equity[whole]) * f;
    pts.push([X(last), Y(v)]);
  }
  const head = pts[pts.length - 1];
  const value = equity[Math.round(last)];
  const crashed = liquidatedAt > 0 && last >= liquidatedAt - 0.02;
  const crashAge = crashed && crashFrame >= 0 ? frame - crashFrame : 0;
  const shake = crashed && crashAge < 12 ? Math.sin(crashAge * 2.7) * (12 - crashAge) * 0.9 : 0;
  const line = crashed ? RED : color;
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const stamp = crashed ? ease("back.out(2.2)")(clamp01(crashAge / 12)) : 0;

  return (
    <div style={{ ...glass, width, height, position: "relative", overflow: "hidden", transform: `translateX(${shake}px)` }}>
      {crashed && <div style={{ position: "absolute", inset: 0, background: RED, opacity: Math.max(0, 0.35 - crashAge * 0.02) }} />}
      <div style={{ position: "absolute", left: 32, top: 24, display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ ...zh(900), fontSize: 34, color: "#fff" }}>{name}</span>
        <span style={{ ...zh(500), fontSize: 22, color: C.dim }}>{UI.winRate}</span>
        <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 30, color }}>{winRate}%</span>
      </div>
      <div style={{ position: "absolute", right: 32, top: 26, textAlign: "right" }}>
        <span style={{ ...zh(500), fontSize: 20, color: C.dim, marginRight: 12 }}>{UI.capital}</span>
        <span style={{ fontFamily: MONO.fontFamily, fontWeight: 700, fontSize: 30, color: crashed ? RED : C.text }}>{crashed ? 0 : Math.max(0, value).toFixed(1)}</span>
      </div>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id={`glow-${name}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0, 20, 40].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={pad.l + W} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? RED : "rgba(140,180,255,0.12)"} strokeDasharray={v === 0 ? "6 6" : undefined} strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={pad.l - 14} y={Y(v) + 5} fill={C.dim} fontSize={16} textAnchor="end" fontFamily={MONO.fontFamily}>
              {v}
            </text>
          </g>
        ))}
        <path d={d} fill="none" stroke={line} strokeWidth={4} strokeLinejoin="round" filter={`url(#glow-${name})`} />
        {head && <circle cx={head[0]} cy={head[1]} r={8} fill="#fff" filter={`url(#glow-${name})`} />}
      </svg>
      {crashed && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "52%",
            transform: `translate(-50%,-50%) rotate(-12deg) scale(${2.2 - stamp * 1.2})`,
            opacity: stamp,
            ...zh(900),
            fontSize: 92,
            color: RED,
            border: `6px solid ${RED}`,
            borderRadius: 16,
            padding: "4px 30px",
            letterSpacing: 12,
            textShadow: `0 0 30px ${RED}`,
            boxShadow: `0 0 40px ${RED}66`,
          }}
        >
          {UI.liquidated}
        </div>
      )}
    </div>
  );
};

// ---------------- expectancy: the formula, typeset term by term ----------------

export type FormulaValues = { p: number; win: number; loss: number };

const fmt = (v: number, digits = 1) => (Math.abs(v - Math.round(v)) < 1e-6 ? Math.round(v).toString() : v.toFixed(digits));

/**
 * E = P x W - (1-P) x L. `show` reveals terms left-to-right (0..1); with `values` the
 * symbolic labels give way to numbers and a coloured result.
 */
export type FormulaCallout = { k: number; color: string; node: React.ReactNode };
export type FormulaCallouts = Partial<Record<"win" | "loss" | "result", FormulaCallout>>;

/**
 * A leader line dropping from a term of the formula to a note under it, so the note stays
 * attached to the exact number it explains. Needs a card with clip={false}.
 */
const Callout: React.FC<{ c?: FormulaCallout }> = ({ c }) =>
  !c || c.k <= 0.01 ? null : (
    <span style={{ position: "absolute", left: "50%", top: "100%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
      <span style={{ width: 3, height: 54 * ease("power3.out")(c.k), background: `linear-gradient(${c.color}, ${c.color}88)`, boxShadow: `0 0 12px ${c.color}`, borderRadius: 2 }} />
      <span style={{ width: 12, height: 12, borderRadius: 6, background: c.color, boxShadow: `0 0 16px ${c.color}`, marginTop: -2, opacity: c.k }} />
      <span style={{ marginTop: 10, opacity: c.k, transform: `translateY(${(1 - c.k) * 12}px) scale(${0.85 + 0.15 * ease("back.out(2.4)")(c.k)})`, whiteSpace: "nowrap" }}>{c.node}</span>
    </span>
  );

export const Formula: React.FC<{
  show: number;
  values?: FormulaValues;
  numbers?: number;
  result?: number;
  size?: number;
  highlight?: ("win" | "loss")[];
  callouts?: FormulaCallouts;
  resultPulse?: number;
}> = ({ show, values, numbers = 0, result = 0, size = 64, highlight = [], callouts = {}, resultPulse = 0 }) => {
  const [E, P, W, Q, L] = UI.formula;
  const ev = values ? values.p * values.win - (1 - values.p) * values.loss : 0;
  const parts: { sym: string; num?: string; key?: "win" | "loss"; op?: boolean }[] = [
    { sym: E, op: false },
    { sym: "=", op: true },
    { sym: P, num: values && fmt(values.p) },
    { sym: "×", op: true },
    { sym: W, num: values && fmt(values.win), key: "win" },
    { sym: "−", op: true },
    { sym: Q, num: values && fmt(1 - values.p) },
    { sym: "×", op: true },
    { sym: L, num: values && fmt(values.loss), key: "loss" },
  ];
  const resColor = ev >= 0 ? GREEN : RED;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: size * 0.28, whiteSpace: "nowrap" }}>
      {parts.map((p, i) => {
        const k = clamp01(show * parts.length - i);
        const isNum = p.num !== undefined && numbers > 0;
        const hot = p.key && highlight.includes(p.key);
        return (
          <span
            key={i}
            style={{
              opacity: k,
              transform: `translateY(${(1 - ease("expo.out")(k)) * 30}px)`,
              display: "inline-block",
              position: "relative",
              color: p.op ? C.dim : i === 0 ? C.gold : hot ? C.amber : "#fff",
              ...(isNum ? { fontFamily: MONO.fontFamily, fontWeight: 700 } : zh(i === 0 ? 900 : 500)),
              fontSize: isNum ? size * 1.05 : p.op ? size : size * 0.82,
              textShadow: hot ? `0 0 24px ${C.amber}` : undefined,
            }}
          >
            {isNum ? p.num : p.sym}
            {p.key && isNum && <Callout c={callouts[p.key]} />}
          </span>
        );
      })}
      {values && result > 0 && (
        <span
          style={{
            fontFamily: MONO.fontFamily,
            fontWeight: 700,
            fontSize: size * 1.15,
            color: resColor,
            opacity: result,
            transform: `scale(${1.4 - ease("back.out(2)")(result) * 0.4 + resultPulse * 0.25})`,
            display: "inline-block",
            position: "relative",
            textShadow: `0 0 ${30 + resultPulse * 40}px ${resColor}`,
          }}
        >
          = {ev >= 0 ? "+" : "−"}
          {fmt(Math.abs(ev))}
          <Callout c={callouts.result} />
        </span>
      )}
    </div>
  );
};

// ---------------- expectancy as area: width = probability, height = payoff ----------------

export const AreaChart: React.FC<{
  values: FormulaValues;
  grow: number;
  label: string;
  showNet?: number;
  width?: number;
  height?: number;
}> = ({ values, grow, label, showNet = 0, width = 700, height = 520 }) => {
  const pad = 60;
  const W = width - pad * 2;
  const unit = 52; // px per 1 unit of payoff
  const axisY = height * 0.46;
  const g = ease("expo.out")(clamp01(grow * 1.3));
  const r = ease("expo.out")(clamp01(grow * 1.3 - 0.3));
  const winW = W * values.p;
  const lossW = W * (1 - values.p);
  const winH = values.win * unit * g;
  const lossH = values.loss * unit * r;
  const ev = values.p * values.win - (1 - values.p) * values.loss;
  const evColor = ev >= 0 ? GREEN : RED;
  return (
    <div style={{ ...glass, width, height, position: "relative" }}>
      <div style={{ position: "absolute", left: 30, top: 22, ...zh(900), fontSize: 30, color: "#fff" }}>{label}</div>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <rect x={pad} y={axisY - winH} width={winW} height={winH} fill={`${GREEN}55`} stroke={GREEN} strokeWidth={2} />
        <rect x={pad + winW} y={axisY} width={lossW} height={lossH} fill={`${RED}55`} stroke={RED} strokeWidth={2} />
        <line x1={pad - 10} x2={pad + W + 10} y1={axisY} y2={axisY} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        <text x={pad + winW / 2} y={axisY + 30} fill={GREEN} fontSize={20} textAnchor="middle" fontFamily={MONO.fontFamily} opacity={g}>
          {Math.round(values.p * 100)}%
        </text>
        <text x={pad + winW / 2} y={axisY - winH - 12} fill="#fff" fontSize={22} textAnchor="middle" fontFamily={MONO.fontFamily} opacity={g}>
          +{fmt(values.win)}
        </text>
        <text x={pad + winW + lossW / 2} y={axisY - 12} fill={RED} fontSize={20} textAnchor="middle" fontFamily={MONO.fontFamily} opacity={r}>
          {Math.round((1 - values.p) * 100)}%
        </text>
        <text x={pad + winW + lossW / 2} y={Math.min(axisY + lossH + 30, height - 14)} fill="#fff" fontSize={22} textAnchor="middle" fontFamily={MONO.fontFamily} opacity={r}>
          −{fmt(values.loss)}
        </text>
      </svg>
      {showNet > 0 && (
        <div
          style={{
            position: "absolute",
            right: 28,
            top: 20,
            opacity: showNet,
            fontFamily: MONO.fontFamily,
            fontWeight: 700,
            fontSize: 36,
            color: evColor,
            textShadow: `0 0 20px ${evColor}`,
          }}
        >
          <span style={{ ...zh(500), fontSize: 20, color: C.dim, marginRight: 10 }}>{UI.perTrade}</span>
          {ev >= 0 ? "+" : "−"}
          {fmt(Math.abs(ev))}
        </div>
      )}
    </div>
  );
};

export const lerpValues = (a: FormulaValues, b: FormulaValues, k: number): FormulaValues => ({
  p: a.p + (b.p - a.p) * k,
  win: a.win + (b.win - a.win) * k,
  loss: a.loss + (b.loss - a.loss) * k,
});

export const appear = (frame: number, at: number, dur = 18) => ease("expo.out")(clamp01((frame - at) / dur));
export const fadeOut = (frame: number, at: number, dur = 14) => 1 - clamp01((frame - at) / dur);
export const window01 = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
