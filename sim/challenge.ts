/* ── sim/challenge.ts ────────────────────────────────────────────────────────
   Put any brain in today's dish.

   A challenger is a circuit — written as rules in the builder, or a netlist
   imported from JSON or TapeOut bytes. It gets the day's founding body (the
   genome member 0 was born with) and the very same dish the eight official
   flies live in. Then it is ranked against them: how long it lived, then how
   many meals it found.

   A single day can be lucky, so the leaderboard uses a *week*: the seven days
   ending on a date, summed. Still a pure function of the date and the circuit —
   anybody can recompute any score.
   --------------------------------------------------------------------------- */
import { simulate, worldFor, TUNE, WORLD, type Brain, type Day, type Cell } from "./engine";
import { colony, type Colony } from "./colony";
import { mutate, type Genome } from "./genome";
import { foundingOn, seedFromDate, addDays } from "./lineage";
import { checkNetlist, evalWord, type Netlist } from "./netlist";
import { compileProgram, cost, netDepth } from "./compile";
import { runProgram, type Program } from "./program";
import { decideRef } from "./reference";
import { stream } from "./rand";
import { namesFor } from "./names";
import { COLONY_SIZE } from "./colony";

export const MAX_GATES = 4096;

/* ── brains ──────────────────────────────────────────────────────────────── */

export function brainFromProgram(p: Program): Brain {
  const netlist = compileProgram(p);
  return { netlist, label: (w) => { const r = runProgram(p, w).rule; return r < 0 ? "otherwise" : p.rules[r].label || `rule ${r + 1}`; } };
}

export function brainFromNetlist(n: Netlist): Brain {
  return { netlist: n, label: () => "circuit" };
}

/**
 * Accepts a netlist as JSON ({nIn, nOut, gates}) or as TapeOut bytes in hex
 * (`0x00 | u24 a | u24 b` per NAND record). Throws with a reason otherwise.
 */
export function importNetlist(text: string): Netlist {
  const s = text.trim();
  let n: Netlist;
  if (s.startsWith("{")) {
    const j = JSON.parse(s);
    n = { version: String(j.version ?? "IMPORTED"), nIn: Number(j.nIn), nOut: Number(j.nOut), gates: j.gates };
  } else {
    const hex = s.replace(/^0x/i, "").replace(/\s+/g, "");
    if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 14 !== 0) throw new Error("not JSON, and not TapeOut bytes (7 bytes per gate, hex)");
    const gates: [number, number][] = [];
    for (let i = 0; i < hex.length; i += 14) {
      const op = parseInt(hex.slice(i, i + 2), 16);
      if (op !== 0) throw new Error(`record ${i / 14}: only NAND (0x00) is supported — the fly has no memory cells`);
      gates.push([parseInt(hex.slice(i + 2, i + 8), 16), parseInt(hex.slice(i + 8, i + 14), 16)]);
    }
    n = { version: "IMPORTED", nIn: 12, nOut: 3, gates };
  }
  if (n.nIn !== 12 || n.nOut !== 3) throw new Error("the fly's brain has 12 inputs and 3 outputs");
  if (!Array.isArray(n.gates) || n.gates.length === 0) throw new Error("no gates");
  if (n.gates.length > MAX_GATES) throw new Error(`at most ${MAX_GATES} gates`);
  for (const g of n.gates) if (!Array.isArray(g) || g.length !== 2 || !g.every((x) => Number.isInteger(x) && x >= 0)) throw new Error("each gate is [a, b]");
  checkNetlist(n);
  return n;
}

/* ── the exam: agreement with the reference fly ──────────────────────────── */

export interface Exam {
  agree: number;        // full 3-bit match, of 4096
  behaviour: number;    // behaviour bits match, of 4096
  gfCaught: number;     // escapes the reference fires that this brain also fires
  gfMissed: number;
  gfFalse: number;      // escapes fired when the reference would not
}

export function examine(n: Netlist): Exam {
  const e: Exam = { agree: 0, behaviour: 0, gfCaught: 0, gfMissed: 0, gfFalse: 0 };
  for (let w = 0; w < 4096; w++) {
    const b = evalWord(n, w), r = decideRef(w).out;
    if (b === r) e.agree++;
    if ((b & 3) === (r & 3)) e.behaviour++;
    const bg = (b & 4) !== 0, rg = (r & 4) !== 0;
    if (rg && bg) e.gfCaught++; else if (rg) e.gfMissed++; else if (bg) e.gfFalse++;
  }
  return e;
}

/* ── the duel ────────────────────────────────────────────────────────────── */

export interface Entry {
  name: string;
  lived: number;
  meals: number;
  alive: boolean;
  challenger: boolean;
}

export interface Duel {
  date: string;
  day: Day;            // the challenger's whole life
  colony: Colony;
  table: Entry[];      // nine rows, best first
  place: number;       // 1..9
  lived: number;
  meals: number;
}

const better = (a: { lived: number; meals: number }, b: { lived: number; meals: number }) =>
  a.lived !== b.lived ? a.lived > b.lived : a.meals > b.meals;

/** The founding body and the world it shares with the day's eight flies. */
export function dishFor(date: string, founding: Genome) {
  const seed = seedFromDate(date);
  const names = namesFor(seed, COLONY_SIZE);
  const genomes = names.map((_, i) => (i === 0 ? { ...founding } : mutate(founding, stream(seed, 0x1000 + i))));
  const clampCell = (v: number, hi: number) => Math.max(0, Math.min(hi - 1, v));
  const starts: Cell[] = genomes.map((g) => ({ x: clampCell((WORLD.w >> 1) + g.startX, WORLD.w), y: clampCell((WORLD.h >> 1) + g.startY, WORLD.h) }));
  return { seed, world: worldFor(seed, TUNE.food, TUNE.danger, starts) };
}

/** Run a brain for one day in the official dish, with the official body. */
export function liveDay(brain: Brain, date: string, founding: Genome = foundingOn(date)): Day {
  const { seed, world } = dishFor(date, founding);
  return simulate(seed, date, { ...founding }, world, brain);
}

/* The official clutch of a date never changes, so it is computed once per date. */
const clutches = new Map<string, Colony>();
export function clutchOf(date: string, founding: Genome = foundingOn(date)): Colony {
  const key = date + JSON.stringify(founding);
  let c = clutches.get(key);
  if (!c) {
    c = colony(seedFromDate(date), date, founding);
    if (clutches.size > 64) clutches.clear();
    clutches.set(key, c);
  }
  return c;
}

export function duel(brain: Brain, date: string, founding: Genome = foundingOn(date), name = "you"): Duel {
  const c = clutchOf(date, founding);
  const day = liveDay(brain, date, founding);
  const me: Entry = { name, lived: day.ticks.length, meals: day.ticks.filter((t) => t.ate).length, alive: day.alive, challenger: true };
  const rows: Entry[] = c.members.map((m) => ({ name: m.name, lived: m.lived, meals: m.meals, alive: m.alive, challenger: false }));
  rows.push(me);
  // challengers lose ties: they must beat a fly, not match it
  rows.sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : a.challenger ? 1 : b.challenger ? -1 : 0));
  return { date, day, colony: c, table: rows, place: rows.indexOf(me) + 1, lived: me.lived, meals: me.meals };
}

/* ── the week: what the leaderboard ranks ────────────────────────────────── */

export interface Week {
  through: string;
  days: { date: string; lived: number; meals: number; alive: boolean; place: number }[];
  survived: number;   // days lived to dusk
  lived: number;      // ticks, summed
  meals: number;
  places: number;     // sum of places (lower is better)
  /** One number for the board: survived days first, then ticks lived, then meals. */
  score: number;
}

export const WEEK = 7;

export function week(brain: Brain, through: string): Week {
  const days = [];
  for (let i = WEEK - 1; i >= 0; i--) {
    const date = addDays(through, -i);
    const d = duel(brain, date);
    days.push({ date, lived: d.lived, meals: d.meals, alive: d.day.alive, place: d.place });
  }
  const survived = days.filter((d) => d.alive).length;
  const lived = days.reduce((s, d) => s + d.lived, 0);
  const meals = days.reduce((s, d) => s + d.meals, 0);
  const places = days.reduce((s, d) => s + d.place, 0);
  return { through, days, survived, lived, meals, places, score: survived * 1_000_000 + lived * 1000 + meals };
}

/* ── a card that sums up any brain ───────────────────────────────────────── */

export interface Card {
  gates: number;
  depth: number;
  cost: number;
  exam: Exam;
}

export function card(n: Netlist): Card {
  return { gates: n.gates.length, depth: netDepth(n), cost: cost(n), exam: examine(n) };
}
