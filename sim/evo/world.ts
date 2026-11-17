/* ── sim/evo/world.ts ────────────────────────────────────────────────────────
   One run of one fly through one board, as integer arithmetic. The same brain
   on the same board gives the same run on every machine, so a run can be
   replayed, shared and checked.

   Boards are drawn in text:
     #  wall          .  floor          f  food (a drop of sugar)
     x  spider web (a fly that walks into it is caught)
     ^ > v <  the fly's start, facing up / right / down / left
   Outside the drawing counts as wall.

   Every tick: sense → the netlist decides → act → consequences. A run ends when
   the last food is eaten (cleared), the fly is caught, the time runs out, or
   the fly is caught in a loop: the world here is static, so if the fly ever
   stands in the same place, facing the same way, with the same memory and the
   same food left, it will repeat itself forever. We stop it and say so.
   --------------------------------------------------------------------------- */
import { evalTrace, type Netlist } from "../netlist";
import { FIELDS, type FieldId, field, NIN } from "./brain";

export interface Cell { x: number; y: number }

export interface Board {
  w: number;
  h: number;
  /** row-major; 0 floor · 1 wall · 2 web */
  grid: Uint8Array;
  food: Cell[];
  start: Cell & { dir: number };
}

/** Headings: 0 up · 1 right · 2 down · 3 left. */
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export function parseBoard(rows: string[]): Board {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const grid = new Uint8Array(w * h);
  const food: Cell[] = [];
  let start: (Cell & { dir: number }) | null = null;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const c = row[x] ?? "#";
      if (c === "#") grid[y * w + x] = 1;
      else if (c === "x") grid[y * w + x] = 2;
      else if (c === "f") food.push({ x, y });
      else if ("^>v<".includes(c)) start = { x, y, dir: "^>v<".indexOf(c) };
      else if (c !== ".") throw new Error(`board: unknown cell '${c}'`);
    }
  });
  if (!start) throw new Error("board: no start");
  return { w, h, grid, food, start };
}

export const cellAt = (b: Board, x: number, y: number) => (x < 0 || y < 0 || x >= b.w || y >= b.h ? 1 : b.grid[y * b.w + x]);

export interface Organs {
  /** Senses the fly has grown; the rest read 0. */
  senses: FieldId[];
  /** How far the nose reaches, in steps (Manhattan). */
  smellRange: number;
}

export type Event = "eat" | "bump" | "caught" | null;

export interface Frame {
  t: number;
  x: number;
  y: number;
  dir: number;
  mem: number;
  /** what the fly sensed and decided this tick */
  word: number;
  out: number;
  event: Event;
  /** index into board.food of the meal eaten this tick, else −1 */
  ate: number;
}

export type Outcome = "cleared" | "caught" | "timeout" | "loop";

export interface Run {
  board: Board;
  /** frames[0] is the start (no decision yet); frames[i] is the state after tick i. */
  frames: Frame[];
  outcome: Outcome;
  ticks: number;
  eaten: number;
  bumps: number;
  /** first tick of the repeating stretch, when outcome is "loop" */
  loopFrom: number;
}

/** Relative direction of a target: 1 ahead · 2 right · 3 behind · 4 left. */
export function relDir(dir: number, dx: number, dy: number): number {
  const f = dx * DX[dir] + dy * DY[dir]; // forward component
  const r = dx * DX[(dir + 1) & 3] + dy * DY[(dir + 1) & 3]; // rightward component
  if (Math.abs(f) >= Math.abs(r)) return f > 0 ? 1 : 3;
  return r > 0 ? 2 : 4;
}

export function sense(b: Board, organs: Organs, x: number, y: number, dir: number, mem: number, left: boolean[]): number {
  const has = (id: FieldId) => organs.senses.includes(id);
  const at = (d: number) => cellAt(b, x + DX[d], y + DY[d]);
  const vals: Record<FieldId, number> = { wallF: 0, wallL: 0, wallR: 0, smell: 0, web: 0, mem: 0 };
  if (has("wallF")) vals.wallF = at(dir) === 1 ? 1 : 0;
  if (has("wallL")) vals.wallL = at((dir + 3) & 3) === 1 ? 1 : 0;
  if (has("wallR")) vals.wallR = at((dir + 1) & 3) === 1 ? 1 : 0;
  if (has("web")) vals.web = at(dir) === 2 ? 1 : 0;
  if (has("mem")) vals.mem = mem;
  if (has("smell")) {
    let best = -1, bd = Infinity;
    b.food.forEach((c, i) => {
      if (!left[i]) return;
      const d = Math.abs(c.x - x) + Math.abs(c.y - y);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0 && bd <= organs.smellRange) vals.smell = relDir(dir, b.food[best].x - x, b.food[best].y - y);
  }
  let w = 0;
  for (const f of FIELDS) w |= vals[f.id] << f.lo;
  return w;
}

export function decide(n: Netlist, word: number): number {
  const sig = evalTrace(n, word);
  let out = 0;
  const first = sig.length - n.nOut;
  for (let k = 0; k < n.nOut; k++) out |= sig[first + k] << k;
  return out;
}

/** Run one board to its end. `limit` ticks at most. */
export function run(b: Board, n: Netlist, organs: Organs, limit: number): Run {
  if (n.nIn !== NIN) throw new Error("netlist: wrong input width");
  let { x, y, dir } = b.start;
  let mem = 0;
  const left = b.food.map(() => true);
  let eaten = 0, bumps = 0;
  const frames: Frame[] = [{ t: 0, x, y, dir, mem, word: 0, out: 0, event: null, ate: -1 }];
  let seen = new Map<number, number>();
  let outcome: Outcome = "timeout";
  let loopFrom = -1;
  // decisions are cached per word: the netlist is pure
  const cache = new Map<number, number>();
  if (b.food.length === 0) outcome = "cleared";
  for (let t = 1; t <= limit && b.food.length > 0; t++) {
    const k = ((y * b.w + x) * 4 + dir) * 2 + mem;
    const prev = seen.get(k);
    if (prev !== undefined) { outcome = "loop"; loopFrom = prev; break; }
    seen.set(k, t - 1);

    const word = sense(b, organs, x, y, dir, mem, left);
    let out = cache.get(word);
    if (out === undefined) { out = decide(n, word); cache.set(word, out); }
    const act = out & 3;
    let event: Event = null;
    let ate = -1;
    if (act === 1) {
      const nx = x + DX[dir], ny = y + DY[dir];
      const c = cellAt(b, nx, ny);
      if (c === 1) { event = "bump"; bumps++; }
      else { x = nx; y = ny; if (c === 2) event = "caught"; }
    } else if (act === 2) dir = (dir + 3) & 3;
    else if (act === 3) dir = (dir + 1) & 3;
    if (out & 4) mem = (out >> 3) & 1;
    if (event !== "caught") {
      const i = b.food.findIndex((c, j) => left[j] && c.x === x && c.y === y);
      if (i >= 0) { left[i] = false; eaten++; event = "eat"; ate = i; seen = new Map(); }
    }
    frames.push({ t, x, y, dir, mem, word, out, event, ate });
    if (event === "caught") { outcome = "caught"; break; }
    if (eaten === b.food.length) { outcome = "cleared"; break; }
  }
  return { board: b, frames, outcome, ticks: frames.length - 1, eaten, bumps, loopFrom };
}

export { field };
