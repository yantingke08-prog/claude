// Order-book shots: tape (那一秒), three (三种人), aggr (主动成交), passive (被动承接).
// 红涨绿跌: bids / active buys = red, asks / active sells = green, stops = violet, resting highlight = cyan.
import React from "react";
import { camSteps, keys, lin, mix, prog, pulse, win } from "../anim";
import { useFilm } from "../ctx";
import { Book, Stage, Tag, alpha, rowY, type BookRow } from "../kit";
import { flow, fmtD, fmtN, Hud, merge, Ticker, tickPrice, totals, type Print } from "../orderflow";
import { C, DNT, STOPT, UPT } from "../theme";
import { BOOK_MAX, BOOK_X, BOOK_Y, HitStream, baseAsk, baseBid, makeRows, rowOf, sweep, type SceneProps } from "./parts";

const ry = (p: number) => rowY(BOOK_Y, rowOf(p));
const TAG_L = 206; // right edge of left-side tags (book's left edge 220 − 14)
const TAG_R = 874; // left edge of right-side tags (book's right edge 860 + 14)
const IN_L = 240;
const IN_R = 840;
const VOL0 = 18240; // session volume before the shot (synthetic)

const put = (a: Record<number, Partial<BookRow>>, p: number, v: Partial<BookRow>) => {
  a[p] = { ...(a[p] ?? {}), ...v };
};

/** HUD + ticker driven by one print list. */
const Flow: React.FC<{ t: number; prints: Print[]; last: number; extra?: { label: string; value: string; color: string } }> = ({ t, prints, last, extra }) => {
  const { vol, delta } = totals(prints, t);
  const items = [
    { label: "成交量", value: fmtN(VOL0 + vol), color: C.text },
    { label: "Delta", value: fmtD(delta), color: delta >= 0 ? UPT : DNT },
    extra ?? { label: "最新价", value: tickPrice(last), color: C.amber },
  ];
  return (
    <>
      <Hud items={items} />
      <Ticker t={t} prints={prints} />
    </>
  );
};

// ---------------- tape ----------------
export const Tape: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const L0 = 7;
  const dropT0 = b("decided");
  const drop = sweep(t, dropT0, dropT0 + 1.0, 3);
  const L = L0 - drop.k;
  const over: Record<number, Partial<BookRow>> = {};
  if (drop.on) put(over, L, { bid: baseBid(L) * (1 - drop.frac) });
  const tagIn = (i: number) => win(t, b("three3") + i * 0.28, dropT0 + 0.2, 0.3);
  const fire = lin(t, dropT0 + 0.6, 0.6);
  put(over, 4, { stops: 2, stopFire: fire, stopO: prog(t, b("three3") + 0.56, 0.3) });
  put(over, 3, { stops: 2, stopFire: fire, stopO: prog(t, b("three3") + 0.56, 0.3) });
  put(over, L0 - 1, { bidColor: C.cyan, bid: 760, bidGlow: 0.6 * tagIn(1) });
  const dim = prog(t, b("notSeen"), 0.6);
  const prints = React.useMemo(
    () =>
      merge(
        flow(201, shot.start, b("three3"), { every: 0.22, p: () => L0 }),
        flow(202, b("three3"), dropT0, { every: 0.12, buyP: 0.85, p: () => L0 + 1 }),
        flow(203, dropT0, shot.end + 0.4, { every: 0.07, buyP: 0.05, hi: 90, big: 0.2, p: (s) => L0 - sweep(s, dropT0, dropT0 + 1.0, 3).k }),
      ),
    [shot.start, shot.end, dropT0, b],
  );
  const cam = {
    rx: 12,
    ry: camSteps(t, -12, [[b("three3"), -5], [dropT0, -10]]),
    s: keys(t, [[b("thatSec"), 0.9], [b("thatSec") + 0.8, 1], [b("notSeen"), 1], [b("notSeen") + 1.2, 1.04]]),
  };
  return (
    <>
      <Stage cam={cam} o={1 - 0.55 * dim}>
        <Book x={BOOK_X} y={BOOK_Y} rows={makeRows(L, over)} max={BOOK_MAX} lastColor={drop.k > 0 ? DNT : C.amber} />
        <HitStream t={t} t0={b("three3")} t1={b("three3") + 1.1} x0={IN_L} x1={700} y={() => ry(L0 + 1)} color={UPT} />
        <HitStream t={t} t0={dropT0} t1={dropT0 + 1.0} x0={IN_R} x1={420} dir={-1} y={(s) => ry(L0 - sweep(s, dropT0, dropT0 + 1.0, 3).k)} color={DNT} />
        <Tag x={TAG_R} y={ry(L0 + 1)} text="主动买" color={UPT} o={tagIn(0)} />
        <Tag x={TAG_L} y={ry(L0 - 1)} text="挂单" color={C.cyan} o={tagIn(1)} align="r" />
        <Tag x={TAG_R} y={(ry(4) + ry(3)) / 2} text="止损" color={STOPT} o={tagIn(2)} />
        <Tag x={TAG_L} y={ry(L0)} text="买一" color={UPT} o={win(t, b("thatSec") + 0.3, b("three3"), 0.3)} align="r" />
        <Tag x={TAG_R} y={ry(L0 + 1)} text="卖一" color={DNT} o={win(t, b("thatSec") + 0.3, b("three3"), 0.3)} />
        <Tag x={TAG_R} y={ry(L)} text={`−${drop.k} 跳`} color={DNT} o={prog(t, dropT0 + 0.3, 0.3)} mono />
        <Tag x={TAG_L} y={ry(L) + 2} text="砸穿" color={DNT} o={prog(t, dropT0 + 0.6, 0.3) * (drop.k >= 3 ? 1 : 0)} align="r" />
      </Stage>
      <Flow t={t} prints={prints} last={L} />
    </>
  );
};

// ---------------- three ----------------
export const Three: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const L0 = 6;
  const up = sweep(t, b("chaseHit"), b("chaseHit") + 1.2, 2);
  const dn0 = b("stopBreak") - 0.3;
  const dn = sweep(t, dn0, dn0 + 0.9, 5);
  const dn2 = sweep(t, b("forcedFill"), b("forcedFill") + 0.9, 2);
  const L = L0 + up.k - dn.k - dn2.k;
  const over: Record<number, Partial<BookRow>> = {};
  if (up.on) put(over, L + 1, { ask: baseAsk(L + 1) * (1 - up.frac) });
  if (dn.on) put(over, L, { bid: baseBid(L) * (1 - dn.frac) });
  if (dn2.on) put(over, L, { bid: baseBid(L) * (1 - dn2.frac) });
  const restIn = prog(t, b("rest"), 0.6);
  if (restIn > 0) put(over, 10, { ask: 900 * restIn, askColor: C.cyan, askGlow: 0.5 + 0.5 * pulse(t, b("rest") + 0.6, 0.6, 2) });
  const stopsIn = prog(t, b("thirdKind"), 0.4);
  const fire = lin(t, b("stopBreak") + 0.45, 0.7);
  if (stopsIn > 0) {
    put(over, 3, { stops: 3, stopFire: fire, stopO: stopsIn });
    put(over, 2, { stops: 3, stopFire: fire, stopO: stopsIn });
  }
  const forcedTag = prog(t, b("forcedFill"), 0.3);
  const Lat = (s: number) => L0 + sweep(s, b("chaseHit"), b("chaseHit") + 1.2, 2).k - sweep(s, dn0, dn0 + 0.9, 5).k - sweep(s, b("forcedFill"), b("forcedFill") + 0.9, 2).k;
  const prints = React.useMemo(
    () =>
      merge(
        flow(211, shot.start, b("chaseHit"), { every: 0.25, p: Lat }),
        flow(212, b("chaseHit"), b("chaseHit") + 1.2, { every: 0.08, buyP: 0.92, hi: 80, p: (s) => Lat(s) + 1 }),
        flow(213, b("chaseHit") + 1.2, dn0, { every: 0.3, p: Lat }),
        flow(214, dn0, shot.end + 0.4, { every: 0.07, buyP: 0.04, hi: 90, big: 0.25, p: Lat }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shot.start, shot.end, dn0],
  );
  const cam = { rx: 12, ry: camSteps(t, -6, [[b("patient"), -12], [b("thirdKind"), -4]]), s: 1 };
  return (
    <>
      <Stage cam={cam}>
        <Book x={BOOK_X} y={BOOK_Y} rows={makeRows(L, over)} max={BOOK_MAX} lastColor={dn.k > 0 ? DNT : C.amber} />
        <HitStream t={t} t0={b("chaseHit")} t1={b("chaseHit") + 1.2} x0={IN_L} x1={700} y={(s) => ry(L0 + sweep(s, b("chaseHit"), b("chaseHit") + 1.2, 2).k + 1)} color={UPT} />
        <HitStream t={t} t0={dn0} t1={dn0 + 0.9} x0={IN_R} x1={420} dir={-1} y={(s) => ry(8 - sweep(s, dn0, dn0 + 0.9, 5).k)} color={DNT} every={0.1} />
        <HitStream t={t} t0={b("forcedFill")} t1={b("forcedFill") + 0.9} x0={IN_R} x1={420} dir={-1} y={(s) => ry(3 - sweep(s, b("forcedFill"), b("forcedFill") + 0.9, 2).k)} color={STOPT} every={0.09} />
        <Tag x={TAG_L} y={ry(8)} text="追价" color={C.amber} o={prog(t, b("chaseHit") + 0.3, 0.3)} align="r" />
        <Tag x={TAG_L} y={ry(8) + 44} text="吃 2 档" color={UPT} o={prog(t, b("chaseHit") + 1.2, 0.3) * (1 - prog(t, dn0, 0.3))} align="r" size={24} mono />
        <Tag x={TAG_R} y={ry(10)} text="挂单" color={C.cyan} o={prog(t, b("rest") + 0.2, 0.3)} />
        <Tag x={TAG_R} y={ry(10) + 44} text="不追价" color={C.cyan} o={prog(t, b("rest") + 0.7, 0.3)} size={24} />
        <Tag x={TAG_R} y={(ry(3) + ry(2)) / 2} text="止损" color={STOPT} o={stopsIn * (1 - forcedTag)} />
        <Tag x={TAG_R} y={(ry(3) + ry(2)) / 2} text="被迫" color={STOPT} o={forcedTag} />
        <Tag x={TAG_R} y={ry(1) + 8} text={`−${7 - Math.max(1, L)} 跳`} color={DNT} o={prog(t, b("forcedFill") + 0.6, 0.3)} mono />
      </Stage>
      <Flow t={t} prints={prints} last={L} />
    </>
  );
};

// ---------------- aggr ----------------
export const Aggr: React.FC<SceneProps> = ({ shot }) => {
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
  if (up.on) put(over, L + 1, { ask: baseAsk(L + 1) * (1 - up.frac) });
  if (dn.on) put(over, L, { bid: baseBid(L) * (1 - dn.frac) });
  const slip = prog(t, b("urgent"), 0.5);
  const eatenAsk = [6, 7, 8, 9].reduce((s, p) => s + baseAsk(p), 0);
  const eatenBid = [9, 8, 7, 6, 5, 4].reduce((s, p) => s + baseBid(p), 0);
  const Lat = (s: number) => L0 + sweep(s, bt0, bt1, 4).k - sweep(s, st0, st1, 6).k;
  const prints = React.useMemo(
    () =>
      merge(
        flow(221, shot.start, bt0, { every: 0.24, p: Lat }),
        flow(222, bt0, bt1, { every: 0.07, buyP: 0.94, hi: 90, big: 0.15, p: (s) => Lat(s) + 1 }),
        flow(223, bt1, st0, { every: 0.22, buyP: 0.6, p: Lat }),
        flow(224, st0, st1, { every: 0.06, buyP: 0.05, hi: 90, big: 0.2, p: Lat }),
        flow(225, st1, shot.end + 0.4, { every: 0.24, buyP: 0.4, p: Lat }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shot.start, shot.end, bt0, bt1, st0, st1],
  );
  const cam = { rx: 12, ry: camSteps(t, -8, [[bt0, -3], [st0, -12], [b("urgent"), -6]]), s: camSteps(t, 0.96, [[bt0, 1], [b("urgent"), 1.04]]) };
  const bandTop = ry(9) - 31;
  const bandBot = ry(3) + 31;
  return (
    <>
      <Stage cam={cam}>
        <Book x={BOOK_X} y={BOOK_Y} rows={makeRows(L, over)} max={BOOK_MAX} lastColor={t >= st0 ? DNT : UPT} />
        {slip > 0 ? (
          <div style={{ position: "absolute", left: BOOK_X - 74, top: bandTop, width: 148, height: (bandBot - bandTop) * slip, border: `3px solid ${alpha(C.amber, 0.9)}`, background: alpha(C.amber, 0.12), borderRadius: 10, transform: "translateZ(20px)" }} />
        ) : null}
        <HitStream t={t} t0={bt0} t1={bt1} x0={IN_L} x1={700} y={(s) => ry(L0 + sweep(s, bt0, bt1, 4).k + 1)} color={UPT} every={0.11} />
        <HitStream t={t} t0={st0} t1={st1} x0={IN_R} x1={420} dir={-1} y={(s) => ry(9 - sweep(s, st0, st1, 6).k)} color={DNT} every={0.11} />
        <Tag x={TAG_L} y={ry(L0 + up.k)} text="主动买" color={UPT} o={win(t, bt0 + 0.1, st0, 0.3)} align="r" />
        <Tag x={TAG_R} y={ry(9)} text="+4 跳" color={UPT} o={win(t, bt1, st0, 0.3)} mono />
        <Tag x={TAG_R} y={ry(9 - dn.k)} text="主动卖" color={DNT} o={win(t, st0 + 0.1, b("urgent"), 0.3)} />
        <Tag x={TAG_L} y={ry(3)} text="−6 跳" color={DNT} o={win(t, st1, b("howMuch"), 0.3)} align="r" mono />
        <Tag x={TAG_L} y={ry(6)} text="滑 6 跳" color={C.amber} o={prog(t, b("howMuch"), 0.35)} align="r" />
        <Tag x={TAG_L} y={ry(6) + 44} text="着急的代价" color={C.amber} o={prog(t, b("howMuch") + 0.4, 0.35)} align="r" size={24} />
      </Stage>
      <Flow
        t={t}
        prints={prints}
        last={L}
        extra={
          t >= st0
            ? { label: "砸单", value: `${fmtN(eatenBid * Math.min(1, (t - st0) / (st1 - st0)))} 手`, color: DNT }
            : t >= bt0
              ? { label: "吃单", value: `${fmtN(eatenAsk * Math.min(1, (t - bt0) / (bt1 - bt0)))} 手`, color: UPT }
              : undefined
        }
      />
    </>
  );
};

// ---------------- passive ----------------
export const Passive: React.FC<SceneProps> = ({ shot }) => {
  const { t, b } = useFilm();
  const s1t = b("rushUp");
  const s2t = b("delivered");
  const s3t = b("askThick") + 1.0;
  const s4t = b("bidThick") + 0.8;
  const Lat = (s: number) =>
    6 + sweep(s, s1t, s1t + 0.6, 1).k - sweep(s, s2t, s2t + 0.8, 2).k + sweep(s, s3t, s3t + 0.4, 1).k - sweep(s, s4t, s4t + 0.4, 1).k + (s >= b("caught") + 0.15 ? 1 : 0);
  const s1 = sweep(t, s1t, s1t + 0.6, 1);
  const s2 = sweep(t, s2t, s2t + 0.8, 2);
  const L = Lat(t);
  const over: Record<number, Partial<BookRow>> = {};
  if (s1.on) put(over, L + 1, { ask: baseAsk(L + 1) * (1 - s1.frac) });
  if (s2.on) put(over, L, { bid: baseBid(L) * (1 - s2.frac) });

  const sit = prog(t, b("sitLevel"), 0.6);
  const hitA = s2t + 0.8;
  const hitB = b("passiveName") + 0.6;
  const cyanSize = mix(1000, 780, lin(t, hitA, hitB - hitA));
  if (sit > 0 && L >= 5) put(over, 5, { bid: cyanSize * sit, bidColor: C.cyan, bidGlow: 0.4 + 0.6 * pulse(t, b("passiveName"), 0.5, 2) });
  const ask = pulse(t, b("anyone"), 0.55, 2);
  if (ask > 0) for (const p of [L + 1, L + 2, L + 3]) put(over, p, { askGlow: ask });
  const aw = prog(t, b("askThick"), 0.5);
  const awHit0 = s3t + 0.4;
  const awSize = mix(1300, 1100, lin(t, awHit0, b("cantPush") - awHit0));
  if (aw > 0) put(over, 7, { ask: awSize * aw + baseAsk(7) * (1 - aw), askGlow: aw * (0.5 + 0.5 * pulse(t, b("cantPush"), 0.45, 2)) });
  const bw = prog(t, b("bidThick"), 0.5);
  const bwHit0 = s4t + 0.4;
  const bwSize = mix(1200, 1010, lin(t, bwHit0, b("caught") - bwHit0));
  if (bw > 0) put(over, 4, { bid: bwSize * bw + baseBid(4) * (1 - bw), bidGlow: bw * (0.5 + 0.5 * pulse(t, b("caught"), 0.45, 2)) });

  const prints = React.useMemo(
    () =>
      merge(
        flow(231, shot.start, s1t, { every: 0.25, p: Lat }),
        flow(232, s1t, s1t + 0.6, { every: 0.08, buyP: 0.9, p: (s) => Lat(s) + 1 }),
        flow(233, s1t + 0.6, s2t, { every: 0.3, p: Lat }),
        flow(234, s2t, hitB, { every: 0.1, buyP: 0.08, p: Lat }),
        flow(235, hitB, s3t, { every: 0.3, p: Lat }),
        flow(236, s3t, b("cantPush"), { every: 0.08, buyP: 0.93, hi: 80, p: (s) => Lat(s) + 1 }),
        flow(237, b("cantPush"), s4t, { every: 0.3, p: Lat }),
        flow(238, s4t, b("caught"), { every: 0.08, buyP: 0.07, hi: 80, p: Lat }),
        flow(239, b("caught"), shot.end + 0.4, { every: 0.25, buyP: 0.6, p: Lat }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shot.start, shot.end, s1t, s2t, s3t, s4t],
  );

  const cam = {
    rx: 12,
    ry: camSteps(t, -8, [[b("sitLevel"), -12], [b("askThick"), -4], [b("bidThick"), -12]]),
    y: camSteps(t, 0, [[b("askThick"), 60], [b("bidThick"), -40], [b("caught") + 0.6, 0]]),
    s: camSteps(t, 1, [[b("askThick"), 1.04]]),
  };
  const sitTag = win(t, b("sitLevel") + 0.3, b("askThick"), 0.3);
  return (
    <>
      <Stage cam={cam}>
        <Book x={BOOK_X} y={BOOK_Y} rows={makeRows(L, over)} max={BOOK_MAX} />
        <HitStream t={t} t0={s1t} t1={s1t + 0.6} x0={IN_L} x1={700} y={() => ry(7)} color={UPT} />
        <HitStream t={t} t0={s2t} t1={hitB} x0={IN_R} x1={420} dir={-1} y={(s) => ry(Math.max(5, 7 - sweep(s, s2t, s2t + 0.8, 2).k))} color={DNT} every={0.16} />
        <HitStream t={t} t0={s3t} t1={b("cantPush")} x0={IN_L} x1={700} y={(s) => ry(s < awHit0 ? 6 : 7)} color={UPT} every={0.12} />
        <HitStream t={t} t0={s4t} t1={b("caught")} x0={IN_R} x1={420} dir={-1} y={(s) => ry(s < bwHit0 ? 5 : 4)} color={DNT} every={0.12} />
        <Tag x={TAG_R} y={ry(8)} text="谁来接?" color={C.cyan} o={win(t, b("anyone"), b("sitLevel"), 0.3)} />
        <Tag x={TAG_L} y={ry(5)} text={t >= b("passiveName") ? "被动承接" : "挂单"} color={C.cyan} o={sitTag} align="r" />
        <Tag x={TAG_L} y={ry(5) + 44} text={`剩 ${Math.round(cyanSize)}`} color={C.cyan} o={sitTag * prog(t, hitA, 0.3)} align="r" size={24} mono />
        <Tag x={TAG_R} y={ry(7)} text="卖墙" color={DNT} o={aw} />
        <Tag x={TAG_R} y={ry(7) + 44} text={t >= b("cantPush") ? "推不动" : `${Math.round(awSize)} 手`} color={t >= b("cantPush") ? C.amber : DNT} o={aw * prog(t, b("askThick") + 0.4, 0.3)} size={24} />
        <Tag x={TAG_L} y={ry(4)} text="买墙" color={UPT} o={bw} align="r" />
        <Tag x={TAG_L} y={ry(4) + 44} text={t >= b("caught") ? "接住" : `${Math.round(bwSize)} 手`} color={t >= b("caught") ? C.amber : UPT} o={bw * prog(t, b("bidThick") + 0.4, 0.3)} align="r" size={24} />
      </Stage>
      <Flow t={t} prints={prints} last={L} />
    </>
  );
};
