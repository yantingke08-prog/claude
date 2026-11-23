// 下一期 / 我们看为什么百分之七十的成交 / 都挤在同一个区间
// The same chart's own volume profile; its 70 % value area computed from the bars.
import React from "react";
import { C, Stage, Tag, aim, camSteps, ramp, rampIO, useShot } from "../kit";
import { MAIN, volumeProfile } from "../data";
import { Chart, GEO, py } from "./chart";

const VP = volumeProfile();
const MAXV = Math.max(...VP.m.values());
const RIGHT = 1010;

export const Next: React.FC = () => {
  const { t, at } = useShot();
  const nxt = at("下一期");
  const why = at("为什么");
  const pct = at("百分之七十");
  const band = at("挤在");
  const grow = rampIO(t, nxt, 0.8);
  const hl = ramp(t, pct, 0.3);
  const glow = ramp(t, band, 0.3);
  const inVA = (tick: number) => tick >= VP.lo && tick <= VP.hi;
  const c = camSteps(t, [
    [0, aim(540, 920, 1, 6, 0)],
    [nxt, aim(600, 900, 1.08, 6, -6)],
    [why, aim(560, 900, 1.02, 6, -3)],
    [pct, aim(600, py((VP.lo + VP.hi) / 2), 1.25, 6, -6)],
    [band, aim(600, py((VP.lo + VP.hi) / 2), 1.12, 6, -3)],
  ]);
  const top = py(VP.hi) - GEO.k / 2;
  const h = (VP.hi - VP.lo + 1) * GEO.k;
  return (
    <Stage cam={c}>
      <Chart upto={MAIN.length - 1} o={() => 1 - 0.55 * grow} vol={0.5} />
      {/* value area band across the whole chart */}
      <div style={{ position: "absolute", left: GEO.x0 - 20, top, width: RIGHT - GEO.x0 + 20, height: h, background: `${C.passive}1c`, borderTop: `2px solid ${C.passive}`, borderBottom: `2px solid ${C.passive}`, opacity: hl, boxShadow: `0 0 ${30 * glow}px ${C.passive}55`, transform: "translateZ(-4px)" }} />
      {/* horizontal volume per price, growing in from the right edge */}
      {VP.ticks.map((tick) => {
        const w = ((VP.m.get(tick) ?? 0) / MAXV) * 300 * grow;
        const lit = inVA(tick);
        return (
          <div
            key={tick}
            style={{
              position: "absolute",
              left: RIGHT - w,
              top: py(tick) - GEO.k / 2 + 1,
              width: w,
              height: GEO.k - 3,
              background: lit && hl > 0 ? `linear-gradient(270deg, ${C.passive}, ${C.passiveD})` : "linear-gradient(270deg, #7c8aa8, #39445c)",
              opacity: lit ? 0.9 : 0.9 - 0.5 * hl,
              boxShadow: lit && glow > 0 ? `0 0 ${12 * glow}px ${C.passive}` : undefined,
              transform: "translateZ(8px)",
            }}
          />
        );
      })}
      <Tag x={240} y={top - 30} text="70%" color={C.passive} size={52} o={hl} />
    </Stage>
  );
};
