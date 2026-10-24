/* ── sim/reference.ts ────────────────────────────────────────────────────────
   FLY-LIF/0 — the calibration reference brain.

   This file exists for one purpose: to be a *separate* statement of what a
   fruit-fly-sized decision layer should do, so that TapeFly's committed circuit
   can be measured against something it did not define. The rules in sim/rules.ts
   and the drives below were written independently — same literature, but shared
   no code and no constants. Where they disagree on an input word, the
   calibration run (npm run calibrate) counts it, and the disagreement is the
   finding, not a bug in either side.

   Structure (each drive traces to a biology claim, cited):

     1. gf       looming ≥ threshold → avoid, Giant Fibre fires.
                 LPLC2-dominant loom detector; the GF jump is ballistic and
                 early — it fires before contact (Ache et al. 2019; MaleCNS
                 v1.0). Supersedes every other drive; no other drive may veto
                 it once it fires.
     2. wind     looming above zero but sub-threshold → plain avoid, stateless.
                 A fly does not gamble on a moving shadow just because it is
                 hungry. This is exactly where TapeFly's "brave" carve-out
                 (rule 2 lets a starving fly sit out avoidance) will disagree
                 — that disagreement is real data, and we do not iron it out.
     3. feed     food salience amplified by deprivation drive: f + h ≥ TH_FEED
                 (hunger amplifies odour salience: Beshel & Zhong 2013,
                 NPF-DAN). One "feed" drive replaces TapeFly's three (feed /
                 lure / pursue): pursuit is not hardwired here, it emerges
                 from the sum while the fly stays hungry near the food.
     4. curious  novelty ≥ TH_N **and** light ≥ 1 → explore. The mushroom-body
                 novelty signal is gated by illumination.
     5. rest     settled (p = freeze) and not hungry → freeze.
     6. default  in the light, explore; in the dark, freeze.

   Honesty about provenance — read this before quoting any number that comes
   out of calibrations run against this reference:

     NO constant in this file traces to a published measurement of a real fly.
     TH_GF, LOOM, TH_FEED, TH_N are editorial choices made to be *defensible*,
     not *derived*: the shapes (early escape, hunger-gated feeding, light-gated
     curiosity) have literature behind them; the numbers do not. This reference
     is versioned and frozen precisely so that anyone who improvements it can
     publish FLY-LIF/1 and recalibrate; until then, certificates drawn against
     it say "draft" in plain text.

   Everything is integer: no floating point anywhere on the evaluation path,
   same rule as the rest of this repository, so two machines cannot disagree.
   --------------------------------------------------------------------------- */

const AP = 0, AV = 1, EX = 2, FR = 3;

export const REF_VERSION = "FLY-LIF/0";
export const REF_STATUS = "draft";

export const LIF_PARAMS = {
  LOOM: [0, 6, 22, 60],
  TH_GF: 20,
  TH_FEED: 4,
  TH_N: 2
} as const;

export const REF_DRIVES = [
  { id: "gf", text: "loom >= TH_GF → avoid, Giant Fibre fires" },
  { id: "wind", text: "loom > 0, sub-threshold → avoid, stateless" },
  { id: "feed", text: "food + hunger >= TH_FEED → approach" },
  { id: "curious", text: "novelty >= TH_N and light >= 1 → explore" },
  { id: "rest", text: "previous was freeze and not hungry → freeze" },
  { id: "default", text: "explore in the light, freeze in the dark" }
] as const;

export type RefDrive = (typeof REF_DRIVES)[number]["id"];

const loom = (t: number) => LIF_PARAMS.LOOM[t];

/** Which drive decides, and the 3-bit output word (behaviour | gf << 2). */
export function decideRef(word: number): { drive: RefDrive; out: number } {
  const f = word & 3, t = (word >> 2) & 3, l = (word >> 4) & 3,
    n = (word >> 6) & 3, h = (word >> 8) & 3, p = (word >> 10) & 3;
  if (loom(t) >= LIF_PARAMS.TH_GF) return { drive: "gf", out: AV | 4 };
  if (t >= 1) return { drive: "wind", out: AV };
  if (f + h >= LIF_PARAMS.TH_FEED) return { drive: "feed", out: AP };
  if (n >= LIF_PARAMS.TH_N && l >= 1) return { drive: "curious", out: EX };
  if (p === FR && f + h < LIF_PARAMS.TH_FEED) return { drive: "rest", out: FR };
  return { drive: "default", out: l >= 1 ? EX : FR };
}

/** The reference's whole 4096-word table, the twin of rulesTable(). */
export function refTable(): number[] {
  return Array.from({ length: 4096 }, (_, w) => decideRef(w).out);
}
