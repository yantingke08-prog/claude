import React from "react";
import { prog } from "./anim";
import { useFilm } from "./ctx";
import { HI } from "./script";
import { C, FONT, L, W, toneColor } from "./theme";
import { captionWindows, layoutCaption, normalise } from "./timeline";

const SPOKEN = /[^\s，。；？！：、"“”‘’'「」『』《》（）()［］[\]…—\-·,.;?!:]/;

/** One caption unit at a time (≤2 lines), keyword colours, each character brightens when it is spoken. */
export const Captions: React.FC = () => {
  const { t, tl } = useFilm();
  const wins = React.useMemo(() => captionWindows(tl), [tl]);
  const w = wins.find((x) => t >= x.from && t < x.to);
  if (!w) return null;
  const u = w.unit;
  const { lines, size } = layoutCaption(u.display);
  // keyword ranges in display text
  const tone: (string | null)[] = Array.from(u.display).map(() => null);
  for (const [p, tn] of HI) {
    const k = u.display.indexOf(p);
    if (k >= 0) for (let j = k; j < k + Array.from(p).length; j++) tone[j] = toneColor(tn);
  }
  const inP = prog(t, w.from, 0.18);
  let ci = 0; // display char index
  let si = 0; // spoken char index
  return (
    <div style={{ position: "absolute", left: L.left, right: W - L.right, top: L.captionTop, height: L.captionBottom - L.captionTop, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        data-qa="caption"
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.25,
          textAlign: "center",
          whiteSpace: "nowrap",
          textShadow: "0 3px 10px rgba(0,0,0,0.85)",
          opacity: inP,
          transform: `translateY(${(1 - inP) * 8}px)`,
        }}
      >
        {lines.map((line, li) => (
          <div key={li}>
            {Array.from(line).map((ch) => {
              const my = ci++;
              let said = true;
              if (SPOKEN.test(ch) && normalise(ch).length) {
                const wd = u.words[si++];
                said = !wd || t >= wd.start;
              }
              return (
                <span key={my} style={{ color: tone[my] ?? C.text, opacity: said ? 1 : 0.5 }}>
                  {ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
