// 先别盯 K 线 / 你想啊 / 这一下到底是谁在成交？
// Layer 1 → layer 3: the chart sinks back, the order book behind that one bar comes forward.
import React from "react";
import { At, C, Pellet, Stage, Tag, cam, camSteps, lerp, ramp, rampIO, rnd, useShot } from "../kit";
import { CHASE } from "../data";
import { Chart, Minimap } from "./chart";
import { BOOK, Book, baseSize, yOf } from "./parts";
import { CHASE_CAM } from "./Hook";

export const Who: React.FC = () => {
  const { t, at } = useShot();
  const away = rampIO(t, at("先别盯"), 0.6);
  const think = at("你想啊");
  const who = at("谁在成交");
  const book = rampIO(t, think, 0.6);
  const c = camSteps(t, [
    [0, CHASE_CAM],
    [at("先别盯"), cam(0, -40, 0, 8, 6)],
    [think, cam(0, 0, 40, 8, -6)],
    [who, cam(0, -10, 200, 7, 6)],
  ]);
  const pellets = Array.from({ length: 9 }, (_, k) => {
    const t0 = who + k * 0.16;
    const p = (t - t0) / 0.42;
    if (p < 0 || p > 1) return null;
    const col = [C.up, C.down, C.forced][k % 3];
    const fromLeft = rnd(k) > 0.5;
    return <Pellet key={k} x={fromLeft ? lerp(60, BOOK.cx - 90, p) : lerp(1020, BOOK.cx + 90, p)} y={yOf(0) + (rnd(k + 9) - 0.5) * 20} color={col} o={1 - p * 0.6} />;
  });
  return (
    <>
      <Stage cam={c}>
        {/* the K-line chart slides back and greys out */}
        <At x={0} y={0} z={lerp(0, -900, away)} o={lerp(1, 0.12, away)}>
          <Chart upto={CHASE} vol={1 - away} />
        </At>
        <At x={0} y={0} z={lerp(-600, 0, book)} o={book}>
          <Book mid={0} ask={(l) => (l >= 1 ? baseSize(l) : 0)} bid={(l) => (l <= 0 ? baseSize(l) : 0)} glowAsk={(l) => (l === 1 ? ramp(t, who, 0.2) * 0.6 : 0)} glowBid={(l) => (l === 0 ? ramp(t, who, 0.2) * 0.6 : 0)} />
          {pellets}
          <Tag x={BOOK.cx + 100} y={yOf(0)} text="谁在成交" color={C.text} o={ramp(t, who, 0.25)} />
        </At>
      </Stage>
      <Minimap upto={CHASE} mark={CHASE} o={book} />
    </>
  );
};
