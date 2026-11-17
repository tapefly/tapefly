import { levelById } from "../sim/evo/levels";
import { SOLUTIONS } from "../sim/evo/solutions";
import { gradeBrain } from "../sim/evo/game";
import { runRules } from "../sim/evo/brain";
const [id, ti] = process.argv.slice(2);
const l = levelById(id)!;
const p = SOLUTIONS[id];
const g = gradeBrain(l, p);
const r = g.runs[Number(ti)];
const b = r.board;
for (const f of r.frames) {
  const rows: string[] = [];
  for (let y = 0; y < b.h; y++) { let s = ""; for (let x = 0; x < b.w; x++) { const c = b.grid[y*b.w+x]; s += x===f.x&&y===f.y ? "^>v<"[f.dir] : c===1?"#":c===2?"x":b.food.some((q,i)=>q.x===x&&q.y===y && !r.frames.slice(1, f.t+1).some(z=>z.ate===i))?"f":"."; } rows.push(s); }
  console.log(`t=${f.t} mem=${f.mem} rule=${f.t?runRules(p, f.word).rule:"-"} ev=${f.event}`);
  if (f.t >= (r.loopFrom >= 0 ? r.loopFrom - 3 : 0)) console.log(rows.join("\n"));
}
console.log(r.outcome);
