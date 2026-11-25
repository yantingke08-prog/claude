import type React from "react";
import type { ShotId } from "../script";
import { Aggr, Passive, Tape, Three } from "./BookScenes";
import { Absorb, Accept, Cascade, Forced, Hook, Who } from "./ChartScenes";
import { Next, Poll, Print, Sum, Tug } from "./OtherScenes";
import type { SceneProps } from "./parts";

export const SCENES: Record<ShotId, React.FC<SceneProps>> = {
  hook: Hook,
  tape: Tape,
  who: Who,
  three: Three,
  tug: Tug,
  aggr: Aggr,
  passive: Passive,
  absorb: Absorb,
  poll: Poll,
  forced: Forced,
  cascade: Cascade,
  sum: Sum,
  accept: Accept,
  print: Print,
  next: Next,
};
