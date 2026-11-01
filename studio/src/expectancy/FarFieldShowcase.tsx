import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C } from "../components/Hud";
import { CameraRig, Stage } from "../components/Stage";
import { zh } from "../lib/fonts";
import { appear } from "./components/Charts";
import { LLN_TRADES } from "./sim.ts";
import { SCRIPT } from "./timeline.ts";
import { ExpectationPlane, MeanLine, Trajectories } from "./three/LlnSpace";
import { World, type FarField } from "./three/World";

const FIELDS = SCRIPT.ui.farFields as { id: FarField; name: string; note: string }[];
export const FAR_SHOT = 180;
export const FAR_SHOWCASE_FRAMES = FIELDS.length * FAR_SHOT;

/** The finished chapter-2 data in front, so each far field is judged behind real content. */
const Shot: React.FC<{ far: FarField }> = ({ far }) => {
  const f = useCurrentFrame();
  const k = f / FAR_SHOT;
  // low, slow lateral move looking past the data towards the light
  const pos: [number, number, number] = [-14 + k * 10, 2.6 + k * 1.2, 34 - k * 3];
  const target: [number, number, number] = [14 + k * 4, 6.5, -30];
  return (
    <Stage fov={42} bloom={1.0} bloomThreshold={0.18}>
      <CameraRig position={pos} target={target} fov={42} />
      <World far={far} center={[10, 0, -4]} groundY={-1.4} sun={[0.5, -1]} time={f / 30} />
      <Trajectories n={LLN_TRADES} crowd={1} />
      <ExpectationPlane opacity={0.7} />
      <MeanLine n={LLN_TRADES} opacity={0.9} />
    </Stage>
  );
};

const Caption: React.FC<{ name: string; note: string }> = ({ name, note }) => {
  const f = useCurrentFrame();
  const o = appear(f, 10, 20) * (1 - appear(f, FAR_SHOT - 20, 16));
  return (
    <div style={{ position: "absolute", left: 96, top: 84, opacity: o, transform: `translateY(${(1 - o) * 16}px)` }}>
      <div style={{ ...zh(900), fontSize: 54, color: "#fff", letterSpacing: 3 }}>{name}</div>
      <div style={{ ...zh(400), fontSize: 26, color: C.gold, marginTop: 10, letterSpacing: 1 }}>{note}</div>
    </div>
  );
};

/** Side-by-side audition of the far-field options, same camera move and data for each. */
export const FarFieldShowcase: React.FC = () => (
  <AbsoluteFill style={{ background: "#03040b" }}>
    {FIELDS.map((fld, i) => (
      <Sequence key={fld.id} from={i * FAR_SHOT} durationInFrames={FAR_SHOT}>
        <Shot far={fld.id} />
        <Caption name={fld.name} note={fld.note} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
