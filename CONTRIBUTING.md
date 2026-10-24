# Contributing to TapeFly

TapeFly is a deterministic game and a public verification surface. Contributions
are welcome when they make the world easier to play, a claim easier to check, or
the implementation smaller and clearer.

## Good contributions

- Reproduce a bug on a named UTC date and include the expected and actual output.
- Add a challenger brain under `challengers/<github-handle>/`.
- Add a test that catches a real mismatch between rules, netlist, replay or chain data.
- Improve the guide for a new player without hiding technical limits.
- Report a security issue privately according to [SECURITY.md](./SECURITY.md).
- Improve accessibility, responsiveness or performance with before/after evidence.

## Rules

- Never commit a private key, seed phrase, API secret or `.env` file.
- Do not change a past day, certificate, season or lineage row to make a test pass.
- Do not weaken exhaustive checks to accept a circuit that is wrong on one input.
- Keep the official brain's 12-input, 3-output interface and committed bytes stable.
- Keep X Layer and BNB Chain claims separate. A planned integration is not a live one.
- Do not add betting, yield, price promises or token mechanics without an explicit product decision.

## Development

Requirements: **Node.js 22**.

```bash
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run typecheck
npm test
npm run lineage -- --check
npm run board -- --check
npm run anchor -- --check
npm run tapeout -- bytes
npm run build
```

`npm run check` runs that full local sequence. `npm run judge:check` also checks
the live Circuit #1 against all 4,096 inputs.

## Brain submissions

1. Build and export a brain at `/build`.
2. Add it as `challengers/<github-handle>/<name>.json`.
3. Run `npm run board -- --check --show`.
4. Open a pull request with the exported artifact and explain the strategy.

Do not hand-edit scores. The score must be recomputed from the circuit.

## Pull requests

Keep each pull request narrow. Include:

- the problem;
- the exact behavior before and after;
- the checks you ran;
- any change to documented claims, dates, hashes or chain state.

Use the repository's pull request template. For a vulnerability, do not open a
public pull request with exploit details; report it privately first.
