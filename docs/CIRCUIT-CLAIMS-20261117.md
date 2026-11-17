# Commemorative Circuit Claims

TapeFly Workshop and Brain Brawl now share one optional X Layer claim flow.

> A claim is a commemorative ERC-1155 receipt that references a verified circuit hash. It is not a TapeOut Circuit NFT and does not add an on-chain `eval` function.

## Player flow

### Workshop

1. The player clears a level.
2. The result dialog runs the existing exhaustive Workshop seal check.
3. The claim button appears only when the circuit is eligible.
4. The server re-runs the level and the complete circuit check.
5. The server signs an EIP-712 voucher.
6. The wallet switches to X Layer and calls `claim`.

### Brain Brawl

1. The player finishes a daily run.
2. Brawl submits the order of shop purchases, sells, moves, rerolls and fights.
3. The server reconstructs the run from `newRun(date)` and replays every action.
4. The final brain is compiled again and its NAND bytes are hashed.
5. The server signs an EIP-712 voucher.
6. The wallet switches to X Layer and claims the commemorative receipt.

Practice fights are deliberately excluded from the action log.

## Contract

Source: `contracts/src/TapeFlyCircuitClaims.sol`

Properties:

- ERC-1155 with one unique token ID per wallet, mode, season and activity.
- The token ID includes the recipient, so each claim is a distinct artifact.
- User-supplied outcomes are not trusted.
- Claims require a server EIP-712 signature.
- One wallet can claim once per Workshop level or once per Brawl date.
- The owner can pause claims, rotate the signer and change metadata URI.
- Metadata and images are served by TapeFly API routes.

## Environment

Client-visible:

```bash
NEXT_PUBLIC_TAPEFLY_CLAIMS_CONTRACT=0x...
```

Server-only:

```bash
TAPEFLY_CLAIM_SIGNER_KEY=0x...
```

The signer key must never be exposed as `NEXT_PUBLIC_*`.

## Build and test

```bash
npm run contracts:test
npm run typecheck
npm test
npm run build
```

Contract:

```bash
cd contracts
forge test -vv
```

## X Layer deployment

1. Create a dedicated claim signer:

```bash
cast wallet new
```

2. Deploy with a separately funded deployer wallet:

```bash
cd contracts
forge create src/TapeFlyCircuitClaims.sol:TapeFlyCircuitClaims \
  --rpc-url https://rpc.xlayer.tech \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --constructor-args \
  "https://tapefly.xyz/api/v1/claims/token/" \
  "$CLAIM_SIGNER_ADDRESS"
```

3. Set:

```bash
NEXT_PUBLIC_TAPEFLY_CLAIMS_CONTRACT=<deployed address>
TAPEFLY_CLAIM_SIGNER_KEY=<claim signer private key>
```

4. Rebuild and restart TapeFly.

Until both values are configured, the claim card remains hidden and the voucher API returns `503`.

## API

Prepare a signed voucher:

```text
POST /api/v1/claims/voucher
```

Workshop:

```json
{
  "address": "0x...",
  "mode": "workshop",
  "payload": {
    "level": "level-id",
    "code": "encoded-design"
  }
}
```

Brawl:

```json
{
  "address": "0x...",
  "mode": "brawl",
  "payload": {
    "date": "2026-11-17",
    "actions": [
      { "kind": "buy", "slot": 0 },
      { "kind": "fight" }
    ]
  }
}
```

Metadata:

```text
GET /api/v1/claims/token/<tokenId>
GET /api/v1/claims/image/<tokenId>
```

## Security boundaries

- The browser cannot choose `cleared`, `winner`, gate count, depth or circuit hash.
- The server does not sign an invalid Workshop circuit.
- The server does not sign a Brawl run that fails deterministic replay.
- The contract enforces recipient binding, expiry, one-time claims and signer authorization.
- The contract does not promise financial value, yield or voting power.
