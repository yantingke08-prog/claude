import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig, Glow, Stage, Starfield } from "../components/Stage";
import { ParticleMorph } from "../components/ParticleMorph";
import { C, Impact, scramble } from "../components/Hud";
import { useSampledPoints, type Draw } from "../lib/points";
import { DISPLAY, MONO, zh } from "../lib/fonts";
import { ease, useGsap } from "../lib/gsap";
import { TL } from "../lib/timeline";
import { COPY } from "../copy";
import { drawLogo } from "./IntroLogo";

const HIT = TL.cues.outro.hit[0];
const BOOM = TL.cues.outro.boom[0];
const WORD_FONT = `800 168px "${DISPLAY.fontFamily}"`;

const drawWords: Draw = (ctx, w, h) => {
  ctx.font = WORD_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MADE WITH", w / 2, h / 2 - 105);
  ctx.fillText("CODE", w / 2, h / 2 + 105);
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const targets = useSampledPoints("outro", [WORD_FONT], drawWords, 60000, { worldWidth: 11, seed: 21 });
  const logoTargets = useSampledPoints("outro-logo", [WORD_FONT], drawLogo, 30000, { worldWidth: 7, seed: 5 });

  const progress = interpolate(frame, [8, HIT], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease("power1.in") });
  const scatter = interpolate(frame, [BOOM, BOOM + 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease("power2.out") });
  const logoIn = interpolate(frame, [BOOM - 4, BOOM + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 22, durationInFrames - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // anticipation: the camera pulls back right before the blast, then gets punched forward
  const camZ = 15 - ease("expo.out")(Math.min(1, frame / HIT)) * 2.2 + interpolate(frame, [BOOM - 20, BOOM, BOOM + 30], [0, 0.8, -1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = frame >= BOOM && frame < BOOM + 14 ? Math.sin(frame * 9.1) * 0.06 * (1 - (frame - BOOM) / 14) : 0;

  const ui = useGsap(
    () => ({ chars: COPY.outroLine.split("").map(() => ({ o: 0, y: 26, b: 10 })), lineOut: 0, credits: 0 }),
    (tl, s) => {
      const at = (f: number) => f / fps;
      tl.fromTo(s.chars, { o: 0, y: 26, b: 10 }, { o: 1, y: 0, b: 0, duration: 0.7, ease: "expo.out", stagger: 0.045 }, at(HIT + 12));
      tl.fromTo(s, { lineOut: 0 }, { lineOut: 1, duration: 0.4, ease: "power2.in" }, at(BOOM - 8));
      tl.fromTo(s, { credits: 0 }, { credits: 1, duration: 0.8, ease: "none" }, at(BOOM + 10));
    },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, opacity: fadeOut }}>
      {targets && logoTargets && (
        <Stage bloom={1.3} bloomThreshold={0.1}>
          <CameraRig position={[shake, shake * 0.6, camZ]} />
          <Starfield time={t} rotation={t * 0.02} />
          <Glow position={[0, 0, -24]} scale={60} color="#3b1bff" intensity={0.3 + scatter * 0.06} />
          <ParticleMorph
            targets={targets}
            progress={progress}
            scatter={scatter}
            time={t}
            start="shell"
            size={1.7}
            seed={17}
            colors={["#3a6bff", "#ff4fd8", "#d9fbff"]}
          />
          {logoIn > 0 && (
            <group position={[0, 0.15, 0]}>
              <ParticleMorph targets={logoTargets} progress={logoIn} time={t} start="shell" size={1.5} seed={23} opacity={logoIn} />
            </group>
          )}
        </Stage>
      )}
      <Impact at={HIT} color={C.magenta} strength={0.8} />
      <Impact at={BOOM} color={C.cyan} strength={1.2} />
      <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: 840,
            display: "flex",
            ...zh(300),
            fontSize: 34,
            letterSpacing: 12,
            color: C.text,
            opacity: 1 - ui.lineOut,
            filter: `blur(${ui.lineOut * 10}px)`,
          }}
        >
          {COPY.outroLine.split("").map((ch, i) => (
            <span key={i} style={{ opacity: ui.chars[i].o, transform: `translateY(${ui.chars[i].y}px)`, filter: `blur(${ui.chars[i].b}px)`, display: "inline-block" }}>
              {ch}
            </span>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            top: 730,
            fontFamily: MONO.fontFamily,
            fontSize: 17,
            letterSpacing: 6,
            color: C.cyan,
            opacity: ui.credits > 0 ? 0.9 : 0,
            whiteSpace: "pre",
          }}
        >
          {scramble(COPY.outroCredits, ui.credits, frame)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
