// 所以价格不是谁拍脑袋定出来的 / 是买卖双方一笔一笔成交拍出来的
// Trades land one by one as bricks on a price ladder and stack up at their price. Nothing fades:
// each brick lands with a 0.1 s pop and then stays at constant brightness. The candle beside the
// ladder is only the envelope of those trades (open = first, close = last, high/low = extremes).
import React from "react";
import { Box, C, Candle, MONO, Stage, Tag, cam, camSteps, clamp01, easeIO, lerp, ramp, rnd, useShot, win } from "../kit";
import { MAIN } from "../data";
import { Minimap } from "./chart";

const N = 42;
const ROW = 46; // px per price tick
const PY = (tick: number) => 930 - tick * ROW;
const LADDER_X = 300; // first brick column
const BRICK = 30;
// deterministic random walk in whole ticks, kept inside −4…+5
const PRINTS = (() => {
  let p = 0;
  const count = new Map<number, number>();
  return Array.from({ length: N }, (_, k) => {
    const buy = rnd(k + 3) > 0.42;
    p = Math.max(-4, Math.min(5, p + (buy ? 1 : -1) * (rnd(k + 40) > 0.55 ? 1 : 0)));
    const n = count.get(p) ?? 0;
    count.set(p, n + 1);
    return { p, buy, n };
  });
})();
const MAX_STACK = Math.max(...PRINTS.map((q) => q.n)) + 1;
const DX = Math.min(BRICK + 6, 360 / MAX_STACK); // ladder never reaches the candle column
const TICKS = Array.from(new Set(PRINTS.map((q) => q.p))).sort((a, b) => b - a);
const CX = 780; // candle column

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
  const last = vis.length ? vis[vis.length - 1].p : 0;
  // one sentence: two camera positions (the guess, then the ladder + candle)
  const c = camSteps(t, [
    [0, cam(0, -120, 200, 8, 4)],
    [both, cam(40, 40, 140, 8, -6)],
  ]);
  return (
    <>
      <Stage cam={c}>
        <div
          style={{
            position: "absolute",
            left: 540,
            top: 470,
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
        {/* the price ladder: one row per tick, prices on the left */}
        {TICKS.map((tick) => (
          <React.Fragment key={tick}>
            <div style={{ position: "absolute", left: LADDER_X - 30, top: PY(tick), transform: "translate(-100%,-50%)", fontFamily: MONO, fontSize: 26, color: tick === last && vis.length ? C.text : C.dim, opacity: ramp(t, both, 0.3), whiteSpace: "nowrap" }}>
              {(10 + tick * 0.01).toFixed(2)}
            </div>
            <div style={{ position: "absolute", left: LADDER_X - 16, top: PY(tick) + ROW / 2 - 1, width: 400, height: 1, background: C.faint, opacity: ramp(t, both, 0.3) * 0.6 }} />
          </React.Fragment>
        ))}
        {/* trades: each lands at its price with a 0.1 s pop, then stays put at constant brightness */}
        {vis.map((q, k) => {
          const age = t - timeOf(PRINTS.indexOf(q));
          const land = clamp01(age / 0.1);
          const s = 1 + 0.25 * (1 - easeIO(land));
          const x = LADDER_X + q.n * DX;
          const y = PY(q.p) - BRICK / 2 + 1;
          return (
            <div key={k} style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", transform: `translate(${x + BRICK / 2}px, ${y + BRICK / 2}px) scale(${s}) translate(${-x - BRICK / 2}px, ${-y - BRICK / 2}px)` }}>
              <Box x={x} y={y} w={BRICK} h={BRICK - 4} d={12} color={q.buy ? C.up : C.down} dark={q.buy ? C.upD : C.downD} o={0.92} />
            </div>
          );
        })}
        {/* the last trade's price: a cursor that jumps row to row (position, not brightness) */}
        {vis.length > 0 && <div style={{ position: "absolute", left: LADDER_X - 22, top: PY(last) - ROW / 2 + 3, width: 4, height: ROW - 6, background: C.text }} />}
        {vis.length > 1 && <Candle cx={CX} open={PY(ps[0])} close={PY(last)} high={PY(Math.max(...ps)) - ROW / 2} low={PY(Math.min(...ps)) + ROW / 2} w={90} />}
        <Tag x={LADDER_X - 30} y={PY(TICKS[0]) - 56} text="一笔一笔" color={C.text} size={36} o={ramp(t, one, 0.2)} />
        {vis.length > 1 && <Tag x={CX + 60} y={PY(last)} text="成交拍出来" color={C.up} size={36} o={ramp(t, fills, 0.25)} />}
      </Stage>
      <Minimap upto={MAIN.length - 1} mark={MAIN.length - 1} o={ramp(t, both, 0.3)} />
    </>
  );
};
