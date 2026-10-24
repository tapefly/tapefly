/* ── sim/calibration.ts ──────────────────────────────────────────────────────
   The t1 suite, shared by every host that shows or seals a certificate:
   `npm run calibrate` writes the file, the /calibrate page renders from the
   same function, and tests pin both to each other. If this module and the
   committed certificate ever disagree, the build fails — the same rule the
   engine keeps for its netlist.

   The certificate object's shape and values are frozen: calibration/ffw-nand-1.json
   seals over them. Change a number here and you must re-run `npm run calibrate`
   and re-commit, or tests/engine-level checks will say so.
   --------------------------------------------------------------------------- */
import { BRAIN, evalWord } from "./netlist";
import { decideWord, RULES, type RuleId } from "./rules";
import { decideRef, REF_DRIVES, REF_STATUS, REF_VERSION, LIF_PARAMS, type RefDrive } from "./reference";
import { BEHAVIORS, BRAIN_VERSION } from "./encode";
import { recordHash, sha256Hex, stableStringify } from "./hash";

export interface CalRow {
  w: number;
  rule: RuleId;
  drive: RefDrive;
  brain: number;
  ref: number;
}

export interface CalTotals {
  agree: number;
  disagree: number;
  behaviourAgree: number;
  gf: { tp: number; fp: number; fn: number; tn: number };
  byBrainRule: Record<string, { rows: number; disagree: number }>;
  byRefDrive: Record<string, { rows: number; disagree: number }>;
}

const dim = (v: number, total: number): string => (total === 0 ? "—" : (v / total).toFixed(4));
const tag = (w: number) => w.toString(16).padStart(3, "0");
const gfOf = (out: number) => ((out >> 2) & 1) === 1;

export function runCalibration(): { rows: CalRow[]; totals: CalTotals } {
  const byBrainRule: Record<string, { rows: number; disagree: number }> = {};
  for (const r of RULES) byBrainRule[r.id] = { rows: 0, disagree: 0 };
  const byRefDrive: Record<string, { rows: number; disagree: number }> = {};
  for (const d of REF_DRIVES) byRefDrive[d.id] = { rows: 0, disagree: 0 };

  const rows: CalRow[] = [];
  const totals: CalTotals = { agree: 0, disagree: 0, behaviourAgree: 0, gf: { tp: 0, fp: 0, fn: 0, tn: 0 }, byBrainRule, byRefDrive };

  for (let w = 0; w < 4096; w++) {
    const b = evalWord(BRAIN, w);
    const r = decideRef(w).out;
    const rule = decideWord(w).rule, drive = decideRef(w).drive;
    byBrainRule[rule].rows++;
    byRefDrive[drive].rows++;
    if ((b & 3) === (r & 3)) totals.behaviourAgree++;
    const tg = gfOf(r), bg = gfOf(b);
    if (tg && bg) totals.gf.tp++; else if (!tg && bg) totals.gf.fp++; else if (tg && !bg) totals.gf.fn++; else totals.gf.tn++;
    if (b === r) totals.agree++;
    else {
      totals.disagree++;
      byBrainRule[rule].disagree++;
      byRefDrive[drive].disagree++;
    }
    rows.push({ w, rule, drive, brain: b, ref: r });
  }
  return { rows, totals };
}

/** The full FLY-FIDELITY/1 certificate, sealed — the object calibration/ffw-nand-1.json holds. */
export function fidelityCert(): { cert: Record<string, unknown>; sealed: Record<string, unknown> } {
  const { rows, totals } = runCalibration();
  const disagreeHex = rows.filter((r) => r.brain !== r.ref).map((r) => tag(r.w)).slice(0, 16);

  const cert = {
    v: "FLY-FIDELITY/1",
    status: "seed" as const,
    circuit: {
      version: BRAIN_VERSION,
      nIn: BRAIN.nIn,
      nOut: BRAIN.nOut,
      gates: BRAIN.gates.length,
      latches: 0,
      netlist: sha256Hex(stableStringify(BRAIN))
    },
    reference: {
      version: REF_VERSION,
      status: REF_STATUS,
      params: LIF_PARAMS,
      sha256: recordHash({ version: REF_VERSION, params: LIF_PARAMS })
    },
    suite: {
      name: "t1-full",
      encoding: "FFW-NAND/1 12-bit word layout",
      rows: 4096
    },
    result: {
      agreement: dim(totals.agree, 4096),
      agree: totals.agree,
      disagree: totals.disagree,
      gf: {
        ...totals.gf,
        recall: dim(totals.gf.tp, totals.gf.tp + totals.gf.fn),
        precision: dim(totals.gf.tp, totals.gf.tp + totals.gf.fp)
      },
      behaviour_only: { agree: totals.behaviourAgree, of: 4096 },
      by_brain_rule: totals.byBrainRule,
      by_ref_drive: totals.byRefDrive,
      disagree_examples: disagreeHex
    },
    hosts: ["node/tsx (scripts/calibrate.ts)"],
    note:
      "Calibration, not certification: agreement with a draft reference is a distance, " +
      "not a grade. FLY-LIF/0's constants are editorial (see sim/reference.ts), the " +
      "12-bit word layout merges LC4 and LPLC2 into one threat channel, and GF recall " +
      "== 1.0 here reflects that OneFly's rule 1 and the reference share the literature, " +
      "not that the circuit reproduces the connectome. Anyone can re-run: npx tsx " +
      "scripts/calibrate.ts"
  };
  return { cert, sealed: { ...cert, seal: recordHash(cert) } };
}
