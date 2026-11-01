import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig, Glow, Stage } from "../components/Stage";
import { BRAND, FINAL_CAM, mix, ramp } from "./brand";
import { Backdrop, Lockup } from "./Lockup";
import { GoldEnvironment, GoldSymbol, revealLevel } from "./GoldSymbol";
import { FootprintWall } from "./FootprintWall";

/**
 * V2「足迹」: we fly low along walls of footprint candles made of glass price cells while
 * imbalances flash gold inside them. Pulling back square, the front wall trims itself to the
 * mark's silhouette - every cell inside it lit - and the gold mark is cast over the cells.
 */
export const T2 = {
  build: [0, 78] as const,
  fly: [0, 74] as const,
  camera: [70, 116] as const,
  morph: [74, 114] as const,
  backFade: [72, 100] as const,
  reveal: [112, 142] as const,
  lockup: 132,
};

const lerp3 = (a: number[], b: number[], t: number) => a.map((v, i) => mix(v, b[i], t)) as [number, number, number];

export const LvpV2Footprint: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const build = ramp(frame, ...T2.build, "power1.inOut");
  const fly = ramp(frame, ...T2.fly, "sine.inOut");
  const k = ramp(frame, ...T2.camera, "power3.inOut");
  const morph = ramp(frame, ...T2.morph, "none");
  const reveal = ramp(frame, ...T2.reveal, "power2.inOut");
  const level = reveal > 0 ? revealLevel(reveal) : -10;
  const heat = ramp(frame, T2.reveal[0], T2.reveal[0] + 6) * (1 - ramp(frame, T2.reveal[0] + 6, 170, "power2.out")) * 1.3;

  // Low tracking shot along the wall, catching the depth of the walls behind; then square up.
  const flyPos = lerp3([-6.6, -0.9, 1.7], [-1.2, 0.5, 2.9], fly);
  const flyTarget = lerp3([-3.6, 0.1, -0.6], [1.9, 0.6, -0.8], fly);
  const camPos = lerp3(flyPos, [0, 0, FINAL_CAM.z], k);
  const camTarget = lerp3(flyTarget, [0, 0, 0], k);

  const flash = ramp(frame, T2.reveal[1] - 10, T2.reveal[1] - 4) * (1 - ramp(frame, T2.reveal[1] - 4, T2.reveal[1] + 16, "power2.out"));
  const bloom = mix(1.0, 0.6, ramp(frame, T2.reveal[0], T2.reveal[1])) + flash * 0.9;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      <Stage background={BRAND.black} bloom={bloom} bloomThreshold={0.32} fov={FINAL_CAM.fov} chroma={0}>
        <CameraRig position={camPos} target={camTarget} roll={mix(-0.06, 0, k)} />
        <GoldEnvironment rotation={0.4 + t * 0.15} />
        <Glow position={[0, 1, -8]} scale={22} color={BRAND.navy} intensity={0.6} />
        <FootprintWall build={build} time={t} morph={morph} backFade={ramp(frame, ...T2.backFade, "power2.in")} level={level} />
        <GoldSymbol reveal={reveal} heat={heat} rotY={Math.sin(t * 0.9) * 0.03 * ramp(frame, 146, 175)} />
      </Stage>
      <Backdrop opacity={ramp(frame, 124, 156, "power2.out")} spin={frame * 0.03} />
      <Lockup at={T2.lockup} />
    </AbsoluteFill>
  );
};
