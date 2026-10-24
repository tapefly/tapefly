<!-- New issue at https://github.com/TapeOutProtocol/TAPs/issues/new with the "Idea" template. Title below; body from "**Problem.**" on. -->

**Title:** Idea: a PoD task from a running game — a fruit fly's 12-in / 3-out reflex brain

**Problem.** PoD tasks reward a cheaper circuit for a fixed function, and every task so far is a
textbook function (gates, adders, counters). None of them is a function some application
actually runs, so a better design never shows up anywhere except the leaderboard. Separately,
mining checks sample 3 to 32 vectors, so a design can pass while being wrong elsewhere.

**Proposal.** Add one combinational task whose function is the decision circuit of TapeFly, a
public game in which a simulated fruit fly lives one deterministic day per UTC date.

- 12 inputs (food, threat, light, novelty, hunger, previous move; 2 bits each), 3 outputs (a
  move and an escape jump). No LATCH. Packing as in TAP-02 §5.
- The function is nine ordered rules, equivalently a 4,096-entry truth table
  (SHA-256 `94ec2e39868755edaf065796cc849830e4551c65a9af816a09ea906172bde3cd`).
- Reference circuit: 50 NAND, depth 9, so K_task = 50 and C_ref = 50 · 9³ = 36,450. Its 350 bytes
  hash to `a763117011fe4c4be7106d9b0d2c78fe79b81c15ccc2a6531c9263b4f443d4dd`.
- Only 4,096 inputs, so every submission can be checked on the whole table, and a single
  differing word is a complete counterexample.
- Before the task opens we publish every design we know of (the reference, and a 48-gate,
  depth-10 variant our compiler found), so the proposers start with no hidden advantage.

A full draft in the template, with the truth table, the reference bytes and a dependency-free
checker that reproduces both hashes, is ready to open as `TAPs/TAP-draft-fly-reflex-pod-task.md`.

**Type.** Application, we think: it adds one task and changes no contract or format. Happy to
change it if editors see it otherwise.

**Builds on.** TAP-02 (netlist format, evaluation, bit packing); the `getTask` fields named in
TAP-draft-pod-attributes.

**Questions for the editors and the PoD authors**

1. The PoD mining contract reports `isSealed()` true with owner zero since block 121815032. Can
   tasks still be created after the seal, and by whom? If not, is there a planned contract or
   version that will host new tasks?
2. Are new tasks proposed through TAPs, or through another channel?
3. The task vector format is not published. Would a full 4,096-word table be accepted as the
   task's vectors, and in what encoding?
4. Is the reference circuit taped out by the proposer or by the task creator, and on which
   processor (existing references sit on `0xF4412C52ec3DDf7CAf5f518B6662F77B02Bde28E`)?
