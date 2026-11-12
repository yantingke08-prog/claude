// 01 反差 — same sell pressure, two outcomes. Two panels share price scale and time window.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { keys, lin, prog } from "../anim";
import { Candles, DeltaBars, HLine, makeScale, PriceAxis, Zone } from "../components/Chart";
import { Cam, Panel, Tag } from "../components/Frame";
import { ReplaySlot } from "../components/Replay";
import { ABSORB, BREAKDOWN, KEY_LEVEL, PRE, ZONE } from "../market";
import { at, chapter } from "../script";
import { C, FONT, H, T, W } from "../theme";

const PANEL = { y: 296, h: 900, w: 466 };
const LEFT_X = 64;
const RIGHT_X = 550;
const SLOTS = PRE.length + BREAKDOWN.length; // identical time window both sides

const Side: React.FC<{ x: number; f: number; kind: "down" | "hold" }> = ({ x, f, kind }) => {
  const ch = chapter("hook");
  const s = makeScale(x + 20, PANEL.y + 80, PANEL.w - 96, 560, SLOTS, 95, 103.5);
  const preReveal = keys(f, [[0, 6], [at(ch, 0, 0.7), PRE.length]]);
  // both branches print on the same clock
  const branchReveal = lin(f, at(ch, 0, 0.75), at(ch, 2, 0.9) - at(ch, 0, 0.75)) * BREAKDOWN.length;
  const data = kind === "down" ? BREAKDOWN : ABSORB;
  const y0 = PANEL.y + 700;
  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      <PriceAxis s={s} step={2} o={0.8} />
      <HLine s={s} p={KEY_LEVEL} draw={prog(f, 4, 26)} color={C.cyan} dash="6 6" width={1.5} />
      {kind === "hold" ? <Zone s={s} lo={ZONE.lo} hi={ZONE.hi} from={PRE.length} to={SLOTS - 1} grow={prog(f, at(ch, 2, 0.15), 22)} /> : null}
      <Candles s={s} data={PRE} from={0} reveal={preReveal} />
      <Candles s={s} data={data} from={PRE.length} reveal={branchReveal} />
      <text x={s.x} y={y0 - 26} fill={C.sub} fontFamily={FONT} fontSize={T.xs}>
        Delta 主动成交差
      </text>
      <DeltaBars s={s} data={PRE} from={0} reveal={preReveal} y0={y0} h={150} />
      <DeltaBars s={s} data={data} from={PRE.length} reveal={branchReveal} y0={y0} h={150} />
    </svg>
  );
};

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const ch = chapter("hook");
  const push = keys(f, [[0, 1], [ch.dur, 1.03]]);
  const sL = makeScale(LEFT_X + 20, PANEL.y + 80, PANEL.w - 96, 560, SLOTS, 95, 103.5);
  const sR = makeScale(RIGHT_X + 20, PANEL.y + 80, PANEL.w - 96, 560, SLOTS, 95, 103.5);
  const leftTag = prog(f, at(ch, 1, 0.2), 14);
  const rightTag = prog(f, at(ch, 2, 0.35), 14);
  const same = prog(f, at(ch, 3, 0.05), 16);
  const verdict = prog(f, at(ch, 3, 0.55), 18);
  const lastDown = BREAKDOWN[BREAKDOWN.length - 1];
  return (
    <AbsoluteFill>
      <Cam s={push} oy={760}>
        <Panel x={LEFT_X} y={PANEL.y} w={PANEL.w} h={PANEL.h} title="回放 A" en="REPLAY A" accent={leftTag > 0 ? `${C.red}88` : C.border} />
        <Panel x={RIGHT_X} y={PANEL.y} w={PANEL.w} h={PANEL.h} title="回放 B" en="REPLAY B" accent={rightTag > 0 ? `${C.amber}88` : C.border} />
        <ReplaySlot name="breakdown" x={LEFT_X} y={PANEL.y} w={PANEL.w} h={PANEL.h} synthetic={<Side x={LEFT_X} f={f} kind="down" />} />
        <ReplaySlot name="absorption-success" x={RIGHT_X} y={PANEL.y} w={PANEL.w} h={PANEL.h} synthetic={<Side x={RIGHT_X} f={f} kind="hold" />} />
        <Tag x={LEFT_X + 30} y={PANEL.y + 560} ax={sL.X(SLOTS - 1)} ay={sL.Y(lastDown.l)} text="卖方控制" en="SELLERS WIN" color={C.redText} o={leftTag} size={T.s} />
        <Tag x={RIGHT_X + 30} y={PANEL.y + 560} ax={sR.X(SLOTS - 3)} ay={sR.Y(ZONE.lo)} text="卖盘被吸收" en="ABSORBED" color={C.amber} o={rightTag} size={T.s} />
        {/* one bracket under both Delta panes: the pressure is the same */}
        <svg width={W} height={H} style={{ position: "absolute", opacity: same }}>
          <path d={`M${LEFT_X + 24} 1150 v18 H${RIGHT_X + PANEL.w - 24} v-18`} fill="none" stroke={C.sub} strokeWidth={2} />
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1212, textAlign: "center", fontFamily: FONT, fontSize: T.s, color: C.text, opacity: same }}>
          同样的卖压 <span style={{ color: C.sub, fontSize: T.xs }}>SAME SELL PRESSURE</span>
        </div>
      </Cam>
      {verdict > 0 ? (
        <AbsoluteFill style={{ background: `rgba(7,9,13,${0.55 * verdict})` }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 660,
              textAlign: "center",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: T.xxl,
              color: C.text,
              opacity: verdict,
              transform: `translateY(${(1 - verdict) * 12}px)`,
            }}
          >
            两种<span style={{ color: C.amber }}>结局</span>
            <div style={{ fontSize: T.m, fontWeight: 400, color: C.sub, marginTop: 14 }}>差别不在卖单，而在卖单之后</div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
