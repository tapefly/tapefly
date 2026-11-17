/* ── sim/arena.ts ────────────────────────────────────────────────────────────
   A Brain Brawl run: shop → backpack → fight (sim/duel.ts) → shop.

   Two things are bought with gold:
     - tactic chips: rules for the brain. The whole backpack compiles to one
       NAND netlist and the gate count is checked against the fight's budget,
       so chips that share logic cost less together;
     - body parts: bigger jaws, a shell, faster legs… They cost no gates, only
       gold and one of three body slots.

   The shop, the rivals and every fight's seed come from the run's date, so
   everyone playing the same day meets the same run. A fight that ends level
   (same share of health left) goes to the smaller brain.
   --------------------------------------------------------------------------- */
import { addDays, seedFromDate } from "./lineage";
import { stream } from "./rand";
import { encodeProgram, type Program } from "./program";
import { duel, toProgram, compileFighter, PRESS, BACK, CIRCLE, GUARD, BASE, T, bodyOf, type DuelRule, type DuelResult, type GearId, type Move } from "./duel";
import ghostFile from "./arena-ghosts.json";

/* ── tactic chips ────────────────────────────────────────────────────────── */

export const TACTIC_IDS = ["bite", "punish", "block", "sidestep", "hop", "kite", "breathe", "finisher", "flank", "berserk", "bait"] as const;
export type TacticId = (typeof TACTIC_IDS)[number];

export interface Tactic { id: TacticId; zh: string; en: string; dzh: string; den: string; price: number; rule: DuelRule; tag: "attack" | "defend" | "move" }

export const TACTICS: Record<TacticId, Tactic> = {
  bite:     { id: "bite",     zh: "先咬",     en: "Bite",        dzh: "贴身、有体力 → 咬",               den: "In reach with energy → bite",             price: 3, tag: "attack", rule: { when: { dist: [3, 3], energy: [1, 3] }, then: PRESS, bite: true } },
  punish:   { id: "punish",   zh: "抓破绽",   en: "Punish",      dzh: "对手有破绽（刚出完手、被打晕、盾没对着我）→ 咬", den: "Rival open (just bit, dazed, shield not facing me) → bite",        price: 4, tag: "attack", rule: { when: { foe: [3, 3], dist: [2, 3] }, then: PRESS, bite: true } },
  block:    { id: "block",    zh: "格挡",     en: "Block",       dzh: "对手蓄力、就在身边 → 举盾（只挡正面）", den: "Rival winds up close by → shield up (front only)",         price: 4, tag: "defend", rule: { when: { foe: [2, 2], dist: [2, 3] }, then: GUARD } },
  sidestep: { id: "sidestep", zh: "闪身",     en: "Sidestep",    dzh: "对手蓄力 → 绕到侧面",             den: "Rival winds up → step around",            price: 3, tag: "defend", rule: { when: { foe: [2, 2] }, then: CIRCLE } },
  hop:      { id: "hop",      zh: "后跳",     en: "Hop back",    dzh: "对手蓄力、贴着我 → 往后跳",       den: "Rival winds up in reach → hop back",      price: 3, tag: "defend", rule: { when: { foe: [2, 2], dist: [3, 3] }, then: BACK } },
  kite:     { id: "kite",     zh: "风筝",     en: "Kite",        dzh: "我血少 → 后撤",                   den: "Low health → back off",                   price: 2, tag: "move",   rule: { when: { myhp: [0, 1] }, then: BACK } },
  breathe:  { id: "breathe",  zh: "喘口气",   en: "Breathe",     dzh: "没体力 → 举盾回气",               den: "Out of energy → shield up and recover",       price: 3, tag: "defend", rule: { when: { energy: [0, 0] }, then: GUARD } },
  finisher: { id: "finisher", zh: "斩杀",     en: "Finisher",    dzh: "对手血很少 → 冲上去咬",           den: "Rival nearly down → rush and bite",       price: 3, tag: "attack", rule: { when: { foehp: [0, 0] }, then: PRESS, bite: true } },
  flank:    { id: "flank",    zh: "绕开格挡", en: "Flank",       dzh: "对手举盾 → 绕到它侧面，盾只挡正面", den: "Rival shielding → circle to its side; shields only cover the front", price: 3, tag: "move", rule: { when: { foe: [1, 1] }, then: CIRCLE } },
  berserk:  { id: "berserk",  zh: "拼命",     en: "Berserk",     dzh: "我快死了 → 冲上去咬",             den: "Nearly down → all in",                    price: 3, tag: "attack", rule: { when: { myhp: [0, 0] }, then: PRESS, bite: true } },
  bait:     { id: "bait",     zh: "诱招",     en: "Bait",        dzh: "对手靠近、还没出手 → 先举盾等它咬", den: "Rival close and not biting yet → shield up and wait", price: 4, tag: "defend", rule: { when: { foe: [0, 0], dist: [2, 3] }, then: GUARD } }
};

/** With no chip matching, the fly walks at its rival. */
export const DEFAULT_MOVE: Move = PRESS;

export function programOf(chips: readonly TacticId[]): Program {
  return toProgram(chips.map((c) => TACTICS[c].rule), { then: DEFAULT_MOVE });
}

const aloneCache = new Map<TacticId, number>();
export function aloneGates(c: TacticId): number {
  let g = aloneCache.get(c);
  if (g === undefined) { g = compileFighter(programOf([c])).gates; aloneCache.set(c, g); }
  return g;
}

export interface Report { gates: number; depth: number; cost: number; alone: number[]; saved: number }
const reportCache = new Map<string, Report>();
export function report(chips: readonly TacticId[]): Report {
  const key = chips.join(",");
  let r = reportCache.get(key);
  if (!r) {
    const c = compileFighter(programOf(chips));
    const alone = chips.map(aloneGates);
    const sum = alone.reduce((s, g) => s + g, 0);
    r = { gates: c.gates, depth: c.depth, cost: c.cost, alone, saved: chips.length > 1 ? sum - c.gates : 0 };
    if (reportCache.size > 2000) reportCache.clear();
    reportCache.set(key, r);
  }
  return r;
}

/* ── body parts ──────────────────────────────────────────────────────────── */

export interface Part { id: GearId; zh: string; en: string; dzh: string; den: string; price: number }
export const PARTS: Record<GearId, Part> = {
  jaws:   { id: "jaws",   zh: "尖颚", en: "Jaws",   dzh: `每口伤害 +4（基础 ${BASE.dmg}）`, den: `+4 bite damage (base ${BASE.dmg})`, price: 5 },
  shell:  { id: "shell",  zh: "硬甲", en: "Shell",  dzh: `生命 +30（基础 ${BASE.maxHp}）`, den: `+30 health (base ${BASE.maxHp})`, price: 5 },
  legs:   { id: "legs",   zh: "快腿", en: "Legs",   dzh: "移动速度 +20%", den: "+20% speed", price: 4 },
  venom:  { id: "venom",  zh: "毒刺", en: "Venom",  dzh: "咬中后中毒 1.5 秒，再掉约 5 点血", den: "Bites poison: about 5 more damage over 1.5 s", price: 5 },
  lungs:  { id: "lungs",  zh: "大肺", en: "Lungs",  dzh: "体力恢复 +40%", den: "+40% energy recovery", price: 4 },
  spines: { id: "spines", zh: "背刺", en: "Spines", dzh: "举盾时，咬在盾上的对手反受 4 点伤害", den: "Biting its shield costs the biter 4", price: 4 }
};
export const PART_IDS = Object.keys(PARTS) as GearId[];
export const BODY_SLOTS = 3;

/* ── rules of a run ──────────────────────────────────────────────────────── */

export const RUN = {
  startGold: 10,
  goldPerFight: 6,
  goldPerWin: 2,
  reroll: 1,
  shopChips: 3,
  shopParts: 2,
  lives: 3,
  winsToClear: 5,
  maxFights: 9
} as const;

/** Gate budget for fight i. */
export const budgetFor = (i: number) => Math.min(60, 16 + 5 * i);

export interface Rival { name: string; ai: boolean; chips: TacticId[]; gear: GearId[]; /** a hand-written rule list instead of chips (a friend's editor brain) */ program?: Program }
export const rivalProgram = (r: Rival): Program => r.program ?? programOf(r.chips);
export const rivalGates = (r: Rival): number => (r.program ? compileFighter(r.program).gates : report(r.chips).gates);

const HAND: Rival[] = [
  { name: "Ada", ai: false, chips: ["berserk"], gear: [] },
  { name: "Bo", ai: false, chips: ["bite"], gear: [] }
];
export const RIVALS: Rival[] = [
  ...HAND,
  ...(ghostFile as { name: string; chips: string[]; gear: string[] }[]).map((g) => ({ name: g.name, ai: true, chips: g.chips.filter(isTactic), gear: g.gear.filter(isPart) }))
];
export const rivalFor = (i: number) => RIVALS[Math.min(i, RIVALS.length - 1)];

export function isTactic(s: string): s is TacticId { return (TACTIC_IDS as readonly string[]).includes(s); }
export function isPart(s: string): s is GearId { return (PART_IDS as readonly string[]).includes(s); }

export type Offer = { kind: "chip"; id: TacticId } | { kind: "part"; id: GearId } | null;

export interface Run {
  date: string;
  fight: number;
  gold: number;
  lives: number;
  wins: number;
  chips: TacticId[];
  gear: GearId[];
  shop: Offer[];
  rerolls: number;
  history: { rival: string; ai: boolean; winner: number; gates: number; how: "ko" | "time" }[];
  over: null | "cleared" | "out";
}

export function newRun(date: string): Run {
  const r: Run = { date, fight: 0, gold: RUN.startGold, lives: RUN.lives, wins: 0, chips: [], gear: [], shop: [], rerolls: 0, history: [], over: null };
  r.shop = rollShop(r);
  return r;
}

export function rollShop(r: Run): Offer[] {
  const rnd = stream(seedFromDate(r.date) ^ Math.imul(r.fight + 1, 7919), 0xa7e + r.rerolls);
  const take = <T,>(pool: T[], n: number) => { const left = pool.slice(), out: T[] = []; while (out.length < n && left.length) out.push(left.splice(Math.floor(rnd() * left.length), 1)[0]); return out; };
  const chips = take(TACTIC_IDS.filter((c) => !r.chips.includes(c)), RUN.shopChips).map((id) => ({ kind: "chip" as const, id }));
  // the very first shop always offers a bite: without one, a fly never attacks
  if (r.fight === 0 && r.rerolls === 0 && !r.chips.includes("bite") && !chips.some((c) => c.id === "bite")) chips[0] = { kind: "chip", id: "bite" };
  const parts = r.gear.length >= BODY_SLOTS ? [] : take(PART_IDS.filter((g) => !r.gear.includes(g)), RUN.shopParts).map((id) => ({ kind: "part" as const, id }));
  const out: Offer[] = [...chips, ...parts];
  while (out.length < RUN.shopChips + RUN.shopParts) out.push(null);
  return out;
}

export const priceOf = (o: Exclude<Offer, null>) => (o.kind === "chip" ? TACTICS[o.id].price : PARTS[o.id].price);

export function buy(r: Run, slot: number): Run {
  const o = r.shop[slot];
  if (!o || r.over || r.gold < priceOf(o)) return r;
  if (o.kind === "chip" && r.chips.includes(o.id)) return r;
  if (o.kind === "part" && (r.gear.includes(o.id) || r.gear.length >= BODY_SLOTS)) return r;
  const shop = r.shop.slice(); shop[slot] = null;
  return o.kind === "chip"
    ? { ...r, gold: r.gold - priceOf(o), chips: [...r.chips, o.id], shop }
    : { ...r, gold: r.gold - priceOf(o), gear: [...r.gear, o.id], shop };
}

/** Selling returns half the price, rounded down. */
export function sellChip(r: Run, i: number): Run {
  if (r.over || i < 0 || i >= r.chips.length) return r;
  return { ...r, gold: r.gold + Math.floor(TACTICS[r.chips[i]].price / 2), chips: r.chips.filter((_, j) => j !== i) };
}
export function sellPart(r: Run, i: number): Run {
  if (r.over || i < 0 || i >= r.gear.length) return r;
  return { ...r, gold: r.gold + Math.floor(PARTS[r.gear[i]].price / 2), gear: r.gear.filter((_, j) => j !== i) };
}
export function move(r: Run, i: number, dir: -1 | 1): Run {
  const j = i + dir;
  if (r.over || j < 0 || j >= r.chips.length || i < 0 || i >= r.chips.length) return r;
  const chips = r.chips.slice(); [chips[i], chips[j]] = [chips[j], chips[i]];
  return { ...r, chips };
}
export function reroll(r: Run): Run {
  if (r.over || r.gold < RUN.reroll) return r;
  const next = { ...r, gold: r.gold - RUN.reroll, rerolls: r.rerolls + 1 };
  return { ...next, shop: rollShop(next) };
}

export function canFight(r: Run) {
  const gates = report(r.chips).gates, budget = budgetFor(r.fight);
  return { ok: !r.over && gates <= budget, gates, budget };
}

export const seedFor = (date: string, i: number) => (seedFromDate(addDays(date, -(i + 1))) ^ 0x51ed) >>> 0;
export const practiceSeedFor = (date: string, i: number, n: number) => (seedFromDate(addDays(date, -(i + 31))) ^ Math.imul(n + 1, 0x2545f491)) >>> 0;

export interface Fight {
  index: number;
  rival: Rival;
  seed: number;
  result: DuelResult;
  /** 0 you · 1 rival · -1 draw, after the smaller-brain tie-break */
  winner: number;
  tieBreak: boolean;
  gates: number;
  rivalGates: number;
  why: { zh: string; en: string };
}

export function fightRival(chips: readonly TacticId[], gear: readonly GearId[], rival: Rival, seed: number, index: number): Fight {
  return fightBrain(programOf(chips), chips, gear, rival, seed, index);
}

/** Any brain (a rule list an agent wrote, not only shop chips) against a rival. Pass chips when it is made of them, for the hints. */
export function fightBrain(program: Program, chips: readonly TacticId[] | null, gear: readonly GearId[], rival: Rival, seed: number, index: number): Fight {
  const result = duel({ program, gear }, { program: rivalProgram(rival), gear: rival.gear }, seed);
  const gates = chips ? report(chips).gates : compileFighter(program).gates, theirs = rivalGates(rival);
  const winner = result.winner !== -1 ? result.winner : gates < theirs ? 0 : gates > theirs ? 1 : -1;
  const tieBreak = result.winner === -1 && winner !== -1;
  return { index, rival, seed, result, winner, tieBreak, gates, rivalGates: theirs, why: explain(chips ?? [], result, winner, tieBreak, gates, theirs) };
}

export function fight(r: Run): { run: Run; fight: Fight } {
  const c = canFight(r);
  if (!c.ok) throw new Error(r.over ? "the run is over" : `brain is ${c.gates} gates, budget is ${c.budget}`);
  const f = fightRival(r.chips, r.gear, rivalFor(r.fight), seedFor(r.date, r.fight), r.fight);
  const won = f.winner === 0, lost = f.winner === 1;
  const wins = r.wins + (won ? 1 : 0), lives = r.lives - (lost ? 1 : 0);
  const over: Run["over"] = wins >= RUN.winsToClear ? "cleared" : lives <= 0 || r.fight + 1 >= RUN.maxFights ? "out" : null;
  const next: Run = {
    ...r, fight: r.fight + 1, wins, lives, rerolls: 0, over,
    gold: r.gold + RUN.goldPerFight + (won ? RUN.goldPerWin : 0),
    history: [...r.history, { rival: f.rival.name, ai: f.rival.ai, winner: f.winner, gates: f.gates, how: f.result.how }]
  };
  next.shop = over ? [] : rollShop(next);
  return { run: next, fight: f };
}

/** A free practice fight against the next rival, with a seed the real fight never uses. */
export function practice(r: Run, n: number): Fight {
  return fightRival(r.chips, r.gear, rivalFor(r.fight), practiceSeedFor(r.date, r.fight, n), r.fight);
}

/* ── what happened, in a sentence and a hint ─────────────────────────────── */

export function explain(chips: readonly TacticId[], res: DuelResult, winner: number, tieBreak: boolean, gates: number, rivalGates: number): { zh: string; en: string } {
  const count = (kind: string, by: number) => res.events.filter((e) => e.kind === kind && e.by === by).length;
  const landed = [0, 1].map((i) => count("bite", i) + count("crit", i) + count("interrupt", i));
  const blocked = [0, 1].map((i) => count("blocked", i)); // bites of i that hit a guard
  const whiffs = [0, 1].map((i) => count("whiff", i));
  const secs = (res.ticks / 30).toFixed(1);
  if (tieBreak) {
    return winner === 0
      ? { zh: `时间到，血量一样，你的大脑 ${gates} 个门，比对手少 ${rivalGates - gates} 个，门更少的赢。`, en: `Time, level on health; your brain is ${gates} gates, ${rivalGates - gates} fewer than the rival's, and the smaller brain wins.` }
      : { zh: `时间到，血量一样，但对手只用 ${rivalGates} 个门，门更少的赢。`, en: `Time, level on health, but the rival uses only ${rivalGates} gates, and the smaller brain wins.` };
  }
  if (winner === 0) {
    const how = res.how === "ko" ? `${secs} 秒击倒对手` : "时间到，你剩的血更多";
    const howEn = res.how === "ko" ? `knocked the rival out in ${secs} s` : "time, and you had more health left";
    const extra = blocked[1] > 0 ? `，挡下了 ${blocked[1]} 口` : count("interrupt", 0) > 0 ? `，打断了对手 ${count("interrupt", 0)} 次` : "";
    const extraEn = blocked[1] > 0 ? `, blocking ${blocked[1]} bite${blocked[1] === 1 ? "" : "s"}` : count("interrupt", 0) > 0 ? `, interrupting the rival ${count("interrupt", 0)} time${count("interrupt", 0) === 1 ? "" : "s"}` : "";
    return { zh: `${how}：咬中 ${landed[0]} 口${extra}。`, en: `You ${howEn}: ${landed[0]} bite${landed[0] === 1 ? "" : "s"} landed${extraEn}.` };
  }
  if (winner === -1) return { zh: "两边同时倒下，平局。", en: "Both went down together: a draw." };
  // a loss: say what went wrong, and what would help
  if (!chips.some((c) => TACTICS[c].tag === "attack")) {
    return { zh: "你的果蝇一口都没咬：背包里没有进攻芯片。买一张「先咬」。", en: "Your fly never bit: no attack chip in the backpack. Buy Bite." };
  }
  if (blocked[0] >= 2 && !chips.includes("flank")) {
    return { zh: `你有 ${blocked[0]} 口咬在对手的格挡上，每次都被弹开、白费体力。盾只挡正面：试试「绕开格挡」，配「抓破绽」从侧面咬。`, en: `${blocked[0]} of your bites hit the rival's guard, and each one bounced off. Shields only cover the front: try Flank with Punish to bite from the side.` };
  }
  if (landed[1] >= 3 && !chips.some((c) => c === "block" || c === "sidestep" || c === "hop")) {
    return { zh: `对手咬中你 ${landed[1]} 口，你一次都没躲。对手蓄力时会发光，装「格挡」「闪身」或「后跳」去应对。`, en: `The rival landed ${landed[1]} bites and you never reacted. Its wind-up glows: answer it with Block, Sidestep or Hop back.` };
  }
  const guarding = res.frames.filter((f) => f[0].guard).length / res.frames.length;
  if (guarding > 0.4 && landed[0] <= 1) {
    const g = chips.find((c) => c === "bait" || c === "breathe");
    const name = g ? TACTICS[g] : null;
    return name
      ? { zh: `你 ${Math.round(guarding * 100)}% 的时间都举着盾，几乎没出手。「${name.zh}」排得太靠前，挡住了下面的进攻芯片：把它往下挪。`, en: `You held your shield ${Math.round(guarding * 100)}% of the fight and hardly bit. ${name.en} sits too high and keeps your attack chips from firing: move it down.` }
      : { zh: `你 ${Math.round(guarding * 100)}% 的时间都举着盾，几乎没出手。光防守赢不了：加一张进攻芯片。`, en: `You held your shield ${Math.round(guarding * 100)}% of the fight and hardly bit. Defence alone won't win: add an attack chip.` };
  }
  const above = (a: TacticId, b: TacticId) => chips.includes(a) && chips.includes(b) && chips.indexOf(a) < chips.indexOf(b);
  if (whiffs[0] >= 2) {
    if (!chips.includes("punish")) return { zh: `你有 ${whiffs[0]} 口咬空了：对手看到你蓄力就躲开。试试「抓破绽」，等它出完手再咬。`, en: `${whiffs[0]} of your bites missed: the rival sees the wind-up and steps away. Try Punish: bite after it commits.` };
    if (above("bite", "punish")) return { zh: `你有 ${whiffs[0]} 口咬空了。「先咬」排在「抓破绽」上面，所以总是你先出手被躲开：把「抓破绽」挪上去。`, en: `${whiffs[0]} of your bites missed. Bite sits above Punish, so you always swing first and get dodged: move Punish up.` };
    return { zh: `你有 ${whiffs[0]} 口咬空了，对手很会躲。少咬几口：卖掉「先咬」，只靠「抓破绽」反击也行。`, en: `${whiffs[0]} of your bites missed; this rival dodges well. Bite less: you can sell Bite and live on Punish.` };
  }
  if (count("interrupt", 1) > 0) {
    const n = count("interrupt", 1), en = `${n} time${n === 1 ? "" : "s"}`;
    if (!chips.some((c) => c === "block" || c === "sidestep" || c === "hop")) return { zh: `你蓄力时被对手打断了 ${n} 次：它看你蓄力就先咬一口。装「格挡」或「闪身」，先防它这一下。`, en: `You were interrupted ${en} while winding up: it bites into your wind-up. Add Block or Sidestep to answer that.` };
    const d = chips.find((c) => c === "block" || c === "sidestep" || c === "hop")!;
    if (above("bite", d)) return { zh: `你蓄力时被对手打断了 ${n} 次。「先咬」排在「${TACTICS[d].zh}」上面，防守芯片轮不到：把「${TACTICS[d].zh}」挪到最上面。`, en: `You were interrupted ${en}. Bite sits above ${TACTICS[d].en}, so the defence never gets a turn: move ${TACTICS[d].en} to the top.` };
    return { zh: `你蓄力时被对手打断了 ${n} 次。贴得太近时它总比你快：试试「后跳」拉开，或者装「硬甲」扛住。`, en: `You were interrupted ${en}. Up close it is faster than you: try Hop back for space, or a Shell to take it.` };
  }
  return res.how === "ko"
    ? { zh: `${secs} 秒被击倒：咬中 ${landed[0]} 口，被咬中 ${landed[1]} 口。对手更强壮或者更会挑时机，试试身体装备。`, en: `Knocked out in ${secs} s: ${landed[0]} bites landed against ${landed[1]}. The rival is tougher or times it better; try body parts.` }
    : { zh: `时间到，对手剩的血更多。咬中 ${landed[0]} 口，被咬中 ${landed[1]} 口。`, en: `Time, and the rival had more health left: ${landed[0]} bites landed against ${landed[1]}.` };
}

/* ── an automatic designer (offline, for the AI rivals) ──────────────────── */

export function strength(chips: readonly TacticId[], gear: readonly GearId[], pool: Rival[], seeds = 6, salt = 0): number {
  let s = 0;
  // wins first, then how decisively: the share of health left over the rival's
  const me = bodyOf(gear);
  for (const p of pool) for (let k = 0; k < seeds; k++) {
    const f = fightRival(chips, gear, p, (0x9e37 + k * 7919 + salt * 104729) >>> 0, 0);
    s += f.winner === 0 ? 2 : f.winner === -1 ? 1 : 0;
    s += 0.5 * (f.result.hpLeft[0] / me.maxHp - f.result.hpLeft[1] / bodyOf(p.gear).maxHp);
  }
  return s;
}

export function design(budget: number, gearSlots: number, pool: Rival[], salt = 0): { chips: TacticId[]; gear: GearId[] } {
  let chips: TacticId[] = ["bite"], gear: GearId[] = [];
  let best = strength(chips, gear, pool, 6, salt);
  for (let pass = 0; pass < 10; pass++) {
    let improved = false;
    const cands: { chips: TacticId[]; gear: GearId[] }[] = [];
    for (const c of TACTIC_IDS) if (!chips.includes(c)) for (let at = 0; at <= chips.length; at++) cands.push({ chips: [...chips.slice(0, at), c, ...chips.slice(at)], gear });
    for (let i = 0; i < chips.length; i++) cands.push({ chips: chips.filter((_, j) => j !== i), gear });
    for (let i = 0; i + 1 < chips.length; i++) { const s = chips.slice(); [s[i], s[i + 1]] = [s[i + 1], s[i]]; cands.push({ chips: s, gear }); }
    if (gear.length < gearSlots) for (const g of PART_IDS) if (!gear.includes(g)) cands.push({ chips, gear: [...gear, g] });
    for (const c of cands) {
      if (report(c.chips).gates > budget) continue;
      const s = strength(c.chips, c.gear, pool, 6, salt);
      if (s > best) { best = s; chips = c.chips; gear = c.gear; improved = true; }
    }
    if (!improved) break;
  }
  return { chips, gear };
}

export const programCode = (chips: readonly TacticId[]) => encodeProgram(programOf(chips));

/** Every fight of the day's ladder with one brain and body, as the API serves it. */
export function ladder(date: string, program: Program, chips: readonly TacticId[] | null, gear: readonly GearId[]) {
  const c = compileFighter(program);
  const steps = RIVALS.map((rival, i) => {
    const budget = budgetFor(i), f = fightBrain(program, chips, gear, rival, seedFor(date, i), i);
    const tally: Record<string, number> = {};
    for (const e of f.result.events) if (e.by === 0) tally[e.kind] = (tally[e.kind] ?? 0) + 1;
    return {
      fight: i, rival: rival.name, ai: rival.ai, budget, withinBudget: c.gates <= budget, seed: f.seed,
      result: c.gates > budget ? "over budget" : f.winner === 0 ? "win" : f.winner === 1 ? "loss" : "draw",
      how: f.result.how, tieBreak: f.tieBreak, seconds: +(f.result.ticks / T.hz).toFixed(2),
      health: { you: +f.result.hpLeft[0].toFixed(1), rival: +f.result.hpLeft[1].toFixed(1) }, yourMoves: tally, why: f.why
    };
  });
  return { program: encodeProgram(program), gates: c.gates, depth: c.depth, cost: c.cost, gear, wins: steps.filter((s) => s.result === "win").length, steps };
}
export { bodyOf, MOVES } from "./duel";
