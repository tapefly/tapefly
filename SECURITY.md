# Security Policy

TapeFly handles public game state, deterministic artifacts and wallet-signed
on-chain transactions. The website must never receive or store private keys.

## Report a vulnerability

**Do not open a public issue for a security problem.** Use the **Report a
vulnerability** button in the repository's
[Security tab](https://github.com/tapefly/tapefly/security/advisories/new).

Include:

- affected URL, commit and browser;
- reproduction steps;
- expected versus actual behavior;
- impact and whether funds, keys or public history are involved;
- a minimal proof of concept when safe.

We will acknowledge the report, state whether it is accepted as a finding, and
coordinate disclosure after a fix is available.

## Scope

In scope:

- the Next.js application and server routes;
- the deterministic engine, NAND compiler and record verification;
- the committed lineage, season and calibration files;
- transaction construction and on-chain verification tools;
- dependency and deployment configuration in this repository.

Out of scope:

- the TapeOut contracts themselves;
- BNB Chain, X Layer, wallets and RPC providers;
- social engineering or denial-of-service attacks against third parties.

## Safe testing

- Use local builds or test fixtures for destructive cases.
- Do not attempt to move another user's funds or acquire their wallet credentials.
- Do not publish personal data, private keys or an exploitable proof before a fix.
- Treat a transaction simulation as evidence only for the block and calldata it used.

## Supported version

Only the latest commit on `main` is supported. Security decisions should record
the exact commit, dependency versions and chain block used as evidence.
