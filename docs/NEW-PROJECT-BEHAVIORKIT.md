# New Project — TapeFly BehaviorKit

**Status:** recorded, not started  
**Date:** 2026-10-24  
**Owner:** Richard  
**Working name:** TapeFly BehaviorKit  
**Relationship to TapeFly:** product extension and possible independent project

This memo records the project decision and the validation work required before
building it. It is not a public product claim.

## Decision

The next project should not be another game, another agent registry or a new
wallet standard.

The strongest adjacent opportunity is:

> **A verifiable behavior layer for game NPCs and AI agents.**

TapeFly already proves the mechanism with a playable fly. BehaviorKit should
turn that mechanism into developer tooling that game studios and agent platforms
can integrate.

## One-line pitch

> Design an NPC's rules, compile them into a deterministic circuit, test every
> possible input, run the behavior off-chain at game speed, and publish a
> verifiable identity for that behavior version.

## Why now

### Games are adding AI NPCs faster than they can verify them

LLMs improve expression, dialogue and planning, but they are probabilistic. Game
teams still need a stable layer for:

- combat reflexes
- threat and target selection
- spending limits
- resource allocation
- cooldowns
- prohibited actions
- permissions and policy

### Existing behavior systems are hard to audit

Behavior trees and state machines can be deterministic, but teams still lack a
portable object that combines:

- readable design rules;
- complete input testing;
- exact replay;
- version identity;
- optional on-chain proof.

### The standards ecosystem has components but not a consumer product

The 2026-10-24 TapeOut agent drafts describe identity, policy circuits,
verifiable jobs and credentials. None of those drafts is deployed, externally
audited or proven end to end. Building another standard now would add complexity
without distribution.

The immediate product opportunity is a developer tool that uses these ideas in a
narrow, useful workflow.

## Core thesis

An LLM can make an NPC expressive.

A verifiable behavior circuit can make its baseline behavior accountable.

```text
LLM / planner
    language, variation, long-term planning

Verifiable behavior layer
    reflexes, limits, threat response, budgets,
    cooldowns, permissions, prohibited actions

Result
    an NPC that can improvise
    without its bottom line silently changing
```

This is not intended to replace the LLM. It is the layer below it.

## Target users

### First target

- indie game studios;
- simulation and strategy games;
- auto-battlers and tower-defense games;
- Web3 games;
- UGC game platforms.

### Second target

- AI-agent wallet and custody providers;
- agent marketplaces;
- x402 and paid API services;
- agent platforms that need enforceable limits and replayable receipts.

### Not an initial target

- AAA open-world NPC systems;
- natural-language gameplay;
- visual perception;
- long-term memory and planning;
- full robotics control.

## Product object

The repeatable product object is a **Behavior Card**:

| Field | Meaning |
| --- | --- |
| Name and version | Human-readable behavior identity |
| Inputs and outputs | Explicit behavior interface |
| Rule source | Readable rules used by designers |
| Compiled circuit | Deterministic NAND/LATCH netlist |
| Test report | Complete input-space verification |
| Replay fixture | Known seed and trace for debugging |
| Owner and license | Who may use the behavior |
| Version hash | Exact behavior identity |
| Optional proof anchor | External verification of the version |

The Behavior Card lets designers, engineers, QA, players and verifiers discuss
one artifact.

## Minimum viable product

### 1. Rule editor

A designer edits instincts, ordered rules or a compact state machine.

### 2. Compiler

The compiler lowers rules into a deterministic circuit with a defined interface
and stable hash.

### 3. Exhaustive tester

For small behavior domains, test every input. For larger domains, use a
reproducible vector suite plus bounded exhaustive regions.

### 4. Replay debugger

Enter a seed or exact input and reproduce every decision:

- rule that fired;
- gate outputs;
- state transitions;
- branch taken.

### 5. Runtime SDK

The runtime stays off-chain and executes at native game speed.

First adapters:

- TypeScript / Node;
- Godot;
- Unity, after the first pilot.

### 6. Optional version proof

Anchor the behavior hash and release metadata on X Layer. Never put every NPC
tick on chain.

### 7. One real integration

The first pilot should be a named NPC in a real game, not another standalone
demo.

## Initial NPC modules

Start narrow. Build five reusable modules:

1. **Merchant**
   - trust, price, inventory, time of day, refusal and fraud checks.
2. **Guard**
   - intruder, threat, alarm, opening a gate and escalating force.
3. **Boss**
   - phase transitions, cooldowns and response to player behavior.
4. **Pet or companion**
   - follow, flee, forage, protect and return.
5. **Auto-battle unit**
   - target selection, resource spending and retreat.

These are finite, testable and easy to explain.

## Differentiation

| Conventional game AI | TapeFly BehaviorKit |
| --- | --- |
| Rules live inside an engine-specific codebase | Rules compile to a portable artifact |
| Tests cover selected scenarios | Small spaces can be checked exhaustively |
| Bug reports are hard to reproduce | Exact seed and trace replay |
| AI behavior changes silently after an update | Version hash and optional proof |
| Player-made behavior is trusted or blocked | Submitted behavior can be tested before admission |
| LLM handles both expression and rules | LLM handles expression; circuits handle guarantees |

## What this is not

- Not a general AI NPC platform.
- Not an LLM replacement.
- Not a new chain.
- Not a new agent registry.
- Not a new wallet or permission standard.
- Not a requirement that games put every decision on chain.
- Not evidence that studios will pay until pilots are complete.

## Business model hypotheses

### Open core

- compiler and local SDK are open source;
- local testing is free;
- paid products handle collaboration, CI, hosting and verification.

### Possible pricing

| Tier | Hypothesis |
| --- | --- |
| Free | One behavior, local test, open-source runtime |
| Studio | Multi-behavior workspace and CI |
| Team | Engine integrations, roles, review and hosted replay |
| Enterprise | Private deployment, audit support and custom modules |

Pricing must be validated through studio interviews.

### Other paths

- verified behavior marketplace;
- paid NPC module development;
- UGC behavior review;
- sponsor leagues and competitions;
- X Layer proof and archive services;
- agent-behavior verification.

## Go-to-market

### Phase 1 — design partners

- Interview five small game teams.
- Integrate one NPC in one game.
- Measure integration time and bugs discovered.

### Phase 2 — developer proof

- Publish TypeScript SDK and one engine adapter.
- Show a 30-second workflow:
  change a rule → run all tests → replay a failure → publish a Behavior Card.

### Phase 3 — public launch

- Launch five templates.
- Publish the first external Behavior Card.
- Offer a paid team pilot.

### Phase 4 — network

- Allow studios to publish and license verified modules.
- Add competitions and non-transferable credentials.
- Explore agent integrations.

## 30-day validation plan

### Week 1

Interview five teams. Ask:

1. How are NPC decisions implemented today?
2. What NPC bugs are most expensive?
3. Can the team reproduce them exactly?
4. What would automatic exhaustive testing and replay be worth?

### Week 2

Build a read-only prototype around one actual NPC behavior. Do not add accounts,
payments or chain deployment.

### Week 3

Integrate with one game or simulation environment. Record:

- time to integrate;
- behavior mismatches found;
- debugging time saved;
- whether designers understand the rules.

### Week 4

Ask for a paid pilot. A verbal compliment is not validation.

## Decision gates

Continue only if at least three of these are true:

- a team gives a real NPC and data;
- integration takes days, not months;
- the tool finds a mismatch normal tests missed;
- a designer prefers the workflow to the current behavior tree;
- a team commits to a paid pilot;
- replay materially reduces debugging time.

Stop or narrow if:

- teams say deterministic behavior is already solved;
- integration requires rewriting their game loop;
- the tool only demonstrates toy NPCs;
- no one will share a real behavior;
- the chain proof is interesting but irrelevant to purchase.

## Six-month roadmap

### Month 1–2

- one engine adapter;
- five NPC templates;
- compiler/test/replay workflow;
- one design partner.

### Month 3–4

- hosted Behavior Cards;
- CI integration;
- behavior diff between versions;
- optional X Layer anchor;
- second design partner.

### Month 5–6

- paid pilot;
- public SDK;
- first external module;
- usage metrics and pricing validation.

## North-star targets

These are goals, not current metrics.

### 12 months

- 10 external game or agent integrations;
- 100 verified public behavior modules;
- 1,000,000 replayable NPC decisions.

### Five years

- 1,000 games and AI products using verifiable behavior;
- 100,000 NPCs and agents carrying a behavior core;
- 10,000 independent behavior designers;
- 1 billion decisions per day computed off-chain and batch-verified.

## Relationship to the TapeOut agent drafts

Use the drafts as infrastructure, not as the product.

- **Agent Passport:** useful later for wallet, identity and tool verification.
- **Policy Circuit Gate:** useful for agent spending and permission workflows.
- **Circuit Jobs:** too early; lacks deployed contracts, Solidity reference and
  settled dispute economics.

Do not build another registry, wallet, job escrow or generic agent standard.

## Risks

| Risk | Mitigation |
| --- | --- |
| Studios do not pay for verification | Sell debugging, CI and UGC safety instead of chain language |
| Engine integration is too hard | Start with one adapter and one NPC |
| Existing behavior trees are good enough | Compete on exact replay, version proof and cross-title portability |
| Circuits are too small | Start with reflexes and limits; add memory and composition later |
| AI NPC narrative is mostly hype | Keep the product useful without calling it AI |
| Chain requirements deter studios | Make chain proof optional |
| The market is early | Validate with design partners before scaling |

## Immediate next action

Do not start with a token, chain deployment or new standard.

Start with:

1. one game studio;
2. one named NPC;
3. one behavior rule set;
4. one exhaustive test;
5. one replayable production-like bug.

The first real artifact should be a before-and-after case study showing that a
real NPC problem was reproduced and fixed faster with BehaviorKit.
