// 有人嫌挂单慢 / 直接追着价格打 / 有人不着急 / 挂在原地等别人来 / 还有一种 / 本来没打算动 / 止损一破 / 被硬逼着成交
// Layer 3: the same order book, one actor per clause.
import React from "react";
import { Box, C, HLine, Pellet, Stage, Tag, cam, camSteps, clamp01, lerp, ramp, rampIO, shake, useShot, win } from "../kit";
import { CHASE } from "../data";
import { Minimap } from "./chart";
import { BOOK, Book, askEdge, baseSize, bidEdge, yOf } from "./parts";

export const Three: React.FC = () => {
  const { t, at, dur } = useShot();
  const impatient = at("挂单慢");
  const chase = at("追着价格打");
  const calm = at("有人不着急");
  const wait = at("等别人来");
  const third = at("还有一种");
  const asleep = at("没打算动");
  const broke = at("止损一破");
  const forced = at("被硬逼着");

  // the red chaser: appears, waits impatiently, then lifts the offer at 10.01
  const redIn = ramp(t, impatient, 0.25);
  const redGo = rampIO(t, chase, 0.35);
  const eaten = ramp(t, chase + 0.3, 0.25);
  // the blue limit order: placed at 9.99, then filled by a seller
  const blueIn = ramp(t, calm, 0.3);
  const blueFill = ramp(t, wait + 0.35, 0.3);
  // the amber stop at 9.97: asleep until the level breaks, then forced into the bids
  const stopIn = ramp(t, third, 0.3);
  const fall = rampIO(t, broke - 0.2, 0.5);
  const fire = rampIO(t, forced, 0.4);
  const mid = lerp(lerp(0, 1, eaten), -3, fall) - fire;

  const c = camSteps(t, [
    // one sentence, three kinds of trader: one camera position each
    [0, cam(-40, -80, 240, 8, -4)],
    [calm, cam(-120, 50, 240, 9, 8)],
    [third, cam(-100, 150, 260, 10, 8)],
  ]);
  const stopY = yOf(-3);
  return (
    <>
      <Stage cam={{ ...c, y: c.y + shake(t, broke, 8) }}>
        <Book
          mid={mid}
          ask={(l) => (l === 1 ? baseSize(l) * (1 - eaten) : l > 1 ? baseSize(l) : 0)}
          bid={(l) => (l === -1 ? baseSize(l) * (1 - 0.5 * blueFill) : l <= 0 && l > -3 ? baseSize(l) * (1 - clamp01(fall * 3 - (2 + l))) * (1 - fire * 0.4) : l <= -3 ? baseSize(l) * (1 - fire * (l === -4 ? 0.7 : 0)) : 0)}
          glowAsk={(l) => (l === 1 ? win(t, chase, chase + 0.8) : 0)}
          glowBid={(l) => (l === -4 ? win(t, forced + 0.2, forced + 1.2) : 0)}
        />
        {/* 主动 */}
        <Box x={lerp(90, askEdge - 30, redGo)} y={yOf(1) - 18} w={60} h={36} d={20} color={C.up} dark={C.upD} glow={0.6} o={redIn * (1 - eaten)} />
        <Pellet x={askEdge + 20} y={yOf(1)} color={C.up} o={win(t, chase + 0.25, chase + 0.6, 0.08)} r={20} />
        <Tag x={BOOK.cx - 96} y={yOf(1)} text="主动买" color={C.up} align="right" o={win(t, chase + 0.2, calm)} />
        {/* 被动 */}
        <Box x={bidEdge - baseSize(-1) * 120 - 76} y={yOf(-1) - 22 - (1 - blueIn) * 120} w={64} h={44} d={22} color={C.passive} dark={C.passiveD} glow={win(t, wait + 0.35, wait + 1)} o={blueIn * (1 - blueFill * 0.7)} />
        <Pellet x={lerp(1000, bidEdge - 30, clamp01((t - wait) / 0.4))} y={yOf(-1)} color={C.down} o={win(t, wait, wait + 0.45, 0.06)} />
        <Tag x={bidEdge - baseSize(-1) * 120 - 92} y={yOf(-1)} text="被动挂单" color={C.passive} align="right" o={win(t, calm + 0.2, third)} />
        {/* 被迫 */}
        <HLine x={bidEdge - 330} y={stopY - 32} w={330} color={C.forced} dashed o={stopIn * (1 - ramp(t, broke, 0.2))} />
        <Box x={bidEdge - 330} y={stopY - 18} w={150} h={36} color={C.forced} dark={C.forcedD} dashed o={stopIn * (1 - ramp(t, asleep, 0.4) * 0.5) * (1 - ramp(t, forced, 0.2))} />
        <Box x={lerp(bidEdge - 330, bidEdge - 160, fire)} y={lerp(stopY, yOf(-4), fire) - 18} w={150} h={36} color={C.forced} dark={C.forcedD} glow={1} o={ramp(t, forced, 0.15) * (1 - ramp(t, forced + 0.9, 0.4) * 0.6)} />
        <Tag x={bidEdge - 176} y={yOf(-4)} text="被迫卖" color={C.forced} align="right" o={ramp(t, forced + 0.3, 0.25)} />
        <Tag x={bidEdge - 346} y={stopY} text="止损" color={C.forced} align="right" o={win(t, third + 0.2, forced)} />
      </Stage>
      <Minimap upto={CHASE} mark={CHASE} />
    </>
  );
};
