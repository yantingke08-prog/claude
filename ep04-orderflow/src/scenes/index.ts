// shot id (src/script.json / vo.timestamps.json line.shot) → scene component
import type React from "react";
import { Hook } from "./Hook";
import { Tape } from "./Tape";
import { Who } from "./Who";
import { Three } from "./Three";
import { Tug } from "./Tug";
import { Aggr } from "./Aggr";
import { Absorb } from "./Absorb";
import { AbsorbK } from "./AbsorbK";
import { Broll } from "./Broll";
import { Forced } from "./Forced";
import { Sum } from "./Sum";
import { Accept } from "./Accept";
import { Print } from "./Print";
import { Next } from "./Next";

export const SCENES: Record<string, React.FC> = {
  "hook": Hook,
  "tape": Tape,
  "who": Who,
  "three": Three,
  "tug": Tug,
  "aggr": Aggr,
  "absorb": Absorb,
  "absorb-k": AbsorbK,
  "broll-desk": Broll,
  "forced": Forced,
  "sum": Sum,
  "accept": Accept,
  "print": Print,
  "next": Next,
};
