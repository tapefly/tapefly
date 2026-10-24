import { test } from "node:test";
import assert from "node:assert/strict";
import { startManual, step, moveBetween, done } from "../sim/manual";
import { liveDay, brainFromNetlist } from "../sim/challenge";
import { BRAIN } from "../sim/netlist";

/* Drive the manual stepper with the exact moves an official fly made; it must
   reproduce that fly's cells, meals, hunger and death tick for tick. */
for (const date of ["2026-10-13", "2026-10-15", "2026-10-16", "2026-10-18"]) {
  test(`manual stepper reproduces the official fly on ${date}`, () => {
    const day = liveDay(brainFromNetlist(BRAIN), date);
    let m = startManual(date);
    let prev = { x: m.pos.x, y: m.pos.y };
    for (const t of day.ticks) {
      const before = m;
      m = step(m, moveBetween(prev, t), ["approach", "avoid", "explore", "freeze"].indexOf(t.behavior));
      const got = m.ticks[m.ticks.length - 1];
      assert.equal(got.inWord, t.inWord, `inWord at tick ${t.t}`);
      assert.deepEqual([got.x, got.y, got.ate, got.alive, got.hunger], [t.x, t.y, t.ate, t.alive, t.hunger], `tick ${t.t}`);
      assert.notEqual(before, m);
      prev = { x: t.x, y: t.y };
    }
    assert.equal(m.alive, day.alive);
    assert.ok(done(m));
  });
}

test("a fly that never moves starves before dusk", () => {
  let m = startManual("2026-10-15");
  while (!done(m)) m = step(m, "stay");
  assert.equal(m.alive, false);
  assert.ok(m.ticks.length < m.tune.ticks);
});
