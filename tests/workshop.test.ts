import { test } from "node:test";
import assert from "node:assert/strict";
import { WLEVELS } from "../sim/workshop/levels";
import { WSOLUTIONS } from "../sim/workshop/solutions";
import { gradeDesign, runSetup } from "../sim/workshop/game";
import { compileWiring } from "../sim/workshop/compile";
import { brainTick, gateOrder } from "../sim/workshop/brain";
import { coreOnly, looseParts, type Design } from "../sim/workshop/parts";
import { makeWorld, step, sense } from "../sim/workshop/physics";
import { evalTrace } from "../sim/netlist";
import { runTrace, worldAt, bitAt, rowStats, SNAP } from "../sim/workshop/trace";
import { diagnose, nextGoal } from "../sim/workshop/diagnose";
import { duel } from "../sim/workshop/duel";
import { toVerilog } from "../sim/workshop/verilog";
import { sealManifest, sealWorkshopBrain, SEAL_MAX_INPUTS } from "../sim/workshop/seal";

const LEVELS = WLEVELS.filter((l) => l.goal.kind !== "free");
const ok = (g: ReturnType<typeof gradeDesign>) => g.cleared && g.problems.length === 0;

test("every workshop level: the reference design clears it within the rules", () => {
  for (const l of LEVELS) {
    const g = gradeDesign(l, WSOLUTIONS[l.id]);
    assert.deepEqual(g.problems, [], `${l.id}: ${g.problems}`);
    assert.ok(g.cleared, `${l.id} not cleared: ${JSON.stringify(g.runs)}`);
  }
});

test("each level needs something the previous level's design lacks", () => {
  for (let i = 1; i < LEVELS.length; i++) {
    const l = LEVELS[i];
    assert.ok(!ok(gradeDesign(l, WSOLUTIONS[LEVELS[i - 1].id])), `${l.id} falls to ${LEVELS[i - 1].id}'s design`);
  }
  assert.ok(!gradeDesign(LEVELS[0], coreOnly()).cleared);
});

test("the memory, counting and rhythm levels cannot be done without their new part", () => {
  const drop = (d: Design, ids: string[], wires = d.wires.filter((w) => !ids.includes(w.from) && !ids.includes(w.to))): Design =>
    ({ parts: d.parts.filter((p) => !ids.includes(p.id)), wires, modes: d.modes });
  const L = (id: string) => LEVELS.find((l) => l.id === id)!;
  // stop when full: the mouth alone only pauses the wings for a moment
  const full = WSOLUTIONS.full;
  assert.ok(!gradeDesign(L("full"), drop(full, ["M"], [...full.wires.filter((w) => w.from !== "M" && w.to !== "M"), { from: "m", to: "wl", inv: true }, { from: "m", to: "wr", inv: true }])).cleared);
  // second door: without the toggle it turns in at the first door
  const d2 = WSOLUTIONS.door2;
  assert.ok(!gradeDesign(L("door2"), drop(d2, ["T"])).cleared);
  // glass: the same wings without the metronome shatter it
  const g = WSOLUTIONS.glass;
  assert.equal(runSetup(L("glass"), drop(g, ["c"], [{ from: "core", to: "wl", inv: false }, { from: "core", to: "wr", inv: false }]), 0).outcome, "smashed");
});

test("a run is deterministic", () => {
  const l = WLEVELS.find((x) => x.id === "tower")!;
  const a = makeWorld(l.setups[0], WSOLUTIONS.tower), b = makeWorld(l.setups[0], WSOLUTIONS.tower);
  for (let i = 0; i < 600; i++) { step(a); step(b); }
  assert.equal(a.x, b.x); assert.equal(a.knocked, b.knocked); assert.deepEqual(a.cubes.map((c) => c.x), b.cubes.map((c) => c.x));
});

test("the compiled chip agrees with the brain on every input and state, registers included", () => {
  for (const [id, d] of Object.entries(WSOLUTIONS) as [string, Design][]) {
    const n = compileWiring(d);
    const present = new Set(d.parts.map((p) => p.id));
    const ord = gateOrder(d);
    const words = n.nIn <= 14 ? 1 << n.nIn : 4096;
    for (let k = 0; k < words; k++) {
      const word = n.nIn <= 14 ? k : (k * 2654435761) >>> (32 - n.nIn);
      const bit = (i: number) => ((word >> i) & 1) === 1;
      const sensed = new Map(n.inputs.map((pid, i) => [pid, bit(i)]));
      const st = { q: {} as Record<string, boolean>, wasOff: {} as Record<string, boolean> };
      n.state.forEach(([pid, kind], j) => { (kind === "q" ? st.q : st.wasOff)[pid] = bit(n.inputs.length + j); });
      const want = brainTick(d, sensed, present, st, ord);
      const sig = evalTrace(n, word);
      const outBit = (j: number) => sig[sig.length - n.nOut + j] === 1;
      n.outputs.forEach((pid, j) => assert.equal(outBit(j), want.wings.get(pid), `${id} wing ${pid} word ${word}`));
      n.state.forEach(([pid, kind], j) => assert.equal(outBit(n.outputs.length + j), (kind === "q" ? want.next.q : want.next.wasOff)[pid], `${id} state ${pid}.${kind} word ${word}`));
    }
  }
});

test("door3 produces an exhaustive, sealable TapeOut report with state exposed", () => {
  const level = WLEVELS.find((item) => item.id === "door3")!;
  const report = sealWorkshopBrain(level, WSOLUTIONS.door3);
  assert.ok(report.nIn <= SEAL_MAX_INPUTS);
  assert.equal(report.checkedInputs, 1 << report.nIn);
  assert.equal(report.mismatch, null);
  assert.deepEqual(report.problems, []);
  assert.equal(report.eligible, true);
  assert.match(report.profile, /^WORKSHOP-\d+x\d+\/1$/);
  assert.equal(report.bytesLength, report.gates * 7);
  assert.equal(report.bytesSha256.length, 64);
  assert.ok(report.state.length >= 4, "two toggles expose q and wasOff");
  assert.equal(report.regs.length, report.state.length);
  const manifest = sealManifest(report);
  assert.equal("bytes" in manifest, false, "the public manifest summarizes rather than buffering the full byte string");
});

test("a Workshop brain above the twelve-input limit is never marked sealable", () => {
  const level = WLEVELS.find((item) => item.id === "liftoff")!;
  const cells = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [-2, 1], [2, 1], [-2, -1], [2, -1], [0, -2]];
  const design: Design = {
    parts: [
      { id: "core", kind: "core", x: 0, y: 0, dir: 0 },
      ...cells.map(([x, y], index) => ({ id: `a${index}`, kind: "antenna" as const, x, y, dir: 0 }))
    ],
    wires: [],
    modes: {}
  };
  const report = sealWorkshopBrain(level, design);
  assert.equal(report.nIn, 14);
  assert.equal(report.checkedInputs, 4096, "over-limit designs are sampled, never claimed as exhaustive");
  assert.equal(report.eligible, false);
  assert.ok(report.problems.includes(`too-many-inputs:14>${SEAL_MAX_INPUTS}`));
});

test("a toggle flips once per rising input, and an input already on at the start does not count", () => {
  const d: Design = { parts: [{ id: "core", kind: "core", x: 0, y: 0, dir: 0 }, { id: "T", kind: "toggle", x: 0, y: 1, dir: 0 }], wires: [{ from: "core", to: "T", inv: false }], modes: {} };
  let st = { q: {}, wasOff: {} } as { q: Record<string, boolean>; wasOff: Record<string, boolean> };
  const present = new Set(["core", "T"]);
  for (let i = 0; i < 5; i++) st = brainTick(d, new Map([["core", true]]), present, st).next;
  assert.equal(st.q.T ?? false, false);
  st = brainTick(d, new Map([["core", false]]), present, st).next;
  st = brainTick(d, new Map([["core", true]]), present, st).next;
  assert.equal(st.q.T, true);
});

test("a memory cell holds until reset, and set wins a tie", () => {
  const d: Design = { parts: [{ id: "core", kind: "core", x: 0, y: 0, dir: 0 }, { id: "a", kind: "eye", x: 0, y: -1, dir: 0 }, { id: "b", kind: "antenna", x: 1, y: 0, dir: 0 }, { id: "M", kind: "memory", x: 0, y: 1, dir: 0 }],
    wires: [{ from: "a", to: "M", inv: false, port: "set" }, { from: "b", to: "M", inv: false, port: "reset" }], modes: {} };
  const present = new Set(d.parts.map((p) => p.id));
  const tick = (st: any, a: boolean, b: boolean) => brainTick(d, new Map([["core", true], ["a", a], ["b", b]]), present, st).next;
  let st: any = { q: {}, wasOff: {} };
  st = tick(st, true, false); assert.equal(st.q.M, true);
  st = tick(st, false, false); assert.equal(st.q.M, true);
  st = tick(st, true, true); assert.equal(st.q.M, true);
  st = tick(st, false, true); assert.equal(st.q.M, false);
});

test("a loop of logic blocks is reported", () => {
  const d: Design = { parts: [{ id: "core", kind: "core", x: 0, y: 0, dir: 0 }, { id: "g", kind: "gate", x: 0, y: 1, dir: 0 }, { id: "h", kind: "gate", x: 0, y: 2, dir: 0 }],
    wires: [{ from: "g", to: "h", inv: false }, { from: "h", to: "g", inv: true }], modes: {} };
  assert.deepEqual([...gateOrder(d).loop].sort(), ["g", "h"]);
  assert.ok(gradeDesign(WLEVELS.find((l) => l.id === "sandbox")!, d).problems.includes("loop"));
});

test("loose parts are found", () => {
  const d: Design = { parts: [{ id: "core", kind: "core", x: 0, y: 0, dir: 0 }, { id: "a", kind: "body", x: 2, y: 0, dir: 0 }], wires: [], modes: {} };
  assert.deepEqual([...looseParts(d)], ["a"]);
});

test("the core's heartbeat is always on and an unwired wing stays off", () => {
  const l = WLEVELS[0];
  const d: Design = { parts: [{ id: "core", kind: "core", x: 0, y: 0, dir: 0 }, { id: "w", kind: "wingS", x: 1, y: 0, dir: 0 }], wires: [], modes: {} };
  const w = makeWorld(l.setups[0], d);
  assert.equal(sense(w, w.parts[0]), true);
  assert.equal(runSetup(l, d, 0).outcome, "timeout");
});

/* ── the replay: scrubbing must land on exactly what happened ─────────────── */

test("a recorded trace replays exactly: any tick rebuilt from a snapshot matches a fresh run", () => {
  for (const id of ["eyes", "door3", "glass", "spider"]) {
    const l = WLEVELS.find((x) => x.id === id)!;
    const d = WSOLUTIONS[id];
    const tr = runTrace(l, d, 0);
    const fresh = makeWorld(l.setups[0], d);
    for (let k = 0; k < tr.ticks; k++) {
      if (k) step(fresh);
      // check at a handful of ticks, including snapshot boundaries and odd offsets
      if (k % 37 && k % SNAP && k !== tr.ticks - 1) continue;
      const w = worldAt(tr, k);
      assert.equal(w.t, fresh.t, `${id} @${k}: tick`);
      assert.ok(Math.abs(w.x - fresh.x) < 1e-9 && Math.abs(w.y - fresh.y) < 1e-9, `${id} @${k}: position`);
      assert.ok(Math.abs(w.a - fresh.a) < 1e-9, `${id} @${k}: angle`);
      assert.deepEqual(w.eaten, fresh.eaten, `${id} @${k}: sugar`);
      assert.deepEqual(w.brain.q, fresh.brain.q, `${id} @${k}: memory`);
    }
  }
});

test("the trace's waveform is the signal every part really carried", () => {
  const l = WLEVELS.find((x) => x.id === "door3")!;
  const d = WSOLUTIONS.door3;
  const tr = runTrace(l, d, 0);
  const w = makeWorld(l.setups[0], d);
  assert.ok(tr.rows.length >= 4, "door3 has senses, toggles and wings to show");
  for (let k = 1; k < tr.ticks; k++) {
    step(w);
    tr.rows.forEach((r, i) => {
      const real = w.parts.find((p) => p.id === r.id)?.on ?? false;
      assert.equal(bitAt(tr, i, k), real, `${r.id} @${k}`);
    });
  }
});

test("the trace ends where the graded run ends", () => {
  for (const l of LEVELS) {
    const tr = runTrace(l, WSOLUTIONS[l.id], 0);
    assert.equal(tr.outcome, runSetup(l, WSOLUTIONS[l.id], 0).outcome, `${l.id}: outcome`);
    assert.equal(tr.ticks - 1, runSetup(l, WSOLUTIONS[l.id], 0).ticks, `${l.id}: length`);
  }
});

/* ── par and diagnosis ────────────────────────────────────────────────────── */

test("every level's par is reachable: the reference design meets both halves", () => {
  for (const l of LEVELS) {
    assert.ok(l.par, `${l.id} has no par`);
    const g = gradeDesign(l, WSOLUTIONS[l.id]);
    assert.ok(g.gates <= l.par!.gates, `${l.id}: ${g.gates} gates > par ${l.par!.gates}`);
    assert.ok(g.seconds <= l.par!.seconds, `${l.id}: ${g.seconds.toFixed(1)}s > par ${l.par!.seconds}s`);
  }
});

test("a wing nobody wired is reported as dead, and the finding points at its row", () => {
  const l = WLEVELS.find((x) => x.id === "eyes")!;
  // the reference design with the right wing's nerve cut
  const base = WSOLUTIONS.eyes;
  const broken: Design = { ...base, wires: base.wires.filter((w) => w.to !== "wr") };
  const tr = runTrace(l, broken, 0);
  const found = diagnose(l, broken, tr);
  const dead = found.find((f) => f.tone === "dead" && f.row !== undefined && tr.rows[f.row].id === "wr");
  assert.ok(dead, `no dead-wing finding: ${JSON.stringify(found)}`);
  assert.equal(dead.partId, "wr", "the finding can take the player back to the part to edit");
  assert.equal(dead.tick, 0, "a never-fired signal starts being inspectable at launch");
  assert.equal(rowStats(tr, tr.rows.findIndex((r) => r.id === "wr")).on, 0);
});

test("a memory that never gets set is reported, not just the failure", () => {
  const l = WLEVELS.find((x) => x.id === "full")!;
  const base = WSOLUTIONS.full;
  const noSet: Design = { ...base, wires: base.wires.filter((w) => w.to !== "M") };
  const found = diagnose(l, noSet, runTrace(l, noSet, 0));
  assert.ok(found.some((f) => f.tone === "dead" && /记住|set/.test(f.zh + f.en)), JSON.stringify(found));
});

test("a cleared run is told what is still worth pushing", () => {
  const l = WLEVELS.find((x) => x.id === "door3")!;
  const g = gradeDesign(l, WSOLUTIONS.door3);
  const push = nextGoal(l, g.gates, g.seconds);
  assert.equal(push.length, 2);
  assert.ok(push.every((f) => f.tone === "good"), "the reference meets par, so both notes are positive");
  const worse = nextGoal(l, g.gates + 5, g.seconds + 5);
  assert.ok(worse.every((f) => f.tone === "note"), "a sloppier run is given both targets");
});

/* ── the duel: two designs, one level, decided only by what they did ─────── */

test("a duel is decided by behaviour first and efficiency second", () => {
  const l = WLEVELS.find((x) => x.id === "eyes")!;
  const good = WSOLUTIONS.eyes;
  // the same design with one nerve cut: it can still fly, but it cannot finish
  const lame: Design = { ...good, wires: good.wires.filter((w) => w.to !== "wr") };
  const d = duel(l, good, lame);
  assert.equal(d.winner, "a");
  assert.equal(d.by, "cleared", `expected the clear count to decide it, got ${d.by}`);
  assert.ok(d.a.cleared > d.b.cleared);
});

test("between two designs that both finish, the faster one wins", () => {
  const l = WLEVELS.find((x) => x.id === "eyes")!;
  const base = WSOLUTIONS.eyes;
  // same brain, heavier body: it still gets there, just slower
  const heavy: Design = { ...base, parts: [...base.parts, { id: "wgt", kind: "weight", x: 0, y: 1, dir: 0 }] };
  const d = duel(l, base, heavy);
  assert.equal(d.a.cleared, d.b.cleared, "both should finish");
  assert.equal(d.by, "time");
  assert.equal(d.winner, "a");
  assert.ok(d.a.total < d.b.total);
});

test("equal behaviour falls through to the smaller brain", () => {
  // a level that allows inverted nerves at all
  const l = WLEVELS.find((x) => x.id === "door3")!;
  const base = WSOLUTIONS.door3;
  // the heartbeat is on every tick, so NOT heartbeat is a constant 0; OR-ing it
  // into a wing adds gates and cannot change a single tick of the flight
  const padded: Design = { ...base, wires: [...base.wires, { from: "core", to: "wl", inv: true }] };
  const d = duel(l, base, padded);
  assert.equal(d.a.total, d.b.total, "a nerve that always carries 0 cannot change the flight");
  assert.deepEqual(d.a.outcomes, d.b.outcomes);
  assert.ok(d.b.gates > d.a.gates, "but it does cost gates");
  assert.equal(d.by, "gates");
  assert.equal(d.winner, "a");
});

test("a design that cannot fly loses before anything else is compared", () => {
  const l = WLEVELS.find((x) => x.id === "eyes")!;
  const loose: Design = { ...WSOLUTIONS.eyes, parts: [...WSOLUTIONS.eyes.parts, { id: "far", kind: "body", x: 4, y: 4, dir: 0 }] };
  const d = duel(l, WSOLUTIONS.eyes, loose);
  assert.ok(d.b.problems.length > 0, "the loose part should be reported");
  assert.equal(d.by, "legal");
  assert.equal(d.winner, "a");
});

test("a design duelling itself is a dead heat", () => {
  for (const id of ["eyes", "door3", "spider"]) {
    const l = WLEVELS.find((x) => x.id === id)!;
    const d = duel(l, WSOLUTIONS[id], WSOLUTIONS[id]);
    assert.equal(d.winner, "tie", `${id} should tie itself`);
    assert.equal(d.by, "tie");
  }
});

test("a duel is reproducible: the same two designs always give the same verdict", () => {
  const l = WLEVELS.find((x) => x.id === "door3")!;
  const other = WSOLUTIONS.door2;
  const first = duel(l, WSOLUTIONS.door3, other);
  for (let k = 0; k < 3; k++) {
    const again = duel(l, WSOLUTIONS.door3, other);
    assert.deepEqual(again, first, "a replayed duel must give byte-identical results");
  }
});

/* ── Verilog export: the file has to be the circuit, not a picture of it ──── */

/** Read our own .v back: rebuild the gate list and the register pairing from it. */
function parseVerilog(text: string) {
  const gates: [string, string, string][] = [];
  for (const m of text.matchAll(/^\s*nand g(\d+)_inst \(g\1, ([^,]+), ([^)]+)\);$/gm))
    gates.push([`g${m[1]}`, m[2].trim(), m[3].trim()]);
  const outs = [...text.matchAll(/^\s*assign (\w+) = (g\d+);$/gm)].map((m) => [m[1], m[2]] as [string, string]);
  const regs = [...text.matchAll(/^\s*(\w+)_r <= (g\d+);$/gm)].map((m) => [m[1], m[2]] as [string, string]);
  const ports = {
    ins: [...text.matchAll(/^\s*input  wire (\w+)/gm)].map((m) => m[1]),
    outs: [...text.matchAll(/^\s*output wire (\w+)/gm)].map((m) => m[1])
  };
  return { gates, outs, regs, ports };
}

test("the exported Verilog carries exactly the gates the chip has", () => {
  for (const id of ["eyes", "spider", "full", "door3", "glass"]) {
    const d = WSOLUTIONS[id];
    const chip = compileWiring(d);
    const v = toVerilog(d, `tapefly_${id}`);
    const p = parseVerilog(v.text);
    assert.equal(p.gates.length, chip.gates.length, `${id}: gate count`);
    assert.equal(v.gates, chip.gates.length);
    assert.equal(v.regs, chip.state.length);
    assert.equal(p.ports.ins.length, chip.inputs.length + 1, `${id}: one port per sensor, plus clk`);
    assert.equal(p.ports.outs.length, chip.outputs.length + chip.state.length, `${id}: wings and state are both exposed`);
    assert.equal(p.regs.length, chip.state.length, `${id}: one clocked register per state bit`);
    assert.ok(/^[a-z_][a-z0-9_$]*$/.test(v.module), `${id}: module name is a legal identifier`);
  }
});

test("every wire the Verilog reads is a wire it declared", () => {
  for (const id of Object.keys(WSOLUTIONS)) {
    const v = toVerilog(WSOLUTIONS[id], `tapefly_${id}`);
    const p = parseVerilog(v.text);
    const known = new Set<string>(["1'b0", "1'b1", ...p.ports.ins, ...p.gates.map((g) => g[0]),
      ...p.regs.map(([n]) => `${n}_r`)]);
    for (const [g, a, b] of p.gates)
      for (const side of [a, b])
        assert.ok(known.has(side), `${id}: ${g} reads ${side}, which is never declared`);
    for (const [, g] of p.outs) assert.ok(known.has(g), `${id}: an output reads an undeclared ${g}`);
  }
});

test("the exported circuit computes what the fly's brain computes", () => {
  // rebuild the netlist from the text and run it against the chip on every
  // input word and state combination — the same check the chip itself passes
  for (const id of ["eyes", "full", "door3"]) {
    const d = WSOLUTIONS[id];
    const chip = compileWiring(d);
    const p = parseVerilog(toVerilog(d, `tapefly_${id}`).text);
    const order = new Map(p.gates.map((g, i) => [g[0], i]));
    const inNames = p.ports.ins.filter((n) => n !== "clk");
    const base = 2 + chip.nIn;
    for (let word = 0; word < (1 << chip.nIn); word++) {
      // evaluate the parsed text
      const val = new Map<string, boolean>([["1'b0", false], ["1'b1", true]]);
      inNames.forEach((n, k) => val.set(n, !!((word >> k) & 1)));
      p.regs.forEach(([n], k) => val.set(`${n}_r`, !!((word >> (inNames.length + k)) & 1)));
      for (const [g, a, b] of p.gates) val.set(g, !(val.get(a)! && val.get(b)!));
      // evaluate the chip
      const sig = new Uint8Array(base + chip.gates.length);
      sig[1] = 1;
      for (let i = 0; i < chip.nIn; i++) sig[2 + i] = (word >> i) & 1;
      chip.gates.forEach(([a, b], i) => { sig[base + i] = sig[a] & sig[b] ? 0 : 1; });
      // the wings and the next-state values are the last nOut gates, in order
      p.outs.forEach(([, g], j) => {
        assert.equal(order.get(g), chip.gates.length - chip.nOut + j,
          `${id}: output ${j} should read the gate at ${chip.gates.length - chip.nOut + j}, reads ${g}`);
      });
      for (const [g] of p.gates) {
        const i = order.get(g)!;
        assert.equal(val.get(g), !!sig[base + i], `${id} word ${word}: ${g} disagrees with the chip`);
      }
    }
  }
});
