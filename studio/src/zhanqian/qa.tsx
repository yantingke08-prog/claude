// Layout probe for scripts/zhanqian-qa.mjs: with the `qa` prop the film skips WebGL and, on every frame,
// logs the screen box of every visible piece of text so the script can check the safe area, the caption
// band, the spacing between labels and the number of cards on screen.
// Grouping: text belongs to its nearest [data-qa] ancestor. data-qa-text="1" measures the glyphs only
// (big type on a full-width row); otherwise the ancestor's own box (a plate) is used.
import { useEffect } from "react";
import { continueRender, delayRender, useCurrentFrame } from "remotion";
import { fontsReady } from "./fonts";

export type QaItem = { id: string; kind: string; into: string[]; minFont: number; maxHan: number; sig: string; x0: number; y0: number; x1: number; y1: number };

const visible = (el: Element | null) => {
  let o = 1;
  for (let e = el; e; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") return 0;
    o *= Number(cs.opacity);
  }
  return o;
};

const measure = (): QaItem[] => {
  const groups = new Map<Element, DOMRect[]>();
  const fonts = new Map<Element, number[]>();
  const hans = new Map<Element, number[]>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim()) continue;
    const host = n.parentElement!;
    if (host.closest("[data-qa-skip]") || visible(host) < 0.25) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    const box = r.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    // a clip-path wipe: only the part of the text inside the clip window counts
    const clip = host.closest("[data-qa-clip]")?.getAttribute("data-qa-clip")?.split(",").map(Number);
    if (clip && (box.bottom <= clip[0] || box.top >= clip[1])) continue;
    const g = host.closest("[data-qa]") ?? host;
    groups.set(g, [...(groups.get(g) ?? []), box]);
    // type size and line length, for the phone checks
    const fs = parseFloat(getComputedStyle(host).fontSize);
    fonts.set(g, [...(fonts.get(g) ?? []), fs]);
    if (fs < 90) hans.set(g, [...(hans.get(g) ?? []), (n.textContent.match(/[一-鿿]/g) ?? []).length]);
  }
  return [...groups.entries()].map(([g, boxes]) => {
    const plate = g.hasAttribute("data-qa") && g.getAttribute("data-qa-text") !== "1";
    const clip = g.closest("[data-qa-clip]")?.getAttribute("data-qa-clip")?.split(",").map(Number);
    const b = (plate ? [g.getBoundingClientRect()] : boxes).map((r) => (clip ? new DOMRect(r.x, Math.max(r.top, clip[0]), r.width, Math.max(0, Math.min(r.bottom, clip[1]) - Math.max(r.top, clip[0]))) : r));
    return {
      id: g.getAttribute("data-qa") || `${g.tagName.toLowerCase()}:${(g.textContent ?? "").trim().slice(0, 14)}`,
      kind: g.getAttribute("data-qa-kind") ?? "text",
      // a label whose job is to move into another one (tickets merging, an order flying into the ladder)
      into: (g.getAttribute("data-qa-into") ?? "").split(",").filter(Boolean),
      minFont: Math.min(...(fonts.get(g) ?? [99])),
      maxHan: Math.max(0, ...(hans.get(g) ?? [0])),
      sig: (g.textContent ?? "").trim().slice(0, 60),
      x0: Math.min(...b.map((r) => r.left)),
      y0: Math.min(...b.map((r) => r.top)),
      x1: Math.max(...b.map((r) => r.right)),
      y1: Math.max(...b.map((r) => r.bottom)),
    };
  });
};

export const QaProbe: React.FC = () => {
  const f = useCurrentFrame();
  useEffect(() => {
    const h = delayRender("qa measure");
    fontsReady.then(() =>
      requestAnimationFrame(() => {
        console.log("QA" + JSON.stringify({ f, items: measure() }));
        continueRender(h);
      }),
    );
  }, [f]);
  return null;
};
