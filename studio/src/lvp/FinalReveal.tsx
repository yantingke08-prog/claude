import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { BRAND, LAYOUT, PX_PER_UNIT, VIDEO, ramp } from "./brand";
import { Backdrop, Lockup } from "./Lockup";
import { revealLevel } from "./GoldSymbol";
import { SYMBOL_CENTER, SYMBOL_PX_SCALE } from "./logo";

/**
 * The one ending every version shares, frame for frame: whatever carried the mark in (particles,
 * mini candles, scanlines) hands off to a light sweep that reveals the brand's black-gold glass
 * render (public/SVGLOGO/img.svg), then the lockup and copy. Only the build-up differs.
 */
export const ENDING = {
  reveal: [124, 152] as const, // the sweep climbs the mark; carriers must have landed by 124
  backdrop: [118, 150] as const,
  lockup: 132, // copy is fully in by ~168, leaving a held end frame
  sheen: [150, 178] as const,
};

// public/lvp/logo-glass.png is img.svg's embedded render cropped to its alpha box plus margin.
// Its alpha box matches the SVG symbol box at a uniform 1.0254×, so in SVG units it spans:
const IMG_SVG = { x: -54.8, y: -5.8, w: 1109.5, h: 1012.1 };
const IMG_PX = {
  left: LAYOUT.symbol.cx + (IMG_SVG.x - SYMBOL_CENTER.x) * SYMBOL_PX_SCALE,
  top: LAYOUT.symbol.cy + (IMG_SVG.y - SYMBOL_CENTER.y) * SYMBOL_PX_SCALE,
  width: IMG_SVG.w * SYMBOL_PX_SCALE,
  height: IMG_SVG.h * SYMBOL_PX_SCALE,
};
const SRC = staticFile("lvp/logo-glass.png");

/** Screen y (px) of the sweep for a given reveal - the same line 3D carriers hand off at. */
export const sweepPx = (reveal: number) => VIDEO.height / 2 - revealLevel(reveal) * PX_PER_UNIT;

/** 0→1 reveal of the shared ending at this frame (for carriers that hand off to it). */
export const endingReveal = (frame: number) => ramp(frame, ...ENDING.reveal, "power2.inOut");

export const FinalReveal: React.FC<{ settled?: boolean }> = ({ settled = false }) => {
  const frame = useCurrentFrame();
  const reveal = settled ? 1 : endingReveal(frame);
  const s = sweepPx(reveal) - IMG_PX.top; // sweep, in the image's own px
  const sweeping = reveal > 0 && reveal < 1;
  const heat = settled ? 0 : ramp(frame, ENDING.reveal[0], ENDING.reveal[0] + 6) * (1 - ramp(frame, ENDING.reveal[0] + 6, ENDING.reveal[1] + 14, "power2.out"));
  const flash = settled ? 0 : ramp(frame, ENDING.reveal[1] - 10, ENDING.reveal[1] - 3) * (1 - ramp(frame, ENDING.reveal[1] - 3, ENDING.reveal[1] + 16, "power2.out"));
  const sheen = settled ? 0 : ramp(frame, ...ENDING.sheen, "power2.inOut");
  const img = { position: "absolute" as const, left: 0, top: 0, width: "100%", height: "100%" };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Backdrop opacity={settled ? 1 : ramp(frame, ...ENDING.backdrop, "power2.out")} spin={frame * 0.03} />
      {reveal > 0 && (
        <div style={{ position: "absolute", ...IMG_PX }}>
          {/* the mark itself, revealed from the candle tip upward behind a soft edge */}
          <Img
            src={SRC}
            style={{
              ...img,
              WebkitMaskImage: reveal >= 1 ? undefined : `linear-gradient(to bottom, transparent ${s - 10}px, black ${s + 8}px)`,
              maskImage: reveal >= 1 ? undefined : `linear-gradient(to bottom, transparent ${s - 10}px, black ${s + 8}px)`,
              filter: flash > 0 ? `brightness(${1 + flash * 0.45})` : undefined,
            }}
          />
          {/* fresh casting: the band just behind the sweep runs hot */}
          {heat > 0.002 && (
            <Img
              src={SRC}
              style={{
                ...img,
                mixBlendMode: "screen",
                opacity: heat,
                filter: "brightness(1.9) saturate(1.25)",
                WebkitMaskImage: `linear-gradient(to bottom, transparent ${s - 10}px, black ${s + 10}px, rgba(0,0,0,0.35) ${s + 110}px, transparent ${s + 320}px)`,
                maskImage: `linear-gradient(to bottom, transparent ${s - 10}px, black ${s + 10}px, rgba(0,0,0,0.35) ${s + 110}px, transparent ${s + 320}px)`,
              }}
            />
          )}
          {/* one slow sheen across the glass once it has settled */}
          {sheen > 0 && sheen < 1 && (
            <div
              style={{
                ...img,
                mixBlendMode: "screen",
                background: `linear-gradient(105deg, transparent ${sheen * 160 - 40}%, rgba(255,236,190,0.42) ${sheen * 160 - 28}%, transparent ${sheen * 160 - 16}%)`,
                WebkitMaskImage: `url(${SRC})`,
                maskImage: `url(${SRC})`,
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
              }}
            />
          )}
        </div>
      )}
      {/* the light bar riding the sweep */}
      {sweeping && (
        <div
          style={{
            position: "absolute",
            left: VIDEO.width / 2 - 300,
            width: 600,
            top: sweepPx(reveal) - 2,
            height: 4,
            borderRadius: 2,
            opacity: Math.sin(reveal * Math.PI),
            background: `linear-gradient(90deg, transparent, ${BRAND.softGold} 20%, #FFF6DD 50%, ${BRAND.softGold} 80%, transparent)`,
            boxShadow: `0 0 18px 4px ${BRAND.gold}AA, 0 0 60px 10px ${BRAND.gold}44`,
          }}
        />
      )}
      <Lockup at={settled ? -200 : ENDING.lockup} />
    </AbsoluteFill>
  );
};
