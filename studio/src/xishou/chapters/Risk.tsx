// 06 风险与失效 — stop beyond structure, invalidation is part of the trade, low volume, failure is normal.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { keys, lin, prog } from "../anim";
import { Candles, HLine, makeScale, PriceAxis, Zone } from "../components/Chart";
import { Cam, Panel, Tag } from "../components/Frame";
import { ABSORB, FAILURE, PRE, STOP, TICK, ZONE } from "../market";
import { at, chapter } from "../script";
import { C, FONT, H, MONO, T, W } from "../theme";

const PRE_TAIL = PRE.slice(-6);
const A0 = PRE_TAIL.length;
const F0 = A0 + ABSORB.length;
const FAIL_SHOWN = FAILURE.slice(0, 8);
const SLOTS = F0 + FAIL_SHOWN.length;

export const Risk: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("risk");
  const s = makeScale(96, 380, 800, 600, SLOTS, 97.5, 101.0);
  const stopDraw = prog(f, at(ch, 0, 0.15), 26);
  const ticks = prog(f, at(ch, 0, 0.6), 18);
  const perInstr = prog(f, at(ch, 1, 0.1), 14);
  const invalid = prog(f, at(ch, 2, 0.2), 16);
  const vol = prog(f, at(ch, 3, 0), 18);
  const lowVol = prog(f, at(ch, 3, 0.4), 14);
  const failP = lin(f, at(ch, 4, 0.05), Math.max(24, ch.speechDur[4] * 0.8)) * FAIL_SHOWN.length;
  const normal = prog(f, at(ch, 4, 0.6), 14);
  const push = keys(f, [[0, 1.0], [ch.dur, 1.025]]);
  const xR = s.X(A0 - 2); // ruler sits left of the zone, clear of candles
  const volY = 1290;
  const maxV = Math.max(...ABSORB.map((c) => c.v));
  return (
    <AbsoluteFill>
      <Cam s={push} oy={700}>
        <Panel x={64} y={296} w={952} h={1050} title="止损与失效" en="STOP / INVALIDATION" />
        <svg width={W} height={H} style={{ position: "absolute" }}>
          <PriceAxis s={s} step={0.5} o={0.75} />
          <Zone s={s} lo={ZONE.lo} hi={ZONE.hi} from={A0} to={SLOTS - 1} grow={1} />
          <Candles s={s} data={PRE_TAIL} from={0} reveal={PRE_TAIL.length} />
          <Candles s={s} data={ABSORB} from={A0} reveal={ABSORB.length} />
          <HLine s={s} p={STOP} draw={stopDraw} color={C.red} dash={invalid > 0.5 ? undefined : "8 6"} width={invalid > 0.5 ? 4 : 2.5} />
          {/* 1-2-3 tick ruler between structure low and the stop */}
          <g opacity={ticks}>
            {[0, 1, 2, 3].map((k) => (
              <g key={k}>
                <line x1={xR - 14} x2={xR + 14} y1={s.Y(ZONE.lo - k * TICK)} y2={s.Y(ZONE.lo - k * TICK)} stroke={C.redText} strokeWidth={2} />
                {k > 0 ? (
                  <text x={xR + 22} y={s.Y(ZONE.lo - k * TICK) + 8} fill={C.redText} fontFamily={MONO} fontSize={T.xs}>
                    {k}
                  </text>
                ) : null}
              </g>
            ))}
            <line x1={xR} x2={xR} y1={s.Y(ZONE.lo)} y2={s.Y(STOP)} stroke={C.redText} strokeWidth={2} />
          </g>
          <Candles s={s} data={FAIL_SHOWN} from={F0} reveal={failP} opacity={0.9} />
          {/* volume strip: thinner volume at the right = low-volume environment */}
          <g opacity={vol}>
            <text x={s.x} y={volY - 170} fill={C.sub} fontFamily={FONT} fontSize={T.xs}>
              成交量 Volume
            </text>
            {ABSORB.map((c, i) => {
              const low = i >= ABSORB.length - 6;
              const hgt = ((c.v * (low ? 0.28 : 1)) / maxV) * 130 * vol;
              return <rect key={i} x={s.X(A0 + i) - s.cw * 0.31} y={volY - hgt} width={s.cw * 0.62} height={hgt} fill={low ? C.amber : C.sub} opacity={low ? 0.4 + 0.5 * lowVol : 0.45} rx={1} />;
            })}
          </g>
        </svg>
        <Tag x={110} y={430} ax={xR} ay={s.Y(ZONE.lo - 1.5 * TICK)} text="结构外 2–3 个最小跳动" en="2–3 TICKS BEYOND" color={C.redText} o={ticks} size={T.xs} />
        <Tag x={110} y={492} text="跳动单位按品种调整" color={C.sub} o={perInstr * (1 - invalid)} size={T.xs} />
        <Tag x={110} y={492} ax={s.X(4)} ay={s.Y(STOP)} text="失效线 · 交易的一部分" en="INVALIDATION" color={C.redText} o={invalid} size={T.xs} />
        <Tag x={560} y={volY - 170} ax={s.X(A0 + ABSORB.length - 3)} ay={volY - 30} text="低量 → 不加仓" color={C.amber} o={lowVol} size={T.xs} />
        <Tag x={560} y={600} ax={s.X(F0 + 5)} ay={s.Y(FAIL_SHOWN[5].l)} text="吸收失败 = 正常结果" color={C.amber} o={normal} size={T.xs} />
      </Cam>
    </AbsoluteFill>
  );
};
