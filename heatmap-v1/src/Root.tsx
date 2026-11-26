import { Composition } from "remotion";
import { DURATION, FPS, HEIGHT, WIDTH } from "./config.ts";
import { Film } from "./Film.tsx";

export const Root: React.FC = () => (
  <>
    <Composition
      id="HeatmapWalls"
      component={Film}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ lite: false }}
    />
  </>
);
