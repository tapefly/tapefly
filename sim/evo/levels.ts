/* ── sim/evo/levels.ts ───────────────────────────────────────────────────────
   Chapter 1, Forage. Eight boards, each teaching one idea, each grown with one
   more organ than the last. Every level runs on several boards at once (the
   tests): a brain clears the level only if it clears every one, so a brain has
   to be a behaviour, not a memorised path.

   tests/evo.test.ts holds a brain for each level that clears it, so nothing in
   the chapter is impossible, and checks the starting brain does not.
   --------------------------------------------------------------------------- */
import type { Act, EvoProgram, FieldId } from "./brain";

export interface Text { zh: string; en: string }

export interface EvoLevel {
  id: string;
  chapter: number;
  title: Text;
  /** The situation, in two or three sentences. */
  brief: Text;
  /** The idea, said once the level is cleared. */
  lesson: Text;
  hints: Text[];
  /** Senses the fly has on this level. */
  senses: FieldId[];
  acts: Act[];
  /** Memory unlocked (rules may set it; `mem` is then also a sense). */
  memory: boolean;
  smellRange: number;
  limit: number;
  tests: string[][];
  start: EvoProgram;
  /** The organ this level grows, shown as the level's new toy. */
  grows?: { id: string; name: Text; text: Text };
}

const WAIT: EvoProgram = { rules: [], otherwise: { act: 0 } };
const FORWARD: EvoProgram = { rules: [], otherwise: { act: 1 } };

export const CHAPTERS: { n: number; title: Text; blurb: Text; open: boolean }[] = [
  { n: 1, title: { zh: "觅食", en: "Forage" }, blurb: { zh: "从一个什么都不会的大脑开始，长出触角、鼻子和记忆，学会自己找到吃的。", en: "Start with a brain that knows nothing. Grow antennae, a nose and a memory, and learn to find food on your own." }, open: true },
  { n: 2, title: { zh: "躲避", en: "Evade" }, blurb: { zh: "黄蜂在巡逻。长出复眼和翅膀，学会在被抓之前离开。", en: "Wasps patrol. Grow compound eyes and wings, and learn to leave before you are caught." }, open: false },
  { n: 3, title: { zh: "迷宫", en: "Maze" }, blurb: { zh: "一位的记忆不够了。用几位记忆走出没有尽头的迷宫。", en: "One bit of memory is no longer enough. Use a few to get out of mazes that never end." }, open: false },
  { n: 4, title: { zh: "群体", en: "Swarm" }, blurb: { zh: "同一个大脑，十只果蝇。让它们一起搬走一整块方糖。", en: "One brain, ten flies. Get them to carry off a whole sugar cube together." }, open: false },
  { n: 5, title: { zh: "对决", en: "Duel" }, blurb: { zh: "最后一章：你的大脑对别人的大脑。", en: "The last chapter: your brain against someone else's." }, open: false }
];

export const LEVELS: EvoLevel[] = [
  {
    id: "first-bite",
    chapter: 1,
    title: { zh: "第一口", en: "First bite" },
    brief: {
      zh: "这只果蝇刚孵出来，大脑里只有一条规则：等着。糖就在前面，它不会自己走过去。",
      en: "This fly has just hatched, and its brain has one rule: wait. The sugar is right ahead, and it will not walk there on its own."
    },
    lesson: {
      zh: "大脑就是一张表：每种情况对应一个动作。你改了“否则”那一格，同一个身体就过上了另一种日子。",
      en: "A brain is a table: every situation gets an action. Change the ‘otherwise’ cell and the same body lives a different day."
    },
    hints: [
      { zh: "点“否则”那一行的动作，把“等待”换成“前进”。", en: "Click the action on the ‘otherwise’ row and change ‘wait’ to ‘forward’." }
    ],
    senses: [],
    acts: [0, 1],
    memory: false,
    smellRange: 99,
    limit: 40,
    tests: [
      ["##########", "#>.....f.#", "##########"],
      ["############", "#>..f..f.ff#", "############"]
    ],
    start: WAIT
  },
  {
    id: "corner",
    chapter: 1,
    title: { zh: "拐角", en: "The corner" },
    brief: {
      zh: "走廊拐弯了。只会往前走的果蝇一头撞上墙，然后一直撞。给它长一对触角，碰到墙就转身。",
      en: "The corridor turns. A fly that only walks forward hits the wall and keeps hitting it. Grow it antennae, and turn when it touches a wall."
    },
    lesson: {
      zh: "规则从上往下读，第一条满足的说了算。“否则”只在一条都不满足时才轮到。",
      en: "Rules are read top to bottom, and the first that matches decides. ‘Otherwise’ only gets a turn when none does."
    },
    hints: [
      { zh: "加一条规则：前方有墙 → 右转。“否则”保持前进。", en: "Add a rule: wall ahead → turn right. Keep ‘otherwise’ on forward." }
    ],
    senses: ["wallF"],
    acts: [0, 1, 2, 3],
    memory: false,
    smellRange: 99,
    limit: 80,
    grows: {
      id: "antennae",
      name: { zh: "触角", en: "Antennae" },
      text: { zh: "能摸到正前方的墙。", en: "Feels a wall straight ahead." }
    },
    tests: [
      ["#######", "#>..f.#", "#####.#", "#f....#", "#######"],
      ["#########", "#>....f.#", "#######.#", "#.f...#f#", "#.#####.#", "#...f...#", "#########"]
    ],
    start: FORWARD
  },
  {
    id: "left-or-right",
    chapter: 1,
    title: { zh: "左还是右", en: "Left or right" },
    brief: {
      zh: "这条走廊往左拐也往右拐。只会右转的果蝇遇到左弯就掉头往回走。触角再长两根：左边、右边。",
      en: "This corridor turns both ways. A fly that only turns right turns back at the first left bend. Grow two more antennae: left and right."
    },
    lesson: {
      zh: "一个条件不够时，就把条件组合起来：“前面有墙、右边没墙”才是右弯。",
      en: "When one condition is not enough, combine them: ‘wall ahead and no wall on the right’ is what a right bend looks like."
    },
    hints: [
      { zh: "第一条：前方有墙 且 右边没墙 → 右转。", en: "First rule: wall ahead and no wall on the right → turn right." },
      { zh: "第二条：前方有墙 → 左转。顺序很重要。", en: "Second rule: wall ahead → turn left. Order matters." }
    ],
    senses: ["wallF", "wallL", "wallR"],
    acts: [0, 1, 2, 3],
    memory: false,
    smellRange: 99,
    limit: 90,
    grows: {
      id: "side-antennae",
      name: { zh: "侧触角", en: "Side antennae" },
      text: { zh: "能摸到左边和右边的墙。", en: "Feels walls to the left and right." }
    },
    tests: [
      ["#########", "#>.f#####", "###.#####", "###..f..#", "#######.#", "#f..f...#", "#########"],
      ["#########", "#####.f<#", "#####.###", "#..f..###", "#.#######", "#...f..f#", "#########"],
      ["##########", "#v########", "#.##f...##", "#f##.##.##", "#....##..#", "########f#", "##########"]
    ],
    start: { rules: [{ when: { wallF: 2 }, act: 3 }], otherwise: { act: 1 } }
  },
  {
    id: "scent",
    chapter: 1,
    title: { zh: "闻香", en: "Follow the scent" },
    brief: {
      zh: "开阔的空地，糖在哪里不一定。墙帮不上忙了。长一个鼻子：它告诉你最近的糖在前、后、左、右哪边。",
      en: "An open field, and the sugar could be anywhere. Walls are no help now. Grow a nose: it tells you whether the nearest sugar is ahead, behind, left or right."
    },
    lesson: {
      zh: "一个感官的每个取值，都可以对应一个动作。四个方向，四条规则。",
      en: "Every value of a sense can get its own action. Four directions, four rules."
    },
    hints: [
      { zh: "气味在左 → 左转，气味在右 → 右转，否则前进。", en: "Smell left → turn left, smell right → turn right, otherwise forward." },
      { zh: "气味在后面怎么办？随便转一边，下一步它就在左或右了。", en: "Smell behind? Turn either way; next tick it is on your left or right." }
    ],
    senses: ["wallF", "wallL", "wallR", "smell"],
    acts: [0, 1, 2, 3],
    memory: false,
    smellRange: 99,
    limit: 60,
    grows: {
      id: "nose",
      name: { zh: "鼻子", en: "Nose" },
      text: { zh: "闻到最近那块糖在哪个方向（前 / 右 / 后 / 左），闻不到就是“无”。", en: "Smells which way the nearest sugar is (ahead / right / behind / left), or ‘none’." }
    },
    tests: [
      ["###########", "#.........#", "#.......f.#", "#.........#", "#.........#", "#....^....#", "#.........#", "#.........#", "#.........#", "###########"],
      ["###########", "#.........#", "#.........#", "#.........#", "#.........#", "#....>....#", "#.........#", "#.........#", "#.f.......#", "###########"],
      ["###########", "#.........#", "#.........#", "#.........#", "#.........#", "#....v....#", "#.........#", "#.........#", "#.......f.#", "###########"],
      ["###########", "#f........#", "#.........#", "#.........#", "#.........#", "#....<....#", "#.........#", "#.........#", "#.........#", "###########"]
    ],
    start: FORWARD
  },
  {
    id: "table",
    chapter: 1,
    title: { zh: "一桌菜", en: "A full table" },
    brief: {
      zh: "糖撒了一地。鼻子总是指向最近的那块，所以吃完一块，下一块自然就有了方向。时间有限，看看能多快吃完。",
      en: "Sugar is scattered everywhere. The nose always points at the nearest one, so each meal leads to the next. Time is short; see how fast you can clear the table."
    },
    lesson: {
      zh: "同一个大脑，在不同的桌子上都管用，这才叫行为。步数是你的第二个分数：门少的大脑不一定走得快。",
      en: "One brain that works on every table is a behaviour. Steps are your second score: a brain with fewer gates does not always walk faster."
    },
    hints: [
      { zh: "上一关的大脑就能过。想更快？气味在后面时往哪边转，会影响绕多少路。", en: "Last level's brain clears it. Faster? Which way you turn when the smell is behind changes how far you walk." }
    ],
    senses: ["wallF", "wallL", "wallR", "smell"],
    acts: [0, 1, 2, 3],
    memory: false,
    smellRange: 99,
    limit: 120,
    tests: [
      ["###########", "#f.......f#", "#...f.....#", "#.........#", "#.....f...#", "#....^....#", "#..f......#", "#.........#", "#f.....f..#", "###########"],
      ["###########", "#.....f...#", "#.f.......#", "#.......f.#", "#...f.....#", "#....>....#", "#.......f.#", "#.f.......#", "#.....f...#", "###########"],
      ["###########", "#.f.f.f.f.#", "#.........#", "#.........#", "#.........#", "#....v....#", "#.........#", "#.........#", "#.f.f.f.f.#", "###########"]
    ],
    start: { rules: [], otherwise: { act: 1 } }
  },
  {
    id: "faint",
    chapter: 1,
    title: { zh: "气味很淡", en: "A faint scent" },
    brief: {
      zh: "这个房间很大，鼻子只能闻到 3 步以内的糖。闻不到的时候，果蝇得自己去找。",
      en: "This room is big, and the nose only reaches 3 steps. When it smells nothing, the fly has to go looking."
    },
    lesson: {
      zh: "好大脑既会利用信息，也会在没有信息时有个办法。“闻不到”本身也是一种情况。",
      en: "A good brain uses what it senses and also has a plan for when it senses nothing. ‘Smell: none’ is a situation too."
    },
    hints: [
      { zh: "闻不到时：沿着墙走一圈。前方有墙 → 右转，否则前进。", en: "Smell nothing: walk along the walls. Wall ahead → turn right, otherwise forward." },
      { zh: "闻到了就追，闻不到就巡逻。追的规则要放在巡逻规则上面。", en: "Chase what you smell, patrol when you smell nothing. Put the chase rules above the patrol rules." }
    ],
    senses: ["wallF", "wallL", "wallR", "smell"],
    acts: [0, 1, 2, 3],
    memory: false,
    smellRange: 3,
    limit: 200,
    tests: [
      ["#############", "#...........#", "#.f.........#", "#...........#", "#.........f.#", "#...........#", "#.....>.....#", "#...........#", "#..f........#", "#........f..#", "#...........#", "#############"],
      ["#############", "#..........f#", "#...........#", "#...........#", "#...........#", "#...f.......#", "#.....^.....#", "#...........#", "#.......f...#", "#...........#", "#f..........#", "#############"],
      ["#############", "#...........#", "#.....f.....#", "#...........#", "#...........#", "#.f.........#", "#.....<...f.#", "#...........#", "#...........#", "#.....f.....#", "#...........#", "#############"]
    ],
    start: { rules: [{ when: { smell: 0b00100 }, act: 3 }, { when: { smell: 0b10000 }, act: 2 }, { when: { smell: 0b01000 }, act: 3 }], otherwise: { act: 1 } }
  },
  {
    id: "webs",
    chapter: 1,
    title: { zh: "蛛网", en: "Webs" },
    brief: {
      zh: "糖和果蝇之间挂着蜘蛛网，走进去就出不来。长一只眼睛，看得见正前方的网。光会转身还不够：一转回来，网又挡在前面。再长一位记忆。",
      en: "Spider webs hang between the fly and the sugar, and a fly that walks in never leaves. Grow an eye that sees a web straight ahead. Turning away is not enough: turn back and the web is still there. Grow one bit of memory too."
    },
    lesson: {
      zh: "一位记忆就能把反射变成计划：“我刚躲开了网，下一步先往旁边走一格，再听鼻子的。”",
      en: "One bit of memory turns a reflex into a plan: ‘I just dodged a web, so take one step sideways first, then listen to the nose.’"
    },
    hints: [
      { zh: "前方有网 → 右转，并把记忆设成 1（意思是“正在绕”）。这条放最上面。", en: "Web ahead → turn right and set memory to 1 (‘dodging’). Put it on top." },
      { zh: "记忆是 1 → 前进一格，并把记忆清回 0。", en: "Memory is 1 → step forward and clear memory back to 0." },
      { zh: "剩下的还是闻香的老规则。", en: "The rest are your old scent rules." }
    ],
    senses: ["wallF", "wallL", "wallR", "smell", "web", "mem"],
    acts: [0, 1, 2, 3],
    memory: true,
    smellRange: 99,
    limit: 150,
    grows: {
      id: "eye-memory",
      name: { zh: "眼睛 + 记忆", en: "Eye + memory" },
      text: { zh: "眼睛：看得见正前方那一格有没有网。记忆：一位，规则可以把它设成 0 或 1，下一步读得到。", en: "Eye: sees whether the cell ahead holds a web. Memory: one bit a rule can set to 0 or 1, read on the next tick." }
    },
    tests: [
      ["###########", "#.........#", "#....f....#", "#.........#", "#....x....#", "#.........#", "#....^....#", "#.........#", "###########"],
      ["###########", "#.........#", "#.f.x.....#", "#.........#", "#....x....#", "#.........#", "#.x..>....#", "#.........#", "###########"],
      ["###########", "#.....f...#", "#...x.....#", "#.........#", "#.......x.#", "#..f.x....#", "#....<....#", "#.........#", "###########"]
    ],
    start: { rules: [{ when: { smell: 0b10000 }, act: 2 }, { when: { smell: 0b01100 }, act: 3 }], otherwise: { act: 1 } }
  },
  {
    id: "garden",
    chapter: 1,
    title: { zh: "蛛网花园", en: "The web garden" },
    brief: {
      zh: "毕业考。花园里有矮墙、有网、有一地的糖，还有三块不同的地。一个大脑，三块地都要吃干净。",
      en: "The final test. The garden has low walls, webs and sugar everywhere, on three different plots. One brain has to clear all three."
    },
    lesson: {
      zh: "你从一个只会等待的大脑出发，现在它会找、会躲、会绕。整个大脑仍然只是一张 NAND 门电路，可以拿去 TapeOut 流片。",
      en: "You started with a brain that could only wait. Now it searches, dodges and detours. The whole brain is still one NAND circuit, ready to tape out on TapeOut."
    },
    hints: [
      { zh: "矮墙和网一样处理：前方有墙、而气味也在前方时，同样往旁边绕一格。", en: "Treat a low wall like a web: when the wall is ahead and so is the smell, step aside the same way." },
      { zh: "绕的那一步，前面要是又被挡住了，就再右转一次。", en: "If the sidestep is blocked too, turn right once more." }
    ],
    senses: ["wallF", "wallL", "wallR", "smell", "web", "mem"],
    acts: [0, 1, 2, 3],
    memory: true,
    smellRange: 99,
    limit: 300,
    tests: [
      ["#############", "#f....x....f#", "#...........#", "#..##...##..#", "#...x...x...#", "#.....^.....#", "#...........#", "#..f.##..f..#", "#.....x.....#", "#f.........f#", "#############"],
      ["#############", "#.....f.....#", "#.x.......x.#", "#....##.....#", "#.f.......f.#", "#....x>.x...#", "#...........#", "#.##.....##.#", "#.....f.....#", "#x....x....x#", "#############"],
      ["#############", "#f.x.....x.f#", "#...........#", "#..#..f..#..#", "#..#.....#..#", "#.....^.....#", "#...x...x...#", "#..f.....f..#", "#.....x.....#", "#...........#", "#############"]
    ],
    start: { rules: [{ when: { web: 2 }, act: 3, mem: 1 }, { when: { mem: 2 }, act: 1, mem: 0 }, { when: { smell: 0b10000 }, act: 2 }, { when: { smell: 0b01100 }, act: 3 }], otherwise: { act: 1 } }
  }
];

export const levelById = (id: string) => LEVELS.find((l) => l.id === id);
