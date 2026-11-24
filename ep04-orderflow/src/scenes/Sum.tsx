// 把这几股力量放一起看 / 追价的人决定谁着急 / 挂单的人决定谁有耐心 / 被迫成交的人决定行情会不会突然加速
// The whole chart again; the three places where each force decided the bar.
import React from "react";
import { C, Stage, Tag, aim, camSteps, ramp, useShot } from "../kit";
import { ABSORB, BREAK, CHASE, MAIN, PLUNGE } from "../data";
import { Axis, Chart, Ring, bx, py } from "./chart";

export const Sum: React.FC = () => {
  const { t, at } = useShot();
  const all = at("放一起看");
  const a1 = at("追价的人");
  const a2 = at("谁着急");
  const b1 = at("挂单的人");
  const b2 = at("谁有耐心");
  const c1 = at("被迫成交的人");
  const c2 = at("突然加速");
  const lit = (i: number) => (i === CHASE ? ramp(t, a1, 0.2) : i === ABSORB ? ramp(t, b1, 0.2) : i === BREAK || i === PLUNGE ? ramp(t, c1, 0.2) : 0);
  const c = camSteps(t, [
    [0, aim(bx(68), py(-12), 1.35, 7, -8)],
    [all, aim(540, 900, 1, 6, 0)],
  ]);
  return (
    <Stage cam={c}>
      <Chart upto={MAIN.length - 1} o={(i) => 0.4 + 0.6 * Math.max(1 - ramp(t, all, 0.4), lit(i))} glow={(i) => lit(i) * 0.6} />
      <Axis ticks={[14, 7, 0, -7, -14, -21, -28]} />
      <Ring i={CHASE} color={C.up} o={ramp(t, a1, 0.25)} />
      <Ring i={ABSORB} color={C.passive} o={ramp(t, b1, 0.25)} />
      <Ring i={PLUNGE} color={C.forced} o={ramp(t, c1, 0.25)} pad={16} />
      <Tag x={bx(CHASE)} y={py(MAIN[CHASE].h) - 44} text="着急" color={C.up} align="center" o={ramp(t, a2, 0.25)} />
      <Tag x={bx(ABSORB) + 22} y={py(MAIN[ABSORB].h) - 44} text="耐心" color={C.passive} align="center" o={ramp(t, b2, 0.25)} />
      <Tag x={bx(PLUNGE) - 30} y={py(MAIN[PLUNGE].l) + 10} text="加速" color={C.forced} align="right" o={ramp(t, c2, 0.25)} />
    </Stage>
  );
};
