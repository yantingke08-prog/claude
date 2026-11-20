// 有人嫌挂单慢，直接追着价格打；有人不着急，挂在原地等别人来；还有一种，本来没打算动，止损一破，被硬逼着成交。
import React from "react";
import { C, HLine, Pellet, Stage, cam, camPath, lerp, ramp, rampIO, useShot, win } from "../kit";
import { PILLAR_X, Pillars, pillarTop } from "./parts";

export const Three: React.FC = () => {
  const { t, at, dur } = useShot();
  const a0 = at("有人嫌");
  const a1 = at("追着价格打");
  const b0 = at("有人不着急");
  const b1 = at("挂在原地");
  const c0 = at("还有一种");
  const c1 = at("止损一破");
  const c2 = at("被硬逼着");
  const p = [rampIO(t, a1 - 0.2, 0.9), rampIO(t, b1 - 0.1, 1.4), 0.5 * rampIO(t, c0, 0.8) + 0.5 * rampIO(t, c2, 0.6)];
  const focus = (k: number) => cam((PILLAR_X[k] - 540) * 0.75, -40, 260, 8, (540 - PILLAR_X[k]) * 0.02);
  const c = camPath(t, [
    [0, focus(0)],
    [b0, focus(0)],
    [b0 + 0.9, focus(1)],
    [c0, focus(1)],
    [c0 + 0.9, focus(2)],
    [Math.max(c2 + 1.2, dur - 1.4), focus(2)],
    [dur, cam(0, -20, 40, 8, 0)],
  ]);
  const stopY = pillarTop(2) - 10;
  const broken = ramp(t, c1, 0.25);
  return (
    <Stage cam={c}>
      {/* 主动: a stream of red orders racing in */}
      {[0, 1, 2].map((k) => (
        <Pellet key={k} x={lerp(-60, PILLAR_X[0] - 90, ((t - a0 - k * 0.3) % 1.2) / 1.2)} y={pillarTop(3) + 40 + k * 40} color={C.up} o={win(t, a0, b0) * 0.9} />
      ))}
      {/* 被迫: the stop line that snaps */}
      <HLine x={PILLAR_X[2] - 130} y={stopY} w={lerp(260, 120, broken)} color={C.forced} dashed o={win(t, c0, dur + 1) * (1 - broken * 0.5)} />
      <HLine x={PILLAR_X[2] + 10 + 40 * broken} y={stopY + 30 * broken} w={broken ? 120 : 0} color={C.forced} dashed o={win(t, c1, dur + 1) * 0.5} />
      <Pillars
        p={p}
        glow={[win(t, a1, b0), win(t, b1, c0), win(t, c2, dur + 1)]}
        tags={[
          { text: "主动成交", o: ramp(t, a1, 0.3) },
          { text: "被动成交", o: ramp(t, b1, 0.3) },
          { text: "被迫成交", o: ramp(t, c2, 0.3) },
        ]}
      />
    </Stage>
  );
};
