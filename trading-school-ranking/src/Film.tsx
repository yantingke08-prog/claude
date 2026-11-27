import React, { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { lin, prog, rng } from "./anim.ts";
import { DISCLAIMER } from "./content.ts";
import { loadFonts } from "./fonts.ts";
import { Cards, Concept, Ending, Intro, OfBook, OfPath, OfTrace, Rank, type SceneProps } from "./scenes.tsx";
import { C, FS, HEIGHT, L, M, SANS, WIDTH } from "./theme.ts";
import { buildTimeline, subtitleAt, type SceneSpan, type TimingFile } from "./timeline.ts";

loadFonts();

export type FilmProps = {
  /** public/audio/timing.json 的内容（calculateMetadata 读入），没有则为 null */
  timing: TimingFile | null;
  /** public/audio/voiceover.wav 的时长（秒），没有则为 null */
  audioSeconds: number | null;
};

const SCENE_COMPONENTS: Record<SceneSpan["kind"], React.FC<SceneProps>> = {
  intro: Intro,
  rank: Rank,
  concept: Concept,
  cards: Cards,
  ofTrace: OfTrace,
  ofBook: OfBook,
  ofPath: OfPath,
  ending: Ending,
};

export const Film: React.FC<FilmProps> = ({ timing, audioSeconds }) => {
  const frame = useCurrentFrame();
  const tl = useMemo(() => buildTimeline(timing, audioSeconds), [timing, audioSeconds]);
  const fade = Math.round(M.crossfade * 30);
  const ending = tl.scenes[tl.scenes.length - 1];
  const onWhite = frame >= ending.from + fade / 2;
  const sub = subtitleAt(tl, frame);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Background />
      {tl.scenes.map((sc, i) => {
        if (frame < sc.from || frame >= sc.to + fade) return null;
        const Comp = SCENE_COMPONENTS[sc.kind];
        // 交叉淡化：新页从右侧 +26px 进入，旧页向左退 26px
        const pin = i === 0 ? 1 : prog(frame, sc.from, M.crossfade);
        const pout = i === tl.scenes.length - 1 ? 0 : lin(frame, sc.to, M.crossfade);
        const white = sc.kind === "ending";
        const dx = white ? 0 : (1 - pin) * M.shift - pout * M.shift;
        return (
          <AbsoluteFill key={sc.id} style={{ opacity: pin * (1 - pout), transform: `translateX(${dx}px)` }}>
            <Comp span={sc} f={frame - sc.from} />
          </AbsoluteFill>
        );
      })}
      <Disclaimer onWhite={onWhite} />
      {sub && <Subtitle key={sub.id} text={sub.text} startF={sub.startF} frame={frame} onWhite={onWhite} />}
      {audioSeconds ? <Audio src={staticFile("audio/voiceover.wav")} /> : null}
    </AbsoluteFill>
  );
};

/** 右上角常驻免责声明 */
const Disclaimer: React.FC<{ onWhite: boolean }> = ({ onWhite }) => (
  <div style={{ position: "absolute", right: 48, top: 34, fontFamily: SANS, fontSize: FS.disclaimer, color: onWhite ? "#6B7078" : C.white2, opacity: 0.85, letterSpacing: 1 }}>{DISCLAIMER}</div>
);

/** 底部字幕：整句一次出现（4 帧淡入），不逐字抖动 */
const Subtitle: React.FC<{ text: string; startF: number; frame: number; onWhite: boolean }> = ({ text, startF, frame, onWhite }) => {
  const o = Math.min(1, Math.max(0, (frame - startF + 1) / 4));
  return (
    <div style={{ position: "absolute", left: 0, top: L.subtitleY - 30, width: WIDTH, display: "flex", justifyContent: "center", opacity: o }}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: FS.subtitle,
          color: onWhite ? C.ink : C.white,
          textShadow: onWhite ? "none" : "0 2px 8px rgba(0,0,0,0.85)",
          padding: "6px 28px",
          maxWidth: 1600,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** 静态背景：炭灰到深蓝黑渐变 + 极淡网格 + 纸张颗粒 + 行情纹理。不漂移。 */
const TEXTURE = (() => {
  const r = rng(909);
  const pts: string[] = [];
  let v = 0.62;
  for (let i = 0; i <= 120; i++) {
    v += (r() - 0.5) * 0.05 + (0.6 - v) * 0.03;
    pts.push(`${((i / 120) * WIDTH).toFixed(1)},${(v * HEIGHT).toFixed(1)}`);
  }
  return pts.join(" ");
})();

const Background: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #0E1013 0%, ${C.bg} 45%, ${C.bgDeep} 100%)` }} />
    <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <pattern id="grid" width={60} height={60} patternUnits="userSpaceOnUse">
          <path d="M60 0 L0 0 0 60" fill="none" stroke="#F4F2EC" strokeWidth={1} opacity={0.035} />
        </pattern>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0" />
        </filter>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />
      <polyline points={TEXTURE} fill="none" stroke="#F4F2EC" strokeWidth={2} opacity={0.035} />
      <rect width={WIDTH} height={HEIGHT} filter="url(#grain)" opacity={0.05} />
    </svg>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.45) 100%)" }} />
  </AbsoluteFill>
);
