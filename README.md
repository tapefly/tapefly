# TapeFly

**A fruit fly whose brain is a circuit of NAND gates, and a game about designing a better one.**

Every UTC day, eight sibling flies wake up in one dish with the same brain: 50 NAND gates
that turn what a fly senses into what it does. Most of them do not see dusk. You can
write a better brain as a handful of rules, watch it compile to gates, and drop your fly
into the same dish.

Everything is a function of the date. Open any day on any machine and you get the same
day, byte for byte; your browser can rebuild it and check the hash.

```
npm install
npm run dev                               # the site on :3000
npm run replay  -- 2026-10-16 --check     # replay a day   → ✓ IDENTICAL
npm run lineage -- --check                # recompute the lineage ledger → ✓ IDENTICAL
npm run board   -- --show                 # score every brain on the board
npm run tapeout -- bytes                  # the brain as TapeOut bytes
```

## What you can do

| Page | What it is |
|---|---|
| `/` | Today's dish, playing live: eight flies, their standings, and the focused fly's mind on every tick, with the circuit lighting up as it decides. |
| `/play` | **Be the fly** first: steer one yourself, a key press per tick, beside the eight official flies (same physics, checked tick for tick against the engine). Then **Brain School**: eight levels on real dishes. Each starts with a brain that fails in a way you can watch, and has three goals. |
| `/build` | **The builder**: rules in, NAND gates out. Live gate count, depth, TapeOut cost, agreement with a reference fly, and your fly in today's dish or across the board's seven days. A brain is a link. |
| `/vs` | **Versus**: my fly against yours. Same dish, same body, shared food, seven rounds. A match is a link, so what you send is exactly what your friend sees; they answer by building their own fly. Shared links unfold into a card (`/api/og`). |
| `/me` | **My fly**: the fly you are raising. Its name (every brain hatches with one), practice or official, its last seven dishes, the season, its trophies, and what making it official takes. |
| `/board` | Brains people submitted, each scored over the last seven finished dishes. Entries come by pull request and CI recomputes every score. |
| `/fly/{name}?d=…` | One fly's whole day: route, decisions, body, parent, seal. |
| `/calibrate` | The exam: the official brain against a reference fly on all 4,096 situations, with every disagreement on a board you can click. |
| `/verify` | Paste a record; the hash chain is rebuilt in your browser. |
| `/lineage` | Every champion since 1 January, and how far the body has drifted. |
| `/tapeout` | The brain as 350 bytes in TapeOut's format, and the steps between it and the chain. |
| `/lab` | Set the senses by hand and watch the gates decide. |
| `/agents` | The JSON API and how outside agents take part. |

## How it works

```
date ─▶ seed ─▶ one dish ─▶ 8 bodies ─▶ senses (0..1000) ─▶ 12 bits ─▶ NAND gates ─▶ 3 bits ─▶ act
                                                                                         │
                                                         tick ─▶ SHA-256 ─▶ chain ─▶ seal ┘
```

- **The engine** (`sim/engine.ts`) is integer-only. A brain is any 12-in / 3-out NAND netlist. Each tick is hashed and chained to the one before.
- **The official brain** is `sim/ffw-nand-1.netlist.json`: 50 gates, 9 deep, checked against the eight rules in `sim/rules.ts` on all 4,096 inputs.
- **Player brains** are programs (`sim/program.ts`): ordered rules over sense levels and the last move.
  - `sim/compile.ts` compiles a program to NAND gates, trying three priority encodings and keeping the one with the lowest TapeOut cost. The tests prove the result equal to the program on all 4,096 inputs. The official rules compile to 48 gates.
- **Versus** (`sim/versus.ts`): two brains in one dish with shared food; one fly alone through it is tested to match the engine tick for tick.
- **Duels** (`sim/challenge.ts`): a challenger gets the day's founding body and the official dish, and is ranked against the eight flies. Ties go to the flies.
- **Brain School** (`sim/levels.ts`): every level has a stored three-star solution, and the tests check that solution earns all three stars and that the starting brain earns none.
- **The board** (`sim/board.ts`, `challengers/`): `npm run board -- --check` validates the entries and the index. Scores are always recomputed from the circuits.
- **Practice and official** (`sim/identity.ts`): an entry with a `tapeout` record (processor, circuit ID) is official once `npm run board -- --chain` has asked its circuit all 4,096 questions on chain; CI runs it.
- **Seasons** (`sim/seasons.ts`, `challengers/seasons.json`): a season is a Monday-to-Sunday week. When one ends it is written into a ledger and frozen; the best player's fly takes the trophy (house baselines never do), and `--check` recomputes every recorded season.
- **Lineage** (`sim/lineage.json`): each day's champion is tomorrow's founding body. The file is a committed ledger, advanced by a daily workflow and checked by recomputation.

## Getting on the board

1. Build a brain at `/build`.
2. Press **Enter it on the board** and save the file it gives you as `challengers/<your-github-handle>/<name>.json`.
3. Open a pull request.

CI validates the file and recomputes everything. Netlists work too, as JSON or as TapeOut hex.

## Honest state

- The brain is a tested netlist. It has **not been taped out**. `config/tapeout.json` says so, and the site reads that file.
- Once the circuit is on chain, `npm run tapeout -- verify --processor … --id …` asks the live circuit all 4,096 questions through the free `eval` call and compares the answers.
- The byte format follows public reverse-engineering notes and has not yet been exercised against the live contract.
- There is no token, no database and no account system.

## Commands

| | |
|---|---|
| `npm test` | engine, compiler, duels, versus, levels, manual mode, board, lineage, records |
| `npm run check` | typecheck, tests, ledger check, board check, bytes check, build |
| `npm run board [-- --check] [--show]` | rebuild / check the board index; print scores |
| `npm run tapeout -- bytes \| verify` | TapeOut bytes; on-chain check |
| `npm run replay -- YYYY-MM-DD [--check]` | one day; prove it replays identical |
| `npm run lineage [-- --check]` | extend / recompute the ledger |
| `npm run record` / `verify-record` | seal / check an agent record |

Deploying: `DEPLOY.md`. (The project was first called One Fly.) Design notes are in `docs/DESIGN.md`, and the plan and status are in `docs/PLAN.md`.

MIT.
