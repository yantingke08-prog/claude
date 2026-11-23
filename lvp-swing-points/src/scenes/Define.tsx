// 41–65 s: the 3-candle rule, isolated high (purple) and its mirror (blue), then 压力 / 支撑 that move.
import React from "react";
import { DEFINE_CHART, TRIO_HIGH, TRIO_LOW, type Bar } from "../data.ts";
import {
  Candles,
  HLine,
  Label,
  Marker,
  PopG,
  PushIn,
  Ring,
  Stage,
  TitleBar,
  clamp01,
  easeInOutSine,
  growSchedule,
  lerp,
  makeScale,
  ramp,
  rangeOf,
  useTime,
} from "../kit";
import { C, FONT, glow, withAlpha } from "../theme.ts";

const PMIN = 95.5;
const PMAX = 111.5;
const trioScale = (cx: number) => makeScale({ n: 3, x0: cx - 270, x1: cx + 270, top: 330, bottom: 790, pMin: PMIN, pMax: PMAX });

export const Define: React.FC = () => {
  const { t, cue } = useTime();
  const swap = cue("defResist");
  const trioOut = 1 - clamp01((t - swap) / 0.3);
  return (
    <>
      <PushIn>
        {trioOut > 0 && (
          <div style={{ position: "absolute", inset: 0, opacity: trioOut }}>
            <Trios />
          </div>
        )}
        {t >= swap && <Levels />}
      </PushIn>
      <TitleBar zh="定义 · 三根K线一组" en="THE 3-CANDLE RULE" at={cue("defGroup") - 0.6} />
    </>
  );
};

const Compare: React.FC<{ sc: ReturnType<typeof trioScale>; bars: Bar[]; key2: "h" | "l"; color: string; at: number; out?: number }> = ({ sc, bars, key2, color, at, out }) => {
  const mid = bars[1][key2];
  return (
    <g>
      {[0, 2].map((i) => (
        <HLine key={i} y={sc.y(bars[i][key2])} x1={sc.x(i) - 50} x2={sc.x(i) + 50} color={withAlpha(color, 1)} at={at + 0.1 * i} out={out} dashed />
      ))}
      <HLine y={sc.y(mid)} x1={sc.x(0) - 60} x2={sc.x(2) + 60} color={color} at={at + 0.35} out={out} dashed />
    </g>
  );
};

const Trios: React.FC = () => {
  const { t, cue } = useTime();
  const rev = cue("defReverse");
  const slide = easeInOutSine(clamp01((t - rev) / 0.6));
  const cx = lerp(960, 560, slide);
  const sc = trioScale(cx);
  const sl = trioScale(1360);
  const grow = growSchedule([{ to: 2, at: cue("defGroup") + 0.3, per: 0.2 }]);
  const growL = growSchedule([{ to: 2, at: rev + 0.4, per: 0.2 }]);
  const hi = TRIO_HIGH;
  const lo = TRIO_LOW;
  return (
    <Stage>
      <Candles bars={hi} sc={sc} appear={grow} />
      {/* bracket: 一组 */}
      <PopG at={cue("defGroup") + 0.9} x={cx} y={sc.y(PMIN) + 10}>
        <path d={`M${sc.x(0) - 60} ${sc.y(98.4)} v18 H${sc.x(2) + 60} v-18`} fill="none" stroke={C.muted} strokeWidth={2.5} />
        <text x={cx} y={sc.y(98.4) + 62} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={34} fill={C.muted}>
          一组
        </text>
      </PopG>
      {/* highs: middle ▽ first, then the two neighbours */}
      <Marker x={sc.x(1)} y={sc.y(hi[1].h)} dir="down" color={C.resistance} at={cue("defMidHigh")} />
      <Marker x={sc.x(0)} y={sc.y(hi[0].h)} dir="down" color={C.muted} at={cue("defNeighbourHighs")} />
      <Marker x={sc.x(2)} y={sc.y(hi[2].h)} dir="down" color={C.muted} at={cue("defNeighbourHighs") + 0.15} />
      <Compare sc={sc} bars={hi} key2="h" color={C.resistance} at={cue("defNeighbourHighs") + 0.4} out={cue("defLows")} />
      {/* lows: white △ */}
      {[0, 1, 2].map((i) => (
        <Marker key={i} x={sc.x(i)} y={sc.y(hi[i].l)} dir="up" color={C.text} at={cue("defLows") + 0.15 * i} />
      ))}
      <Compare sc={sc} bars={hi} key2="l" color={C.text} at={cue("defLowsAbove")} out={cue("defThisHigh")} />
      <Ring x={sc.x(1)} y={sc.y(hi[1].h)} r={34} color={C.resistance} at={cue("defThisHigh")} />
      <Label x={sc.x(1)} y={sc.y(hi[1].h) - 96} text="孤立高点" color={C.resistance} at={cue("defIsHigh")} size={40} />

      {/* the mirror image: 孤立低点 */}
      <Candles bars={lo} sc={sl} appear={growL} />
      {[0, 1, 2].map((i) => (
        <Marker key={i} x={sl.x(i)} y={sl.y(lo[i].l)} dir="up" color={i === 1 ? C.support : C.muted} at={rev + 0.9 + 0.1 * i} />
      ))}
      {[0, 1, 2].map((i) => (
        <Marker key={i} x={sl.x(i)} y={sl.y(lo[i].h)} dir="down" color={C.muted} at={rev + 1.1 + 0.1 * i} />
      ))}
      <Ring x={sl.x(1)} y={sl.y(lo[1].l)} r={34} color={C.support} at={cue("defIsLow")} />
      <Label x={sl.x(1)} y={sl.y(lo[1].l) + 100} text="孤立低点" color={C.support} at={cue("defIsLow") + 0.1} size={40} />
    </Stage>
  );
};

const D = DEFINE_CHART;
const R = rangeOf(D.bars, 0.12);
const dsc = makeScale({ n: D.bars.length, x0: 300, x1: 1400, top: 230, bottom: 780, ...R });

const Levels: React.FC = () => {
  const { t, cue } = useTime();
  const at = cue("defResist");
  const move = cue("defMove");
  const grow = growSchedule([
    { to: D.L1 + 2, at: at, per: 0.06 },
    { to: D.bars.length - 1, at: move, per: 0.12 },
  ]);
  const h2 = grow(D.H2 + 1) + 0.12;
  const l2 = grow(D.L2 + 1) + 0.12;
  const kh = ramp(t, h2, 0.5, easeInOutSine);
  const kl = ramp(t, l2, 0.5, easeInOutSine);
  const yR = lerp(dsc.y(D.bars[D.H1].h), dsc.y(D.bars[D.H2].h), kh);
  const yS = lerp(dsc.y(D.bars[D.L1].l), dsc.y(D.bars[D.L2].l), kl);
  const xEnd = 1440;
  const pulse = t > cue("defNotDead") && t < move ? 0.5 + 0.5 * Math.sin((t - cue("defNotDead")) * 9) : 1;
  return (
    <Stage>
      <Candles bars={D.bars} sc={dsc} appear={grow} />
      <g style={{ opacity: pulse }}>
        <HLine y={yR} x1={dsc.x(D.H1)} x2={xEnd} color={C.resistance} at={at + 0.4} label="压力位" />
        <HLine y={yS} x1={dsc.x(D.L1)} x2={xEnd} color={C.support} at={cue("defSupport")} label="支撑位" />
      </g>
      <Marker x={dsc.x(D.H1)} y={dsc.y(D.bars[D.H1].h)} dir="down" color={C.resistance} at={at + 0.3} />
      <Marker x={dsc.x(D.L1)} y={dsc.y(D.bars[D.L1].l)} dir="up" color={C.support} at={cue("defSupport")} />
      <Marker x={dsc.x(D.H2)} y={dsc.y(D.bars[D.H2].h)} dir="down" color={C.resistance} at={h2} />
      <Marker x={dsc.x(D.L2)} y={dsc.y(D.bars[D.L2].l)} dir="up" color={C.support} at={l2} />
      <Label x={dsc.x(D.H2) + 10} y={dsc.y(D.bars[D.H2].h) - 84} text="跟着挪 ↑" color={C.resistance} at={h2 + 0.3} size={28} />
      <Label x={dsc.x(D.L2) + 10} y={dsc.y(D.bars[D.L2].l) + 84} text="跟着挪 ↑" color={C.support} at={l2 + 0.3} size={28} />
      {t > cue("defNotDead") && t < move && (
        <text x={xEnd - 40} y={dsc.y(D.bars[D.L1].l) + 80} textAnchor="end" fontFamily={FONT} fontWeight={800} fontSize={34} fill={C.muted} style={{ filter: glow(C.text, 6, 0.3) }}>
          不是死线
        </text>
      )}
    </Stage>
  );
};
