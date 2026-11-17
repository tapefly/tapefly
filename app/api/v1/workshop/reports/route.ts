import { gallery } from "@/sim/workshop/gallery";
import { bad } from "../../json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 2_000) return bad("body too large", 413);
  let body: { id?: unknown; reason?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return bad("body must be JSON");
  }
  if (typeof body.id !== "string" || !/^[0-9a-f]{12}$/.test(body.id)) return bad("bad id");
  if (typeof body.reason !== "string" || body.reason.trim().length < 3) return bad("reason required");
  const who = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!gallery().report(body.id, body.reason.trim(), who)) return bad("not found", 404);
  return new Response(null, { status: 204 });
}
