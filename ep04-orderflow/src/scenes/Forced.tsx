// 最容易让行情突然加速的，往往是第三批人：止损和被迫平仓。
// 关键位一破，止损单被触发，原本观望的人也被迫成交。窄行情可能一下加速。很多人以为主力发力了，其实有时候，只是同一方向的单子被连续逼了出来。
import React from "react";
import { Box, C, Candle, HLine, Pellet, Stage, Tag, cam, camPath, clamp01, lerp, ramp, rampIO, rnd, useShot, win } from "../kit";

const SUP = 860; // key level (support) y
const RES = 770;
const STOPS = [0, 1, 2, 3, 4].map((k) => 905 + k * 46); // stop-sell orders just under the key level
const STOP_X = 830;
const cx = (k: number) => 110 + k * 62;
const RANGE = Array.from({ length: 10 }, (_, k) => {
  const o = lerp(RES + 20, SUP - 20, rnd(k * 2));
  const c = lerp(RES + 20, SUP - 20, rnd(k * 2 + 1));
  return { o, c, h: Math.min(o, c) - 12 - rnd(k + 40) * 12, l: Math.max(o, c) + 12 + rnd(k + 50) * 10 };
});

export const Forced: React.FC = () => {
  const { t, at, end, dur } = useShot();
  const third = at("第三批人");
  const stops = at("止损和被迫平仓");
  const brk = at("关键位一破");
  const trig = at("止损单被触发");
  const forced = end("被迫成交");
  const accel = at("一下加速");
  const boss = at("主力发力了");
  const chain = at("逼了出来");
  // each stop fires in turn between trigger and the end of 被迫成交
  const fireAt = (k: number) => lerp(trig, Math.max(trig + 1, forced), k / (STOPS.length - 1));
  const fired = STOPS.map((_, k) => ramp(t, fireAt(k), 0.25));
  const breakP = rampIO(t, brk, 0.7);
  const cascade = fired.reduce((s, x) => s + x, 0) / STOPS.length;
  const close = lerp(lerp(SUP - 30, SUP + 30, breakP), STOPS[4] + 30, cascade);
  const plunge = rampIO(t, accel, 0.7); // the narrow range suddenly speeds up
  const bigClose = lerp(close, 1250, plunge);
  const shake = t > accel && t < accel + 0.6 ? Math.sin(t * 60) * 6 * (1 - (t - accel) / 0.6) : 0;
  const c = camPath(t, [
    [0, cam(-80, -40, 60, 10, -10)],
    [brk, cam(80, 40, 260, 9, -12)],
    [accel, cam(60, 120, 140, 8, -6)],
    [boss, cam(40, 160, 120, 8, -4)],
    [dur, cam(80, 120, 200, 8, -8)],
  ]);
  const breaker = cx(RANGE.length);
  return (
    <Stage cam={{ ...c, x: c.x + shake }}>
      {RANGE.map((r, k) => (
        <Candle key={k} cx={cx(k)} open={r.o} close={r.c} high={r.h} low={r.l} w={40} o={0.85} />
      ))}
      {/* narrow range + key level */}
      <HLine x={70} y={SUP} w={760} color={C.text} o={0.55 + 0.45 * win(t, brk, brk + 0.8)} thick={3} />
      <HLine x={70} y={RES} w={660} color={C.faint} thick={2} />
      <Candle cx={breaker} open={SUP - 30} close={close} high={SUP - 40} low={close + 8} w={48} glow={cascade} />
      <Candle cx={breaker + 66} open={close} close={bigClose} high={close - 6} low={bigClose + 10} w={52} glow={plunge} o={plunge > 0 ? 1 : 0} />
      {STOPS.map((y, k) => {
        const f = fired[k];
        return (
          <React.Fragment key={k}>
            {f < 1 && (
              <Box x={STOP_X} y={y - 17} w={170} h={34} color={C.forced} dark={C.forcedD} dashed o={ramp(t, third, 0.4) * (1 - f)} />
            )}
            {f > 0 && <Box x={STOP_X} y={y - 17} w={170} h={34} color={C.forced} dark={C.forcedD} glow={1} o={clamp01(f) * (1 - 0.6 * ramp(t, fireAt(k) + 0.8, 0.5))} />}
            <Pellet x={lerp(STOP_X, breaker + 30, clamp01((t - fireAt(k)) / 0.45))} y={y} color={C.forced} o={win(t, fireAt(k), fireAt(k) + 0.45, 0.08)} />
          </React.Fragment>
        );
      })}
      <Tag x={STOP_X + 85} y={STOPS[0] - 46} text="止损单" color={C.forced} align="center" o={win(t, stops, brk)} />
      <Tag x={STOP_X + 85} y={STOPS[0] - 46} text="被迫成交" color={C.forced} align="center" o={win(t, trig, boss)} />
      <Tag x={breaker + 66 + 42} y={bigClose} text="主力?" color={C.down} o={win(t, boss, chain)} />
      <Tag x={breaker + 66 + 42} y={bigClose} text="连续被迫" color={C.forced} o={ramp(t, chain, 0.3)} />
    </Stage>
  );
};
