import { test } from "node:test";
import assert from "node:assert/strict";
import { together, round, match, challengeQuery, readChallenge, cleanName } from "../sim/versus";
import { brainFromProgram, brainFromNetlist, liveDay } from "../sim/challenge";
import { OFFICIAL_PROGRAM, type Program } from "../sim/program";
import { BRAIN } from "../sim/netlist";
import { addDays } from "../sim/lineage";
import { mulberry32 } from "../sim/rand";

const GREEDY: Program = { rules: [], otherwise: { then: 0 } };
const CAREFUL: Program = { rules: [{ when: { threat: [2, 3] }, then: 1, gf: true }, { when: { food: [1, 3] }, then: 0 }], otherwise: { then: 2 } };

function randomProgram(seed: number): Program {
  const r = mulberry32(seed);
  const pick = (n: number) => Math.floor(r() * n);
  const rules = Array.from({ length: 1 + pick(5) }, () => {
    const s = (["food", "threat", "hunger", "light", "novelty"] as const)[pick(5)];
    const lo = pick(4), hi = lo + pick(4 - lo);
    return { when: { [s]: [lo, hi] as [number, number] }, then: pick(4), gf: r() < 0.2 };
  });
  return { rules, otherwise: { then: pick(4) } };
}

test("one fly alone in the versus dish lives exactly the engine's day", () => {
  const brains = [brainFromNetlist(BRAIN), brainFromProgram(GREEDY), brainFromProgram(CAREFUL), ...[1, 2, 3, 4, 5].map((s) => brainFromProgram(randomProgram(s)))];
  for (let i = 0; i < 20; i++) {
    const date = addDays("2026-09-20", i);
    for (const b of brains) {
      const solo = together([b], date).lives[0];
      const day = liveDay(b, date);
      assert.equal(solo.lived, day.ticks.length, `${date} length`);
      assert.deepEqual(
        solo.ticks.map((t) => [t.x, t.y, t.hunger, t.inWord, t.outWord, t.ate, t.alive]),
        day.ticks.map((t) => [t.x, t.y, t.hunger, t.inWord, t.outWord, t.ate, t.alive]),
        `${date} ticks`
      );
    }
  }
});

test("a brain against itself draws every round, tick for tick", () => {
  const m = match(brainFromProgram(OFFICIAL_PROGRAM), brainFromProgram(OFFICIAL_PROGRAM), "2026-10-19");
  assert.equal(m.draws, 7);
  assert.equal(m.winner, -1);
  for (const r of m.rounds) assert.deepEqual(r.lives[0].ticks, r.lives[1].ticks);
});

test("swapping sides mirrors the result", () => {
  const a = brainFromProgram(GREEDY), b = brainFromProgram(CAREFUL);
  const ab = match(a, b, "2026-10-19"), ba = match(b, a, "2026-10-19");
  assert.deepEqual(ab.wins, [ba.wins[1], ba.wins[0]]);
  ab.rounds.forEach((r, i) => assert.equal(r.winner === -1 ? -1 : 1 - r.winner, ba.rounds[i].winner));
});

test("the food is shared: a drop is eaten once, and rivals change each other's day", () => {
  let interacted = 0;
  for (let i = 0; i < 14; i++) {
    const date = addDays("2026-10-01", i);
    const a = brainFromProgram(GREEDY), b = brainFromProgram(randomProgram(100 + i));
    const r = round(a, b, date);
    const eatenCells = new Set<string>();
    for (const life of r.lives) for (const t of life.ticks) if (t.ate) eatenCells.add(`${t.x},${t.y}`);
    assert.ok(eatenCells.size <= r.world.food.length);
    const solo = together([b], date).lives[0];
    if (solo.lived !== r.lives[1].lived || solo.meals !== r.lives[1].meals) interacted++;
  }
  assert.ok(interacted > 0, "a rival should change some days");
});

test("a challenge round-trips through its link, and bad names are cleaned", () => {
  const c = { a: { program: GREEDY, name: "Bolt" }, b: { program: CAREFUL, name: "Moss" }, through: "2026-10-19" };
  const back = readChallenge(new URLSearchParams(challengeQuery(c)), "2026-01-01");
  assert.equal(back.a.name, "Bolt");
  assert.equal(back.b?.name, "Moss");
  assert.equal(back.through, "2026-10-19");
  const open = readChallenge(new URLSearchParams(challengeQuery({ ...c, b: null })), "2026-01-01");
  assert.equal(open.b, null);
  assert.equal(cleanName("  <script>x  ", "F"), "scriptx");
  assert.equal(cleanName("", "Fallback"), "Fallback");
  assert.throws(() => readChallenge(new URLSearchParams(""), "2026-01-01"));
});
