/* npm run board            — validate challengers/<handle>/*.json into challengers/index.json,
                              and record every season that has finished into challengers/seasons.json
   npm run board -- --check — fail if index.json is not exactly what the files produce, or if any
                              recorded season does not recompute from its entrants
   npm run board -- --show  — print the scored board through yesterday, and the trophies
   npm run board -- --chain [--rpc URL]
                            — for every entry with a "tapeout" record, ask the circuit on chain all
                              4,096 questions (free, read-only) and fail on any difference */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "fs";
import { join } from "path";
import { validateEntry, scoreBoard, boardThrough, entryBrain, type EntryFile } from "../sim/board";
import { SEASONS_VERSION, SEASON_EPOCH, pendingSeasons, scoreSeason, checkLedger, trophies, type SeasonLedger } from "../sim/seasons";
import { verifyOnChain } from "./chain";
import { committedThrough } from "../sim/lineage";

const root = join(__dirname, "..", "challengers");
const entries: EntryFile[] = [];
for (const handle of readdirSync(root).sort()) {
  const dir = join(root, handle);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".json")) continue;
    const e = JSON.parse(readFileSync(join(dir, f), "utf8")) as EntryFile;
    if (e.handle !== handle) throw new Error(`${handle}/${f}: "handle" must match the folder name`);
    if (e.house && handle !== "house") throw new Error(`${handle}/${f}: only the house folder may set "house"`);
    try { validateEntry(e); } catch (err) { throw new Error(`${handle}/${f}: ${(err as Error).message}`); }
    entries.push(e);
  }
}
const ids = new Set<string>();
for (const e of entries) {
  const id = `${e.handle}/${e.name}`;
  if (ids.has(id)) throw new Error(`duplicate entry ${id}`);
  ids.add(id);
}

const check = process.argv.includes("--check");
const out = JSON.stringify({ version: "TAPEFLY-BOARD/1", entries }, null, 1) + "\n";
const file = join(root, "index.json");
const seasonsFile = join(root, "seasons.json");
const ledger: SeasonLedger = existsSync(seasonsFile)
  ? JSON.parse(readFileSync(seasonsFile, "utf8"))
  : { version: SEASONS_VERSION, epoch: SEASON_EPOCH, seasons: [] };

if (check) {
  const now = readFileSync(file, "utf8");
  if (now !== out) { console.error("✗ challengers/index.json is stale — run `npm run board` and commit"); process.exit(1); }
  console.log(`✓ ${entries.length} entries, index up to date`);
  const bad = checkLedger(ledger, entries);
  if (bad) { console.error(`✗ challengers/seasons.json: ${bad}`); process.exit(1); }
  console.log(`✓ ${ledger.seasons.length} recorded season${ledger.seasons.length === 1 ? "" : "s"} recompute exactly`);
} else {
  writeFileSync(file, out);
  console.log(`wrote ${entries.length} entries`);
  // a season is recorded only once the lineage ledger covers its last day (its bodies come from it)
  const last = [boardThrough(), committedThrough()].sort()[0];
  const todo = pendingSeasons(ledger, last);
  for (const n of todo) {
    const s = scoreSeason(n, entries);
    ledger.seasons.push(s);
    console.log(`season ${n} (${s.from} to ${s.through}): champion ${s.champion}, ${s.entrants.length} entrants`);
  }
  writeFileSync(seasonsFile, JSON.stringify(ledger, null, 1) + "\n");
  if (!todo.length) console.log(`seasons: ${ledger.seasons.length} recorded, none newly finished`);
}

if (process.argv.includes("--show")) {
  const rows = scoreBoard(entries, boardThrough());
  rows.forEach((r, i) => console.log(`${i + 1}. ${r.id.padEnd(28)} ${r.status.padEnd(8)} ${r.week.survived}/7  lived ${r.week.lived}  meals ${r.week.meals}  gates ${r.card.gates}  cost ${r.card.cost}`));
  for (const [id, ns] of trophies(ledger)) console.log(`🏆 ${id}: season ${ns.join(", ")}`);
}

if (process.argv.includes("--chain")) {
  const i = process.argv.indexOf("--rpc");
  const rpc = i > 0 ? process.argv[i + 1] : undefined;
  (async () => {
    const official = entries.filter((e) => e.tapeout);
    if (!official.length) { console.log("no entry claims a tape-out yet"); return; }
    for (const e of official) {
      console.log(`${e.handle}/${e.name}: circuit ${e.tapeout!.circuitId} on ${e.tapeout!.processor}`);
      const r = await verifyOnChain(entryBrain(e).netlist, e.tapeout!.processor, e.tapeout!.circuitId, rpc);
      if (!r.ok) { console.error(`✗ ${e.handle}/${e.name}: ${r.reason}`); process.exit(1); }
      console.log(`✓ ${e.handle}/${e.name}: ${r.reason}`);
    }
  })().catch((err) => { console.error(err); process.exit(1); });
}
