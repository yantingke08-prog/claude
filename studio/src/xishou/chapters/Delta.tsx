// 02 Delta ≠ 方向 — the same Delta bars under a breakdown and under a hold.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { keys, lin, prog } from "../anim";
import { Candles, DeltaBars, HLine, makeScale, PriceAxis, Zone } from "../components/Chart";
import { Cam, Panel, Slate, Tag } from "../components/Frame";
import { ABSORB, BREAKDOWN, KEY_LEVEL, PRE, ZONE } from "../market";
import { at, chapter } from "../script";
import { C, FONT, H, MONO, T, W } from "../theme";

export const Delta: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("delta");
  const s = makeScale(100, 470, 800, 520, PRE.length + BREAKDOWN.length, 95, 103.5);
  const y0 = 1040; // Delta zero line
  const formula = prog(f, at(ch, 0, 0.1), 18);
  const preDelta = lin(f, at(ch, 0, 0.2), 40) * PRE.length;
  const gauge = prog(f, at(ch, 1, 0.3), 14);
  const down = lin(f, at(ch, 2, 0.05), Math.max(20, ch.speechDur[2] * 0.85)) * BREAKDOWN.length;
  const downTag = prog(f, at(ch, 3, 0.1), 14);
  const swap = prog(f, at(ch, 4, 0), 18); // breakdown → ghost, hold branch prints
  const hold = lin(f, at(ch, 4, 0.05), Math.max(20, ch.speechDur[4] * 0.85)) * ABSORB.length;
  const sameTag = prog(f, at(ch, 4, 0.55), 14);
  const bidTag = prog(f, at(ch, 5, 0.3), 14);
  const push = keys(f, [[0, 1], [ch.dur, 1.025]]);
  const lastDown = BREAKDOWN[BREAKDOWN.length - 1];
  return (
    <AbsoluteFill>
      <Cam s={push} oy={820}>
        <Panel x={64} y={300} w={952} h={1050} title="价格 × Delta" en="PRICE / DELTA" />
        <svg width={W} height={H} style={{ position: "absolute" }}>
          <PriceAxis s={s} step={2} o={0.8} />
          <HLine s={s} p={KEY_LEVEL} draw={1} color={C.cyan} dash="6 6" width={1.5} />
          <Candles s={s} data={PRE} from={0} reveal={PRE.length} />
          <Candles s={s} data={BREAKDOWN} from={PRE.length} reveal={down} opacity={1 - 0.75 * swap} ghost={swap > 0.5} />
          <Zone s={s} lo={ZONE.lo} hi={ZONE.hi} from={PRE.length} to={PRE.length + ABSORB.length - 1} grow={prog(f, at(ch, 4, 0.3), 20)} />
          <Candles s={s} data={ABSORB} from={PRE.length} reveal={hold} />
          <text x={s.x} y={1310} fill={C.sub} fontFamily={FONT} fontSize={T.xs}>
            Delta = 主动买 − 主动卖（每根 K 线）
          </text>
          <DeltaBars s={s} data={PRE} from={0} reveal={preDelta} y0={y0} h={200} />
          {/* the branch Delta is identical under both price paths */}
          <DeltaBars s={s} data={BREAKDOWN} from={PRE.length} reveal={Math.max(down, hold)} y0={y0} h={200} />
        </svg>
        {/* terminal readout of the definition */}
        <div style={{ position: "absolute", left: 100, top: 360, fontFamily: MONO, fontSize: T.m, color: C.text, opacity: formula, clipPath: `inset(0 ${(1 - formula) * 100}% 0 0)` }}>
          <span style={{ color: C.cyan }}>Delta</span> = 主动买 <span style={{ color: C.sub }}>−</span> 主动卖
        </div>
        <Tag x={600} y={1302} ax={s.X(PRE.length + 3)} ay={y0 + 60} text="谁更着急 ≠ 往哪走" color={C.amber} o={gauge * (1 - swap)} />
        <Tag x={540} y={590} ax={s.X(PRE.length + BREAKDOWN.length - 1)} ay={s.Y(lastDown.l)} text="价格破位 · 下方没人接" en="SELLERS WIN" color={C.redText} o={downTag * (1 - swap)} />
        <Tag x={540} y={590} ax={s.X(PRE.length + 6)} ay={s.Y(ZONE.lo)} text="同样的卖压，价格不创新低" color={C.amber} o={sameTag} />
        <Tag x={540} y={680} ax={s.X(PRE.length + 10)} ay={s.Y(ZONE.lo) + 4} text="限价买单在承接" en="RESPONSIVE BID" color={C.greenText} o={bidTag} />
      </Cam>
      <Slate f={f} big={ch.slate!.big} small={ch.slate!.small} tone={ch.slate!.tone} until={(ch.lead ?? 0) + 12} />
    </AbsoluteFill>
  );
};
