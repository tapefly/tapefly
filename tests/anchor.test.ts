import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorData, anchorText, parseAnchor, foldHead, headOn, checkAnchors, txCarries, HEAD_GENESIS, ANCHOR_VERSION } from "../sim/anchor";
import { LEDGER, EPOCH } from "../sim/lineage";

test("anchor data round-trips through hex", () => {
  const head = "ab".repeat(32);
  const data = anchorData("2026-10-20", head);
  assert.match(data, /^0x[0-9a-f]+$/);
  assert.deepEqual(parseAnchor(data), { date: "2026-10-20", head });
  assert.equal(anchorText("2026-10-20", head), `${ANCHOR_VERSION} 2026-10-20 ${head}`);
  assert.equal(parseAnchor("0x1234"), null);
  assert.equal(parseAnchor("0xzz"), null);
});

test("the head commits to every day before it", () => {
  const days = LEDGER.days.slice(0, 30);
  const h = foldHead(days);
  assert.notEqual(h, HEAD_GENESIS);
  const touched = days.map((d, i) => (i === 3 ? { ...d, lived: d.lived + 1 } : d));
  assert.notEqual(foldHead(touched), h);
  assert.equal(headOn(days[days.length - 1].d), h);
  assert.equal(days[0].d, EPOCH);
});

test("recorded anchors must recompute", () => {
  const date = LEDGER.days[10].d;
  const good = { version: ANCHOR_VERSION, chainId: 56, entries: [{ date, head: headOn(date), tx: "0x" + "1".repeat(64), from: "0xabc" }] };
  assert.equal(checkAnchors(good), null);
  const bad = { ...good, entries: [{ ...good.entries[0], head: "0".repeat(64) }] };
  assert.match(checkAnchors(bad)!, /recorded head/);
});

test("a transaction carries an anchor only if self-sent with the right data", () => {
  const date = LEDGER.days[5].d, head = headOn(date);
  const a = { date, head, tx: "0x", from: "0xAbC0000000000000000000000000000000000001" };
  const tx = { from: a.from.toLowerCase(), to: a.from, input: anchorData(date, head), blockNumber: 1n };
  assert.equal(txCarries(tx, a), null);
  assert.ok(txCarries({ ...tx, to: "0x0000000000000000000000000000000000000002" }, a));
  assert.ok(txCarries({ ...tx, input: anchorData(date, "0".repeat(64)) }, a));
  assert.ok(txCarries({ ...tx, blockNumber: null }, a));
});
