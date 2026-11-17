import { RIVALS, budgetFor, report, fightRival, seedFor, TACTIC_IDS, PART_IDS, type TacticId } from "./sim/arena";
import type { GearId } from "./sim/duel";
function subsets<T>(a: T[], k: number): T[][] { if (k === 0) return [[]]; if (a.length < k) return []; const [h, ...t] = a; return [...subsets(t, k - 1).map((s) => [h, ...s]), ...subsets(t, k)]; }
function perms<T>(a: T[]): T[][] { if (a.length <= 1) return [a]; return a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])); }
const date = "2026-11-03";
RIVALS.forEach((rv, i) => {
  const budget = budgetFor(i), slots = Math.min(3, Math.floor(i / 2));
  const gears: GearId[][] = []; for (let k = 0; k <= slots; k++) gears.push(...subsets(PART_IDS, k));
  let win = 0, tot = 0;
  for (let k = 1; k <= 3; k++) for (const s of subsets([...TACTIC_IDS], k)) for (const p of perms(s as TacticId[])) {
    if (report(p).gates > budget) continue;
    for (const g of gears) { tot++; if (fightRival(p, g, rv, seedFor(date, i), i).winner === 0) win++; }
  }
  console.log(i, rv.name, rv.ai ? "AI" : "", "budget", budget, "gear slots", slots, "winning builds", win, "/", tot, Math.round(100 * win / tot) + "%");
});
