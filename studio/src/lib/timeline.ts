import timeline from "../timeline.json";

// Single source of truth shared with scripts/soundtrack.py, so picture and sound stay in sync.
export const TL = timeline;
export type SceneName = keyof typeof timeline.scenes;
export const SCENE_ORDER: SceneName[] = ["intro", "globe", "wave", "outro"];

export const sceneStart = (name: SceneName): number => {
  let t = 0;
  for (const s of SCENE_ORDER) {
    if (s === name) return t;
    t += TL.scenes[s] - TL.transition;
  }
  throw new Error(`Unknown scene ${name}`);
};

export const TOTAL_FRAMES =
  SCENE_ORDER.reduce((sum, s) => sum + TL.scenes[s], 0) - TL.transition * (SCENE_ORDER.length - 1);
