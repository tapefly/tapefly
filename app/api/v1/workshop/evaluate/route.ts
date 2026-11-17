import { bad, ok } from "../../json";
import { decodeDesign } from "@/sim/workshop/codec";
import { levelOf } from "@/sim/workshop/gallery";
import { gradeDesign } from "@/sim/workshop/game";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const grade = gradeDesign(level, design);
  return ok({
    level: level.id,
    engine: "TAPEFLY-WORKSHOP/2",
    ...grade,
    acceptedRules: grade.problems.length === 0,
    isSubmissionReady: level.goal.kind === "free" ? grade.problems.length === 0 : grade.cleared && grade.problems.length === 0,
  });
}
