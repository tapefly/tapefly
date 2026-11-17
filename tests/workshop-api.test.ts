import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { GET as meta } from "../app/api/v1/workshop/route";
import { GET as levels } from "../app/api/v1/workshop/levels/route";
import { GET as agentMeta, POST as agentProof } from "../app/api/v1/workshop/agent/route";
import { POST as evaluate } from "../app/api/v1/workshop/evaluate/route";
import { POST as seal } from "../app/api/v1/workshop/seal/route";
import { POST as event } from "../app/api/v1/events/route";
import { encodeDesign } from "../sim/workshop/codec";
import { coreOnly } from "../sim/workshop/parts";
import { WSOLUTIONS } from "../sim/workshop/solutions";

test("Workshop API advertises its endpoints and profiles", async () => {
  const body = await meta().json();
  assert.equal(body.version, "TAPEFLY-WORKSHOP-API/1");
  assert.ok(body.profiles.includes("TAPEFLY-WORKSHOP/2"));
  assert.match(body.endpoints.evaluate, /workshop\/evaluate/);
  assert.match(body.endpoints.agent, /workshop\/agent/);
  assert.match(body.endpoints.seal, /workshop\/seal/);
  assert.ok(body.design.partKinds.includes("core"));
});

test("Workshop API lists playable levels", async () => {
  const body = await levels().json();
  assert.ok(body.levels.length >= 20);
  const first = body.levels.find((level: { id: string }) => level.id === "liftoff");
  assert.ok(first);
  assert.ok(first.parts.includes("wingS"));
  assert.equal(first.goal.kind, "eat");
});

test("an agent can evaluate a reference design", async () => {
  const code = encodeDesign(WSOLUTIONS.liftoff);
  const request = new Request("http://tapefly.test/api/v1/workshop/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "liftoff", code }),
  });
  const response = await evaluate(request);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.cleared, true);
  assert.equal(body.isSubmissionReady, true);
  assert.deepEqual(body.problems, []);
  assert.ok(body.gates > 0);
});

test("an agent can discover and run the complete Workshop proof workflow in one call", async () => {
  const discovery = await agentMeta().json();
  assert.equal(discovery.version, "TAPEFLY-WORKSHOP-AGENT/1");
  assert.equal(discovery.limits.maxExhaustiveInputs, 12);
  assert.ok(discovery.workflow.some((step: { step: string }) => step.step === "prove"));
  assert.match(discovery.boundaries.xlayer, /never signs or sends/);

  const request = new Request("http://tapefly.test/api/v1/workshop/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "door3", code: encodeDesign(WSOLUTIONS.door3) }),
  });
  const response = await agentProof(request);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.evaluation.isSubmissionReady, true);
  assert.equal(body.proof.eligible, true);
  assert.equal(body.proof.mismatch, null);
  assert.equal(body.proof.checkedInputs, 128);
  assert.equal(body.stages.find((stage: { id: string }) => stage.id === "exhaustive").status, "passed");
  assert.equal(body.stages.find((stage: { id: string }) => stage.id === "xlayer").status, "requires-wallet");
  assert.equal(body.onchain.ready, false);
  assert.equal(typeof body.onchain.processor, "string");
  assert.equal(body.onchain.transactionSent, false);
  assert.match(body.bytes, /^0x/);
});

test("a stateful Workshop design can produce an eligible seal report and bytes", async () => {
  const request = new Request("http://tapefly.test/api/v1/workshop/seal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "door3", code: encodeDesign(WSOLUTIONS.door3) }),
  });
  const response = await seal(request);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.engine, "TAPEFLY-WORKSHOP-SEAL/1");
  assert.equal(body.seal.eligible, true);
  assert.deepEqual(body.seal.problems, []);
  assert.equal(body.seal.checkedInputs, 1 << body.seal.nIn);
  assert.equal(body.seal.state.length, 4);
  assert.equal(body.bytes.length, 2 + body.seal.bytesLength * 2);
});

test("the seal endpoint rejects malformed requests and reports blocked designs", async () => {
  const malformed = await seal(new Request("http://tapefly.test/api/v1/workshop/seal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  }));
  assert.equal(malformed.status, 400);

  const blockedRequest = new Request("http://tapefly.test/api/v1/workshop/seal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "door3", code: encodeDesign(coreOnly()) }),
  });
  const blocked = await seal(blockedRequest);
  assert.equal(blocked.status, 422);
  const body = await blocked.json();
  assert.equal(body.seal.eligible, false);
  assert.ok(body.seal.problems.includes("not-cleared"));
  assert.match(body.error, /not eligible for tape-out/);
});

test("anonymous product events are accepted and appended", async () => {
  process.env.WORKSHOP_DATA_DIR = mkdtempSync(path.join(tmpdir(), "tapefly-events-"));
  const request = new Request("http://tapefly.test/api/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": "203.0.113.1" },
    body: JSON.stringify({ event: "flight_started", session: "test", route: "/workshop", data: { level: "liftoff" } }),
  });
  const response = await event(request);
  assert.equal(response.status, 204);
});
