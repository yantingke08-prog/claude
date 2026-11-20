// 先别盯 K 线。你想啊，这一下到底是谁在成交？
import React from "react";
import { At, C, Pellet, Stage, Tag, cam, camPath, lerp, rampIO, rnd, useShot } from "../kit";
import { BOOK, Book, baseSize, yOf } from "./parts";
import { HookChart } from "./Hook";

export const Who: React.FC = () => {
  const { t, at, dur } = useShot();
  const away = rampIO(t, at("先别盯"), 1.0);
  const who = at("谁在成交");
  const c = camPath(t, [
    [0, cam(0, 0, 0, 8, -6)],
    [who, cam(0, 0, 160, 6, 4)],
    [dur, cam(0, -20, 240, 6, 8)],
  ]);
  const pellets = Array.from({ length: 9 }, (_, k) => {
    const t0 = who + k * 0.22;
    const p = (t - t0) / 0.5;
    if (p < 0 || p > 1) return null;
    const col = [C.up, C.down, C.forced][k % 3];
    const fromLeft = rnd(k) > 0.5;
    const x = fromLeft ? lerp(60, BOOK.cx - 90, p) : lerp(1020, BOOK.cx + 90, p);
    return <Pellet key={k} x={x} y={yOf(0) + (rnd(k + 9) - 0.5) * 20} color={col} o={1 - p * 0.6} />;
  });
  return (
    <Stage cam={c}>
      {/* the candle chart slides back into the dark */}
      <At x={0} y={0} z={lerp(0, -900, away)} o={lerp(1, 0.18, away)}>
        <HookChart t={99} chase={0} turn={0} />
      </At>
      <At x={0} y={0} z={lerp(-700, 0, away)} o={away}>
        <Book mid={0} ask={(l) => (l >= 1 ? baseSize(l) : 0)} bid={(l) => (l <= 0 ? baseSize(l) : 0)} glowAsk={() => 0} />
        {pellets}
        <Tag x={BOOK.cx + 100} y={yOf(0)} text="谁在成交" color={C.text} o={rampIO(t, who, 0.4)} size={44} />
      </At>
    </Stage>
  );
};
