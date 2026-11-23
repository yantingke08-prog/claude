// 你刚追进去 / 价格立马掉头 / 不是你运气差
// Layer 1: the real K-line chart. The bar you chased forms live, then turns.
import React from "react";
import { C, HLine, Stage, Tag, aim, camSteps, lerp, ramp, rampIO, shake, useShot } from "../kit";
import { CHASE, MAIN } from "../data";
import { Axis, Chart, FocusBox, bx, py } from "./chart";

/** the chase bar as it forms: up into your entry, then straight back down */
export const chaseLive = (t: number, chase: number, turn: number) => {
  const rise = rampIO(t, chase - 0.35, 0.6);
  const fall = rampIO(t, turn, 0.55);
  const b = MAIN[CHASE];
  const top = lerp(b.o, 11, rise) + (fall > 0 ? 3 * Math.min(1, fall * 3) : 0); // a last poke to 14 as it turns
  const c = fall > 0 ? lerp(top, b.c, fall) : lerp(b.o, 11, rise);
  return { o: b.o, h: Math.max(b.o, Math.min(b.h, top)), l: fall >= 1 ? b.l : Math.min(b.o, c), c, v: b.v };
};

export const CHASE_CAM = aim(bx(CHASE) - 60, py(8), 1.6, 6, -6);

export const Hook: React.FC = () => {
  const { t, at } = useShot();
  const chase = at("追进去");
  const turn = at("掉头");
  const luck = at("运气差");
  const live = chaseLive(t, chase, turn);
  const c = camSteps(t, [
    [0, aim(440, 820, 1.1, 6, -4)],
    [chase - 0.3, CHASE_CAM],
    [turn, aim(bx(CHASE) - 40, py(6), 1.45, 7, -3)],
    [luck, aim(bx(CHASE) - 90, py(6), 1.3, 6, -8)],
  ]);
  const x = bx(CHASE);
  const entry = py(11);
  return (
    <Stage cam={{ ...c, x: c.x + shake(t, turn + 0.1, 9) }} drift={Math.sin(t * 0.5) * 0.8}>
      <Chart upto={CHASE} live={live} glow={(i) => (i === CHASE ? 0.6 : 0)} o={(i) => (i >= CHASE - 5 ? 1 : 1 - 0.6 * ramp(t, luck, 0.3))} />
      <Axis ticks={[14, 7, 0, -7, -14, -21, -28]} />
      {/* your entry: a short red level where you chased in */}
      <HLine x={x - 70} y={entry} w={56} color={C.up} o={ramp(t, chase, 0.25)} />
      <Tag x={x - 82} y={entry} text="追进" color={C.up} align="right" o={ramp(t, chase, 0.25)} />
      <Tag x={x + 18} y={py(MAIN[CHASE].c) + 4} text="掉头" color={C.down} o={ramp(t, turn + 0.35, 0.25)} />
      <FocusBox x={bx(CHASE - 5) - 10} y={py(15)} w={bx(CHASE + 1) - bx(CHASE - 5) + 30} h={py(0) - py(15)} o={ramp(t, luck, 0.3) * 0.9} />
    </Stage>
  );
};
