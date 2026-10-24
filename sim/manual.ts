/* ── sim/manual.ts ───────────────────────────────────────────────────────────
   "Be the fly": the same dish, the same body, the same physics — but a person
   chooses each step instead of a circuit. One key press is one tick.

   The rules of a tick are copied from simulate() in sim/engine.ts, in the same
   order: sense where you stand, move, eat, get hungrier, check the traps and
   the hunger limit. tests/manual.test.ts drives this stepper with the moves an
   official fly made and checks it lands on exactly the same cells, meals and
   death, so the two cannot drift apart.
   --------------------------------------------------------------------------- */
import { TUNE, WORLD, nearest, senseFromDist, lightAt, type Cell, type Tune, type World } from "./engine";
import { encodeInputs, type Senses } from "./encode";
import { foundingOn } from "./lineage";
import { dishFor } from "./challenge";

export type Move = "up" | "down" | "left" | "right" | "stay";

export interface ManualTick {
  t: number;
  x: number;
  y: number;
  hunger: number;
  behavior: string; // "explore" when it moved, "freeze" when it stayed (for drawing)
  gf: boolean;
  ate: boolean;
  alive: boolean;
  inWord: number; // what the fly sensed before this move, as the circuit would see it
}

export interface ManualDay {
  date: string;
  seed: number;
  world: World;
  tune: Tune;
  pos: Cell;
  hunger: number;
  alive: boolean;
  foodLeft: Cell[];
  visits: Map<number, number>;
  prev: number; // previous behaviour, as the circuit sees it
  ticks: ManualTick[];
  meals: number;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const key = (c: Cell) => c.y * WORLD.w + c.x;

export function startManual(date: string): ManualDay {
  const founding = foundingOn(date);
  const { seed, world } = dishFor(date, founding);
  const tune: Tune = { ...TUNE, ...founding };
  const pos = { x: clamp(world.start.x + tune.startX, 0, WORLD.w - 1), y: clamp(world.start.y + tune.startY, 0, WORLD.h - 1) };
  return { date, seed, world, tune, pos, hunger: 0, alive: true, foodLeft: world.food.map((c) => ({ ...c })), visits: new Map(), prev: 2, ticks: [], meals: 0 };
}

/** What the fly senses where it stands now — the five values the circuit would read. */
export function sensesOf(d: ManualDay): Senses {
  const T = d.tune;
  const f = nearest(d.pos, d.foodLeft);
  const g = nearest(d.pos, d.world.danger);
  const v = d.visits.get(key(d.pos)) ?? 0;
  return {
    food: f ? senseFromDist(f.d, T) : 0,
    threat: g ? senseFromDist(g.d, T) : 0,
    light: lightAt(d.pos.y) >>> 0,
    novelty: Math.max(0, 1000 - v * T.visitDecay),
    hunger: Math.min(1000, d.hunger)
  };
}

export function done(d: ManualDay): boolean {
  return !d.alive || d.ticks.length >= d.tune.ticks;
}

/** One tick. Returns a new day; the old one is untouched (handy for undo-free UIs and tests). */
/**
 * `as` names the behaviour this move counts as for the next tick's "previous
 * behaviour" bits (0 approach · 1 avoid · 2 explore · 3 freeze). A person just
 * moves, so by default a step is "explore" and standing still is "freeze".
 */
export function step(d0: ManualDay, move: Move, as?: number): ManualDay {
  if (done(d0)) return d0;
  const d: ManualDay = { ...d0, pos: { ...d0.pos }, foodLeft: d0.foodLeft.slice(), visits: new Map(d0.visits), ticks: d0.ticks.slice() };
  const T = d.tune;
  const inWord = encodeInputs(sensesOf(d), d.prev);

  const dx = move === "left" ? -1 : move === "right" ? 1 : 0;
  const dy = move === "up" ? -1 : move === "down" ? 1 : 0;
  d.pos = { x: clamp(d.pos.x + dx, 0, WORLD.w - 1), y: clamp(d.pos.y + dy, 0, WORLD.h - 1) };
  d.visits.set(key(d.pos), (d.visits.get(key(d.pos)) ?? 0) + 1);

  let ate = false;
  const fi = d.foodLeft.findIndex((c) => c.x === d.pos.x && c.y === d.pos.y);
  if (fi >= 0) {
    d.foodLeft.splice(fi, 1);
    d.hunger = Math.max(0, d.hunger - T.hFood);
    ate = true;
    d.meals++;
  }
  d.hunger += T.hStep;
  if (d.world.danger.some((c) => c.x === d.pos.x && c.y === d.pos.y)) d.alive = false;
  if (d.hunger >= T.hMax) d.alive = false;

  const moved = dx !== 0 || dy !== 0;
  d.prev = as ?? (moved ? 2 : 3);
  d.ticks.push({ t: d.ticks.length, x: d.pos.x, y: d.pos.y, hunger: Math.min(d.hunger, T.hMax), behavior: moved ? "explore" : "freeze", gf: false, ate, alive: d.alive, inWord });
  return d;
}

/** The move that takes a fly from one cell to the next (for replaying a recorded day). */
export function moveBetween(a: Cell, b: Cell): Move {
  if (b.x < a.x) return "left";
  if (b.x > a.x) return "right";
  if (b.y < a.y) return "up";
  if (b.y > a.y) return "down";
  return "stay";
}
