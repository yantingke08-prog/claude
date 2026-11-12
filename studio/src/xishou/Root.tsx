import React from "react";
import { Composition, Folder, Sequence } from "remotion";
import { CHAPTERS, TOTAL_FRAMES } from "./script";
import { FPS, H, W } from "./theme";
import { defaultXishouProps, XishouLVP, type XishouProps } from "./XishouLVP";

// One chapter of the film on its own timeline (same code path as the master, offset in time).
const ChapterOnly: React.FC<XishouProps & { start: number }> = ({ start, ...p }) => (
  <Sequence from={-start}>
    <XishouLVP {...p} />
  </Sequence>
);

export const XishouRoot: React.FC = () => (
  <>
    <Composition id="XishouLVP" component={XishouLVP} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} defaultProps={defaultXishouProps} />
    <Folder name="XishouLVP-chapters">
      {CHAPTERS.map((ch) => (
        <Composition
          key={ch.id}
          id={`XishouLVP-${ch.id}`}
          component={ChapterOnly}
          durationInFrames={ch.dur}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{ ...defaultXishouProps, start: ch.start }}
        />
      ))}
    </Folder>
  </>
);
