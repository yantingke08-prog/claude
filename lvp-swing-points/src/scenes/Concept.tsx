// 28–41 s: a line path — entry → rally → isolated high (buy-side liquidity) → pullback → second test.
import React from "react";
import { CONCEPT } from "../data.ts";
import { Arrow, Bubble, HLine, Label, Marker, PopG, PushIn, Ring, Stage, TitleBar, clamp01, lerp, useTime } from "../kit";
import { C, glow, withAlpha } from "../theme.ts";

const P = CONCEPT.p;
const pMin = Math.min(...P) - 3;
const pMax = Math.max(...P) + 6;
const X0 = 180;
const X1 = 1500;
const x = (i: number) => X0 + ((X1 - X0) * i) / (P.length - 1);
const y = (p: number) => 800 - ((p - pMin) / (pMax - pMin)) * 560;

/** fractional index drawn so far: each segment grows from its cue at 0.15 s per point */
const progress = (t: number, segs: { to: number; at: number }[]) => {
  let idx = 0;
  let from = 0;
  for (const s of segs) {
    if (t < s.at) break;
    idx = Math.min(s.to, from + (t - s.at) / 0.15);
    from = s.to;
  }
  return idx;
};

export const Concept: React.FC = () => {
  const { t, cue } = useTime();
  const idx = progress(t, [
    { to: CONCEPT.ENTRY, at: cue("conEntry") - 0.2 },
    { to: CONCEPT.HIGH, at: cue("conEntry") + 0.3 },
    { to: 13, at: cue("conPullback") },
    { to: CONCEPT.RETEST, at: cue("conRetest") },
  ]);
  const n = Math.floor(idx);
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push([x(i), y(P[i])]);
  if (idx > n && n + 1 < P.length) pts.push([lerp(x(n), x(n + 1), idx - n), lerp(y(P[n]), y(P[n + 1]), idx - n)]);
  const tip = pts[pts.length - 1];
  const high = y(P[CONCEPT.HIGH]);
  const eaten = clamp01((t - cue("conCards")) / 0.8);

  return (
    <>
      <PushIn>
        <Stage>
          {/* rising legs red, falling legs green (红涨绿跌) */}
          {pts.slice(1).map(([a, b], i) => {
            const col = b <= pts[i][1] ? C.up : C.down;
            return <line key={i} x1={pts[i][0]} y1={pts[i][1]} x2={a} y2={b} stroke={col} strokeWidth={5} strokeLinecap="round" style={{ filter: glow(col, 12, 0.55) }} />;
          })}
          {tip && <circle cx={tip[0]} cy={tip[1]} r={8} fill={C.text} style={{ filter: glow(C.text, 10, 0.8) }} />}
          <Bubble x={x(CONCEPT.ENTRY)} y={y(P[CONCEPT.ENTRY])} letter="B" color={C.up} at={cue("conEntry")} />
          <Marker x={x(CONCEPT.HIGH)} y={high} dir="down" color={C.resistance} at={cue("conHigh") + 0.4} />
          <Label x={x(CONCEPT.HIGH)} y={high - 92} text="孤立高点" color={C.resistance} at={cue("conHigh") + 0.55} />
          <HLine y={high} x1={x(CONCEPT.HIGH) - 30} x2={X1 + 40} color={C.resistance} at={cue("conOrderFlow")} />
          {/* resting buy orders above the high (stops of shorts + breakout buyers) */}
          <PopG at={cue("conPool")} x={x(13)} y={high - 70}>
            {[0.7, 1, 0.85, 0.55].map((w, k) => (
              <rect
                key={k}
                x={x(11.2)}
                y={high - 30 - k * 26}
                width={360 * w * (1 - eaten * (k < 3 ? 1 : 0.4))}
                height={16}
                rx={8}
                fill={withAlpha(C.up, 0.35 + k * 0.1)}
                stroke={C.up}
                strokeWidth={1}
              />
            ))}
          </PopG>
          <Label x={x(13.5)} y={high - 160} text="买方流动性池" color={C.up} at={cue("conEaten")} size={34} />
          <Arrow x1={x(14.6)} y1={y(P[14]) + 70} x2={x(CONCEPT.RETEST) - 8} y2={high + 14} color={C.resistance} at={cue("conRetest") + 0.5} />
          <Label x={x(15.6)} y={y(P[14]) + 120} text="二次测试" color={C.resistance} at={cue("conRetest") + 0.7} />
          <Ring x={x(CONCEPT.RETEST)} y={high} r={44} color={C.text} at={cue("conCards")} />
        </Stage>
      </PushIn>
      <TitleBar zh="什么是孤立高低点" en="SWING HIGH / LOW" at={cue("conQuestion")} />
    </>
  );
};
