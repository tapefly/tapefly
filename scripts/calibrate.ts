/* ── scripts/calibrate.ts ────────────────────────────────────────────────────
   npm run calibrate

   Runs the FIDELITY protocol's t1 suite — the committed 50-gate netlist against
   the FLY-LIF/0 reference on all 4096 input words — and writes the sealed
   FLY-FIDELITY/1 certificate to calibration/ffw-nand-1.json. The computation
   lives in sim/calibration.ts so this script, the /calibrate page and the
   tests cannot drift apart.

   What the numbers mean, and what they do not mean (full text in the cert's
   `note` and in docs/fidelity-protocol.md §9 and §11): this is a distance,
   not a grade — a draft reference, and one authored alongside the circuit.
   --------------------------------------------------------------------------- */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { RULES } from "../sim/rules";
import { REF_DRIVES } from "../sim/reference";
import { runCalibration, fidelityCert } from "../sim/calibration";

const { totals } = runCalibration();
const { sealed } = fidelityCert();

const dim = (v: number, total: number) => (total === 0 ? "—" : (v / total).toFixed(4));

console.log("FIDELITY t1 · FFW-NAND/1 vs FLY-LIF/0 (draft)");
console.log("rows: 4096 · agree %d · disagree %d · agreement %s", totals.agree, totals.disagree, dim(totals.agree, 4096));
console.log("behaviour-only agreement: %s", dim(totals.behaviourAgree, 4096));
console.log("gf: tp %d · fp %d · fn %d · tn %d · recall %s · precision %s",
  totals.gf.tp, totals.gf.fp, totals.gf.fn, totals.gf.tn,
  dim(totals.gf.tp, totals.gf.tp + totals.gf.fn),
  dim(totals.gf.tp, totals.gf.tp + totals.gf.fp));
console.log("\ndisagreements by TapeFly rule (which rule was deciding):");
for (const r of RULES) {
  const b = totals.byBrainRule[r.id];
  console.log(`  ${r.id.padEnd(8)} rows ${String(b.rows).padStart(4)} · disagree ${String(b.disagree).padStart(4)} (${dim(b.disagree, b.rows)})`);
}
console.log("disagreements by reference drive:");
for (const d of REF_DRIVES) {
  const b = totals.byRefDrive[d.id];
  console.log(`  ${d.id.padEnd(8)} rows ${String(b.rows).padStart(4)} · disagree ${String(b.disagree).padStart(4)} (${dim(b.disagree, b.rows)})`);
}
console.log("\nfirst disagreeing words: %s", (sealed as { result: { disagree_examples: string[] } }).result.disagree_examples.join(", "));
console.log("\nseal %s", (sealed as { seal: string }).seal);

mkdirSync("calibration", { recursive: true });
const path = join("calibration", "ffw-nand-1.json");
writeFileSync(path, JSON.stringify(sealed, null, 2) + "\n");
console.log("wrote %s", path);
