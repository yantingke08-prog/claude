// 但还有最后一步［短暂停顿］新价格出来以后 / 市场得接受它 / 往上冲 / 成交能延续 / 回踩有人接 / 新价格才站得住 /
// 冲上去没人跟 / 马上收回来 / 就是市场不认可
// Two outcomes, stacked: the same history in both panels, different bars after the fork. Both drawn as K-lines.
import React from "react";
import { Box, C, HLine, Stage, Tag, Txt, aim, camSteps, ramp, rampIO, useShot } from "../kit";
import { FORK_ACCEPT, FORK_AT, FORK_REJECT, LEVEL, type Bar } from "../data";
import { Chart, py, type Geo } from "./chart";

const TOP: Geo = { x0: 130, dx: 44, w: 28, y0: 470 + 17 * 18, k: 18, volBase: 0, volH: 0, maxV: 1 };
const BOT: Geo = { ...TOP, y0: 940 + 12 * 18 };
const lastX = TOP.x0 + (FORK_ACCEPT.length - 1) * TOP.dx;

/** bar k of a fork appears (forming) from time a */
const grow = (bars: Bar[], k: number, t: number, a: number): Partial<Bar> => {
  const b = bars[k];
  const p = rampIO(t, a, 0.4);
  const c = b.o + (b.c - b.o) * p;
  return { o: b.o, c, h: Math.max(b.o, c, b.o + (b.h - b.o) * p), l: Math.min(b.o, c, b.o + (b.l - b.o) * p) };
};

export const Accept: React.FC = () => {
  const { t, at } = useShot();
  const last = at("最后一步");
  const out = at("新价格出来");
  const accept = at("接受它");
  const go = at("往上冲");
  const cont = at("能延续");
  const retest = at("回踩");
  const caught = at("有人接");
  const stand = at("站得住");
  const noFollow = at("没人跟");
  const back = at("收回来");
  const reject = at("不认可");

  // which bar of each fork is forming, and when (all keyed to words)
  const accT = [out, cont, retest, caught, stand, stand + 0.35];
  const rejT = [out, noFollow, back, back + 0.4, reject, reject + 0.3];
  const shown = (times: number[]) => FORK_AT - 1 + times.filter((x) => t >= x).length;
  const uptoA = shown(accT);
  const uptoR = shown(rejT);
  const liveA = uptoA >= FORK_AT ? grow(FORK_ACCEPT, uptoA, t, accT[uptoA - FORK_AT]) : undefined;
  const liveR = uptoR >= FORK_AT ? grow(FORK_REJECT, uptoR, t, rejT[uptoR - FORK_AT]) : undefined;

  const c = camSteps(t, [
    [0, aim(560, 850, 1, 6, 0)],
    [out, aim(600, 850, 1.06, 6, -3)],
    [go, aim(660, py(9, TOP), 1.45, 6, -6)],
    [retest, aim(720, py(9, TOP), 1.55, 6, -8)],
    [noFollow, aim(660, py(6, BOT), 1.45, 6, -6)],
    [back, aim(720, py(5, BOT), 1.55, 6, -8)],
    [reject + 0.5, aim(560, 850, 1, 6, 0)],
  ]);
  return (
    <Stage cam={c}>
      <Txt x={TOP.x0 - 40} y={py(16, TOP)} text="A" mono size={34} color={C.dim} />
      <Txt x={TOP.x0 - 40} y={py(11, BOT)} text="B" mono size={34} color={C.dim} />
      <Chart bars={FORK_ACCEPT} geo={TOP} upto={uptoA} live={liveA} vol={false} glow={(i) => (i === FORK_AT + 3 ? ramp(t, caught, 0.2) * 0.5 : 0)} />
      <Chart bars={FORK_REJECT} geo={BOT} upto={uptoR} live={liveR} vol={false} glow={(i) => (i === FORK_AT + 1 ? ramp(t, back, 0.2) * 0.6 : 0)} />
      {/* the new price, in both panels */}
      {[TOP, BOT].map((g, k) => (
        <HLine key={k} x={g.x0 - 20} y={py(LEVEL, g)} w={lastX - g.x0 + 60} color={C.text} dashed o={ramp(t, last, 0.3) * (0.55 + 0.45 * ramp(t, accept, 0.25))} />
      ))}
      <Tag x={lastX + 46} y={py(LEVEL, TOP)} text="新价格" color={C.text} o={ramp(t, last + 0.1, 0.25) * (1 - ramp(t, go, 0.3))} size={36} />
      {/* the bids that catch the retest */}
      <Box x={TOP.x0 + (FORK_AT + 3) * TOP.dx - 34} y={py(LEVEL, TOP) + 4} w={68} h={22} d={14} color={C.passive} dark={C.passiveD} glow={1} o={ramp(t, caught, 0.2)} />
      <Tag x={lastX + 30} y={py(FORK_ACCEPT[FORK_ACCEPT.length - 1].c, TOP)} text="站得住" color={C.up} o={ramp(t, stand + 0.4, 0.25)} size={36} />
      <Tag x={lastX + 30} y={py(FORK_REJECT[FORK_REJECT.length - 1].c, BOT)} text="不认可" color={C.down} o={ramp(t, reject + 0.3, 0.25)} size={36} />
    </Stage>
  );
};
