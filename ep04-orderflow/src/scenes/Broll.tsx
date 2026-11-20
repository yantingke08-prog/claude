// 你更容易栽在哪种成交上？追第一笔主动单，还是挂单硬扛？弹幕打"追"或者"扛"。 / 先别急着回答。
import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { C, FONT, Tag, lerp, pop, ramp, rnd, useShot, win } from "../kit";
import { brollSrc } from "../broll";

/** Procedural stand-in for the desk-watch still: trader from behind, three glowing screens. */
const DeskWatch: React.FC<{ t: number }> = ({ t }) => {
  const flick = 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 2.1);
  const line = (seed: number, w: number, h: number) =>
    Array.from({ length: 14 }, (_, k) => `${(k / 13) * w},${h * (0.75 - 0.5 * (k / 13)) + (rnd(seed + k) - 0.5) * h * 0.4}`).join(" ");
  const screen = (x: number, y: number, w: number, h: number, seed: number, rot: number) => (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <rect x={-8} y={-8} width={w + 16} height={h + 16} rx={10} fill="#0a0f1a" />
      <rect width={w} height={h} rx={4} fill="#0d1d33" opacity={flick} />
      {Array.from({ length: 9 }, (_, k) => {
        const up = rnd(seed + k * 3) > 0.45;
        const cy = h * (0.3 + 0.45 * rnd(seed + k));
        const bh = h * (0.08 + 0.15 * rnd(seed + k + 1));
        return <rect key={k} x={12 + k * ((w - 24) / 9)} y={cy} width={(w - 24) / 14} height={bh} fill={up ? C.up : C.down} opacity={0.8} />;
      })}
      <polyline points={line(seed, w, h)} fill="none" stroke={C.passive} strokeWidth={3} opacity={0.7} />
    </g>
  );
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="glow" cx="50%" cy="36%" r="55%">
          <stop offset="0%" stopColor="#1d3f6e" stopOpacity={0.9 * flick} />
          <stop offset="100%" stopColor="#05080f" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b111c" />
          <stop offset="100%" stopColor="#03050a" />
        </linearGradient>
      </defs>
      <rect width={1080} height={1920} fill="#05080f" />
      <rect width={1080} height={1920} fill="url(#glow)" />
      {screen(60, 470, 300, 220, 3, -6)}
      {screen(390, 420, 300, 250, 11, 0)}
      {screen(720, 470, 300, 220, 23, 6)}
      {/* desk */}
      <path d="M0 860 L1080 860 L1080 1340 L0 1340 Z" fill="#070b13" />
      <path d="M0 860 L1080 860" stroke="#22324d" strokeWidth={3} />
      {/* trader from behind: head + shoulders silhouette with rim light */}
      <g transform="translate(540,1000)">
        <path d="M-300 340 C-280 140 -170 70 -70 52 L70 52 C170 70 280 140 300 340 Z" fill="url(#body)" stroke="#3b6aa8" strokeOpacity={0.45 * flick} strokeWidth={4} />
        <ellipse cx={0} cy={-40} rx={92} ry={112} fill="#060a12" stroke="#4a7fc4" strokeOpacity={0.5 * flick} strokeWidth={4} />
      </g>
    </svg>
  );
};

export const Broll: React.FC = () => {
  const { t, at, dur } = useShot();
  const chase = at("追第一笔");
  const hold = at("挂单硬扛");
  const vote = at("弹幕");
  const wait = at("先别急着");
  const src = brollSrc("desk-watch");
  const zoom = lerp(1.0, 1.12, t / Math.max(1, dur));
  const pulse = (a: number) => 1 + 0.08 * Math.max(0, Math.sin((t - a) * 6)) * win(t, a, wait);
  const fade = 1 - ramp(t, wait, 0.6) * 0.75;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 40%" }}>
        {src ? <Img src={src} style={{ width: 1080, height: 1920, objectFit: "cover" }} /> : <DeskWatch t={t} />}
      </AbsoluteFill>
      {/* the two answers, sitting over the screens they refer to */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, fontFamily: FONT }}>
        <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${pop(t, chase) * pulse(vote)})`, transformOrigin: "210px 590px" }}>
          <Tag x={210} y={590} text="追" color={C.up} size={150} align="center" o={ramp(t, chase, 0.2) * fade} />
        </div>
        <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${pop(t, hold) * pulse(vote + 0.1)})`, transformOrigin: "870px 590px" }}>
          <Tag x={870} y={590} text="扛" color={C.passive} size={150} align="center" o={ramp(t, hold, 0.2) * fade} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
