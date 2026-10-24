import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, grade } from "../sim/levels";
import { validateProgram } from "../sim/program";
import solutions from "./level-solutions.json";

const SOL = solutions as Record<string, unknown>;

for (const level of LEVELS) {
  test(`level ${level.id}: the starting brain fails, a known brain earns three stars`, () => {
    assert.equal(grade(level, level.start).stars, 0, "the starting brain should not already clear the level");
    const p = validateProgram(SOL[level.id]);
    const g = grade(level, p);
    assert.equal(g.stars, 3, JSON.stringify(g.metrics.days));
  });
}

test("level ids are unique and every level has three goals", () => {
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length);
  for (const l of LEVELS) assert.equal(l.goals.length, 3);
});

test("level 1's coach is honest: one click on approach earns all three stars", async () => {
  const { LEVELS, grade } = await import("../sim/levels");
  const first = LEVELS[0];
  assert.ok(first.coach && first.coach.length > 0);
  assert.equal(grade(first, first.start).stars, 0);
  assert.equal(grade(first, { rules: [], otherwise: { then: 0 } }).stars, 3);
});
