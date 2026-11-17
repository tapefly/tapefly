import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../sim/evo/levels";
import { SOLUTIONS } from "../sim/evo/solutions";
import { gradeBrain, allowed } from "../sim/evo/game";
import { compileBrain, decodeBrain, encodeBrain, runRules, validWord, NIN, type EvoProgram } from "../sim/evo/brain";
import { decide, parseBoard, run } from "../sim/evo/world";
import { mulberry32 } from "../sim/rand";

test("every level: the solution clears it, the start brain does not", () => {
  for (const l of LEVELS) {
    const s = SOLUTIONS[l.id];
    assert.ok(s, `no solution for ${l.id}`);
    assert.equal(allowed(l, s), null, `${l.id}: solution uses an organ the level lacks`);
    assert.equal(allowed(l, l.start), null, `${l.id}: start brain uses an organ the level lacks`);
    assert.ok(gradeBrain(l, s).cleared, `${l.id}: solution does not clear`);
    assert.ok(!gradeBrain(l, l.start).cleared, `${l.id}: start brain already clears`);
  }
});

test("each level needs something the previous level's solution lacks (from level 2 on, except the table)", () => {
  for (let i = 1; i < LEVELS.length; i++) {
    if (LEVELS[i].id === "table") continue;
    assert.ok(!gradeBrain(LEVELS[i], SOLUTIONS[LEVELS[i - 1].id]).cleared, `${LEVELS[i].id} falls to ${LEVELS[i - 1].id}'s brain`);
  }
});

function randomProgram(rnd: () => number): EvoProgram {
  const fields = ["wallF", "wallL", "wallR", "smell", "web", "mem"] as const;
  const n = Math.floor(rnd() * 8);
  const rules = Array.from({ length: n }, () => {
    const when: Record<string, number> = {};
    for (const f of fields) if (rnd() < 0.35) when[f] = 1 + Math.floor(rnd() * (f === "smell" ? 30 : 2));
    const r: EvoProgram["rules"][number] = { when, act: Math.floor(rnd() * 4) as 0 | 1 | 2 | 3 };
    if (rnd() < 0.3) r.mem = rnd() < 0.5 ? 0 : 1;
    return r;
  });
  return { rules, otherwise: { act: Math.floor(rnd() * 4) as 0 | 1 | 2 | 3, ...(rnd() < 0.3 ? { mem: 1 as const } : {}) } };
}

test("compiled circuit agrees with the rules on every input the world can produce", () => {
  const rnd = mulberry32(42);
  const progs = [...Object.values(SOLUTIONS), ...LEVELS.map((l) => l.start), ...Array.from({ length: 150 }, () => randomProgram(rnd))];
  for (const p of progs) {
    const n = compileBrain(p);
    assert.equal(n.nIn, NIN);
    for (let w = 0; w < 1 << NIN; w++) {
      if (!validWord(w)) continue;
      assert.equal(decide(n, w), runRules(p, w).out, `word ${w} for ${encodeBrain(p)}`);
    }
  }
});

test("brains survive being shared as text", () => {
  const rnd = mulberry32(7);
  for (let i = 0; i < 200; i++) {
    const p = randomProgram(rnd);
    assert.deepEqual(decodeBrain(encodeBrain(p)), JSON.parse(JSON.stringify(p)));
  }
});

test("a run is deterministic and stops a fly caught in a loop", () => {
  const b = parseBoard(["#####", "#>.f#", "#####"]);
  const wait = compileBrain({ rules: [], otherwise: { act: 0 } });
  const r = run(b, wait, { senses: [], smellRange: 99 }, 50);
  assert.equal(r.outcome, "loop");
  assert.equal(r.ticks, 1);
  const go = compileBrain({ rules: [], otherwise: { act: 1 } });
  const a = run(b, go, { senses: [], smellRange: 99 }, 50), c = run(b, go, { senses: [], smellRange: 99 }, 50);
  assert.equal(a.outcome, "cleared");
  assert.deepEqual(a.frames, c.frames);
});
