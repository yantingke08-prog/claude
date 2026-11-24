// 你刚追进去 / 价格立马掉头 / 不是你运气差
// Layer 1. 你刚追: the rise prints bar by bar, fast. 进去: the red bar you chase into.
// 掉头: green bars print one by one after your bar. 运气差: pull back, focus on your bar + the fall.
import React from "react";
import { C, HLine, Stage, Tag, aim, camSteps, clamp01, lerp, ramp, rampIO, shake, useShot } from "../kit";
import { CHASE, FALL_END, MAIN } from "../data";
import { Axis, Chart, FocusBox, bx, py } from "./chart";

export const ENTRY = MAIN[CHASE].c; // you bought at the red bar's close (10.11)
export const CHASE_CAM = aim(bx(CHASE) - 40, py(6), 1.6, 6, -6);

/** a bar that prints over [a, a+d]: body grows from its open toward the close, wicks reveal as it goes */
export const printing = (i: number, t: number, a: number, d: number) => {
  const b = MAIN[i];
  const p = rampIO(t, a, d);
  const c = lerp(b.o, b.c, p);
  return { o: b.o, c, h: Math.max(b.o, c, lerp(b.o, b.h, p)), l: Math.min(b.o, c, lerp(b.o, b.l, p)), v: b.v };
};

export const Hook: React.FC = () => {
  const { t, at, end } = useShot();
  const chaseWord = at("进去");
  const turn = at("掉头");
  const luck = at("不是你");
  // 你刚追: bars 0..43 print one after another from 0 to 进去 (accelerating)
  const runIn = Math.max(0.3, chaseWord);
  const printed = Math.floor(CHASE * Math.pow(clamp01(t / runIn), 0.8));
  // 进去: the red bar grows over 0.35 s
  const red = printing(CHASE, t, chaseWord, 0.35);
  // 掉头: bars 45..49 print one by one, finishing by 不是你
  const fallWin = Math.max(0.8, Math.max(luck, end("掉头") + 0.4) - turn);
  const fallStart = (k: number) => turn + (fallWin * k) / (FALL_END - CHASE);
  const greens = Array.from({ length: FALL_END - CHASE }, (_, k) => CHASE + 1 + k).filter((i) => t >= fallStart(i - CHASE - 1));
  const lastI = greens.length ? greens[greens.length - 1] : t >= chaseWord ? CHASE : Math.max(0, printed);
  const live = lastI > CHASE ? printing(lastI, t, fallStart(lastI - CHASE - 1), Math.min(0.3, fallWin / 5)) : lastI === CHASE ? red : undefined;
  const c = camSteps(t, [
    [0, aim(bx(CHASE) - 240, py(-2), 1.15, 6, -4)],
    [chaseWord - 0.15, CHASE_CAM],
    [turn, aim(bx(CHASE + 2), py(4), 1.5, 7, -4)],
  ]);
  const x = bx(CHASE);
  return (
    <Stage cam={{ ...c, x: c.x + shake(t, turn + 0.1, 7) }}>
      <Chart
        upto={lastI}
        live={live}
        glow={(i) => (i === CHASE ? 0.6 : 0)}
        o={(i) => (i >= CHASE ? 1 : 1 - 0.45 * ramp(t, luck, 0.3))}
        volBoost={(i) => (i === lastI ? 0.6 : 1)}
      />
      <Axis ticks={[14, 7, 0, -7, -14, -21, -28]} o={ramp(t, 0, 0.3)} />
      {/* your entry: a short red level at the red bar's close */}
      <HLine x={x - 50} y={py(ENTRY)} w={40} color={C.up} o={ramp(t, chaseWord + 0.25, 0.2)} />
      <Tag x={x - 62} y={py(ENTRY)} text="你追进" color={C.up} align="right" o={ramp(t, chaseWord + 0.25, 0.2)} />
      <Tag x={bx(CHASE + 2) + 16} y={py(MAIN[CHASE + 1].c)} text="掉头" color={C.down} o={ramp(t, turn + 0.3, 0.2)} />
      <FocusBox x={x - 16} y={py(13) - 6} w={bx(FALL_END) - x + 32} h={py(-3) - py(13) + 12} o={ramp(t, luck, 0.3) * 0.9} />
    </Stage>
  );
};
