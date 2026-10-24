/* ── sim/compile.ts ──────────────────────────────────────────────────────────
   Program → NAND netlist, in TapeOut's signal numbering (see sim/netlist.ts).

   Every gate is a NAND. The builder hashes structurally (the same NAND is never
   built twice), folds constants, cancels double negation, and finally drops
   gates no output depends on. The last three gates are the outputs, so the
   result can be taped out byte for byte.

   Construction, for rules r_1..r_n then `otherwise`:
     m_i     = AND of r_i's conditions (sense ranges, previous-behaviour set)
     fire_i  = m_i AND none of m_1..m_{i-1} matched
     out_k   = OR of fire_i for every rule whose output has bit k, plus the
               `otherwise` output if no rule matched.
   --------------------------------------------------------------------------- */
import type { Netlist } from "./netlist";
import { type Program, SENSES } from "./program";

const NIN = 12, NOUT = 3;
const C0 = 0, C1 = 1;

class Builder {
  gates: [number, number][] = [];
  private cache = new Map<string, number>();
  private inv = new Map<number, number>(); // s → a signal known to be NOT s
  readonly base = 2 + NIN;

  input(i: number) { return 2 + i; }

  nand(a: number, b: number): number {
    if (a > b) [a, b] = [b, a];
    if (a === C0) return C1;               // NAND(0,x)=1
    if (a === C1) return this.not(b);       // NAND(1,x)=NOT x
    if (this.inv.get(a) === b) return C1;  // NAND(x, NOT x)=1
    const key = a + "," + b;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    const s = this.base + this.gates.length;
    this.gates.push([a, b]);
    this.cache.set(key, s);
    if (a === b) { this.inv.set(a, s); this.inv.set(s, a); }
    return s;
  }
  not(a: number): number {
    if (a === C0) return C1;
    if (a === C1) return C0;
    const k = this.inv.get(a);
    if (k !== undefined) return k;
    return this.nand(a, a);
  }
  and(a: number, b: number): number {
    if (a === C0 || b === C0) return C0;
    if (a === C1) return b;
    if (b === C1) return a;
    if (a === b) return a;
    return this.not(this.nand(a, b));
  }
  or(a: number, b: number): number {
    if (a === C1 || b === C1) return C1;
    if (a === C0) return b;
    if (b === C0) return a;
    if (a === b) return a;
    return this.nand(this.not(a), this.not(b));
  }
  /** Balanced trees keep depth at log2(n) instead of n. */
  andAll(xs: number[]): number {
    if (xs.length === 0) return C1;
    if (xs.length === 1) return xs[0];
    const h = xs.length >> 1;
    return this.and(this.andAll(xs.slice(0, h)), this.andAll(xs.slice(h)));
  }
  orAll(xs: number[]): number {
    if (xs.length === 0) return C0;
    if (xs.length === 1) return xs[0];
    const h = xs.length >> 1;
    return this.or(this.orAll(xs.slice(0, h)), this.orAll(xs.slice(h)));
  }

  /** 2-bit field at input bits (lo, lo+1) equals v. */
  fieldIs(lo: number, v: number): number {
    const b0 = this.input(lo), b1 = this.input(lo + 1);
    return this.and(v & 1 ? b0 : this.not(b0), v & 2 ? b1 : this.not(b1));
  }
  /** 2-bit field value in a set of values (bit mask over 0..3), simplified. */
  fieldIn(lo: number, mask: number): number {
    mask &= 15;
    if (mask === 0) return C0;
    if (mask === 15) return C1;
    const b0 = this.input(lo), b1 = this.input(lo + 1);
    // single-literal cases
    if (mask === 0b1100) return b1;                 // {2,3}
    if (mask === 0b0011) return this.not(b1);       // {0,1}
    if (mask === 0b1010) return b0;                 // {1,3}
    if (mask === 0b0101) return this.not(b0);       // {0,2}
    // three values: NOT the missing one = OR of two literals
    const pc = [0, 1, 2, 3].filter((v) => (mask >> v) & 1);
    if (pc.length === 3) {
      const miss = [0, 1, 2, 3].find((v) => !((mask >> v) & 1))!;
      return this.not(this.fieldIs(lo, miss));
    }
    if (mask === 0b1001) return this.not(this.xor(b0, b1));  // {0,3}
    if (mask === 0b0110) return this.xor(b0, b1);            // {1,2}
    return this.orAll(pc.map((v) => this.fieldIs(lo, v)));
  }
  xor(a: number, b: number): number {
    const n = this.nand(a, b);
    return this.nand(this.nand(a, n), this.nand(b, n));
  }
}

const rangeMask = (lo: number, hi: number) => { let m = 0; for (let v = lo; v <= hi; v++) m |= 1 << v; return m; };

/**
 * Compile a program into a NAND-only netlist (12 in, 3 out). Two priority
 * encodings are tried — a chain (fewest gates) and prefix trees (shallowest) —
 * and the one with the lower TapeOut cost A×d³ wins.
 */
export function compileProgram(p: Program, version = "FFW-PROGRAM/1"): Netlist {
  const tries = [build(p, version, "chain"), build(p, version, "tree"), build(p, version, "mux")];
  return tries.reduce((best, n) => (cost(n) < cost(best) || (cost(n) === cost(best) && n.gates.length < best.gates.length) ? n : best));
}

type Strategy = "chain" | "tree" | "mux";

function build(p: Program, version: string, strategy: Strategy): Netlist {
  const B = new Builder();
  const m = p.rules.map((r) => {
    const conds: number[] = [];
    SENSES.forEach((s, k) => {
      const rg = r.when[s];
      if (rg) conds.push(B.fieldIn(2 * k, rangeMask(rg[0], rg[1])));
    });
    if (r.prev && r.prev.length > 0) {
      let mask = 0;
      for (const b of r.prev) mask |= 1 << b;
      conds.push(B.fieldIn(10, mask));
    }
    return B.andAll(conds);
  });
  const outs = p.rules.map((r) => (r.then & 3) | (r.gf ? 4 : 0));
  const other = (p.otherwise.then & 3) | (p.otherwise.gf ? 4 : 0);

  if (strategy === "mux") {
    // Per output bit, read the rules bottom-up as a chain of multiplexers with
    // constant data: runs of rules that agree on this bit collapse into one OR.
    const bits: number[] = [];
    for (let k = 0; k < NOUT; k++) {
      let v = (other >> k) & 1 ? C1 : C0;
      let i = m.length - 1;
      while (i >= 0) {
        const bit = (outs[i] >> k) & 1;
        let j = i;
        while (j - 1 >= 0 && ((outs[j - 1] >> k) & 1) === bit) j--;
        const M = B.orAll(m.slice(j, i + 1));
        v = bit ? B.or(M, v) : B.and(B.not(M), v);
        i = j - 1;
      }
      bits.push(v);
    }
    return finish(B.gates, bits, version);
  }

  // fire_i and "nothing matched"
  const fire: number[] = [];
  let free = C1;
  if (strategy === "tree") {
    for (let i = 0; i < m.length; i++) fire.push(B.and(m[i], B.not(B.orAll(m.slice(0, i)))));
    free = B.not(B.orAll(m));
  } else {
    for (let i = 0; i < m.length; i++) {
      fire.push(B.and(free, m[i]));
      free = B.and(free, B.not(m[i]));
    }
  }
  const bits: number[] = [];
  for (let k = 0; k < NOUT; k++) {
    const terms = fire.filter((_, i) => (outs[i] >> k) & 1);
    if ((other >> k) & 1) terms.push(free);
    bits.push(B.orAll(terms));
  }
  return finish(B.gates, bits, version);
}

/**
 * Re-emit so the outputs are the last NOUT signals, drop dead gates and renumber.
 * Each output gets one final gate: if the output signal is already a gate whose
 * value we can reproduce as NAND(x,y), we copy it; otherwise we use NOT(NOT s).
 */
function finish(gates: [number, number][], bits: number[], version: string): Netlist {
  const base = 2 + NIN;
  // Choose, for each output, the final gate's operands (in old numbering).
  const finals: [number, number][] = [];
  const extra: [number, number][] = []; // helper gates needed by finals, old numbering appended after gates
  const all = gates.slice();
  const add = (g: [number, number]) => { all.push(g); return base + all.length - 1; };
  const usedAsFinal = new Set<number>();
  for (const s of bits) {
    if (s >= base && !usedAsFinal.has(s)) {
      finals.push(all[s - base]);
      usedAsFinal.add(s);
    } else {
      // constant, input, or an output repeated: NOT(NOT s)
      const ns = add([s, s]);
      finals.push([ns, ns]);
    }
  }
  void extra;
  // Mark live gates
  const live = new Uint8Array(all.length);
  const stack: number[] = [];
  for (const [a, b] of finals) stack.push(a, b);
  while (stack.length) {
    const s = stack.pop()!;
    if (s < base) continue;
    const i = s - base;
    if (live[i]) continue;
    live[i] = 1;
    stack.push(all[i][0], all[i][1]);
  }
  const remap = new Map<number, number>();
  for (let s = 0; s < base; s++) remap.set(s, s);
  const out: [number, number][] = [];
  for (let i = 0; i < all.length; i++) {
    if (!live[i]) continue;
    const [a, b] = all[i];
    remap.set(base + i, base + out.length);
    out.push([remap.get(a)!, remap.get(b)!]);
  }
  for (const [a, b] of finals) out.push([remap.get(a)!, remap.get(b)!]);
  return { version, nIn: NIN, nOut: NOUT, gates: out };
}

/** Logic depth of the deepest output (gate levels). */
export function netDepth(n: Netlist): number {
  const base = 2 + n.nIn;
  const d = new Array<number>(base + n.gates.length).fill(0);
  let max = 0;
  n.gates.forEach(([a, b], i) => { d[base + i] = 1 + Math.max(d[a], d[b]); max = Math.max(max, d[base + i]); });
  return max;
}

/** TapeOut ranking cost C = A × d³ (A = gates; no latches here). */
export function cost(n: Netlist): number {
  const d = netDepth(n);
  return n.gates.length * d * d * d;
}
