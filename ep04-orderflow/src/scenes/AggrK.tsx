// 主动卖连续砸买单 / 价格往下走 / 它告诉你 / 着急的人愿意为成交付多少钱
// Back on the K-line chart. Sell orders slam into the reversal: the green bars print one by one as they hit.
// 它告诉你: pull back onto the red bar you chased. 付多少钱: a bracket over the part of that bar the chasers paid up.
import React from "react";
import { C, Pellet, Stage, Tag, aim, camSteps, clamp01, lerp, ramp, shake, useShot } from "../kit";
import { CHASE, FALL_END, MAIN } from "../data";
import { Axis, Chart, bx, py } from "./chart";
import { printing } from "./Hook";

const N = FALL_END - CHASE; // green bars 45..49

export const AggrK: React.FC = () => {
  const { t, at, end } = useShot();
  const sell = at("砸买单");
  const down = at("往下走");
  const tells = at("它告诉你");
  const pay = at("付多少钱");
  // the green bars print from 砸买单 to the end of 往下走, one per slice
  const span = Math.max(1.2, end("往下走") - sell);
  const startOf = (k: number) => sell + (span * k) / N;
  const shown = Array.from({ length: N }, (_, k) => k).filter((k) => t >= startOf(k));
  const lastK = shown.length ? shown[shown.length - 1] : -1;
  const lastI = CHASE + 1 + lastK;
  const live = lastK >= 0 ? printing(lastI, t, startOf(lastK), span / N) : undefined;
  const hitting = t > sell && t < sell + span;
  const b = MAIN[CHASE];
  const x = bx(CHASE);
  const c = camSteps(t, [
    [0, aim(bx(CHASE + 2), py(5), 1.45, 6, -4)],
    [sell, aim(bx(CHASE + 2), py(3), 1.6, 7, -6)],
    [down, aim(bx(CHASE + 3), py(1), 1.55, 7, -4)],
    [tells, aim(bx(CHASE) - 60, py(6), 1.35, 6, -4)],
    [pay, aim(x - 40, py(7), 1.8, 6, -6)],
  ]);
  return (
    <Stage cam={{ ...c, y: c.y + shake(t, down, 6) }}>
      <Chart upto={lastK >= 0 ? lastI : CHASE} live={live} glow={(i) => (i === CHASE ? ramp(t, tells, 0.3) * 0.6 : i === lastI && hitting ? 0.6 : 0)} o={(i) => (i === CHASE || i > CHASE ? 1 : 1 - 0.4 * ramp(t, tells, 0.3))} />
      <Axis ticks={[14, 7, 0, -7, -14, -21, -28]} />
      {/* sell orders slamming into the bar that is printing */}
      {hitting &&
        [0, 1, 2].map((k) => {
          const p = (((t * 3 + k / 3) % 1) + 1) % 1;
          const yy = py(live ? (live.c as number) : b.c);
          return <Pellet key={k} x={lerp(bx(lastI) + 200, bx(lastI) + 8, p)} y={yy + (k - 1) * 8} color={C.down} r={9} o={1 - p * 0.3} />;
        })}
      <Tag x={bx(lastI) + 18} y={py(live ? (live.c as number) : b.c) + 8} text="主动卖" color={C.down} size={34} o={clamp01((t - sell) / 0.2) * (1 - ramp(t, tells, 0.2))} />
      {/* 付多少钱: the red bar from its open (10.04) to your entry (10.11) = what the hurried buyers paid up */}
      <div style={{ position: "absolute", left: x - 26, top: py(b.c), width: 12, height: (py(b.o) - py(b.c)) * ramp(t, pay, 0.35), borderLeft: `4px solid ${C.up}`, borderTop: `4px solid ${C.up}`, borderBottom: `4px solid ${C.up}`, boxShadow: `0 0 10px ${C.up}`, opacity: ramp(t, pay, 0.15) }} />
      <Tag x={x - 38} y={(py(b.o) + py(b.c)) / 2} text={`多付${b.c - b.o}跳`} color={C.up} align="right" size={36} o={ramp(t, pay + 0.2, 0.25)} />
    </Stage>
  );
};
