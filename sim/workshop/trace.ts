/* ── sim/workshop/trace.ts ──────────────────────────────────────────────────
   A recording of one run. Because the simulation is deterministic, a run can
   be replayed exactly: we keep every signal's value at every tick (the rows of
   the logic analyzer) plus a world snapshot every SNAP ticks, so jumping to
   tick 1 237 costs at most SNAP steps.
   --------------------------------------------------------------------------- */
import { makeWorld, step, type World } from "./physics";
import { isSink, isWing, PARTS, type Design, type PartKind } from "./parts";
import { outcomeOf, type WOutcome } from "./game";
import type { WLevel } from "./levels";

/** ticks between world snapshots */
export const SNAP = 60;

export type Role = "sense" | "brain" | "wing";

export interface SigRow { id: string; kind: PartKind; role: Role }

export interface Trace {
  levelId: string;
  setup: number;
  rows: SigRow[];
  /** rows.length × ticks, row-major: bit(r, k) = bits[r * ticks + k] */
  bits: Uint8Array;
  ticks: number;
  outcome: WOutcome;
  /** world at tick 0, SNAP, 2·SNAP … */
  snaps: World[];
  events: World["events"];
  /** the core's path, one point per tick, so a scrubbed replay can draw the trail */
  px: Float32Array;
  py: Float32Array;
}

/** The rows of the analyzer, in reading order: senses, then logic, then wings. */
export function signalRows(d: Design): SigRow[] {
  const role = (k: PartKind): Role | null =>
    isWing(k) ? "wing" : PARTS[k].brain ? "brain" : PARTS[k].sense ? "sense" : null;
  const out: SigRow[] = [];
  for (const want of ["sense", "brain", "wing"] as Role[])
    for (const p of d.parts) if (role(p.kind) === want) out.push({ id: p.id, kind: p.kind, role: want });
  return out;
}

export function runTrace(l: WLevel, d: Design, setup: number): Trace {
  const rows = signalRows(d);
  const cap = l.seconds * 60 + 2;
  const grow: Uint8Array[] = rows.map(() => new Uint8Array(cap));
  const gx = new Float32Array(cap), gy = new Float32Array(cap);
  const snaps: World[] = [];
  const w = makeWorld(l.setups[setup], d);
  let o: WOutcome | null = null;
  let k = 0;
  snaps.push(structuredClone(w));
  gx[0] = w.x; gy[0] = w.y;
  while (!(o = outcomeOf(l, w)) && k < cap - 1) {
    step(w);
    k++;
    rows.forEach((r, i) => { grow[i][k] = w.parts.find((p) => p.id === r.id)?.on ? 1 : 0; });
    gx[k] = w.x; gy[k] = w.y;
    if (k % SNAP === 0) snaps.push(structuredClone(w));
  }
  const ticks = k + 1;
  const bits = new Uint8Array(rows.length * ticks);
  rows.forEach((_, i) => bits.set(grow[i].subarray(0, ticks), i * ticks));
  return {
    levelId: l.id, setup, rows, bits, ticks, outcome: o ?? "timeout", snaps, events: w.events,
    px: gx.slice(0, ticks), py: gy.slice(0, ticks)
  };
}

export const bitAt = (tr: Trace, row: number, tick: number) =>
  !!tr.bits[row * tr.ticks + Math.max(0, Math.min(tr.ticks - 1, tick))];

/** The world exactly as it was at `tick`: clone the nearest snapshot, step up. */
export function worldAt(tr: Trace, tick: number): World {
  const want = Math.max(0, Math.min(tr.ticks - 1, Math.round(tick)));
  const i = Math.min(tr.snaps.length - 1, Math.floor(want / SNAP));
  const w = structuredClone(tr.snaps[i]);
  for (let k = w.t; k < want; k++) step(w);
  return w;
}

/** How often a signal changed, and whether it was ever on or ever off. */
export function rowStats(tr: Trace, row: number) {
  let on = 0, edges = 0;
  for (let k = 0; k < tr.ticks; k++) {
    const v = tr.bits[row * tr.ticks + k];
    on += v;
    if (k && v !== tr.bits[row * tr.ticks + k - 1]) edges++;
  }
  return { on, off: tr.ticks - on, edges, duty: on / Math.max(1, tr.ticks) };
}

/** The first tick a signal turned on, or −1. */
export function firstOn(tr: Trace, row: number) {
  for (let k = 0; k < tr.ticks; k++) if (tr.bits[row * tr.ticks + k]) return k;
  return -1;
}

export { isSink };
