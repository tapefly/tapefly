/* ── sim/workshop/verilog.ts ────────────────────────────────────────────────
   The same circuit, written in the one format every chip tool reads.

   Nothing here is invented: the gates come straight out of compileWiring, and
   the registers are the memory and toggle cells the player placed. The point of
   this file is that "this can be taped out" stops being a claim — the player
   downloads a .v and any synthesis tool will tell them whether it is true.
   --------------------------------------------------------------------------- */
import { compileWiring, type WorkshopChip } from "./compile";
import { PARTS, type Design } from "./parts";

/** Verilog identifiers are [A-Za-z_][A-Za-z0-9_$]*; part ids are whatever the player made. */
function ident(raw: string, taken: Set<string>): string {
  let s = raw.toLowerCase().replace(/[^a-z0-9_$]+/g, "_").replace(/^([^a-z_])/, "n_$1");
  if (!s) s = "sig";
  let out = s, k = 2;
  while (taken.has(out)) out = `${s}_${k++}`;
  taken.add(out);
  return out;
}

/** Human names for the ports: "eye_1", "small_wing_2", "toggle_cell_1_q". */
function portNames(d: Design, c: WorkshopChip) {
  const taken = new Set<string>(["clk", "module", "input", "output", "wire", "reg", "nand",
    "assign", "always", "begin", "end", "posedge", "initial", "parameter"]);
  /** the part's English name, numbered when it has siblings of the same kind */
  const label = (id: string) => {
    const p = d.parts.find((q) => q.id === id);
    if (!p) return id;
    const same = d.parts.filter((q) => q.kind === p.kind);
    return PARTS[p.kind].name.en + (same.length > 1 ? `_${same.indexOf(p) + 1}` : "");
  };
  return {
    ins: c.inputs.map((id) => ident(label(id), taken)),
    outs: c.outputs.map((id) => ident(label(id), taken)),
    state: c.state.map(([id, k]) => ident(`${label(id)}_${k === "q" ? "q" : "was_off"}`, taken))
  };
}

export interface VerilogOut { text: string; module: string; gates: number; regs: number }

export function toVerilog(d: Design, moduleName = "tapefly_brain"): VerilogOut {
  const c = compileWiring(d);
  const mod = ident(moduleName, new Set());
  const nm = portNames(d, c);
  const base = 2 + c.nIn;
  const firstOut = base + c.gates.length - c.nOut;

  /** every signal index as a Verilog expression */
  const sig = (s: number): string => {
    if (s === 0) return "1'b0";
    if (s === 1) return "1'b1";
    if (s < base) {
      const k = s - 2;
      return k < nm.ins.length ? nm.ins[k] : `${nm.state[k - nm.ins.length]}_r`;
    }
    return `g${s - base}`;
  };

  const L: string[] = [];
  L.push(`// ${mod} — compiled from a TapeFly Workshop design.`);
  L.push(`// ${c.gates.length} NAND gates, ${c.state.length} state bit${c.state.length === 1 ? "" : "s"}.`);
  L.push(`// Every nerve the player wired is one of the gates below. Clock it at 60 Hz`);
  L.push(`// to match the game exactly.`);
  L.push(`\`default_nettype none`);
  L.push("");
  L.push(`module ${mod} (`);
  const ports = [`  input  wire clk`, ...nm.ins.map((n) => `  input  wire ${n}`), ...nm.outs.map((n) => `  output wire ${n}`),
    ...nm.state.map((n) => `  output wire ${n}`)];
  L.push(ports.join(",\n"));
  L.push(`);`);
  L.push("");

  if (c.state.length) {
    L.push(`  // the memory and toggle cells the player placed`);
    for (const n of nm.state) L.push(`  reg ${n}_r = 1'b0;`);
    for (const n of nm.state) L.push(`  assign ${n} = ${n}_r;`);
    L.push("");
  }
  if (c.gates.length) {
    L.push(`  wire ${c.gates.map((_, i) => `g${i}`).join(", ")};`);
    L.push("");
  }
  L.push(`  // the netlist`);
  c.gates.forEach(([a, b], i) => L.push(`  nand g${i}_inst (g${i}, ${sig(a)}, ${sig(b)});`));
  L.push("");
  L.push(`  // wings`);
  nm.outs.forEach((n, k) => L.push(`  assign ${n} = g${firstOut - base + k};`));

  if (c.regs.length) {
    L.push("");
    L.push(`  // next state, written back on the tick`);
    L.push(`  always @(posedge clk) begin`);
    for (const [outIdx, inIdx] of c.regs) {
      const n = nm.state[inIdx - c.inputs.length];
      L.push(`    ${n}_r <= g${firstOut - base + outIdx};`);
    }
    L.push(`  end`);
  }
  L.push(`endmodule`);
  L.push(`\`default_nettype wire`);
  return { text: L.join("\n") + "\n", module: mod, gates: c.gates.length, regs: c.state.length };
}
