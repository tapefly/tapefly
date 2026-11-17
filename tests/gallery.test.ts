import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WLEVELS } from "../sim/workshop/levels";
import { WSOLUTIONS } from "../sim/workshop/solutions";
import { gradeDesign } from "../sim/workshop/game";
import { coreOnly } from "../sim/workshop/parts";
import { encodeDesign, decodeDesign } from "../sim/workshop/codec";
import { Gallery, cleanName, compareRank, type Published } from "../sim/workshop/gallery";

const fresh = () => {
  const dir = mkdtempSync(join(tmpdir(), "tf-gallery-"));
  return { dir, g: new Gallery(dir), done: () => rmSync(dir, { recursive: true, force: true }) };
};
const LEVELS = WLEVELS.filter((l) => l.goal.kind !== "free");

test("codec: every reference design survives encode → decode unchanged", () => {
  for (const l of LEVELS) {
    const d = WSOLUTIONS[l.id];
    const back = decodeDesign(encodeDesign(d));
    assert.ok(back, l.id);
    assert.equal(encodeDesign(back!), encodeDesign(d), l.id);
  }
});

test("codec: refuses junk, oversized designs, two cores and parts off the grid", () => {
  assert.equal(decodeDesign(""), null);
  assert.equal(decodeDesign("not base64 !!"), null);
  assert.equal(decodeDesign("x".repeat(5000)), null);
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  assert.equal(decodeDesign(enc({ p: [["core", "core", 0, 0, 0], ["c2", "core", 1, 0, 0]], w: [], m: {} })), null);
  assert.equal(decodeDesign(enc({ p: [["core", "core", 0, 0, 0], ["w", "wingS", 9, 0, 0]], w: [], m: {} })), null);
  assert.equal(decodeDesign(enc({ p: [["core", "core", 0, 0, 0], ["w", "wingS", 0, 0, 0]], w: [], m: {} })), null, "two parts in one cell");
  const many = Array.from({ length: 60 }, (_, i) => [`p${i}`, "body", i % 9 - 4, Math.floor(i / 9) - 4, 0]);
  assert.equal(decodeDesign(enc({ p: many, w: [], m: {} })), null);
});

test("publish: the server re-runs the design and stores what it measured", () => {
  const { g, done } = fresh();
  try {
    const l = LEVELS[0];
    const d = WSOLUTIONS[l.id];
    const r = g.publish({ level: l.id, code: encodeDesign(d), name: "  First   flight  " });
    assert.ok(r.ok);
    if (!r.ok) return;
    const want = gradeDesign(l, d);
    assert.equal(r.record.cleared, true);
    assert.equal(r.record.gates, want.gates);
    assert.equal(r.record.cost, want.cost);
    assert.equal(r.record.seconds, Math.round(want.seconds * 100) / 100);
    assert.equal(r.record.name, "First flight");
    const again = g.publish({ level: l.id, code: encodeDesign(d), name: "copycat" });
    assert.ok(again.ok && again.existed && again.record.name === "First flight", "same design on the same level keeps its first record");
  } finally { done(); }
});

test("publish: refuses unknown levels, broken codes and designs that do not clear", () => {
  const { g, done } = fresh();
  try {
    assert.deepEqual(g.publish({ level: "nope", code: encodeDesign(coreOnly()) }), { ok: false, error: "level" });
    assert.deepEqual(g.publish({ level: LEVELS[0].id, code: "@@" }), { ok: false, error: "design" });
    assert.deepEqual(g.publish({ level: LEVELS[0].id, code: encodeDesign(coreOnly()) }), { ok: false, error: "not-cleared" });
    const late = LEVELS[LEVELS.length - 1];
    const r = g.publish({ level: LEVELS[0].id, code: encodeDesign(WSOLUTIONS[late.id]) });
    assert.ok(!r.ok && (r.error === "rules" || r.error === "not-cleared"), "a later level's parts are not allowed on level 1");
  } finally { done(); }
});

test("derivation: a child records its parent but its score is its own", () => {
  const { g, done } = fresh();
  try {
    const l = LEVELS.find((x) => x.id === "door3")!;
    const parent = g.publish({ level: l.id, code: encodeDesign(WSOLUTIONS[l.id]), name: "counter" });
    assert.ok(parent.ok);
    if (!parent.ok) return;
    // the child is the same design built from scratch with its parts listed in another order: a new code, a fresh run
    const d = WSOLUTIONS[l.id];
    const child = { ...d, parts: [d.parts[0], ...d.parts.slice(1).reverse()] };
    const r = g.publish({ level: l.id, code: encodeDesign(child), parent: parent.record.id });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.record.parent, parent.record.id);
    assert.deepEqual(g.children(parent.record.id).map((x) => x.id), [r.record.id]);
    assert.equal(r.record.seconds, Math.round(gradeDesign(l, child).seconds * 100) / 100);
    const orphan = g.publish({ level: l.id, code: encodeDesign({ ...child, parts: [...child.parts].reverse() }), parent: "ffffffffffff" });
    assert.ok(orphan.ok && orphan.record.parent === null, "a parent that was never published is dropped");
  } finally { done(); }
});

test("board: cleared first, then faster, fewer gates, cheaper, earlier", () => {
  const base: Published = { id: "a", level: "x", name: "", code: "", parent: null, at: "2026-01-01T00:00:00Z", cleared: true, seconds: 10, gates: 5, bits: 0, cost: 5, parts: 3 };
  const rows: Published[] = [
    { ...base, id: "slow", seconds: 12 },
    { ...base, id: "fail", cleared: false, seconds: 1 },
    { ...base, id: "late", at: "2026-02-01T00:00:00Z" },
    { ...base, id: "best", gates: 4 },
    { ...base, id: "first" }
  ];
  assert.deepEqual(rows.sort(compareRank).map((r) => r.id), ["best", "first", "late", "slow", "fail"]);
});

test("store: rows survive a restart, and one address cannot flood it", () => {
  const { dir, g, done } = fresh();
  try {
    let n = 0;
    for (const l of LEVELS) { const r = g.publish({ level: l.id, code: encodeDesign(WSOLUTIONS[l.id]) }, "1.2.3.4"); if (r.ok) n++; else assert.equal(r.error, "rate"); }
    assert.ok(n >= 1 && n <= 12, `published ${n}`);
    const again = new Gallery(dir);
    assert.equal(again.list().length, n);
    assert.equal(again.board(LEVELS[0].id).length, 1);
    assert.equal(cleanName("<b>x</b>\u0000"), "bx/b");
  } finally { done(); }
});

import { chipFingerprint, recordText, recordData, parseRecord } from "../sim/workshop/record";

test("X Layer record: the text names the design and its chip, and reads back exactly", () => {
  const { g, done } = fresh();
  try {
    const l = WLEVELS.find((x) => x.id === "door3")!;
    const r = g.publish({ level: l.id, code: encodeDesign(WSOLUTIONS.door3) });
    assert.ok(r.ok);
    if (!r.ok) return;
    const chip = chipFingerprint(WSOLUTIONS.door3);
    assert.match(chip, /^[0-9a-f]{64}$/);
    assert.equal(chipFingerprint(decodeDesign(r.record.code)!), chip, "the stored code compiles to the same chip");
    const text = recordText(r.record, chip);
    assert.ok(text.startsWith("TAPEFLY-WORKSHOP/1 door3 "));
    const back = parseRecord(recordData(text));
    assert.deepEqual(back, { level: "door3", id: r.record.id, gates: r.record.gates, bits: r.record.bits, seconds: r.record.seconds, chip });
    assert.equal(parseRecord("0x1234"), null);
    assert.equal(parseRecord("not hex"), null);
    const other = chipFingerprint(WSOLUTIONS.door2);
    assert.notEqual(other, chip, "a different circuit has a different fingerprint");
    assert.ok(g.addChain({ id: r.record.id, tx: "0x" + "a".repeat(64), from: "0x" + "1".repeat(40), block: 1, at: "x" }));
    assert.ok(!g.addChain({ id: r.record.id, tx: "0x" + "A".repeat(64), from: "0x" + "1".repeat(40), block: 1, at: "x" }), "the same transaction is kept once");
    assert.equal(g.chainRecords(r.record.id).length, 1);
  } finally { done(); }
});
