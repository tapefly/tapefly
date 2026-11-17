/* ── scripts/evo-histo.ts ────────────────────────────────────────────────────
   Builds the score distributions shown after a level is cleared. Until real
   players' scores exist, the population is brains found by a search: random
   brains improved by mutation, plus random walks away from known solutions,
   keeping every distinct brain that clears the level. The page says so.

     npx tsx scripts/evo-histo.ts            # writes sim/evo/histos.json
   --------------------------------------------------------------------------- */
import { writeFileSync } from "node:fs";
import { LEVELS, type EvoLevel } from "../sim/evo/levels";
import { SOLUTIONS } from "../sim/evo/solutions";
import { gradeBrain } from "../sim/evo/game";
import { encodeBrain, field, MAX_RULES, type Act, type EvoProgram, type EvoRule, type FieldId } from "../sim/evo/brain";
import { mulberry32 } from "../sim/rand";

const TARGET = Number(process.argv[2] ?? 400);

function mutate(l: EvoLevel, p: EvoProgram, rnd: () => number): EvoProgram {
  const q: EvoProgram = { rules: p.rules.map((r) => ({ ...r, when: { ...r.when } })), otherwise: { ...p.otherwise } };
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const senses = l.senses;
  const randMask = (id: FieldId) => {
    const n = field(id).n, full = (1 << n) - 1;
    let m = 0;
    while (m === 0 || m === full) m = Math.floor(rnd() * full) + 1;
    return m;
  };
  const randAct = (): { act: Act; mem?: 0 | 1 } => {
    const a: { act: Act; mem?: 0 | 1 } = { act: pick(l.acts) };
    if (l.memory && rnd() < 0.3) a.mem = rnd() < 0.5 ? 0 : 1;
    return a;
  };
  const newRule = (): EvoRule => {
    const when: EvoRule["when"] = {};
    const k = 1 + Math.floor(rnd() * Math.min(2, senses.length));
    for (let i = 0; i < k; i++) { const s = pick(senses); when[s] = randMask(s); }
    return { when, ...randAct() };
  };
  const op = Math.floor(rnd() * 7);
  if (senses.length === 0 || (op === 0 && q.rules.length < MAX_RULES)) {
    if (senses.length > 0) q.rules.splice(Math.floor(rnd() * (q.rules.length + 1)), 0, newRule());
    else q.otherwise = randAct();
  } else if (op === 1 && q.rules.length > 0) q.rules.splice(Math.floor(rnd() * q.rules.length), 1);
  else if (op === 2 && q.rules.length > 1) { const i = Math.floor(rnd() * (q.rules.length - 1)); [q.rules[i], q.rules[i + 1]] = [q.rules[i + 1], q.rules[i]]; }
  else if (op === 3 && q.rules.length > 0) { const r = pick(q.rules); const s = pick(senses); r.when[s] = randMask(s); }
  else if (op === 4 && q.rules.length > 0) { const r = pick(q.rules); const ks = Object.keys(r.when) as FieldId[]; if (ks.length > 1) delete r.when[pick(ks)]; }
  else if (op === 5 && q.rules.length > 0) { const r = pick(q.rules); const a = randAct(); r.act = a.act; if (a.mem === undefined) delete r.mem; else r.mem = a.mem; }
  else q.otherwise = randAct();
  return q;
}

const score = (l: EvoLevel, p: EvoProgram) => {
  const g = gradeBrain(l, p);
  const eaten = g.runs.reduce((s, r) => s + r.eaten, 0);
  return { g, f: g.passed * 10000 + eaten * 100 - g.steps * 0.1 - g.gates };
};

const out: Record<string, { n: number; gates: number[]; steps: number[]; depth: number[] }> = {};
for (const l of LEVELS) {
  const rnd = mulberry32(0x7a9e + l.id.length * 977 + l.chapter);
  const found = new Map<string, { gates: number; steps: number; depth: number }>();
  const keep = (p: EvoProgram) => {
    const { g } = score(l, p);
    if (g.cleared) found.set(encodeBrain(p), { gates: g.gates, steps: g.steps, depth: g.depth });
    return g.cleared;
  };
  let budget = 60000;
  // 1. climbs from the start brain
  for (let restart = 0; restart < 40 && found.size < TARGET && budget > 0; restart++) {
    let cur = l.start, cs = score(l, cur).f;
    for (let i = 0; i < 600 && budget-- > 0; i++) {
      const nx = mutate(l, cur, rnd);
      const ns = score(l, nx);
      if (ns.g.cleared) found.set(encodeBrain(nx), { gates: ns.g.gates, steps: ns.g.steps, depth: ns.g.depth });
      if (ns.f >= cs || rnd() < 0.02) { cur = nx; cs = ns.f; }
    }
  }
  // 2. random walks through cleared brains, from the known solution
  let cur = SOLUTIONS[l.id];
  keep(cur);
  for (let i = 0; i < 20000 && found.size < TARGET && budget-- > 0; i++) {
    const nx = mutate(l, cur, rnd);
    if (keep(nx)) cur = nx;
    else if (rnd() < 0.05) cur = SOLUTIONS[l.id];
  }
  const v = [...found.values()];
  out[l.id] = { n: v.length, gates: v.map((x) => x.gates), steps: v.map((x) => x.steps), depth: v.map((x) => x.depth) };
  const min = (k: "gates" | "steps" | "depth") => Math.min(...v.map((x) => x[k]));
  console.log(`${l.id.padEnd(14)} n=${v.length}  best gates=${min("gates")} steps=${min("steps")} depth=${min("depth")}`);
}
writeFileSync("sim/evo/histos.json", JSON.stringify(out));
