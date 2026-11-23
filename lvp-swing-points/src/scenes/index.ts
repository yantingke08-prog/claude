import type React from "react";
import type { ShotId } from "../script.ts";
import { Advanced } from "./Advanced";
import { Broll1, Broll2, Broll3, Ticker } from "./Broll";
import { Case } from "./Case";
import { Concept } from "./Concept";
import { Define } from "./Define";
import { Hook } from "./Hook";
import { Outro } from "./Outro";
import { Title } from "./Title";

export type SceneProps = { broll?: Record<string, boolean> };
export const SCENES: Record<ShotId, React.FC<SceneProps>> = {
  hook: Hook,
  title: Title,
  concept: Concept,
  define: Define,
  case: Case,
  advanced: Advanced,
  broll1: Broll1,
  broll2: Broll2,
  broll3: Broll3,
  ticker: Ticker,
  outro: Outro,
};
