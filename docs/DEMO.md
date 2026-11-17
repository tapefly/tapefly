# TapeFly — 3-minute demo

**Recorded demo:** <https://tapefly.xyz/tapefly-demo-en.mp4>

The final English cut is two minutes fifty seconds. Its voiceover, bilingual
subtitle files and production notes are under
`docs/hackathon-delivery-2026-11-17/`.

**Duration:** 1 minute 58 seconds. The Xccelerate limit is three minutes.

The script below is a longer planning version. The recorded edit uses Chinese
voiceover with compact Chinese and English subtitle cards.

## Before recording

- Use the production app at <https://tapefly.xyz>.
- Close unrelated tabs and notifications.
- Set the page language to English for an international judging panel.
- Preload `/`, `/build`, `/vs` and `/tapeout`.
- Keep the wallet panel visible but do not sign a transaction during the recording.

## Script

### 0:00–0:15 — The problem

> AI agents and game characters usually act as black boxes. Even when their code is public, it is hard to prove what the deployed system actually decided. TapeFly makes the decision itself small enough to check: a fruit fly brain built from 50 NAND gates.

Show the live dish on the home page.

### 0:15–0:40 — The product

> Every UTC day uses the same deterministic world. Eight sibling flies share one dish and one brain. Each fly reads six senses, packs them into a 12-bit word, and asks the circuit for a move and an escape reflex. Every tick is hashed into the previous one, so the whole day can be replayed.

Play or scrub today's dish. Point out food, traps, hunger and the circuit lighting up with the current decision.

### 0:40–1:05 — A player builds a brain

> A player does not need to know anything about circuits. Flip four instincts or write a short rule list. TapeFly compiles the rules into NAND gates and checks the result against every possible 12-bit input.

Open `/build`. Change an instinct. Show the gate count, depth and TapeOut cost updating.

### 1:05–1:25 — Social loop

> The brain becomes a link. A friend opens the exact same brain, answers with their own, and both run in one shared dish. Every week, submitted brains are ranked over seven deterministic days.

Open `/vs` and `/board`.

### 1:25–2:00 — The proof

> The brain is 350 bytes of NAND gates, and every one of its 4,096 possible answers is checked against its rules. Taped out on X Layer through TapeOut, the same check runs against the chain: the site asks the on-chain circuit all 4,096 questions with a free read-only call. Anyone can repeat it.

Open `/tapeout`. Show the X Layer panel, the 350-byte netlist and its SHA-256. After the official tape-out on X Layer, also show the processor, the circuit id, `4,096 / 4,096` and the tape-out transaction.

### 2:00–2:25 — Why TapeFly

> Most on-chain AI projects verify ownership or computation. TapeFly makes behavior the verifiable object. The brain is small enough to inspect, the world is deterministic enough to replay, and TapeOut makes the deployed brain permanent and callable.

Show the 64×64 exam board on `/calibrate`.

### 2:25–2:45 — X Layer and close

> The loop is live on X Layer: the official brain is Circuit #2 and all 4,096 answers are verified. The next step is to use X Layer block data for the daily seed and open one free arena to human- and AI-designed brains. TapeFly is live today at tapefly.xyz.

End on the live dish or the repository URL.

## Recording checklist

- [ ] Video is under 3:00.
- [ ] Every number shown matches the production app.
- [ ] No private key, seed phrase, wallet balance or personal email is visible.
- [ ] Upload as an unlisted YouTube or Loom video.
- [ ] Copy the public link into the Xccelerate registration form.
