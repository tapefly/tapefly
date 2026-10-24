/* ── tests/reference.test.ts ─────────────────────────────────────────────────
   The reference brain's promises. FLY-LIF/0 is frozen, total, deterministic
   and biologically ordered — and it is deliberately NOT a copy of the
   committed netlist or of sim/rules.ts. The last test pins the distance
   between them: if the reference ever collapses onto the TapeFly rules (or
   onto Nothing at all), calibration stops measuring anything.
   --------------------------------------------------------------------------- */
import { test } from "node:test";
import assert from "node:assert/strict";

import { BRAIN, evalWord } from "../sim/netlist";
import { decideRef, refTable, REF_VERSION, REF_STATUS, LIF_PARAMS, REF_DRIVES } from "../sim/reference";
import { decideWord, rulesTable } from "../sim/rules";
import { BEHAVIORS } from "../sim/encode";

test("reference: version and draft status are pinned", () => {
  assert.equal(REF_VERSION, "FLY-LIF/0");
  assert.equal(REF_STATUS, "draft");
  assert.deepEqual(LIF_PARAMS.TH_GF, 20);
  assert.deepEqual(LIF_PARAMS.TH_FEED, 4);
  assert.deepEqual(LIF_PARAMS.TH_N, 2);
});

test("reference: total over all 4096 words, and deterministic", () => {
  const a = refTable();
  const b = refTable();
  assert.equal(a.length, 4096);
  assert.deepEqual(a, b);
  for (let w = 0; w < 4096; w++) {
    const e = (decideRef(w).out) & 3;
    assert.ok(BEHAVIORS[e] !== undefined, `word ${w}: behaviour ${e} unknown`);
  }
});

test("reference: gf dominance — fires exactly above threshold, never below", () => {
  for (let w = 0; w < 4096; w++) {
    const t = (w >> 2) & 3;
    const out = decideRef(w).out;
    const gf = ((out >> 2) & 1) === 1;
    if (t >= 2) {
      assert.ok(gf, `word ${w} (threat ${t}): GF must fire`);
      assert.equal(out & 3, 1, `word ${w}: GF drive must output avoid`);
    } else {
      assert.ok(!gf, `word ${w} (threat ${t}): GF must not fire`);
    }
  }
});

test("reference: loom table is superlinear and sub-threshold at t=1", () => {
  const [a, b, c, d] = LIF_PARAMS.LOOM;
  assert.ok(a === 0, "no looming, no membrane voltage");
  assert.ok(b < LIF_PARAMS.TH_GF, "t=1 is sub-threshold (the wind drive)");
  assert.ok(c >= LIF_PARAMS.TH_GF, "t=2 crosses the GF threshold");
  assert.ok(d > c, "loom grows with closing speed");
});

test("reference: it is not a re-encode of the TapeFly rules", () => {
  const ref = refTable();
  const one = rulesTable();
  const agree = ref.reduce((n, v, w) => n + (v === one[w] ? 1 : 0), 0);
  assert.ok(agree < 4096, "the reference must not collapse onto the TapeFly table");
  assert.ok(agree > 0, "the reference must not be an anti-mirror either");
});

test("reference: the committed netlist and the reference differ somewhere", () => {
  let diff = 0;
  for (let w = 0; w < 4096; w++) {
    if (evalWord(BRAIN, w) !== refTable()[w]) diff++;
  }
  assert.ok(diff > 0, "calibration is pointless if the tables are identical");
});

test("reference: drives are documented, first match wins in the same order", () => {
  assert.equal(REF_DRIVES[0].id, "gf");
  assert.equal(REF_DRIVES[1].id, "wind");
  assert.equal(REF_DRIVES[2].id, "feed");
  assert.equal(REF_DRIVES[3].id, "curious");
  assert.equal(REF_DRIVES[4].id, "rest");
  assert.equal(REF_DRIVES[5].id, "default");
  void decideWord; // the TapeFly side of the comparison lives in rules.ts; kept here for symmetry
});
