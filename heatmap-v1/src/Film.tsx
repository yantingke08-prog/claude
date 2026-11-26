import { AbsoluteFill } from "remotion";
import { C } from "./config.ts";
import { loadFonts } from "./fonts.ts";
import { Overlay } from "./Overlay.tsx";
import { World } from "./World.tsx";

loadFonts();

export type FilmProps = { lite?: boolean };

/** 《热图怎么看？挂单墙背后的真相》 — one 3D world (the book) + one HTML layer (text). */
export const Film: React.FC<FilmProps> = ({ lite = false }) => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    <World lite={lite} />
    <Overlay />
  </AbsoluteFill>
);
