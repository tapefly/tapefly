import { ok } from "../../json";
import { WLEVELS } from "@/sim/workshop/levels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return ok({
    levels: WLEVELS.map((level) => ({
      id: level.id,
      title: level.title,
      brief: level.brief,
      lesson: level.lesson,
      chapter: level.chapter,
      seconds: level.seconds,
      budget: level.budget,
      parts: level.parts,
      wiring: level.wiring,
      logic: level.logic,
      goal: level.goal,
      setups: level.setups.length,
      par: level.par ?? null,
    })),
  });
}
