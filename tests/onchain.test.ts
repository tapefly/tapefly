import { test } from "node:test";
import assert from "node:assert/strict";
import { evalInputBytes } from "../sim/tapeout";
import { decodeAnswer, nandNeeded } from "../sim/onchain";
import { BRAIN, evalWord } from "../sim/netlist";

test("eval inputs are packed bit-wise, first pin in bit 0 of byte 0", () => {
  assert.equal(evalInputBytes(0, 12), "0x0000");
  assert.equal(evalInputBytes(1, 12), "0x0100");
  assert.equal(evalInputBytes(0x0a5f, 12), "0x5f0a");
  assert.equal(evalInputBytes(0xfff, 12), "0xff0f");
});

test("eval answers decode packed or one byte per output", () => {
  for (let w = 0; w < 4096; w += 97) {
    const v = evalWord(BRAIN, w);
    assert.equal(decodeAnswer(`0x${v.toString(16).padStart(2, "0")}`, 3), v);
    const per = [0, 1, 2].map((i) => ((v >> i) & 1).toString(16).padStart(2, "0")).join("");
    assert.equal(decodeAnswer(`0x${per}`, 3), v);
  }
  assert.throws(() => decodeAnswer("0x0000", 3));
});

test("a tape-out burns one NAND per gate (TAP-02 §6)", () => {
  assert.equal(nandNeeded(BRAIN), BRAIN.gates.length);
});
