import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig, Glow, Stage } from "../components/Stage";
import { BRAND, FINAL_CAM, mix, ramp } from "./brand";
import { Backdrop, Lockup } from "./Lockup";
import { GoldEnvironment, GoldSymbol, revealLevel } from "./GoldSymbol";
import { FootprintSession, useGlyphAtlas } from "./FootprintCandles";
import { MiniCandles } from "./MiniCandles";
import { SESSIONS, mainPriceAt } from "./footprint";

/**
 * V2「足迹」: we ride beside a live footprint chart - every candle printing its bid × ask rows,
 * bars and numbers counting up, older sessions stacked deeper in the room. The red and green
 * drain into gold, the tape breaks into thousands of tiny gold candlesticks, and they land as
 * rows of little charts in the shape of the mark before the metal is cast over them.
 */
export const T2 = {
  head: [2, 86] as const,
  gold: [54, 102] as const,
  converge: [80, 122] as const,
  camera: [76, 124] as const,
  backFade: [74, 100] as const,
  reveal: [124, 152] as const,
  lockup: 140,
};

const HEAD_FROM = -3.6; // the open of the session is already printed when we arrive
const HEAD_TO = 6.25;

export const LvpV2Footprint: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const atlas = useGlyphAtlas();

  const headX = mix(HEAD_FROM, HEAD_TO, ramp(frame, ...T2.head, "power1.inOut"));
  const gold = ramp(frame, ...T2.gold, "power1.inOut");
  const converge = ramp(frame, ...T2.converge, "none");
  const reveal = ramp(frame, ...T2.reveal, "power2.inOut");
  const level = reveal > 0 ? revealLevel(reveal) : -10;
  const heat = ramp(frame, T2.reveal[0], T2.reveal[0] + 6) * (1 - ramp(frame, T2.reveal[0] + 6, 172, "power2.out")) * 1.3;
  const back = 1 - ramp(frame, ...T2.backFade, "power2.in");

  // Ride just ahead of the live candle, looking back along the tape: the newest candle sits in
  // focus, the session's history recedes into depth, older sessions stacked behind it.
  // Then pull back square to the end card.
  const k = ramp(frame, ...T2.camera, "power3.inOut");
  const fx = Math.min(headX, 5.6) - 0.2;
  let fy = 0;
  for (let d = -1; d <= 1.001; d += 0.25) fy += mainPriceAt(fx + d) / 9;
  const camPos: [number, number, number] = [mix(fx + 1.25, 0, k), mix(fy - 0.45, 0, k), mix(2.9, FINAL_CAM.z, k)];
  const camTarget: [number, number, number] = [mix(fx - 1.3, 0, k), mix(fy - 0.15, 0, k), 0];
  const focus = mix(Math.hypot(headX - camPos[0], fy - camPos[1], camPos[2]), FINAL_CAM.z, k);
  const dof = mix(0.028, 0, k);

  const flash = ramp(frame, T2.reveal[1] - 10, T2.reveal[1] - 4) * (1 - ramp(frame, T2.reveal[1] - 4, T2.reveal[1] + 16, "power2.out"));
  const bloom = mix(0.75, 0.6, ramp(frame, T2.reveal[0], T2.reveal[1])) + flash * 0.9;
  const base = { headX, gold, focus, dof };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      <Stage background={BRAND.black} bloom={bloom} bloomThreshold={0.55} fov={FINAL_CAM.fov} chroma={0}>
        <CameraRig position={camPos} target={camTarget} roll={mix(-0.05, 0, k)} />
        <GoldEnvironment rotation={0.4 + t * 0.15} />
        <Glow position={[0, 1, -9]} scale={24} color={BRAND.navy} intensity={0.3 + 0.25 * k} />
        {atlas && (
          <>
            <FootprintSession session={SESSIONS.far} atlas={atlas} order={0} frame={{ ...base, converge: 1 - back, z: -5.2, dim: 0.32 * back }} />
            <FootprintSession session={SESSIONS.mid} atlas={atlas} order={1} frame={{ ...base, converge: 1 - back, z: -2.5, dim: 0.55 * back }} />
            <FootprintSession session={SESSIONS.main} atlas={atlas} order={2} frame={{ ...base, converge, z: 0, dim: 1 }} />
          </>
        )}
        <MiniCandles session={SESSIONS.main} converge={converge} gold={gold} time={t} level={level} />
        <GoldSymbol reveal={reveal} heat={heat} rotY={Math.sin(t * 0.9) * 0.03 * ramp(frame, 150, 178)} />
      </Stage>
      <Backdrop opacity={ramp(frame, 128, 160, "power2.out")} spin={frame * 0.03} />
      <Lockup at={T2.lockup} />
    </AbsoluteFill>
  );
};
