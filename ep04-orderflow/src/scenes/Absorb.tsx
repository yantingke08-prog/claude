// 可盘口不能只看谁着急 / 你冲上去 / 还得看有没有人接 / 有人挂在某个价位 / 不追价 / 等别人送上门 / 这就是被动承接 /
// 上面卖单厚 / 主动买再多也可能推不动 / 下面买单厚 / 主动卖再猛 / 也可能被接住
import React from "react";
import { Box, C, Pellet, Stage, Tag, cam, camSteps, lerp, ramp, rampIO, shake, useShot, win } from "../kit";
import { ABSORB } from "../data";
import { Minimap } from "./chart";
import { BOOK, Book, askEdge, baseSize, bidEdge, yOf } from "./parts";

const WALL = 3.3;

export const Absorb: React.FC = () => {
  const { t, at, dur } = useShot();
  const notOnly = at("不能只看");
  const rush = at("你冲上去");
  const catcher = at("有没有人接");
  const sits = at("挂在某个价位");
  const noChase = at("不追价");
  const comes = at("送上门");
  const passive = at("被动承接");
  const topThick = at("上面卖单厚");
  const noPush = at("推不动");
  const botThick = at("下面买单厚");
  const hard = at("主动卖再猛");
  const caught = at("被接住");

  // the passive seller's order drops onto 10.01 and stays there
  const placed = rampIO(t, sits, 0.35);
  const askWall = baseSize(1) + 0.9 * placed - 0.25 * win(t, comes, passive + 0.3) + (WALL - baseSize(1) - 0.9) * rampIO(t, topThick, 0.5);
  const bidWall = lerp(baseSize(0), WALL, rampIO(t, botThick, 0.5));
  // 不追价: price slips a tick away and back, the order does not follow
  const slip = t > noChase && t < comes ? Math.sin(((t - noChase) / Math.max(0.5, comes - noChase)) * Math.PI) : 0;
  const buyOn = (t > rush && t < sits) || (t > comes && t < passive + 0.4) || (t > noPush && t < botThick);
  const sellOn = t > hard && t < dur;
  const pellet = (k: number, buy: boolean) => {
    const p = (((t * 2.8 + k / 3 + (buy ? 0 : 0.5)) % 1) + 1) % 1;
    return buy ? (
      <Pellet key={`b${k}`} x={lerp(60, askEdge + 4, p)} y={yOf(1) + (k - 1) * 12} color={C.up} o={1 - p * 0.3} />
    ) : (
      <Pellet key={`s${k}`} x={lerp(1020, bidEdge - 4, p)} y={yOf(0) + (k - 1) * 12} color={C.down} o={1 - p * 0.3} />
    );
  };
  const c = camSteps(t, [
    [0, cam(0, 30, 40, 10, -10)],
    [notOnly, cam(-140, 0, 160, 9, 10)],
    [rush, cam(60, -40, 240, 9, -12)],
    [catcher, cam(160, -60, 320, 8, -16)],
    [sits, cam(160, -60, 360, 7, -14)],
    [noChase, cam(60, -40, 220, 8, -6)],
    [comes, cam(120, -60, 300, 8, -12)],
    [passive, cam(160, -60, 260, 7, -16)],
    [topThick, cam(140, -80, 160, 6, -14)],
    [noPush, cam(60, -40, 260, 8, -8)],
    [botThick, cam(-140, 80, 200, 10, 14)],
    [hard, cam(-100, 60, 280, 10, 10)],
    [caught, cam(-160, 60, 320, 9, 14)],
  ]);
  return (
    <>
      <Stage cam={{ ...c, x: c.x + shake(t, rush + 0.3, 6) + shake(t, hard + 0.3, 6) }}>
        <Book
          mid={-slip}
          ask={(l) => (l === 1 ? askWall : l > 1 ? baseSize(l) : 0)}
          bid={(l) => (l === 0 ? bidWall : l < 0 ? baseSize(l) : 0)}
          glowAsk={(l) => (l === 1 ? Math.max(win(t, catcher, sits + 0.6), win(t, comes, passive + 1.2), win(t, noPush, botThick) * 0.8) : 0)}
          glowBid={(l) => (l === 0 ? win(t, caught - 0.4, dur + 1) : 0)}
          dimRows={win(t, notOnly, rush) * 0.4}
        />
        {/* the order that gets placed and waits */}
        <Box x={askEdge + baseSize(1) * 120} y={yOf(1) - 25 - (1 - placed) * 160} w={0.9 * 120 * (1 - placed)} h={50} d={30} color={C.passive} dark={C.passiveD} glow={1} o={ramp(t, sits, 0.15) * (1 - placed)} />
        {buyOn && [0, 1, 2].map((k) => pellet(k, true))}
        {sellOn && [0, 1, 2].map((k) => pellet(k, false))}
        <Tag x={Math.min(askEdge + askWall * 120 + 16, 1040)} y={yOf(1)} text="被动承接" color={C.passive} align={askEdge + askWall * 120 > 880 ? "right" : "left"} o={win(t, passive, topThick)} />
        <Tag x={askEdge} y={yOf(1) - 52} text="推不动" color={C.up} o={win(t, noPush, botThick)} />
        <Tag x={bidEdge} y={yOf(0) - 52} text="被接住" color={C.down} align="right" o={ramp(t, caught, 0.25)} />
      </Stage>
      <Minimap upto={ABSORB} mark={ABSORB} markColor={C.passive} />
    </>
  );
};
