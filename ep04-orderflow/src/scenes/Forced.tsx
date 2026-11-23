// 最容易让行情突然加速的 / 往往是第三批人 / 止损和被迫平仓 / 关键位一破 / 止损单被触发 / 原本观望的人也被迫成交 /
// 窄行情可能一下加速 / 很多人以为主力发力了 / 其实有时候 / 只是同一方向的单子被连续逼了出来
// Layer 1: the narrow range, the stop clusters under its key level, the break and the cascade.
import React from "react";
import { C, HLine, Pellet, Stage, Tag, aim, camSteps, clamp01, lerp, ramp, rampIO, shake, useShot, win } from "../kit";
import { BREAK, MAIN, PLUNGE, SUPPORT } from "../data";
import { Axis, Chart, FocusBox, bx, py } from "./chart";

// stop orders resting under the key level (ticks), fired in this order
const STOPS = [-7, -9, -11, -13, -15, -17];
const SX = bx(61) - 4; // they rest under the range, below the key level
const SW = bx(71) - bx(61) + 8;

export const Forced: React.FC = () => {
  const { t, at } = useShot();
  const speed = at("突然加速");
  const third = at("第三批人");
  const stops = at("被迫平仓");
  const brk = at("一破");
  const trig = at("被触发");
  const bystand = at("观望的人");
  const alsoForced = at("也被迫成交");
  const accel = at("一下加速");
  const boss = at("主力发力");
  const really = at("其实有时候");
  const chain = at("逼了出来");
  const same = at("同一方向");

  // bar 73 forms on 一破, bar 74 on 一下加速
  const b73 = MAIN[BREAK];
  const b74 = MAIN[PLUNGE];
  const p73 = rampIO(t, brk - 0.15, 0.5);
  const p74 = rampIO(t, accel - 0.1, 0.6);
  const live73 = { o: b73.o, h: b73.h, c: lerp(b73.o, b73.c, p73), l: Math.min(b73.o, lerp(b73.o, b73.l, p73)) };
  const live74 = { o: b74.o, h: b74.h, c: lerp(b74.o, b74.c, p74), l: lerp(b74.o, b74.l, p74) };
  const upto = t < brk - 0.15 ? BREAK - 1 : t < accel - 0.1 ? BREAK : PLUNGE;
  const live = upto === BREAK ? live73 : upto === PLUNGE ? live74 : undefined;
  // first two stops fire on 被触发, the rest on 观望的人 → 一下加速
  const fireAt = (k: number) => (k < 2 ? trig + k * 0.25 : lerp(bystand, accel + 0.3, (k - 2) / (STOPS.length - 3)));
  const replay = (k: number) => win(t, chain + k * 0.12, chain + k * 0.12 + 0.5, 0.1);

  const c = camSteps(t, [
    [0, aim(540, 930, 1, 6, -2)],
    [speed, aim(bx(66), py(-5), 1.6, 6, -6)],
    [third, aim(bx(67), py(-10), 1.5, 7, -8)],
    [brk, aim(bx(69), py(-8), 1.7, 6, -8)],
    [trig, aim(bx(69), py(-11), 1.6, 7, -10)],
    [accel, aim(bx(69), py(-15), 1.35, 7, -8)],
    [really, aim(bx(60), py(-8), 1.05, 6, -4)],
    [same, aim(bx(67), py(-12), 1.35, 7, -8)],
    [chain, aim(bx(68), py(-12), 1.5, 7, -10)],
  ]);
  return (
    <Stage cam={{ ...c, y: c.y + shake(t, brk + 0.2, 8) + shake(t, accel + 0.2, 14, 0.6) }}>
      <Chart upto={upto} live={live} o={(i) => (i >= 59 ? 1 : 0.5 - 0.25 * win(t, speed, third + 0.2))} glow={(i) => (i === PLUNGE ? p74 * 0.8 : i === BREAK ? p73 * 0.5 : 0)} />
      <Axis ticks={[14, 7, 0, -7, -14, -21, -28]} />
      <FocusBox x={bx(58)} y={py(0)} w={bx(72) - bx(58) + 14} h={py(-8) - py(0)} o={win(t, speed, third + 0.2) * 0.85} />
      {/* key level */}
      <HLine x={bx(55)} y={py(SUPPORT)} w={bx(BREAK) - bx(55) + 160} color={C.text} thick={3} o={0.6 + 0.4 * win(t, brk, brk + 0.6, 0.1)} />
      {STOPS.map((tick, k) => {
        const f = ramp(t, fireAt(k), 0.18);
        const flown = clamp01((t - fireAt(k)) / 0.35);
        const y = py(tick);
        return (
          <React.Fragment key={k}>
            <div style={{ position: "absolute", left: SX, top: y - 11, width: SW, height: 22, border: `3px dashed ${C.forced}`, borderRadius: 4, opacity: ramp(t, third + k * 0.08, 0.25) * (1 - f) * (0.6 + 0.4 * win(t, stops, brk)) }} />
            <div style={{ position: "absolute", left: SX, top: y - 11, width: SW, height: 22, background: `linear-gradient(90deg, ${C.forced}, ${C.forcedD})`, borderRadius: 4, opacity: f * (0.35 + 0.65 * Math.max(1 - flown, replay(k))), boxShadow: `0 0 ${10 + 26 * Math.max(1 - flown, replay(k))}px ${C.forced}` }} />
            <Pellet x={lerp(SX + SW, bx(upto) + 6, flown)} y={y} color={C.forced} r={10} o={win(t, fireAt(k), fireAt(k) + 0.35, 0.06)} />
          </React.Fragment>
        );
      })}
      <Tag x={SX - 14} y={py(STOPS[1])} text="止损单" color={C.forced} align="right" size={36} o={win(t, stops, alsoForced)} />
      <Tag x={SX - 14} y={py(STOPS[1])} text="被迫成交" color={C.forced} align="right" size={36} o={win(t, alsoForced, chain)} />
      <Tag x={SX - 14} y={py(STOPS[1])} text="连续被迫" color={C.forced} align="right" size={36} o={ramp(t, chain, 0.25)} />
      <Tag x={bx(PLUNGE) - 18} y={py(b74.l) + 10} text="主力?" color={C.down} align="right" size={36} o={win(t, boss, really + 0.5)} />
    </Stage>
  );
};
