import { useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig, Stage } from "../../components/Stage";
import { World } from "../three/World";

/**
 * Behind the 2D beats (titles, formula cards, checklists) we stay in the same landscape
 * the 3D chapters live in: a slow, low drift towards the horizon light, so the film never
 * drops into a void between chapters.
 */
export const Ambient: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <Stage bloom={0.9} bloomThreshold={0.25} fov={40}>
      <CameraRig position={[Math.sin(t * 0.03) * 6, 2.2 + Math.sin(t * 0.05) * 0.3, 18 - t * 0.05]} target={[Math.sin(t * 0.03) * 4, 3.2, -60]} fov={40} />
      <World groundY={-1} sun={[0.15, -1]} time={t} intensity={0.9} />
    </Stage>
  );
};
