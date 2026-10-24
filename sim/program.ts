/* ── sim/program.ts ──────────────────────────────────────────────────────────
   A brain anyone can write: an ordered list of "if … then …" rules over the
   same 12-bit word the fly's circuit reads. sim/compile.ts turns a program into
   NAND gates in TapeOut's encoding, so a rule list written in the browser is one
   step from a circuit someone can tape out.

   A rule matches when every condition holds:
     - each sense (food, threat, light, novelty, hunger) inside a level range
       [min, max], levels 0..3 — leave a sense out to mean "any";
     - the previous behaviour in a set — leave it out to mean "any".
   Rules are read top to bottom; the first match decides. If nothing matches,
   `otherwise` decides.

   The official brain (sim/rules.ts) is OFFICIAL_PROGRAM below, and the tests
   check the two agree on all 4096 input words.
   --------------------------------------------------------------------------- */
import { decideWord } from "./rules";

export const SENSES = ["food", "threat", "light", "novelty", "hunger"] as const;
export type SenseName = (typeof SENSES)[number];
export const BEHAVIOR_NAMES = ["approach", "avoid", "explore", "freeze"] as const;

export interface ProgramRule {
  /** Level ranges per sense, inclusive; absent = any. */
  when: Partial<Record<SenseName, [number, number]>>;
  /** Allowed previous behaviours (0 approach · 1 avoid · 2 explore · 3 freeze); absent or empty = any. */
  prev?: number[];
  /** Behaviour this rule chooses. */
  then: number;
  /** Fire the Giant Fibre escape as well. */
  gf?: boolean;
  /** Optional label, shown in the builder; never compiled. */
  label?: string;
}

export interface Program {
  rules: ProgramRule[];
  otherwise: { then: number; gf?: boolean };
}

export const MAX_RULES = 16;

const fieldOf = (w: number, s: SenseName) => (w >> (2 * SENSES.indexOf(s))) & 3;

/** Does one rule match this input word? */
export function matches(r: ProgramRule, w: number): boolean {
  for (const s of SENSES) {
    const rg = r.when[s];
    if (!rg) continue;
    const v = fieldOf(w, s);
    if (v < rg[0] || v > rg[1]) return false;
  }
  if (r.prev && r.prev.length > 0 && !r.prev.includes((w >> 10) & 3)) return false;
  return true;
}

/** Which rule decides (index, or -1 for `otherwise`) and the 3-bit output word. */
export function runProgram(p: Program, w: number): { rule: number; out: number } {
  for (let i = 0; i < p.rules.length; i++) {
    const r = p.rules[i];
    if (matches(r, w)) return { rule: i, out: (r.then & 3) | (r.gf ? 4 : 0) };
  }
  return { rule: -1, out: (p.otherwise.then & 3) | (p.otherwise.gf ? 4 : 0) };
}

export function programTable(p: Program): number[] {
  return Array.from({ length: 4096 }, (_, w) => runProgram(p, w).out);
}

/** The official brain, written as a program. Same table as sim/rules.ts. */
export const OFFICIAL_PROGRAM: Program = {
  rules: [
    { label: "escape", when: { threat: [2, 3] }, then: 1, gf: true },
    { label: "danger (was avoiding)", when: { threat: [1, 3] }, prev: [1], then: 1 },
    { label: "danger (not starving)", when: { threat: [1, 3], hunger: [0, 1] }, then: 1 },
    { label: "feed", when: { hunger: [3, 3], food: [1, 3] }, then: 0 },
    { label: "lure", when: { food: [3, 3] }, then: 0 },
    { label: "pursue", when: { food: [2, 3] }, prev: [0], then: 0 },
    { label: "curious", when: { novelty: [2, 3] }, then: 2 },
    { label: "rest", when: { hunger: [0, 2] }, prev: [3], then: 3 },
    { label: "explore in the light", when: { light: [1, 3] }, then: 2 }
  ],
  otherwise: { then: 3 }
};

/* ── validation ──────────────────────────────────────────────────────────── */

export function validateProgram(p: unknown): Program {
  const fail = (m: string): never => { throw new Error("program: " + m); };
  if (!p || typeof p !== "object") fail("not an object");
  const q = p as Program;
  if (!Array.isArray(q.rules)) fail("rules must be an array");
  if (q.rules.length > MAX_RULES) fail(`at most ${MAX_RULES} rules`);
  const lvl = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3;
  const beh = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3;
  const rules: ProgramRule[] = q.rules.map((r, i) => {
    if (!r || typeof r !== "object") fail(`rule ${i}: not an object`);
    const when: ProgramRule["when"] = {};
    for (const s of SENSES) {
      const rg = (r.when ?? {})[s];
      if (rg === undefined) continue;
      if (!Array.isArray(rg) || rg.length !== 2 || !lvl(rg[0]) || !lvl(rg[1]) || rg[0] > rg[1]) fail(`rule ${i}: bad range for ${s}`);
      if (!(rg[0] === 0 && rg[1] === 3)) when[s] = [rg[0], rg[1]];
    }
    let prev: number[] | undefined;
    if (r.prev !== undefined) {
      if (!Array.isArray(r.prev) || !r.prev.every(beh)) fail(`rule ${i}: bad prev`);
      const set = [...new Set(r.prev)].sort();
      if (set.length > 0 && set.length < 4) prev = set;
    }
    if (!beh(r.then)) fail(`rule ${i}: bad then`);
    const out: ProgramRule = { when, then: r.then };
    if (prev) out.prev = prev;
    if (r.gf) out.gf = true;
    if (typeof r.label === "string" && r.label) out.label = r.label.slice(0, 40);
    return out;
  });
  if (!q.otherwise || !beh(q.otherwise.then)) fail("otherwise.then must be 0..3");
  return { rules, otherwise: q.otherwise.gf ? { then: q.otherwise.then, gf: true } : { then: q.otherwise.then } };
}

/* ── a compact, URL-safe encoding ────────────────────────────────────────────
   "p1." + base64url of: 1 byte rule count, then 4 bytes per rule, then 1 byte
   for `otherwise`. A rule packs into 27 bits:
     bits 0-19   five senses × (min 2 bits, max 2 bits)
     bits 20-23  prev mask (bit k = behaviour k allowed; 0 or 15 = any)
     bits 24-25  then
     bit  26     gf
   Labels are not encoded (a shared link carries the brain, not the notes). */

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(s) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  if (typeof atob === "function") {
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export function encodeProgram(p: Program): string {
  const bytes = new Uint8Array(1 + 4 * p.rules.length + 1);
  bytes[0] = p.rules.length;
  p.rules.forEach((r, i) => {
    let v = 0;
    SENSES.forEach((s, k) => {
      const [lo, hi] = r.when[s] ?? [0, 3];
      v |= (lo & 3) << (4 * k);
      v |= (hi & 3) << (4 * k + 2);
    });
    let mask = 0;
    for (const b of r.prev ?? []) mask |= 1 << b;
    v |= (mask & 15) << 20;
    v |= (r.then & 3) << 24;
    if (r.gf) v |= 1 << 26;
    const o = 1 + 4 * i;
    bytes[o] = v & 255; bytes[o + 1] = (v >>> 8) & 255; bytes[o + 2] = (v >>> 16) & 255; bytes[o + 3] = (v >>> 24) & 255;
  });
  bytes[bytes.length - 1] = (p.otherwise.then & 3) | (p.otherwise.gf ? 4 : 0);
  return "p1." + b64url(bytes);
}

export function decodeProgram(code: string): Program {
  if (!code.startsWith("p1.")) throw new Error("program: unknown encoding");
  const bytes = unb64url(code.slice(3));
  const n = bytes[0];
  if (bytes.length !== 1 + 4 * n + 1) throw new Error("program: wrong length");
  const rules: ProgramRule[] = [];
  for (let i = 0; i < n; i++) {
    const o = 1 + 4 * i;
    const v = (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0;
    const when: ProgramRule["when"] = {};
    SENSES.forEach((s, k) => {
      const lo = (v >> (4 * k)) & 3, hi = (v >> (4 * k + 2)) & 3;
      when[s] = [lo, hi];
    });
    const mask = (v >> 20) & 15;
    const prev = [0, 1, 2, 3].filter((b) => (mask >> b) & 1);
    rules.push({ when, prev, then: (v >> 24) & 3, gf: ((v >> 26) & 1) === 1 });
  }
  const last = bytes[bytes.length - 1];
  return validateProgram({ rules, otherwise: { then: last & 3, gf: (last & 4) !== 0 } });
}

/** The official rules, checked against sim/rules.ts (used by tests). */
export function officialAgrees(): boolean {
  for (let w = 0; w < 4096; w++) if (runProgram(OFFICIAL_PROGRAM, w).out !== decideWord(w).out) return false;
  return true;
}
