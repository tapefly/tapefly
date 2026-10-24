/* ── sim/levels.ts ───────────────────────────────────────────────────────────
   Brain School: short puzzles that teach the fly's brain one idea at a time.

   Each level is a fixed day (or a few), a starting brain that fails in a way
   you can watch, and three goals. Meeting the first goal clears the level;
   each further goal is a star. Every number here is checked by the tests:
   tests/levels.test.ts holds a brain that earns all three stars on each level,
   so nothing in the school is impossible.

   Scoring is the same engine as everything else: the level's day is the real
   dish of that date, the fly gets that day's founding body. Nothing is faked
   for the game.
   --------------------------------------------------------------------------- */
import type { Program } from "./program";
import { brainFromProgram, duel, examine, type Exam } from "./challenge";
import { compileProgram, netDepth } from "./compile";

export interface DayResult {
  date: string;
  lived: number;
  meals: number;
  alive: boolean;
  place: number;
}

export interface Metrics {
  days: DayResult[];
  gates: number;
  depth: number;
  exam: Exam;
}

export interface Goal {
  text: string;
  met: (m: Metrics) => boolean;
}

export interface Level {
  id: string;
  title: string;
  /** What the player sees first: the situation, in two or three sentences. */
  brief: string;
  /** The idea this level teaches, said plainly once it is cleared. */
  lesson: string;
  hint: string;
  dates: string[];
  start: Program;
  goals: [Goal, Goal, Goal];
  /** Whether the level needs the exam (4096 words) — costs a few ms more. */
  exam?: boolean;
  /** Step-by-step guidance shown until the first star, for a player who has never seen the editor. */
  coach?: string[];
}

const all = (m: Metrics, f: (d: DayResult) => boolean) => m.days.every(f);
const d0 = (m: Metrics) => m.days[0];

const FREEZE: Program = { rules: [], otherwise: { then: 3 } };
const GREEDY: Program = { rules: [], otherwise: { then: 0 } };

export const LEVELS: Level[] = [
  {
    id: "hungry",
    title: "Hungry",
    brief:
      "This fly's brain has one answer for everything: freeze. Food is all around it, and it starves before dusk. Give it a reason to move.",
    lesson: "A brain is a lookup: every situation gets an answer. Change the answer and the same body lives a different day.",
    hint: "Change what the fly does 'otherwise' — try approach. Approach always walks toward the nearest food it knows about.",
    dates: ["2026-10-15"],
    start: FREEZE,
    coach: [
      "Watch the dish: your fly is the gold one marked “you”. It stands still and starves.",
      "Its whole brain is the box below: Otherwise → freeze. Whatever happens, it freezes.",
      "Click approach in that box. Your fly will walk to food, and the stars fill in."
    ],
    goals: [
      { text: "Eat one meal", met: (m) => d0(m).meals >= 1 },
      { text: "Eat five meals", met: (m) => d0(m).meals >= 5 },
      { text: "Live until dusk", met: (m) => d0(m).alive }
    ]
  },
  {
    id: "trap",
    title: "The trap",
    brief:
      "A greedy brain: it walks straight at the nearest food. Today, the nearest food sits beside a trap, and the fly dies in two steps. Teach it to notice danger.",
    lesson: "Order matters. A rule near the top wins, so the rules that keep the fly alive go first.",
    hint: "Add a rule above everything else: when threat is 2 or more, avoid.",
    dates: ["2026-10-16"],
    start: GREEDY,
    goals: [
      { text: "Live 50 ticks", met: (m) => d0(m).lived >= 50 },
      { text: "Live until dusk", met: (m) => d0(m).alive },
      { text: "Reach dusk with eight meals", met: (m) => d0(m).alive && d0(m).meals >= 8 }
    ]
  },
  {
    id: "standoff",
    title: "The stand-off",
    brief:
      "This fly fears danger and loves food. Food sits just past a trap, so it steps back, smells dinner, steps forward, steps back… and starves in place. Break the loop.",
    lesson: "A brain with no memory can still remember one thing: what it did last tick. 'Previous behaviour' turns a twitch into a decision.",
    hint: "Let hunger decide. A very hungry fly can risk a level-1 threat; a fed one should not. Or use 'previous' so an avoiding fly keeps avoiding.",
    dates: ["2026-10-18"],
    start: {
      rules: [
        { when: { threat: [1, 3] }, then: 1, label: "fear" },
        { when: { food: [1, 3] }, then: 0, label: "hunger" }
      ],
      otherwise: { then: 2 }
    },
    goals: [
      { text: "Live 100 ticks", met: (m) => d0(m).lived >= 100 },
      { text: "Eat five meals", met: (m) => d0(m).meals >= 5 },
      { text: "Live until dusk", met: (m) => d0(m).alive }
    ]
  },
  {
    id: "jump",
    title: "Jump!",
    brief:
      "Real flies have a Giant Fibre: one huge neuron that fires a jump when something looms. This brain never fires it. Wire the escape — and nothing else.",
    lesson: "The Giant Fibre is the fly's reflex of last resort: it must fire every time the threat is close, and never when it is not.",
    hint: "The reference fly jumps when threat is 2 or more. Tick 'Giant Fibre' on a rule that matches exactly that.",
    dates: ["2026-10-11"],
    exam: true,
    start: {
      rules: [{ when: { food: [1, 3] }, then: 0 }],
      otherwise: { then: 2 }
    },
    goals: [
      { text: "Fire the escape every time the reference does", met: (m) => m.exam.gfMissed === 0 },
      { text: "…and never when it doesn't", met: (m) => m.exam.gfMissed === 0 && m.exam.gfFalse === 0 },
      { text: "…and live until dusk", met: (m) => m.exam.gfMissed === 0 && m.exam.gfFalse === 0 && d0(m).alive }
    ]
  },
  {
    id: "small",
    title: "Fifty gates",
    brief:
      "Every rule you write becomes NAND gates, and on TapeOut every gate is a transistor someone has to buy. The official brain uses 50. Keep a fly alive with fewer.",
    lesson: "Gates cost. Merge rules that do the same thing, and drop conditions that never change the answer.",
    hint: "Compare gate counts as you delete. A rule whose action matches 'otherwise' and sits last can go.",
    dates: ["2026-10-11"],
    start: {
      rules: [
        { when: { threat: [2, 3] }, then: 1, gf: true },
        { when: { threat: [1, 1], hunger: [0, 1] }, then: 1 },
        { when: { threat: [1, 1] }, prev: [1], then: 1 },
        { when: { food: [1, 3], hunger: [2, 3] }, then: 0 },
        { when: { food: [3, 3] }, then: 0 },
        { when: { food: [2, 3] }, prev: [0], then: 0 },
        { when: { novelty: [2, 3] }, then: 2 },
        { when: { light: [1, 3] }, then: 2 }
      ],
      otherwise: { then: 3 }
    },
    goals: [
      { text: "Live until dusk with 40 gates or fewer", met: (m) => d0(m).alive && m.gates <= 40 },
      { text: "…with 25 gates or fewer", met: (m) => d0(m).alive && m.gates <= 25 },
      { text: "…with 8 gates or fewer", met: (m) => d0(m).alive && m.gates <= 8 }
    ]
  },
  {
    id: "reference",
    title: "Think like a fly",
    brief:
      "FLY-LIF/0 is a reference fly written from the literature: 4,096 situations, one answer each. The official brain agrees on 85.3%. Get closer.",
    lesson: "Survival is one test; resemblance is another. A brain can be good at living and still not behave like a fly.",
    hint: "Open the exam to see which situations you get wrong. Hunger and threat together are where most disagreement lives.",
    dates: ["2026-10-11"],
    exam: true,
    start: {
      rules: [
        { when: { threat: [2, 3] }, then: 1, gf: true },
        { when: { food: [1, 3] }, then: 0 }
      ],
      otherwise: { then: 2 }
    },
    goals: [
      { text: "Agree on 88% of situations", met: (m) => m.exam.agree >= 3605 },
      { text: "Agree on 95%", met: (m) => m.exam.agree >= 3892 },
      { text: "Agree on every one of them", met: (m) => m.exam.agree === 4096 }
    ]
  },
  {
    id: "week",
    title: "One brain, seven days",
    brief:
      "A brain tuned for one dish can fail in the next. Here is a whole week of dishes. The official brain reaches dusk once.",
    lesson: "A good reflex is general. If a rule only helps on one day, it is luck, not behaviour.",
    hint: "Watch the days you lose. Starving and walking into traps need different fixes, and both fixes must hold every day.",
    dates: ["2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"],
    start: FREEZE,
    goals: [
      { text: "Reach dusk on 3 of 7 days", met: (m) => m.days.filter((d) => d.alive).length >= 3 },
      { text: "Reach dusk on 5 of 7 days", met: (m) => m.days.filter((d) => d.alive).length >= 5 },
      { text: "Reach dusk on all 7", met: (m) => all(m, (d) => d.alive) }
    ]
  },
  {
    id: "clutch",
    title: "Beat the clutch",
    brief:
      "Eight sibling flies share this dish, all running the official brain. You get the same body as the first of them. Out-live them — and to win a tie, out-eat them.",
    lesson: "That is the whole game. From here, every day has a new dish and a board. Build a brain, bring it every day.",
    hint: "Ties go to the flies, so living to dusk is not enough when they do too: you also need more meals.",
    dates: ["2026-10-13"],
    start: GREEDY,
    goals: [
      { text: "Finish in the top half", met: (m) => d0(m).place <= 4 },
      { text: "Finish first", met: (m) => d0(m).place === 1 },
      { text: "Finish first with 12 meals", met: (m) => d0(m).place === 1 && d0(m).meals >= 12 }
    ]
  }
];

export function levelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

const NO_EXAM: Exam = { agree: 0, behaviour: 0, gfCaught: 0, gfMissed: 0, gfFalse: 0 };

export function measure(level: Level, p: Program): Metrics {
  const brain = brainFromProgram(p);
  const days = level.dates.map((date) => {
    const d = duel(brain, date);
    return { date, lived: d.lived, meals: d.meals, alive: d.day.alive, place: d.place };
  });
  return { days, gates: brain.netlist.gates.length, depth: netDepth(brain.netlist), exam: level.exam ? examine(brain.netlist) : NO_EXAM };
}

/** Stars earned (0..3). Goals are cumulative: a star needs every goal before it. */
export function stars(level: Level, m: Metrics): number {
  let s = 0;
  for (const g of level.goals) {
    if (!g.met(m)) break;
    s++;
  }
  return s;
}

export function grade(level: Level, p: Program): { metrics: Metrics; stars: number; goals: boolean[] } {
  const metrics = measure(level, p);
  return { metrics, stars: stars(level, metrics), goals: level.goals.map((g) => g.met(metrics)) };
}

export { compileProgram };
