# TapeFly unified brain roadmap

Date: 2026-11-14

Related product reference:
`docs/GOLDEN-SPATULA-PRODUCT-REFERENCE-20261117.md`.

## Decision

TapeFly will stop presenting Workshop, Brain Brawl and lineage as three unrelated
products. They become four uses of one shared object:

> A NAND brain netlist with a declared behavior profile.

The four product roles are:

| Role | Product | What it proves |
| --- | --- | --- |
| Learn | Workshop | A player can turn senses and rules into a working brain |
| Compete | Arena | Two brains can be compared under the same deterministic rules |
| Seal | TapeOut | A verified brain can be taped out as an X Layer circuit NFT |
| Verify | Genesis / Proof / Lineage | The reference brain and recorded behavior can be recomputed |

The shared object is not a token, a character or a screenshot. It is the
compiled netlist plus enough interface metadata to know what every input and
output means.

## Terminology

Use these terms consistently in code, UI and documents:

- **Brain**: a compiled NAND netlist and its interface profile.
- **Behavior profile**: the names and meaning of inputs, outputs and state bits.
- **Onchain tape-out**: buy/burn NAND through TapeOut on X Layer, store the
  netlist, mint the circuit NFT and expose free `eval`.
- **Silicon tape-out**: FPGA, ASIC, board or robot manufacture. This is a future
  hardware vision and is never used to describe the hackathon deliverable.
- **Genesis**: the official reference fly brain. It is a reference and final
  opponent, not a separate game.

## Hard constraints

- The 2D Workshop physics remains authoritative.
- The build editor remains top-down 2D.
- Workshop flight/replay remains pure 2D for now.
- Simulation decisions remain deterministic.
- No visual state may change physics, scoring or replay.
- A brain is not described as tape-out ready until the complete verification
  path passes.
- TapeFly does not claim to create physical silicon through TapeOut.
- All current-chain claims in submission material refer to X Layer.
- Only the current X Layer circuit and transaction are used as deployment evidence.

## Current code inventory

Already available:

- `sim/workshop/compile.ts` compiles Workshop wiring to a `WorkshopChip`.
- The chip has sensors plus state bits as inputs, wings plus next-state bits as
  outputs, and a `regs` mapping for offchain state feedback.
- `sim/netlist.ts` evaluates generic NAND netlists.
- `sim/tapeout.ts` converts any compatible netlist to TapeOut bytes.
- `sim/onchain.ts` can read processors and verify a circuit on X Layer.
- `/api/v1/workshop/evaluate` re-runs designs on the server.
- Existing tests compare compiled Workshop behavior with `brainTick` for the
  reference designs.

Current boundaries:

- The official 12-in/3-out Arena brain is live as X Layer Circuit #2.
- No stateful Workshop design has been taped out on X Layer yet.
- The current proof uses the external Sillu test processor, not a TapeFly-owned
  replacement processor.
- Product navigation still mixes old games with the new four-role model.
- Whitepaper claims are not aligned with the current implementation.

Delivered on 2026-11-14:

- `sim/workshop/seal.ts` compiles a Workshop design to its stateful NAND core,
  emits TapeOut bytes and exhaustively checks every input up to 12 bits.
- `POST /api/v1/workshop/seal` exposes the report and exact bytes. Invalid
  requests are rejected; designs that decode but do not qualify return 422 with
  the complete blocking report.
- The Workshop result screen shows `可上链流片` only after the server finishes
  the same exhaustive check, and exposes blocking reasons plus report copy and
  download actions.
- The public tape-out panel reads the live processor, BEM price, OKB fee and
  wallet balance before enabling a transaction.
- Stateful `door3` passes, including four exposed state bits and their register
  mapping. Designs above 12 inputs remain explicitly ineligible.

## Shared brain contract

Add a shared representation rather than copying product-specific logic:

```ts
export interface BehaviorBrain {
  version: string;
  profile: string;
  netlist: Netlist;
  inputs: string[];
  outputs: string[];
  state: [string, "q" | "wasOff"][];
  regs: [number, number][];
  source: "workshop" | "arena" | "genesis";
}
```

Profiles:

- `WORKSHOP-{n}x{m}/1`
- `DUEL-12x3/1`
- `FFW-NAND/1`

The profile is part of the brain identity. Two netlists with different input
layout are not assumed to be interchangeable.

## Milestone 1: stateful Workshop proof

Target: prove one Workshop design with memory/toggle state can be exported and
checked without LATCH.

Choose `door3` first:

- it uses two toggle cells;
- it exercises state feedback;
- the reference design fits the current level rules;
- the full input space is small enough for exhaustive evaluation.

Implementation:

1. Add a Workshop seal adapter that returns:
   - compiled netlist;
   - TapeOut bytes;
   - byte length and SHA-256;
   - `nIn`, `nOut`, gate count and profile;
   - a list of inputs, outputs and state bits;
   - eligibility and exact blocking reasons.
2. Enforce `nIn <= 12`.
3. Exhaustively enumerate every input word.
4. Compare:
   - wing outputs with `brainTick`;
   - next-state outputs with `brainTick().next`;
   - register mapping with `WorkshopChip.regs`.
5. Produce a JSON report suitable for tests, docs and UI.

Acceptance:

- `door3` compiles to a valid TapeOut byte sequence.
- Every input word is checked, not sampled.
- Outputs and state transitions match the live brain exactly.
- The report includes byte hash and gate count.
- No X Layer transaction is required for this milestone.

## Milestone 2: eligibility and export UI

Add a Workshop seal API and UI. Do not create a second compiler.

UI states:

- `可发布` — passes level rules.
- `可竞技` — has a valid deterministic trace.
- `可上链流片` — passes full seal verification and has `nIn <= 12`.

On the level result screen:

- show eligibility;
- show gate count, input/output widths and state-bit count;
- allow download of the TapeOut byte report;
- link to the TapeOut panel only for eligible designs;
- explain why an ineligible design cannot be sealed.

No “seal” button should appear for a design that has not been exhaustively
checked.

Acceptance:

- Every reference level reports eligibility correctly.
- A stateful design can produce a readable seal report.
- A design with too many inputs is blocked with a precise explanation.
- Existing Workshop behavior and scoring do not change.

## Milestone 3: X Layer tape-out proof

Completed for the official 12-in/3-out Arena brain as X Layer Circuit #2 on
`0x99081e1D0CE916Cd5b2c53e769DFC3B000BFE9A4`, transaction
`0xa7ad0fd9b85e3290fbfe7d78dfba5c0ccc177d1723b3a9f6f18a1a87c937d5cd`.
The stored bytes and all 4,096 answers match.

This milestone requires a funded wallet and an X Layer processor.

Two possible paths:

1. Use an existing TapeOut processor on X Layer if one is available.
2. Create the TapeFly processor through `/tapeout/processor`.

Do not request a wallet signature until all of these are known:

- processor address;
- NAND balance required;
- tape-out fee;
- exact `nIn` and `nOut`;
- byte SHA-256;
- local exhaustive verification result.

After tape-out:

1. store processor and circuit ID in the verification report;
2. read the stored netlist back;
3. compare bytes exactly;
4. evaluate every input through onchain `eval`;
5. compare each answer with the local netlist;
6. record transaction hash and timestamp.

Acceptance:

- The stateful Workshop brain exists as an X Layer circuit NFT.
- Stored bytes match the source bytes.
- Every possible input returns the expected output.
- The report can be linked from the product page.

If this cannot be completed, Workshop remains the learning funnel but does not
become the sole hackathon submission subject.

## Milestone 4: Arena integration

Do not merge the Brawl runtime into Workshop.

Use the shared brain object and a common comparison model:

- same level;
- same seed;
- same rules;
- same gate budget;
- server re-runs submissions.

Navigation:

- Workshop = learn;
- Arena = compete;
- TapeOut = seal;
- Proof = verify.

Arena initially groups:

- Brain Brawl;
- forage race;
- daily challenge;
- AI agent ladder.

AI agents submit a brain before the match. Matches are asynchronous and
deterministic. No model is allowed to see future world state.

## Milestone 5: Genesis and proof consolidation

Rename the official forage fly to **Genesis** in UI and documents while keeping
the existing stable URLs.

Genesis responsibilities:

- official reference brain;
- final Workshop opponent;
- canonical tape-out example;
- compatibility target for verification.

Lineage and proof pages are evidence surfaces only. They are not presented as
standalone games.

## Milestone 6: whitepaper and submission material

Rewrite the whitepaper around:

1. The black-box behavior problem.
2. The unified NAND brain object.
3. Workshop: learn.
4. Arena: compete.
5. TapeOut: seal.
6. Genesis and Proof: verify.
7. X Layer integration evidence.
8. Steam and hardware as future distribution.
9. Risks, limits and non-claims.

Canonical narrative:

> Start by building a bug. Learn NAND by making it live. Seal its brain on
> X Layer. Recompute every step yourself.

Claims that must be removed or corrected:

- TapeOut does not create physical silicon.
- Verilog is not the TapeOut transfer format.
- TapeFly does not mint its own asset; the circuit NFT is produced by TapeOut.
- Current level count is 21 plus sandbox.
- Current automated test count is 160.
- Steam is future distribution, not the X Layer proof.
- Remove unsupported revenue estimates such as “seven-figure”.

## Milestone 7: DeWEB evidence surface

DeWEB/TapeKit support on X Layer is real, but it stores static files under a
TapeOut circuit container and cannot host the current Next.js API application.

Decision:

- keep the full game and verification API on the existing server;
- prepare a separate static proof page for a future DeWEB container;
- publish it only after a real circuit, byte match, onchain exhaustive
  verification and transaction hash exist;
- never present the static page as a full onchain game.

The preflight folder is `deweb-proof/`; the detailed assessment is
`docs/DEWEB-FEASIBILITY-20261114.md`.

## Navigation target

Long-term:

```text
Workshop | Arena | TapeOut | Proof | Developers | Steam | AI Hardware
```

Until Arena is ready, keep the existing Lab menu but label it “Arena / Lab” in
copy rather than silently merging products.

## Test plan

Required checks:

```bash
npm run typecheck
npm test
npm run build
```

New tests:

1. `door3` seal report compiles.
2. Every input word matches the live brain.
3. Next-state outputs match.
4. Byte output is stable and hashed.
5. Designs above 12 inputs are ineligible.
6. Ineligible designs never produce a seal CTA.
7. Unsaved or failed designs cannot be sealed.

## Rollout

### Phase A: local proof

- seal adapter;
- exhaustive verification;
- report;
- tests.

### Phase B: product proof

- eligibility UI;
- downloadable report;
- result-screen CTA;
- no wallet transaction yet.

### Phase C: chain proof

- processor;
- NAND purchase;
- tape-out;
- onchain verification;
- public report.

### Phase D: narrative

- navigation;
- whitepaper;
- submission;
- demo video.

## Go / no-go rule

Workshop becomes the sole submission subject only if Phase A and C both pass.

If the stateful Workshop brain cannot be taped out and exhaustively verified on
X Layer in time:

- keep Workshop as the learning and creation funnel;
- use the already-live 12-in/3-out Circuit #2 as the primary X Layer proof;
- do not describe the stateful Workshop brain as shipped on chain.

