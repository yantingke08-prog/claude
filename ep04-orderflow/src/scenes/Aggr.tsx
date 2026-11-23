// 最直接的 / 是追着价格打的人 / 主动买连续吃卖单 / 价格往上跳 / 主动卖连续砸买单 / 价格往下走 / 它告诉你 / 着急的人愿意为成交付多少钱
// Buyers eat 10.01→10.03 and the price jumps up; then the book REWINDS to 10.00 and sellers eat the bids down instead.
import React from "react";
import { C, Pellet, RewindFx, Stage, Tag, cam, camSteps, clamp01, lerp, ramp, rampIO, shake, useShot, win } from "../kit";
import { CHASE } from "../data";
import { Minimap } from "./chart";
import { BOOK, Book, askEdge, baseSize, bidEdge, yOf } from "./parts";
import { REWIND } from "./Hook";

export const Aggr: React.FC = () => {
  const { t, at, end } = useShot();
  const first = at("最直接的");
  const who = at("追着价格打的人");
  const buy0 = at("吃卖单");
  const up = at("往上跳");
  const sellWord = at("主动卖");
  const sell0 = Math.max(at("砸买单"), sellWord + REWIND);
  const down = at("往下走");
  const tells = at("它告诉你");
  const pay = at("付多少钱");
  // buying: levels 1..3 eaten, the jump lands on 往上跳
  const buyFwd = clamp01((t - buy0) / Math.max(0.6, end("往上跳") - buy0)) * 3;
  // rewind on 主动卖: everything the buyers ate comes back, price returns to 10.00
  const rw = rampIO(t, sellWord, REWIND);
  const buyP = buyFwd * (1 - rw);
  // selling: bid levels 0..-3 eaten, the drop lands on 往下走
  const sellP = clamp01((t - sell0) / Math.max(0.6, end("往下走") - sell0)) * 4;
  const mid = buyP - sellP;
  const ask = (l: number) => (l < 1 ? 0 : l <= 3 ? baseSize(l) * clamp01(1 - (buyP - (l - 1))) : baseSize(l));
  const bid = (l: number) => (l > 0 ? 0 : l >= -3 ? baseSize(l) * clamp01(1 - (sellP + l)) : baseSize(l));
  const buying = buyFwd > 0 && buyFwd < 3 && rw === 0;
  const selling = sellP > 0 && sellP < 4;
  const tgt = buying ? Math.floor(buyP) + 1 : -Math.floor(sellP);
  const pellets = [0, 1, 2].map((k) => {
    if (!buying && !selling) return null;
    const p = (((t * 3.4 + k / 3) % 1) + 1) % 1;
    return buying ? (
      <Pellet key={k} x={lerp(80, askEdge + 6, p)} y={yOf(tgt) + (k - 1) * 10} color={C.up} o={1 - p * 0.3} />
    ) : (
      <Pellet key={k} x={lerp(1000, bidEdge - 6, p)} y={yOf(tgt) + (k - 1) * 10} color={C.down} o={1 - p * 0.3} />
    );
  });
  const c = camSteps(t, [
    [0, cam(0, 40, 0, 10, -10)],
    [first, cam(120, -60, 200, 9, -12)],
    [who, cam(-100, -20, 220, 9, 8)],
    [buy0, cam(40, -100, 260, 8, -10)],
    [up, cam(40, -150, 300, 7, -8)],
    [sellWord, cam(0, -40, 160, 8, 0)],
    [sell0, cam(-40, 40, 240, 9, 10)],
    [down, cam(-40, 60, 280, 9, 8)],
    [tells, cam(0, 0, 60, 8, 0)],
    [pay, cam(-40, -80, 220, 8, -6)],
  ]);
  const rewinding = t > sellWord && t < sellWord + REWIND;
  // 多付3跳: the bracket sits right beside the price column, over the three levels the buyers paid through
  const bx0 = BOOK.cx - 86;
  return (
    <>
      <Stage cam={{ ...c, y: c.y + shake(t, up, 6) + shake(t, down, 6) }}>
        <Book mid={mid} ask={ask} bid={bid} glowAsk={(l) => (buying && l === tgt ? 0.8 : 0)} glowBid={(l) => (selling && l === tgt ? 0.8 : 0)} />
        {pellets}
        {/* the hurried buyers, queued at the left until they fire */}
        {[0, 1, 2].map((k) => (
          <Pellet key={`q${k}`} x={100 + k * 60} y={yOf(1)} color={C.up} r={12} o={win(t, who + k * 0.12, buy0 + k * 0.3, 0.15)} />
        ))}
        <Tag x={BOOK.cx - 96} y={yOf(Math.min(3, Math.floor(buyP) + 1))} text="主动买" color={C.up} align="right" o={win(t, buy0, sellWord)} />
        <Tag x={BOOK.cx + 96} y={yOf(Math.max(-3, -Math.floor(sellP)))} text="主动卖" color={C.down} o={win(t, sell0, pay)} />
        <div style={{ position: "absolute", left: bx0, top: yOf(3), width: 14, height: (yOf(0) - yOf(3)) * ramp(t, pay, 0.35), borderLeft: `4px solid ${C.up}`, borderTop: `4px solid ${C.up}`, borderBottom: `4px solid ${C.up}`, boxShadow: `0 0 10px ${C.up}`, opacity: ramp(t, pay, 0.15) }} />
        <Tag x={bx0 - 14} y={(yOf(0) + yOf(3)) / 2} text="追买多付3跳" color={C.up} align="right" o={ramp(t, pay + 0.2, 0.25)} />
      </Stage>
      <RewindFx o={rewinding ? Math.min(1, (t - sellWord) / 0.12, (sellWord + REWIND - t) / 0.12) : 0} t={t} />
      <Minimap upto={CHASE} mark={CHASE} />
    </>
  );
};
