// 65–137 s: one chart grown with the voice. Resistance / support from isolated highs and lows,
// breakout ✓, support held twice, big bull candle → hold; counter-example (fake break → reduce);
// short view (空) with "holds → reduce" vs "breaks → keep holding".
import React from "react";
import { CASE, CASE_FAKE, CASE_HOLD } from "../data.ts";
import {
  Arrow,
  Bubble,
  Candles,
  Check,
  FocusBox,
  HLine,
  Label,
  Marker,
  PriceAxis,
  PushIn,
  Ring,
  Stage,
  TitleBar,
  easeInOutSine,
  growSchedule,
  lerp,
  makeScale,
  ramp,
  rangeOf,
  useTime,
} from "../kit";
import { C } from "../theme.ts";

const B = CASE.bars;
const R = rangeOf([...B, ...CASE_FAKE.bars, ...CASE_HOLD.bars], 0.07);
const sc = makeScale({ n: B.length, x0: 100, x1: 1600, top: 200, bottom: 820, ...R });
const XR = 1640; // right end of level lines
const hi = (i: number) => sc.y(B[i].h);
const lo = (i: number) => sc.y(B[i].l);

export const Case: React.FC = () => {
  const { t, cue } = useTime();
  const g = growSchedule([
    { to: CASE.H1 - 1, at: cue("caseH1") - 0.2, per: 0.08 },
    { to: CASE.H1 + 1, at: cue("caseH1") + 0.6, per: 0.2 },
    { to: CASE.L1 + 1, at: cue("caseDown") },
    { to: CASE.APPROACH, at: cue("caseBack") },
    { to: CASE.BREAK, at: cue("caseBreak"), per: 0.2 },
    { to: CASE.H2 + 1, at: cue("caseH2") - 0.3, per: 0.16 },
    { to: CASE.DOWN2 - 1, at: cue("caseDown2") },
    { to: CASE.L2 + 1, at: cue("caseHeld"), per: 0.25 },
    { to: CASE.UP2, at: cue("caseUp2") },
    { to: CASE.NEAR, at: cue("caseObserve") },
    { to: CASE.HOLD, at: cue("caseNotCapped") + 0.3, per: 0.3 },
    { to: CASE.BIG, at: cue("caseBig") + 0.1, per: 0.4 },
    { to: CASE.RUN, at: cue("caseHoldOn") },
    { to: CASE.SHORT, at: cue("caseShortTurn") + 0.2 },
    { to: CASE.L3 + 1, at: cue("caseL3") - 0.4 },
    { to: CASE.BOUNCE, at: cue("caseL3Watch") + 0.6, per: 0.2 },
    { to: CASE.BREAKDOWN, at: cue("caseSlam") + 0.3, per: 0.2 },
    { to: CASE.END, at: cue("caseShortHold") },
  ]);

  // counter-example window: real bars after the breakout dim, a fake-break branch is drawn
  const failAt = cue("caseFail");
  const failOut = cue("caseShortTurn");
  const inFail = t > failAt && t < failOut + 0.3;
  const failDim = (i: number) => (i >= CASE.BIG && i <= CASE.RUN ? 1 - 0.8 * (ramp(t, failAt, 0.3) - ramp(t, failOut, 0.3)) : 1);
  // short view "始终不破" branch
  const holdAt = cue("caseNoBreak");
  const holdOut = cue("caseSlam");
  const longOut = failOut; // everything about the long trade leaves when the short view starts

  // resistance follows the isolated highs (H1 → H2), support stays on L1 for the long trade
  const kR = ramp(t, cue("caseH2") + 0.3, 0.5, easeInOutSine);
  const yRes = lerp(hi(CASE.H1), hi(CASE.H2), kR);
  const xRes = lerp(sc.x(CASE.H1), sc.x(CASE.H2), kR);
  const ySup = lo(CASE.L1);

  return (
    <>
      <PushIn>
        <Stage>
          <PriceAxis sc={sc} pMin={R.pMin} pMax={R.pMax} x={1800} />
          {/* levels */}
          <HLine y={yRes} x1={xRes} x2={XR} color={C.resistance} at={cue("caseResist") + 0.2} out={cue("caseDraw")} dashed label="潜在压力" />
          <HLine y={yRes} x1={xRes} x2={XR} color={C.resistance} at={cue("caseDraw") + 0.1} out={longOut} label="压力位" />
          <HLine y={ySup} x1={sc.x(CASE.L1)} x2={XR} color={C.support} at={cue("caseSupport") + 0.1} out={longOut} label="支撑位" />
          <HLine y={lo(CASE.L3)} x1={sc.x(CASE.L3)} x2={XR} color={C.support} at={cue("caseL3") + 0.6} label="支撑位" />

          <Candles bars={B} sc={sc} appear={g} opacity={failDim} />
          {inFail && <Candles bars={CASE_FAKE.bars} sc={sc} offset={CASE_FAKE.from} ghost appear={(k) => failAt + 0.3 + k * 0.25} opacity={1 - ramp(t, failOut, 0.3)} />}
          {t > holdAt && t < holdOut + 0.3 && (
            <Candles bars={CASE_HOLD.bars} sc={sc} offset={CASE_HOLD.from} ghost appear={(k) => holdAt + 0.2 + k * 0.22} opacity={1 - ramp(t, holdOut, 0.3)} />
          )}

          {/* pivots */}
          <Marker x={sc.x(CASE.H1)} y={hi(CASE.H1)} dir="down" color={C.resistance} at={g(CASE.H1 + 1) + 0.15} />
          <Label x={sc.x(CASE.H1)} y={hi(CASE.H1) - 82} text="孤立高点" color={C.resistance} at={g(CASE.H1 + 1) + 0.3} out={cue("caseBack")} />
          <Marker x={sc.x(CASE.L1)} y={lo(CASE.L1)} dir="up" color={C.support} at={cue("caseL1")} />
          <Label x={sc.x(CASE.L1)} y={lo(CASE.L1) + 82} text="孤立低点" color={C.support} at={cue("caseL1") + 0.15} out={cue("caseDown2")} />

          {/* watch the break of resistance */}
          <FocusBox x={sc.x(CASE.APPROACH) - 70} y={hi(CASE.H1) - 70} w={260} h={140} color={C.text} at={cue("caseFocus")} out={cue("caseBreak")} />
          <Arrow x1={sc.x(CASE.APPROACH) + 60} y1={hi(CASE.H1) + 40} x2={sc.x(CASE.APPROACH) + 60} y2={hi(CASE.H1) - 50} color={C.up} at={cue("caseBreakAct") + 0.3} out={cue("caseBreak")} />
          <Check x={sc.x(CASE.BREAK) - 140} y={hi(CASE.H1) - 110} text="突破" at={cue("caseBreak") + 0.5} out={cue("caseDown2")} />
          <Marker x={sc.x(CASE.H2)} y={hi(CASE.H2)} dir="down" color={C.resistance} at={cue("caseH2") + 0.3} out={longOut} />
          <Label x={sc.x(CASE.H2)} y={hi(CASE.H2) - 82} text="新的孤立高点" color={C.resistance} at={cue("caseH2") + 0.4} out={cue("caseObserve")} />

          {/* watch the support */}
          <FocusBox x={sc.x(CASE.DOWN2) - 120} y={ySup - 60} w={300} h={120} color={C.text} at={cue("caseSupAct")} out={cue("caseL2")} />
          <Marker x={sc.x(CASE.L2)} y={lo(CASE.L2)} dir="up" color={C.support} at={cue("caseL2")} out={longOut} />
          <Label x={sc.x(CASE.L2) + 10} y={lo(CASE.L2) + 82} text="又一个孤立低点" color={C.support} at={cue("caseL2") + 0.15} out={cue("caseLook")} />
          <Ring x={sc.x(CASE.L1)} y={ySup} r={30} color={C.support} at={cue("caseTwice")} out={cue("caseObserve")} />
          <Ring x={sc.x(CASE.L2)} y={lo(CASE.L2)} r={30} color={C.support} at={cue("caseTwice") + 0.2} out={cue("caseObserve")} />
          <Label x={(sc.x(CASE.L1) + sc.x(CASE.L2)) / 2} y={ySup + 86} text="支撑了两次" color={C.support} at={cue("caseTwice") + 0.35} out={longOut} />

          {/* top the high? big bull candle */}
          <FocusBox x={sc.x(CASE.NEAR) - 60} y={hi(CASE.H2) - 60} w={230} h={120} color={C.text} at={cue("caseCanTop")} out={cue("caseBig")} />
          <Check x={sc.x(CASE.BIG) - 230} y={hi(CASE.H2) - 100} text="突破" at={cue("caseThrough") + 0.3} out={longOut} />
          <Bubble x={sc.x(CASE.BIG)} y={lo(CASE.BIG)} letter="B" color={C.up} at={cue("caseLong")} out={longOut} />
          <Label x={sc.x(CASE.RUN) + 30} y={hi(CASE.RUN) - 80} text="继续持有" color={C.up} at={cue("caseHoldOn") + 0.4} out={failAt} />

          {/* counter-example */}
          <Label x={sc.x(CASE.BIG + 1) + 20} y={sc.y(116.4) - 80} text="假突破" color={C.muted} at={cue("caseFake") + 0.2} out={failOut} />
          <Label x={sc.x(CASE.BIG + 4) + 60} y={sc.y(108.5) + 40} text="减仓 / 离场" color={C.muted} at={cue("caseReduce")} out={failOut} size={34} />

          {/* short view */}
          <Bubble x={sc.x(CASE.TOP + 1)} y={hi(CASE.TOP + 1)} letter="空" color={C.down} below={false} at={cue("caseShort") + 0.3} />
          <Marker x={sc.x(CASE.L3)} y={lo(CASE.L3)} dir="up" color={C.support} at={cue("caseL3") + 0.4} />
          <Label x={sc.x(CASE.L3) - 30} y={lo(CASE.L3) + 82} text="孤立低点" color={C.support} at={cue("caseL3") + 0.55} out={cue("caseNoBreak")} />
          <FocusBox x={sc.x(CASE.L3) + 40} y={lo(CASE.L3) - 60} w={260} h={120} color={C.text} at={cue("caseL3Watch") + 0.3} out={holdAt} />
          <Label x={sc.x(CASE.SLAM) + 70} y={lo(CASE.L3) - 140} text="不破 → 减仓" color={C.muted} at={cue("caseShortReduce")} out={holdOut} />
          <Label x={sc.x(CASE.BREAKDOWN) - 10} y={lo(CASE.L3) + 70} text="破位" color={C.down} at={cue("caseBroken") + 0.2} />
          <Label x={sc.x(CASE.END) - 60} y={lo(CASE.END) + 80} text="继续持有" color={C.down} at={cue("caseShortHold") + 0.2} />
        </Stage>
      </PushIn>
      <TitleBar zh={t < failOut ? "案例 · 动态跟踪" : "案例 · 做空视角"} en={t < failOut ? "CASE STUDY" : "SHORT SIDE"} at={cue("caseH1") - 0.6} />
    </>
  );
};
