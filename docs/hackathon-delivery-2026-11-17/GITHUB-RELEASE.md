## TapeFly v0.3.0

TapeFly is a playable fruit fly whose entire decision layer is a NAND circuit. Players build the body, wire the senses, inspect the exact failing tick, change one connection and retry. A fully checked brain can be taped out through TapeOut on X Layer.

### Included

- Workshop as the primary game, with 21 levels, memory, counting, toggle cells, a metronome, sandbox, replay, failure diagnosis and live NAND chip view.
- Stateful Workshop circuit compilation and exhaustive seal reports up to 12 input bits.
- Agent Workshop API for machine-readable tasks, submission and circuit proof.
- Real X Layer Circuit #2 for the official 50-gate Genesis brain.
- Free on-chain `eval` verification with `4,096 / 4,096` matching answers and matching stored bytes.
- itch.io build, Steam submission assets, documentation, roadmap and hackathon evidence.
- English 2:50 demo, bilingual subtitles and the complete submission packet.

### Verification

- `npm run check`: passed
- Tests: `160 / 160`
- Production build: passed
- X Layer verification: `4,096 / 4,096` and stored bytes match
- `npm audit --omit=dev`: 0 vulnerabilities

### Official brain proof

- Chain: X Layer, chain ID `196`
- Circuit: `#2`
- Processor: `0x99081e1D0CE916Cd5b2c53e769DFC3B000BFE9A4`
- Transaction: `0xa7ad0fd9b85e3290fbfe7d78dfba5c0ccc177d1723b3a9f6f18a1a87c937d5cd`
- NAND: 50
- Inputs / outputs: 12 / 3
- Bytes: 350

### Current boundaries

- The official Circuit #2 uses an external Sillu test processor.
- A separately created TapeFly-owned processor has an incorrect NAND price unit and is not used for public purchases.
- Workshop state proofs are implemented, but no Workshop stateful design has yet been taped out on X Layer.
- Steam and AI hardware are future distribution plans, not live products.

### Submission packet

Download `tapefly-hackathon-delivery-2026-11-17.zip` below for the English three-minute video, vertical cut, subtitles, business model, evidence ledger and activity-period development record.
