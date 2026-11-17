import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TACTICS, TACTIC_IDS, PARTS, PART_IDS, RIVALS, RUN, BODY_SLOTS, programOf, report, aloneGates, budgetFor, newRun, buy, sellChip, sellPart, move, reroll,
  canFight, fight, practice, fightRival, ladder, type TacticId, type Run
} from "../sim/arena";
import { duel, packWord, bodyOf, compileFighter, T, type GearId } from "../sim/duel";
import { compileProgram } from "../sim/compile";
import { evalWord } from "../sim/netlist";
import { runProgram } from "../sim/program";
import { mulberry32 } from "../sim/rand";

const pick = (seed: number): TacticId[] => {
  const r = mulberry32(seed);
  const left = TACTIC_IDS.slice() as TacticId[];
  return Array.from({ length: 1 + Math.floor(r() * 5) }, () => left.splice(Math.floor(r() * left.length), 1)[0]);
};

test("every chip costs real gates on its own, and has a price", () => {
  for (const c of TACTIC_IDS) { assert.ok(aloneGates(c) > 0, c); assert.ok(TACTICS[c].price > 0, c); }
  for (const p of PART_IDS) assert.ok(PARTS[p].price > 0, p);
});

test("the compiled netlist equals the chip rules on all 4,096 words", () => {
  for (let k = 0; k < 24; k++) {
    const chips = pick(1000 + k), p = programOf(chips), net = compileProgram(p);
    for (let w = 0; w < 4096; w++) {
      const r = runProgram(p, w), out = evalWord(net, w);
      assert.equal(out, r.out, `${chips.join(",")} word ${w}`);
    }
  }
});

test("the gate report agrees with the compiler", () => {
  for (let k = 0; k < 12; k++) {
    const chips = pick(2000 + k);
    assert.equal(report(chips).gates, compileFighter(programOf(chips)).gates);
  }
});

test("packWord puts each sense in its own two bits", () => {
  assert.equal(packWord(3, 0, 0, 0, 0, 0), 3);
  assert.equal(packWord(0, 2, 0, 0, 0, 0), 2 << 2);
  assert.equal(packWord(0, 0, 0, 0, 0, 3), 3 << 10);
});

test("every rival fits the budget of its fight and has legal parts", () => {
  RIVALS.forEach((r, i) => {
    assert.ok(report(r.chips).gates <= budgetFor(i), `${r.name}: ${report(r.chips).gates} > ${budgetFor(i)}`);
    assert.ok(r.gear.length <= BODY_SLOTS);
    assert.equal(new Set(r.chips).size, r.chips.length);
  });
});

test("a duel is deterministic", () => {
  const a = { program: programOf(["block", "punish", "bite"]), gear: ["shell"] as GearId[] }, b = { program: programOf(["bite"]) };
  const x = duel(a, b, 1234), y = duel(a, b, 1234);
  assert.deepEqual(x.events, y.events);
  assert.equal(x.winner, y.winner);
  assert.deepEqual(x.hpLeft, y.hpLeft);
});

test("a mirror match is fair: neither side wins much more often", () => {
  for (const chips of [["bite"], ["block", "punish", "bite"]] as TacticId[][]) {
    let w = [0, 0];
    for (let s = 1; s <= 60; s++) { const r = duel({ program: programOf(chips) }, { program: programOf(chips) }, s * 7919); if (r.winner >= 0) w[r.winner]++; }
    assert.ok(Math.abs(w[0] - w[1]) <= 16, `${chips.join(",")}: ${w}`);
  }
});

test("health never goes up and the frames cover the fight", () => {
  const r = duel({ program: programOf(["bite"]), gear: ["venom"] }, { program: programOf(["block", "bite"]), gear: ["shell"] }, 99);
  assert.equal(r.frames.length, r.ticks);
  for (let t = 1; t < r.frames.length; t++) for (const i of [0, 1]) assert.ok(r.frames[t][i].hp <= r.frames[t - 1][i].hp + 1e-9);
  assert.ok(r.ticks <= T.ticks);
});

test("parts change the body", () => {
  assert.ok(bodyOf(["shell"]).maxHp > bodyOf([]).maxHp);
  assert.ok(bodyOf(["jaws"]).dmg > bodyOf([]).dmg);
  assert.ok(bodyOf(["legs"]).speed > bodyOf([]).speed);
  assert.ok(bodyOf(["lungs"]).regen > bodyOf([]).regen);
});

test("reading the rival matters: dodging and punishing beats biting blindly", () => {
  let w = 0;
  for (let s = 1; s <= 30; s++) if (fightRival(["sidestep", "punish"], [], { name: "x", ai: false, chips: ["bite"], gear: [] }, s, 0).winner === 0) w++;
  assert.ok(w >= 24, `won ${w}/30`);
});

test("a run: shop, budget, fights, and it ends", () => {
  let r: Run = newRun("2026-11-03");
  assert.equal(r.gold, RUN.startGold);
  assert.ok(r.shop.some((o) => o && o.kind === "chip" && o.id === "bite"), "the first shop offers Bite");
  const slot = r.shop.findIndex((o) => o && o.kind === "chip" && o.id === "bite");
  r = buy(r, slot);
  assert.deepEqual(r.chips, ["bite"]);
  assert.equal(r.gold, RUN.startGold - TACTICS.bite.price);
  const before = r.gold;
  r = reroll(r);
  assert.equal(r.gold, before - RUN.reroll);
  assert.ok(canFight(r).ok);
  // practice does not change the run
  const p = practice(r, 0);
  assert.ok(p.result.ticks > 0);
  let guard = 0;
  while (!r.over && guard++ < 20) r = fight(r).run;
  assert.ok(r.over, "the run ends");
  assert.ok(r.history.length <= RUN.maxFights);
  // selling and moving
  let s: Run = { ...newRun("2026-11-03"), chips: ["bite", "block"], gear: ["shell"], gold: 0 };
  s = move(s, 1, -1);
  assert.deepEqual(s.chips, ["block", "bite"]);
  s = sellChip(s, 0);
  assert.equal(s.gold, Math.floor(TACTICS.block.price / 2));
  s = sellPart(s, 0);
  assert.deepEqual(s.gear, []);
});

test("over budget cannot fight", () => {
  const all = TACTIC_IDS.slice() as TacticId[];
  const r: Run = { ...newRun("2026-11-03"), chips: all };
  assert.ok(report(all).gates > budgetFor(0));
  assert.equal(canFight(r).ok, false);
});

test("the API ladder matches single fights", () => {
  const chips: TacticId[] = ["block", "punish", "bite"];
  const l = ladder("2026-11-03", programOf(chips), chips, ["shell"]);
  assert.equal(l.steps.length, RIVALS.length);
  const run = fightRival(chips, ["shell"], RIVALS[2], l.steps[2].seed, 2);
  assert.equal(l.steps[2].result, run.winner === 0 ? "win" : run.winner === 1 ? "loss" : "draw");
});

test("editor rules round-trip through a program code, and a program rival fights", async () => {
  const { toProgram, fromProgram } = await import("../sim/duel");
  const { encodeProgram, decodeProgram } = await import("../sim/program");
  const rules = [TACTICS.block.rule, { when: { myhp: [0, 1] as [number, number], energy: [2, 3] as [number, number] }, prev: [1 as const], then: 0 as const, bite: true }, TACTICS.bite.rule];
  const p = toProgram(rules, { then: 2 });
  const back = fromProgram(decodeProgram(encodeProgram(p)));
  assert.deepEqual(toProgram(back.rules, back.otherwise), toProgram(rules, { then: 2 }));
  const rival = { name: "friend", ai: false, chips: [] as TacticId[], gear: [] as GearId[], program: p };
  const f = fightRival(["bite"], [], rival, 7, 0);
  assert.ok(f.rivalGates > 0);
  assert.equal(f.rivalGates, compileFighter(p).gates);
});
