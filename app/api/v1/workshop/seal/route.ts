/* POST /api/v1/workshop/seal {level, code}
   Re-run one Workshop design, compile its stateful brain and exhaustively check
   every input before exposing the exact bytes that could be taped out. */
import { NextResponse } from "next/server";
import { bad, ok } from "../../json";
import { decodeDesign } from "@/sim/workshop/codec";
import { levelOf } from "@/sim/workshop/gallery";
import { sealManifest, sealWorkshopBrain } from "@/sim/workshop/seal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Access-Control-Allow-Origin": "*" };

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

  const report = sealWorkshopBrain(level, design);
  const result = {
    level: level.id,
    engine: "TAPEFLY-WORKSHOP-SEAL/1",
    seal: sealManifest(report),
    bytes: report.bytes,
    byteEncoding: "hex"
  };

  if (!report.eligible) {
    return NextResponse.json(
      {
        ...result,
        error: `not eligible for tape-out: ${report.problems.join(", ")}`
      },
      { status: 422, headers }
    );
  }

  return ok(result);
}
