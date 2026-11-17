/* GET /api/v1/workshop/designs/:id — one published design and the designs derived from it. */

import { gallery } from "@/sim/workshop/gallery";
import { ok, bad } from "../../../json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{12}$/.test(id)) return bad("bad id");
  const g = gallery();
  const d = g.get(id);
  if (!d) return bad("not found", 404);
  return ok({ design: d, parent: d.parent ? g.get(d.parent) ?? null : null, children: g.children(id) });
}
