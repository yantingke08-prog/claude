// Layout check (no rendering): walks every frame of the film and the key event frames, and verifies the zones in
// layout.ts against what scene.ts would draw. Run with `npm run ap:layout` (scripts/activepassive-layout.mjs).
import EV from "./events.json";
import { E, FRAMES, captions } from "./cue";
import { holds, moving, presence, projector } from "./director";
import { CAPTION, DATA, LAYOUT, VERDICT, captionLayout, inside, nearest, overlaps, verdictLayout, type Rect } from "./layout";
import { dataBoxes, droppedLabels, labelSpans, labelsAt, verdictAt, verdictSpans } from "./scene";

type Issue = { f: number; what: string };
const r0 = (r: Rect) => `[${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}×${Math.round(r.h)}]`;

export const run = () => {
  const issues: Issue[] = [];
  const perFrame = (f: number) => {
    const pr = projector(f);
    const P = presence(f) as Record<string, number>;
    const boxes = dataBoxes(f, pr);
    const labels = labelsAt(f, pr).filter((l) => l.a > 0.02);
    const v = verdictAt(f);
    const cap = captions.filter((c) => f >= c.from && f < c.to);
    const out: string[] = [];
    if (labels.length > LAYOUT.maxLabels) out.push(`${labels.length} labels on screen (max ${LAYOUT.maxLabels}): ${labels.map((l) => l.id).join(", ")}`);
    if (cap.length > 1) out.push(`${cap.length} captions at once`);
    for (const l of labels) {
      if (!inside(l.rect, DATA)) out.push(`label ${l.id} ${r0(l.rect)} leaves the data zone`);
      for (const b of boxes) if (b.p > 0.3 && overlaps(l.rect, b.r)) out.push(`label ${l.id} ${r0(l.rect)} covers ${b.set}/${b.id} ${r0(b.r)}`);
    }
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (overlaps(labels[i].rect, labels[j].rect)) out.push(`labels ${labels[i].id} and ${labels[j].id} overlap`);
    // a settled set must sit wholly inside the data zone
    if (!moving(f)) for (const b of boxes) if (P[b.set] > 0.97 && b.r.x + b.r.w > 0 && b.r.x < LAYOUT.W && !inside(b.r, DATA, 2)) out.push(`data ${b.set}/${b.id} ${r0(b.r)} outside the data zone`);
    if (v) {
      const L = verdictLayout(v.rows.map((r) => r.map((s) => s[0]).join("")), v.big);
      if (!inside(L.rect, VERDICT)) out.push(`conclusion #${v.key} ${r0(L.rect)} does not fit the band`);
    }
    for (const c of cap) {
      if (c.rows.length > 2) out.push(`caption with ${c.rows.length} rows`);
      const L = captionLayout(c.rows);
      if (!inside(L.rect, CAPTION)) out.push(`caption "${c.text}" ${r0(L.rect)} does not fit the caption zone`);
    }
    return { out, labels, boxes, v };
  };
  const seen = new Set<string>();
  for (let f = 0; f < FRAMES; f++) {
    for (const what of perFrame(f).out) {
      // report each problem once, at its first frame
      const key = what.replace(/\[[^\]]*\]/g, "");
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({ f, what });
    }
  }
  // key event frames: one row each, with what is on screen once the event has landed
  const rows: string[] = [];
  for (const name of Object.keys(EV).filter((k) => !k.startsWith("_"))) {
    const f = Math.round(E(name) + LAYOUT.IN + 2);
    if (f >= FRAMES) continue;
    const r = perFrame(f);
    rows.push(`${name.padEnd(10)} f${String(f).padStart(5)}  labels ${r.labels.map((l) => l.id + (l.short ? "(short)" : "")).join(", ") || "-"}  |  conclusion ${r.v ? "#" + r.v.key : "-"}  |  ${r.out.length ? "FAIL " + r.out.length : "ok"}`);
  }
  // the extent of the data on screen at each camera hold (and at the end of that hold)
  const ks = holds();
  const ext = ks.map((k, i) => {
    const to = i + 1 < ks.length ? ks[i + 1].from - ks[i + 1].from + Math.round(E("buyIn")) * 0 + (ks[i + 1].from - 30) : FRAMES - 1;
    const at = [k.from + 1, Math.max(k.from + 1, to)].map((f) => {
      const bs = dataBoxes(f, projector(f)).filter((b) => (presence(f) as Record<string, number>)[b.set] > 0.97 && b.r.x + b.r.w > 0 && b.r.x < LAYOUT.W);
      if (!bs.length) return "-";
      const x0 = Math.min(...bs.map((b) => b.r.x)), y0 = Math.min(...bs.map((b) => b.r.y));
      const x1 = Math.max(...bs.map((b) => b.r.x + b.r.w)), y1 = Math.max(...bs.map((b) => b.r.y + b.r.h));
      return `f${f} x ${Math.round(x0)}..${Math.round(x1)} y ${Math.round(y0)}..${Math.round(y1)}`;
    });
    return `hold ${String(i).padStart(2)}  ${at.join("   ")}`;
  });
  // how far each label sits from what it explains (leader length at the middle of its time on screen)
  const leaders = labelSpans().map((sp) => {
    const f = Math.round((sp.span[0] + sp.span[1]) / 2);
    const l = labelsAt(f, projector(f)).find((x) => x.id === sp.id);
    if (!l) return { id: sp.id, len: -1, short: false };
    const n = nearest(l.rect, l.anchor);
    return { id: sp.id, len: Math.round(Math.hypot(n.x - l.anchor.x, n.y - l.anchor.y)), short: l.short };
  });
  return { leaders, ext, issues, rows, dropped: droppedLabels(), spans: labelSpans(), verdicts: verdictSpans() };
};
