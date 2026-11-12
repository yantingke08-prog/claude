// 04 吸收之后 — clue vs trigger. Success path, then failure path, on one chart; evidence rail reacts.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { keys, lin, prog } from "../anim";
import { Candles, DeltaBars, HLine, makeScale, Marker, PriceAxis, Zone } from "../components/Chart";
import { Cam, LVPBrandMark, Panel, Tag } from "../components/Frame";
import { EvidenceRail, type StepState } from "../components/OrderFlow";
import { ReplaySlot } from "../components/Replay";
import { ABSORB, FAILURE, KEY_LEVEL, PRE, SUCCESS, ZONE } from "../market";
import { at, chapter } from "../script";
import { C, FONT, H, T, W } from "../theme";

const PRE_TAIL = PRE.slice(-10);
const A0 = PRE_TAIL.length; // first absorption slot
const F0 = A0 + ABSORB.length; // first "after" slot
const SLOTS = F0 + SUCCESS.length;

export const After: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("after");
  const s = makeScale(96, 380, 720, 600, SLOTS, 95.75, 103.0);
  const y0 = 1170;
  const seal = prog(f, at(ch, 0, 0), 16) * (1 - prog(f, at(ch, 1, 0) - 10, 12));
  const succ = lin(f, at(ch, 1, 0.05), ch.lineStart[3] - ch.lineStart[1]) * SUCCESS.length;
  const reclaimTag = prog(f, at(ch, 1, 0.55), 12);
  const holdTag = prog(f, at(ch, 2, 0.15), 12);
  const confirmed = prog(f, at(ch, 3, 0.2), 14);
  const toFail = prog(f, at(ch, 4, 0), 18);
  const fail = lin(f, at(ch, 4, 0.05), ch.lineStart[6] - ch.lineStart[4] - 10) * FAILURE.length;
  const breakTag = prog(f, at(ch, 4, 0.5), 12);
  const voidTag = prog(f, at(ch, 5, 0.3), 12);
  const verdict = prog(f, at(ch, 6, 0.4), 18);
  const steps: StepState[] = [
    f >= at(ch, 1, 0) ? "on" : "off",
    f >= at(ch, 1, 0.3) ? "on" : "off",
    f >= at(ch, 5, 0.3) ? "fail" : f >= at(ch, 2, 0.6) && toFail < 0.5 ? "on" : "off",
  ];
  const push = keys(f, [[0, 1], [at(ch, 4, 0), 1.02], [ch.dur, 1.0]]);
  const reclaimC = SUCCESS[2];
  const pullC = SUCCESS[7];
  const breakC = FAILURE[2];
  const chart = (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      <PriceAxis s={s} step={1} o={0.7} />
      <HLine s={s} p={KEY_LEVEL} draw={1} color={C.cyan} dash="6 6" width={1.5} />
      <Zone s={s} lo={ZONE.lo} hi={ZONE.hi} from={A0} to={SLOTS - 1} grow={1} />
      <Candles s={s} data={PRE_TAIL} from={0} reveal={PRE_TAIL.length} />
      <Candles s={s} data={ABSORB} from={A0} reveal={ABSORB.length} />
      {/* time axis extends to the right of the zone: "after" */}
      <HLine s={s} p={95.9} draw={prog(f, at(ch, 0, 0.3), 30)} from={F0} to={SLOTS - 1} color={C.sub} dash="2 6" />
      <Candles s={s} data={SUCCESS} from={F0} reveal={succ} opacity={1 - 0.7 * toFail} ghost={toFail > 0.5} />
      <Candles s={s} data={FAILURE} from={F0} reveal={fail} />
      <Marker s={s} slot={F0 + 2} p={reclaimC.l} dir="up" color={C.green} o={reclaimTag * (1 - toFail)} />
      <Marker s={s} slot={F0 + 7} p={pullC.l} dir="up" color={C.green} o={holdTag * (1 - toFail)} />
      <Marker s={s} slot={F0 + 2} p={breakC.h} dir="down" color={C.red} o={breakTag} />
      <DeltaBars s={s} data={ABSORB} from={A0} reveal={ABSORB.length} y0={y0} h={120} opacity={0.55} />
      <DeltaBars s={s} data={SUCCESS} from={F0} reveal={succ} y0={y0} h={120} opacity={1 - 0.85 * toFail} />
      <DeltaBars s={s} data={FAILURE} from={F0} reveal={fail} y0={y0} h={120} />
      <text x={s.x} y={y0 - 140} fill={C.sub} fontFamily={FONT} fontSize={T.xs}>
        Delta
      </text>
    </svg>
  );
  return (
    <AbsoluteFill>
      <Cam s={push} oy={760}>
        <Panel x={64} y={296} w={812} h={1050} title="吸收之后" en="WHAT HAPPENS NEXT" />
        <ReplaySlot name={toFail > 0.5 ? "absorption-failure" : "absorption-success"} x={64} y={296} w={812} h={1050} synthetic={chart} tagCorner="right" />
        <Tag x={110} y={420} ax={s.X(F0 + 2)} ay={s.Y(reclaimC.h)} text="站回上沿" en="RECLAIM" color={C.greenText} o={reclaimTag * (1 - toFail)} size={T.xs} />
        <Tag x={110} y={482} ax={s.X(F0 + 7)} ay={s.Y(pullC.l) + 30} text="回踩不破 · Delta 转正" color={C.greenText} o={holdTag * (1 - toFail)} size={T.xs} />
        <Tag x={110} y={420} ax={s.X(F0 + 2)} ay={s.Y(breakC.l)} text="跌破下沿" en="BREAK" color={C.redText} o={breakTag * (1 - voidTag)} size={T.xs} />
        <Tag x={110} y={482} ax={s.X(F0 + 9)} ay={s.Y(FAILURE[9].l)} text="承接被吃穿 · 吸收逻辑作废" color={C.redText} o={voidTag * (1 - verdict)} size={T.xs} />
        <svg width={W} height={H} style={{ position: "absolute" }}>
          <EvidenceRail
            x={1000}
            y={440}
            h={480}
            steps={steps}
            labelSide="left"
            o={prog(f, at(ch, 1, 0), 16)}
            verdict={{
              text: steps[2] === "fail" ? "失效" : steps.every((x) => x === "on") ? "确认" : "",
              color: steps[2] === "fail" ? C.redText : C.greenText,
              o: Math.max(confirmed * (1 - toFail), voidTag),
            }}
          />
        </svg>
      </Cam>
      {seal > 0 ? (
        <AbsoluteFill style={{ background: `rgba(7,9,13,${0.7 * seal})` }}>
          <LVPBrandMark f={f - at(ch, 0, 0)} x={540} y={720} size={230} text="吸收是线索，不是扳机" sub="CLUE ≠ TRIGGER" />
        </AbsoluteFill>
      ) : null}
      {verdict > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 120,
            right: 120,
            top: 600,
            padding: "34px 0",
            textAlign: "center",
            fontFamily: FONT,
            background: "rgba(7,9,13,0.9)",
            border: `1px solid ${C.amber}66`,
            borderRadius: 18,
            opacity: verdict,
            transform: `translateY(${(1 - verdict) * 10}px)`,
          }}
        >
          <div style={{ fontSize: T.l, fontWeight: 700, color: C.amber }}>没有确认，就不交易</div>
          <div style={{ fontSize: T.s, color: C.sub, marginTop: 10, letterSpacing: 2 }}>NO CONFIRMATION · NO TRADE</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
