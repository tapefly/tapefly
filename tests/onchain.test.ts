import { test } from "node:test";
import assert from "node:assert/strict";
import { evalInputBytes } from "../sim/tapeout";
import { decodeAnswer, nandNeeded } from "../sim/onchain";
import { BRAIN, evalWord } from "../sim/netlist";
import config from "../config/tapeout.json";

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

test("the public proof config names the verified X Layer circuit", () => {
  assert.equal(config.status, "live");
  assert.equal(config.chain, "xlayer");
  assert.equal(config.chainId, 196);
  assert.equal(config.processor, "0x99081e1D0CE916Cd5b2c53e769DFC3B000BFE9A4");
  assert.equal(config.circuitId, 2);
  assert.equal(config.txHash, "0xa7ad0fd9b85e3290fbfe7d78dfba5c0ccc177d1723b3a9f6f18a1a87c937d5cd");
  assert.equal(config.tapedOutAt, "2026-11-14");
});
