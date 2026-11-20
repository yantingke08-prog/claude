// 那一秒，盘口里的三种成交已经分出了胜负，只是你还没看见。
import React from "react";
import { Box, C, Pellet, Stage, Tag, Txt, cam, camPath, lerp, ramp, rampIO, useShot, win } from "../kit";
import { BOOK, Book, askEdge, baseSize, bidEdge, yOf } from "./parts";

export const Tape: React.FC = () => {
  const { t, at, dur } = useShot();
  const sec = at("那一秒");
  const three = at("三种成交");
  const win1 = at("胜负");
  const unseen = at("没看见");
  const hit = rampIO(t, three, 0.5);
  const drop = rampIO(t, win1, 0.6);
  const mid = lerp(0, -1, drop);
  const stopY = yOf(-3);
  const c = camPath(t, [
    [0, cam(0, 80, -260, 14, 18)],
    [three, cam(0, 20, 0, 10, 8)],
    [dur, cam(0, 0, 120, 8, -6)],
  ]);
  return (
    <Stage cam={c}>
      <Book
        mid={mid}
        ask={(l) => (l >= 1 ? baseSize(l) * (l === 1 ? 1 - 0.6 * hit : 1) : 0)}
        bid={(l) => (l <= 0 && l > -3 ? baseSize(l) * (l === 0 ? 1 - drop : 1) : l <= -4 ? baseSize(l) : 0)}
        glowBid={(l) => (l === -1 ? win(t, three + 0.3, win1 + 0.8) : 0)}
        dimRows={ramp(t, unseen, 0.8)}
      />
      {/* frozen clock: “that one second” */}
      <Txt x={BOOK.cx} y={360} text="09:31:05" mono size={44} color={C.text} align="center" o={ramp(t, sec, 0.3)} />
      {/* 主动: a red order punching into the asks */}
      <Pellet x={lerp(bidEdge - 200, askEdge + 10, hit)} y={yOf(1)} color={C.up} o={win(t, three - 0.1, three + 0.9)} />
      <Tag x={askEdge + baseSize(1) * 120 * 0.4 + 16} y={yOf(1)} text="主动" color={C.up} o={win(t, three, unseen + 3)} />
      {/* 被动: resting bid holding */}
      <Tag x={bidEdge - baseSize(-1) * 120 - 16} y={yOf(-1)} text="被动" color={C.passive} align="right" o={win(t, three + 0.3, unseen + 3)} />
      {/* 被迫: stop orders waiting below */}
      <Box x={bidEdge - 150} y={stopY - 22} w={150} h={44} color={C.forced} dark={C.forcedD} dashed o={win(t, three + 0.6, dur + 1)} />
      <Tag x={bidEdge - 166} y={stopY} text="被迫" color={C.forced} align="right" o={win(t, three + 0.6, unseen + 3)} />
    </Stage>
  );
};
