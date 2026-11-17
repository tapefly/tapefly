# Changelog

Notable public changes to TapeFly are recorded here.

## [0.4.0] - 2026-11-17

### Added

- Commemorative circuit claims for Workshop clears and completed Brain Brawl runs.
- Server replay of the complete Brawl shop/fight action log before issuing a claim.
- EIP-712 recipient-bound vouchers, one claim per wallet per level or daily run.
- `TapeFlyCircuitClaims` ERC-1155 contract with pause controls, signer rotation, unique token IDs and metadata APIs.
- Dynamic circuit-card metadata and SVG image endpoints.

## [0.3.0] - 2026-11-17

### Added

- **Workshop seal proof.** A Workshop design can now be compiled to its stateful NAND core and checked against the live game brain for every possible input up to 12 bits. `POST /api/v1/workshop/seal` returns the exact TapeOut bytes, byte SHA-256, input/output meanings, state-bit register mapping and any blocking reasons. The result screen shows `可上链流片` only after the same exhaustive check, with report copy/download actions; it clearly says no X Layer transaction has been sent yet.

- **Agent Workshop proof route.** `GET /api/v1/workshop/agent` describes the complete machine-readable task, and `POST /api/v1/workshop/agent {level, code}` runs the measured level plus exhaustive circuit proof in one call. The response separates submission eligibility from X Layer readiness and never signs or sends a transaction. `/agents` includes a copyable agent prompt and a working reference proof, and `npm run agent:proof` runs the same flow from an external process.

- **DeWEB feasibility and proof-page scaffold.** `docs/DEWEB-FEASIBILITY-20261114.md` records the X Layer/TapeKit constraints and the decision not to migrate the Next.js API app. `deweb-proof/` is a static, script-free proof page with no external assets, prepared for a future circuit-container publish only after a real X Layer tape-out and on-chain verification exist.

- **X Layer processor preflight.** The current TapeOut factory charges its processor creation fee in BEM, not OKB. The operator page now checks the BEM balance and allowance, approves exactly `0.1 BEM`, and only then simulates and creates the processor. `npm run xlayer:processor:preflight` reports the same readiness state without sending a transaction. The full findings and stop conditions are in `docs/XLAYER-PROCESSOR-RUNBOOK-20261114.md`.

- TapeFly: Workshop chapters 2 and 3, and a sandbox. The brain is now a full synchronous circuit, not just reflexes: six new parts (mouth, nose, logic block, **memory cell**, **toggle cell**, metronome) let a nerve run from any sense or brain part into any wing or brain part, with per-input NOT and per-part any/all. `sim/workshop/brain.ts` runs it one tick at a time (combinational logic between registers); `sim/workshop/compile.ts` compiles the same wiring to a NAND netlist **with registers** — state bits enter as inputs and their next values leave as outputs — and a test checks netlist and simulation agree on every input word and state, registers included. Six new levels: stop when full and bring it home (one bit of memory), find it and fetch it (two reflex sets switched by one bit), the second door and count to three (a two-bit binary counter built from toggles), glass sugar (a clock divider to arrive slowly). Reference solutions run 8 gates / 1 bit up to 23 gates / 4 bits. New: a gate-level **chip view** that draws the player's actual NAND netlist and lights it live while the fly flies, with the netlist copyable in TapeOut's format; a **sandbox** with every part and four arenas; **share links** that carry a whole design in the URL; a chapter map; nest and glass-sugar arenas. GIF export now picks its frame rate from the run's length, so a long clip stays under 1 MB.

- TapeFly: Workshop (`/workshop`): build a robot fly from parts and let it go. Parts snap to a grid around a heart (body blocks, small and large wings, weights, eyes, antennae, spider hair); each has mass, strength and cost, and the build flies as one rigid body, so an off-centre wing turns it, a weight steadies it and a weak part snaps off on impact. Senses are wired to wings with nerves; a nerve can be inverted, and a wing fires on any or all of its inputs. The wiring compiles to a NAND netlist (`sim/workshop/compile.ts`) that matches the simulation on every sensor word. Six levels (lift off, curve round a pillar, see sugar in three places, knock down a tower, find a way round a wall, don't wake the spider), each needing one new idea. Deterministic 60 Hz physics (`sim/workshop/physics.ts`) with impulse collisions, breakable parts, a sugar tower that holds until hit hard, and a spider; slow motion when a part snaps, camera shake, commentary on what the fly sensed, three scores (parts, gates, seconds), GIF export, English and Chinese, phone layout, no wallet. `tests/workshop.test.ts` checks every level is clearable, each level fails with the design that cleared the one before, determinism, and netlist = wiring.
- TapeFly: Evolution (`/evo`): a programming puzzle campaign. Chapter 1 (Forage) has eight levels; each grows one organ (antennae, side antennae, nose, eye, one bit of memory) and runs the brain on several test boards at once. Brains are rule lists compiled to a NAND netlist (`sim/evo/brain.ts`, 12 inputs, 4 outputs, don't-care-aware field logic); the game runs the netlist. Three scores — gates, depth, steps — shown against a distribution of clearing brains found by `scripts/evo-histo.ts`. Exact loop detection ends a run that would repeat forever and says how it failed. Live rule highlighting, a lit gate view, timeline scrubbing, synthesised sound, GIF export of any run, copy/paste brain codes, English and Chinese, phone layout, no wallet. `tests/evo.test.ts` checks every level is clearable, every start brain fails, each level needs something new, and netlist = rules on every reachable input.
- Brain Brawl (`/brawl`): two flies fight in real time and you write the tactics. Bites wind up and commit to a line, shields come up after a beat and only cover the front, a dodge makes a bite miss, a bite into a wind-up interrupts it, and every fly reads its rival a few ticks late, like a reaction time. Tactic chips are rules read top to bottom; the whole brain compiles to one NAND netlist with the existing compiler and the gate budget is checked against that netlist, so chips that share logic cost less together. Body parts (jaws, shell, legs, venom, lungs, spines) are bought with gold and cost no gates. Shop, rivals and fight seeds are a pure function of the date; a level time-out goes to the smaller brain.
- The fight screen (`app/brawl/FightCanvas.tsx`): a camera that follows the pair, hit-stop, impact rings, sparks and damage numbers, screen shake, a slowed and zoomed knockout, after-images on a lunge, synthesised sound that starts with the first click (with an off switch), 1×/2×/4× and skip, and the deciding chip of both brains lit tick by tick. Reduced motion turns off shake, zoom and slow motion.
- Free practice fights on separate seeds, a plain reason for every loss that names the chip to add or move, challenge links (`/brawl?c=…&g=…&n=…`) that let a friend fight your brain and body, and the tape-out cost of the final brain.
- `GET /api/v1/brawl`: chips, parts, rival ladder, budgets and seeds; submit a brain as `?chips=` or any rule list as `?program=p1.…`, a body as `&gear=`, to fight the ladder (`&fight=i` for one fight). `npm run agent:demo` is a small agent that builds a brain and body per fight through this API alone.
- `docs/tap/TAP-draft-circuit-brain-interface.md`: a draft convention (manifest + profiles) so a taped-out behaviour circuit can be loaded and compared by other applications; TapeFly's layouts are profiles `FLY-12x3/1` (foraging) and `DUEL-12x3/1` (fighting).
- `sim/duel.ts` (the fight), `sim/arena.ts` (a run), `tests/arena.test.ts` (netlist = rules on all 4,096 words, rivals within budget, determinism, mirror fairness, a whole run) and `npm run arena:ghosts` (the AI rivals, found by a local search inside each fight's budget against the rivals before them and a few plain plans; `--check` in `npm run check`).
- Public organization and repository profile aimed at players, judges and verifiers.
- Product screenshots, architecture diagrams, a judge scorecard and a three-minute demo script.
- Community health files and repository issue/pull-request templates.
- `npm run verify:onchain` and `npm run judge:check`.
- CodeQL and dependency-review workflows.

### Changed

- The home page is now Brain Brawl's front door: one headline, one button into a first fight, and a live loop of two AI-designed brains fighting with their deciding chips lit. The forage experiment that used to be the home page moved to `/forage`.
- The top bar: Brawl and the Brain editor up front, three menus that show what is behind them (Lab: the forage experiment, race, champions, rule editor, sense bench, brain school, exam; On chain: tape-out, proof, lineage, verify; Builders: the agent API, the TAP draft, GitHub), Docs, and one Play button. Menus close on an outside click or Escape.
- The home page lists what TapeFly has today, each with its state (live or in progress).
- Brain editor (`/brawl/editor`): write Brain Brawl rules yourself (tick the sense levels each rule fires on, pick a move and whether to bite, up to 16 rules), start from the example, your run, any rival or a chip; recompiled to NAND and checked on all 4,096 inputs on every change; free body parts; practice against any rival, run the whole ladder on the day's real seeds, or copy a challenge link (`/brawl?p=…`) or the API URL. A friend's challenge can now carry hand-written rules, and the fight screen shows them in words.
- `/brawl` walks a first-time player through four tasks (buy an attack chip, fight once, put a defence above the attack, fit a body), pulsing the button to press; skippable, remembered in the browser. The first fights explain how to read the screen.
- `/docs` rewritten around Brain Brawl: a run, a fight (with a bite timeline diagram), chips, parts, the circuit, rivals, fairness, TapeOut, the agent API, economics, roadmap, lab and lineage. All numbers come from the code.
- The share card (Open Graph image) and site title describe Brain Brawl.
- Upgraded production from Next.js 14 to Next.js 15.5.28.
- Updated PostCSS through a pinned override and cleared all npm audit advisories.
- Updated server-rendering language reads for Next.js 15's asynchronous cookie API.

### Removed

- Retired marketing files and public references to the previous project name.


## [0.2.0] - 2026-11-10

### Changed

- Every on-chain feature now targets X Layer (chain 196): tape-out panel, processor creation, lineage anchors and workshop records share one chain definition (`sim/onchain.ts`). The official brain is to be taped out again on X Layer; until then the site says it has not been.

### Added

- Workshop layer: publish a design, a page per design, a gallery, a global board per level (every score re-run by the server), lineage of derived designs, and an optional X Layer record of a design sent from the player's wallet.
- Nine new workshop levels (21 in all), each with a reference design and par, and a first-steps guide on level 1.

## [0.1.0] - 2026-10-24

### Added

- Official 50-gate brain compiled to TapeOut bytes.
- Byte-for-byte netlist verification and exhaustive agreement on all 4,096 answers.
- Deterministic daily simulation, replay, lineage, season ledger and browser verification.
- Brain builder, versus mode, calibration exam and JSON API for agents.
- MIT licensed public source with CI, a Node 22 production build and a test suite currently at 160 passing tests.
