// 所以价格不是谁拍脑袋定出来的 / 是买卖双方一笔一笔成交拍出来的
// Trades print one by one at their prices; the candle is nothing but their envelope.
import React from "react";
import { Box, C, Candle, MONO, Stage, Tag, cam, camSteps, lerp, ramp, rnd, useShot, win } from "../kit";
import { MAIN } from "../data";
import { Minimap } from "./chart";

const N = 42;
const PY = (p: number) => 900 - p * 26;
const PRINTS = (() => {
  let p = 0;
  return Array.from({ length: N }, (_, k) => {
    const buy = rnd(k + 3) > 0.42;
    p += buy ? 0.6 : -0.45;
    return { p, buy, x: 170 + rnd(k + 70) * 300 };
  });
})();

export const Print: React.FC = () => {
  const { t, at, end } = useShot();
  const guess = at("拍脑袋");
  const decided = at("定出来");
  const both = at("买卖双方");
  const one = at("一笔一笔");
  const fills = at("成交拍出来");
  const b = Math.max(both + 2, end("拍出来的"));
  // first prints on 买卖双方 (slow), rate jumps on 一笔一笔
  const timeOf = (k: number) => (k < 6 ? lerp(both, one, k / 6) : lerp(one, b, Math.pow((k - 6) / (N - 6), 0.8)));
  const vis = PRINTS.filter((_, k) => t >= timeOf(k));
  const ps = vis.map((q) => q.p);
  const c = camSteps(t, [
    [0, cam(0, -60, 120, 8, 8)],
    [decided, cam(0, -120, 260, 7, 2)],
    [both, cam(-120, 20, 260, 8, 10)],
    [one, cam(-60, 0, 160, 8, 4)],
    [fills, cam(120, -40, 300, 7, -8)],
  ]);
  return (
    <>
      <Stage cam={c}>
        <div
          style={{
            position: "absolute",
            left: 540,
            top: 450,
            transform: "translate(-50%,-50%)",
            fontFamily: MONO,
            fontSize: 92,
            fontWeight: 800,
            color: C.dim,
            opacity: win(t, guess, both + 0.3),
            textDecoration: ramp(t, decided, 0.1) > 0.5 ? "line-through" : "none",
            textDecorationColor: C.up,
          }}
        >
          10.08?
        </div>
        {vis.map((q, k) => {
          const age = t - timeOf(k);
          return <Box key={k} x={q.x} y={PY(q.p) - 7} w={64} h={14} d={10} color={q.buy ? C.up : C.down} dark={q.buy ? C.upD : C.downD} glow={Math.max(0, 1 - age * 2)} o={0.35 + 0.65 * Math.max(0, 1 - age * 0.8)} />;
        })}
        {vis.length > 1 && <Candle cx={760} open={PY(ps[0])} close={PY(ps[ps.length - 1])} high={PY(Math.max(...ps)) - 6} low={PY(Math.min(...ps)) + 6} w={90} glow={0.4} />}
        <Tag x={170} y={PY(-1.6) + 40} text="一笔一笔" color={C.text} o={win(t, one, fills)} />
        {vis.length > 1 && <Tag x={820} y={PY(ps[ps.length - 1])} text="成交拍出来" color={C.up} o={ramp(t, fills, 0.25)} />}
      </Stage>
      <Minimap upto={MAIN.length - 1} mark={MAIN.length - 1} o={ramp(t, both, 0.3)} />
    </>
  );
};
