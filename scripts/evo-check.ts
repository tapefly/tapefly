/* Prints how each level's start brain and reference brain do, board by board. */
import { LEVELS } from "../sim/evo/levels";
import { SOLUTIONS } from "../sim/evo/solutions";
import { gradeBrain, allowed } from "../sim/evo/game";

const only = process.argv[2];
for (const l of LEVELS) {
  if (only && l.id !== only) continue;
  for (const [name, p] of [["start", l.start], ["solution", SOLUTIONS[l.id]]] as const) {
    const g = gradeBrain(l, p);
    const bad = allowed(l, p);
    console.log(
      `${l.id.padEnd(14)} ${name.padEnd(9)} ${g.cleared ? "CLEARED" : "fails  "} gates=${g.gates} depth=${g.depth} steps=${g.steps} ${bad ? "!! " + bad : ""}`
    );
    for (const r of g.runs) console.log(`   ${r.outcome.padEnd(8)} t=${r.ticks} eaten=${r.eaten}/${r.board.food.length} bumps=${r.bumps}${r.outcome === "loop" ? " loopFrom=" + r.loopFrom : ""}`);
  }
}
