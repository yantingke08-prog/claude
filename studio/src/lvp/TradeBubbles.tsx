import { useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "../lib/rng";
import { ease } from "../lib/gsap";
import { BRAND } from "./brand";
import { MARKET } from "./market";
import { SYMBOL, sampleSymbol, symbolToWorld } from "./logo";
import { beadWorld } from "./GoldSymbol";

const EXTRA = 36;
const popEase = ease("back.out(2.2)");
const flyEase = ease("power3.inOut");

/**
 * Large trades printed on the tape. Each of the mark's 25 beads is born here as a bubble on the
 * price path - sized by its trade - and later flies home to its bead. The extras are the noise
 * of the session: they fall into the body and vanish.
 */
export const TradeBubbles: React.FC<{ headX: number; converge: number; time: number }> = ({ headX, converge, time }) => {
  const data = useMemo(() => {
    const rand = mulberry32(31);
    const order = SYMBOL.beads.map((b, i) => ({ i, x: b[0] })).sort((a, b) => a.x - b.x);
    const fill = sampleSymbol(EXTRA, "fill", 21);
    const bubbles = [
      ...order.map(({ i }, rank) => {
        const x = -6.3 + (10.9 * rank) / (order.length - 1) + (rand() - 0.5) * 0.3;
        const target = beadWorld(i);
        return {
          x,
          y: MARKET.priceAt(x) + (rand() - 0.5) * 0.06,
          r: 0.05 + SYMBOL.beads[i][2] * 0.0046,
          buy: rand() < 0.58,
          to: [target.x, target.y, 0] as const,
          rTo: target.r,
          delay: Math.abs(rank - order.length / 2) / order.length * 0.4,
          dome: 0.6,
        };
      }),
      ...Array.from({ length: EXTRA }, (_, k) => {
        const x = MARKET.X0 + 0.6 + rand() * 11.6;
        const [tx, ty] = symbolToWorld(fill[k * 2], fill[k * 2 + 1]);
        return {
          x,
          y: MARKET.priceAt(x) + (rand() - 0.5) * 0.08,
          r: 0.022 + Math.pow(rand(), 2) * 0.06,
          buy: rand() < 0.5,
          to: [tx, ty, 0] as const,
          rTo: 0,
          delay: rand() * 0.3,
          dome: 1,
        };
      }),
    ];
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 36, 22),
      new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0.75, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08 }),
      bubbles.length,
    );
    mesh.frustumCulled = false;
    return { bubbles, mesh };
  }, []);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();
  const gold = new THREE.Color("#E7B759");
  const buy = new THREE.Color(BRAND.softGold);
  const sell = new THREE.Color("#B4C6EE");

  data.bubbles.forEach((b, i) => {
    const born = popEase(Math.min(1, Math.max(0, (headX - b.x) / 0.32)));
    const p = Math.min(1, Math.max(0, (converge - b.delay) / 0.6));
    const e = flyEase(p);
    const arc = Math.sin(p * Math.PI);
    const bob = (1 - e) * 0.012 * Math.sin(time * 3 + i);
    pos.set(b.x + (b.to[0] - b.x) * e, b.y + (b.to[1] - b.y) * e + bob, 0.12 * (1 - e) + arc * (0.9 + (i % 5) * 0.25));
    const r = Math.max(0.0001, (b.r + (b.rTo - b.r) * e) * born);
    scl.set(r, r, r * (1 + (b.dome - 1) * e));
    m.compose(pos, q, scl);
    data.mesh.setMatrixAt(i, m);
    col.copy(b.buy ? buy : sell).lerp(gold, e);
    data.mesh.setColorAt(i, col);
  });
  data.mesh.instanceMatrix.needsUpdate = true;
  if (data.mesh.instanceColor) data.mesh.instanceColor.needsUpdate = true;
  return <primitive object={data.mesh} />;
};
