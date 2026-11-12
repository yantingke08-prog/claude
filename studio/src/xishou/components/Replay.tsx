// Optional real replays: drop files into public/assets/replay/ and they replace the synthetic
// chart in that slot. No file → synthetic fallback, always labelled 教学示意.
import React from "react";
import { getStaticFiles, OffthreadVideo, staticFile } from "remotion";
import { C } from "../theme";
import { SimTag } from "./Frame";

export type ReplayName = "breakdown" | "absorption-success" | "absorption-failure";

const available = (): Set<string> => {
  try {
    return new Set(getStaticFiles().map((f) => f.name.replace(/\\/g, "/")));
  } catch {
    return new Set();
  }
};

export const hasReplay = (name: ReplayName) => available().has(`assets/replay/${name}.mp4`);

export const ReplaySlot: React.FC<{
  name: ReplayName;
  x: number;
  y: number;
  w: number;
  h: number;
  startFrom?: number;
  synthetic: React.ReactNode; // fallback rendering (chart + its annotations)
  tagCorner?: "left" | "right";
}> = ({ name, x, y, w, h, startFrom = 0, synthetic, tagCorner = "right" }) => {
  const real = hasReplay(name);
  const tagPos: React.CSSProperties = { position: "absolute", top: y + 12, ...(tagCorner === "right" ? { right: 1080 - (x + w) + 14 } : { left: x + 14 }) };
  if (!real)
    return (
      <>
        {synthetic}
        <SimTag style={tagPos} text="SIMULATED" color={C.sub} />
      </>
    );
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden", borderRadius: 14 }}>
        <OffthreadVideo src={staticFile(`assets/replay/${name}.mp4`)} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <SimTag style={tagPos} text="REAL REPLAY · 实盘回放" color={C.cyan} />
    </>
  );
};
