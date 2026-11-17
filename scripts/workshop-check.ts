import { WLEVELS } from "../sim/workshop/levels";
import { WSOLUTIONS } from "../sim/workshop/solutions";
import { gradeDesign } from "../sim/workshop/game";
import { makeWorld, step, partWorld } from "../sim/workshop/physics";
const only = process.argv[2];
for (const l of WLEVELS) {
  if ((only && l.id !== only) || !WSOLUTIONS[l.id]) continue;
  const d = WSOLUTIONS[l.id];
  const g = gradeDesign(l, d);
  console.log(l.id.padEnd(9), g.cleared ? "CLEARED" : "fails  ", "cost", g.cost, "gates", g.gates, "sec", g.seconds.toFixed(1), g.problems.join(","));
  g.runs.forEach((r, i) => console.log("   ", i, r.outcome, "t", (r.ticks / 60).toFixed(1), "knocked", r.knocked, "broken", r.broken));
  if (process.argv[3] === "trace") {
    const w = makeWorld(l.setups[Number(process.argv[4] ?? 0)], d);
    for (let k = 0; k < l.seconds * 60; k++) { step(w); if (k % 30 === 0) console.log((k / 60).toFixed(1), w.x.toFixed(2), w.y.toFixed(2), (w.a * 180 / Math.PI).toFixed(0), w.parts.map((p) => p.kind + (p.on ? "*" : "")).join(" ")); }
  }
}
