/* Words for a duel brain: what each sense level means, and a rule as a sentence.
   Shared by the fight screen, the brain editor and the home page. */

import { TACTICS, type TacticId, type Rival } from "@/sim/arena";
import { fromProgram, type DuelField, type DuelRule, type Move } from "@/sim/duel";
import type { Program } from "@/sim/program";

export type ZhEn = { zh: string; en: string };

export const FIELDS: { id: DuelField; zh: string; en: string; levels: ZhEn[] }[] = [
  { id: "dist", zh: "距离", en: "Distance", levels: [{ zh: "远", en: "far" }, { zh: "中", en: "mid" }, { zh: "近", en: "near" }, { zh: "贴身", en: "in reach" }] },
  { id: "foe", zh: "对手在", en: "Rival is", levels: [{ zh: "走动", en: "moving" }, { zh: "举盾对着我", en: "shielding at me" }, { zh: "蓄力", en: "winding up" }, { zh: "有破绽", en: "open" }] },
  { id: "myhp", zh: "我的血", en: "My health", levels: [{ zh: "<20%", en: "<20%" }, { zh: "20–40%", en: "20–40%" }, { zh: "40–70%", en: "40–70%" }, { zh: "≥70%", en: "≥70%" }] },
  { id: "foehp", zh: "对手的血", en: "Its health", levels: [{ zh: "<20%", en: "<20%" }, { zh: "20–40%", en: "20–40%" }, { zh: "40–70%", en: "40–70%" }, { zh: "≥70%", en: "≥70%" }] },
  { id: "energy", zh: "我的体力", en: "My energy", levels: [{ zh: "<25", en: "<25" }, { zh: "25–49", en: "25–49" }, { zh: "50–74", en: "50–74" }, { zh: "≥75", en: "≥75" }] }
];

export const MOVE_WORDS: ZhEn[] = [{ zh: "逼近", en: "press" }, { zh: "后撤", en: "back off" }, { zh: "绕圈", en: "circle" }, { zh: "举盾", en: "shield" }];

const foeRange = (f: (typeof FIELDS)[number], r: [number, number], lang: "zh" | "en") =>
  f.levels.slice(r[0], r[1] + 1).map((l) => l[lang]).join(lang === "zh" ? "或" : " or ");

const BOUNDS: Partial<Record<DuelField, { b: number[]; unit: string }>> = {
  myhp: { b: [0, 20, 40, 70, 100], unit: "%" },
  foehp: { b: [0, 20, 40, 70, 100], unit: "%" },
  energy: { b: [0, 25, 50, 75, 100], unit: "" }
};

function rangeText(f: (typeof FIELDS)[number], v: [number, number], lang: "zh" | "en"): string {
  const nb = BOUNDS[f.id];
  if (!nb) return foeRange(f, v, lang); // distance and the rival's state: name the bands
  const { b, unit } = nb;
  if (v[0] === 0 && v[1] === 3) return lang === "zh" ? "任意" : "any";
  if (v[0] === 0) return `<${b[v[1] + 1]}${unit}`;
  if (v[1] === 3) return `≥${b[v[0]]}${unit}`;
  return `${b[v[0]]}–${b[v[1] + 1]}${unit}`;
}

function condText(r: DuelRule, lang: "zh" | "en"): string {
  const parts: string[] = [];
  for (const f of FIELDS) {
    const v = r.when[f.id];
    if (!v) continue;
    const name = lang === "zh" ? f.zh : f.en;
    const what = rangeText(f, v, lang);
    parts.push(lang === "zh" ? `${name}${f.id === "foe" ? "" : " "}${what}` : `${name} ${what}`);
  }
  if (r.prev && r.prev.length && r.prev.length < 4) parts.push(lang === "zh" ? `上一步在${r.prev.map((m) => MOVE_WORDS[m].zh).join("或")}` : `last move ${r.prev.map((m) => MOVE_WORDS[m].en).join(" or ")}`);
  return parts.length ? parts.join(lang === "zh" ? "，" : ", ") : lang === "zh" ? "总是" : "always";
}

export function actionText(then: Move, bite: boolean | undefined, lang: "zh" | "en"): string {
  const m = MOVE_WORDS[then][lang];
  return bite ? (lang === "zh" ? `${m}并咬` : `${m} and bite`) : m;
}

export function ruleText(r: DuelRule): ZhEn {
  return { zh: `${condText(r, "zh")} → ${actionText(r.then, r.bite, "zh")}`, en: `${condText(r, "en")} → ${actionText(r.then, r.bite, "en")}` };
}

/** One line per rule of a brain, for the lit list in a fight. */
export interface BrainLine { title: ZhEn; sub?: ZhEn; tag?: "attack" | "defend" | "move" }

export function linesOfChips(chips: readonly TacticId[]): BrainLine[] {
  return chips.map((c) => ({ title: { zh: TACTICS[c].zh, en: TACTICS[c].en }, sub: { zh: TACTICS[c].dzh, en: TACTICS[c].den }, tag: TACTICS[c].tag }));
}

const tagOf = (r: DuelRule): BrainLine["tag"] => (r.bite ? "attack" : r.then === 3 ? "defend" : "move");

export function linesOfProgram(p: Program): BrainLine[] {
  return fromProgram(p).rules.map((r, i) => ({ title: { zh: `规则 ${i + 1}`, en: `Rule ${i + 1}` }, sub: ruleText(r), tag: tagOf(r) }));
}

export function linesOfRival(r: Rival): BrainLine[] {
  return r.program ? linesOfProgram(r.program) : linesOfChips(r.chips);
}

export function otherwiseText(p: Program): ZhEn {
  const o = fromProgram(p).otherwise;
  return { zh: `都不满足：${actionText(o.then, o.bite, "zh")}`, en: `None: ${actionText(o.then, o.bite, "en")}` };
}
