// 那一秒 / 盘口里的三种成交已经分出了胜负 / 只是你还没看见
// Layer 2: the frozen moment opens into that bar's footprint (volume per price: sold into bids | bought from asks).
// Three outlined zones = the three kinds of fills; then the close replays down — the fall you saw.
import React from "react";
import { At, C, MONO, Stage, Tag, cam, camSteps, clamp01, lerp, ramp, useShot, win } from "../kit";
import { CHASE, FOOT, MAIN } from "../data";
import { Chart, Minimap } from "./chart";
import { CHASE_CAM, chaseAt } from "./Hook";

const ROW_H = 50;
const TOP = 500; // y of the highest row (tick 14)
const CX = 540;
const BAR_MAX = 250;
const MAXV = Math.max(...FOOT.flatMap((r) => [r.bid, r.ask]));
export const footY = (tick: number) => TOP + (MAIN[CHASE].h - tick) * ROW_H;
const askL = CX + 80;
const bidR = CX - 80;

/** outline around a block of footprint rows on one side */
const Zone: React.FC<{ side: "ask" | "bid" | "both"; hi: number; lo: number; color: string; o: number }> = ({ side, hi, lo, color, o }) => {
  if (o <= 0) return null;
  const left = side === "ask" ? askL - 8 : bidR - BAR_MAX - 8;
  const right = side === "bid" ? bidR + 8 : askL + BAR_MAX + 8;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: footY(hi) - ROW_H / 2 + 3,
        width: right - left,
        height: (hi - lo + 1) * ROW_H - 6,
        border: `3px solid ${color}`,
        borderRadius: 8,
        boxShadow: `0 0 16px ${color}88`,
        opacity: o,
        transform: "translateZ(30px)",
      }}
    />
  );
};

export const Tape: React.FC = () => {
  const { t, at } = useShot();
  const sec = at("那一秒");
  const three = at("三种成交");
  const decided = at("胜负");
  const unseen = at("没看见");
  const open = sec + 0.15;
  const chartO = 1 - ramp(t, sec, 0.35) * 0.92;
  const red = ramp(t, three, 0.2);
  const blue = ramp(t, three + 0.4, 0.2);
  const amber = ramp(t, three + 0.8, 0.2);
  const zonesOff = 1 - ramp(t, unseen, 0.3);
  const ghost = ramp(t, unseen, 0.4); // what you actually saw: just one candle
  const c = camSteps(t, [
    [0, CHASE_CAM],
    [sec, cam(0, -40, 60, 8, 8)],
    [three, cam(30, -20, 120, 8, -4)],
    [decided, cam(0, 30, 160, 9, -6)],
    [unseen, cam(0, 0, 60, 8, 4)],
  ]);
  const b = MAIN[CHASE];
  const closeY = lerp(footY(11), footY(b.c), ramp(t, decided, 0.5)); // replays the fall from your entry
  return (
    <>
      <Stage cam={c}>
        <At x={0} y={0} z={lerp(0, -400, ramp(t, sec, 0.5))} o={chartO}>
          <Chart upto={CHASE} live={chaseAt(1)} />
        </At>
        {FOOT.map((r, k) => {
          const y = footY(r.tick);
          const p = clamp01((t - open - k * 0.035) / 0.3);
          const wb = (r.bid / MAXV) * BAR_MAX * p;
          const wa = (r.ask / MAXV) * BAR_MAX * p;
          const rowO = p * (1 - ghost * 0.65);
          return (
            <React.Fragment key={r.tick}>
              <div style={{ position: "absolute", left: bidR - wb, top: y - 17, width: wb, height: 34, background: `linear-gradient(270deg, ${C.down}, ${C.downD})`, opacity: rowO * 0.8, borderRadius: 3 }} />
              <div style={{ position: "absolute", left: askL, top: y - 17, width: wa, height: 34, background: `linear-gradient(90deg, ${C.up}, ${C.upD})`, opacity: rowO * 0.8, borderRadius: 3 }} />
              <div style={{ position: "absolute", left: bidR - 8, top: y, transform: "translate(-100%,-50%) translateZ(4px)", fontFamily: MONO, fontSize: 24, color: C.text, opacity: rowO }}>{r.bid}</div>
              <div style={{ position: "absolute", left: askL + 8, top: y, transform: "translateY(-50%) translateZ(4px)", fontFamily: MONO, fontSize: 24, color: C.text, opacity: rowO }}>{r.ask}</div>
              <div style={{ position: "absolute", left: CX, top: y, transform: "translate(-50%,-50%)", fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.dim, opacity: rowO }}>
                {(10 + r.tick * 0.01).toFixed(2)}
              </div>
            </React.Fragment>
          );
        })}
        {/* the last price: starts at your entry, drops to the close on 胜负 */}
        <div style={{ position: "absolute", left: CX - 74, top: closeY - 22, width: 148, height: 44, border: "3px solid #fff", borderRadius: 6, opacity: ramp(t, open + 0.3, 0.2), boxShadow: "0 0 18px rgba(255,255,255,0.5)", transform: "translateZ(32px)" }} />
        {/* three kinds of fills, each outlined where it shows in the numbers */}
        <Zone side="ask" hi={11} lo={5} color={C.up} o={red * zonesOff} />
        <Zone side="both" hi={14} lo={12} color={C.passive} o={blue * zonesOff} />
        <Zone side="bid" hi={3} lo={1} color={C.forced} o={amber * zonesOff} />
        <Tag x={askL + BAR_MAX + 22} y={footY(8)} text="主动买" color={C.up} size={36} o={red * zonesOff} />
        <Tag x={askL + BAR_MAX + 22} y={footY(13)} text="被动接" color={C.passive} size={36} o={blue * zonesOff} />
        <Tag x={bidR - BAR_MAX - 22} y={footY(2)} text="被迫卖" color={C.forced} size={36} align="right" o={amber * zonesOff} />
        {/* the candle you saw, laid over the footprint */}
        <div style={{ position: "absolute", left: CX - 16, top: footY(b.h), width: 32, height: footY(b.l) - footY(b.h), opacity: ghost * 0.9, transform: "translateZ(40px)" }}>
          <div style={{ position: "absolute", left: 14, top: 0, width: 4, height: "100%", background: C.down }} />
          <div style={{ position: "absolute", left: 0, top: (b.h - b.o) * ROW_H, width: 32, height: (b.o - b.c) * ROW_H, background: `linear-gradient(90deg, ${C.down}, ${C.downD})`, borderRadius: 3 }} />
        </div>
        <Tag x={CX} y={footY(b.h) - 44} align="center" text="你看到的只是这根K线" color={C.text} size={32} o={ramp(t, unseen + 0.3, 0.25)} />
      </Stage>
      <Minimap upto={CHASE} mark={CHASE} o={ramp(t, sec, 0.3)} />
    </>
  );
};

