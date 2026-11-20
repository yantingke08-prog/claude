// 但还有最后一步［短暂停顿］新价格出来以后，市场得接受它。
// 往上冲，成交能延续，回踩有人接，新价格才站得住；冲上去没人跟，马上收回来，就是市场不认可。
import React from "react";
import { At, Box, C, HLine, Stage, Tag, cam, camPath, clamp01, lerp, ramp, rampIO, useShot, win } from "../kit";

const LEVEL = 640;

/** polyline drawn progressively: p in 0..1 of the points */
const Path: React.FC<{ pts: [number, number][]; p: number; color: string; o?: number }> = ({ pts, p, color, o = 1 }) => {
  if (p <= 0.001) return null; // a zero-length round-capped polyline would leave a dot
  const n = pts.length - 1;
  const upto = clamp01(p) * n;
  const k = Math.floor(upto);
  const shown = pts.slice(0, k + 1);
  if (k < n) {
    const f = upto - k;
    shown.push([lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f)]);
  }
  return (
    <svg width={1080} height={1400} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: o }}>
      <polyline points={shown.map((q) => q.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
    </svg>
  );
};

const INTRO: [number, number][] = [
  [80, 1150], [180, 1060], [260, 1100], [360, 960], [430, 990], [520, 820], [600, 860], [680, 700],
];
// left panel: breaks out, retests the level, holds
const HOLD: [number, number][] = [
  [70, 900], [150, 820], [220, 700], [290, 560], [350, 520], [400, 600], [430, 634], [470, 560], [510, 470],
];
// right panel: spikes above, nobody follows, falls straight back
const FAIL: [number, number][] = [
  [570, 900], [650, 820], [720, 700], [790, 560], [830, 520], [870, 640], [920, 780], [990, 860],
];

export const Accept: React.FC = () => {
  const { t, at, end, dur } = useShot();
  const last = at("最后一步");
  const accept = at("接受它");
  const go = at("往上冲");
  const retest = at("回踩有人接");
  const stand = at("站得住");
  const noFollow = at("冲上去没人跟");
  const back = at("马上收回来");
  const reject = at("不认可");
  const intro = rampIO(t, 0, Math.max(0.8, last + 0.6));
  const split = ramp(t, go - 0.2, 0.5);
  const hold = rampIO(t, go, Math.max(1, end("站得住") - go));
  const fail = clamp01(rampIO(t, noFollow, Math.max(0.6, back - noFollow + 0.2)) * 0.62 + rampIO(t, back, 0.8) * 0.38);
  const c = camPath(t, [
    [0, cam(0, -20, 60, 8, 0)],
    [go, cam(0, -20, 60, 8, 0)],
    [go + 0.8, cam(-220, -60, 260, 8, 10)],
    [noFollow, cam(-220, -60, 260, 8, 10)],
    [noFollow + 0.8, cam(230, -60, 260, 8, -10)],
    [reject + 0.6, cam(230, -60, 260, 8, -10)],
    [dur, cam(0, -40, 40, 8, 0)],
  ]);
  return (
    <Stage cam={c}>
      <HLine x={60} y={LEVEL} w={960} color={C.text} dashed o={ramp(t, last, 0.4) * (0.6 + 0.4 * win(t, accept, go))} />
      <Tag x={60} y={LEVEL - 32} text="新价格" color={C.text} o={win(t, last + 0.2, go)} />
      <Path pts={INTRO} p={intro} color={C.up} o={1 - split * 0.8} />
      <At x={0} y={0} o={split}>
        <Path pts={HOLD} p={hold} color={C.up} />
        {/* the resting bids that catch the retest */}
        <Box x={380} y={LEVEL + 8} w={110} h={30} color={C.passive} dark={C.passiveD} glow={win(t, retest, stand + 1)} o={ramp(t, retest - 0.3, 0.3)} />
        <Tag x={526} y={HOLD[8][1]} text="站得住" color={C.up} o={win(t, stand, noFollow + 0.4)} />
        <Path pts={FAIL.slice(0, 5)} p={fail / 0.5} color={C.up} />
        {fail > 0.5 && <Path pts={FAIL.slice(4)} p={(fail - 0.5) / 0.5} color={C.down} />}
        <Tag x={1006} y={FAIL[7][1] + 44} text="不认可" color={C.down} align="right" o={ramp(t, reject, 0.3)} z={4} />
      </At>
    </Stage>
  );
};
