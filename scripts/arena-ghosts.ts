/* npm run arena:ghosts — write Brain Brawl's AI rivals (sim/arena-ghosts.json).
   Each is found by the local search in sim/arena.ts, inside the gate budget
   and body slots of the fight it appears in, against every rival before it
   and a few plain plans.
   Deterministic. `--check` fails if the file is stale. */
import { writeFileSync, readFileSync } from "node:fs";
import { RIVALS, budgetFor, design, report, type Rival } from "../sim/arena";

const NAMES = ["Cyd", "Dex", "Eve", "Fox", "Gus", "Hal"];
const hand = RIVALS.filter((r) => !r.ai);
// besides every rival before it, each AI must beat the plain plans a new player tries first,
// so none of them can win by standing still (an empty brain would take a stand-off on the tie-break)
const PLAIN: Rival[] = [
  { name: "empty", ai: false, chips: [], gear: [] },
  { name: "bite", ai: false, chips: ["bite"], gear: [] },
  { name: "block-bite", ai: false, chips: ["block", "bite"], gear: ["shell"] },
  { name: "dodge-punish", ai: false, chips: ["sidestep", "punish", "bite"], gear: ["legs"] },
  { name: "block-punish", ai: false, chips: ["block", "punish", "bite"], gear: ["shell"] }
];
const pool: Rival[] = [...hand, ...PLAIN];
const out: { name: string; chips: string[]; gear: string[]; gates: number; budget: number }[] = [];
for (let k = 0; k < NAMES.length; k++) {
  const i = hand.length + k;
  const budget = budgetFor(i);
  const slots = Math.min(3, 1 + Math.floor(k / 2));
  const d = design(budget, slots, pool, k + 1);
  out.push({ name: NAMES[k], chips: d.chips, gear: d.gear, gates: report(d.chips).gates, budget });
  pool.push({ name: NAMES[k], ai: true, chips: d.chips, gear: d.gear });
}
const text = JSON.stringify(out, null, 2) + "\n";
const file = new URL("../sim/arena-ghosts.json", import.meta.url);
if (process.argv.includes("--check")) {
  if (readFileSync(file, "utf8") !== text) { console.error("sim/arena-ghosts.json is stale: run npm run arena:ghosts"); process.exit(1); }
  console.log("arena ghosts up to date");
} else { writeFileSync(file, text); for (const o of out) console.log(o.name, o.gates + "/" + o.budget, o.chips.join(","), "|", o.gear.join(",")); }
