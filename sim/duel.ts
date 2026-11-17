/* ── sim/duel.ts ─────────────────────────────────────────────────────────────
   Brain Brawl's fight: two flies in a dish, fighting in real time.

   The brain is the same kind of circuit as the daily fly's: 12 input bits,
   3 output bits, compiled by sim/compile.ts and evaluated gate by gate. Only
   the meaning of the bits changes (profile DUEL-12x3/1):

     input  bits 0-1  dist    0 far · 1 mid · 2 near · 3 in reach
            bits 2-3  foe     0 moving · 1 guarding · 2 winding up · 3 open (recovering or staggered)
            bits 4-5  myhp    0 critical · 1 low · 2 hurt · 3 healthy
            bits 6-7  foehp   same levels, for the rival
            bits 8-9  energy  0 empty · 1 low · 2 fair · 3 full
            bits 10-11 prev   the move this fly made last tick
     output bits 0-1  move    0 press · 1 back off · 2 circle · 3 guard
            bit 2     bite    start a bite if energy allows

   The body does the rest: a bite winds up (the rival can see it), lunges, and
   lands if the rival is still in reach; a guard soaks most of it and leaves the
   biter staggered and open; a bite that lands during the rival's own wind-up
   interrupts it. Senses arrive with a short delay, so reading a wind-up is
   possible but not free.

   Everything is a pure function of the two brains, their bodies and the seed.
   Arithmetic is +, -, ×, ÷ and sqrt only, so every machine replays the same
   fight bit for bit. Nothing here draws; the page replays the frames.
   --------------------------------------------------------------------------- */
import { compileProgram, cost, netDepth } from "./compile";
import { evalWord, type Netlist } from "./netlist";
import { runProgram, type Program, type ProgramRule } from "./program";
import { mulberry32 } from "./rand";

/* ── the interface ───────────────────────────────────────────────────────── */

export const DUEL_PROFILE = "DUEL-12x3/1";
export const MOVES = ["press", "back", "circle", "guard"] as const;
export type Move = 0 | 1 | 2 | 3;
export const PRESS = 0, BACK = 1, CIRCLE = 2, GUARD = 3;
export const FOE = { moving: 0, guarding: 1, winding: 2, open: 3 } as const;

export type DuelField = "dist" | "foe" | "myhp" | "foehp" | "energy";
/* The duel fields ride on the program's five sense slots, in this order. */
const SLOT: Record<DuelField, "food" | "threat" | "light" | "novelty" | "hunger"> = { dist: "food", foe: "threat", myhp: "light", foehp: "novelty", energy: "hunger" };

export interface DuelRule {
  when: Partial<Record<DuelField, [number, number]>>;
  prev?: Move[];
  then: Move;
  bite?: boolean;
}

export function toProgram(rules: DuelRule[], otherwise: { then: Move; bite?: boolean } = { then: PRESS }): Program {
  const conv = (r: DuelRule): ProgramRule => {
    const when: ProgramRule["when"] = {};
    for (const [k, v] of Object.entries(r.when) as [DuelField, [number, number]][]) when[SLOT[k]] = v;
    const out: ProgramRule = { when, then: r.then };
    if (r.prev && r.prev.length) out.prev = r.prev.slice();
    if (r.bite) out.gf = true;
    return out;
  };
  return { rules: rules.map(conv), otherwise: otherwise.bite ? { then: otherwise.then, gf: true } : { then: otherwise.then } };
}

/** The other way: a program over the duel profile back to duel rules (for the editor and shared links). */
export function fromProgram(p: Program): { rules: DuelRule[]; otherwise: { then: Move; bite?: boolean } } {
  const back = Object.fromEntries(Object.entries(SLOT).map(([k, v]) => [v, k])) as Record<string, DuelField>;
  const rules = p.rules.map((r) => {
    const when: DuelRule["when"] = {};
    for (const [slot, v] of Object.entries(r.when)) if (v && back[slot]) when[back[slot]] = [v[0], v[1]];
    const out: DuelRule = { when, then: (r.then & 3) as Move };
    if (r.prev && r.prev.length) out.prev = r.prev.map((x) => (x & 3) as Move);
    if (r.gf) out.bite = true;
    return out;
  });
  return { rules, otherwise: { then: (p.otherwise.then & 3) as Move, ...(p.otherwise.gf ? { bite: true } : {}) } };
}

export function packWord(dist: number, foe: number, myhp: number, foehp: number, energy: number, prev: number): number {
  return (dist & 3) | ((foe & 3) << 2) | ((myhp & 3) << 4) | ((foehp & 3) << 6) | ((energy & 3) << 8) | ((prev & 3) << 10);
}

/* ── bodies ──────────────────────────────────────────────────────────────── */

export const GEAR_IDS = ["jaws", "shell", "legs", "venom", "lungs", "spines"] as const;
export type GearId = (typeof GEAR_IDS)[number];

export interface Body {
  maxHp: number;
  dmg: number;
  speed: number;
  regen: number;
  venom: boolean;
  spines: boolean;
}

export const BASE: Body = { maxHp: 100, dmg: 15, speed: 2.2, regen: 0.5, venom: false, spines: false };

export function bodyOf(gear: readonly GearId[]): Body {
  const b: Body = { ...BASE };
  for (const g of gear) {
    if (g === "jaws") b.dmg += 4;
    else if (g === "shell") b.maxHp += 30;
    else if (g === "legs") b.speed *= 1.2;
    else if (g === "venom") b.venom = true;
    else if (g === "lungs") b.regen *= 1.4;
    else if (g === "spines") b.spines = true;
  }
  return b;
}

/* ── numbers that shape a fight ──────────────────────────────────────────── */

export const T = {
  hz: 30, // ticks per second
  ticks: 900, // 30 s
  arena: 300, // dish radius
  radius: 11, // fly body radius
  reach: 30, // fighting range, centre to centre
  jaw: 12, // the bite closes this far ahead of the biter, along the line it committed to
  bite: 10, // and catches a body whose edge is this close to that point
  biteCost: 30,
  windup: 12, // ticks a bite takes to land
  lunge: 1.35, // × speed while winding up
  recover: 10, // ticks after a bite, open
  blockPush: 12, // a bite into a guard bounces the biter back this hard
  staggerInterrupted: 12,
  guardTakes: 0.25, // share of a bite a guard lets through
  guardRegen: 2.2, // × regen while guarding
  knock: 14, // knockback speed on a clean bite
  interruptBonus: 1.5,
  venomTicks: 45,
  venomPerTick: 0.12,
  spineDmg: 4, // a bite into a guarding spined fly hurts the biter
  delay: 5, // senses lag at least this many ticks (each fly, each tick: 5..9 from the seed, about a human reaction)
  delayJitter: 5,
  guardUp: 3, // ticks a guard takes to come up
  critChance: 0.12,
  critMult: 1.6,
  friction: 0.82,
  turn: 0.09, // radians a fly can turn per tick
  turnGuard: 0.035, // ...and while it holds its guard up
  guardArc: 1.0 // a guard covers this many radians either side of where the fly faces
} as const;

/* ── state ───────────────────────────────────────────────────────────────── */

type Phase = "free" | "windup" | "recover" | "stagger";

interface Fly {
  x: number; y: number; vx: number; vy: number;
  hp: number; energy: number;
  phase: Phase; timer: number;
  move: Move; guard: boolean;
  poison: number;
  dir: 1 | -1; // which way it circles
  lx: number; ly: number; // a bite commits to a direction when it starts
  h: number; // heading, radians
  up: number; // ticks the guard has been held
  biteRule: number; // the rule that started the bite in progress
  body: Body;
  net: Netlist;
  program: Program;
}

export interface FlyFrame {
  x: number; y: number;
  /** heading in radians: guards only cover the front */
  h: number;
  hp: number; energy: number;
  move: Move;
  phase: Phase;
  /** 0..1 progress of a wind-up, recovery or stagger */
  p: number;
  guard: boolean;
  poisoned: boolean;
  /** rule of the program that decided this tick (-1 = otherwise; during a bite, the rule that started it;
      -2 = none, the fly is recovering or dazed), and the input word */
  rule: number;
  word: number;
}

export type DuelEventKind = "bite" | "crit" | "blocked" | "interrupt" | "whiff" | "spines" | "venom" | "ko";
export interface DuelEvent { t: number; kind: DuelEventKind; by: number; on: number; dmg: number; x: number; y: number }

export interface DuelResult {
  frames: FlyFrame[][]; // frames[t][i]
  events: DuelEvent[];
  /** 0 or 1, or -1 for a draw */
  winner: number;
  /** "ko" when a fly fell, "time" when the clock ran out */
  how: "ko" | "time";
  ticks: number;
  hpLeft: [number, number];
}

export interface Fighter { program: Program; gear?: readonly GearId[] }

const hpLevel = (hp: number, max: number) => { const f = hp / max; return f >= 0.7 ? 3 : f >= 0.4 ? 2 : f >= 0.2 ? 1 : 0; };
const enLevel = (e: number) => (e >= 75 ? 3 : e >= 50 ? 2 : e >= 25 ? 1 : 0);
const distLevel = (d: number) => (d <= T.reach + 4 ? 3 : d <= 70 ? 2 : d <= 140 ? 1 : 0);
/** does a guard facing h at (x, y) cover a bite coming from (bx, by)? */
const covers = (g: { x: number; y: number; h: number }, bx: number, by: number) => Math.abs(angleDiff(Math.atan2(by - g.y, bx - g.x), g.h)) <= T.guardArc;
const angleDiff = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
/** what a fly sees of its rival: a guard that does not face it counts as open */
const foeState = (f: { phase: Phase; guard: boolean; x: number; y: number; h: number }, me: { x: number; y: number }) =>
  f.phase === "windup" ? FOE.winding : f.phase === "recover" || f.phase === "stagger" ? FOE.open : f.guard ? (covers(f, me.x, me.y) ? FOE.guarding : FOE.open) : FOE.moving;

/** Compile once per brain: the same netlist the tape-out path would use. */
export function compileFighter(p: Program) {
  const net = compileProgram(p);
  return { net, gates: net.gates.length, depth: netDepth(net), cost: cost(net) };
}

export function duel(a: Fighter, b: Fighter, seed: number): DuelResult {
  const rnd = mulberry32(seed >>> 0);
  // start on opposite sides of the dish, at a seeded angle
  const k = Math.floor(rnd() * 8);
  const DIRS: [number, number][] = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
  const [ux, uy] = DIRS[k];
  const start = 120 + Math.floor(rnd() * 61); // 120..180 from the centre
  const mk = (f: Fighter, s: number, dir: 1 | -1): Fly => {
    const body = bodyOf(f.gear ?? []);
    return { x: ux * start * s, y: uy * start * s, vx: 0, vy: 0, hp: body.maxHp, energy: 60, phase: "free", timer: 0, move: PRESS, guard: false, poison: 0, dir, lx: 0, ly: 0, h: Math.atan2(-uy * s, -ux * s), up: 0, biteRule: -1, body, net: compileProgram(f.program), program: f.program };
  };
  const flies = [mk(a, -1, 1), mk(b, 1, rnd() < 0.5 ? 1 : -1)];
  const frames: FlyFrame[][] = [];
  const events: DuelEvent[] = [];
  const history: { dist: number }[] = [];
  let winner = -1, how: DuelResult["how"] = "time", end = T.ticks;

  const dist = () => Math.sqrt((flies[0].x - flies[1].x) ** 2 + (flies[0].y - flies[1].y) ** 2);

  for (let t = 0; t < T.ticks; t++) {
    // what each fly perceived: the world as it was T.delay ticks ago (the rival's state and the gap)
    history.push({ dist: dist() });
    const decisions = flies.map((f, i) => {
      const o = flies[1 - i];
      const lag = T.delay + Math.floor(rnd() * T.delayJitter); // how quickly this fly reads the rival this tick
      const past = history[Math.max(0, history.length - 1 - lag)];
      const pastStates = frames.length >= lag ? frames[frames.length - lag] : null;
      const foeNow = pastStates ? stateOfFrame(pastStates[1 - i], pastStates[i]) : foeState(o, f);
      const word = packWord(distLevel(past.dist), foeNow, hpLevel(f.hp, f.body.maxHp), hpLevel(o.hp, o.body.maxHp), enLevel(f.energy), f.move);
      const out = evalWord(f.net, word);
      const rule = runProgram(f.program, word).rule;
      return { word, move: (out & 3) as Move, bite: (out & 4) !== 0, rule };
    });

    // act
    flies.forEach((f, i) => {
      const o = flies[1 - i], d = decisions[i];
      const dx = o.x - f.x, dy = o.y - f.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / len, ny = dy / len;
      f.guard = false;
      if (f.phase !== "free" || d.move !== GUARD) f.up = 0;
      if (f.phase === "free") {
        f.move = d.move;
        if (d.bite && f.energy >= T.biteCost && len <= T.reach * 2.2) {
          f.phase = "windup"; f.timer = T.windup; f.energy -= T.biteCost; f.lx = nx; f.ly = ny; f.biteRule = d.rule;
        } else {
          const sp = f.body.speed;
          let ax = 0, ay = 0;
          if (d.move === PRESS) {
            // close to fighting range, then hold it and sway side to side (footsies), never glue on
            const stance = T.reach - 4;
            if (len > stance + 3) { ax = nx * sp; ay = ny * sp; }
            else {
              const sway = (t + i * 13) % 24 < 12 ? 1 : -1, back = len < stance - 2 ? -0.5 : 0;
              ax = (-ny * f.dir * sway * 0.4 + nx * back) * sp; ay = (nx * f.dir * sway * 0.4 + ny * back) * sp;
            }
          }
          else if (d.move === BACK) { ax = -nx * sp; ay = -ny * sp; }
          else if (d.move === CIRCLE) {
            // sideways, with a little pull to hold the distance it is at
            const hold = len > 60 ? 0.35 : len < 40 ? -0.35 : 0;
            ax = (-ny * f.dir + nx * hold) * sp * 0.95; ay = (nx * f.dir + ny * hold) * sp * 0.95;
          } else { f.up++; f.guard = f.up >= T.guardUp; }
          f.vx = f.vx * T.friction + ax * (1 - T.friction) * 3;
          f.vy = f.vy * T.friction + ay * (1 - T.friction) * 3;
        }
      }
      if (f.phase === "windup") {
        f.vx = f.lx * f.body.speed * T.lunge; f.vy = f.ly * f.body.speed * T.lunge;
      } else if (f.phase === "recover" || f.phase === "stagger") {
        f.vx *= T.friction; f.vy *= T.friction;
      }
      // energy
      if (f.phase === "free") f.energy = Math.min(100, f.energy + f.body.regen * (f.guard ? T.guardRegen : 1));
    });

    // turn: towards the rival, slowly while guarding; a bite faces where it committed
    flies.forEach((f, i) => {
      const o = flies[1 - i];
      if (f.phase === "windup") { f.h = Math.atan2(f.ly, f.lx); return; }
      const want = Math.atan2(o.y - f.y, o.x - f.x), d = angleDiff(want, f.h), max = f.guard ? T.turnGuard : T.turn;
      f.h += Math.max(-max, Math.min(max, d));
    });

    // move and keep inside the dish, and apart
    for (const f of flies) {
      f.x += f.vx; f.y += f.vy;
      const r = Math.sqrt(f.x * f.x + f.y * f.y), lim = T.arena - T.radius;
      if (r > lim) { f.x *= lim / r; f.y *= lim / r; f.vx *= 0.3; f.vy *= 0.3; }
    }
    {
      const dx = flies[1].x - flies[0].x, dy = flies[1].y - flies[0].y, d = Math.sqrt(dx * dx + dy * dy) || 1, min = T.radius * 2 + 2;
      if (d < min) { const push = (min - d) / 2, px = (dx / d) * push, py = (dy / d) * push; flies[0].x -= px; flies[0].y -= py; flies[1].x += px; flies[1].y += py; }
    }

    // timers and bites landing, resolved together: two bites that land on the same tick trade
    const landing = flies.map((f) => f.phase === "windup" && f.timer - 1 <= 0);
    const was = flies.map((f) => ({ phase: f.phase, guard: f.guard, x: f.x, y: f.y, h: f.h }));
    flies.forEach((f) => { if (f.phase !== "free") f.timer--; });
    flies.forEach((f, i) => {
      if (f.phase === "free" || f.timer > 0) return;
      if (f.phase !== "windup") { f.phase = "free"; f.timer = 0; return; }
      const o = flies[1 - i], ow = was[1 - i];
      const dx = o.x - f.x, dy = o.y - f.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      const mx = (f.x + o.x) / 2, my = (f.y + o.y) / 2;
      // the jaws close a little ahead of the head, along the committed line: step off it and the bite misses
      const jx = f.x + f.lx * T.jaw, jy = f.y + f.ly * T.jaw;
      if (Math.hypot(o.x - jx, o.y - jy) > T.radius + T.bite) {
        events.push({ t, kind: "whiff", by: i, on: 1 - i, dmg: 0, x: mx, y: my });
        f.phase = "recover"; f.timer = T.recover;
      } else if (ow.guard && ow.phase === "free" && covers(ow, f.x, f.y)) {
        const dmg = f.body.dmg * T.guardTakes;
        o.hp -= dmg;
        events.push({ t, kind: "blocked", by: i, on: 1 - i, dmg, x: mx, y: my });
        f.phase = "recover"; f.timer = T.recover;
        f.vx = -(dx / d) * T.blockPush; f.vy = -(dy / d) * T.blockPush;
        if (o.body.spines) { f.hp -= T.spineDmg; events.push({ t, kind: "spines", by: 1 - i, on: i, dmg: T.spineDmg, x: f.x, y: f.y }); }
      } else {
        // a bite that lands while the rival is still winding up (and not landing itself) interrupts it
        const interrupt = ow.phase === "windup" && !landing[1 - i];
        const crit = rnd() < T.critChance;
        const dmg = f.body.dmg * (interrupt ? T.interruptBonus : 1) * (crit ? T.critMult : 1);
        o.hp -= dmg;
        events.push({ t, kind: interrupt ? "interrupt" : crit ? "crit" : "bite", by: i, on: 1 - i, dmg, x: mx, y: my });
        o.vx = (dx / d) * T.knock; o.vy = (dy / d) * T.knock;
        if (interrupt) { o.phase = "stagger"; o.timer = T.staggerInterrupted; }
        if (f.body.venom) o.poison = T.venomTicks;
        f.phase = "recover"; f.timer = T.recover;
      }
    });

    // venom
    flies.forEach((f, i) => {
      if (f.poison > 0) { f.poison--; f.hp -= T.venomPerTick; if (f.poison === 0) events.push({ t, kind: "venom", by: 1 - i, on: i, dmg: T.venomTicks * T.venomPerTick, x: f.x, y: f.y }); }
    });

    frames.push(flies.map((f, i) => ({
      x: f.x, y: f.y, h: f.h, hp: Math.max(0, f.hp), energy: f.energy, move: f.move, phase: f.phase,
      p: f.phase === "windup" ? 1 - f.timer / T.windup : f.phase === "recover" ? 1 - f.timer / T.recover : f.phase === "stagger" ? 1 - f.timer / T.staggerInterrupted : 0,
      guard: f.guard, poisoned: f.poison > 0, rule: f.phase === "windup" ? f.biteRule : f.phase === "free" ? decisions[i].rule : -2, word: decisions[i].word
    })));

    const dead = flies.map((f) => f.hp <= 0);
    if (dead[0] || dead[1]) {
      end = t + 1;
      how = "ko";
      winner = dead[0] && dead[1] ? -1 : dead[0] ? 1 : 0;
      const loser = winner === -1 ? 0 : 1 - winner;
      events.push({ t, kind: "ko", by: winner === -1 ? -1 : winner, on: loser, dmg: 0, x: flies[loser].x, y: flies[loser].y });
      break;
    }
  }

  if (how === "time") {
    const share = flies.map((f) => Math.max(0, f.hp) / f.body.maxHp);
    winner = share[0] > share[1] + 1e-9 ? 0 : share[1] > share[0] + 1e-9 ? 1 : -1;
  }
  return { frames, events, winner, how, ticks: end, hpLeft: [Math.max(0, flies[0].hp), Math.max(0, flies[1].hp)] };
}

function stateOfFrame(f: FlyFrame, me: FlyFrame): number {
  return foeState(f, me);
}
