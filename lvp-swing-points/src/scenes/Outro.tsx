// The last line: dark + the brand lockup (flat solid red). The film then fades to black.
import React from "react";
import { AbsoluteFill } from "remotion";
import { BrandLockup, pop, useTime } from "../kit";
import { N } from "../theme.ts";

export const Outro: React.FC = () => {
  const { t, cue } = useTime();
  const p = pop(t, cue("outIam") - 0.2);
  return (
    <AbsoluteFill style={{ background: N.void, alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: p.opacity, transform: `scale(${p.scale}) translateY(-50px)` }}>
        <BrandLockup size={120} />
      </div>
    </AbsoluteFill>
  );
};
