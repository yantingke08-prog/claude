// 把这几股力量放一起看：追价的人决定谁着急，挂单的人决定谁有耐心，被迫成交的人决定行情会不会突然加速。
import React from "react";
import { Stage, cam, camPath, lerp, ramp, rampIO, useShot, win } from "../kit";
import { Pillars } from "./parts";

export const Sum: React.FC = () => {
  const { t, at, dur } = useShot();
  const together = rampIO(t, at("放一起看"), 1.0);
  const a = at("谁着急");
  const b = at("谁有耐心");
  const c3 = at("突然加速");
  const c = camPath(t, [
    [0, cam(0, -200, -260, 14, -18)],
    [dur, cam(0, -40, 120, 8, 12)],
  ]);
  return (
    <Stage cam={c}>
      <Pillars
        p={[lerp(0.5, 1, together), lerp(0.5, 1, together), lerp(0.5, 1, together)]}
        spread={lerp(1.15, 1, together)}
        glow={[win(t, a, b), win(t, b, c3), win(t, c3, dur + 1)]}
        tags={[
          { text: "着急", o: ramp(t, a, 0.3) },
          { text: "耐心", o: ramp(t, b, 0.3) },
          { text: "加速", o: ramp(t, c3, 0.3) },
        ]}
      />
    </Stage>
  );
};
