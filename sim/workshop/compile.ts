/* ── sim/workshop/compile.ts ────────────────────────────────────────────────
   The wiring as a NAND netlist in TapeOut's numbering.

     inputs  = the sensors (in design order, the core's heartbeat and the
               metronome among them), then the state bits: each memory cell's
               bit, then each toggle cell's bit and whether its input was off last tick
     outputs = the wings, then the NEXT value of every state bit, in the same
               order as the state inputs

   A sequential chip is this combinational netlist plus registers that copy
   each "next" output back to its state input on the clock edge; `regs` lists
   those pairs. An inverted nerve is a NOT; "any" ORs, "all" ANDs. Every output
   is its own final gate, so an output driven by a plain signal costs a NOT-NOT
   pair. Dead gates are dropped and equal gates are shared.
   --------------------------------------------------------------------------- */
import type { Netlist } from "../netlist";
import { gateOrder } from "./brain";
import { isSensor, isWing, PARTS, type Design, type Wire } from "./parts";

export interface WorkshopChip extends Netlist {
  /** part ids of the sensor inputs, in order */
  inputs: string[];
  /** part ids of the wing outputs, in order */
  outputs: string[];
  /** state bits: [part id, "q" | "wasOff"]; input 2+inputs.length+k, output outputs.length+k */
  state: [string, "q" | "wasOff"][];
  /** registers: [output index, input index] */
  regs: [number, number][];
}

export function compileWiring(d: Design, version = "TAPEFLY-WORKSHOP/2"): WorkshopChip {
  const inputs = d.parts.filter((p) => isSensor(p.kind)).map((p) => p.id);
  const outputs = d.parts.filter((p) => isWing(p.kind)).map((p) => p.id);
  const state: [string, "q" | "wasOff"][] = [];
  for (const p of d.parts) if (PARTS[p.kind].brain === "memory") state.push([p.id, "q"]);
  for (const p of d.parts) if (PARTS[p.kind].brain === "toggle") state.push([p.id, "q"], [p.id, "wasOff"]);
  const nIn = inputs.length + state.length;
  const base = 2 + nIn;
  const gates: [number, number][] = [];
  const cache = new Map<string, number>();
  const nand = (a: number, b: number) => {
    if (a > b) [a, b] = [b, a];
    if (a === 0) return 1;
    const k = a + "," + b;
    const hit = cache.get(k);
    if (hit !== undefined) return hit;
    gates.push([a, b]);
    const s = base + gates.length - 1;
    cache.set(k, s);
    return s;
  };
  const not = (a: number) => (a === 0 ? 1 : a === 1 ? 0 : nand(a, a));
  const and = (a: number, b: number) => (a === 0 || b === 0 ? 0 : a === 1 ? b : b === 1 ? a : not(nand(a, b)));
  const or = (a: number, b: number) => (a === 1 || b === 1 ? 1 : a === 0 ? b : b === 0 ? a : nand(not(a), not(b)));
  const xor = (a: number, b: number) => { const n = nand(a, b); return nand(nand(a, n), nand(b, n)); };
  const fold = (xs: number[], all: boolean) => (xs.length === 0 ? 0 : xs.reduce((acc, s) => (all ? and(acc, s) : or(acc, s))));

  // the signal each part's output carries
  const sig = new Map<string, number>();
  inputs.forEach((id, i) => sig.set(id, 2 + i));
  state.forEach(([id, k], i) => { if (k === "q") sig.set(id, 2 + inputs.length + i); });
  const stateSig = (id: string, k: "q" | "wasOff") => 2 + inputs.length + state.findIndex(([a, b]) => a === id && b === k);
  const read = (w: Wire) => { const s = sig.get(w.from) ?? 0; return w.inv ? not(s) : s; };
  const into = (id: string, port?: Wire["port"]) => d.wires.filter((w) => w.to === id && sig.has(w.from) && (port === undefined || (w.port ?? "set") === port));
  const { order } = gateOrder(d);
  for (const g of order) sig.set(g, fold(d.wires.filter((w) => w.to === g && sig.has(w.from)).map(read), d.modes[g] === "all"));
  // blocks in a loop read as off
  for (const p of d.parts) if (PARTS[p.kind].brain === "gate" && !sig.has(p.id)) sig.set(p.id, 0);

  const bits: number[] = outputs.map((wg) => fold(into(wg).map(read), d.modes[wg] === "all"));
  for (const [id, k] of state) {
    const kind = PARTS[d.parts.find((p) => p.id === id)!.kind].brain;
    if (kind === "memory") {
      const set = fold(into(id, "set").map(read), false);
      const reset = fold(into(id, "reset").map(read), false);
      bits.push(or(set, and(stateSig(id, "q"), not(reset))));
    } else {
      const inp = fold(into(id).map(read), d.modes[id] === "all");
      if (k === "q") bits.push(xor(stateSig(id, "q"), and(inp, stateSig(id, "wasOff"))));
      else bits.push(not(inp));
    }
  }

  // outputs become the last gates; dead gates are dropped
  const all = gates.slice();
  const finals: [number, number][] = [];
  const used = new Set<number>();
  for (const s of bits) {
    if (s >= base && !used.has(s)) { finals.push(all[s - base]); used.add(s); }
    else { all.push([s, s]); const ns = base + all.length - 1; finals.push([ns, ns]); }
  }
  const live = new Uint8Array(all.length);
  const stack: number[] = [];
  for (const [a, b] of finals) stack.push(a, b);
  while (stack.length) {
    const s = stack.pop()!;
    if (s < base || live[s - base]) continue;
    live[s - base] = 1;
    stack.push(all[s - base][0], all[s - base][1]);
  }
  const remap = new Map<number, number>();
  for (let s = 0; s < base; s++) remap.set(s, s);
  const out: [number, number][] = [];
  all.forEach((g, i) => { if (live[i]) { remap.set(base + i, base + out.length); out.push([remap.get(g[0])!, remap.get(g[1])!]); } });
  for (const [a, b] of finals) out.push([remap.get(a)!, remap.get(b)!]);
  return {
    version,
    nIn,
    nOut: bits.length,
    gates: out,
    inputs,
    outputs,
    state,
    regs: state.map((_, k) => [outputs.length + k, inputs.length + k])
  };
}

/** Gates that do real work: the netlist minus output buffer pairs, and the state bits. */
export function chipSize(d: Design) {
  const c = compileWiring(d);
  return { gates: c.gates.length, bits: c.state.length };
}
