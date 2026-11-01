import { useContext } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { scene, SCRIPT, type SceneId } from "../timeline.ts";
import { Captions } from "./Captions";
import { accentOf, ChapterCard, CleanContext } from "./Chrome";

/**
 * Every scene = its own visuals + the chapter card (if any) + burned-in captions.
 * Content clears out just as the crossfade begins, so a scene's last big graphic never
 * collides with the next chapter's title.
 */
export const SceneShell: React.FC<{ id: SceneId; children: React.ReactNode }> = ({ id, children }) => {
  const frame = useCurrentFrame();
  const clean = useContext(CleanContext);
  const s = scene(id);
  const accent = accentOf(id);
  const isLast = SCRIPT.scenes[SCRIPT.scenes.length - 1].id === id;
  const exitAt = s.frames - SCRIPT.transition;
  const out = isLast ? 1 : interpolate(frame, [exitAt - 10, exitAt + 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: out }}>{children}</AbsoluteFill>
      {!clean && s.chapter && <ChapterCard chapter={s.chapter} accent={accent} />}
      {!clean && <Captions captions={s.captions} accent={accent === "#e9f1ff" ? "#f2c46d" : accent} />}
    </AbsoluteFill>
  );
};
