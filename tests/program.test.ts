import { test } from "node:test";
import assert from "node:assert/strict";
import { OFFICIAL_PROGRAM, programTable, encodeProgram, decodeProgram, officialAgrees, validateProgram, type Program } from "../sim/program";
import { compileProgram, netDepth, cost } from "../sim/compile";
import { evalWord, checkNetlist, BRAIN } from "../sim/netlist";
import { rulesTable } from "../sim/rules";
import { stream } from "../sim/rand";

test("official program = official rules on all 4096 words", () => {
  assert.ok(officialAgrees());
  assert.deepEqual(programTable(OFFICIAL_PROGRAM), rulesTable());
});

function equivalent(p: Program) {
  const n = compileProgram(p);
  checkNetlist(n);
  for (const g of n.gates) assert.ok(g.length === 2);
  const t = programTable(p);
  for (let w = 0; w < 4096; w++) assert.equal(evalWord(n, w), t[w], `word ${w}`);
  return n;
}

test("compiled official program matches on all 4096 words and is small", () => {
  const n = equivalent(OFFICIAL_PROGRAM);
  // within a modest factor of the hand-tuned 50-gate brain
  assert.ok(n.gates.length <= BRAIN.gates.length * 2, `gates ${n.gates.length}`);
  assert.ok(netDepth(n) > 0 && cost(n) > 0);
});

test("trivial programs compile (constants, single rule)", () => {
  for (let b = 0; b < 4; b++) for (const gf of [false, true]) equivalent({ rules: [], otherwise: { then: b, gf } });
  equivalent({ rules: [{ when: { food: [1, 2] }, then: 0 }], otherwise: { then: 3 } });
  equivalent({ rules: [{ when: {}, prev: [0, 3], then: 1, gf: true }], otherwise: { then: 2 } });
});

test("random programs compile exactly", () => {
  const rnd = stream(42, 7);
  const r = () => Math.floor(rnd() * 4294967296);
  for (let k = 0; k < 60; k++) {
    const nr = r() % 10;
    const rules = Array.from({ length: nr }, () => {
      const when: Record<string, [number, number]> = {};
      for (const s of ["food", "threat", "light", "novelty", "hunger"]) {
        if (r() % 3 === 0) { const a = r() % 4, b = r() % 4; when[s] = [Math.min(a, b), Math.max(a, b)]; }
      }
      const prev = r() % 3 === 0 ? [0, 1, 2, 3].filter(() => r() % 2 === 0) : undefined;
      return { when, prev, then: r() % 4, gf: r() % 5 === 0 };
    });
    const p = validateProgram({ rules, otherwise: { then: r() % 4, gf: r() % 7 === 0 } });
    equivalent(p);
    // URL codec round-trip preserves behaviour
    const q = decodeProgram(encodeProgram(p));
    assert.deepEqual(programTable(q), programTable(p));
  }
});

test("codec round-trips the official program", () => {
  const code = encodeProgram(OFFICIAL_PROGRAM);
  assert.match(code, /^p1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(programTable(decodeProgram(code)), rulesTable());
});

test("the four home-page switches round-trip through a builder link, and every combination compiles", async () => {
  const { programFromSwitches, switchesFromProgram } = await import("../sim/instincts");
  const { encodeProgram, decodeProgram } = await import("../sim/program");
  const { brainFromProgram } = await import("../sim/challenge");
  for (let m = 0; m < 16; m++) {
    const s = { jump: !!(m & 1), flee: !!(m & 2), eat: !!(m & 4), roam: !!(m & 8) };
    const p = programFromSwitches(s);
    assert.deepEqual(switchesFromProgram(decodeProgram(encodeProgram(p))), s);
    assert.ok(brainFromProgram(p).netlist.gates.length > 0);
  }
  assert.equal(switchesFromProgram({ rules: [{ when: { light: [1, 3] }, then: 2 }], otherwise: { then: 3 } }), null);
});
