// Dedicated entry for LVP订单流 · 吸收 (xishou-v1). It bundles only this film, so no other
// composition's remote font loaders run: rendering needs no network access.
import { registerRoot } from "remotion";
import { XishouRoot } from "./Root";

registerRoot(XishouRoot);
