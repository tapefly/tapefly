/* ── sim/board.ts ────────────────────────────────────────────────────────────
   The board: brains people have submitted, each scored over the last seven
   dishes. Entries are files in challengers/ (one JSON per brain, added by pull
   request); `npm run board` validates them into challengers/index.json, which
   is what this module reads. There is no database and no account: an entry is
   a circuit, and its score is something anyone can recompute.

   Ranking: days survived to dusk, then ticks lived, then meals — and on a full
   tie, the cheaper circuit (TapeOut cost A×d³) wins.
   --------------------------------------------------------------------------- */
import manifest from "../challengers/index.json";
import { brainFromNetlist, brainFromProgram, importNetlist, week, card, type Week, type Card } from "./challenge";
import { decodeProgram, type Program } from "./program";
import type { Netlist } from "./netlist";
import { addDays } from "./lineage";
import { validateTapeout, statusOf, type TapeoutRecord, type Status } from "./identity";

export interface EntryFile {
  handle: string; // GitHub handle of the author
  name: string; // the brain's name
  note?: string;
  house?: boolean; // a baseline published by the project itself
  program?: string; // "p1.…" — a builder link's code
  netlist?: string | Netlist; // JSON netlist, or TapeOut bytes in hex
  /** present once the brain is taped out; CI checks the circuit on chain (`npm run board -- --chain`) */
  tapeout?: TapeoutRecord;
}

export interface BoardEntry {
  id: string;
  handle: string;
  name: string;
  note: string;
  house: boolean;
  program: string | null;
  status: Status;
  tapeout: TapeoutRecord | null;
  week: Week;
  card: Card;
}

export function entryBrain(e: EntryFile): { netlist: Netlist; program: Program | null } {
  if (e.program) {
    const p = decodeProgram(e.program);
    return { netlist: brainFromProgram(p).netlist, program: p };
  }
  if (e.netlist) return { netlist: importNetlist(typeof e.netlist === "string" ? e.netlist : JSON.stringify(e.netlist)), program: null };
  throw new Error(`${e.handle}/${e.name}: an entry needs "program" or "netlist"`);
}

export function validateEntry(e: EntryFile): void {
  if (!/^[A-Za-z0-9-]{1,39}$/.test(e.handle ?? "")) throw new Error("handle must be a GitHub handle");
  if (!e.name || e.name.length > 40) throw new Error("name is required, 40 characters at most");
  if (e.note && e.note.length > 200) throw new Error("note: 200 characters at most");
  if (e.tapeout !== undefined) validateTapeout(e.tapeout);
  entryBrain(e);
}

const cache = new Map<string, BoardEntry[]>();

export function scoreBoard(entries: EntryFile[], through: string): BoardEntry[] {
  const rows = entries.map((e) => {
    const { netlist, program } = entryBrain(e);
    const brain = program ? brainFromProgram(program) : brainFromNetlist(netlist);
    return {
      id: `${e.handle}/${e.name}`,
      handle: e.handle,
      name: e.name,
      note: e.note ?? "",
      house: !!e.house,
      program: e.program ?? null,
      status: statusOf(e),
      tapeout: e.tapeout ?? null,
      week: week(brain, through),
      card: card(netlist)
    };
  });
  rows.sort((a, b) => b.week.score - a.week.score || a.card.cost - b.card.cost || a.id.localeCompare(b.id));
  return rows;
}

/** The board through yesterday (UTC): finished days only, so a score does not move during the day. */
export function loadBoard(now: Date = new Date()): BoardEntry[] {
  const today = now.toISOString().slice(0, 10);
  const through = addDays(today, -1);
  const hit = cache.get(through);
  if (hit) return hit;
  const rows = scoreBoard((manifest as { entries: EntryFile[] }).entries, through);
  cache.clear();
  cache.set(through, rows);
  return rows;
}

export function boardThrough(now: Date = new Date()): string {
  return addDays(now.toISOString().slice(0, 10), -1);
}
