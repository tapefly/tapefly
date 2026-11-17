/* ── sim/workshop/game.ts ───────────────────────────────────────────────────
   Running a design through a level, headless. Scores: parts cost, NAND gates
   of the wiring, and time.
   --------------------------------------------------------------------------- */
import { makeWorld, partWorld, step, type World } from "./physics";
import { gateOrder } from "./brain";
import { designCost, looseParts, PARTS, type Design } from "./parts";
import { compileWiring } from "./compile";
import type { WLevel } from "./levels";

export type WOutcome = "cleared" | "timeout" | "caught" | "smashed";

export interface WRun { outcome: WOutcome; ticks: number; knocked: number; eaten: number; broken: number }

export const NEST_R = 1.5;

/** Has the goal been met right now (ignoring any time it must then be held)? */
export function goalMet(l: WLevel, w: World): boolean {
  const g = l.goal;
  if (g.kind === "free") return false;
  if (g.kind === "knock") return w.knocked >= g.n;
  if (g.kind === "eat") return g.any ? w.eaten.some(Boolean) : w.eaten.every(Boolean);
  const n = w.setup.nest;
  if (!n || !w.eaten.every(Boolean)) return false;
  const core = w.parts.find((p) => p.kind === "core");
  if (!core) return false;
  const [cx, cy] = partWorld(w, core);
  return Math.hypot(cx - n.x, cy - n.y) < NEST_R;
}

export function outcomeOf(l: WLevel, w: World): WOutcome | null {
  if (w.caught >= 0) return "caught";
  if (w.smashed) return "smashed";
  if (w.doneAt < 0 && goalMet(l, w)) w.doneAt = w.t;
  const stay = l.goal.kind === "eat" ? l.goal.stay ?? 0 : 0;
  if (w.doneAt >= 0 && w.t - w.doneAt >= stay * 60) return "cleared";
  if (w.t >= l.seconds * 60) return "timeout";
  return null;
}

export function runSetup(l: WLevel, d: Design, i: number): WRun {
  const w = makeWorld(l.setups[i], d);
  let o: WOutcome | null = null;
  while (!(o = outcomeOf(l, w))) step(w);
  return { outcome: o, ticks: w.t, knocked: w.knocked, eaten: w.eaten.filter(Boolean).length, broken: w.events.filter((e) => e.kind === "break").length };
}

export function problems(l: WLevel, d: Design): string[] {
  const out: string[] = [];
  if (looseParts(d).size) out.push("loose");
  if (designCost(d) > l.budget) out.push("budget");
  for (const p of d.parts) if (p.kind !== "core" && !l.parts.includes(p.kind)) out.push("part:" + p.kind);
  for (const x of d.wires) if (x.inv && !l.logic) out.push("logic");
  if (!l.logic && Object.values(d.modes).some((m) => m === "all")) out.push("logic");
  if (!l.wiring && d.wires.some((x) => x.from !== "core")) out.push("wiring");
  if (gateOrder(d).loop.size) out.push("loop");
  return out;
}

export function gradeDesign(l: WLevel, d: Design) {
  const runs = l.setups.map((_, i) => runSetup(l, d, i));
  const cleared = runs.every((r) => r.outcome === "cleared");
  return {
    runs,
    cleared,
    cost: designCost(d),
    gates: compileWiring(d).gates.length,
    bits: compileWiring(d).state.length,
    seconds: runs.reduce((s, r) => s + r.ticks, 0) / 60,
    problems: problems(l, d)
  };
}

export const partCount = (d: Design) => d.parts.length;
export { PARTS };
