---
tap: TBD
title: Fly reflex PoD task
description: A 12-input, 3-output PoD task whose function is the reflex brain of a fruit fly used daily by a public game.
author: <Name (@github-handle)>
discussions-to: <URL of the Idea issue>
status: Draft
type: Application
created: 2026-10-20
requires: TAP-02
license: CC0-1.0
---

# TAP-TBD: Fly reflex PoD task

## Summary

This adds a mining task in which people design the smallest circuit that makes a simulated fruit fly decide exactly as it does today.

## Abstract

This TAP defines a Proof of Design task named `FLY-REFLEX-12x3`. Its function maps 12 input bits
(five senses at four levels each, and the previous move) to 3 output bits (a move and an escape
jump). The function is given as seven ordered rules and as a 4,096-entry truth table. The TAP
also gives a 50-NAND reference implementation with its exact bytes. The task is combinational and
small enough that every submission can be checked on the whole input space.

## Motivation

PoD rewards cheaper circuits for a fixed function. This task's function is not chosen for the
task: it is the decision circuit of **TapeFly**, a public game in which a fruit fly lives
one deterministic day per UTC date and anyone can replay any day from the date alone. A better
design for this task is, by construction, a cheaper brain for the same fly.

The task is also easy to verify. Spot checks at mining time sample 3 to 32 vectors. A public
audit announced on 2026-09-01 reported 80 of 534 best-first slots that passed those samples but
disagreed with their references elsewhere. With 4,096 possible inputs, a full check of this task
is a few thousand read-only calls, so a wrong circuit cannot pass unnoticed.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they appear in all capitals.

### Interface

- A circuit for this task MUST have exactly 12 inputs and 3 outputs.
- A circuit for this task MUST be combinational. It MUST NOT contain LATCH components, and its
  outputs MUST depend only on the current inputs.
- Input pin `i` (0 ≤ `i` ≤ 11) carries bit `i` of the input word `w`. Output pin `j`
  (0 ≤ `j` ≤ 2) carries bit `j` of the output word `y`.
- Signal numbering, evaluation and bit packing are those of TAP-02 (§2, §4, §5): input `i` is
  signal `2 + i`, the outputs are the last 3 signals, and a word is packed least significant bit
  first. With this packing, `eval(id, inputs)` takes `w` as 2 bytes, `w & 0xff` then `w >> 8`, and
  returns `y` as 1 byte.

### Fields of the input word

| Bits | Field | Values |
|---|---|---|
| 0–1 | `f`, food | 0..3 |
| 2–3 | `t`, threat | 0..3 |
| 4–5 | `l`, light | 0..3 |
| 6–7 | `n`, novelty | 0..3 |
| 8–9 | `h`, hunger | 0..3 |
| 10–11 | `p`, previous move | 0 approach, 1 avoid, 2 explore, 3 freeze |

Each field is read as an unsigned integer with its lower-numbered bit as the least significant
bit: `f = w & 3`, `t = (w >> 2) & 3`, and so on.

### Output word

`y = m | (g << 2)`, where `m` (bits 0–1) is the move (0 approach, 1 avoid, 2 explore,
3 freeze) and `g` (bit 2) is 1 when the escape jump fires.

### The function

The rules are applied in order; the first that matches determines `y`.

| # | Condition | `y` |
|---|---|---|
| 1 | `t ≥ 2` | 5 (avoid, jump) |
| 2 | `t ≥ 1` and (`p = 1` or `h < 2`) | 1 (avoid) |
| 3 | `h ≥ 3` and `f ≥ 1` | 0 (approach) |
| 4 | `f ≥ 3` | 0 (approach) |
| 5 | `p = 0` and `f ≥ 2` | 0 (approach) |
| 6 | `n ≥ 2` | 2 (explore) |
| 7 | `p = 3` and `h < 3` | 3 (freeze) |
| 8 | otherwise, `l ≥ 1` | 2 (explore) |
| 9 | otherwise | 3 (freeze) |

A circuit MUST produce this `y` for every one of the 4,096 input words.

### Truth table

The function is equivalently the string `T` of 4,096 characters in which character `w` is the
octal digit of `y` for input `w`, followed by no separator. Implementations MUST agree with `T`.

- SHA-256 of `T` (ASCII, without a trailing newline):
  `94ec2e39868755edaf065796cc849830e4551c65a9af816a09ea906172bde3cd`
- Output counts over all inputs: `y = 0`: 640, `1`: 640, `2`: 600, `3`: 168, `5`: 2,048.
  The values 4, 6 and 7 never occur.

### Reference implementation circuit

The reference circuit is the netlist `FFW-NAND/1`:

- 50 NAND gates, no LATCH; depth 9; design cost `A · d³ = 50 · 9³ = 36,450`.
- TapeOut bytes (TAP-02 §2): 350 bytes, 50 NAND records of 7 bytes. The bytes are given in
  full in `assets/tap-draft-fly-reflex-pod-task/ffw-nand-1.hex`.
- SHA-256 of the 350 bytes:
  `a763117011fe4c4be7106d9b0d2c78fe79b81c15ccc2a6531c9263b4f443d4dd`.

### Task parameters

The task is described by the fields that the PoD mining contract's `getTask(uint32)` returns
(names as in TAP-draft-pod-attributes §3.6):

| Field | Value |
|---|---|
| `kind` | combinational |
| `nIn`, `nOut` | 12, 3 |
| `vectorCount` | 4,096: every input word (see Verification) |
| `name` | `fly reflex 12x3` |
| `refArea` (K_task) | 50: the reference burns 50 NAND and no LATCH, so b* = 50 + λ_burn · 0 |
| `refCost` (C_ref) | 36,450: A · max(d, 1)^β with A = 50 + λ · 0 = 50, d = 9, β = 3 |
| `refCircuits`, `refCircuitId` | the processor and circuit id under which the reference circuit is taped out (Deployments) |

`refArea` and `refCost` above use λ = 6, β = 3 and λ_burn = 1, the parameters read at BNB Smart
Chain block 128200681 (TAP-draft-pod-attributes, Test Cases). If the task is created under other
parameters, the creator recomputes them from the same formula.

### Verification

- A start check for this task SHOULD draw its vectors from `T`.
- Because the input space has 4,096 words, a counterexample review for this task MAY evaluate a
  submission on every input. A single word `w` for which the submission's output differs from
  `T[w]` is a complete counterexample.

## Rationale

- **Why a function and not a score.** PoD compares submissions by equivalence to a reference
  and then by design cost. "Survives the longest in the game" is an objective, not a function,
  so it cannot be checked by equivalence. The game's decision function can.
- **Why this size.** 12 inputs keep the whole table at 4,096 entries. That is small enough for a
  full check, but the reference still needs 50 gates and leaves real trade-offs between area and
  depth. The proposers' own compiler finds 48 gates at depth 10, which costs 48,000: fewer gates,
  but a higher cost than the reference.
- **Fairness.** Before the task opens, the proposers will publish every design they know of,
  including the 48-gate variant and the compiler that produced it. Nobody should start ahead
  because they wrote the task.
- **Alternatives considered.** A version with LATCH memory (the previous move held inside the
  circuit) was considered and left for a later TAP: it changes the interface and needs
  sequential test vectors.

## Backwards Compatibility

None. This TAP adds one task; it changes no existing task, contract or format.

## Test Cases

Selected vectors (inputs as 12-bit binary, bit 11 first):

| `w` | Binary | `y` | Rule |
|---|---|---|---|
| 0 | 000000000000 | 3 | 9 |
| 3 | 000000000011 | 0 | 4 |
| 4 | 000000000100 | 1 | 2 |
| 8 | 000000001000 | 5 | 1 |
| 192 | 000011000000 | 2 | 6 |
| 784 | 001100010000 | 2 | 8 |
| 3072 | 110000000000 | 3 | 7 |
| 4095 | 111111111111 | 5 | 1 |

The complete table `T` is in `assets/tap-draft-fly-reflex-pod-task/fly-reflex-truth-table.txt`.
Its content without the final newline MUST hash to the SHA-256 above.

## Reference Implementation

`assets/tap-draft-fly-reflex-pod-task/check.py` (MIT, no dependencies) decodes the reference
bytes, evaluates them on all 4,096 words under TAP-02 §4, compares every answer with `T`, and
prints both SHA-256 values and the design cost. Expected output:

```
gates 50 depth 9 cost 36450
bytes sha256 a763117011fe4c4be7106d9b0d2c78fe79b81c15ccc2a6531c9263b4f443d4dd
table sha256 94ec2e39868755edaf065796cc849830e4551c65a9af816a09ea906172bde3cd
mismatches 0 []
```

Background only (not normative): the game that runs this function, its rule compiler and its
own tests are in the TapeFly source.

## Deployments

None yet. The reference circuit has not been taped out. Existing tasks keep their reference
circuits on one processor contract (`0xF4412C52ec3DDf7CAf5f518B6662F77B02Bde28E`, per
TAP-draft-pod-attributes); the task creator is expected to tape the reference out there. This
section will then give the circuit id and how to verify read-only that `netlist(id)` returns the
350 bytes above and that `circuitInfo(id)` returns `(12, 3, 0, 50)`.

## Security Considerations

- **Wrong circuits.** Every submission can be checked on all 4,096 inputs, so a circuit that is
  right only on sampled vectors cannot stay hidden if anyone runs the full check.
- **Insider advantage.** The proposers know the function best. Publishing all known designs
  before the task opens removes most of that advantage; it cannot rule out a better design the
  proposers find later, which is the same position as any other miner.
- **Reference quality.** A deliberately weak reference would inflate the design premium of the
  first improvements. The reference given here is the circuit the game has used since launch,
  and its cost is stated so that reviewers can judge it.
- **Scope.** This TAP does not change PoD rules, emission or any contract. It only proposes
  one task.
- **Who can create tasks.** The PoD mining contract reports itself sealed (`isSealed()` true,
  owner the zero address, since block 121815032; TAP-draft-pod-attributes, Deployments). This
  TAP does not know whether task creation is still possible after the seal, or by whom. If it is
  not, this text specifies the task for whichever contract or version can host it.

## Copyright

Copyright and related rights waived via [CC0](../LICENSE).
