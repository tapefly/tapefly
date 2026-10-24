/* ── sim/versus.ts ───────────────────────────────────────────────────────────
   My fly against yours.

   Two brains wake on the same cell of the same dish, in the same body, and
   live the day side by side. The food is shared: whoever reaches a drop first
   eats it, and the other fly's nose immediately points somewhere else. That is
   the only contact between them — they never block or hurt each other — but
   it is enough to make a fast brain starve a slow one.

   A match is seven rounds: the seven dishes ending on the match date. The date
   travels in the link, so a match never changes after it is sent. A round goes
   to the fly that lived longer, then the one that ate more; otherwise it is a
   draw. Identical brains draw every round.

   The tick rules are those of simulate() in sim/engine.ts, step for step.
   tests/versus.test.ts runs one fly alone through this file and checks it
   matches the engine tick for tick, so the two cannot drift apart.
   --------------------------------------------------------------------------- */
import { TUNE, WORLD, nearest, senseFromDist, lightAt, type Brain, type Cell, type Tune, type World } from "./engine";
import { encodeInputs, decodeOutputs } from "./encode";
import { evalWord } from "./netlist";
import { mulberry32 } from "./rand";
import { foundingOn, addDays } from "./lineage";
import { dishFor } from "./challenge";
import { decodeProgram, encodeProgram, type Program } from "./program";

export const ROUNDS = 7;
const BEHAVIOURS = ["approach", "avoid", "explore", "freeze"] as const;

export interface VsTick {
  t: number;
  x: number;
  y: number;
  hunger: number;
  inWord: number;
  outWord: number;
  behavior: string;
  gf: boolean;
  ate: boolean;
  /** this meal was a drop the other fly was also standing on (shared) */
  shared: boolean;
  alive: boolean;
}

export interface Life {
  ticks: VsTick[];
  lived: number;
  meals: number;
  alive: boolean;
  /** drops this fly ate that the other fly's nose was pointing at that tick */
  snatched: number;
  /** how it ended, if it did */
  death: "trap" | "starved" | null;
}

export interface Round {
  date: string;
  world: World;
  lives: Life[];
  /** index of the winning fly, or -1 for a draw */
  winner: number;
}

export interface Match {
  through: string;
  rounds: Round[];
  wins: number[];
  draws: number;
  /** index of the winning fly, or -1 for a drawn match */
  winner: number;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const key = (c: Cell) => c.y * WORLD.w + c.x;

function stepToward(from: Cell, to: Cell): Cell {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let { x, y } = from;
  if (dx !== 0 && Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)) x += dx;
  else if (dy !== 0) y += dy;
  return { x: clamp(x, 0, WORLD.w - 1), y: clamp(y, 0, WORLD.h - 1) };
}

const stepAway = (from: Cell, away: Cell): Cell => stepToward(from, { x: from.x + (from.x - away.x), y: from.y + (from.y - away.y) });

interface State {
  brain: Brain;
  pos: Cell;
  hunger: number;
  alive: boolean;
  prev: number;
  visits: Map<number, number>;
  life: Life;
}

/**
 * Any number of flies in one dish with shared food. With a single fly this is
 * exactly simulate(); the tests hold it to that.
 */
export function together(brains: Brain[], date: string, founding = foundingOn(date)): { world: World; lives: Life[] } {
  const { seed, world } = dishFor(date, founding);
  const T: Tune = { ...TUNE, ...founding };
  const start: Cell = { x: clamp(world.start.x + T.startX, 0, WORLD.w - 1), y: clamp(world.start.y + T.startY, 0, WORLD.h - 1) };
  const foodLeft = world.food.map((c) => ({ ...c }));
  const flies: State[] = brains.map((brain) => ({
    brain, pos: { ...start }, hunger: 0, alive: true, prev: 2, visits: new Map(),
    life: { ticks: [], lived: 0, meals: 0, alive: true, snatched: 0, death: null }
  }));

  for (let t = 0; t < T.ticks && flies.some((f) => f.alive); t++) {
    // everyone senses the dish as it stands at the start of the tick, then moves
    const plans = flies.map((f) => {
      if (!f.alive) return null;
      const nFood = nearest(f.pos, foodLeft);
      const nDanger = nearest(f.pos, world.danger);
      const v = f.visits.get(key(f.pos)) ?? 0;
      const senses = {
        food: nFood ? senseFromDist(nFood.d, T) : 0,
        threat: nDanger ? senseFromDist(nDanger.d, T) : 0,
        light: lightAt(f.pos.y) >>> 0,
        novelty: Math.max(0, 1000 - v * T.visitDecay),
        hunger: Math.min(1000, f.hunger)
      };
      const inWord = encodeInputs(senses, f.prev);
      const outWord = evalWord(f.brain.netlist, inWord);
      const { behavior, gf } = decodeOutputs(outWord);
      let pos = f.pos;
      if (behavior === "approach" && nFood) pos = stepToward(f.pos, nFood.cell);
      else if (behavior === "avoid" && nDanger) pos = stepAway(f.pos, nDanger.cell);
      else if (behavior === "explore") {
        const r = mulberry32((seed ^ Math.imul(t + 1, 0x9e3779b1)) >>> 0);
        const d = Math.floor(r() * 4);
        pos = { x: clamp(f.pos.x + (d === 0 ? -1 : d === 1 ? 1 : 0), 0, WORLD.w - 1), y: clamp(f.pos.y + (d === 2 ? -1 : d === 3 ? 1 : 0), 0, WORLD.h - 1) };
      }
      return { inWord, outWord, behavior, gf, pos, target: behavior === "approach" && nFood ? key(nFood.cell) : -1 };
    });

    // then the meals: a drop goes to whoever stands on it; two flies arriving together share it
    const eaten = new Set<number>();
    flies.forEach((f, i) => {
      const p = plans[i];
      if (!p) return;
      f.pos = p.pos;
      f.visits.set(key(f.pos), (f.visits.get(key(f.pos)) ?? 0) + 1);
    });
    flies.forEach((f, i) => {
      const p = plans[i];
      if (!p) return;
      let ate = false, shared = false;
      const k = key(f.pos);
      if (eaten.has(k) || foodLeft.some((c) => key(c) === k)) {
        ate = true;
        eaten.add(k);
        f.hunger = Math.max(0, f.hunger - T.hFood);
        f.life.meals++;
        shared = flies.some((g, j) => j !== i && plans[j] && key(plans[j]!.pos) === k);
        if (!shared && plans.some((q, j) => j !== i && q && q.target === k)) f.life.snatched++;
      }
      f.hunger += T.hStep;
      if (world.danger.some((c) => key(c) === k)) { f.alive = false; f.life.death = "trap"; }
      else if (f.hunger >= T.hMax) { f.alive = false; f.life.death = "starved"; }
      f.life.ticks.push({ t, x: f.pos.x, y: f.pos.y, hunger: Math.min(f.hunger, T.hMax), inWord: p.inWord, outWord: p.outWord, behavior: p.behavior, gf: p.gf, ate, shared, alive: f.alive });
      f.prev = BEHAVIOURS.indexOf(p.behavior as (typeof BEHAVIOURS)[number]);
    });
    for (let j = foodLeft.length - 1; j >= 0; j--) if (eaten.has(key(foodLeft[j]))) foodLeft.splice(j, 1);
  }

  for (const f of flies) {
    f.life.lived = f.life.ticks.length;
    f.life.alive = f.life.ticks.length > 0 && f.life.ticks[f.life.ticks.length - 1].alive;
  }
  return { world, lives: flies.map((f) => f.life) };
}

const beats = (a: Life, b: Life) => (a.lived !== b.lived ? a.lived > b.lived : a.meals > b.meals);

export function round(a: Brain, b: Brain, date: string): Round {
  const { world, lives } = together([a, b], date);
  const winner = beats(lives[0], lives[1]) ? 0 : beats(lives[1], lives[0]) ? 1 : -1;
  return { date, world, lives, winner };
}

/** Seven rounds: the dishes of the seven days ending on `through`. */
export function match(a: Brain, b: Brain, through: string): Match {
  const rounds: Round[] = [];
  for (let i = ROUNDS - 1; i >= 0; i--) rounds.push(round(a, b, addDays(through, -i)));
  const wins = [0, 1].map((k) => rounds.filter((r) => r.winner === k).length);
  const draws = rounds.filter((r) => r.winner === -1).length;
  return { through, rounds, wins, draws, winner: wins[0] > wins[1] ? 0 : wins[1] > wins[0] ? 1 : -1 };
}

/* ── a challenge is a link ───────────────────────────────────────────────── */

export interface Side { program: Program; name: string }
export interface Challenge { a: Side; b: Side | null; through: string }

export const MAX_NAME = 24;
export const cleanName = (s: string | null | undefined, fallback: string) => {
  const n = (s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, MAX_NAME);
  return n || fallback;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `?a=p1…&an=Name&b=p1…&bn=Name&d=YYYY-MM-DD` — b is optional (an open challenge). */
export function challengeQuery(c: Challenge): string {
  const q = new URLSearchParams();
  q.set("a", encodeProgram(c.a.program));
  q.set("an", c.a.name);
  if (c.b) { q.set("b", encodeProgram(c.b.program)); q.set("bn", c.b.name); }
  q.set("d", c.through);
  return q.toString();
}

/** Reads a challenge from a query; throws with a reason when the link is broken. */
export function readChallenge(q: URLSearchParams, fallbackDate: string): Challenge {
  const a = q.get("a");
  if (!a) throw new Error("This link has no fly in it.");
  const d = q.get("d");
  const through = d && DATE_RE.test(d) ? d : fallbackDate;
  const side = (p: string, n: string | null, fb: string): Side => ({ program: decodeProgram(p), name: cleanName(n, fb) });
  return { a: side(a, q.get("an"), "Challenger"), b: q.get("b") ? side(q.get("b")!, q.get("bn"), "Rival") : null, through };
}
