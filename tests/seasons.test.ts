import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultFlyName, validateTapeout, statusOf } from "../sim/identity";
import { seasonOf, seasonDates, scoreSeason, checkLedger, pendingSeasons, trophies, SEASON_EPOCH, type SeasonLedger } from "../sim/seasons";
import { validateEntry, type EntryFile } from "../sim/board";
import { encodeProgram, OFFICIAL_PROGRAM } from "../sim/program";

const index = JSON.parse(readFileSync(new URL("../challengers/index.json", import.meta.url), "utf8")) as { entries: EntryFile[] };
const ledger = JSON.parse(readFileSync(new URL("../challengers/seasons.json", import.meta.url), "utf8")) as SeasonLedger;
const careful = encodeProgram({ rules: [{ when: { threat: [2, 3] }, then: 1, gf: true }, { when: { food: [1, 3] }, then: 0 }], otherwise: { then: 2 } });

test("every brain hatches with a stable name of its own", () => {
  const a = defaultFlyName(encodeProgram(OFFICIAL_PROGRAM));
  assert.equal(a, defaultFlyName(encodeProgram(OFFICIAL_PROGRAM)));
  assert.match(a, /^[a-z]+-[a-z]+$/);
  assert.notEqual(defaultFlyName("p1.AAA"), defaultFlyName(careful));
});

test("a tape-out record must be well formed, and makes an entry official", () => {
  const good = { chain: "bsc", processor: "0x" + "ab".repeat(20), circuitId: "4246" };
  assert.deepEqual(validateTapeout(good), good);
  assert.throws(() => validateTapeout({ ...good, processor: "0x12" }));
  assert.throws(() => validateTapeout({ ...good, circuitId: "abc" }));
  assert.throws(() => validateTapeout({ ...good, chain: "eth" }));
  assert.throws(() => validateEntry({ handle: "someone", name: "x", program: "p1.AAA", tapeout: { ...good, txHash: "0x1" } } as unknown as EntryFile));
  assert.equal(statusOf({ tapeout: good }), "official");
  assert.equal(statusOf({}), "practice");
});

test("seasons are Monday-to-Sunday weeks from the epoch", () => {
  assert.equal(seasonOf(SEASON_EPOCH), 1);
  assert.equal(seasonOf("2026-10-18"), 1);
  assert.equal(seasonOf("2026-10-19"), 2);
  assert.equal(seasonOf("2026-10-11"), 0);
  assert.deepEqual(seasonDates(2), { from: "2026-10-19", through: "2026-10-25" });
  assert.deepEqual(pendingSeasons({ ...ledger, seasons: [] }, "2026-10-24"), [1]);
  assert.deepEqual(pendingSeasons({ ...ledger, seasons: [] }, "2026-10-25"), [1, 2]);
});

test("the committed season ledger recomputes, and tampering is caught", () => {
  assert.equal(checkLedger(ledger, index.entries), null);
  const forged = JSON.parse(JSON.stringify(ledger)) as SeasonLedger;
  forged.seasons[0].champion = "house/Greedy";
  assert.match(checkLedger(forged, index.entries) ?? "", /does not recompute/);
  assert.match(checkLedger(ledger, index.entries.filter((e) => e.name !== "Wanderer")) ?? "", /no longer exists/);
});

test("house baselines rank but never take the trophy", () => {
  const player: EntryFile = { handle: "someone", name: "Careful", program: careful };
  const s = scoreSeason(1, [...index.entries, player]);
  assert.equal(s.champion, "someone/Careful");
  assert.ok(s.table[0].house, "a house brain can still top the table");
  assert.equal(scoreSeason(1, index.entries).champion, "");
  const t = trophies({ ...ledger, seasons: [s] });
  assert.deepEqual(t.get("someone/Careful"), [1]);
});
