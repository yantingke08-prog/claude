// 成交很大 / 价格却不走［短暂停顿］/ 往往就是有人主动打 / 有人在稳稳接
// Back to layer 1: the bar where it happened — biggest volume in the area, body goes nowhere.
import React from "react";
import { C, HLine, MONO, Pellet, Stage, Tag, aim, camSteps, lerp, ramp, rampIO, useShot } from "../kit";
import { ABSORB, MAIN } from "../data";
import { Axis, Chart, GEO, bx, py } from "./chart";

export const AbsorbK: React.FC = () => {
  const { t, at } = useShot();
  const big = at("成交很大");
  const flat = at("价格却不走");
  const hit = at("有人主动打");
  const steady = at("稳稳接");
  const b = MAIN[ABSORB];
  const vol = rampIO(t, big, 0.6);
  // the bar forms: wiggles both ways but closes where it opened
  const wig = Math.sin(t * 5) * (1 - ramp(t, flat, 0.4)) * 1.5;
  const live = { o: b.o, h: b.h, l: b.l, c: b.c + wig };
  const x = bx(ABSORB);
  const vh = (b.v / GEO.maxV) * GEO.volH;
  const c = camSteps(t, [
    [0, aim(540, 930, 1, 6, -2)],
    [Math.min(big, 0.9), aim(x - 40, 1000, 1.12, 6, -4)],
    [big, aim(x - 20, 1010, 1.2, 6, -6)],
    [flat, aim(x - 50, 975, 1.3, 6, -6)],
    [hit, aim(x - 30, 975, 1.38, 6, -8)],
    [steady, aim(x - 20, 980, 1.34, 6, -4)],
  ]);
  const pel = (k: number, buy: boolean) => {
    const p = (((t * 2.6 + k / 3 + (buy ? 0 : 0.5)) % 1) + 1) % 1;
    const y = py(buy ? b.h - 0.5 : b.l + 0.5);
    return <Pellet key={`${buy}${k}`} x={buy ? lerp(x - 160, x - 8, p) : lerp(x + 160, x + 8, p)} y={y + (k - 1) * 4} color={buy ? C.up : C.down} r={8} o={1 - p * 0.3} />;
  };
  const both = t > hit;
  return (
    <Stage cam={c}>
      <Chart upto={ABSORB} live={live} o={(i) => (i === ABSORB ? 1 : 0.55)} volBoost={(i) => (i === ABSORB ? vol : 1)} glow={(i) => (i === ABSORB ? ramp(t, big, 0.3) * 0.7 : 0)} />
      <Axis ticks={[14, 7, 0, -7, -14, -21, -28]} />
      {/* volume number on the bar's own volume column */}
      <div style={{ position: "absolute", left: x, top: GEO.volBase - vh * vol - 26, transform: "translateX(-50%) translateZ(10px)", fontFamily: MONO, fontSize: 30, fontWeight: 800, color: C.text, opacity: ramp(t, big + 0.3, 0.2), whiteSpace: "nowrap" }}>
        3900手
      </div>
      {/* the price stayed where it was: a flat line from the bars before */}
      <HLine x={bx(ABSORB - 6)} y={py(b.c)} w={bx(ABSORB) - bx(ABSORB - 6) + 20} color="#fff" thick={3} o={ramp(t, flat, 0.3) * 0.9} />
      <Tag x={bx(ABSORB - 3)} y={py(b.h + 3)} text="价不动" color={C.text} align="center" size={34} o={ramp(t, flat + 0.2, 0.25)} />
      {both && [0, 1, 2].map((k) => pel(k, true))}
      {both && [0, 1, 2].map((k) => pel(k, false))}
      {/* resting orders on both edges of the bar */}
      <HLine x={x - 26} y={py(b.h) - 6} w={52} color={C.passive} thick={8} o={ramp(t, steady, 0.25)} />
      <HLine x={x - 26} y={py(b.l) + 6} w={52} color={C.passive} thick={8} o={ramp(t, steady, 0.25)} />
      <Tag x={x + 34} y={py(b.h) - 6} text="稳稳接" color={C.passive} size={34} o={ramp(t, steady + 0.1, 0.25)} />
    </Stage>
  );
};
