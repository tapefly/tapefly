/* GET /api/v1/board — the board, scored through yesterday (UTC). */

import { loadBoard, boardThrough } from "@/sim/board";
import { ok } from "../json";

export const dynamic = "force-dynamic";

export function GET() {
  const rows = loadBoard().map(({ id, handle, name, note, house, program, week, card }) => ({ id, handle, name, note, house, program, week, card }));
  return ok({ through: boardThrough(), rows });
}
