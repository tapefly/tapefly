/* GET  /api/v1/workshop/designs?level=door3&limit=60 — published designs, newest first.
   POST /api/v1/workshop/designs {level, code, name?, parent?} — publish one.
   The server decodes the design and re-runs it through the level; the scores it
   stores are the ones it measured, never ones a client sent. */

import { gallery } from "@/sim/workshop/gallery";
import { ok, bad } from "../../json";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY = 8_000;
const ERR: Record<string, [number, string]> = {
  level: [400, "unknown level"],
  design: [400, "the design does not decode"],
  rules: [422, "the design breaks this level's rules"],
  "not-cleared": [422, "the design does not clear this level"],
  rate: [429, "too many publishes, try again in a few minutes"],
  full: [503, "the gallery is full"]
};

export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const limit = Math.max(1, Math.min(200, Number(q.get("limit")) || 60));
  return ok({ designs: gallery().list(q.get("level") ?? undefined, limit) });
}

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return bad("body too large", 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(text); } catch { return bad("body must be JSON"); }
  const who = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const r = gallery().publish({ level: body.level, code: body.code, name: body.name, parent: body.parent }, who);
  if (!r.ok) { const [status, msg] = ERR[r.error]; return bad(msg, status); }
  return NextResponse.json({ design: r.record, existed: r.existed }, { status: r.existed ? 200 : 201, headers: { "Access-Control-Allow-Origin": "*" } });
}
