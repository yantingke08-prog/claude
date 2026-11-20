// 所以价格不是谁拍脑袋定出来的，是买卖双方一笔一笔成交拍出来的。
import React from "react";
import { Box, C, Candle, MONO, Stage, Tag, cam, camPath, lerp, ramp, rnd, useShot, win } from "../kit";

const N = 42;
const PY = (p: number) => 900 - p * 26;
// a deterministic random walk of trades that drifts up
const PRINTS = (() => {
  let p = 0;
  return Array.from({ length: N }, (_, k) => {
    const buy = rnd(k + 3) > 0.42;
    p += buy ? 0.6 : -0.45;
    return { p, buy, x: 180 + rnd(k + 70) * 300 };
  });
})();

export const Print: React.FC = () => {
  const { t, at, end, dur } = useShot();
  const guess = at("拍脑袋");
  const a = at("是买卖双方");
  const one = at("一笔一笔");
  const b = Math.max(a + 2, end("拍出来的"));
  const shownN = PRINTS.filter((_, k) => t >= lerp(a, b, Math.pow(k / N, 0.75))).length;
  const vis = PRINTS.slice(0, shownN);
  const ps = vis.map((q) => q.p);
  const c = camPath(t, [
    [0, cam(0, -60, 160, 8, 10)],
    [dur, cam(40, -40, 60, 8, -6)],
  ]);
  return (
    <Stage cam={c}>
      {/* the "decided on a whim" price: shown, struck out, gone */}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 430,
          transform: "translate(-50%,-50%)",
          fontFamily: MONO,
          fontSize: 92,
          fontWeight: 800,
          color: C.dim,
          opacity: win(t, guess, a + 0.4),
          textDecoration: ramp(t, guess + 0.6, 0.1) > 0.5 ? "line-through" : "none",
          textDecorationColor: C.up,
        }}
      >
        10.08
      </div>
      {vis.map((q, k) => {
        const age = t - lerp(a, b, Math.pow(k / N, 0.75));
        return (
          <Box
            key={k}
            x={q.x}
            y={PY(q.p) - 7}
            w={64}
            h={14}
            d={10}
            color={q.buy ? C.up : C.down}
            dark={q.buy ? C.upD : C.downD}
            glow={Math.max(0, 1 - age * 2)}
            o={0.35 + 0.65 * Math.max(0, 1 - age * 0.8)}
          />
        );
      })}
      {vis.length > 1 && (
        <Candle cx={760} open={PY(ps[0])} close={PY(ps[ps.length - 1])} high={PY(Math.max(...ps)) - 6} low={PY(Math.min(...ps)) + 6} w={90} glow={0.4} />
      )}
      <Tag x={180} y={PY(-1.2) + 40} text="一笔一笔" color={C.text} o={win(t, one, end("拍出来的") - 0.2)} />
      {vis.length > 1 && <Tag x={820} y={PY(ps[ps.length - 1])} text="成交拍出来" color={C.up} o={ramp(t, end("拍出来的") - 0.4, 0.3)} />}
    </Stage>
  );
};
