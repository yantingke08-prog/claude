import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig, Glow, Stage, Starfield } from "../components/Stage";
import { ParticleMorph } from "../components/ParticleMorph";
import { C, Impact, scramble } from "../components/Hud";
import { useSampledPoints, type Draw } from "../lib/points";
import { DISPLAY, MONO, zh } from "../lib/fonts";
import { ease, useGsap } from "../lib/gsap";
import { TL } from "../lib/timeline";
import { COPY } from "../copy";

const HIT = TL.cues.intro.hit[0];
const LOGO_FONT = `800 140px "${DISPLAY.fontFamily}"`;

/** The brand mark: a ring with a play glyph and an orbiting satellite, plus the wordmark. */
export const drawLogo: Draw = (ctx, w, h) => {
  ctx.font = LOGO_FONT;
  ctx.textBaseline = "middle";
  const text = "MOTION LAB";
  const tw = ctx.measureText(text).width;
  const mark = 280;
  const gap = 70;
  const x0 = (w - (mark + gap + tw)) / 2;
  const cx = x0 + mark / 2;
  const cy = h / 2;
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, Math.PI * 0.12, Math.PI * 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + Math.cos(-Math.PI * 0.2) * 120, cy + Math.sin(-Math.PI * 0.2) * 120, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy - 62);
  ctx.lineTo(cx - 38, cy + 62);
  ctx.lineTo(cx + 68, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillText(text, x0 + mark + gap, cy + 6);
};

export const IntroLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const targets = useSampledPoints("logo", [LOGO_FONT], drawLogo, 60000, { worldWidth: 12, seed: 3 });

  const progress = interpolate(frame, [12, HIT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease("power1.in"),
  });
  const camIn = ease("expo.out")(Math.min(1, frame / 175));
  const camZ = interpolate(camIn, [0, 1], [22, 12.6]) - Math.max(0, frame - 175) * 0.006;
  const camY = interpolate(camIn, [0, 1], [4.5, 0]);

  const ui = useGsap(
    () => ({
      chars: COPY.introSub.split("").map(() => ({ o: 0, y: 40, b: 14 })),
      line: 0,
      tag: 0,
    }),
    (tl, s) => {
      const at = (f: number) => f / fps;
      tl.fromTo(s.chars, { o: 0, y: 40, b: 14 }, { o: 1, y: 0, b: 0, duration: 0.7, ease: "expo.out", stagger: 0.05 }, at(HIT + 10));
      tl.fromTo(s, { line: 0 }, { line: 1, duration: 1.1, ease: "expo.inOut" }, at(HIT + 4));
      tl.fromTo(s, { tag: 0 }, { tag: 1, duration: 1.0, ease: "none" }, at(TL.cues.intro.shimmer[0] + 10));
    },
  );

  // Logo brightness surges at the moment of impact, then settles.
  const surge = interpolate(frame - HIT, [-6, 0, 30], [1, 1.9, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {targets && (
        <Stage bloom={1.25 * surge} bloomThreshold={0.1}>
          <CameraRig position={[Math.sin(t * 0.4) * 0.6, camY, camZ]} roll={interpolate(camIn, [0, 1], [0.12, 0])} />
          <Starfield time={t} rotation={t * 0.01} />
          <Glow position={[0, 0, -25]} scale={70} color="#2a1aff" intensity={0.28} />
          <Glow position={[6, -3, -26]} scale={50} color="#ff2fb4" intensity={0.12} />
          <ParticleMorph targets={targets} progress={progress} time={t} size={1.9} opacity={surge} />
        </Stage>
      )}
      <Impact at={HIT} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "50%", marginTop: 175, display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 160 * ui.line, height: 1, background: `linear-gradient(90deg, transparent, ${C.cyan})` }} />
          <div style={{ display: "flex", ...zh(300), fontSize: 38, letterSpacing: 14, color: C.text }}>
            {COPY.introSub.split("").map((ch, i) => (
              <span
                key={i}
                style={{
                  opacity: ui.chars[i].o,
                  transform: `translateY(${ui.chars[i].y}px)`,
                  filter: `blur(${ui.chars[i].b}px)`,
                  textShadow: `0 0 18px ${C.cyan}88`,
                }}
              >
                {ch}
              </span>
            ))}
          </div>
          <div style={{ width: 160 * ui.line, height: 1, background: `linear-gradient(270deg, transparent, ${C.cyan})` }} />
        </div>
        <div
          style={{
            position: "absolute",
            top: "50%",
            marginTop: 250,
            fontFamily: MONO.fontFamily,
            fontSize: 18,
            letterSpacing: 10,
            color: C.cyan,
            opacity: ui.tag > 0 ? 0.85 : 0,
            whiteSpace: "pre",
          }}
        >
          {scramble(COPY.introTag, ui.tag, frame)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
