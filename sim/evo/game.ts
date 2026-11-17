/* ── sim/evo/game.ts ─────────────────────────────────────────────────────────
   Grading a brain on a level. Three scores, the same three a chip designer
   trades against each other:

     gates  how many NAND gates the brain compiles to (area — what you pay for)
     depth  the longest chain of gates from a sense to an action (delay)
     steps  ticks summed over every test board (how fast the fly behaves)

   A level is cleared when the brain clears every test board.
   --------------------------------------------------------------------------- */
import type { Netlist } from "../netlist";
import { compileBrain, depthOf, type EvoProgram } from "./brain";
import { parseBoard, run, type Board, type Run } from "./world";
import type { EvoLevel } from "./levels";

export interface Grade {
  netlist: Netlist;
  runs: Run[];
  cleared: boolean;
  passed: number;
  gates: number;
  depth: number;
  steps: number;
}

const boards = new Map<string, Board[]>();
export function levelBoards(l: EvoLevel): Board[] {
  let b = boards.get(l.id);
  if (!b) { b = l.tests.map(parseBoard); boards.set(l.id, b); }
  return b;
}

export function organsOf(l: EvoLevel) {
  return { senses: l.senses, smellRange: l.smellRange };
}

export function gradeBrain(l: EvoLevel, p: EvoProgram, netlist: Netlist = compileBrain(p)): Grade {
  const runs = levelBoards(l).map((b) => run(b, netlist, organsOf(l), l.limit));
  const passed = runs.filter((r) => r.outcome === "cleared").length;
  return {
    netlist,
    runs,
    cleared: passed === runs.length,
    passed,
    gates: netlist.gates.length,
    depth: depthOf(netlist),
    steps: runs.reduce((s, r) => s + r.ticks, 0)
  };
}

/** Does the program only use what this level has grown? */
export function allowed(l: EvoLevel, p: EvoProgram): string | null {
  const acts = [p.otherwise, ...p.rules];
  for (const r of p.rules) for (const k of Object.keys(r.when)) if (!l.senses.includes(k as never)) return `sense ${k} not grown`;
  for (const a of acts) {
    if (!l.acts.includes(a.act)) return `action ${a.act} not available`;
    if (a.mem !== undefined && !l.memory) return "memory not grown";
  }
  return null;
}
