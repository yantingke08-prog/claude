import { AbsoluteFill } from "remotion";
import { BRAND } from "./brand";
import { FinalReveal } from "./FinalReveal";

/** The settled end frame every version resolves to; also a still for thumbnails and channel art. */
export const LvpEndCard: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BRAND.black }}>
    <FinalReveal settled />
  </AbsoluteFill>
);
