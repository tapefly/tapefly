import { test } from "node:test";
import assert from "node:assert/strict";
import { brainFromProgram, brainFromNetlist, duel, week, importNetlist, examine, liveDay } from "../sim/challenge";
import { OFFICIAL_PROGRAM } from "../sim/program";
import { BRAIN, evalWord } from "../sim/netlist";
import { netlistBytes, answerString } from "../sim/tapeout";
import { colony } from "../sim/colony";
import { foundingOn, seedFromDate } from "../sim/lineage";
import { runCalibration } from "../sim/calibration";

const D = "2026-10-15";

test("the official brain plugged in by hand lives member 0's exact day", () => {
  const c = colony(seedFromDate(D), D, foundingOn(D));
  const day = liveDay(brainFromNetlist(BRAIN), D);
  assert.equal(day.ticks.length, c.members[0].lived);
  assert.deepEqual(day.ticks.map((t) => [t.x, t.y]), c.members[0].day.ticks.map((t) => [t.x, t.y]));
});

test("the compiled official program behaves exactly like the official brain", () => {
  const a = liveDay(brainFromProgram(OFFICIAL_PROGRAM), D);
  const b = liveDay(brainFromNetlist(BRAIN), D);
  assert.deepEqual(a.ticks.map((t) => t.outWord), b.ticks.map((t) => t.outWord));
});

test("a duel ranks nine and challengers lose ties", () => {
  const d = duel(brainFromNetlist(BRAIN), D);
  assert.equal(d.table.length, 9);
  const me = d.table[d.place - 1];
  assert.ok(me.challenger);
  // member 0 has the same body and brain → identical score, so the challenger sits below it
  const twin = d.table.findIndex((r) => !r.challenger && r.lived === me.lived && r.meals === me.meals);
  assert.ok(twin >= 0 && twin < d.place - 1);
});

test("a week is deterministic", () => {
  const b = brainFromProgram(OFFICIAL_PROGRAM);
  assert.deepEqual(week(b, D), week(b, D));
});

test("TapeOut bytes and JSON both import back to the same circuit", () => {
  const hex = netlistBytes(BRAIN);
  assert.equal((hex.length - 2) / 2, BRAIN.gates.length * 7);
  const n = importNetlist(hex);
  assert.equal(answerString(n), answerString(BRAIN));
  const j = importNetlist(JSON.stringify(BRAIN));
  assert.equal(answerString(j), answerString(BRAIN));
  assert.throws(() => importNetlist("0x01"));
  assert.throws(() => importNetlist(JSON.stringify({ nIn: 8, nOut: 3, gates: [[0, 1]] })));
  assert.throws(() => importNetlist(JSON.stringify({ nIn: 12, nOut: 3, gates: [[0, 1], [99, 2], [2, 3]] })));
});

test("examine reproduces the committed calibration numbers", () => {
  const e = examine(BRAIN);
  const { totals } = runCalibration();
  assert.equal(e.agree, totals.agree);
  assert.equal(e.behaviour, totals.behaviourAgree);
  assert.equal(evalWord(BRAIN, 0), evalWord(importNetlist(netlistBytes(BRAIN)), 0));
});
