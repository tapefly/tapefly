import { gallery } from "@/sim/workshop/gallery";
import { bad } from "../../../json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const expected = process.env.WORKSHOP_ADMIN_TOKEN;
  if (!expected) return bad("moderation is not configured", 503);
  if (req.headers.get("x-admin-token") !== expected) return bad("forbidden", 403);
  let body: { id?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("body must be JSON");
  }
  if (typeof body.id !== "string" || !/^[0-9a-f]{12}$/.test(body.id)) return bad("bad id");
  if (body.action !== "hide" && body.action !== "restore") return bad("action must be hide or restore");
  if (!gallery().moderate(body.id, body.action)) return bad("not found", 404);
  return Response.json({ ok: true });
}
