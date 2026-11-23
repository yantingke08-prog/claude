// 174–187 s: three B-roll slots. A clip in public/broll/brollN.mp4 is used when present
// (darkened 25 %, slightly desaturated, muted); otherwise a code-built stand-in plays.
import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { BROLL_SLOTS } from "../broll.ts";
import { ADV, CASE, HOOK, type Bar } from "../data.ts";
import { Candles, clamp01, easeInOutSine, easeOutCubic, lerp, makeScale, ramp, rangeOf, useTime } from "../kit";
import { C, FONT, MONO, glow, withAlpha, N } from "../theme.ts";

type P = { broll?: Record<string, boolean> };
const GRADE = "brightness(0.75) saturate(0.85)";

const Slot: React.FC<{ id: "broll1" | "broll2" | "broll3"; broll?: Record<string, boolean>; children: React.ReactNode }> = ({ id, broll, children }) => {
  const slot = BROLL_SLOTS.find((s) => s.id === id)!;
  if (broll?.[id])
    return (
      <AbsoluteFill style={{ background: N.black }}>
        <OffthreadVideo src={staticFile(slot.file)} muted style={{ width: "100%", height: "100%", objectFit: "cover", filter: GRADE }} />
      </AbsoluteFill>
    );
  return <AbsoluteFill style={{ background: C.bgEdge, filter: GRADE }}>{children}</AbsoluteFill>;
};

/** a chart on a "screen": static, full history */
const Screen: React.FC<{ bars: Bar[]; w: number; h: number; pad?: number; children?: React.ReactNode }> = ({ bars, w, h, pad = 24, children }) => {
  const r = rangeOf(bars, 0.1);
  const s = makeScale({ n: bars.length, x0: pad, x1: w - pad, top: pad + 20, bottom: h - pad, ...r });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", background: `radial-gradient(circle at 40% 40%, ${C.bgCenter}, ${C.bgEdge})` }}>
      {Array.from({ length: 6 }, (_, k) => (
        <line key={k} x1={0} x2={w} y1={(h * (k + 1)) / 7} y2={(h * (k + 1)) / 7} stroke={withAlpha(C.grid, 0.9)} strokeWidth={1} />
      ))}
      <Candles bars={bars} sc={s} appear={() => Number.NEGATIVE_INFINITY} />
      {children}
    </svg>
  );
};

// #1 tablet with a hand-drawn circle around candles
export const Broll1: React.FC<P> = ({ broll }) => {
  const { t, shotStart, shotEnd } = useTime();
  const k = easeInOutSine(clamp01((t - shotStart) / (shotEnd - shotStart)));
  const draw = ramp(t, shotStart + 0.6, 1.1, easeOutCubic);
  const arrow = ramp(t, shotStart + 1.6, 0.5, easeOutCubic);
  const bars = CASE.bars.slice(0, 36);
  return (
    <Slot id="broll1" broll={broll}>
      <AbsoluteFill style={{ perspective: 1800, alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            transform: `rotateX(${lerp(30, 24, k)}deg) rotateZ(${lerp(-8, -5, k)}deg) scale(${lerp(1, 1.08, k)})`,
            padding: 28,
            borderRadius: 48,
            background: N.device,
            boxShadow: `0 60px 120px rgba(0,0,0,0.7), inset 0 0 0 2px ${N.deviceRim}`,
          }}
        >
          <div style={{ borderRadius: 22, overflow: "hidden" }}>
            <Screen bars={bars} w={1240} h={780}>
              <ellipse
                cx={760}
                cy={560}
                rx={150}
                ry={95}
                fill="none"
                stroke={N.pen}
                strokeWidth={7}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - draw}
                transform="rotate(-8 760 560)"
              />
              {arrow > 0 && <line x1={560} y1={300} x2={lerp(560, 650, arrow)} y2={lerp(300, 450, arrow)} stroke={N.pen} strokeWidth={7} strokeLinecap="round" />}
            </Screen>
          </div>
        </div>
      </AbsoluteFill>
    </Slot>
  );
};

// #2 two monitors + a laptop
export const Broll2: React.FC<P> = ({ broll }) => {
  const { t, shotStart, shotEnd } = useTime();
  const k = easeInOutSine(clamp01((t - shotStart) / (shotEnd - shotStart)));
  const bezel = (child: React.ReactNode) => (
    <div style={{ padding: 16, borderRadius: 14, background: N.bezel, boxShadow: `0 40px 80px rgba(0,0,0,0.65), inset 0 0 0 2px ${N.bezelRim}` }}>{child}</div>
  );
  return (
    <Slot id="broll2" broll={broll}>
      <AbsoluteFill style={{ perspective: 2200, alignItems: "center", justifyContent: "center", transform: `translateX(${lerp(40, -40, k)}px) scale(${lerp(1, 1.05, k)})` }}>
        <div style={{ display: "flex", gap: 30, transform: "rotateX(6deg)", marginTop: -200 }}>
          <div style={{ transform: "rotateY(14deg)" }}>{bezel(<Screen bars={HOOK.bars} w={760} h={440} />)}</div>
          <div style={{ transform: "rotateY(-14deg)" }}>{bezel(<Screen bars={ADV.bars} w={760} h={440} />)}</div>
        </div>
        <div style={{ position: "absolute", top: 560, transform: "rotateX(30deg)" }}>
          {bezel(<Screen bars={CASE.bars.slice(20)} w={600} h={330} />)}
          <div style={{ width: 680, height: 36, marginLeft: -24, background: N.base, borderRadius: "0 0 18px 18px" }} />
        </div>
      </AbsoluteFill>
    </Slot>
  );
};

// #3 hands on a laptop keyboard (stand-in: keys lighting as they are typed)
export const Broll3: React.FC<P> = ({ broll }) => {
  const { t, shotStart } = useTime();
  const rows = [14, 14, 13, 12];
  const f = Math.floor((t - shotStart) * 12);
  return (
    <Slot id="broll3" broll={broll}>
      <AbsoluteFill style={{ perspective: 1400, alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: "rotateX(52deg) translateY(60px)", padding: 30, borderRadius: 26, background: N.deck, boxShadow: "0 60px 120px rgba(0,0,0,0.7)" }}>
          {rows.map((n, r) => (
            <div key={r} style={{ display: "flex", gap: 12, marginBottom: 12, marginLeft: r * 26 }}>
              {Array.from({ length: n }, (_, c) => {
                const lit = (c * 7 + r * 13 + f * 5) % 23 < 2;
                return (
                  <div
                    key={c}
                    style={{
                      width: 92,
                      height: 84,
                      borderRadius: 12,
                      background: lit ? withAlpha(C.text, 0.9) : N.key,
                      boxShadow: lit ? `0 0 22px ${withAlpha(C.text, 0.7)}` : `inset 0 -5px 0 ${N.keyShadow}`,
                    }}
                  />
                );
              })}
            </div>
          ))}
          <div style={{ width: 640, height: 60, margin: "8px auto 0", borderRadius: 12, background: N.key }} />
        </div>
      </AbsoluteFill>
    </Slot>
  );
};

// 186.5–188.5: dark, data bars ticking; the risk band narrows
export const Ticker: React.FC<P> = () => {
  const { t, shotStart, shotEnd } = useTime();
  const k = easeInOutSine(clamp01((t - shotStart) / Math.max(0.1, shotEnd - shotStart)));
  const vals = ["$1.82K", "$66.7", "$254.6"];
  const band = lerp(300, 60, k);
  return (
    <AbsoluteFill style={{ background: N.void, fontFamily: MONO }}>
      {vals.map((v, i) => (
        <div key={v} style={{ position: "absolute", left: 260 + i * 520, top: 230 - (((t - shotStart) * 30 * (i + 1)) % 60), color: withAlpha(C.muted, 0.8), fontSize: 64, fontWeight: 700 }}>
          {v}
          <div style={{ marginTop: 18, height: 10, width: 300 * (1 - 0.5 * k) * (1 - i * 0.15), borderRadius: 5, background: withAlpha(C.muted, 0.35) }} />
        </div>
      ))}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <rect x={300} y={600 - band / 2} width={1320} height={band} fill={withAlpha(C.support, 0.12)} />
        <line x1={300} x2={1620} y1={600 - band / 2} y2={600 - band / 2} stroke={C.resistance} strokeWidth={3} style={{ filter: glow(C.resistance, 8, 0.8) }} />
        <line x1={300} x2={1620} y1={600 + band / 2} y2={600 + band / 2} stroke={C.support} strokeWidth={3} style={{ filter: glow(C.support, 8, 0.8) }} />
        <text x={960} y={612} textAnchor="middle" fontFamily={FONT} fontSize={36} fontWeight={800} fill={C.text}>
          风险敞口
        </text>
      </svg>
    </AbsoluteFill>
  );
};
