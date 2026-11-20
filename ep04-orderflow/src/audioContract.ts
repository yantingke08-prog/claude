// The one contract between the user's voiceover and the film. Everything uses these types.
// Files: public/audio/vo.mp3 (user-supplied) + public/audio/vo.timestamps.json (scripts/align-vo.ps1).
export type Word = { word: string; start: number; end: number }; // seconds
export type Line = {
  text: string;
  start: number; // seconds
  end: number; // seconds
  words?: Word[];
  shot?: string;
};
export type VoTimestamps = { duration: number; lines: Line[] };

export const VO_AUDIO = "audio/vo.mp3";
export const VO_TIMESTAMPS = "audio/vo.timestamps.json";
