import { interpolate } from "remotion";
import { ease } from "../lib/gsap";

/** L.V.P. 订单流研学社 brand kit (public/SVGLOGO/颜色系统.png). Gold is for emphasis only. */
export const BRAND = {
  black: "#000000",
  navy: "#041A52",
  gold: "#DDAA50",
  softGold: "#FFD064",
  graphite: "#77797D",
  warm: "#EADBB8",
  // Order-flow sides inside the animation (not part of the VI): buyers lean gold, sellers a cool steel.
  sell: "#7F95C4",
  // Footprint sides (process only, never on the mark): aggressive buyers / sellers.
  buy: "#1FC79A",
  sellRed: "#E8414E",
};

export const COPY = {
  belief: "看见订单的人，才看得见市场",
  claim: "用最精致的视频，讲最硬的交易知识",
};

export const VIDEO = { width: 1920, height: 1080, fps: 30, frames: 180 };

/** End-card layout in px. Every version lands its symbol exactly here, so they cut together. */
export const LAYOUT = {
  symbol: { cx: 960, cy: 372, h: 380 },
  wordmark: { top: 600, w: 620 },
  divider: 742,
  primary: 798, // big line: the claim
  secondary: 862, // small line: the belief
};

/** The 3D scenes end on this camera; LAYOUT px map to world units through it. */
export const FINAL_CAM = { z: 12, fov: 35 };
export const PX_PER_UNIT = VIDEO.height / (2 * FINAL_CAM.z * Math.tan(((FINAL_CAM.fov / 2) * Math.PI) / 180));
export const pxToWorld = (x: number, y: number): [number, number] => [
  (x - VIDEO.width / 2) / PX_PER_UNIT,
  (VIDEO.height / 2 - y) / PX_PER_UNIT,
];

/** 0→1 between two frames, clamped, with an optional GSAP ease. */
export const ramp = (frame: number, from: number, to: number, easing = "none") =>
  interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease(easing) });

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
