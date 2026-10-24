# Plan and status

The goal: the TapeOut project people actually play. Ranked by what matters most.

## The core loop

Watch today's dish → see the official brain fail → learn in Brain School → build a better
brain → put it on the board → tape it out.

Every step is checkable from the date alone. Nothing is a bet on an outcome: every day,
including future ones, is computable, so play is about **design**, not prediction.

## Done

| Area | What |
|---|---|
| Engine | A pluggable brain in `simulate()`. The official goldens are unchanged. |
| Programs | Rule programs, validation, and a URL codec (`p1.` + base64url, 27 bits per rule). |
| Compiler | Program → NAND, with structural hashing, constant folding and dead-gate removal. Three encodings are tried and the lowest-cost one is kept. Equivalence is tested on 4,096 words, for the official program and 60 random ones. |
| Duels | A challenger in the official dish with the founding body, ranked among nine. There is a seven-day week score, and clutches are memoised per date. |
| Exam | Any netlist against FLY-LIF/0, giving agreement and Giant Fibre recall and precision. |
| Versus | `/vs`: two flies, one dish, shared food, seven rounds; a match is a link. Practice against house brains, send a challenge, answer from the builder. |
| Be the fly | `/play` opens with a manual mode: a key press per tick, on a dish where all eight official flies died. `tests/manual.test.ts` drives it with the official flies' moves and checks every tick against the engine. |
| Brain School | Eight levels: Hungry, The trap, The stand-off, Jump!, Fifty gates, Think like a fly, One brain seven days, Beat the clutch. Each has a tested three-star solution. |
| Board | Entries in `challengers/<handle>/`, three house baselines, the `board` script with `--check`, `/board`, and `/api/v1/board`. |
| TapeOut | The 350 bytes with their SHA-256 in config, `npm run tapeout -- bytes`, a `verify` that asks the live circuit 4,096 questions through eval, `/tapeout`, and `/api/v1/tapeout`. |
| Site | A new visual system (`docs/DESIGN.md`) and new pages for `/`, `/build`, `/play`, `/board` and `/fly`. The proof pages are restyled. The layout is checked at 1440 and 390 px. |
| CI | Board check, bytes check, and a ledger check that no longer depends on the CI date. |

## Make it fun: raise a fly, not a circuit (decided 2026-10-20)

"Play = draw a circuit, tape out = mint an NFT" is right underneath, but nobody comes to own a
circuit. People come for a fly of their own that lives or dies. So the surface becomes
**raise a fly → make it official → win**, with the same machinery below.

1. **Versus.** One link: my fly against yours, same dish, same body, shared food, seven rounds.
   Done: `sim/versus.ts` (one fly alone is tested to match the engine tick for tick), the `/vs`
   page, "Challenge a friend" in the builder, and "Answering …" when you arrive from a challenge.
2. **Name your fly; practice vs official.** Done: every brain hatches with a name from its own
   code; `/me` shows your fly, its status, its week and what going official takes. Board entries
   carry an optional `tapeout` record and are marked official once CI has checked the circuit on
   chain (`npm run board -- --chain`). Still to come: a separate official dish.
3. **Tape out = go official.** One button, the player's own wallet; the brain is fixed for good.
4. **Season trophies.** Done: Monday-to-Sunday seasons from 2026-10-12, frozen into
   `challengers/seasons.json` by the daily workflow and recomputed by `--check`; trophies show on
   the board and on `/me`. House baselines rank but never take a trophy.
5. **A simpler first visit.** Done: the home page opens on the goal ("Teach a fly to survive the
   day") and one next step read from what this browser has done (new, steered, part-way through
   Brain School, or has a fly); the gate-by-gate view folds under "Advanced". Level 1 has a coach
   (one click on approach earns all three stars, and a test keeps that true). The builder shows
   only the brain's size until "Advanced" is opened. The nav's button is "Play".

## The economic model (draft)

- **Brain NFT** — the player's taped-out circuit. Theirs; no revenue share, ever.
- **A TapeFly processor** — our own transistor factory on TapeOut. Players tape out with our
  transistors; the sale is our revenue. Only after there are real players.
- **A FLY token via TapeFour** — later. Mined only by brains that place well in a season, never by
  holding. Spent (and burned) on new levels, new dishes and votes on new rules.
- Red lines: no pay-for-holding, no team allocation, no price talk.
- To ask TapeOut: the processor creator's share of transistor sales; whether a TapeFour project
  can define its own mining rule; whether "fly survival" can join the PoD task bank (today our
  brain is not one of the 267 tasks, so it could only reach the 1% pool).

## Waiting on the owner

- Push to GitHub (install the Claude GitHub App on the org, or push the bundle).
- Deploy (Vercel).
- Tape out FFW-NAND/1 from the owner's wallet.
- Confirm on the official PoD page what a failed counterexample review costs: the premium, or
  the miner.

## Proposal to TapeOut: the fly's reflex as a PoD task

PoD tasks are "a fixed function and a reference circuit; design a cheaper equivalent". So what
we can propose is not "fly survival" (an objective) but the fly's 12-in / 3-out reflex function.
Drafts are ready in `docs/tap/`: `IDEA-ISSUE.md` (step 1: an Idea issue on
TapeOutProtocol/TAPs), `TAP-draft-fly-reflex-pod-task.md` (step 2: the draft PR, after feedback)
and the 4,096-entry truth table. `tests/tap.test.ts` keeps every number in them true.
The owner posts them from their GitHub account.

## Proposed, not yet decided

- Mine BEM with our compiler: first, free — compile a few of the 267 tasks and compare against
  today's best-first costs.
- Offer the TapeOut learning game to the ecosystem as a tutorial or for a grant.
- Badges for TapeCode, TapeUP and TapeAI holders who take the fly-brain challenge.

## Engineering backlog, in order

1. **Tape out FFW-NAND/1.**
   - Buy 50 NAND, call `tapeout(bytes, 12, 3)`, and record the id in `config/tapeout.json`.
   - Run `npm run tapeout -- verify`.
   - Flip the site to "live" and add per-tick spot checks on `/fly` through eval.
   - Cost: a few dollars of transistors. Needs a wallet: the owner does this, and keys never enter the repo.
2. **Seasons on the board.** Freeze a week each Monday as a season record, kept in a committed file like the ledger. Past seasons keep their winners.
3. **Tape out the board's best brain each season.** The winning circuit gets taped out and becomes callable on chain, alongside the official one.
4. **A smarter compiler.** Add two-level minimisation per output (Quine–McCluskey on 12 inputs) before factoring. The goal is to beat 48 gates and depth 10 for the official rules.
5. **Share cards.** Add an OG image per builder link: the brain's gates, its place today and its week.
6. **A predator, from the Fruit Fly World game.** Add a predator that commits to a lunge, so the escape jump bit decides life and death. This needs a new engine version from a cut-over date, with every earlier day's hash unchanged. The other borrowing, "drive it yourself" before the builder, is done (`/play`, `sim/manual.ts`). The old game itself is not ported: it tests reflexes, its brain is not NAND gates, and its world rules differ.
7. **More levels.** Light and dark, memory through the last move, and a "smallest brain that survives the week" leaderboard.

## Not doing

- No token, no betting on flies, no rewards for playing.
- No accounts or database. Progress lives in the browser; entries live in git.

## 2026-10-21 · Simpler, more TapeOut

- Main menu: Play (four instinct switches, solo dish), Race, Champions, Brain editor, On TapeOut, Docs. Corner: /proof.
- /tapeout has a working tape-out panel: connect wallet, buy NAND, simulate then tape out, verify all 4,096 answers via multicall (sim/onchain.ts).
- eval inputs are now packed bit-wise (bit 0 of byte 0 = first pin), per the public format notes; the old one-byte-per-bit guess is kept as evalInputBytesPerBit.
- /tapeout/processor creates the TapeFly processor from the operator's wallet (factory createCPU). After it exists, put its address in config/tapeout.json → tapeflyProcessor.
- Open: read on chain where NAND sale money goes for a factory processor before announcing it; first verified tape-out; champion prize.

## 2026-10-21 · Chinese by default

- Every page is bilingual. Chinese is the default; the EN / 中文 button in the nav sets a `tapefly.lang` cookie (app/i18n). Server pages use `serverT()`, client components `useLang()`.
- Lesson text lives in app/play/levels-zh.ts. Not translated yet: share-card images (/api/og need a CJK font), the official rule sentences from sim/rules shown on /calibrate, and API JSON.
- /docs rewritten to 15 sections, opening with "Why now" (fly connectomes 2024 and Sep 2026; CZ's "immortal fruit flies" post of 15 Sep 2026) and "Immortal flies: how TapeFly does it". States plainly that TapeFly is not affiliated with or endorsed by CZ, Binance, YZi Labs or TapeOut.

## 2026-10-21 · Memory on BNB Chain

- sim/anchor.ts: the lineage head folds every day from the epoch (each champion's body, life and sealed step hash) into one hash. An anchor is a zero-value self-send on BNB Chain whose data is `TAPEFLY-ANCHOR/1 <date> <head>`.
- anchors/anchors.json records them; `npm run anchor -- --check` recomputes every head (part of `npm run check`), `--chain` also reads the transactions.
- Two ways to anchor: /lineage/anchor from the operator's wallet (prints the entry to add), or the daily workflow if the ANCHOR_PRIVATE_KEY repository secret is set.
- /lineage shows the anchors with an in-browser "check on chain"; /docs counts it as the fifth point of "immortal".

## 2026-10-21 · Economic model v2 (decided, not built)

Genesis fly NFT → mining points → token, in three stages. Supersedes "no token for now".
1. Genesis flies: 2,026, about 0.02–0.03 BNB each (NAND priced ~0.0015 BNB on the TapeFly processor); each with a random body genome; adopt = design brain → buy NAND → tape out → certificate page.
2. Points: daily survival and meals, weekly season ranks, fewer-gates bonus; public and replayable; not tradable.
3. Token: points convert at launch; sinks = breeding (new NFT), brain upgrades, special tournaments.
Rules: say "play to earn points", never yields, prices or dividends. /docs, FAQ and the promo pack still say "no token" and must change before the sale.
Full write-up: the TapeFly dev doc, section "经济模型 v2".
