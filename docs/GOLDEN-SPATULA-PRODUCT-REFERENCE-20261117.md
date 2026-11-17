# TapeFly Product Reference: Golden Spatula Structure

Date: 2026-11-17

## Decision

Golden Spatula is a useful structural reference for TapeFly, not an art, economy
or monetisation template.

The shared product principle is:

> The player makes a build decision; the system executes it; the result is
> visible; the player changes one thing and tries again.

Borrow the clarity and rhythm. Do not borrow gacha, paid power, copied visual
identity, stamina systems or a complex item economy.

## Five principles

### 1. The player builds; the system executes

Golden Spatula: choose champions, equipment and positions, then watch the fight.

TapeFly: assemble a body, connect senses, wire logic, then watch the fly act.

Product consequence:

- The player should never need to steer the fly manually.
- The interesting decision is the build, not reaction speed.
- The result should follow directly from the built circuit and body.

### 2. Short rounds, strong feedback

Target mobile loop:

```text
30 seconds: build or adjust the fly
10 seconds: watch the deterministic run
5 seconds: read the failure and change one wire
```

The first five minutes should contain several complete loops, not a long
tutorial followed by one result.

Product consequence:

- Auto-start the most useful replay after a change.
- Show the first failing tick and the responsible wire immediately.
- Keep the next action obvious: change one part, one wire or one rule.

### 3. Seasons instead of unlimited content

Golden Spatula stays fresh through changing compositions and seasonal rules.

TapeFly should reuse the same deterministic engine through:

- Weekly circuit constraints.
- A new gate budget, memory limit or arena modifier each week.
- Seasonal circuit collections and leaderboards.
- Sponsored challenges.

Product consequence:

- Do not double the campaign size before season rules are validated.
- New rules should create new decisions without requiring a new physics engine.

### 4. Low operation, high understanding

Mobile players should think about composition and trade-offs, not precise
gestures.

Product consequence:

- Touch targets and wiring must remain readable at phone width.
- Canvas motion must preserve a clear focal point.
- The player must be able to pause, rewind and inspect without losing state.
- Workshop and Brawl are not action-control games.

### 5. A visible build language

Golden Spatula makes synergies, items and star levels legible.

TapeFly needs equally clear language:

- Left eye controls the right wing.
- Memory remembers that food was eaten.
- Turning a nerve around changes the response.
- Fewer NAND gates mean a smaller circuit and lower tape-out cost.

Product consequence:

- Teach through visible cause and effect, not truth tables.
- Every label should answer “what changes if I touch this?”
- Technical terms are supporting evidence, not the first explanation.

## What not to copy

- No copied visual style, characters, icons, UI or terminology.
- No gacha or random paid power.
- No stamina gate on basic play.
- No purchasable extra NAND budget or stronger body.
- No hidden success-rate item.
- No complex equipment economy before retention is proven.

Paid content may unlock new challenges, seasons and presentation. It must not
make a circuit objectively more powerful.

## Product requirements derived from this reference

1. A first-run player should reach the first automated flight within 30 seconds.
2. A failed run should expose the earliest actionable fault within one tap.
3. The result screen should offer one primary next action and one optional deeper action.
4. A mobile session should support at least three complete build-run-adjust loops in five minutes.
5. A weekly rule change should be publishable without changing the core simulation.
6. The visible build language must be understandable without reading the developer docs.

## Metrics to watch

- Time to first flight.
- Percentage who complete three loops in five minutes.
- Number of retries after a diagnosed failure.
- Percentage who change exactly one part or wire before retrying.
- Weekly return rate around new constraints.
- Percentage who open the detailed circuit proof after succeeding.

## One-sentence internal rule

> TapeFly should feel like a build-and-watch strategy game to the player, while
> remaining a deterministic, inspectable NAND circuit underneath.
