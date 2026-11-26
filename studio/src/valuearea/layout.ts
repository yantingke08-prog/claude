// Fixed screen zones for the 1440×2560 frame. Each HUD element has exactly one zone.
//   status   0–200     series tag (left), risk notice (right, always on)
//   data   220–1880    the 3D stage and the one main label that sits beside its object
//   cards 1900–2100    at most two small cards
//   caption 2120–2320  subtitles only (≈200 px band, one or two rows)
//   2320–2560          kept clear for the platform's own UI
// 48 px left/right safe margin for everything.
export type Rect = { x: number; y: number; w: number; h: number };

export const LAYOUT = {
  W: 1440,
  H: 2560,
  margin: 48,
  status: { top: 0, bottom: 200 },
  data: { top: 220, bottom: 1880 },
  cards: { top: 1900, bottom: 2100 },
  caption: { top: 2120, bottom: 2320 },
  /** the camera's principal point moves up by this many px, so the stage centres on the data zone */
  viewShift: 220,
  maxCards: 2,
} as const;

/** width estimate: CJK = 1 em, Latin and digits ≈ 0.58 em, space 0.3 em */
export const textW = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (ch.charCodeAt(0) < 128 ? (ch === " " ? 0.3 : 0.58) : 1) * size, 0);
export const clampX = (x: number, w: number) => Math.min(LAYOUT.W - LAYOUT.margin - w, Math.max(LAYOUT.margin, x));
export const clampY = (y: number, h: number, zone: { top: number; bottom: number } = LAYOUT.data) => Math.min(zone.bottom - h, Math.max(zone.top, y));

export const CAP = { size: 58, lh: 78, padX: 30, padY: 14 } as const;
export const LBL = { k: 50, v: 38, gap: 14 } as const;
export const CARD = { k: 44, v: 36, h: 150, padX: 34, gap: 28 } as const;
