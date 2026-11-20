// 可盘口不能只看谁着急。你冲上去，还得看有没有人接。
// 有人挂在某个价位，不追价，等别人送上门，这就是被动承接。上面卖单厚，主动买再多也可能推不动；
// 下面买单厚，主动卖再猛，也可能被接住。成交很大，价格却不走［短暂停顿］往往就是有人主动打，有人在稳稳接。
import React from "react";
import { C, MONO, Pellet, Stage, Tag, cam, camPath, lerp, ramp, useShot, win } from "../kit";
import { BOOK, Book, askEdge, baseSize, bidEdge, yOf } from "./parts";

const WALL = 3.3;

export const Absorb: React.FC = () => {
  const { t, at, dur } = useShot();
  const rush = at("冲上去");
  const catcher = at("有没有人接");
  const sits = at("挂在某个价位");
  const passive = at("被动承接");
  const topThick = at("上面卖单厚");
  const noPush = at("推不动");
  const botThick = at("下面买单厚");
  const caught = at("被接住");
  const big = at("成交很大");
  const flat = at("价格却不走");
  const both = at("有人主动打");
  const steady = at("稳稳接");

  const buyOn = (t > rush && t < sits) || (t > topThick && t < botThick) || t > both;
  const sellOn = (t > botThick && t < big + 0.5) || t > both;
  const askWall = WALL - 0.35 * ramp(t, rush, 2) - 0.25 * ramp(t, topThick, 3) + 0.2 * ramp(t, passive, 1); // refills: someone keeps waiting there
  const bidWall = lerp(baseSize(0), WALL - 0.3 * ramp(t, caught, 2), ramp(t, botThick, 0.7));
  const wallGlow = Math.max(win(t, catcher, sits + 1.2), win(t, passive, botThick) * 0.8, win(t, steady, dur + 1));
  const bidGlow = Math.max(win(t, caught, big), win(t, steady, dur + 1));
  const jitter = buyOn || sellOn ? Math.sin(t * 23) * 0.06 : 0; // price twitches but does not go anywhere

  const pellet = (k: number, buy: boolean) => {
    const p = ((t * 2.6 + k / 3 + (buy ? 0 : 0.5)) % 1 + 1) % 1;
    return buy ? (
      <Pellet key={`b${k}`} x={lerp(60, askEdge + 4, p)} y={yOf(1) + (k - 1) * 12} color={C.up} o={1 - p * 0.3} />
    ) : (
      <Pellet key={`s${k}`} x={lerp(1020, bidEdge - 4, p)} y={yOf(0) + (k - 1) * 12} color={C.down} o={1 - p * 0.3} />
    );
  };
  // traded volume keeps climbing while the price stays put
  const vol = Math.round(1200 + 9800 * ramp(t, big - 0.6, 3.2) + (t > both ? (t - both) * 1400 : 0));

  const c = camPath(t, [
    [0, cam(0, 30, 40, 10, -10)],
    [rush, cam(80, -40, 200, 9, -14)],
    [passive, cam(120, -60, 240, 8, -16)],
    [botThick, cam(-100, 40, 220, 10, 14)],
    [big, cam(0, -40, 40, 8, 0)],
    [dur, cam(0, -20, 120, 8, 4)],
  ]);
  const askEnd = askEdge + askWall * BOOK.unit;
  return (
    <Stage cam={c}>
      <Book
        mid={jitter}
        ask={(l) => (l === 1 ? askWall : l > 1 ? baseSize(l) : 0)}
        bid={(l) => (l === 0 ? bidWall : l < 0 ? baseSize(l) : 0)}
        glowAsk={(l) => (l === 1 ? wallGlow : 0)}
        glowBid={(l) => (l === 0 ? bidGlow : 0)}
      />
      {buyOn && [0, 1, 2].map((k) => pellet(k, true))}
      {sellOn && [0, 1, 2].map((k) => pellet(k, false))}
      {/* one main tag per sentence, each beside the wall it talks about */}
      <Tag x={Math.min(askEnd + 14, 1040)} y={yOf(1) - 50} text="有人接" color={C.passive} align={askEnd > 900 ? "right" : "left"} o={win(t, catcher, passive)} />
      <Tag x={Math.min(askEnd + 14, 1040)} y={yOf(1) - 50} text="被动承接" color={C.passive} align={askEnd > 900 ? "right" : "left"} o={win(t, passive, noPush)} />
      <Tag x={askEdge} y={yOf(1) - 50} text="推不动" color={C.up} o={win(t, noPush, botThick)} />
      <Tag x={bidEdge} y={yOf(0) + 50} text="被接住" color={C.down} align="right" o={win(t, caught, big)} />
      <div
        style={{
          position: "absolute",
          left: BOOK.cx,
          top: yOf(BOOK.maxLvl) - 80,
          transform: "translate(-50%,-50%) translateZ(10px)",
          fontFamily: MONO,
          fontSize: 44,
          fontWeight: 800,
          color: C.text,
          opacity: win(t, big, both),
          whiteSpace: "nowrap",
        }}
      >
        {`VOL ${vol.toLocaleString("en-US")}`}
      </div>
      <Tag x={BOOK.cx + 100} y={yOf(0) - 4} text="价不动" color={C.text} o={win(t, flat, both)} size={38} />
      <Tag x={bidEdge} y={yOf(0) + 50} text="稳稳接" color={C.passive} align="right" o={ramp(t, steady, 0.3)} />
    </Stage>
  );
};
