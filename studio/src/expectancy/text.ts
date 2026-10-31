// Caption mini-format shared by the video and the .srt exporter:
//   {key}     -> replaced with a simulation statistic
//   **text**  -> highlighted on screen, plain in subtitles

export const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? `{${k}}`);

export const plain = (text: string) => text.replace(/\*\*/g, "");

/** Splits "a **b** c" into [{text:"a ",hi:false},{text:"b",hi:true},{text:" c",hi:false}]. */
export const segments = (text: string) =>
  text.split("**").map((t, i) => ({ text: t, hi: i % 2 === 1 })).filter((s) => s.text.length > 0);
