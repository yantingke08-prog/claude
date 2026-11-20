// 你刚追进去，价格立马掉头，不是你运气差。
import React from "react";
import { C, Candle, HLine, Stage, Tag, cam, camPath, lerp, ramp, rampIO, useShot } from "../kit";

const Y = (p: number) => 1090 - p * 70;
// history: [open, close, high, low] in price units (deterministic)
export const HOOK_HISTORY: [number, number, number, number][] = [
  [0, 1.1, 1.4, -0.4],
  [1.1, 0.7, 1.5, 0.4],
  [0.7, 1.9, 2.2, 0.5],
  [1.9, 2.6, 2.9, 1.6],
  [2.6, 2.2, 2.9, 1.9],
  [2.2, 3.3, 3.6, 2.0],
  [3.3, 4.1, 4.4, 3.0],
];
export const candleX = (k: number) => 150 + k * 100;

export const HookChart: React.FC<{ t: number; chase: number; turn: number; o?: number }> = ({ t, chase, turn, o = 1 }) => {
  const last = HOOK_HISTORY.length;
  const rise = rampIO(t, chase - 0.9, 1.1); // the push you chase into
  const fall = rampIO(t, turn, 0.9);
  const open = 4.1;
  const peak = lerp(4.3, 7.4, rise);
  const close = lerp(peak, 3.0, fall);
  const high = Math.max(peak, 4.3);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transformStyle: "preserve-3d", opacity: o }}>
      {HOOK_HISTORY.map(([op, cl, hi, lo], k) => (
        <Candle key={k} cx={candleX(k)} open={Y(op)} close={Y(cl)} high={Y(hi)} low={Y(lo)} w={56} o={0.85} />
      ))}
      <Candle cx={candleX(last)} open={Y(open)} close={Y(close)} high={Y(high)} low={Y(3.9)} w={64} glow={0.6} />
    </div>
  );
};

export const Hook: React.FC = () => {
  const { t, at } = useShot();
  const chase = at("追进去");
  const turn = at("掉头");
  const entryY = 1090 - 7.1 * 70;
  const x = candleX(HOOK_HISTORY.length);
  const c = camPath(t, [
    [0, cam(260, -120, 520, 4, -14)],
    [turn, cam(160, -60, 280, 6, -10)],
    [turn + 1.6, cam(60, 0, 80, 8, -6)],
  ]);
  return (
    <Stage cam={c} drift={Math.sin(t * 0.4) * 1.2}>
      <HookChart t={t} chase={chase} turn={turn} />
      {/* your entry: a short red level where you chased in */}
      <HLine x={x - 152} y={entryY} w={110} color={C.up} o={ramp(t, chase, 0.3)} />
      <Tag x={x - 168} y={entryY} text="追进" color={C.up} align="right" o={ramp(t, chase, 0.3)} size={44} />
      <Tag x={x + 46} y={1090 - 3.0 * 70 + 30} text="掉头" color={C.down} o={ramp(t, turn + 0.5, 0.3)} size={44} />
    </Stage>
  );
};
