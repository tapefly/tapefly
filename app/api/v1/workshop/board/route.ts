/* GET /api/v1/workshop/board?level=door3 — a level's global board, best first.
   Order is the duel ladder: cleared, then time, gates, part cost. Every row was
   re-run by this server when it was published. */

import { gallery, levelOf } from "@/sim/workshop/gallery";
import { ok, bad } from "../../json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(req: Request) {
  const level = new URL(req.url).searchParams.get("level") ?? "";
  if (!levelOf(level)) return bad("unknown level");
  return ok({ level, rows: gallery().board(level) });
}
