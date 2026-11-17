# X Layer DeWEB feasibility

Date: 2026-11-14

## Decision

**Do not migrate the full TapeFly application to DeWEB.**

DeWEB is a static on-chain website container, not a general server platform.
TapeFly currently depends on Next.js route handlers, mutable Workshop storage
and server-side re-runs. Moving the whole app would remove the pieces that make
the game and API work.

**Do prepare a separate static proof site.**

The DeWEB artifact can be a small, self-contained page that proves one brain:
profile, gate count, exhaustive checks, bytes and SHA-256. The official brain is
now X Layer Circuit #2 with a real transaction; the remaining DeWEB step is to
publish this exact page inside that circuit's container.

The scaffold is in `deweb-proof/`. It is a local proof page until its files are
stored and verified in the on-chain container.

## What DeWEB actually is

The reference implementation is
[TapeOutProtocol/TapeKit](https://github.com/TapeOutProtocol/TapeKit). A site is
stored as files under the ERC-6551 container of a TapeOut circuit NFT. The
reader resolves name to container, reads each file, and verifies every byte
against the SHA-256 recorded on chain.

X Layer support is present in TapeKit's current configuration:

- chain ID: `196`
- X Layer area code in names: `2`
- example name shape: `1.2.344`
- factory: `0x1f09daefa827f02cbb40967cc91b259763760761`
- opener: `0x536add8f30f03b69f6fbf29d425a816a0dc50106`
- SiteRegistry: `0xd6efb7adcc9c83dc4924ad56f6a8e4e969b9adb6`
- DomainBinding: `0x68809fd2fb343aa57d0aeb7f33defe477c9666f9`

Read-only checks on 2026-11-14 at X Layer block `75,861,014`:

- `factory.cpuCount()` returned `418` from both `rpc.xlayer.tech` and
  `xlayer.drpc.org`.
- `DomainBinding.monthlyFee()` returned `0` from both nodes. This is the
  current contract value, not a permanent product promise; any implementation
  must read the fee again at transaction time.

## Hard constraints

| Constraint | Value | Product impact |
| --- | --- | --- |
| Hosting model | Static files in an on-chain container | No Node process, no API route, no mutable JSONL store |
| Chunk size | 24,000 bytes | Images and JS must be split by the publisher |
| Single file | 8,400,000 bytes | Large media and bundles must be removed |
| Paths per manifest | 5,000 | Fine for a landing/proof page |
| 100% on-chain scan | No external `http(s)`, CDN, analytics, remote fonts or runtime fetch | All CSS, fonts, scripts and images must be relative and local |
| SPA routing | `fallbackPath` can return unknown extensionless paths to `index.html` | Client-side routing is possible, but API routes are not |
| Chain access | Reading configured chain RPCs is allowed | A small on-chain proof viewer is possible |

## Why the current Next.js app cannot be moved as-is

The current product uses:

- `/api/v1/workshop/*` route handlers for evaluation, seal proof, publishing and
  chain verification;
- `WORKSHOP_DATA_DIR/designs.jsonl` for mutable published designs;
- server-side physics re-runs so client scores are never trusted;
- remote and dynamic routes that require a running Node server.

A DeWEB site could store a client-only game, but TapeFly's current verification
model would become either precomputed or dependent on an off-chain API. That
would lose the 100% on-chain badge and make the claim weaker, not stronger.

## Go/no-go rule

Create the separate DeWEB proof page only when all of these are true:

1. A real TapeOut circuit exists on X Layer.
2. Its container stores this exact proof page.
3. Stored bytes match the local SHA-256.
4. Every circuit input matches the local netlist through on-chain `eval`.
5. The page displays processor, circuit ID, transaction hash and verification
   count.
6. The TapeKit gateway status page reports all files verified and no blocked
   off-chain requests.

Until the container publication is verified, `deweb-proof/` remains a local
preflight artifact even though the X Layer circuit itself is live.

## Agent product opportunity

The independent high-value change is the Workshop Agent route:

- `GET /api/v1/workshop/agent` describes the task, workflow, limits and honest
  transaction boundary.
- `POST /api/v1/workshop/agent {level, code}` performs the measured level run
  and exhaustive circuit proof in one call.
- The response separates local proof, publication eligibility and X Layer
  readiness.
- It never signs, sends or implies a transaction.
- `npm run agent:proof` demonstrates the full flow from an external process.

This turns Workshop into an API-native creation surface for AI agents while
keeping the chain claim falsifiable.
