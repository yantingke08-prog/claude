// 最直接的 / 是追着价格打的人 / 主动买连续吃卖单 / 价格往上跳
// Order book: hurried buyers eat 10.01→10.03 level by level; the price jumps on 往上跳.
import React from "react";
import { C, Pellet, Stage, Tag, cam, camSteps, clamp01, lerp, shake, useShot, win } from "../kit";
import { CHASE } from "../data";
import { Minimap } from "./chart";
import { BOOK, Book, askEdge, baseSize, yOf } from "./parts";

export const Aggr: React.FC = () => {
  const { t, at, end } = useShot();
  const first = at("最直接的");
  const who = at("追着价格打的人");
  const buy0 = at("吃卖单");
  const up = at("往上跳");
  const buyP = clamp01((t - buy0) / Math.max(0.6, end("往上跳") - buy0)) * 3;
  const ask = (l: number) => (l < 1 ? 0 : l <= 3 ? baseSize(l) * clamp01(1 - (buyP - (l - 1))) : baseSize(l));
  const bid = (l: number) => (l <= 0 ? baseSize(l) : 0);
  const buying = buyP > 0 && buyP < 3;
  const tgt = Math.min(3, Math.floor(buyP) + 1);
  const c = camSteps(t, [
    [0, cam(0, 40, 0, 10, -10)],
    [first, cam(120, -60, 200, 9, -12)],
    [who, cam(-100, -20, 220, 9, 8)],
    [buy0, cam(40, -100, 260, 8, -10)],
    [up, cam(40, -160, 320, 7, -8)],
  ]);
  return (
    <>
      <Stage cam={{ ...c, y: c.y + shake(t, up, 7) }}>
        <Book mid={buyP} ask={ask} bid={bid} glowAsk={(l) => (buying && l === tgt ? 0.8 : 0)} />
        {buying &&
          [0, 1, 2].map((k) => {
            const p = (((t * 3.4 + k / 3) % 1) + 1) % 1;
            return <Pellet key={k} x={lerp(80, askEdge + 6, p)} y={yOf(tgt) + (k - 1) * 10} color={C.up} o={1 - p * 0.3} />;
          })}
        {/* the hurried buyers, queued at the left until they fire */}
        {[0, 1, 2].map((k) => (
          <Pellet key={`q${k}`} x={100 + k * 60} y={yOf(1)} color={C.up} r={12} o={win(t, who + k * 0.12, buy0 + k * 0.3, 0.15)} />
        ))}
        <Tag x={BOOK.cx - 140} y={yOf(tgt)} text="主动买" color={C.up} align="right" o={win(t, buy0, Infinity)} />
      </Stage>
      <Minimap upto={CHASE} mark={CHASE} />
    </>
  );
};
