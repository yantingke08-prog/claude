// 最直接的 / 是追着价格打的人 / 主动买连续吃卖单 / 价格往上跳 / 主动卖连续砸买单 / 价格往下走 / 它告诉你 / 着急的人愿意为成交付多少钱
import React from "react";
import { Box, C, Pellet, Stage, Tag, cam, camSteps, clamp01, lerp, ramp, shake, useShot, win } from "../kit";
import { CHASE } from "../data";
import { Minimap } from "./chart";
import { BOOK, Book, askEdge, baseSize, bidEdge, yOf } from "./parts";

export const Aggr: React.FC = () => {
  const { t, at, end } = useShot();
  const first = at("最直接的");
  const who = at("追着价格打的人");
  const buy0 = at("吃卖单");
  const up = at("往上跳");
  const sell0 = at("砸买单");
  const down = at("往下走");
  const tells = at("它告诉你");
  const pay = at("付多少钱");
  // levels are eaten one per ~0.45 s from the word on; the price jump lands on 往上跳 / 往下走
  const buyP = clamp01((t - buy0) / Math.max(0.6, end("往上跳") - buy0)) * 3;
  const sellP = clamp01((t - sell0) / Math.max(0.6, end("往下走") - sell0)) * 4;
  const refill = ramp(t, end("往上跳"), 0.4);
  const mid = sellP > 0 ? 3 - sellP : buyP;
  const ask = (l: number) => (l < 1 ? 0 : l <= 3 ? baseSize(l) * clamp01(1 - (buyP - (l - 1))) : baseSize(l));
  const bid = (l: number) => {
    const base = l <= 0 ? baseSize(l) : l <= 2 ? baseSize(l) * refill : 0;
    const k = 2 - l;
    return k >= 0 && k < 4 ? base * clamp01(1 - (sellP - k)) : base;
  };
  const buying = buyP > 0 && buyP < 3;
  const selling = sellP > 0 && sellP < 4;
  const tgt = buying ? Math.floor(buyP) + 1 : 2 - Math.floor(sellP);
  const pellets = [0, 1, 2].map((k) => {
    if (!buying && !selling) return null;
    const p = (((t * 3.4 + k / 3) % 1) + 1) % 1;
    return buying ? (
      <Pellet key={k} x={lerp(80, askEdge + 6, p)} y={yOf(tgt) + (k - 1) * 10} color={C.up} o={1 - p * 0.3} />
    ) : (
      <Pellet key={k} x={lerp(1000, bidEdge - 6, p)} y={yOf(tgt) + (k - 1) * 10} color={C.down} o={1 - p * 0.3} />
    );
  });
  // a queue of hurried buyers waiting at the left
  const queue = [0, 1, 2].map((k) => (
    <Box key={k} x={70 + k * 70 - (buyP > k ? 400 : 0)} y={yOf(0) + 60} w={56} h={32} d={18} color={C.up} dark={C.upD} glow={0.5} o={ramp(t, who + k * 0.12, 0.2) * (buyP > k ? 0 : 1)} />
  ));
  const c = camSteps(t, [
    [0, cam(0, 40, 0, 10, -10)],
    [first, cam(120, -100, 200, 9, -12)],
    [who, cam(-120, 0, 220, 9, 8)],
    [buy0, cam(60, -120, 260, 8, -10)],
    [up, cam(60, -200, 300, 7, -8)],
    [sell0, cam(-60, 60, 240, 9, 10)],
    [down, cam(-60, 120, 280, 9, 8)],
    [tells, cam(0, 0, 40, 8, 0)],
    [pay, cam(-120, -60, 200, 8, -4)],
  ]);
  return (
    <>
      <Stage cam={{ ...c, y: c.y + shake(t, up, 6) + shake(t, down, 6) }}>
        <Book mid={mid} ask={ask} bid={bid} glowAsk={(l) => (buying && l === tgt ? 0.8 : 0)} glowBid={(l) => (selling && l === tgt ? 0.8 : 0)} />
        {queue}
        {pellets}
        <Tag x={BOOK.cx - 110} y={yOf(Math.min(3, Math.floor(buyP) + 1)) - 44} text="主动买" color={C.up} align="right" o={win(t, buy0, sell0)} />
        <Tag x={BOOK.cx + 110} y={yOf(Math.max(-1, 2 - Math.floor(sellP))) + 44} text="主动卖" color={C.down} o={win(t, sell0, pay)} />
        {/* how far the hurried buyer paid up: 10.00 → 10.03 */}
        <div style={{ position: "absolute", left: 96, top: yOf(3), width: 0, height: (yOf(0) - yOf(3)) * ramp(t, pay, 0.35), borderLeft: `5px solid ${C.up}`, boxShadow: `0 0 12px ${C.up}`, opacity: ramp(t, pay, 0.15) }} />
        <Tag x={112} y={(yOf(0) + yOf(3)) / 2} text="多付3跳" color={C.up} o={ramp(t, pay + 0.2, 0.25)} />
      </Stage>
      <Minimap upto={CHASE} mark={CHASE} />
    </>
  );
};
