/* ── sim/workshop/duel.ts ───────────────────────────────────────────────────
   Two designs, one level, no luck. Both flies run the same arenas from the same
   start, and because the simulation is deterministic anyone can re-run the
   match and get the same result — a score here cannot be asserted, only shown.

   The order of the tie-breaks is the whole design: behaviour first, efficiency
   second. A fly that finishes beats a smaller brain that does not.
   --------------------------------------------------------------------------- */
import { compileWiring } from "./compile";
import { designCost, type Design } from "./parts";
import { problems, runSetup, type WOutcome } from "./game";
import type { WLevel } from "./levels";

export interface Side {
  /** per arena */
  outcomes: WOutcome[];
  ticks: number[];
  /** arenas finished */
  cleared: number;
  /** total ticks over every arena, the lower the faster */
  total: number;
  gates: number;
  bits: number;
  cost: number;
  /** a design that cannot be flown at all (loose part, logic loop…) */
  problems: string[];
}

export type Step = "legal" | "cleared" | "time" | "gates" | "parts" | "tie";

export interface Duel {
  levelId: string;
  a: Side;
  b: Side;
  winner: "a" | "b" | "tie";
  /** which test decided it */
  by: Step;
  zh: string;
  en: string;
}

export function sideOf(l: WLevel, d: Design): Side {
  const bad = problems(l, d);
  const runs = l.setups.map((_, i) => runSetup(l, d, i));
  const chip = compileWiring(d);
  return {
    outcomes: runs.map((r) => r.outcome),
    ticks: runs.map((r) => r.ticks),
    cleared: runs.filter((r) => r.outcome === "cleared").length,
    total: runs.reduce((s, r) => s + r.ticks, 0),
    gates: chip.gates.length,
    bits: chip.state.length,
    cost: designCost(d),
    problems: bad
  };
}

/** Lower is better on every one of these, in order. Each line has to read as a
    whole sentence after the winner's name, so they are written that way. */
const LADDER: { step: Step; of: (s: Side) => number; zh: (n: number) => string; en: (n: number) => string }[] = [
  { step: "legal", of: (s) => (s.problems.length ? 1 : 0), zh: () => "不战而胜 —— 对手根本飞不起来", en: () => "wins by default: the other one cannot fly at all" },
  { step: "cleared", of: (s) => -s.cleared, zh: (n) => `多过了 ${n} 个场地`, en: (n) => `cleared ${n} more arena${n === 1 ? "" : "s"}` },
  { step: "time", of: (s) => s.total, zh: (n) => `快了 ${(n / 60).toFixed(2)} 秒`, en: (n) => `was ${(n / 60).toFixed(2)}s faster` },
  { step: "gates", of: (s) => s.gates, zh: (n) => `成绩一样，但脑子少了 ${n} 个门`, en: (n) => `matched it with ${n} fewer gate${n === 1 ? "" : "s"}` },
  { step: "parts", of: (s) => s.cost, zh: (n) => `成绩一样，但省了 ${n} 点零件`, en: (n) => `matched it for ${n} less in parts` }
];

export function duel(l: WLevel, a: Design, b: Design): Duel {
  const A = sideOf(l, a), B = sideOf(l, b);
  for (const rung of LADDER) {
    const x = rung.of(A), y = rung.of(B);
    if (x === y) continue;
    const win = x < y ? "a" : "b";
    const gap = Math.abs(x - y);
    return { levelId: l.id, a: A, b: B, winner: win, by: rung.step, zh: rung.zh(gap), en: rung.en(gap) };
  }
  return { levelId: l.id, a: A, b: B, winner: "tie", by: "tie", zh: "分不出高下：每一项都一样", en: "dead even: identical on every count" };
}

/** The scoreboard line for one side, for a share card or a list. */
export const sideLine = (s: Side, zh: boolean) =>
  zh
    ? `${s.cleared}/${s.outcomes.length} 过关 · ${(s.total / 60).toFixed(1)} 秒 · ${s.gates} 门`
    : `${s.cleared}/${s.outcomes.length} cleared · ${(s.total / 60).toFixed(1)}s · ${s.gates} gates`;
