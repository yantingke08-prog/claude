// 最直接的，是追着价格打的人。主动买连续吃卖单，价格往上跳；主动卖连续砸买单，价格往下走。它告诉你，着急的人愿意为成交付多少钱。
import React from "react";
import { C, Pellet, Stage, Tag, cam, camPath, clamp01, lerp, ramp, useShot, win } from "../kit";
import { BOOK, Book, askEdge, baseSize, bidEdge, yOf } from "./parts";

export const Aggr: React.FC = () => {
  const { t, at, end, dur } = useShot();
  const buy0 = at("主动买");
  const buy1 = end("往上跳");
  const sell0 = at("主动卖");
  const sell1 = end("往下走");
  const pay = at("付多少钱");
  const buyP = clamp01((t - buy0) / Math.max(0.5, buy1 - buy0)) * 3; // eats ask levels 1..3
  const sellP = clamp01((t - sell0) / Math.max(0.5, sell1 - sell0)) * 4; // eats bid levels 2..-1
  const refill = ramp(t, buy1, 0.6); // fresh bids line up under the new price
  const mid = sellP > 0 ? 3 - sellP : buyP;
  const ask = (l: number) => (l < 1 ? 0 : l <= 3 ? baseSize(l) * clamp01(1 - (buyP - (l - 1))) : baseSize(l));
  const bid = (l: number) => {
    const base = l <= 0 ? baseSize(l) : l <= 2 ? baseSize(l) * refill : 0;
    const k = 2 - l; // order in which the sell eats: 2,1,0,-1
    return k >= 0 && k < 4 ? base * clamp01(1 - (sellP - k)) : base;
  };
  // pellets fly to whichever level is being eaten
  const buying = buyP > 0 && buyP < 3;
  const selling = sellP > 0 && sellP < 4;
  const tgt = buying ? Math.floor(buyP) + 1 : 2 - Math.floor(sellP);
  const pellets = [0, 1, 2].map((k) => {
    const p = ((t * 3.2 + k / 3) % 1 + 1) % 1;
    if (!buying && !selling) return null;
    return buying ? (
      <Pellet key={k} x={lerp(80, askEdge + 6, p)} y={yOf(tgt) + (k - 1) * 10} color={C.up} o={1 - p * 0.3} />
    ) : (
      <Pellet key={k} x={lerp(1000, bidEdge - 6, p)} y={yOf(tgt) + (k - 1) * 10} color={C.down} o={1 - p * 0.3} />
    );
  });
  const c = camPath(t, [
    [0, cam(0, 60, -120, 12, -14)],
    [buy0, cam(0, -60, 140, 9, -8)],
    [sell0, cam(0, 40, 160, 9, 8)],
    [pay, cam(-60, -40, 120, 8, -4)],
    [dur, cam(-60, -40, 60, 8, -2)],
  ]);
  return (
    <Stage cam={c}>
      <Book mid={mid} ask={ask} bid={bid} glowAsk={(l) => (buying && l === tgt ? 0.8 : 0)} glowBid={(l) => (selling && l === tgt ? 0.8 : 0)} />
      {pellets}
      <Tag x={BOOK.cx - 110} y={yOf(Math.min(3, Math.floor(buyP) + 1)) - 44} text="主动买" color={C.up} align="right" o={win(t, buy0, sell0)} />
      <Tag x={BOOK.cx + 110} y={yOf(Math.max(-1, 2 - Math.floor(sellP)))} text="主动卖" color={C.down} o={win(t, sell0, pay)} />
      {/* how far the hurried buyer paid up: 10.00 → 10.03 */}
      <div
        style={{
          position: "absolute",
          left: 110,
          top: yOf(3),
          width: 0,
          height: (yOf(0) - yOf(3)) * ramp(t, pay, 0.5),
          borderLeft: `4px solid ${C.up}`,
          boxShadow: `0 0 12px ${C.up}`,
          opacity: ramp(t, pay, 0.2),
        }}
      />
      <Tag x={126} y={(yOf(0) + yOf(3)) / 2} text="多付3跳" color={C.up} o={ramp(t, pay + 0.3, 0.3)} />
    </Stage>
  );
};
