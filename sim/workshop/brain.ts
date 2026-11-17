/* ── sim/workshop/brain.ts ──────────────────────────────────────────────────
   The fly's brain as the player wired it, run one tick at a time.

   Signals start at sources (sensors, the core's heartbeat, the metronome, and
   the outputs of brain parts) and run along nerves to sinks (wings and brain
   parts). A nerve can be inverted (a NOT). Each tick:

     1. memory and toggle cells show the bit they held at the end of last tick;
     2. logic blocks are worked out in dependency order ("any" = OR, "all" = AND);
     3. wings are worked out the same way;
     4. memory and toggle cells take their next bit:
          memory: next = set OR (held AND NOT reset)       — set wins a tie
          toggle: next = held XOR (input AND input-was-off-last-tick)
        (at the start nothing counts as "was off", so an input that is already
        on when the fly is let go does not flip the toggle)

   This is exactly a synchronous circuit: combinational NAND logic between
   registers. compile.ts turns the same wiring into that NAND netlist, and the
   tests check the two agree on every input.
   --------------------------------------------------------------------------- */
import { isWing, PARTS, type Design, type Wire } from "./parts";

export interface BrainState {
  /** bit held by each memory or toggle cell */
  q: Record<string, boolean>;
  /** a toggle's input was OFF last tick (so an input already on at the start does not count as a rise) */
  wasOff: Record<string, boolean>;
}

export const emptyBrain = (): BrainState => ({ q: {}, wasOff: {} });

/** Logic blocks in an order where every block comes after the blocks feeding it.
    Blocks caught in a loop of blocks are listed in `loop` and always read as off. */
export function gateOrder(d: Design): { order: string[]; loop: Set<string> } {
  const gates = d.parts.filter((p) => PARTS[p.kind].brain === "gate").map((p) => p.id);
  const isGate = new Set(gates);
  const order: string[] = [];
  const mark = new Map<string, 1 | 2>();
  const loop = new Set<string>();
  const visit = (id: string, path: string[]) => {
    const m = mark.get(id);
    if (m === 2) return;
    if (m === 1) { for (const x of path.slice(path.indexOf(id))) loop.add(x); return; }
    mark.set(id, 1);
    for (const w of d.wires) if (w.to === id && isGate.has(w.from)) visit(w.from, [...path, id]);
    mark.set(id, 2);
    order.push(id);
  };
  for (const g of gates) visit(g, []);
  return { order: order.filter((g) => !loop.has(g)), loop };
}

const combine = (vals: boolean[], all: boolean) => (vals.length === 0 ? false : all ? vals.every(Boolean) : vals.some(Boolean));

/**
 * One tick of the brain.
 * `sensed`: the value of every sensor part present (core, eyes, clock …).
 * `present`: ids of parts still attached (broken parts carry no signal).
 * Returns every part's output this tick (`out`) and the state for next tick.
 */
export function brainTick(d: Design, sensed: Map<string, boolean>, present: Set<string>, st: BrainState, ord = gateOrder(d)) {
  const out = new Map<string, boolean>(sensed);
  for (const p of d.parts) {
    const b = PARTS[p.kind].brain;
    if ((b === "memory" || b === "toggle") && present.has(p.id)) out.set(p.id, st.q[p.id] ?? false);
  }
  const into = (id: string, port?: Wire["port"]) =>
    d.wires.filter((w) => w.to === id && present.has(w.from) && (port === undefined || (w.port ?? "set") === port));
  const read = (w: Wire) => (out.get(w.from) ?? false) !== w.inv;
  for (const g of ord.order) {
    if (!present.has(g)) continue;
    out.set(g, combine(into(g).map(read), d.modes[g] === "all"));
  }
  const wings = new Map<string, boolean>();
  for (const p of d.parts) {
    if (!isWing(p.kind) || !present.has(p.id)) continue;
    const v = combine(into(p.id).map(read), d.modes[p.id] === "all");
    wings.set(p.id, v);
    out.set(p.id, v);
  }
  const next: BrainState = { q: { ...st.q }, wasOff: { ...st.wasOff } };
  for (const p of d.parts) {
    if (!present.has(p.id)) continue;
    const b = PARTS[p.kind].brain;
    if (b === "memory") {
      const set = into(p.id, "set").map(read).some(Boolean);
      const reset = into(p.id, "reset").map(read).some(Boolean);
      next.q[p.id] = set || ((st.q[p.id] ?? false) && !reset);
    } else if (b === "toggle") {
      const inp = combine(into(p.id).map(read), d.modes[p.id] === "all");
      const rose = inp && (st.wasOff[p.id] ?? false);
      next.q[p.id] = (st.q[p.id] ?? false) !== rose;
      next.wasOff[p.id] = !inp;
    }
  }
  return { out, wings, next };
}
