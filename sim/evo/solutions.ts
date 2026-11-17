/* ── sim/evo/solutions.ts ────────────────────────────────────────────────────
   One brain per level that clears it. The tests run these, so every level is
   known to be possible; the game never shows them.
   --------------------------------------------------------------------------- */
import type { EvoProgram } from "./brain";

// smell values: 0 none · 1 ahead · 2 right · 3 behind · 4 left → mask bits
const S = { none: 1, ahead: 2, right: 4, behind: 8, left: 16 };
const YES = 2, NO = 1;

const chase = [
  { when: { smell: S.left }, act: 2 as const },
  { when: { smell: S.right | S.behind }, act: 3 as const }
];

const dodge = (blocked: EvoProgram["rules"]): EvoProgram => ({
  rules: [
    ...blocked,
    { when: { mem: YES, web: NO, wallF: NO }, act: 1, mem: 0 },
    { when: { mem: YES }, act: 3 },
    ...chase
  ],
  otherwise: { act: 1 }
});

export const SOLUTIONS: Record<string, EvoProgram> = {
  "first-bite": { rules: [], otherwise: { act: 1 } },
  corner: { rules: [{ when: { wallF: YES }, act: 3 }], otherwise: { act: 1 } },
  "left-or-right": {
    rules: [
      { when: { wallF: YES, wallR: NO }, act: 3 },
      { when: { wallF: YES }, act: 2 }
    ],
    otherwise: { act: 1 }
  },
  scent: { rules: chase, otherwise: { act: 1 } },
  table: { rules: chase, otherwise: { act: 1 } },
  faint: {
    rules: [...chase, { when: { smell: S.none, wallF: YES }, act: 3 }],
    otherwise: { act: 1 }
  },
  webs: dodge([{ when: { web: YES }, act: 3, mem: 1 }]),
  garden: dodge([
    { when: { web: YES }, act: 3, mem: 1 },
    { when: { wallF: YES, smell: S.ahead }, act: 3, mem: 1 }
  ])
};
