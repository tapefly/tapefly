/* ── sim/seasons.ts ──────────────────────────────────────────────────────────
   Seasons and trophies.

   A season is one UTC week, Monday to Sunday, starting from SEASON_EPOCH. When
   a season ends, `npm run board` writes it into challengers/seasons.json: who
   was entered, the table, and the champion. That file is a ledger like the
   lineage — a season is frozen once written, because an entry added later
   could otherwise "win" a week it never took part in. `npm run board -- --check`
   recomputes every recorded season from its entrants and fails on any
   difference, so nobody can edit a trophy in.

   The champion is the best player's brain over the season's seven dishes:
   days survived, then ticks lived, then meals, then the cheaper circuit.
   House baselines are in the table to beat, but they never take a trophy.
   --------------------------------------------------------------------------- */
import { addDays } from "./lineage";
import { scoreBoard, type EntryFile } from "./board";

export const SEASONS_VERSION = "TAPEFLY-SEASONS/1";
export const SEASON_EPOCH = "2026-10-12"; // a Monday

export interface SeasonRow { id: string; survived: number; lived: number; meals: number; cost: number; official: boolean; house: boolean }
/** `champion` is the best player's entry; house baselines rank but never take a trophy. "" when no player entered. */
export interface Season { n: number; from: string; through: string; entrants: string[]; table: SeasonRow[]; champion: string }
export interface SeasonLedger { version: string; epoch: string; seasons: Season[] }

const dayNum = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);

/** The season a date falls in (1-based), or 0 before the epoch. */
export function seasonOf(date: string): number {
  const k = dayNum(date) - dayNum(SEASON_EPOCH);
  return k < 0 ? 0 : Math.floor(k / 7) + 1;
}

export function seasonDates(n: number): { from: string; through: string } {
  const from = addDays(SEASON_EPOCH, (n - 1) * 7);
  return { from, through: addDays(from, 6) };
}

/** Score one season from the entries that were in it. */
export function scoreSeason(n: number, entries: EntryFile[]): Season {
  const { from, through } = seasonDates(n);
  const rows = scoreBoard(entries, through);
  const table = rows.map((r) => ({ id: r.id, survived: r.week.survived, lived: r.week.lived, meals: r.week.meals, cost: r.card.cost, official: r.status === "official", house: r.house }));
  return { n, from, through, entrants: entries.map((e) => `${e.handle}/${e.name}`).sort(), table, champion: table.find((r) => !r.house)?.id ?? "" };
}

/** Seasons finished on or before `lastFinishedDay` that the ledger does not have yet. */
export function pendingSeasons(ledger: SeasonLedger, lastFinishedDay: string): number[] {
  const have = ledger.seasons.length;
  const out: number[] = [];
  for (let n = have + 1; ; n++) {
    if (seasonDates(n).through > lastFinishedDay) break;
    out.push(n);
  }
  return out;
}

/** Recompute every recorded season; returns the first difference, or null. */
export function checkLedger(ledger: SeasonLedger, all: EntryFile[]): string | null {
  if (ledger.version !== SEASONS_VERSION) return `version must be ${SEASONS_VERSION}`;
  if (ledger.epoch !== SEASON_EPOCH) return `epoch must be ${SEASON_EPOCH}`;
  const byId = new Map(all.map((e) => [`${e.handle}/${e.name}`, e]));
  for (const [i, s] of ledger.seasons.entries()) {
    if (s.n !== i + 1) return `season ${i + 1} is numbered ${s.n}`;
    const missing = s.entrants.filter((id) => !byId.has(id));
    if (missing.length) return `season ${s.n}: entrant ${missing[0]} no longer exists (entries in a recorded season cannot be removed or renamed)`;
    const again = scoreSeason(s.n, s.entrants.map((id) => byId.get(id)!));
    if (JSON.stringify(again) !== JSON.stringify(s)) return `season ${s.n} does not recompute to what is recorded`;
  }
  return null;
}

/** Trophies by entry id: the seasons each one won. */
export function trophies(ledger: SeasonLedger): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const s of ledger.seasons) if (s.champion) m.set(s.champion, [...(m.get(s.champion) ?? []), s.n]);
  return m;
}
