// Camera and set presence. Pure functions of the frame, keyed only to events (which follow the voice).
// Camera grammar: very slow push-in = look closer at one number; lateral move = go to the next example;
// pull-back = put the number back into the whole picture. No orbits, spins or shake; every key sits on a word.
import * as THREE from "three";
import { E, FPS, HEIGHT, WIDTH, ease, yieldTo } from "./cue";
import { AC_TEST, POC, RJ_BACK, RJ_MIRROR, SX, STAGE_Y, VAH, VAL, cxOf, py, HOOK_BREAK, HOOK_HOLD, LINE_P, type SetId } from "./data";
import { LAYOUT } from "./layout";

export type V3 = [number, number, number];
type Pose = { p: V3; t: V3; fov: number; d?: V3 };
/** a pose looking at t from t + off; d = slow creep per second while holding */
const P = (t: V3, off: V3, fov = 30, d: V3 = [0, 0, -0.12]): Pose => ({ p: [t[0] + off[0], t[1] + off[1], t[2] + off[2]], t, fov, d });

const POSES = () => {
  const front = (s: SetId, dist = 46, dx = -0.1, y = STAGE_Y): Pose => P([SX[s] + dx, y, 0], [0.9, 1.5, dist]);
  const near = (s: SetId, x: number, y: number, dist = 34): Pose => P([SX[s] + x, y, 0], [0.8, 1.2, dist], 30, [-0.02, 0, -0.1]);
  const mapX = SX.map;
  return {
    hookWide: front("hook", 45),
    hookHold: near("hook", cxOf(HOOK_HOLD) + 1.2, py(LINE_P) + 0.6, 36),
    hookBreak: near("hook", cxOf(HOOK_BREAK) + 0.6, py(LINE_P) - 0.4, 36),
    hookBack: front("hook", 44),
    profile: P([SX.main + 1.3, STAGE_Y + 1.0, 0], [0.6, 1.3, 42]),
    mainWide: front("main", 45),
    vote: near("main", 2.2, py(POC), 33),
    pocWide: near("main", -0.6, py(POC), 36),
    three: front("main", 46),
    poc: near("main", 0.15, py(POC), 38),
    vah: near("main", 0.15, py(VAH), 38),
    val: near("main", 0.15, py(VAL), 38),
    trapWide: front("main", 46),
    wall: P([SX.main - 0.4, py(POC), 0], [2.2, 1.6, 41]),
    range: front("main", 44),
    edge: near("main", -1.4, py(VAH) - 0.2, 36),
    poll: near("main", -0.6, py(VAH), 32),
    pollBack: near("main", -0.6, py(VAH) - 0.4, 35),
    accept: P([SX.accept - 0.6, py(VAH) - 0.4, 0], [0.9, 1.4, 40]),
    acTest: near("accept", cxOf(AC_TEST), py(VAH) + 0.3, 31),
    acNew: P([SX.accept - 0.3, py(VAH) + 0.2, 0], [0.9, 1.4, 39]),
    reject: P([SX.reject - 0.8, py(VAH) - 0.5, 0], [0.9, 1.4, 38]),
    rjBack: near("reject", cxOf(RJ_BACK), py(VAH), 31),
    rjMirror: near("reject", cxOf(RJ_MIRROR), py(VAL), 34),
    watch: front("watch", 44, -0.4, py(POC) + 0.3),
    middle: near("watch", cxOf(5), py(POC) + 0.2, 33),
    wEdge: near("watch", cxOf(10), py(VAH), 34),
    branch: near("watch", cxOf(13), py(VAH) + 0.1, 36),
    oldPull: front("watch", 42, 0.2, py(POC) + 0.3),
    button: P([mapX, 0.4, 2.5], [0, 0.8, 26], 30, [0, 0, -0.06]),
    map: P([mapX, 0.3, 0.2], [7.5, 12.5, 19.5], 30, [0, 0, -0.05]),
    mapPoc: P([mapX, 0.8, -(POC - 104) * 1.3], [6.2, 9.6, 15], 30, [0, 0, -0.04]),
    mapThin: P([mapX, 0.5, -(105.25 - 104) * 1.3], [6.2, 9.6, 15], 30, [0, 0, -0.04]),
    mapWide: P([mapX, 0.3, 0.2], [7.5, 12.8, 20], 30, [0, 0, -0.04]),
    mapEnd: P([mapX, 0.3, 0.4], [7, 12, 19], 30, [0, 0, -0.04]),
    end: front("end", 45, -0.2, py(POC) + 0.2),
    endPoc: near("end", 0.2, py(POC), 35),
    endFar: front("end", 42, 0.0, py(POC)),
  };
};
let poseCache: ReturnType<typeof POSES> | null = null;
const poses = () => (poseCache ??= POSES());

/** [frame, pose, frames to get there] — slow moves (20–40 frames), lateral set changes ~26 frames */
const keys = (): [number, Pose, number][] => {
  const q = poses();
  return [
    [0, q.hookWide, 1],
    [E("L01_撑住"), q.hookHold, 30],
    [E("L01_一碰就穿"), q.hookBreak, 26],
    [E("L02_那条线"), q.hookBack, 30],
    [E("L04_打开"), q.profile, 28],
    [E("L06_价值区"), q.mainWide, 34],
    [E("L08_真金白银"), q.vote, 36],
    [E("L09_成交最密的地方"), q.pocWide, 30],
    [E("L10_三个数"), q.three, 30],
    [E("L11_成交量"), q.poc, 30],
    [E("L12_上沿"), q.vah, 26],
    [E("L13_下沿"), q.val, 30],
    [E("L14_第一反应"), q.trapWide, 30],
    [E("L16_一堵墙"), q.wall, 34],
    [E("L17_一个区间"), q.range, 30],
    [E("L19_边缘"), q.edge, 28],
    [E("L20_上沿"), q.poll, 36],
    [E("L24_最爱骗"), q.pollBack, 30],
    [E("L25_冲到上沿"), q.accept, 26],
    [E("L26_回踩"), q.acTest, 26],
    [E("L26_接受"), q.acNew, 30],
    [E("L27_冲上去"), q.reject, 26],
    [E("L27_缩回来"), q.rjBack, 22],
    [E("L28_往下也一样"), q.rjMirror, 30],
    [E("L29_碰到线"), q.watch, 26],
    [E("L31_中间"), q.middle, 30],
    [E("L32_边缘"), q.wEdge, 26],
    [E("L33_站住了"), q.branch, 30],
    [E("L35_旧价值"), q.oldPull, 30],
    [E("L36_买卖按钮"), q.button, 26],
    [E("L37_地图"), q.map, 40],
    [E("L38_最认可"), q.mapPoc, 32],
    [E("L39_稀薄"), q.mapThin, 28],
    [E("L40_回到价值区"), q.mapWide, 32],
    [E("L42_认不认"), q.mapEnd, 40],
    [E("L43_中间"), q.end, 26],
    [E("L46_POC"), q.endPoc, 34],
    [E("L47_磁铁"), q.endFar, 40],
  ];
};

const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const drifted = (q: Pose, s: number): Pose => {
  const d = q.d ?? [0, 0, 0];
  return { ...q, p: [q.p[0] + d[0] * s, q.p[1] + d[1] * s, q.p[2] + d[2] * s] };
};
/** camera at frame f: eased moves between key poses, a slow linear creep while holding */
export const cam = (f: number): Pose => {
  const ks = keys();
  let cur = drifted(ks[0][1], f / FPS);
  for (let k = 1; k < ks.length; k++) {
    const [a, q, d] = ks[k];
    if (f < a) break;
    const t = ease((f - a) / d);
    const nxt = drifted(q, Math.max(0, f - a - d) / FPS);
    cur = { p: lerp3(cur.p, nxt.p, t), t: lerp3(cur.t, nxt.t, t), fov: cur.fov + (nxt.fov - cur.fov) * t };
  }
  return cur;
};

export const threeCam = (f: number) => {
  const c = cam(f);
  const k = new THREE.PerspectiveCamera(c.fov, WIDTH / HEIGHT, 0.1, 400);
  k.position.set(...c.p);
  k.lookAt(new THREE.Vector3(...c.t));
  k.setViewOffset(WIDTH, HEIGHT, 0, LAYOUT.viewShift, WIDTH, HEIGHT);
  k.updateMatrixWorld();
  k.updateProjectionMatrix();
  return k;
};
export type Proj = (x: number, y: number, z?: number) => { x: number; y: number };
const projCache = new Map<number, Proj>();
export const projector = (f: number): Proj => {
  const hit = projCache.get(f);
  if (hit) return hit;
  const k = threeCam(f);
  const v = new THREE.Vector3();
  const pr: Proj = (x, y, z = 0) => {
    v.set(x, y, z).project(k);
    return { x: ((v.x + 1) / 2) * WIDTH, y: ((1 - v.y) / 2) * HEIGHT };
  };
  if (projCache.size > 64) projCache.clear();
  projCache.set(f, pr);
  return pr;
};

// ---------------------------------------------------------------- set presence
/** the event each set enters on; a set steps back (yield) 6 frames before the next one enters */
export const SET_IN: Record<SetId, string | null> = {
  hook: null,
  main: "L04_打开",
  accept: "L25_冲到上沿",
  reject: "L27_冲上去",
  watch: "L29_碰到线",
  map: "L36_买卖按钮",
  end: "L43_中间",
};
const ORDER: SetId[] = ["hook", "main", "accept", "reject", "watch", "map", "end"];

export type Presence = { on: boolean; enter: number; yieldK: number; alpha: number; scale: number; dy: number };
/**
 * enter: 0→1 as the set arrives (it rises into place); yieldK: 0→1 as it steps back for the next set —
 * it shrinks a little, moves up, darkens, and the depth of field (focused on the new subject) softens it.
 */
export const presence = (f: number, s: SetId): Presence => {
  const i = ORDER.indexOf(s);
  const inE = SET_IN[s] ? E(SET_IN[s]!) : -1e9;
  const nxt = ORDER[i + 1];
  const outE = nxt ? E(SET_IN[nxt]!) : 1e9;
  const enter = SET_IN[s] ? ease((f - inE) / 20) : 1;
  const yieldK = yieldTo(f, outE, 14);
  const on = f >= inE - 40 && f < outE + 40;
  return { on, enter, yieldK, alpha: (0.35 + 0.65 * enter) * (1 - 0.85 * yieldK), scale: 1 - 0.08 * yieldK, dy: 1.2 * yieldK - 0.5 * (1 - enter) };
};
