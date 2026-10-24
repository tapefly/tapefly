/* ── tests/calibration.test.ts ───────────────────────────────────────────────
   The committed certificate is a checked artifact, not a snapshot someone
   forgot to update: these tests recompute the suite and compare it, value for
   value, with calibration/ffw-nand-1.json. Change the netlist, the reference
   or the rules without re-running `npm run calibrate`, and this fails — so the
   site, the script and the file can never tell different stories.
   --------------------------------------------------------------------------- */
import { test } from "node:test";
import assert from "node:assert/strict";

import committed from "../calibration/ffw-nand-1.json";
import { runCalibration, fidelityCert } from "../sim/calibration";
import { stableStringify } from "../sim/hash";
import { RULES } from "../sim/rules";
import { REF_DRIVES } from "../sim/reference";

test("calibration: totals are pinned to this commit", () => {
  const { totals } = runCalibration();
  assert.equal(totals.agree, 3494);
  assert.equal(totals.disagree, 602);
  assert.equal(totals.behaviourAgree, 3494);
  assert.deepEqual(totals.gf, { tp: 2048, fp: 0, fn: 0, tn: 2048 });
});

test("calibration: buckets account for every word and every disagreement", () => {
  const { totals } = runCalibration();
  const rows = RULES.reduce((n, r) => n + totals.byBrainRule[r.id].rows, 0);
  const drives = REF_DRIVES.reduce((n, d) => n + totals.byRefDrive[d.id].rows, 0);
  const dr = RULES.reduce((n, r) => n + totals.byBrainRule[r.id].disagree, 0);
  const dd = REF_DRIVES.reduce((n, d) => n + totals.byRefDrive[d.id].disagree, 0);
  assert.equal(rows, 4096);
  assert.equal(drives, 4096);
  assert.equal(dr, 602);
  assert.equal(dd, 602);
});

test("calibration: the committed certificate is the recomputed one, seal included", () => {
  const { sealed } = fidelityCert();
  assert.equal(stableStringify(sealed), stableStringify(committed));
});
