// The one contract between the user's recorded voice-over and the film.
// Files (inside studio/public/sanzhong/audio/):
//   vo.mp3              the real recording (the committed file is a SILENT 133 s placeholder)
//   vo.timestamps.json  written by scripts/sanzhong-align-vo.ps1 (committed empty)
export type Word = { word: string; start: number; end: number }; // seconds
export type Line = {
  text: string;
  start: number; // seconds
  end: number; // seconds
  words?: Word[];
  shot?: string; // optional: overrides the shot of every caption unit starting inside this line
};
export type VoTimestamps = { duration: number; lines: Line[] };

export const VO_AUDIO = "sanzhong/audio/vo.mp3";
