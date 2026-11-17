/* ── sim/workshop/parts.ts ───────────────────────────────────────────────────
   TapeFly Workshop: build a fly out of parts, wire its senses to its wings,
   let it go. This file is the parts catalogue and the shape of a design.

   A design sits on a grid around the core. Local axes: x right, y down, and
   the fly's FORWARD is local −y (up on the build grid).
   --------------------------------------------------------------------------- */

export type PartKind =
  | "core" | "body" | "wingS" | "wingL" | "eye" | "antenna" | "weight" | "hair"
  | "mouth" | "nose" | "gate" | "memory" | "toggle" | "clock";

export interface PartSpec {
  kind: PartKind;
  mass: number;
  /** impulse a part survives before it breaks off; Infinity = never */
  hp: number;
  cost: number;
  /** forward push when the wing is on */
  thrust?: number;
  /** what a sensor reports */
  sense?: "heartbeat" | "sugar" | "wall" | "spider" | "taste" | "nest" | "clock";
  /** brain parts: a gate combines its inputs now; memory and toggle hold one bit */
  brain?: "gate" | "memory" | "toggle";
  /** sensors and wings can be pointed; eyes, antennae and hair use it */
  aims?: boolean;
  name: { zh: string; en: string };
  info: { zh: string; en: string };
}

export const PARTS: Record<PartKind, PartSpec> = {
  core: { kind: "core", mass: 2, hp: Infinity, cost: 0, sense: "heartbeat", name: { zh: "核心", en: "Core" }, info: { zh: "心脏在这里：有一个永远是“开”的心跳信号。坏不了。", en: "Holds the heart: a heartbeat signal that is always on. Cannot break." } },
  body: { kind: "body", mass: 1, hp: 32, cost: 1, name: { zh: "身体块", en: "Body block" }, info: { zh: "把零件连起来。结实，有点重。", en: "Joins parts together. Sturdy, a little heavy." } },
  wingS: { kind: "wingS", mass: 0.5, hp: 10, cost: 2, thrust: 10, name: { zh: "小翅膀", en: "Small wing" }, info: { zh: "通电就往前推。轻，但容易撞断。", en: "Pushes forward while powered. Light, but snaps easily." } },
  wingL: { kind: "wingL", mass: 1.2, hp: 8, cost: 3, thrust: 17, name: { zh: "大翅膀", en: "Large wing" }, info: { zh: "推力大得多，也重得多，更脆。", en: "Much more push, much more weight, more fragile." } },
  eye: { kind: "eye", mass: 0.3, hp: 20, cost: 2, sense: "sugar", aims: true, name: { zh: "眼睛", en: "Eye" }, info: { zh: "朝它对着的方向看：看到糖就输出“开”。", en: "Looks where it points: on while it sees sugar." } },
  antenna: { kind: "antenna", mass: 0.2, hp: Infinity, cost: 1, sense: "wall", aims: true, name: { zh: "触角", en: "Antenna" }, info: { zh: "朝它指的方向摸：碰到墙就输出“开”。", en: "Feels where it points: on while it touches a wall." } },
  weight: { kind: "weight", mass: 4, hp: 80, cost: 1, name: { zh: "配重", en: "Ballast" }, info: { zh: "很重。拿来平衡，或者撞东西更狠。", en: "Very heavy. For balance, or for hitting things harder." } },
  hair: { kind: "hair", mass: 0.2, hp: 20, cost: 2, sense: "spider", aims: true, name: { zh: "蛛感毛", en: "Spider hair" }, info: { zh: "朝它指的方向感觉：附近有蜘蛛就输出“开”。", en: "Senses where it points: on while a spider is near." } },
  mouth: { kind: "mouth", mass: 0.2, hp: 20, cost: 1, sense: "taste", name: { zh: "嘴", en: "Mouth" }, info: { zh: "刚吃到糖的一瞬间输出“开”（只有四分之一秒）。", en: "On for a moment (a quarter second) right after it eats sugar." } },
  nose: { kind: "nose", mass: 0.2, hp: 20, cost: 2, sense: "nest", aims: true, name: { zh: "鼻子", en: "Nose" }, info: { zh: "朝它对着的方向闻：窝在正前方一小片范围里就输出“开”。", en: "Smells where it points: on while the nest is in a narrow cone ahead of it." } },
  gate: { kind: "gate", mass: 0.2, hp: 30, cost: 1, brain: "gate", name: { zh: "逻辑块", en: "Logic block" }, info: { zh: "把几根神经合成一个信号：“任意一个”就是或，“全部”就是而且。输出可以再接给别的零件。", en: "Combines nerves into one signal: ‘any’ is OR, ‘all’ is AND. Its output can feed other parts." } },
  memory: { kind: "memory", mass: 0.3, hp: 30, cost: 2, brain: "memory", name: { zh: "记忆格", en: "Memory cell" }, info: { zh: "记住一位：“记住”线一开就变成开，“忘掉”线一开就变回关，其余时候保持不变。", en: "Holds one bit: a ‘set’ nerve turns it on, a ‘reset’ nerve turns it off, otherwise it keeps what it has." } },
  toggle: { kind: "toggle", mass: 0.3, hp: 30, cost: 2, brain: "toggle", name: { zh: "翻转格", en: "Toggle cell" }, info: { zh: "输入每从关变开一次，它就翻一次面（开↔关）。两个串起来就能数数。", en: "Flips (on↔off) each time its input goes from off to on. Chain two to count." } },
  clock: { kind: "clock", mass: 0.2, hp: 30, cost: 1, sense: "clock", name: { zh: "节拍器", en: "Metronome" }, info: { zh: "很快地一开一关：开 0.1 秒、关 0.1 秒，一直重复。", en: "Ticks fast: on for a tenth of a second, off for a tenth, forever." } }
};

export interface PlacedPart {
  id: string;
  kind: PartKind;
  /** grid cell, core at 0,0 */
  x: number;
  y: number;
  /** 0..7, 45° steps clockwise from forward; only for parts that aim */
  dir: number;
}

export interface Wire {
  /** a part with an output: a sensor (the core is the heartbeat) or a brain part */
  from: string;
  /** a part with inputs: a wing or a brain part */
  to: string;
  /** true: the receiver takes the opposite of the signal (a NOT) */
  inv: boolean;
  /** into a memory cell: which input; "set" if missing */
  port?: "set" | "reset";
}

export interface Design {
  parts: PlacedPart[];
  wires: Wire[];
  /** per wing, logic block or toggle: "any" (on if any input is on) or "all" (on only if every input is on) */
  modes: Record<string, "any" | "all">;
}

export const GRID = 4; // cells −4..4 around the core

export const isWing = (k: PartKind) => k === "wingS" || k === "wingL";
export const isSensor = (k: PartKind) => !!PARTS[k].sense;
export const isBrain = (k: PartKind) => !!PARTS[k].brain;
/** has an output a nerve can start from */
export const isSource = (k: PartKind) => isSensor(k) || isBrain(k);
/** has inputs a nerve can end at */
export const isSink = (k: PartKind) => isWing(k) || isBrain(k);
/** holds state from one tick to the next */
export const isStateful = (k: PartKind) => PARTS[k].brain === "memory" || PARTS[k].brain === "toggle";

export const DIRS = [
  [0, -1], [0.7071, -0.7071], [1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071]
];

export const coreOnly = (): Design => ({ parts: [{ id: "core", kind: "core", x: 0, y: 0, dir: 0 }], wires: [], modes: {} });

/** Parts not joined to the core through side-by-side neighbours. */
export function looseParts(d: Design): Set<string> {
  const at = new Map(d.parts.map((p) => [`${p.x},${p.y}`, p]));
  const seen = new Set<string>(["core"]);
  const stack = d.parts.filter((p) => p.kind === "core");
  while (stack.length) {
    const p = stack.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = at.get(`${p.x + dx},${p.y + dy}`);
      if (q && !seen.has(q.id)) { seen.add(q.id); stack.push(q); }
    }
  }
  return new Set(d.parts.filter((p) => !seen.has(p.id)).map((p) => p.id));
}

export function designCost(d: Design) {
  return d.parts.reduce((s, p) => s + PARTS[p.kind].cost, 0);
}

/** Mass, centre of mass (local), inertia, total thrust. */
export function massProps(parts: { kind: PartKind; x: number; y: number }[]) {
  let m = 0, cx = 0, cy = 0, thrust = 0;
  for (const p of parts) { const s = PARTS[p.kind]; m += s.mass; cx += s.mass * p.x; cy += s.mass * p.y; thrust += s.thrust ?? 0; }
  cx /= m; cy /= m;
  let I = 0;
  for (const p of parts) { const s = PARTS[p.kind]; I += s.mass * ((p.x - cx) ** 2 + (p.y - cy) ** 2 + 0.1); }
  /** turning push if every wing fires: + turns right (clockwise) */
  let torque = 0;
  for (const p of parts) { const t = PARTS[p.kind].thrust; if (t) torque += (p.x - cx) * -t; }
  return { mass: m, cx, cy, inertia: I, thrust, torque };
}
