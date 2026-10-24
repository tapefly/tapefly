import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { rulesTable } from "../sim/rules";
import { BRAIN } from "../sim/netlist";
import { answerString, netlistBytes } from "../sim/tapeout";
import { netDepth, cost } from "../sim/compile";

/* The numbers quoted in docs/tap/TAP-draft-fly-reflex-pod-task.md, recomputed. */
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");

test("the proposed PoD task's truth table, reference and hashes match the code", () => {
  const T = rulesTable().map((y) => y.toString(8)).join("");
  assert.equal(sha(T), "94ec2e39868755edaf065796cc849830e4551c65a9af816a09ea906172bde3cd");
  assert.equal(readFileSync(new URL("../docs/tap/fly-reflex-truth-table.txt", import.meta.url), "utf8").trimEnd(), T);
  assert.equal(answerString(BRAIN), T);
  assert.equal(sha(Buffer.from(netlistBytes(BRAIN).slice(2), "hex")), "a763117011fe4c4be7106d9b0d2c78fe79b81c15ccc2a6531c9263b4f443d4dd");
  assert.deepEqual([BRAIN.gates.length, netDepth(BRAIN), cost(BRAIN)], [50, 9, 36450]);
  const counts = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => [...T].filter((c) => c === String(v)).length);
  assert.deepEqual(counts, [640, 640, 600, 168, 0, 2048, 0, 0]);
});
