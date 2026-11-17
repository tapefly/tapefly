---
tap: TBD
title: Circuit Brain Interface
description: A manifest that says what a behaviour circuit's input and output bits mean, so one taped-out brain can be loaded, checked and compared by any application.
author: <Name (@github-handle)>
discussions-to: <URL of the Idea issue>
status: Draft
type: Application
created: 2026-11-03
requires: TAP-02
license: CC0-1.0
---

# TAP-TBD: Circuit Brain Interface

## Summary

A small JSON manifest that travels with a behaviour circuit and says what each input bit and output bit means, so a brain taped out for one application can be loaded, checked and fought in another.

## Abstract

Several TapeOut applications use a combinational circuit as the decision layer of an agent: a
game character, a fighting unit, a spending guard. Each defines its own meaning for the input
and output pins, so a circuit taped out for one application is opaque to every other. This TAP
defines a **Circuit Brain Interface (CBI) manifest**: the circuit's location, the meaning of
every input and output field, an optional state section for LATCH components, and hashes that
let anyone check the manifest against the circuit. It also defines **profiles**: named,
versioned field layouts that applications can declare they support. A brain that declares a
profile can be loaded by any application that supports that profile, with no per-pair glue.
The first two profiles, `FLY-12x3/1` (foraging) and `DUEL-12x3/1` (fighting), are the layouts used by TapeFly. This TAP adds no contract and
changes no format; it is a convention on top of TAP-02.

## Motivation

- **Brains are stuck inside one application.** Today a circuit's pins mean whatever its
  author's code says. An arena, a leaderboard or a second game cannot load it without reading
  that code. A shared description makes a taped-out brain a portable asset.
- **Comparisons need the same interface.** "This 24-gate brain beats that 50-gate brain" only
  means something when both read the same senses and drive the same actions. A profile names
  that interface, so two brains are comparable exactly when they declare the same profile.
- **Agents need to know what they submit.** An AI agent that designs a brain needs a machine
  readable statement of the inputs and outputs; prose in a README is not enough.
- **Checking stays cheap.** For profiles with at most 16 input bits the whole function is a
  table of at most 65,536 outputs, so a manifest can carry the table's hash and anyone can
  check a circuit against it with read-only `eval` calls.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT",
"RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted
as described in RFC 2119 and RFC 8174 when, and only when, they appear in all capitals.

### Manifest

A manifest is a UTF-8 JSON object with these members.

| Member | Required | Meaning |
|---|---|---|
| `cbi` | REQUIRED | The string `"1"`. |
| `profile` | REQUIRED | A profile id such as `"FLY-12x3/1"`, or `"custom"`. |
| `nIn`, `nOut` | REQUIRED | Input and output pin counts. MUST equal the circuit's (TAP-02). |
| `inputs` | REQUIRED for `custom` | Ordered list of input fields (below). For a named profile it MUST be omitted or equal to the profile's. |
| `outputs` | REQUIRED for `custom` | Ordered list of output fields (below), same rule. |
| `state` | OPTIONAL | LATCH-backed state the circuit keeps between calls (below). |
| `circuit` | OPTIONAL | Where it is taped out: `{ "chainId", "processor", "id" }`. |
| `bytesSha256` | REQUIRED | SHA-256 of the circuit's TAP-02 bytes. |
| `tableSha256` | REQUIRED when combinational and `nIn` ≤ 16 | SHA-256 of the truth-table string (below). |
| `gates`, `latches`, `depth` | RECOMMENDED | Component counts and logic depth, for comparison. |
| `name`, `author`, `source` | OPTIONAL | Labels and a link to the source (for example rules that compile to the circuit). |

A **field** is `{ "name", "lo", "bits", "values" }`: the field occupies input (or output) bits
`lo` to `lo + bits − 1`, read as an unsigned integer with bit `lo` least significant. `values`
is an array of `2^bits` short labels, one per integer value, or the string `"level"` meaning the
values are ordered levels `0` (least) to `2^bits − 1` (most). Fields MUST NOT overlap and MUST
together cover every pin.

`state` is `{ "latches": n, "reset": "zero" }`: the circuit holds `n` LATCH components that the
application MUST start at zero for each new episode. A circuit with state is checked by
replaying recorded episodes (see Verification), not by a truth table.

### Truth-table string

For a combinational circuit, the truth table is the ASCII string of `2^nIn` characters in which
character `w` is the hexadecimal digit (lower case, `nOut` ≤ 4) of the output word for input word
`w`, with no separator and no trailing newline. Words are packed as in TAP-02 §5. For `nOut` ≤ 3
this is the same string as the octal table of the fly reflex PoD task draft.

### Profiles

A profile is a manifest's `inputs`, `outputs` and `state` fixed under an id `NAME/version`. A
profile MUST NOT change once published; a change is a new version. Profiles are listed in this
TAP's registry table below and may be added by later TAPs or by pull request to that table.

**Profile `FLY-12x3/1`** (TapeFly). Combinational, `nIn = 12`, `nOut = 3`, no state.

| Input bits | Field | Values |
|---|---|---|
| 0–1 | `food` | level |
| 2–3 | `threat` | level |
| 4–5 | `light` | level |
| 6–7 | `novelty` | level |
| 8–9 | `hunger` | level |
| 10–11 | `prev` | approach, avoid, explore, freeze |

| Output bits | Field | Values |
|---|---|---|
| 0–1 | `move` | approach, avoid, explore, freeze |
| 2 | `escape` | no, yes |

The `prev` input carries the previous `move` output: the application feeds it back, so the
circuit needs no LATCH.

**Profile `DUEL-12x3/1`** (TapeFly Brain Brawl, one fly against another). Combinational,
`nIn = 12`, `nOut = 3`, no state. Same pin count as `FLY-12x3/1`, different meaning, which is
exactly why the manifest names the profile: the same circuit means different things in each.

| Input bits | Field | Values |
|---|---|---|
| 0–1 | `dist` | far, mid, near, in reach |
| 2–3 | `foe` | moving, guarding (its shield faces me), winding up, open |
| 4–5 | `myhp` | level |
| 6–7 | `foehp` | level |
| 8–9 | `energy` | level |
| 10–11 | `prev` | press, back, circle, guard |

| Output bits | Field | Values |
|---|---|---|
| 0–1 | `move` | press, back, circle, guard |
| 2 | `bite` | no, yes |

The application reads the senses with a delay of a few ticks (a reaction time) and feeds `prev`
back. A shield seen from the side is reported as `open`, so a brain can learn to flank.

| Profile | Inputs → outputs | State | Used by |
|---|---|---|---|
| `FLY-12x3/1` | 12 → 3 | none | TapeFly (daily dish, versus) |
| `DUEL-12x3/1` | 12 → 3 | none | TapeFly (Brain Brawl) |

### Applications

- An application that **supports** a profile MUST accept any circuit whose manifest declares
  that profile and whose bytes match `bytesSha256`, and MUST drive it only through the
  declared fields.
- An application MAY support a profile through an **adapter**: code that maps its own world to
  the profile's fields. An adapter that is used to rank or reward brains MUST be published, so
  others can confirm it gives every brain the same inputs.
- An application that ranks brains SHOULD rank them within one profile, and SHOULD break a full
  tie in favour of the smaller design (fewer gates, then lower `A · d³`), in the spirit of
  Proof of Design, which rewards the smaller circuit for the same function.

### Verification

- **Combinational:** compute the truth table by calling `eval(id, w)` for every `w`, or by
  evaluating the TAP-02 bytes locally, and compare its SHA-256 with `tableSha256`. One differing
  word is a complete counterexample.
- **With state:** the application SHOULD publish episode records (inputs fed, outputs returned,
  in order, from the zero state) so that anyone can replay them against the circuit.

## Rationale

- **A manifest, not fixed pins.** Applications differ in what their agents sense and do; one
  fixed layout would fit none of them. Profiles give the benefit of a fixed layout where people
  want to share one, and `custom` covers the rest.
- **Levels, not raw numbers.** A circuit sees a few bits per sense. Saying "level 0..3" keeps the
  meaning (more food, more threat) without fixing each application's thresholds.
- **Hashes in the manifest.** Without them a manifest is a claim. With `bytesSha256` and
  `tableSha256` it can be checked against the chain by anyone, with free calls.
- **16 input bits as the table limit.** 65,536 `eval` calls is still practical for one checker;
  beyond that, records and sampling are the honest option and the manifest says so by omitting
  the table.

## Backwards Compatibility

None. This TAP defines a JSON document and naming rules. TAP-02 bytes, `tapeout`, `eval` and
existing circuits are unchanged; any existing circuit can be described by a `custom` manifest.

## Test Cases

TapeFly's official brain on X Layer:

```json
{
  "cbi": "1",
  "profile": "FLY-12x3/1",
  "nIn": 12,
  "nOut": 3,
  "circuit": { "chainId": 196, "processor": "0x99081e1D0CE916Cd5b2c53e769DFC3B000BFE9A4", "id": "2" },
  "bytesSha256": "a763117011fe4c4be7106d9b0d2c78fe79b81c15ccc2a6531c9263b4f443d4dd",
  "tableSha256": "94ec2e39868755edaf065796cc849830e4551c65a9af816a09ea906172bde3cd",
  "gates": 50, "latches": 0, "depth": 9,
  "name": "FFW-NAND/1"
}
```

A Brain Brawl fighter example (an interface example, not a deployment claim):

```json
{
  "cbi": "1",
  "profile": "DUEL-12x3/1",
  "nIn": 12,
  "nOut": 3,
  "bytesSha256": "2525399f1938cb3be99e438f3099b58868e12d18a5478e7c962a0b5b1a9eff8c",
  "tableSha256": "cbb94ef44c8fd77a816a0b0f9e875a3f8c03d28d971827a06271d73ed3ca0e8c",
  "gates": 20, "latches": 0, "depth": 7,
  "source": "https://tapefly.xyz/brawl?c=block,punish,bite"
}
```

The two circuits have the same pin counts but declare different profiles, so an application can
tell that the first forages and the second fights, and will not compare them with each other.

## Reference Implementation

TapeFly (MIT): `sim/encode.ts` (the profile's packing), `sim/compile.ts` (rules → TAP-02 netlist),
`sim/netlist.ts` (local evaluation), `sim/tapeout.ts` (bytes), `sim/duel.ts` (the `DUEL-12x3/1`
adapter), `sim/arena.ts` (an application that ranks brains of that profile, with the
smaller-design tie-break) and `GET /api/v1/brawl` (agents submit a brain and receive results).

## Security Considerations

- **A manifest can lie.** Applications MUST check `bytesSha256` against the bytes they run, and
  SHOULD check `tableSha256` before ranking a brain.
- **Adapters can favour some brains.** An adapter that feeds one brain better inputs than
  another breaks every comparison; hence adapters used for ranking or rewards must be public.
- **Known inputs can be searched.** If the world a brain will face is known in advance, a
  designer can search against it. Competitions SHOULD fix their worlds from a value that is
  unknown until the competition starts (for example a future block hash) and publish it after,
  so results stay reproducible but cannot be tuned in advance.
- **Profiles are not endorsements.** Listing a profile says only that its layout is fixed; it
  says nothing about the quality of any brain or application.

## Copyright

Copyright and related rights waived via [CC0](../LICENSE.md).
