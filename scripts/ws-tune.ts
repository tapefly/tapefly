import { makeWorld, step, partWorld, type Setup } from "../sim/workshop/physics";
import type { Design, PlacedPart, Wire } from "../sim/workshop/parts";
import { outcomeOf } from "../sim/workshop/game";
import type { WLevel } from "../sim/workshop/levels";
export const P = (id: string, kind: PlacedPart["kind"], x: number, y: number, dir = 0): PlacedPart => ({ id, kind, x, y, dir });
export const W = (from: string, to: string, inv = false, port?: "set" | "reset"): Wire => ({ from, to, inv, ...(port ? { port } : {}) });
export function run(l: WLevel, d: Design, i = 0, trace = false) {
  const w = makeWorld(l.setups[i], d);
  let o;
  while (!(o = outcomeOf(l, w))) {
    step(w);
    if (trace && w.t % 30 === 0) {
      const v = Math.hypot(w.vx, w.vy);
      console.log((w.t / 60).toFixed(1), w.x.toFixed(2), w.y.toFixed(2), Math.round(w.a * 180 / Math.PI), "v", v.toFixed(2), w.parts.filter((p) => p.on).map((p) => p.id).join(","));
    }
  }
  return { o, t: (w.t / 60).toFixed(1), x: w.x.toFixed(1), y: w.y.toFixed(1) };
}
