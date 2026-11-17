/* Words the game uses, in both languages. */
import type { FieldId } from "@/sim/evo/brain";
import type { Run } from "@/sim/evo/world";

export type T = (zh: string, en: string) => string;

export const SENSE: Record<FieldId, { zh: string; en: string; icon: string; values: { zh: string; en: string }[] }> = {
  wallF: { zh: "前方", en: "Ahead", icon: "▲", values: [{ zh: "空", en: "open" }, { zh: "墙", en: "wall" }] },
  wallL: { zh: "左边", en: "Left", icon: "◀", values: [{ zh: "空", en: "open" }, { zh: "墙", en: "wall" }] },
  wallR: { zh: "右边", en: "Right", icon: "▶", values: [{ zh: "空", en: "open" }, { zh: "墙", en: "wall" }] },
  smell: {
    zh: "气味",
    en: "Smell",
    icon: "✿",
    values: [
      { zh: "无", en: "none" },
      { zh: "前", en: "ahead" },
      { zh: "右", en: "right" },
      { zh: "后", en: "behind" },
      { zh: "左", en: "left" }
    ]
  },
  web: { zh: "前方网", en: "Web ahead", icon: "✳", values: [{ zh: "没有", en: "no" }, { zh: "有", en: "yes" }] },
  mem: { zh: "记忆", en: "Memory", icon: "◉", values: [{ zh: "0", en: "0" }, { zh: "1", en: "1" }] }
};

export const ACT = [
  { zh: "等待", en: "Wait", glyph: "‖" },
  { zh: "前进", en: "Forward", glyph: "↑" },
  { zh: "左转", en: "Turn left", glyph: "↶" },
  { zh: "右转", en: "Turn right", glyph: "↷" }
];

export function outcomeLine(run: Run, t: T): { tone: "good" | "bad"; head: string; body: string } {
  const left = run.board.food.length - run.eaten;
  if (run.outcome === "cleared") return { tone: "good", head: t("吃光了", "Cleared"), body: t(`${run.ticks} 步吃完 ${run.eaten} 块糖。`, `${run.eaten} sugar in ${run.ticks} ticks.`) };
  if (run.outcome === "caught") return { tone: "bad", head: t("被网粘住了", "Caught in a web"), body: t(`第 ${run.ticks} 步。蜘蛛今晚加餐。`, `Tick ${run.ticks}. The spider eats well tonight.`) };
  if (run.outcome === "timeout") return { tone: "bad", head: t("时间到", "Out of time"), body: t(`还剩 ${left} 块糖没吃到。`, `${left} sugar left uneaten.`) };
  const seg = run.frames.slice(run.loopFrom + 1);
  const acts = seg.map((f) => f.out & 3);
  if (acts.every((a) => a === 0)) return { tone: "bad", head: t("它一动不动", "It will not move"), body: t("它决定就这样站着，直到永远。", "It has decided to stand here forever.") };
  if (seg.every((f) => f.event === "bump")) return { tone: "bad", head: t("它在撞墙", "It keeps hitting the wall"), body: t("它对着墙一直撞。墙赢了。", "It walks into the wall, again and again. The wall wins.") };
  if (acts.every((a) => a === 2 || a === 3 || a === 0)) return { tone: "bad", head: t("它在原地转圈", "It spins in place"), body: t("左转、右转、左转……它转晕了。", "Left, right, left… it is dizzy now.") };
  return { tone: "bad", head: t("它在绕圈子", "It is going in circles"), body: t(`从第 ${run.loopFrom} 步起，它一直在重复同一段路，再走下去也不会变。`, `From tick ${run.loopFrom} it repeats the same stretch, and it always will.`) };
}
