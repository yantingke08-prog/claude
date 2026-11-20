// 价格下一跳，就是这几股力量较劲的结果。
import React from "react";
import { C, MONO, Pellet, Stage, Tag, cam, camPath, lerp, ramp, useShot } from "../kit";
import { PILLAR_COL, PILLAR_X, Pillars, pillarTop } from "./parts";

const PRICE_Y = 470;

export const Tug: React.FC = () => {
  const { t, at, dur } = useShot();
  const next = at("下一跳");
  const fight = at("较劲");
  // the next tick wobbles while the forces push, then settles one tick up
  const wob = t > fight ? Math.sin((t - fight) * 9) * Math.max(0, 1 - (t - fight) / 2.2) : 0;
  const settled = ramp(t, fight + 2.0, 0.3);
  const price = (10 + (settled > 0.5 ? 0.01 : 0) + (wob > 0.5 ? 0.01 : wob < -0.5 ? -0.01 : 0)).toFixed(2);
  const c = camPath(t, [
    [0, cam(0, -40, 40, 8, 0)],
    [dur, cam(0, -120, -160, 4, 0)],
  ]);
  return (
    <Stage cam={c}>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: PRICE_Y + wob * 14,
          transform: "translate(-50%,-50%) translateZ(20px)",
          fontFamily: MONO,
          fontWeight: 800,
          fontSize: 110,
          color: "#fff",
          textShadow: "0 0 30px rgba(255,255,255,0.45)",
        }}
      >
        {price}
      </div>
      <Tag x={540} y={PRICE_Y + 86} text="下一跳" color={C.text} align="center" o={ramp(t, next, 0.3)} />
      {PILLAR_X.map((x, k) =>
        [0, 1].map((j) => {
          const p = ((t - fight - k * 0.17 - j * 0.45) % 0.9) / 0.9;
          if (t < fight || p < 0) return null;
          return (
            <Pellet
              key={`${k}${j}`}
              x={lerp(x, 540 + (k - 1) * 60, p)}
              y={lerp(pillarTop(4) - 20, PRICE_Y + 140, p)}
              color={PILLAR_COL[k][0]}
              o={1 - p * 0.4}
            />
          );
        }),
      )}
      <Pillars p={[1, 1, 1]} glow={[0.3, 0.3, 0.3]} spread={lerp(1, 0.86, ramp(t, fight, 1))} />
    </Stage>
  );
};
