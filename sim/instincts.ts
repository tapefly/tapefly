/* ── sim/instincts.ts ────────────────────────────────────────────────────────
   The four switches on the home page. Each switch is a small set of rules;
   together they make a program, and the program compiles to NAND gates like
   any other. The switches were tuned on real dishes so that each one matters
   and "all on" is not automatically best: the jump reflex can cost a fly its
   day.

     jump    danger is touching it        → back away and jump (Giant Fibre)
     flee    danger is near, not starving → back away
     eat     food is near, or it is hungry and smells any → go for it
     roam    nothing else applies          → wander (off: hold still)
   --------------------------------------------------------------------------- */
import { encodeProgram, type Program, type ProgramRule } from "./program";

export type SwitchId = "jump" | "flee" | "eat" | "roam";
export type Switches = Record<SwitchId, boolean>;

export const SWITCHES: { id: SwitchId; label: string; line: string; zh: string; zhLine: string }[] = [
  { id: "eat", label: "Eat", line: "Go for food when it is close, or when hungry and it smells any.", zh: "觅食", zhLine: "食物近在眼前，或者饿了、闻到一点食物，就去吃。" },
  { id: "flee", label: "Flee", line: "Back away when danger is near, unless it is starving.", zh: "逃跑", zhLine: "危险靠近就后退，除非已经快饿死了。" },
  { id: "jump", label: "Jump", line: "When danger is touching it, jump away. Fast, but it lands anywhere.", zh: "弹跳", zhLine: "危险贴身时一跳逃开。很快，但落在哪里说不准。" },
  { id: "roam", label: "Explore", line: "When nothing is going on, wander. Off: hold still and wait.", zh: "探索", zhLine: "没事的时候四处走走。关掉：原地不动等着。" }
];

const RULES: Record<Exclude<SwitchId, "roam">, ProgramRule[]> = {
  jump: [{ when: { threat: [3, 3] }, then: 1, gf: true, label: "jump" }],
  flee: [{ when: { threat: [2, 3], hunger: [0, 2] }, then: 1, label: "flee" }],
  eat: [
    { when: { food: [2, 3] }, then: 0, label: "eat" },
    { when: { food: [1, 3], hunger: [2, 3] }, then: 0, label: "eat (hungry)" }
  ]
};

export const NO_SWITCHES: Switches = { jump: false, flee: false, eat: false, roam: false };

/** The program a set of switches stands for. Order matters: jump, then flee, then eat. */
export function programFromSwitches(s: Switches): Program {
  const rules = [...(s.jump ? RULES.jump : []), ...(s.flee ? RULES.flee : []), ...(s.eat ? RULES.eat : [])];
  return { rules: rules.map((r) => ({ ...r, when: { ...r.when } })), otherwise: { then: s.roam ? 2 : 3 } };
}

const ALL: Switches[] = Array.from({ length: 16 }, (_, m) => ({ jump: !!(m & 1), flee: !!(m & 2), eat: !!(m & 4), roam: !!(m & 8) }));

/** The switches a program came from, or null when it was written in the editor. */
export function switchesFromProgram(p: Program): Switches | null {
  const code = encodeProgram(p);
  return ALL.find((s) => encodeProgram(programFromSwitches(s)) === code) ?? null;
}
