import assert from "node:assert/strict";
import test from "node:test";
import { recoverTypedDataAddress } from "viem";
import {
  CIRCUIT_CLAIM_TYPES,
} from "../sim/circuit-claims";
import {
  claimDomain,
  claimSignerAccount,
  circuitClaimTokenId,
  signCircuitClaim,
} from "../sim/circuit-claims-server";
import {
  buy,
  fight,
  newRun,
  replayRunActions,
  type RunAction,
} from "../sim/arena";

process.env.TAPEFLY_CLAIM_SIGNER_KEY = `0x${"11".repeat(32)}`;
process.env.NEXT_PUBLIC_TAPEFLY_CLAIMS_CONTRACT = "0x1000000000000000000000000000000000000001";

test("brawl actions replay from the exact same starting run", () => {
  const date = "2026-11-17";
  let run = newRun(date);
  const biteSlot = run.shop.findIndex((offer) => offer?.kind === "chip" && offer.id === "bite");
  assert.ok(biteSlot >= 0);

  const actions: RunAction[] = [{ kind: "buy", slot: biteSlot }];
  run = buy(run, biteSlot);
  while (!run.over) {
    actions.push({ kind: "fight" });
    run = fight(run).run;
  }

  const replay = replayRunActions(date, actions);
  assert.equal(replay.over, run.over);
  assert.equal(replay.wins, run.wins);
  assert.equal(replay.lives, run.lives);
  assert.deepEqual(replay.chips, run.chips);
  assert.deepEqual(replay.actions, actions);
});

test("brawl replay rejects a no-op claim action", () => {
  const date = "2026-11-17";
  const run = newRun(date);
  const biteSlot = run.shop.findIndex((offer) => offer?.kind === "chip" && offer.id === "bite");
  assert.ok(biteSlot >= 0);
  assert.throws(() => replayRunActions(date, [
    { kind: "buy", slot: biteSlot },
    { kind: "buy", slot: biteSlot },
  ]));
});

test("claim vouchers bind the recipient and token id to the signer", async () => {
  const account = claimSignerAccount();
  const domain = claimDomain();
  assert.ok(account);
  assert.ok(domain);

  const recipient = "0x2000000000000000000000000000000000000002";
  const activityId = `0x${"22".repeat(32)}` as const;
  const circuitHash = `0x${"33".repeat(32)}` as const;
  const first = await signCircuitClaim({
    recipient,
    mode: 1,
    activityCode: 7,
    activityId,
    circuitHash,
    gateCount: 23,
    depth: 6,
    stateBits: 4,
    score: 314,
  });
  const second = await signCircuitClaim({
    recipient,
    mode: 1,
    activityCode: 7,
    activityId,
    circuitHash,
    gateCount: 23,
    depth: 6,
    stateBits: 4,
    score: 314,
  });

  assert.equal(first.tokenId, second.tokenId);
  assert.equal(
    first.tokenId,
    circuitClaimTokenId({ recipient, mode: 1, seasonId: 1, activityId }).toString(),
  );
  const recovered = await recoverTypedDataAddress({
    domain,
    types: CIRCUIT_CLAIM_TYPES,
    primaryType: "CircuitClaim",
    message: { ...first.claim, deadline: BigInt(first.claim.deadline) },
    signature: first.signature,
  });
  assert.equal(recovered.toLowerCase(), account.address.toLowerCase());
});

