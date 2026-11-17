/* ── sim/evo/brain.ts ────────────────────────────────────────────────────────
   The brain of TapeFly: Evolution. A brain is an ordered list of rules over the
   fly's senses; it is compiled to a NAND-only netlist in TapeOut's numbering
   (sim/netlist.ts), and the game runs the netlist, not the rules. The rules are
   only how a person writes it.

   Input word (12 bits, fixed for every level so a brain is one circuit shape):
     bit 0      wallF   wall or edge straight ahead
     bit 1      wallL   wall on the left
     bit 2      wallR   wall on the right
     bits 3-5   smell   where the nearest food is: 0 none · 1 ahead · 2 right · 3 behind · 4 left
     bit 6      web     a spider web on the cell ahead
     bit 7      mem     the one bit of memory
     bits 8-11  reserved for later chapters (always 0 in chapter 1)

   Output word (4 bits):
     bits 0-1   act     0 wait · 1 forward · 2 turn left · 3 turn right
     bit 2      memW    write the memory bit this tick
     bit 3      memV    the value written
   --------------------------------------------------------------------------- */
import type { Netlist } from "../netlist";

export const NIN = 12;
export const NOUT = 4;

export type FieldId = "wallF" | "wallL" | "wallR" | "smell" | "web" | "mem";

export interface FieldSpec {
  id: FieldId;
  lo: number;
  width: number;
  /** How many values occur; values from n up to 2^width − 1 never occur (don't-cares). */
  n: number;
}

export const FIELDS: FieldSpec[] = [
  { id: "wallF", lo: 0, width: 1, n: 2 },
  { id: "wallL", lo: 1, width: 1, n: 2 },
  { id: "wallR", lo: 2, width: 1, n: 2 },
  { id: "smell", lo: 3, width: 3, n: 5 },
  { id: "web", lo: 6, width: 1, n: 2 },
  { id: "mem", lo: 7, width: 1, n: 2 }
];

export const field = (id: FieldId) => FIELDS.find((f) => f.id === id)!;

export const ACTS = ["wait", "forward", "left", "right"] as const;
export type Act = 0 | 1 | 2 | 3;

export interface EvoRule {
  /** Per field, the set of values that match, as a bit mask over the values; absent = any. */
  when: Partial<Record<FieldId, number>>;
  act: Act;
  /** Set the memory bit to this value; absent = leave it. */
  mem?: 0 | 1;
  label?: string;
}

export interface EvoProgram {
  rules: EvoRule[];
  otherwise: { act: Act; mem?: 0 | 1 };
}

export const MAX_RULES = 12;

export const fieldValue = (word: number, f: FieldSpec) => (word >>> f.lo) & ((1 << f.width) - 1);

/** Is this input word one the world can produce? (smell 5..7 never occurs) */
export function validWord(word: number): boolean {
  for (const f of FIELDS) if (fieldValue(word, f) >= f.n) return false;
  return (word >>> 8) === 0;
}

export function ruleMatches(r: EvoRule, word: number): boolean {
  for (const f of FIELDS) {
    const m = r.when[f.id];
    if (m === undefined) continue;
    if (!((m >>> fieldValue(word, f)) & 1)) return false;
  }
  return true;
}

export const outWord = (a: { act: Act; mem?: 0 | 1 }) => (a.act & 3) | (a.mem !== undefined ? 4 | (a.mem << 3) : 0);

/** The rule that decides (index, −1 for otherwise) and the output word, read straight from the rules. */
export function runRules(p: EvoProgram, word: number): { rule: number; out: number } {
  for (let i = 0; i < p.rules.length; i++) if (ruleMatches(p.rules[i], word)) return { rule: i, out: outWord(p.rules[i]) };
  return { rule: -1, out: outWord(p.otherwise) };
}

/* ── compiler ──────────────────────────────────────────────────────────────── */

const C0 = 0, C1 = 1;

class Builder {
  gates: [number, number][] = [];
  private cache = new Map<string, number>();
  private inv = new Map<number, number>();
  readonly base = 2 + NIN;
  input(i: number) { return 2 + i; }
  nand(a: number, b: number): number {
    if (a > b) [a, b] = [b, a];
    if (a === C0) return C1;
    if (a === C1) return this.not(b);
    if (this.inv.get(a) === b) return C1;
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
    if (this.inv.get(a) === b) return C0;
    return this.not(this.nand(a, b));
  }
  or(a: number, b: number): number {
    if (a === C1 || b === C1) return C1;
    if (a === C0) return b;
    if (b === C0) return a;
    if (a === b) return a;
    if (this.inv.get(a) === b) return C1;
    return this.nand(this.not(a), this.not(b));
  }
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
  /** A field's value lies in `mask`, using the never-occurring values as don't-cares. */
  fieldIn(f: FieldSpec, mask: number): number {
    const full = (1 << f.n) - 1;
    mask &= full;
    if (mask === 0) return C0;
    if (mask === full) return C1;
    const on = mask;
    const off = full & ~mask;
    const a = cover(f.width, on, off), b = cover(f.width, off, on);
    const lit = (bit: number, v: number) => (v ? this.input(f.lo + bit) : this.not(this.input(f.lo + bit)));
    const build = (cubes: Cube[]) => this.orAll(cubes.map((c) => this.andAll(c.map(([bit, v]) => lit(bit, v)))));
    return litCost(a) <= litCost(b) + 1 ? build(a) : this.not(build(b));
  }
}

/** A cube is a list of (bit, value) literals. */
type Cube = [number, number][];
const litCost = (cs: Cube[]) => cs.reduce((s, c) => s + Math.max(1, c.length) * 2, 0) + (cs.length - 1) * 3;

const coverCache = new Map<string, Cube[]>();
/** Smallest sum-of-products covering `on`, avoiding `off` (other values are don't-cares). Exhaustive: widths ≤ 3. */
function cover(width: number, on: number, off: number): Cube[] {
  const key = `${width}:${on}:${off}`;
  const hit = coverCache.get(key);
  if (hit) return hit;
  const nv = 1 << width;
  // every cube: for each bit, 0 / 1 / don't care
  const cubes: { lits: Cube; m: number }[] = [];
  const total = 3 ** width;
  for (let c = 0; c < total; c++) {
    const lits: Cube = [];
    let x = c;
    for (let bit = 0; bit < width; bit++) { const t = x % 3; x = Math.floor(x / 3); if (t < 2) lits.push([bit, t]); }
    let m = 0;
    for (let v = 0; v < nv; v++) if (lits.every(([bit, val]) => ((v >> bit) & 1) === val)) m |= 1 << v;
    if (m & off) continue;
    if (!(m & on)) continue;
    cubes.push({ lits, m });
  }
  let best: Cube[] | null = null;
  let bestCost = Infinity;
  const search = (i: number, got: number, chosen: Cube[]) => {
    if ((got & on) === on) { const c = litCost(chosen); if (c < bestCost) { bestCost = c; best = chosen.slice(); } return; }
    if (i >= cubes.length || chosen.length >= 4) return;
    if (litCost(chosen) >= bestCost) return;
    chosen.push(cubes[i].lits); search(i + 1, got | cubes[i].m, chosen); chosen.pop();
    search(i + 1, got, chosen);
  };
  search(0, 0, []);
  const out = best ?? [];
  coverCache.set(key, out);
  return out;
}

type Strategy = "chain" | "tree" | "mux";

export function compileBrain(p: EvoProgram, version = "TAPEFLY-EVO/1"): Netlist {
  const tries = (["chain", "tree", "mux"] as Strategy[]).map((s) => build(p, version, s));
  return tries.reduce((best, n) => {
    const a = n.gates.length, b = best.gates.length;
    return a < b || (a === b && depthOf(n) < depthOf(best)) ? n : best;
  });
}

function build(p: EvoProgram, version: string, strategy: Strategy): Netlist {
  const B = new Builder();
  const m = p.rules.map((r) => B.andAll(FIELDS.filter((f) => r.when[f.id] !== undefined).map((f) => B.fieldIn(f, r.when[f.id]!))));
  const outs = p.rules.map(outWord);
  const other = outWord(p.otherwise);

  if (strategy === "mux") {
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
  const fire: number[] = [];
  let free = C1;
  if (strategy === "tree") {
    for (let i = 0; i < m.length; i++) fire.push(B.and(m[i], B.not(B.orAll(m.slice(0, i)))));
    free = B.not(B.orAll(m));
  } else {
    for (let i = 0; i < m.length; i++) { fire.push(B.and(free, m[i])); free = B.and(free, B.not(m[i])); }
  }
  const bits: number[] = [];
  for (let k = 0; k < NOUT; k++) {
    const terms = fire.filter((_, i) => (outs[i] >> k) & 1);
    if ((other >> k) & 1) terms.push(free);
    bits.push(B.orAll(terms));
  }
  return finish(B.gates, bits, version);
}

/** Outputs become the last NOUT signals; dead gates go; constants and inputs get a NOT-NOT pair. */
function finish(gates: [number, number][], bits: number[], version: string): Netlist {
  const base = 2 + NIN;
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
    remap.set(base + i, base + out.length);
    out.push([remap.get(all[i][0])!, remap.get(all[i][1])!]);
  }
  for (const [a, b] of finals) out.push([remap.get(a)!, remap.get(b)!]);
  return { version, nIn: NIN, nOut: NOUT, gates: out };
}

export function depthOf(n: Netlist): number {
  const base = 2 + n.nIn;
  const d = new Array<number>(base + n.gates.length).fill(0);
  let max = 0;
  n.gates.forEach(([a, b], i) => { d[base + i] = 1 + Math.max(d[a], d[b]); if (d[base + i] > max) max = d[base + i]; });
  return max;
}

/** Per-gate depth, for laying the circuit out in columns. */
export function gateLevels(n: Netlist): number[] {
  const base = 2 + n.nIn;
  const d = new Array<number>(base + n.gates.length).fill(0);
  return n.gates.map(([a, b], i) => (d[base + i] = 1 + Math.max(d[a], d[b])));
}

/* ── sharing a brain as text ───────────────────────────────────────────────── */

export function encodeBrain(p: EvoProgram): string {
  const r = (x: { act: Act; mem?: 0 | 1 }) => `${x.act}${x.mem === undefined ? "" : x.mem ? "+" : "-"}`;
  return [
    ...p.rules.map((ru) => FIELDS.filter((f) => ru.when[f.id] !== undefined).map((f) => `${f.id}=${ru.when[f.id]!.toString(16)}`).join(",") + ":" + r(ru)),
    "*:" + r(p.otherwise)
  ].join(";");
}

export function decodeBrain(s: string): EvoProgram {
  const parts = s.split(";").filter(Boolean);
  const pa = (x: string): { act: Act; mem?: 0 | 1 } => {
    const act = Number(x[0]);
    if (!(act >= 0 && act <= 3)) throw new Error("bad act");
    return { act: act as Act, ...(x[1] === "+" ? { mem: 1 as const } : x[1] === "-" ? { mem: 0 as const } : {}) };
  };
  const rules: EvoRule[] = [];
  let otherwise: { act: Act; mem?: 0 | 1 } = { act: 0 };
  for (const p of parts) {
    const [cond, a] = p.split(":");
    if (cond === "*") { otherwise = pa(a); continue; }
    const when: Partial<Record<FieldId, number>> = {};
    for (const c of cond.split(",").filter(Boolean)) {
      const [k, v] = c.split("=");
      if (!FIELDS.some((f) => f.id === k)) throw new Error("bad field");
      when[k as FieldId] = parseInt(v, 16);
    }
    rules.push({ when, ...pa(a) });
  }
  if (rules.length > MAX_RULES) throw new Error("too many rules");
  return { rules, otherwise };
}
