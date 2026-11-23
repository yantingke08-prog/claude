// 那一秒 / 盘口里的三种成交已经分出了胜负 / 只是你还没看见
// Layer 2: the chase bar opened up into its footprint (volume per price: sold into bids × bought from asks).
import React from "react";
import { At, C, MONO, Stage, Tag, cam, camSteps, clamp01, lerp, ramp, useShot, win } from "../kit";
import { CHASE, FOOT, MAIN } from "../data";
import { Chart, Minimap } from "./chart";
import { CHASE_CAM } from "./Hook";

const ROW_H = 50;
const TOP = 500; // y of the highest row (tick 14)
const CX = 540;
const MAXV = Math.max(...FOOT.flatMap((r) => [r.bid, r.ask]));
export const footY = (tick: number) => TOP + (MAIN[CHASE].h - tick) * ROW_H;

export const Footprint: React.FC<{ t: number; open: number; dim?: number; closeAt?: number; glowRows?: (tick: number) => [number, number] }> = ({
  t,
  open,
  dim = 0,
  closeAt,
  glowRows,
}) => (
  <>
    {FOOT.map((r, k) => {
      const y = footY(r.tick);
      const p = clamp01((t - open - k * 0.035) / 0.3); // rows unfold top → bottom
      const [gb, ga] = glowRows?.(r.tick) ?? [0, 0];
      const wb = (r.bid / MAXV) * 260 * p;
      const wa = (r.ask / MAXV) * 260 * p;
      const rowO = p * (1 - dim * 0.65);
      return (
        <React.Fragment key={r.tick}>
          <div style={{ position: "absolute", left: CX - 80 - wb, top: y - 17, width: wb, height: 34, background: `linear-gradient(270deg, ${C.down}, ${C.downD})`, opacity: rowO * (0.55 + 0.45 * gb), boxShadow: gb ? `0 0 ${20 * gb}px ${C.down}` : undefined, borderRadius: 3 }} />
          <div style={{ position: "absolute", left: CX + 80, top: y - 17, width: wa, height: 34, background: `linear-gradient(90deg, ${C.up}, ${C.upD})`, opacity: rowO * (0.55 + 0.45 * ga), boxShadow: ga ? `0 0 ${20 * ga}px ${C.up}` : undefined, borderRadius: 3 }} />
          <div style={{ position: "absolute", left: CX - 88, top: y, transform: "translate(-100%,-50%) translateZ(4px)", fontFamily: MONO, fontSize: 26, color: C.text, opacity: rowO }}>{r.bid}</div>
          <div style={{ position: "absolute", left: CX + 88, top: y, transform: "translateY(-50%) translateZ(4px)", fontFamily: MONO, fontSize: 26, color: C.text, opacity: rowO }}>{r.ask}</div>
          <div style={{ position: "absolute", left: CX, top: y, transform: "translate(-50%,-50%)", fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.dim, opacity: rowO }}>
            {(10 + r.tick * 0.01).toFixed(2)}
          </div>
        </React.Fragment>
      );
    })}
    {closeAt !== undefined && (
      <div style={{ position: "absolute", left: CX - 74, top: lerp(footY(MAIN[CHASE].h), footY(MAIN[CHASE].c), ramp(t, closeAt, 0.5)) - 22, width: 148, height: 44, border: "3px solid #fff", borderRadius: 6, opacity: ramp(t, closeAt - 0.1, 0.15), boxShadow: "0 0 18px rgba(255,255,255,0.5)" }} />
    )}
  </>
);

export const Tape: React.FC = () => {
  const { t, at } = useShot();
  const sec = at("那一秒");
  const three = at("三种成交");
  const decided = at("胜负");
  const unseen = at("没看见");
  const open = sec + 0.15;
  const chartO = 1 - ramp(t, sec, 0.35) * 0.9;
  // three kinds of fills, one after another
  const red = ramp(t, three, 0.2);
  const blue = ramp(t, three + 0.35, 0.2);
  const amber = ramp(t, three + 0.7, 0.2);
  const ghost = ramp(t, unseen, 0.4); // what you actually saw: just one candle
  const c = camSteps(t, [
    [0, CHASE_CAM],
    [sec, cam(0, -40, 60, 8, 10)],
    [three, cam(40, -20, 140, 8, -6)],
    [decided, cam(0, 60, 180, 9, -8)],
    [unseen, cam(0, 0, 60, 8, 4)],
  ]);
  const b = MAIN[CHASE];
  return (
    <>
      <Stage cam={c}>
        <At x={0} y={0} z={lerp(0, -400, ramp(t, sec, 0.5))} o={chartO}>
          <Chart upto={CHASE} />
        </At>
        <Footprint
          t={t}
          open={open}
          dim={ghost}
          closeAt={decided}
          glowRows={(tick) => [tick <= 3 ? amber : tick >= 12 ? blue * 0.6 : 0, tick >= 5 && tick <= 11 ? red : tick >= 12 ? blue : 0]}
        />
        <Tag x={CX + 80 + 280} y={footY(8)} text="主动" color={C.up} o={win(t, three, unseen + 0.4)} />
        <Tag x={CX + 80 + 280} y={footY(13)} text="被动" color={C.passive} o={win(t, three + 0.35, unseen + 0.4)} />
        <Tag x={CX - 80 - 280} y={footY(2)} text="被迫" color={C.forced} align="right" o={win(t, three + 0.7, unseen + 0.4)} />
        {/* the candle you saw, laid over the footprint */}
        <div style={{ position: "absolute", left: CX - 16, top: footY(b.h), width: 32, height: footY(b.l) - footY(b.h), opacity: ghost * 0.9, transform: "translateZ(40px)" }}>
          <div style={{ position: "absolute", left: 14, top: 0, width: 4, height: "100%", background: C.down }} />
          <div style={{ position: "absolute", left: 0, top: (b.h - b.o) * ROW_H, width: 32, height: (b.o - b.c) * ROW_H, background: `linear-gradient(90deg, ${C.down}, ${C.downD})`, borderRadius: 3 }} />
        </div>
      </Stage>
      <Minimap upto={CHASE} mark={CHASE} o={ramp(t, sec, 0.3)} />
    </>
  );
};
