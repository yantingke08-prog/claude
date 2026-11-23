// 137–174 s: holding a long — two failed breaks of an isolated low → 加仓 ✓ (with a warning),
// missed the entry → 建仓 ✓, then the dynamic-tracking summary.
import React from "react";
import { ADV } from "../data.ts";
import {
  Arrow,
  Bubble,
  Candles,
  Check,
  HLine,
  Label,
  Marker,
  PopG,
  PriceAxis,
  PushIn,
  Ring,
  Stage,
  TitleBar,
  dimFor,
  growSchedule,
  makeScale,
  pop,
  rangeOf,
  useTime,
} from "../kit";
import { C, FONT, withAlpha } from "../theme.ts";

const B = ADV.bars;
const R = rangeOf(B, 0.1);
const sc = makeScale({ n: B.length, x0: 420, x1: 1500, top: 230, bottom: 800, ...R });
const hi = (i: number) => sc.y(B[i].h);
const lo = (i: number) => sc.y(B[i].l);

export const Advanced: React.FC = () => {
  const { t, cue } = useTime();
  const g = growSchedule([
    { to: ADV.ENTRY - 1, at: cue("advDeeper"), per: 0.07 },
    { to: ADV.ENTRY, at: cue("advEntry") + 0.2, per: 0.2 },
    { to: ADV.T2 + 1, at: cue("advTwice"), per: 0.15 },
    { to: ADV.ADD, at: cue("advAddYes"), per: 0.2 },
    { to: ADV.END, at: cue("advDynamic"), per: 0.14 },
  ]);
  const warnAt = cue("advWarn");
  const warnOut = cue("advAlsoLong");
  const dim = dimFor(t, warnAt, warnOut);
  const second = cue("advAlsoLong");
  const t1 = g(ADV.T1 + 1);
  const t2 = g(ADV.T2 + 1);
  const ySup = lo(ADV.LOW);
  return (
    <>
      <PushIn dim={dim}>
        <Stage>
          <PriceAxis sc={sc} pMin={R.pMin} pMax={R.pMax} x={1800} />
          {/* the long thesis checklist (left column) */}
          <Label x={110} y={300} text="多头" color={C.up} fill anchor="start" at={cue("advLong")} out={cue("advDynamic")} size={40} />
          <Check x={290} y={300} at={cue("advLong") + 0.35} out={cue("advDynamic")} />
          <Check x={130} y={400} text="趋势判断" at={cue("advTrend") + 0.3} out={cue("advDynamic")} />
          <Check x={130} y={490} text="进场理由" at={cue("advReason") + 0.3} out={cue("advDynamic")} />
          <Arrow x1={sc.x(1)} y1={lo(1) + 40} x2={sc.x(ADV.ENTRY - 3)} y2={lo(ADV.ENTRY - 3) + 40} color={C.up} at={cue("advTrend") + 0.2} width={3} />

          <HLine y={ySup} x1={sc.x(ADV.LOW)} x2={1560} color={C.support} at={g(ADV.LOW + 1) + 0.1} label="孤立低点" />
          <Candles bars={B} sc={sc} appear={g} />
          <Bubble x={sc.x(ADV.ENTRY)} y={lo(ADV.ENTRY)} letter="B" color={C.up} at={cue("advEntry") + 0.4} out={cue("advMissed")} />
          {/* the missed entry, for the second trader */}
          <PopG at={cue("advMissed") + 0.1} x={sc.x(ADV.ENTRY)} y={lo(ADV.ENTRY) + 52}>
            <circle cx={sc.x(ADV.ENTRY)} cy={lo(ADV.ENTRY) + 52} r={26} fill="none" stroke={withAlpha(C.muted, 0.7)} strokeWidth={2.5} strokeDasharray="6 5" />
            <text x={sc.x(ADV.ENTRY)} y={lo(ADV.ENTRY) + 63} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={30} fill={withAlpha(C.muted, 0.7)}>
              B
            </text>
            <text x={sc.x(ADV.ENTRY)} y={lo(ADV.ENTRY) + 118} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={28} fill={C.muted}>
              错过
            </text>
          </PopG>
          <Marker x={sc.x(ADV.LOW)} y={lo(ADV.LOW)} dir="up" color={C.support} at={g(ADV.LOW + 1) + 0.1} />
          {[
            [ADV.T1, t1, "①"],
            [ADV.T2, t2, "②"],
          ].map(([i, at, n]) => (
            <g key={String(n)}>
              <Ring x={sc.x(i as number)} y={lo(i as number)} r={28} color={C.support} at={at as number} out={cue("advAddQ")} />
              <Ring x={sc.x(i as number)} y={lo(i as number)} r={28} color={C.support} at={cue("advTwice2") + (i === ADV.T2 ? 0.25 : 0)} out={cue("advBuildQ")} />
              <Label x={sc.x(i as number)} y={lo(i as number) + 66} text={String(n)} color={C.support} at={(at as number) + 0.15} size={26} out={cue("advDynamic")} />
            </g>
          ))}
          <Label x={1574} y={ySup + 62} text="两次没砸穿" color={C.support} anchor="start" size={26} at={t2 + 0.3} out={cue("advDynamic")} />
          <Label x={sc.x(ADV.ADD) + 120} y={hi(ADV.ADD) - 40} text="加仓？" color={C.text} at={cue("advAddQ")} out={cue("advAddYes")} />
          <Check x={sc.x(ADV.ADD) + 40} y={hi(ADV.ADD) - 40} text="加仓" at={cue("advAddYes") + 0.1} out={second} />
          <Label x={sc.x(ADV.ADD) + 120} y={hi(ADV.ADD) - 40} text="建仓？" color={C.text} at={cue("advBuildQ")} out={cue("advBuildYes")} />
          <Check x={sc.x(ADV.ADD) + 40} y={hi(ADV.ADD) - 40} text="建仓" at={cue("advBuildYes") + 0.1} out={cue("advDynamic")} />

          {/* dynamic tracking: where each decision sits */}
          <HLine y={hi(ADV.TOP)} x1={sc.x(ADV.TOP)} x2={1560} color={C.resistance} at={g(ADV.TOP + 1) + 0.1} label="止盈" />
          <HLine y={ySup + 62} x1={sc.x(ADV.LOW)} x2={1560} color={C.muted} at={cue("advSL")} dashed label="止损" />
        </Stage>
      </PushIn>
      <Warning at={warnAt} out={warnOut} />
      <Summary />
      <TitleBar zh="进阶 · 加仓与建仓" en="ADD / ENTER" at={cue("advDeeper") - 0.6} />
    </>
  );
};

const Warning: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const { t, cue } = useTime();
  const p = pop(t, at, out);
  if (p.opacity <= 0) return null;
  const row = (text: string, a: number) => {
    const q = pop(t, a, out);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: q.opacity, transform: `scale(${q.scale})`, transformOrigin: "0% 50%" }}>
        <span style={{ fontSize: 60, color: C.up }}>✓</span>
        <span>{text}</span>
      </div>
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        left: 960 - 520,
        top: 250,
        width: 1040,
        padding: "40px 60px 46px",
        borderRadius: 22,
        border: `3px solid ${C.text}`,
        background: withAlpha(C.bg, 0.9),
        boxShadow: `0 0 40px ${withAlpha(C.text, 0.25)}`,
        fontFamily: FONT,
        color: C.text,
        fontWeight: 900,
        fontSize: 64,
        lineHeight: 1.35,
        opacity: p.opacity,
        transform: `scale(${p.scale})`,
      }}
    >
      <div style={{ fontSize: 46, color: C.muted, marginBottom: 14, letterSpacing: 6 }}>⚠ 前提</div>
      {row("趋势判断是对的", cue("advPremise"))}
      {row("入场逻辑成立", cue("advLogic"))}
    </div>
  );
};

const Summary: React.FC = () => {
  const { t, cue } = useTime();
  const items: [string, string, number][] = [
    ["止盈", C.resistance, cue("advTP")],
    ["止损", C.support, cue("advSL")],
    ["加仓", C.up, cue("advAdd")],
    ["减仓", C.muted, cue("advReduce")],
    ["离场", C.muted, cue("advExit")],
  ];
  const head = pop(t, cue("advDynamic"));
  if (head.opacity <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 60, top: 250, width: 300, fontFamily: FONT }}>
      <div style={{ opacity: head.opacity, fontSize: 40, fontWeight: 900, color: C.text, marginBottom: 18, background: withAlpha(C.bg, 0.85), padding: "6px 0" }}>动态跟踪</div>
      {items.map(([txt, col, at]) => {
        const p = pop(t, at);
        return (
          <div
            key={txt}
            style={{
              opacity: p.opacity,
              transform: `scale(${p.scale})`,
              transformOrigin: "0% 50%",
              margin: "12px 0",
              padding: "8px 22px",
              width: 200,
              borderRadius: 10,
              border: `1.5px solid ${col}`,
              background: withAlpha(C.bg, 0.88),
              boxShadow: `0 0 14px ${withAlpha(col, 0.5)}`,
              color: C.text,
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            {txt}
          </div>
        );
      })}
    </div>
  );
};
