import script from "./script.json";
import { getSim } from "./sim.ts";
import { fill } from "./text.ts";

export const SCRIPT = script;
export type SceneId = (typeof script.scenes)[number]["id"];
export type Scene = (typeof script.scenes)[number];

export const scene = (id: SceneId): Scene => script.scenes.find((s) => s.id === id)!;

/** Absolute start frame of a scene, accounting for transition overlaps (same maths as score.py). */
export const sceneStart = (id: SceneId) => {
  let t = 0;
  for (const s of script.scenes) {
    if (s.id === id) return t;
    t += s.frames - script.transition;
  }
  throw new Error(`Unknown scene ${id}`);
};

export const TOTAL_FRAMES =
  script.scenes.reduce((sum, s) => sum + s.frames, 0) - script.transition * (script.scenes.length - 1);

/** Caption / UI text with {stat} placeholders filled from the simulation. */
export const t = (text: string) => fill(text, getSim().stats);

/** Frame of the first cue of `type` at or after `after` in a scene. */
export const cue = (id: SceneId, type: string, after = 0) => {
  const c = scene(id).cues.find((c) => c.type === type && ("at" in c ? c.at! : c.from!) >= after);
  if (!c) throw new Error(`No ${type} cue in ${id} after ${after}`);
  return "at" in c ? c.at! : c.from!;
};
