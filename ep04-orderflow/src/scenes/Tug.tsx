// 价格下一跳 / 就是这几股力量较劲的结果
// Layer 3 close-up: the last-price cell, and the three kinds of fills pushing on it.
import React from "react";
import { C, MONO, Pellet, Stage, Tag, cam, camSteps, lerp, ramp, rnd, shake, useShot } from "../kit";
import { CHASE } from "../data";
import { Minimap } from "./chart";
import { BOOK, Book, baseSize, yOf } from "./parts";

export const Tug: React.FC = () => {
  const { t, at } = useShot();
  const next = at("下一跳");
  const forces = at("几股力量");
  const fight = at("较劲");
  const result = at("结果");
  const settled = ramp(t, result, 0.2);
  const wob = t > fight && t < result ? Math.sin((t - fight) * 14) : 0;
  const lvl = settled > 0.5 ? 1 : wob > 0.4 ? 1 : wob < -0.4 ? -1 : 0;
  const c = camSteps(t, [
    [0, cam(0, 0, 80, 8, 0)],
    [next, cam(0, yOf(0) - 800, 620, 6, -4)],
    [forces, cam(0, yOf(0) - 800, 360, 8, 6)],
    [result, cam(0, yOf(0) - 820, 520, 6, -2)],
  ]);
  const cols = [C.up, C.passive, C.forced];
  const streams = cols.map((col, k) =>
    [0, 1, 2].map((j) => {
      const t0 = forces + k * 0.25 + j * 0.3;
      const p = ((t - t0) % 0.9) / 0.9;
      if (t < t0 || t > result + 0.3) return null;
      const fromX = k === 0 ? 40 : k === 1 ? 1040 : 200;
      const fromY = k === 2 ? yOf(-5) : yOf(0) + (rnd(k * 7 + j) - 0.5) * 300;
      return <Pellet key={`${k}${j}`} x={lerp(fromX, BOOK.cx + (k - 1) * 40, p)} y={lerp(fromY, yOf(0), p)} color={col} o={1 - p * 0.5} />;
    }),
  );
  return (
    <>
      <Stage cam={{ ...c, x: c.x + shake(t, result, 7) }}>
        <Book mid={lvl} ask={(l) => (l >= 1 ? baseSize(l) * (l === 1 ? 1 - settled : 1) : 0)} bid={(l) => (l <= 0 ? baseSize(l) : 0)} glowAsk={(l) => (l === 1 ? Math.max(0, wob) : 0)} glowBid={(l) => (l === 0 ? Math.max(0, -wob) : 0)} dimRows={ramp(t, next, 0.3) * 0.6} />
        {streams}
        <div style={{ position: "absolute", left: BOOK.cx + 200, top: yOf(lvl), transform: "translateY(-50%) translateZ(20px)", fontFamily: MONO, fontWeight: 800, fontSize: 64, color: "#fff", opacity: ramp(t, next, 0.2), textShadow: "0 0 24px rgba(255,255,255,0.5)" }}>
          {(10 + lvl * 0.01).toFixed(2)}
        </div>
        <Tag x={BOOK.cx + 200} y={yOf(lvl) + 58} text="下一跳" color={C.text} o={ramp(t, next, 0.25)} size={36} />
      </Stage>
      <Minimap upto={CHASE} mark={CHASE} />
    </>
  );
};
