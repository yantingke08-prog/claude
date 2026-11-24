// 先别盯 K 线 / 你想啊 / 这一下到底是谁在成交？
// A light-sweep switch from the footprint back to the K-line chart; on "K 线" a big X is drawn over it and the chart
// dims under it. The X stays until 你想啊, then the order book behind that bar comes forward.
import React from "react";
import { AbsoluteFill } from "remotion";
import { At, C, Pellet, Stage, Tag, aim, cam, camSteps, clamp01, lerp, ramp, rampIO, rnd, useShot } from "../kit";
import { FALL_END, TURN } from "../data";
import { Chart, Minimap, bx, py } from "./chart";
import { BOOK, Book, baseSize, yOf } from "./parts";

/** a big X drawn stroke by stroke */
const BigX: React.FC<{ p: number; o: number }> = ({ p, o }) => {
  if (o <= 0) return null;
  const s1 = clamp01(p * 2);
  const s2 = clamp01(p * 2 - 1);
  const L = 1.42 * 520; // diagonal length of a 520 px square
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
      <g stroke={C.up} strokeWidth={34} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 18px ${C.up})` }}>
        <line x1={280} y1={560} x2={800} y2={1080} strokeDasharray={`${L * s1} ${L}`} />
        <line x1={800} y1={560} x2={280} y2={1080} strokeDasharray={`${L * s2} ${L}`} />
      </g>
    </svg>
  );
};

export const Who: React.FC = () => {
  const { t, at } = useShot();
  const kline = at("K线");
  const think = at("你想啊");
  const who = at("谁在成交");
  const xDraw = rampIO(t, kline - 0.1, 0.45);
  const xOff = ramp(t, think, 0.3);
  const chartDim = ramp(t, kline, 0.3);
  const book = rampIO(t, think, 0.6);
  const c = camSteps(t, [
    [0, aim(bx(TURN), py(4), 1.7, 6, -4)],
    [0.05, aim(bx(TURN) - 120, py(2), 1.25, 6, -2)],
    [think, cam(0, 0, 40, 8, -6)],
    [who, cam(0, -10, 200, 7, 6)],
  ]);
  // switch effect: a bright band sweeps down the frame in the first 0.4 s
  const sweep = clamp01(t / 0.4);
  const pellets = Array.from({ length: 9 }, (_, k) => {
    const t0 = who + k * 0.16;
    const p = (t - t0) / 0.42;
    if (p < 0 || p > 1) return null;
    const col = [C.up, C.down, C.forced][k % 3];
    const fromLeft = rnd(k) > 0.5;
    return <Pellet key={k} x={fromLeft ? lerp(60, BOOK.cx - 90, p) : lerp(1020, BOOK.cx + 90, p)} y={yOf(0) + (rnd(k + 9) - 0.5) * 20} color={col} o={1 - p * 0.6} />;
  });
  return (
    <>
      <Stage cam={c}>
        <At x={0} y={0} z={lerp(0, -900, book)} o={lerp(1, 0.22, chartDim) * (1 - book * 0.85)}>
          <Chart upto={FALL_END} vol={1 - book} />
        </At>
        <At x={0} y={0} z={lerp(-600, 0, book)} o={book}>
          <Book mid={0} ask={(l) => (l >= 1 ? baseSize(l) : 0)} bid={(l) => (l <= 0 ? baseSize(l) : 0)} glowAsk={(l) => (l === 1 ? ramp(t, who, 0.2) * 0.6 : 0)} glowBid={(l) => (l === 0 ? ramp(t, who, 0.2) * 0.6 : 0)} />
          {pellets}
          <Tag x={BOOK.cx + 100} y={yOf(0)} text="谁在成交" color={C.text} o={ramp(t, who, 0.25)} />
        </At>
      </Stage>
      <BigX p={xDraw} o={ramp(t, kline - 0.1, 0.1) * (1 - xOff)} />
      {sweep < 1 && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: 0, top: lerp(260, 1380, sweep) - 60, width: 1080, height: 120, background: "linear-gradient(180deg, transparent, rgba(220,235,255,0.35), transparent)", opacity: 1 - sweep * 0.6 }} />
        </AbsoluteFill>
      )}
      <Minimap upto={FALL_END} mark={TURN} o={book} />
    </>
  );
};
