// 下一期，我们看为什么百分之七十的成交，都挤在同一个区间。
import React from "react";
import { Box, C, Stage, Tag, cam, camPath, lerp, ramp, useShot } from "../kit";

const ROWS = 18;
const TOP = 420;
const RH = 46;
// volume per price row: a lumpy bell; rows 6..12 hold ~70 %
const VOL = Array.from({ length: ROWS }, (_, k) => Math.exp(-Math.pow((k - 9) / 3.6, 2)) * (0.8 + 0.2 * Math.abs(Math.sin(k * 2.3))));
const VA = [6, 12];

export const Next: React.FC = () => {
  const { t, at, dur } = useShot();
  const nxt = at("下一期");
  const pct = at("百分之七十");
  const band = at("同一个区间");
  const grow = ramp(t, nxt, 1.2);
  const hl = ramp(t, pct, 0.4);
  const glow = ramp(t, band, 0.4);
  const c = camPath(t, [
    [0, cam(0, -40, -120, 10, 16)],
    [dur, cam(0, -40, 120, 8, -10)],
  ]);
  const bandTop = TOP + VA[0] * RH - 10;
  const bandH = (VA[1] - VA[0] + 1) * RH + 4;
  return (
    <Stage cam={c}>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: bandTop,
          width: 820,
          height: bandH,
          background: `${C.passive}1f`,
          border: `2px solid ${C.passive}`,
          borderRadius: 6,
          opacity: hl,
          boxShadow: `0 0 ${20 + 40 * glow}px ${C.passive}66`,
        }}
      />
      {VOL.map((v, k) => {
        const inVA = k >= VA[0] && k <= VA[1];
        return (
          <Box
            key={k}
            x={160}
            y={TOP + k * RH}
            w={v * 580 * grow}
            h={RH - 14}
            d={18}
            color={inVA && hl > 0 ? C.passive : "#5a6a88"}
            dark={inVA && hl > 0 ? C.passiveD : "#2b3447"}
            glow={inVA ? glow * 0.6 : 0}
            o={inVA ? 1 : lerp(1, 0.4, hl)}
          />
        );
      })}
      <Tag x={940 - 16} y={bandTop + bandH / 2} text="70%" color={C.passive} align="right" size={64} o={hl} />
    </Stage>
  );
};
