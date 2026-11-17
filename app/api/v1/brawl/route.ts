/* GET /api/v1/brawl — Brain Brawl, for agents.

     /api/v1/brawl?date=YYYY-MM-DD
       the tactic chips (rule, price, gates on their own), the body parts, the
       rival ladder with each fight's gate budget and seed, and the rules.

     /api/v1/brawl?date=…&chips=block,punish,bite&gear=shell
     /api/v1/brawl?date=…&program=p1.…&gear=…
       fight that brain and body against every rival in order. Chips are read
       top to bottom; a program is any rule list over the DUEL-12x3/1 senses, so
       an AI can write rules the shop does not sell. Same seeds, budgets and
       tie-break (fewer gates wins a full tie) as a run on /brawl.
       Add &fight=i to play one fight only: a run lets the brain change between
       fights, so an agent can bring a different brain to each one.

   Deterministic: the same date, brain and body always give the same answer. */

import { RUN, TACTICS, TACTIC_IDS, PARTS, PART_IDS, BODY_SLOTS, RIVALS, aloneGates, budgetFor, seedFor, report, isTactic, isPart, ladder, programOf, type TacticId } from "@/sim/arena";
import { DUEL_PROFILE, MOVES, T, BASE, type GearId } from "@/sim/duel";
import { decodeProgram, type Program } from "@/sim/program";
import { ok, bad, isDate, today } from "../json";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const date = sp.get("date") ?? today();
  if (!isDate(date)) return bad("date must be YYYY-MM-DD");
  if (date > today()) return bad("that date has not happened yet");

  const chipsRaw = sp.get("chips");
  const programRaw = sp.get("program");

  if (chipsRaw === null && programRaw === null) {
    return ok({
      date,
      how: "Add ?chips=a,b,c (top to bottom) and &gear=x,y, or ?program=p1.…, to fight the whole ladder with that brain and body.",
      profile: {
        id: DUEL_PROFILE,
        inputs: ["dist (0 far .. 3 in reach)", "foe (0 moving, 1 shield facing me, 2 winding up a bite, 3 open)", "myhp (0..3)", "foehp (0..3)", "energy (0..3)", "prev move"],
        outputs: { move: MOVES, bite: "start a bite (needs 30 energy)" },
        note: "Program slots are reused: food=dist, threat=foe, light=myhp, novelty=foehp, hunger=energy, gf=bite."
      },
      rules: { ...RUN, bodySlots: BODY_SLOTS, base: BASE, timing: T, tieBreak: "level on health at time: fewer gates wins", otherwise: "press (walk at the rival) when no chip matches" },
      chips: TACTIC_IDS.map((id) => ({ id, name: { en: TACTICS[id].en, zh: TACTICS[id].zh }, does: { en: TACTICS[id].den, zh: TACTICS[id].dzh }, price: TACTICS[id].price, gatesAlone: aloneGates(id), rule: TACTICS[id].rule })),
      parts: PART_IDS.map((id) => ({ id, name: { en: PARTS[id].en, zh: PARTS[id].zh }, does: { en: PARTS[id].den, zh: PARTS[id].dzh }, price: PARTS[id].price })),
      ladder: RIVALS.map((r, i) => ({ fight: i, rival: r.name, ai: r.ai, chips: r.chips, gear: r.gear, gates: report(r.chips).gates, budget: budgetFor(i), seed: seedFor(date, i) }))
    }, date);
  }

  let program: Program;
  let chips: TacticId[] | null = null;
  if (chipsRaw !== null) {
    const ids = chipsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const unknown = ids.filter((s) => !isTactic(s));
    if (unknown.length) return bad(`unknown chip: ${unknown.join(", ")}. Chips: ${TACTIC_IDS.join(", ")}`);
    if (new Set(ids).size !== ids.length) return bad("each chip at most once");
    chips = ids as TacticId[];
    program = programOf(chips);
  } else {
    try { program = decodeProgram(programRaw!); } catch (e) { return bad((e as Error).message); }
  }

  const gearIds = (sp.get("gear") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const badGear = gearIds.filter((g) => !isPart(g));
  if (badGear.length) return bad(`unknown part: ${badGear.join(", ")}. Parts: ${PART_IDS.join(", ")}`);
  if (new Set(gearIds).size !== gearIds.length) return bad("each part at most once");
  if (gearIds.length > BODY_SLOTS) return bad(`at most ${BODY_SLOTS} parts`);
  const gear = gearIds as GearId[];

  // ?fight=i: only that fight, so an agent can bring a different brain to each fight, as a player does
  const fightRaw = sp.get("fight");
  const only = fightRaw === null ? null : Number(fightRaw);
  if (only !== null && !(Number.isInteger(only) && only >= 0 && only < RIVALS.length)) return bad(`fight must be 0..${RIVALS.length - 1}`);

  const name = (sp.get("name") ?? "Agent").replace(/[\u0000-\u001f<>]/g, "").slice(0, 24) || "Agent";
  const result = ladder(date, program, chips, gear);
  if (only !== null) {
    const { steps, ...rest } = result;
    return ok({ date, name, chips, ...rest, step: steps[only] }, date);
  }
  return ok({ date, name, chips, ...result }, date);
}
