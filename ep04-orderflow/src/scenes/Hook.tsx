// 你刚追进去 / 价格立马掉头 / 不是你运气差
// Layer 1: the main bar appears, rises (you chase), turns and falls — then REWINDS to the moment you chased.
// The next shot (那一秒) opens that frozen moment and replays the fall.
import React from "react";
import { C, HLine, Stage, Tag, aim, camSteps, clamp01, lerp, ramp, rampIO, shake, useShot, RewindFx } from "../kit";
import { CHASE, MAIN } from "../data";
import { Axis, Chart, bx, py } from "./chart";

export const ENTRY = 11; // tick where you chased in (10.11)

/**
 * The chase bar as a function of a time cursor τ (τ runs forward, and backward while rewinding):
 * τ 0→1: rises from the open to your entry · τ 1→2: pokes to the high, then falls to the close.
 */
export const chaseAt = (tau: number) => {
  const b = MAIN[CHASE];
  if (tau <= 1) {
    const c = lerp(b.o, ENTRY, clamp01(tau));
    return { o: b.o, h: Math.max(b.o, c), l: b.o, c, v: b.v };
  }
  const f = clamp01(tau - 1);
  const poke = ENTRY + (b.h - ENTRY) * clamp01(f * 3);
  const c = f < 0.33 ? poke : lerp(b.h, b.c, (f - 0.33) / 0.67);
  return { o: b.o, h: Math.max(ENTRY, poke), l: Math.min(b.o, c, f >= 1 ? b.l : c), c, v: b.v };
};

export const CHASE_CAM = aim(bx(CHASE) - 60, py(8), 1.6, 6, -6);
export const REWIND = 0.8; // seconds a rewind takes

export const Hook: React.FC = () => {
  const { t, at } = useShot();
  const chase = at("追进去");
  const turn = at("掉头");
  const luck = at("运气差");
  const appear = ramp(t, 0, 0.4);
  const rw = rampIO(t, luck, REWIND);
  const tau = rampIO(t, chase - 0.2, 0.6) + rampIO(t, turn, 0.7) - rw; // back to τ = 1: the second you chased
  const live = chaseAt(tau);
  const c = camSteps(t, [
    [0, aim(bx(CHASE) - 160, py(6), 1.25, 6, -4)],
    [chase - 0.3, CHASE_CAM],
    [turn, aim(bx(CHASE) - 40, py(6), 1.45, 7, -3)],
    [luck, aim(bx(CHASE) - 60, py(9), 1.75, 6, -6)],
  ]);
  const x = bx(CHASE);
  const rewinding = t > luck && t < luck + REWIND;
  return (
    <>
      <Stage cam={{ ...c, x: c.x + shake(t, turn + 0.15, 9) }} drift={Math.sin(t * 0.5) * 0.8}>
        <Chart upto={CHASE} live={live} glow={(i) => (i === CHASE ? 0.7 : 0)} o={(i) => (i === CHASE ? appear : 0.75 - 0.35 * ramp(t, luck, 0.3))} />
        <Axis ticks={[14, 7, 0, -7, -14, -21, -28]} />
        {/* your entry: a red price line right against the bar, from the moment you chase */}
        <HLine x={x - 52} y={py(ENTRY)} w={44} color={C.up} o={ramp(t, chase + 0.3, 0.2)} />
        <Tag x={x - 64} y={py(ENTRY)} text="你追进" color={C.up} align="right" o={ramp(t, chase + 0.3, 0.2)} />
        {/* where it went after you got in; hidden once time runs back */}
        <Tag x={x + 18} y={py(MAIN[CHASE].c)} text="掉头" color={C.down} o={ramp(t, turn + 0.5, 0.2) * (1 - ramp(t, luck, 0.2))} />
      </Stage>
      <RewindFx o={rewinding ? Math.min(1, (t - luck) / 0.12, (luck + REWIND - t) / 0.12) : 0} t={t} />
    </>
  );
};
