// Order-book shots: tape (那一秒), three (三种人), aggr (主动成交), passive (被动承接).
import React from "react";
import { camSteps, keys, lin, mix, prog, pulse, win } from "../anim";
import { useFilm } from "../ctx";
import { Book, Stage, Tag, alpha, rowY, type BookRow } from "../kit";
import { C } from "../theme";
import { BOOK_MAX, BOOK_X, BOOK_Y, HitStream, baseAsk, baseBid, makeRows, rowOf, sweep, type SceneProps } from "./parts";

const ry = (p: number) => rowY(BOOK_Y, rowOf(p));
const TAG_L = 206; // right edge of left-side tags (book's left edge 220 − 14)
const TAG_R = 874; // left edge of right-side tags (book's right edge 860 + 14)
const IN_L = 240; // pucks start (left)
const IN_R = 840; // pucks start (right)

const merge = (a: Record<number, Partial<BookRow>>, p: number, v: Partial<BookRow>) => {
  a[p] = { ...(a[p] ?? {}), ...v };
};

// ---------------- tape ----------------
export const Tape: React.FC<SceneProps> = () => {
  const { t, b } = useFilm();
  const L0 = 7;
  const dropT0 = b("decided");
  const drop = sweep(t, dropT0, dropT0 + 1.0, 3);
  const L = L0 - drop.k;
  const over: Record<number, Partial<BookRow>> = {};
  if (drop.on) merge(over, L, { bid: baseBid(L) * (1 - drop.frac) });
  const tagIn = (i: number) => win(t, b("three3") + i * 0.28, dropT0 + 0.2, 0.3);
  const fire = lin(t, dropT0 + 0.6, 0.6);
  merge(over, 4, { stops: 2, stopFire: fire, stopO: prog(t, b("three3") + 0.56, 0.3) });
  merge(over, 3, { stops: 2, stopFire: fire, stopO: prog(t, b("three3") + 0.56, 0.3) });
  merge(over, L0 - 1, { bidColor: C.cyan, bid: 760, bidGlow: 0.6 * tagIn(1) });
  const dim = prog(t, b("notSeen"), 0.6);
  const cam = {
    rx: 12,
    ry: camSteps(t, -12, [[b("three3"), -5], [dropT0, -10]]),
    s: keys(t, [[b("thatSec"), 0.9], [b("thatSec") + 0.8, 1], [b("notSeen"), 1], [b("notSeen") + 1.2, 1.04]]),
  };
  return (
    <Stage cam={cam} o={1 - 0.55 * dim}>
      <Book x={BOOK_X} y={BOOK_Y} rows={makeRows(L, over)} max={BOOK_MAX} lastColor={drop.k > 0 ? C.redText : C.amber} />
      <HitStream t={t} t0={b("three3")} t1={b("three3") + 1.1} x0={IN_L} x1={700} y={() => ry(L0 + 1)} color={C.amber} />
      <HitStream t={t} t0={dropT0} t1={dropT0 + 1.0} x0={IN_R} x1={420} dir={-1} y={(s) => ry(L0 - sweep(s, dropT0, dropT0 + 1.0, 3).k)} color={C.redText} />
      <Tag x={TAG_R} y={ry(L0 + 1)} text="主动" color={C.amber} o={tagIn(0)} />
      <Tag x={TAG_L} y={ry(L0 - 1)} text="挂单" color={C.cyan} o={tagIn(1)} align="r" />
      <Tag x={TAG_R} y={(ry(4) + ry(3)) / 2} text="止损" color={C.redText} o={tagIn(2)} />
      <Tag x={TAG_R} y={ry(L)} text={`−${drop.k} 跳`} color={C.redText} o={prog(t, dropT0 + 0.3, 0.3)} mono />
    </Stage>
  );
};

// ---------------- three ----------------
export const Three: React.FC<SceneProps> = () => {
  const { t, b } = useFilm();
  const L0 = 6;
  const up = sweep(t, b("chaseHit"), b("chaseHit") + 1.2, 2);
  const dn0 = b("stopBreak") - 0.3;
  const dn = sweep(t, dn0, dn0 + 0.9, 5); // 8 → 3: through the stops
  const dn2 = sweep(t, b("forcedFill"), b("forcedFill") + 0.9, 2); // forced sells push on: 3 → 1
  const L = L0 + up.k - dn.k - dn2.k;
  const over: Record<number, Partial<BookRow>> = {};
  if (up.on) merge(over, L + 1, { ask: baseAsk(L + 1) * (1 - up.frac) });
  if (dn.on) merge(over, L, { bid: baseBid(L) * (1 - dn.frac) });
  if (dn2.on) merge(over, L, { bid: baseBid(L) * (1 - dn2.frac) });
  // resting sell above, patient
  const restIn = prog(t, b("rest"), 0.6);
  if (restIn > 0) merge(over, 10, { ask: 900 * restIn, askColor: C.cyan, askGlow: 0.5 + 0.5 * pulse(t, b("rest") + 0.6, 0.6, 2) });
  // stops below
  const stopsIn = prog(t, b("thirdKind"), 0.4);
  const fire = lin(t, b("stopBreak") + 0.45, 0.7);
  if (stopsIn > 0) {
    merge(over, 3, { stops: 3, stopFire: fire, stopO: stopsIn });
    merge(over, 2, { stops: 3, stopFire: fire, stopO: stopsIn });
  }
  const forcedTag = prog(t, b("forcedFill"), 0.3);
  const cam = { rx: 12, ry: camSteps(t, -6, [[b("patient"), -12], [b("thirdKind"), -4]]), s: 1 };
  return (
    <Stage cam={cam}>
      <Book x={BOOK_X} y={BOOK_Y} rows={makeRows(L, over)} max={BOOK_MAX} lastColor={dn.k > 0 ? C.redText : C.amber} />
      <HitStream t={t} t0={b("chaseHit")} t1={b("chaseHit") + 1.2} x0={IN_L} x1={700} y={(s) => ry(L0 + sweep(s, b("chaseHit"), b("chaseHit") + 1.2, 2).k + 1)} color={C.amber} />
      <HitStream t={t} t0={dn0} t1={dn0 + 0.9} x0={IN_R} x1={420} dir={-1} y={(s) => ry(8 - sweep(s, dn0, dn0 + 0.9, 5).k)} color={C.redText} every={0.1} />
      <HitStream t={t} t0={b("forcedFill")} t1={b("forcedFill") + 0.9} x0={IN_R} x1={420} dir={-1} y={(s) => ry(3 - sweep(s, b("forcedFill"), b("forcedFill") + 0.9, 2).k)} color={C.redText} every={0.09} />
      <Tag x={TAG_L} y={ry(8)} text="追价" color={C.amber} o={prog(t, b("chaseHit") + 0.3, 0.3)} align="r" />
      <Tag x={TAG_R} y={ry(10)} text="挂单" color={C.cyan} o={prog(t, b("rest") + 0.2, 0.3)} />
      <Tag x={TAG_R} y={(ry(3) + ry(2)) / 2} text="止损" color={C.redText} o={stopsIn * (1 - forcedTag)} />
      <Tag x={TAG_R} y={(ry(3) + ry(2)) / 2} text="被迫" color={C.redText} o={forcedTag} />
    </Stage>
  );
};

// ---------------- aggr ----------------
export const Aggr: React.FC<SceneProps> = () => {
  const { t, b } = useFilm();
  const L0 = 5;
  const bt0 = b("aggBuy");
  const bt1 = Math.max(bt0 + 1.2, b("upTick") + 0.3);
  const st0 = b("aggSell");
  const st1 = Math.max(st0 + 1.4, b("downTick") + 0.4);
  const up = sweep(t, bt0, bt1, 4);
  const dn = sweep(t, st0, st1, 6);
  const L = L0 + up.k - dn.k;
  const over: Record<number, Partial<BookRow>> = {};
  if (up.on) merge(over, L + 1, { ask: baseAsk(L + 1) * (1 - up.frac) });
  if (dn.on) merge(over, L, { bid: baseBid(L) * (1 - dn.frac) });
  const slip = prog(t, b("urgent"), 0.5);
  const cam = { rx: 12, ry: camSteps(t, -8, [[bt0, -3], [st0, -12], [b("urgent"), -6]]), s: camSteps(t, 0.96, [[bt0, 1], [b("urgent"), 1.04]]) };
  const bandTop = ry(9) - 31;
  const bandBot = ry(3) + 31;
  return (
    <Stage cam={cam}>
      <Book x={BOOK_X} y={BOOK_Y} rows={makeRows(L, over)} max={BOOK_MAX} lastColor={t >= st0 ? C.redText : C.greenText} />
      {slip > 0 ? (
        <div style={{ position: "absolute", left: BOOK_X - 74, top: bandTop, width: 148, height: (bandBot - bandTop) * slip, border: `3px solid ${alpha(C.amber, 0.9)}`, background: alpha(C.amber, 0.12), borderRadius: 10, transform: "translateZ(20px)" }} />
      ) : null}
      <HitStream t={t} t0={bt0} t1={bt1} x0={IN_L} x1={700} y={(s) => ry(L0 + sweep(s, bt0, bt1, 4).k + 1)} color={C.greenText} every={0.11} />
      <HitStream t={t} t0={st0} t1={st1} x0={IN_R} x1={420} dir={-1} y={(s) => ry(9 - sweep(s, st0, st1, 6).k)} color={C.redText} every={0.11} />
      <Tag x={TAG_L} y={ry(L0 + up.k)} text="主动买" color={C.greenText} o={win(t, bt0 + 0.1, st0, 0.3)} align="r" />
      <Tag x={TAG_R} y={ry(9)} text="+4 跳" color={C.greenText} o={win(t, bt1, st0 + 0.2, 0.3)} mono />
      <Tag x={TAG_R} y={ry(9 - dn.k)} text="主动卖" color={C.redText} o={win(t, st0 + 0.1, b("urgent"), 0.3)} />
      <Tag x={TAG_L} y={ry(3)} text="−6 跳" color={C.redText} o={win(t, st1, b("howMuch"), 0.3)} align="r" mono />
      <Tag x={TAG_L} y={ry(6)} text="滑 6 跳" color={C.amber} o={prog(t, b("howMuch"), 0.35)} align="r" />
    </Stage>
  );
};

// ---------------- passive ----------------
export const Passive: React.FC<SceneProps> = () => {
  const { t, b } = useFilm();
  const s1 = sweep(t, b("rushUp"), b("rushUp") + 0.6, 1); // +1
  const s2 = sweep(t, b("delivered"), b("delivered") + 0.8, 2); // −2
  const s3t = b("askThick") + 1.0;
  const s3 = sweep(t, s3t, s3t + 0.4, 1); // +1
  const s4t = b("bidThick") + 0.8;
  const s4 = sweep(t, s4t, s4t + 0.4, 1); // −1
  const bounce = t >= b("caught") + 0.15 ? 1 : 0; // +1
  const L = 6 + s1.k - s2.k + s3.k - s4.k + bounce;
  const over: Record<number, Partial<BookRow>> = {};
  if (s1.on) merge(over, L + 1, { ask: baseAsk(L + 1) * (1 - s1.frac) });
  if (s2.on) merge(over, L, { bid: baseBid(L) * (1 - s2.frac) });

  // resting cyan bid at p5: placed, then hit but holding
  const sit = prog(t, b("sitLevel"), 0.6);
  const hitA = b("delivered") + 0.8;
  const hitB = b("passiveName") + 0.6;
  const cyanSize = mix(1000, 780, lin(t, hitA, hitB - hitA));
  if (sit > 0 && L >= 5) merge(over, 5, { bid: cyanSize * sit, bidColor: C.cyan, bidGlow: 0.4 + 0.6 * pulse(t, b("passiveName"), 0.5, 2) });
  // asks above glow while asking "有没有人接"
  const ask = pulse(t, b("anyone"), 0.55, 2);
  if (ask > 0) for (const p of [L + 1, L + 2, L + 3]) merge(over, p, { askGlow: ask });
  // sell wall above
  const aw = prog(t, b("askThick"), 0.5);
  const awHit0 = s3t + 0.4;
  const awSize = mix(1300, 1100, lin(t, awHit0, b("cantPush") - awHit0));
  if (aw > 0) merge(over, 7, { ask: awSize * aw + baseAsk(7) * (1 - aw), askGlow: aw * (0.5 + 0.5 * pulse(t, b("cantPush"), 0.45, 2)) });
  // buy wall below
  const bw = prog(t, b("bidThick"), 0.5);
  const bwHit0 = s4t + 0.4;
  const bwSize = mix(1200, 1010, lin(t, bwHit0, b("caught") - bwHit0));
  if (bw > 0) merge(over, 4, { bid: bwSize * bw + baseBid(4) * (1 - bw), bidGlow: bw * (0.5 + 0.5 * pulse(t, b("caught"), 0.45, 2)) });

  const cam = {
    rx: 12,
    ry: camSteps(t, -8, [[b("sitLevel"), -12], [b("askThick"), -4], [b("bidThick"), -12]]),
    y: camSteps(t, 0, [[b("askThick"), 70], [b("bidThick"), -50], [b("caught") + 0.6, 0]]),
    s: camSteps(t, 1, [[b("askThick"), 1.05]]),
  };
  const sitTag = win(t, b("sitLevel") + 0.3, b("askThick"), 0.3);
  return (
    <Stage cam={cam}>
      <Book x={BOOK_X} y={BOOK_Y} rows={makeRows(L, over)} max={BOOK_MAX} />
      <HitStream t={t} t0={b("rushUp")} t1={b("rushUp") + 0.6} x0={IN_L} x1={700} y={() => ry(7)} color={C.greenText} />
      <HitStream t={t} t0={b("delivered")} t1={hitB} x0={IN_R} x1={420} dir={-1} y={(s) => ry(Math.max(5, 7 - sweep(s, b("delivered"), b("delivered") + 0.8, 2).k))} color={C.redText} every={0.16} />
      <HitStream t={t} t0={s3t} t1={b("cantPush")} x0={IN_L} x1={700} y={(s) => ry(s < awHit0 ? 6 : 7)} color={C.greenText} every={0.12} />
      <HitStream t={t} t0={s4t} t1={b("caught")} x0={IN_R} x1={420} dir={-1} y={(s) => ry(s < bwHit0 ? 5 : 4)} color={C.redText} every={0.12} />
      <Tag x={TAG_L} y={ry(5)} text={t >= b("passiveName") ? "被动承接" : "挂单"} color={C.cyan} o={sitTag} align="r" />
      <Tag x={TAG_R} y={ry(7)} text="卖墙" color={C.redText} o={aw} />
      <Tag x={TAG_L} y={ry(4)} text="买墙" color={C.greenText} o={bw} align="r" />
    </Stage>
  );
};
