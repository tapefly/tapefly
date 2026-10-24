import { test } from "node:test";
import assert from "node:assert/strict";
import { LEDGER, extend, addDays, foundingOn, ledgerDay, committedThrough } from "../sim/lineage";
import { FOUNDER } from "../sim/genome";

test("a day past the committed ledger descends from the last champion, exactly as the daily job would compute it", () => {
  const last = committedThrough();
  const next = addDays(last, 1);
  const expected = extend(LEDGER, next).days.at(-1)!;
  // only meaningful while `next` is not beyond tomorrow (UTC); the live reach is capped there
  const tomorrow = addDays(new Date().toISOString().slice(0, 10), 1);
  if (next <= tomorrow) {
    assert.deepEqual(ledgerDay(next), expected);
    assert.deepEqual(foundingOn(next), expected.founding);
    assert.notDeepEqual(foundingOn(next), FOUNDER);
  }
});

test("the server never computes far into the future", () => {
  assert.equal(ledgerDay("2099-01-01"), null);
  assert.deepEqual(foundingOn("2099-01-01"), FOUNDER);
});
