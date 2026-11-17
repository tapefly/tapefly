# TapeFly Evidence Ledger

Verified from the local release materials on 2026-11-17. Re-check before final submission.

## X Layer deployment

| Field | Value |
|---|---|
| Chain | X Layer |
| Chain ID | `196` |
| Factory | `0x1f09daefa827f02cbb40967cc91b259763760761` |
| Official brain processor | `0x99081e1D0CE916Cd5b2c53e769DFC3B000BFE9A4` |
| Processor category | External Sillu test processor |
| Circuit ID | `#2` |
| Transaction | `0xa7ad0fd9b85e3290fbfe7d78dfba5c0ccc177d1723b3a9f6f18a1a87c937d5cd` |
| Taped-out | `2026-11-14` |
| NAND gates | `50` |
| Inputs / outputs | `12 / 3` |
| Bytes | `350` |
| Bytes SHA-256 | `a763117011fe4c4be7106d9b0d2c78fe79b81c15ccc2a6531c9263b4f443d4dd` |
| Exhaustive eval | `4,096 / 4,096` match |

Explorer:

<https://www.oklink.com/xlayer/tx/0xa7ad0fd9b85e3290fbfe7d78dfba5c0ccc177d1723b3a9f6f18a1a87c937d5cd>

## TapeFly-owned processor

| Field | Value |
|---|---|
| Processor | `0xdE64a1584D6389D27318239DC5d6f58b0AeD52A3` |
| Transistor contract | `0xbdf03F98CA1d348e80d8f24cd8bf5720C94c504A` |
| Creation transaction | `0x13791b6c62ffc6acba3d31e94d4f2012f64323fd4c8ba7dd6390248f2e8cbf62` |
| Block | `75874205` |
| Receipt | `success` |
| Cached circuits | `0` |

Known failure:

- `mintPrice` was entered as `1,000,000,000,000`.
- The transistor contract interprets the value in BEM raw units.
- Resulting price is `10,000 BEM / NAND`.
- The contract has no price setter.
- This processor cannot be repaired in place and is not the current public tape-out path.

## Stateful Workshop proof

Reference design `door3`:

| Field | Value |
|---|---|
| Profile | `WORKSHOP-7x6/1` |
| NAND | `23` |
| Inputs / outputs | `7 / 6` |
| Exposed state bits | `4` |
| Exhaustive checks | `128 / 128` |
| Bytes | `161` |
| SHA-256 | `3da820cc456b3757eefec1e8727286e42f1e448251507635baef6dd069ca52ff` |

Important:

- The seal proof is implemented.
- The Workshop design has not been taped out on X Layer.
- No X Layer transaction is sent by `POST /api/v1/workshop/seal`.

## Product and API

- Workshop: <https://tapefly.xyz/workshop>
- Design gallery: <https://tapefly.xyz/workshop/gallery>
- Agent page: <https://tapefly.xyz/agents>
- Developer docs: <https://tapefly.xyz/docs>
- Tape-out proof: <https://tapefly.xyz/tapeout>
- itch demo: <https://richard7463.itch.io/tapefly-workshop>

Agent endpoints:

```text
GET  /api/v1/workshop/agent
POST /api/v1/workshop/agent
```

## Reproduction commands

Run from the public source checkout:

```bash
npm run workshop:check
npm run agent:proof
npm run xlayer:processor:preflight
npm run check
```

## Submission attachments

1. English three-minute video.
2. Circuit #2 proof page and transaction.
3. TapeFly processor creation transaction, with known issue disclosed.
4. Public GitHub release `v0.3.0`, commit `7fa96b1`.
5. Business model one-pager.
6. itch playable build.
