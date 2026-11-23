// 但还有最后一步［短暂停顿］新价格出来以后 / 市场得接受它 / 往上冲 / 成交能延续 / 回踩有人接 / 新价格才站得住 /
// 冲上去没人跟 / 马上收回来 / 就是市场不认可
// One chart. Outcome A (accepted) plays bar by bar; on 冲上去没人跟 it REWINDS to the fork and outcome B plays instead.
import React from "react";
import { Box, C, HLine, RewindFx, Stage, Tag, aim, camSteps, ramp, rampIO, useShot } from "../kit";
import { FORK_ACCEPT, FORK_AT, FORK_REJECT, LEVEL, type Bar } from "../data";
import { Chart, bx, py, type Geo } from "./chart";
import { REWIND } from "./Hook";

const G: Geo = { x0: 120, dx: 44, w: 30, y0: 480 + 17 * 26, k: 26, volBase: 0, volH: 0, maxV: 1 };
const X = (i: number) => bx(i, G);
const Y = (tick: number) => py(tick, G);
const LAST = FORK_ACCEPT.length - 1;

/** bar k partly formed (p 0..1): body grows from the open toward its close, wicks reveal as it goes */
const partial = (bars: Bar[], k: number, p: number): Partial<Bar> => {
  const b = bars[k];
  const c = b.o + (b.c - b.o) * p;
  return { o: b.o, c, h: Math.max(b.o, c, b.o + (b.h - b.o) * p), l: Math.min(b.o, c, b.o + (b.l - b.o) * p) };
};

/** how many fork bars are formed at time t, given each bar's start time (a float: 2.4 = two done, third 40 % formed) */
const formed = (t: number, starts: number[]) => starts.reduce((s, a) => s + rampIO(t, a, 0.45), 0);

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

  // A: the shared push bar on 新价格出来, then one bar per word
  const aBars = formed(t, [out, go + 0.1, cont, retest, caught, stand]);
  const rw = rampIO(t, noFollow, REWIND); // A runs back to just after the push bar
  const aShown = t < noFollow ? aBars : 1 + (aBars - 1) * (1 - rw);
  // B: after the rewind, the same push, then nobody follows
  const bStart = noFollow + REWIND;
  const bBars = 1 + formed(t, [bStart, back, back + 0.45, reject, reject + 0.35]);
  const onB = t >= bStart;
  const bars = onB ? FORK_REJECT : FORK_ACCEPT;
  const n = onB ? bBars : aShown;
  const whole = Math.floor(n);
  const upto = FORK_AT - 1 + Math.max(0, Math.ceil(n - 1e-6));
  const live = n > whole + 1e-6 ? partial(bars, FORK_AT + whole, n - whole) : undefined;

  const c = camSteps(t, [
    [0, aim(560, 760, 1, 6, 0)],
    [out, aim(600, 740, 1.08, 6, -3)],
    [go, aim(660, Y(10), 1.32, 6, -6)],
    [retest, aim(700, Y(9), 1.4, 6, -8)],
    [noFollow, aim(600, 760, 1.08, 6, 0)],
    [back, aim(680, Y(6), 1.35, 6, 6)],
    [reject + 0.4, aim(580, 760, 1.04, 6, 0)],
  ]);
  const rewinding = t > noFollow && t < noFollow + REWIND;
  const lastX = X(LAST);
  return (
    <>
      <Stage cam={c}>
        <Chart bars={bars} geo={G} upto={upto} live={live} vol={false} glow={(i) => (!onB && i === FORK_AT + 3 ? ramp(t, caught, 0.2) * 0.5 : onB && i === FORK_AT + 1 ? ramp(t, back, 0.2) * 0.6 : 0)} />
        {/* the new price */}
        <HLine x={G.x0 - 24} y={Y(LEVEL)} w={lastX - G.x0 + 60} color={C.text} dashed o={ramp(t, last, 0.3) * (0.55 + 0.45 * ramp(t, accept, 0.25))} />
        <Tag x={lastX + 40} y={Y(LEVEL)} text="新价格" color={C.text} size={36} o={ramp(t, last + 0.1, 0.25) * (1 - ramp(t, go, 0.3))} />
        {/* A: the bids that catch the retest, right under that bar's low */}
        <Box x={X(FORK_AT + 3) - 30} y={Y(FORK_ACCEPT[FORK_AT + 3].l) + 6} w={60} h={18} d={12} color={C.passive} dark={C.passiveD} glow={1} o={ramp(t, caught, 0.2) * (1 - ramp(t, noFollow, 0.2))} />
        <Tag x={X(FORK_AT + 3) + 40} y={Y(FORK_ACCEPT[FORK_AT + 3].l) + 15} text="有人接" color={C.passive} size={32} o={ramp(t, caught + 0.1, 0.2) * (1 - ramp(t, stand, 0.2))} />
        <Tag x={lastX + 26} y={Y(FORK_ACCEPT[LAST].c)} text="站得住" color={C.up} size={36} o={ramp(t, stand + 0.4, 0.25) * (1 - ramp(t, noFollow, 0.15))} />
        {/* B */}
        <Tag x={lastX + 26} y={Y(FORK_REJECT[LAST].c)} text="不认可" color={C.down} size={36} o={ramp(t, reject + 0.5, 0.25)} />
      </Stage>
      <RewindFx o={rewinding ? Math.min(1, (t - noFollow) / 0.12, (noFollow + REWIND - t) / 0.12) : 0} t={t} />
    </>
  );
};

