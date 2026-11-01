import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, Glow, Stage } from "../components/Stage";
import { BRAND, FINAL_CAM, mix, ramp } from "./brand";
import { Backdrop, Lockup } from "./Lockup";
import { GoldEnvironment, GoldSymbol, revealLevel } from "./GoldSymbol";
import { FlowParticles } from "./FlowParticles";
import { TradeBubbles } from "./TradeBubbles";
import { MARKET } from "./market";

/**
 * V1「看见」: at first there is only price - a single line, the result. Then the orders behind
 * it come into view: resting liquidity spreads out from the line, big trades print as bubbles.
 * Everything that was seen flows home into the mark: liquidity becomes its body and dot mesh,
 * the line becomes its contour, every bubble becomes a bead.
 */
export const T1 = {
  head: [4, 86] as const, // price head crosses the session
  see: [10, 92] as const, // liquidity is revealed outward from the line
  converge: [88, 134] as const,
  camera: [80, 134] as const,
  reveal: [116, 146] as const, // gold sweeps up through the mark
  lockup: 136,
};

/** Faint chart furniture: price levels and time ticks, gone once the mark forms. */
const ChartGrid: React.FC<{ opacity: number }> = ({ opacity }) => {
  const { geometry, material } = useMemo(() => {
    const pts: number[] = [];
    for (let y = -3; y <= 3.001; y += 0.5) pts.push(MARKET.X0, y, -0.2, MARKET.X1, y, -0.2);
    for (let x = -7.5; x <= 7.5; x += 1.5) pts.push(x, -3.2, -0.2, x, 3.2, -0.2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const material = new THREE.LineBasicMaterial({ color: BRAND.gold, transparent: true, depthWrite: false });
    return { geometry, material };
  }, []);
  material.opacity = opacity * 0.09;
  return <lineSegments geometry={geometry} material={material} />;
};

export const LvpV1Seeing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const headX = mix(MARKET.X0 + 0.1, 5.0, ramp(frame, ...T1.head, "power1.inOut"));
  const headY = MARKET.priceAt(headX);
  const see = mix(0, 3.6, ramp(frame, ...T1.see, "power1.in"));
  const converge = ramp(frame, ...T1.converge, "none");
  const reveal = ramp(frame, ...T1.reveal, "power2.inOut");
  const level = reveal > 0 ? revealLevel(reveal) : -10;
  const heat = ramp(frame, T1.reveal[0], T1.reveal[0] + 6) * (1 - ramp(frame, T1.reveal[0] + 6, 170, "power2.out")) * 1.3;
  const market = 1 - ramp(frame, T1.converge[0], T1.converge[0] + 30, "power2.in");

  // Camera rides beside the price head, a little ahead and to its left, looking across the
  // session so the heatmap recedes into depth; then it pulls back square to the end card.
  const k = ramp(frame, ...T1.camera, "power3.inOut");
  const fx = Math.min(headX, 4.2) - 0.4;
  let fy = 0;
  for (let d = -1; d <= 1.001; d += 0.25) fy += MARKET.priceAt(fx + d) / 9; // smoothed, so the camera never jitters with price
  const camPos: [number, number, number] = [mix(fx - 2.9, 0, k), mix(fy - 0.7, 0, k), mix(4.3, FINAL_CAM.z, k)];
  const camTarget: [number, number, number] = [mix(fx + 0.9, 0, k), mix(fy, 0, k), 0];

  const flash = ramp(frame, T1.reveal[1] - 10, T1.reveal[1] - 4) * (1 - ramp(frame, T1.reveal[1] - 4, T1.reveal[1] + 16, "power2.out"));
  const bloom = mix(1.05, 0.6, ramp(frame, T1.converge[1] - 10, T1.converge[1] + 10)) + flash * 0.9;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      <Stage background={BRAND.black} bloom={bloom} bloomThreshold={0.3} fov={FINAL_CAM.fov} chroma={0}>
        <CameraRig position={camPos} target={camTarget} roll={mix(0.07, 0, k)} />
        <GoldEnvironment rotation={0.3 + t * 0.12} />
        <Glow position={[0, 1, -6]} scale={16} color={BRAND.navy} intensity={0.55 * ramp(frame, 90, 140)} />
        <ChartGrid opacity={ramp(frame, 0, 20) * market} />
        <Glow position={[headX, headY, 0.05]} scale={1.3} color={BRAND.softGold} intensity={0.9 * ramp(frame, 0, 8) * market} />
        <FlowParticles progress={converge} time={t} headX={headX} see={see} level={level} />
        <TradeBubbles headX={headX} converge={converge} time={t} />
        <GoldSymbol reveal={reveal} heat={heat} beads={false} rotY={Math.sin(t * 0.9) * 0.03 * ramp(frame, 146, 175)} />
      </Stage>
      <Backdrop opacity={ramp(frame, 128, 160, "power2.out")} spin={frame * 0.03} />
      <Lockup at={T1.lockup} />
    </AbsoluteFill>
  );
};
