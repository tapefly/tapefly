/* GET  /api/v1/workshop/agent — machine-readable task and workflow.
   POST /api/v1/workshop/agent {level, code} — evaluate and exhaustively prove
   one design in a single call for an outside AI agent. */
import { bad, ok } from "../../json";
import { decodeDesign } from "@/sim/workshop/codec";
import { levelOf } from "@/sim/workshop/gallery";
import { gradeDesign } from "@/sim/workshop/game";
import { sealManifest, sealWorkshopBrain, SEAL_MAX_INPUTS } from "@/sim/workshop/seal";
import config from "@/config/tapeout.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return ok({
    version: "TAPEFLY-WORKSHOP-AGENT/1",
    task: "Design a deterministic fly brain, clear its level, and prove every input before asking for a tape-out.",
    workflow: [
      {
        step: "discover",
        method: "GET",
        path: "/api/v1/workshop/levels",
        result: "Read the level goal, available parts, budget and number of setups."
      },
      {
        step: "build",
        method: "LOCAL",
        result: "Create a Workshop design and encode it as base64url JSON."
      },
      {
        step: "prove",
        method: "POST",
        path: "/api/v1/workshop/agent",
        body: { level: "LEVEL_ID", code: "DESIGN_CODE" },
        result: "Returns the measured run, exhaustive circuit proof, exact bytes and eligibility."
      },
      {
        step: "publish",
        method: "POST",
        path: "/api/v1/workshop/submit",
        body: { level: "LEVEL_ID", code: "DESIGN_CODE", name: "OPTIONAL_NAME", parent: "OPTIONAL_DESIGN_ID" },
        result: "A separate, explicit public-library write. Never called automatically."
      }
    ],
    completionCriteria: [
      "evaluation.isSubmissionReady is true",
      "proof.eligible is true",
      "proof.mismatch is null",
      "proof.checkedInputs equals the complete input space",
      "proof.nIn is at most the exhaustive limit"
    ],
    limits: {
      maxExhaustiveInputs: SEAL_MAX_INPUTS,
      bodyBytes: 8000,
      parts: 40,
      wires: 120,
      grid: "x/y in [-4,4]"
    },
    boundaries: {
      xlayer: "This endpoint never signs or sends a transaction.",
      tapeout: "A design is only tape-out eligible after the level and exhaustive proof both pass.",
      publication: "Publishing to the public design library requires a separate explicit /submit call."
    }
  });
}

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 8_000) return bad("body too large", 413);

  let body: { level?: unknown; code?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return bad("body must be JSON");
  }

  const level = typeof body.level === "string" ? levelOf(body.level) : undefined;
  if (!level) return bad("unknown level");

  const design = typeof body.code === "string" ? decodeDesign(body.code) : null;
  if (!design) return bad("the design does not decode");

  const evaluation = gradeDesign(level, design);
  const report = sealWorkshopBrain(level, design);
  const levelPassed = evaluation.cleared && evaluation.problems.length === 0;
  const exhaustivePassed = report.eligible && report.mismatch === null && report.checkedInputs === (1 << report.nIn);

  return ok({
    version: "TAPEFLY-WORKSHOP-AGENT/1",
    level: level.id,
    evaluation: {
      cleared: evaluation.cleared,
      isSubmissionReady: levelPassed,
      cost: evaluation.cost,
      gates: evaluation.gates,
      bits: evaluation.bits,
      seconds: evaluation.seconds,
      problems: evaluation.problems,
      runs: evaluation.runs
    },
    proof: sealManifest(report),
    bytes: report.bytes,
    byteEncoding: "hex",
    stages: [
      {
        id: "decode",
        status: "passed",
        detail: `${design.parts.length} parts, ${design.wires.length} wires`
      },
      {
        id: "level",
        status: levelPassed ? "passed" : "blocked",
        detail: levelPassed
          ? `All ${level.setups.length} setup(s) cleared with no rule violations`
          : `Problems: ${[...evaluation.problems, ...(evaluation.cleared ? [] : ["not-cleared"])].join(", ")}`
      },
      {
        id: "exhaustive",
        status: exhaustivePassed ? "passed" : "blocked",
        detail: report.mismatch
          ? `Mismatch at input word ${report.mismatch.word}`
          : report.nIn > SEAL_MAX_INPUTS
            ? `${report.nIn} inputs exceeds the exhaustive limit of ${SEAL_MAX_INPUTS}`
            : `${report.checkedInputs} of ${1 << report.nIn} input words matched`
      },
      {
        id: "publish",
        status: report.eligible ? "available" : "blocked",
        detail: report.eligible ? "POST /api/v1/workshop/submit" : "Fix the blocking stages first"
      },
      {
        id: "xlayer",
        status: "requires-wallet",
        detail: `Verified proof is eligible for review. The X Layer processor is ${String(config.processor)}, but this API never signs or broadcasts a transaction.`
      }
    ],
    onchain: {
      ready: false,
      transactionSent: false,
      processor: config.processor,
      reason: "The API stops at proof. A wallet must review and sign any NAND purchase or tape-out."
    },
    nextAction: report.eligible
      ? "Submit explicitly, or review the proof and continue in the wallet-backed tape-out panel."
      : "Fix the blocking stage and prove the design again."
  });
}
