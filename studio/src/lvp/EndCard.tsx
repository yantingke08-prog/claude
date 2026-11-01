import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CameraRig, Glow, Stage } from "../components/Stage";
import { BRAND, FINAL_CAM } from "./brand";
import { Backdrop, Lockup } from "./Lockup";
import { GoldEnvironment, GoldSymbol } from "./GoldSymbol";

/** The settled end frame every version resolves to; also a still for thumbnails and channel art. */
export const LvpEndCard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
      <Stage background={BRAND.black} bloom={0.55} bloomThreshold={0.55} fov={FINAL_CAM.fov} chroma={0}>
        <CameraRig position={[0, 0, FINAL_CAM.z]} />
        <GoldEnvironment rotation={0.3 + frame * 0.004} />
        <Glow position={[0, 1, -6]} scale={16} color={BRAND.navy} intensity={0.55} />
        <GoldSymbol rotY={Math.sin(frame / 40) * 0.05} />
      </Stage>
      <Backdrop />
      <Lockup at={-200} />
    </AbsoluteFill>
  );
};
