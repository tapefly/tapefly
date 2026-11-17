/* ── sim/workshop/levels.ts ──────────────────────────────────────────────────
   Workshop levels. Each runs the same design on one or more setups; a design
   clears the level only if it clears every setup.
   --------------------------------------------------------------------------- */
import type { PartKind, Design } from "./parts";
import type { Setup } from "./physics";

export interface Text { zh: string; en: string }

export interface WLevel {
  id: string;
  title: Text;
  brief: Text;
  lesson: Text;
  hints: Text[];
  /** eat: touch the sugar (any one, or all), then, with `stay`, survive that many seconds more;
      knock: move n cubes; home: eat all the sugar, then bring the core into the nest; free: sandbox */
  goal: { kind: "eat"; any?: boolean; stay?: number } | { kind: "knock"; n: number } | { kind: "home" } | { kind: "free" };
  /** 1 reflexes, 2 memory, 3 counting and rhythm, 0 sandbox */
  chapter: number;
  seconds: number;
  parts: PartKind[];
  budget: number;
  /** wiring and NOT unlocked */
  wiring: boolean;
  logic: boolean;
  /** what a tidy solution looks like: gates in the brain, and seconds over all setups.
      A reference design meets both, so both are always reachable. */
  par?: { gates: number; seconds: number };
  setups: Setup[];
  start?: Design;
}

const H = Math.PI / 2;
const arena = (w: number, h: number, extra: Partial<Setup>): Setup => ({
  w, h, start: { x: 3, y: h / 2, a: H }, walls: [], sugar: [], cubes: [], spiders: [], ...extra
});

const tower = (x0: number, y0: number, cols: number, rows: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) out.push([x0 + i * 0.86, y0 + j * 0.86]);
  return out;
};

const DOORS: [number, number][] = [[10, 14], [19, 23], [28, 32], [37, 41]];
/** A corridor along the bottom with n doors in its top wall, each opening into a tube.
    The sugar is at the top of tube `sugarAt`; a spider waits at the top of every other tube. */
function corridor(n: number, sugarAt: number, width = 34): Setup {
  const walls: Setup["walls"] = [];
  let x = 0;
  for (let i = 0; i < n; i++) { walls.push({ x, y: 0, w: DOORS[i][0] - x, h: 8 }); x = DOORS[i][1]; }
  walls.push({ x, y: 0, w: width - x, h: 8 });
  const sugar: Setup["sugar"] = [], spiders: Setup["spiders"] = [];
  for (let i = 0; i < n; i++) (i === sugarAt ? sugar : spiders).push({ x: (DOORS[i][0] + DOORS[i][1]) / 2, y: 2 });
  return { w: width, h: 12, start: { x: 2.5, y: 10, a: H }, walls, sugar, cubes: [], spiders };
}

const BRAIN_PARTS: PartKind[] = ["body", "wingS", "wingL", "weight"];

export const WLEVELS: WLevel[] = [
  {
    id: "liftoff",
    chapter: 1,
    title: { zh: "起飞", en: "Lift-off" },
    brief: {
      zh: "这只果蝇只有一个核心，飞不起来。给它装上翅膀：翅膀默认接在心跳上，一直在扇。糖就在正前方。",
      en: "This fly is only a core and cannot move. Give it wings: a new wing is wired to the heartbeat and always beats. The sugar is straight ahead."
    },
    lesson: {
      zh: "翅膀装在哪，推力就从哪推。左右一样多，就飞直线；只装一边，它会原地打转。",
      en: "A wing pushes from where it sits. Even on both sides flies straight; one side only spins in circles."
    },
    hints: [{ zh: "在核心左右各放一个小翅膀。", en: "Put a small wing on each side of the core." }],
    goal: { kind: "eat" },
    seconds: 12,
    parts: ["body", "wingS"],
    budget: 10,
    wiring: false,
    logic: false,
    par: { gates: 4, seconds: 6 },
    setups: [arena(26, 12, { sugar: [{ x: 22, y: 6 }] })]
  },
  {
    id: "sprint",
    chapter: 1,
    title: { zh: "冲刺", en: "Sprint" },
    brief: {
      zh: "糖在很远的地方，8 秒内必须吃到。两只小翅膀太慢，换成大翅膀也不够快。",
      en: "The sugar is far away and you have 8 seconds. Two small wings are too slow, and swapping in large wings is not enough either."
    },
    lesson: {
      zh: "推力要和重量一起算：大翅膀推得多，但也重得多。多装几只轻翅膀，推力/重量反而更高。",
      en: "Push only counts against weight: a large wing pushes more but also weighs more. Several light wings give a better push-to-weight."
    },
    hints: [
      { zh: "看右边的“推力 / 重量”：这个数越大，飞得越快。", en: "Watch ‘Thrust / weight’ on the right: the higher it is, the faster it flies." },
      { zh: "在核心两边各放两只小翅膀，一共四只。", en: "Put two small wings on each side of the core, four in all." }
    ],
    goal: { kind: "eat" },
    seconds: 8,
    parts: ["body", "wingS", "wingL"],
    budget: 12,
    wiring: false,
    logic: false,
    par: { gates: 8, seconds: 7 },
    setups: [arena(44, 12, { sugar: [{ x: 40, y: 6 }] })]
  },
  {
    id: "curve",
    chapter: 1,
    title: { zh: "绕过柱子", en: "Around the pillar" },
    brief: {
      zh: "糖在右上方，一根玻璃柱子正好挡在直线上。还没有眼睛，只能靠身体的形状飞出一条刚刚好的弧线。",
      en: "The sugar is up and to the right, and a glass pillar sits right on the straight line. No eyes yet: the shape of the body has to fly exactly the right curve."
    },
    lesson: {
      zh: "一边推力大、一边推力小，飞出来就是弧线。配重和翅膀的位置一起决定弧有多弯。",
      en: "More push on one side than the other makes a curve. Where the ballast and wings sit decides how tight."
    },
    hints: [
      { zh: "左边推得多，它会往右拐；右边推得多，往左拐。", en: "More push on the left turns it right; more on the right turns it left." },
      { zh: "试试一边大翅膀、一边小翅膀。", en: "Try a large wing on one side and a small one on the other." }
    ],
    goal: { kind: "eat", any: true },
    seconds: 14,
    parts: ["body", "wingS", "wingL", "weight"],
    budget: 14,
    wiring: false,
    logic: false,
    par: { gates: 4, seconds: 12 },
    setups: [arena(26, 17, { start: { x: 3, y: 14, a: H }, walls: [{ x: 10.8, y: 5.8, w: 2.4, h: 3.8 }], sugar: [{ x: 21, y: 2.5 }, { x: 22.2, y: 3.6 }, { x: 20.6, y: 4.1 }, { x: 21.8, y: 5.2 }, { x: 23, y: 2.2 }] })]
  },
  {
    id: "eyes",
    chapter: 1,
    title: { zh: "看见糖", en: "Seeing sugar" },
    brief: {
      zh: "这次糖的位置每次都不一样：左边、右边、正前方。固定的弧线不管用了。长出眼睛，用导线把眼睛接到翅膀上。",
      en: "This time the sugar moves: left, right or straight ahead. A fixed curve will not do. Grow eyes and wire them to the wings."
    },
    lesson: {
      zh: "左眼接右翅膀、右眼接左翅膀：糖在哪边，它就转向哪边。不用写一条规则，接线方式就是大脑。",
      en: "Left eye to right wing, right eye to left wing: it turns toward whichever side the sugar is on. No rules written; the wiring is the brain."
    },
    hints: [
      { zh: "在前面放两只眼睛，一只朝左前，一只朝右前（选中后按 R 转方向）。", en: "Put two eyes at the front, one aimed front-left and one front-right (select and press R to turn)." },
      { zh: "进入接线：左眼连到右边的翅膀，右眼连到左边的翅膀。", en: "In wiring mode connect the left eye to the right wing, the right eye to the left wing." },
      { zh: "翅膀可以去掉心跳那根线，只听眼睛的。", en: "You can remove a wing's heartbeat wire so it only listens to the eye." }
    ],
    goal: { kind: "eat" },
    seconds: 16,
    parts: ["body", "wingS", "wingL", "weight", "eye"],
    budget: 16,
    wiring: true,
    logic: false,
    par: { gates: 4, seconds: 22 },
    setups: [
      arena(24, 18, { sugar: [{ x: 20, y: 3 }] }),
      arena(24, 18, { sugar: [{ x: 20, y: 15 }] }),
      arena(24, 18, { sugar: [{ x: 20, y: 9 }] })
    ]
  },
  {
    id: "hunt",
    chapter: 1,
    title: { zh: "绕圈找糖", en: "Circle and hunt" },
    brief: {
      zh: "两块糖，一块在前面，一块在身后。吃完第一块，眼睛就什么都看不见了，只靠眼睛的果蝇会停在原地。",
      en: "Two sugars: one ahead, one behind. After the first, the eyes see nothing, and a fly that only listens to its eyes just stops."
    },
    lesson: {
      zh: "给一只翅膀接上心跳，它在没看到糖时就会绕圈：绕圈就是搜索。看到糖时眼睛再把它拉直。先有默认动作，再让感官去改它。",
      en: "Wire one wing to the heartbeat and it circles whenever it sees nothing: circling is searching. When an eye sees sugar it straightens out. A default action first, then senses that override it."
    },
    hints: [
      { zh: "左翅膀接心跳，一直扇：它会一直往右绕圈。", en: "Wire the left wing to the heartbeat so it always beats: it keeps circling right." },
      { zh: "在左前方放一只朝左前看的眼睛，接到右翅膀上：看到糖，右翅膀也扇，它就直直冲过去。", en: "Put an eye at front-left aimed front-left and wire it to the right wing: when it sees sugar both wings beat and it dives straight in." }
    ],
    goal: { kind: "eat" },
    seconds: 24,
    parts: ["body", "wingS", "wingL", "weight", "eye"],
    budget: 16,
    wiring: true,
    logic: false,
    par: { gates: 4, seconds: 30 },
    setups: [arena(26, 18, { sugar: [{ x: 20, y: 4 }, { x: 7, y: 15 }] }), arena(26, 18, { sugar: [{ x: 20, y: 14 }, { x: 7, y: 3 }] })]
  },
  {
    id: "tower",
    chapter: 1,
    title: { zh: "推倒糖塔", en: "Topple the tower" },
    brief: {
      zh: "一座方糖塔立在场地另一头。目标：14 秒内撞倒 20 块。快不够，还要重：配重让你撞得更狠。",
      en: "A tower of sugar cubes stands across the arena. Knock over 20 in 14 seconds. Speed is not enough; weight hits harder."
    },
    lesson: {
      zh: "动量 = 重量 × 速度。太轻会被弹回来，太重飞不快。最好的设计找到中间那个点。",
      en: "Momentum is weight times speed. Too light bounces off, too heavy is slow. The best designs find the middle."
    },
    hints: [
      { zh: "在核心前面放一块配重当撞角。", en: "Put ballast in front of the core as a ram." },
      { zh: "用大翅膀把速度提上去。", en: "Large wings get the speed up." }
    ],
    goal: { kind: "knock", n: 20 },
    seconds: 14,
    parts: ["body", "wingS", "wingL", "weight", "eye"],
    budget: 20,
    wiring: true,
    logic: false,
    par: { gates: 4, seconds: 10 },
    setups: [arena(28, 14, { cubes: tower(20, 4.4, 6, 6) })]
  },
  {
    id: "tower2",
    chapter: 1,
    title: { zh: "大糖塔", en: "The big tower" },
    brief: {
      zh: "一座大三倍的糖塔：16 秒内撞倒 60 块。上一关的撞角太弱，但配重堆太多又飞不动。",
      en: "A tower three times the size: knock over 60 cubes in 16 seconds. Last level's ram is too weak, and too much ballast will not fly."
    },
    lesson: {
      zh: "撞得狠靠重量，飞得快靠推力，两者要配平。最好的解法刚好够重、刚好够快。",
      en: "Hitting hard takes weight, flying fast takes push, and the two have to balance. The best design is just heavy enough and just fast enough."
    },
    hints: [
      { zh: "撞角只用一块配重。", en: "Use a single block of ballast as the ram." },
      { zh: "两边各两只大翅膀。", en: "Two large wings on each side." }
    ],
    goal: { kind: "knock", n: 60 },
    seconds: 16,
    parts: ["body", "wingS", "wingL", "weight", "eye"],
    budget: 18,
    wiring: true,
    logic: false,
    par: { gates: 8, seconds: 7 },
    setups: [arena(30, 16, { cubes: tower(20, 3.4, 8, 10) })]
  },
  {
    id: "wall",
    chapter: 1,
    title: { zh: "撞墙就拐", en: "Bounce off" },
    brief: {
      zh: "糖在一道长墙的后面，眼睛隔着墙看不见。长出触角：碰到墙就让一边的翅膀停下来，它就会拐弯沿着墙走。",
      en: "The sugar is behind a long wall and eyes cannot see through it. Grow antennae: when one touches the wall, stop a wing and it turns along the wall."
    },
    lesson: {
      zh: "“反过来”的导线就是一个 NOT 门：触角碰到墙时翅膀反而停下。你刚刚用 NAND 搭出了一个反射。",
      en: "An inverted wire is a NOT gate: the wing stops when the antenna touches. You just built a reflex out of NAND."
    },
    hints: [
      { zh: "在前面装一个朝前的触角。", en: "Put a forward-facing antenna at the front." },
      { zh: "把触角接到一边的翅膀上，点一下导线中间把它变成“反过来”。", en: "Wire the antenna to one wing, then click the wire's middle to invert it." },
      { zh: "眼睛照样接，看到糖再冲过去。", en: "Keep the eyes wired too, so it dives for the sugar once it can see it." }
    ],
    goal: { kind: "eat" },
    seconds: 28,
    parts: ["body", "wingS", "wingL", "weight", "eye", "antenna"],
    budget: 20,
    wiring: true,
    logic: true,
    par: { gates: 2, seconds: 22 },
    setups: [arena(26, 18, { start: { x: 3, y: 14, a: H }, walls: [{ x: 13, y: 7, w: 1.6, h: 11 }], sugar: [{ x: 20, y: 14 }] })]
  },
  {
    id: "spider",
    chapter: 1,
    title: { zh: "别惹蜘蛛", en: "Mind the spider" },
    brief: {
      zh: "蜘蛛守在糖旁边。一碰到它就完了。长出蛛感毛：感觉到蜘蛛时，让翅膀改主意。",
      en: "A spider guards the sugar. Touch it and it is over. Grow spider hair: when it feels the spider, make the wings change their mind."
    },
    lesson: {
      zh: "“全部”模式就是 AND：看到糖、而且没感觉到蜘蛛，才冲过去。两个反射拼起来，就是判断。",
      en: "‘All’ mode is AND: dive only when it sees sugar and does not feel the spider. Two reflexes combined make a judgement."
    },
    hints: [
      { zh: "把蛛感毛朝前装，接到一边翅膀上，并设成“反过来”。", en: "Aim the spider hair forward, wire it inverted to one wing." },
      { zh: "把那只翅膀的模式改成“全部”：眼睛看到糖，而且没有蜘蛛，才推。", en: "Set that wing to ‘all’: it pushes only when the eye sees sugar and there is no spider." }
    ],
    goal: { kind: "eat" },
    seconds: 18,
    parts: ["body", "wingS", "wingL", "weight", "eye", "antenna", "hair"],
    budget: 22,
    wiring: true,
    logic: true,
    par: { gates: 5, seconds: 9 },
    setups: [arena(26, 18, { sugar: [{ x: 21, y: 4 }], spiders: [{ x: 14, y: 9 }] })]
  },
  {
    id: "spiders",
    chapter: 1,
    title: { zh: "绕开蜘蛛", en: "Around the spider" },
    brief: {
      zh: "蜘蛛就蹲在去糖的直线上。直冲会被抓，只躲开又会找不到糖。",
      en: "The spider sits right on the straight line to the sugar. Diving straight in gets caught; only dodging loses the sugar."
    },
    lesson: {
      zh: "两个“反过来”的反射一起工作：一个感觉到蜘蛛就偏开，一个看见糖就拐回来。行为是两条规则叠出来的，不是写出来的。",
      en: "Two inverted reflexes at once: one veers off when it feels the spider, one turns back when it sees the sugar. The behaviour comes from stacking two rules, not from writing one."
    },
    hints: [
      { zh: "在右前方装一根朝前的蛛感毛，反过来接到右翅膀：感觉到蜘蛛，右翅膀停，它就往右偏开。", en: "Put a forward spider hair at front-right, wired inverted to the right wing: feeling the spider stops the right wing and it veers right." },
      { zh: "在右边装一只朝左看的眼睛，反过来接到左翅膀：看到糖在左边，左翅膀停，它就拐回去。", en: "Put an eye on the right aimed left, wired inverted to the left wing: seeing sugar on the left stops the left wing and it turns back." }
    ],
    goal: { kind: "eat" },
    seconds: 20,
    parts: ["body", "wingS", "wingL", "weight", "eye", "antenna", "hair"],
    budget: 24,
    wiring: true,
    logic: true,
    par: { gates: 2, seconds: 20 },
    setups: [arena(26, 18, { sugar: [{ x: 22, y: 9 }], spiders: [{ x: 13, y: 9 }] }), arena(26, 18, { sugar: [{ x: 22, y: 7 }], spiders: [{ x: 13, y: 7.5 }] })]
  },
  /* ── chapter 2: memory ─────────────────────────────────────────────────── */
  {
    id: "full",
    chapter: 2,
    title: { zh: "吃饱就停", en: "Stop when full" },
    brief: {
      zh: "糖在正前方，糖后面睡着一只蜘蛛。吃到糖以后必须停下来，安安静静待 4 秒。嘴只在吃到的那一瞬间有感觉，一松口就忘了。",
      en: "The sugar is straight ahead and a spider sleeps just past it. After eating, stop and stay still for 4 seconds. The mouth only feels the moment it eats, then forgets."
    },
    lesson: {
      zh: "记忆格把一瞬间变成一直：嘴碰一下“记住”，它就一直是开。你刚用 NAND 搭了一位寄存器。",
      en: "A memory cell turns a moment into ‘from now on’: one touch on ‘set’ and it stays on. You just built a one-bit register out of NAND."
    },
    hints: [
      { zh: "在身上放一张嘴和一个记忆格，把嘴接到记忆格上（默认就是“记住”）。", en: "Add a mouth and a memory cell, and wire the mouth into the memory (it goes to ‘set’ by default)." },
      { zh: "把记忆格反过来接到两只翅膀上，翅膀改成“全部”：有心跳、而且还没吃过，才扇。", en: "Wire the memory inverted into both wings and set them to ‘all’: beat while there is a heartbeat and it has not eaten yet." }
    ],
    goal: { kind: "eat", stay: 4 },
    seconds: 12,
    parts: [...BRAIN_PARTS, "mouth", "memory"],
    budget: 16,
    wiring: true,
    logic: true,
    par: { gates: 8, seconds: 8 },
    setups: [arena(26, 12, { start: { x: 3, y: 6, a: H }, sugar: [{ x: 14, y: 6 }], spiders: [{ x: 20.5, y: 6 }] })]
  },
  {
    id: "fullsee",
    chapter: 2,
    title: { zh: "看见，吃到，停下", en: "See it, eat it, stop" },
    brief: {
      zh: "糖可能在上、在下、在前面，四周都守着蜘蛛。用眼睛找到它，吃到以后立刻停住，待满 4 秒。",
      en: "The sugar may be up, down or ahead, ringed by spiders. Find it with your eyes, then stop dead once you eat and stay 4 seconds."
    },
    lesson: {
      zh: "同一副眼睛，吃之前和吃之后要做完全不同的事：吃之前追糖，吃之后什么都不做。没有记忆，眼睛分不清这两个时刻。",
      en: "The same eyes must do opposite things before and after eating: chase, then nothing at all. Without memory the eyes cannot tell those two moments apart."
    },
    hints: [
      { zh: "眼睛照「看见糖」那一关那样交叉接到翅膀上。", en: "Cross the eyes into the wings as in ‘Seeing sugar’." },
      { zh: "嘴接记忆格，记忆格反过来接到两只翅膀，翅膀改成“全部”：看到糖、而且还没吃过，才扇。", en: "Mouth into a memory cell, memory inverted into both wings, wings on ‘all’: beat only when an eye sees sugar and it has not eaten yet." }
    ],
    goal: { kind: "eat", stay: 4 },
    seconds: 14,
    parts: [...BRAIN_PARTS, "mouth", "memory", "eye"],
    budget: 20,
    wiring: true,
    logic: true,
    par: { gates: 7, seconds: 28 },
    setups: [4.5, 11.5, 8].map((sy) => arena(26, 16, { start: { x: 3, y: 8, a: H }, sugar: [{ x: 15, y: sy }], spiders: [{ x: 15, y: sy - 3.6 }, { x: 15, y: sy + 3.6 }, { x: 18.2, y: sy }] }))
  },
  {
    id: "home",
    chapter: 2,
    title: { zh: "掉头回家", en: "Bring it home" },
    brief: {
      zh: "吃到糖还不算完：把糖带回窝里。糖有时近、有时远。鼻子只能闻到正前方一小片里的窝。",
      en: "Eating is not the end: bring it back to the nest. The sugar is sometimes near, sometimes far. A nose only smells the nest in a narrow cone straight ahead."
    },
    lesson: {
      zh: "同一副身体，记忆格让它有了两种状态：出门找糖，吃到后回家。状态 + 感官，就是一个最小的状态机。",
      en: "The same body now has two modes: go out, then come home. A state plus senses is the smallest state machine."
    },
    hints: [
      { zh: "吃到糖以后，让一边的翅膀停下，它就会原地掉头。", en: "After eating, stop one wing and it turns round." },
      { zh: "在最前面装一个鼻子：一闻到窝，就让停下的那只翅膀重新扇起来，直直飞回去。", en: "Put a nose at the very front: when it smells the nest, restart the stopped wing so it flies straight home." },
      { zh: "那只翅膀用“任意一个”：还没吃（记忆反过来）或者闻到窝，就扇。", en: "Give that wing ‘any’: beat if it has not eaten (memory inverted) or the nose smells the nest." }
    ],
    goal: { kind: "home" },
    seconds: 28,
    parts: [...BRAIN_PARTS, "mouth", "memory", "nose"],
    budget: 18,
    wiring: true,
    logic: true,
    par: { gates: 8, seconds: 56 },
    setups: [
      arena(26, 16, { start: { x: 4, y: 8, a: H }, nest: { x: 4, y: 8 }, sugar: [{ x: 18, y: 8 }] }),
      arena(26, 16, { start: { x: 4, y: 8, a: H }, nest: { x: 4, y: 8 }, sugar: [{ x: 12, y: 8 }] }),
      arena(26, 16, { start: { x: 4, y: 8, a: H }, nest: { x: 4, y: 8 }, sugar: [{ x: 22, y: 8 }] })
    ]
  },
  {
    id: "fetch",
    chapter: 2,
    title: { zh: "找到再回家", en: "Find it, fetch it" },
    brief: {
      zh: "糖不在正前方了：可能在左上、左下、正前。先用眼睛找到它，吃完再用鼻子回家。逻辑块已经解锁。",
      en: "The sugar is no longer straight ahead: up, down or ahead. Find it with eyes, then come home by nose. Logic blocks are unlocked."
    },
    lesson: {
      zh: "两套反射，一位记忆决定此刻听哪一套。门数最少的解法会用到“或”和“而且”的换算，比拼的就是电路设计。",
      en: "Two sets of reflexes, and one bit decides which one is in charge. The fewest-gates solutions trade ANDs for ORs: this is circuit design."
    },
    hints: [
      { zh: "眼睛照「看见糖」那一关那样交叉接。", en: "Cross the eyes as in ‘Seeing sugar’." },
      { zh: "吃到糖之前鼻子闻不到窝（窝在身后），所以可以让鼻子和眼睛共用一只翅膀。", en: "Before eating the nose cannot smell the nest (it is behind), so the nose and an eye can share a wing." },
      { zh: "想更清楚，就用逻辑块：（眼睛 而且 没吃）或者（鼻子 而且 吃了）。", en: "For clarity use logic blocks: (eye AND not eaten) OR (nose AND eaten)." }
    ],
    goal: { kind: "home" },
    seconds: 36,
    parts: [...BRAIN_PARTS, "eye", "mouth", "memory", "nose", "gate"],
    budget: 26,
    wiring: true,
    logic: true,
    par: { gates: 8, seconds: 75 },
    setups: [
      arena(26, 18, { start: { x: 4, y: 9, a: H }, nest: { x: 4, y: 9 }, sugar: [{ x: 19, y: 3 }] }),
      arena(26, 18, { start: { x: 4, y: 9, a: H }, nest: { x: 4, y: 9 }, sugar: [{ x: 19, y: 15 }] }),
      arena(26, 18, { start: { x: 4, y: 9, a: H }, nest: { x: 4, y: 9 }, sugar: [{ x: 21, y: 9 }] })
    ]
  },
  {
    id: "homehunt",
    chapter: 2,
    title: { zh: "糖在身后", en: "Behind you" },
    brief: {
      zh: "这次果蝇从窝里出发，糖在它身后，一开始什么都看不见。先找到糖，吃完再回窝。",
      en: "This time the fly starts in its nest with the sugar behind it, seeing nothing at first. Find the sugar, eat it, then come home."
    },
    lesson: {
      zh: "三种状态：没看到就绕圈、看到就冲、吃完就闻着回家。「绕圈找糖」的绕圈和「找到再回家」的回家，拼在一起就是一次完整的觅食。",
      en: "Three modes: circle when blind, dive when it sees, smell its way home once fed. ‘Circle and hunt’ and ‘Find it, fetch it’ together make one whole foraging trip."
    },
    hints: [
      { zh: "从「找到再回家」那一关的设计开始。", en: "Start from your ‘Find it, fetch it’ design." },
      { zh: "给右翅膀再加一根心跳线：什么都没看到时它会绕圈。", en: "Add a heartbeat wire to the right wing: with nothing in sight it circles." }
    ],
    goal: { kind: "home" },
    seconds: 40,
    parts: [...BRAIN_PARTS, "eye", "mouth", "memory", "nose", "gate"],
    budget: 26,
    wiring: true,
    logic: true,
    par: { gates: 11, seconds: 52 },
    setups: [
      arena(26, 18, { start: { x: 13, y: 9, a: H }, nest: { x: 13, y: 9 }, sugar: [{ x: 4, y: 4 }] }),
      arena(26, 18, { start: { x: 13, y: 9, a: H }, nest: { x: 13, y: 9 }, sugar: [{ x: 4, y: 14 }] })
    ]
  },
  /* ── chapter 3: counting and rhythm ────────────────────────────────────── */
  {
    id: "door2",
    chapter: 3,
    title: { zh: "第二扇门", en: "The second door" },
    brief: {
      zh: "走廊上方有两扇门。第一扇门后面是蜘蛛，第二扇门后面是糖。眼睛看不到门后。触角能摸出哪里有门：摸不到墙，就是门。",
      en: "Two doors open off the corridor. A spider waits behind the first, sugar behind the second. Eyes cannot see in. An antenna can feel a door: no wall means a doorway."
    },
    lesson: {
      zh: "翻转格每遇到一扇门翻一次面：它数的是“变化”，不是“状态”。这就是数字电路里的边沿检测。",
      en: "The toggle flips at every door: it counts changes, not states. That is edge detection, the heart of digital counters."
    },
    hints: [
      { zh: "在左前方装一个朝左的触角，它沿着上面的墙摸。别忘了右边配一个一样重的零件保持平衡。", en: "Put a left-facing antenna at front-left to feel the top wall. Balance it with an equal part on the right." },
      { zh: "把触角反过来接进翻转格：每到一扇门，翻转格翻一次。", en: "Wire the antenna inverted into a toggle: it flips at every doorway." },
      { zh: "左翅膀用“任意一个”：触角摸到墙，或者翻转格是开。第二扇门时两个都是关，左翅膀停，它就左拐进门。", en: "Left wing on ‘any’: the antenna feels wall, or the toggle is on. At the second door both are off, the left wing stops and it turns in." }
    ],
    goal: { kind: "eat" },
    seconds: 22,
    parts: [...BRAIN_PARTS, "antenna", "memory", "gate", "toggle"],
    budget: 22,
    wiring: true,
    logic: true,
    par: { gates: 12, seconds: 15 },
    setups: [corridor(2, 1)]
  },
  {
    id: "door3",
    chapter: 3,
    title: { zh: "数到三", en: "Count to three" },
    brief: {
      zh: "三扇门，糖在第三扇后面，前两扇后面都是蜘蛛。一个翻转格只能数到二。",
      en: "Three doors, sugar behind the third, spiders behind the first two. One toggle only counts to two."
    },
    lesson: {
      zh: "两个翻转格串起来就是一个两位计数器：第一个每扇门翻一次，第二个在第一个变成开时翻一次。你刚做了一个二进制计数器。",
      en: "Two toggles in a chain are a two-bit counter: the first flips at every door, the second each time the first turns on. You just built a binary counter."
    },
    hints: [
      { zh: "第二个翻转格的输入，接第一个翻转格的输出。", en: "Feed the first toggle's output into the second toggle." },
      { zh: "写出每扇门时两个翻转格的状态：第一扇（开，开），第二扇（关，开），第三扇（开，关）。", en: "Write down both toggles at each door: first (on, on), second (off, on), third (on, off)." },
      { zh: "左翅膀“任意一个”：摸到墙，或者第一个是关，或者第二个是开。", en: "Left wing on ‘any’: feels wall, or the first is off, or the second is on." }
    ],
    goal: { kind: "eat" },
    seconds: 26,
    parts: [...BRAIN_PARTS, "antenna", "memory", "gate", "toggle"],
    budget: 24,
    wiring: true,
    logic: true,
    par: { gates: 23, seconds: 19 },
    setups: [corridor(3, 2)]
  },
  {
    id: "door4",
    chapter: 3,
    title: { zh: "数到四", en: "Count to four" },
    brief: {
      zh: "四扇门，糖在第四扇后面。还是只有两个翻转格。",
      en: "Four doors, sugar behind the fourth. Still only two toggles."
    },
    lesson: {
      zh: "两位能数四个数：（开，开）（关，开）（开，关）（关，关）。第四扇门正好是两个都关的那一次。计数器的位数决定它能数多远。",
      en: "Two bits count four states: (on, on), (off, on), (on, off), (off, off). The fourth door is exactly the one where both are off. A counter's width decides how far it counts."
    },
    hints: [
      { zh: "计数器和上一关一样接。", en: "Wire the counter as in the last level." },
      { zh: "左翅膀“任意一个”：摸到墙，或者第一个是开，或者第二个是开。只有两个都关时它才停。", en: "Left wing on ‘any’: feels wall, or the first is on, or the second is on. It stops only when both are off." }
    ],
    goal: { kind: "eat" },
    seconds: 34,
    parts: [...BRAIN_PARTS, "antenna", "memory", "gate", "toggle"],
    budget: 24,
    wiring: true,
    logic: true,
    par: { gates: 22, seconds: 22 },
    setups: [corridor(4, 3, 46)]
  },
  {
    id: "two",
    chapter: 3,
    title: { zh: "吃两块就停", en: "Two bites, then stop" },
    brief: {
      zh: "一条直线上有两块糖，第二块后面睡着一只蜘蛛。两块都要吃，吃完第二块才能停，待满 4 秒。",
      en: "Two sugars in a line, a spider asleep past the second. Eat both, stop only after the second, and stay 4 seconds."
    },
    lesson: {
      zh: "记忆格吃到第一块就会停下，太早了。翻转格数的是口数：第一个翻转格每吃一口翻一次，第二个在第一个变回关时翻。电路里的计数，和数门是一回事。",
      en: "A memory cell would stop at the first bite, too soon. Toggles count bites: the first flips at every bite, the second when the first turns back off. Counting bites is the same circuit as counting doors."
    },
    hints: [
      { zh: "嘴接第一个翻转格。", en: "Wire the mouth into the first toggle." },
      { zh: "第一个翻转格反过来接第二个：第一个从开变关，第二个就翻成开。", en: "Feed the first toggle inverted into the second: when the first goes from on to off, the second turns on." },
      { zh: "第二个翻转格反过来接两只翅膀，翅膀改成“全部”。", en: "Wire the second toggle inverted into both wings and set them to ‘all’." }
    ],
    goal: { kind: "eat", stay: 4 },
    seconds: 16,
    parts: [...BRAIN_PARTS, "mouth", "memory", "gate", "toggle"],
    budget: 20,
    wiring: true,
    logic: true,
    par: { gates: 21, seconds: 9 },
    setups: [arena(30, 12, { start: { x: 3, y: 6, a: H }, sugar: [{ x: 11, y: 6 }, { x: 18, y: 6 }], spiders: [{ x: 24, y: 6 }] })]
  },
  {
    id: "glass",
    chapter: 3,
    title: { zh: "玻璃糖", en: "Glass sugar" },
    brief: {
      zh: "这块糖是玻璃做的：撞上去的速度超过 1.6 就会碎。预算很紧，堆不了一身配重。节拍器能让翅膀一开一关。",
      en: "This sugar is glass: touch it faster than 1.6 and it shatters. The budget is too tight to pile on weight. A metronome can pulse the wings."
    },
    lesson: {
      zh: "让翅膀只在一部分时间里扇，平均推力就变小。节拍器加一个翻转格，就是把频率减半的分频器。",
      en: "Beat the wings only part of the time and the average push drops. A metronome plus a toggle halves the frequency: a clock divider."
    },
    hints: [
      { zh: "把节拍器接到两只翅膀上，看看够不够慢。", en: "Wire the metronome into both wings and see if that is slow enough." },
      { zh: "还是太快的话：加一块身体变重一点，或者用翻转格把节拍再减半。", en: "Still too fast: add a body block for weight, or halve the beat again with a toggle." }
    ],
    goal: { kind: "eat" },
    seconds: 26,
    parts: ["body", "wingS", "wingL", "clock", "toggle", "memory", "gate"],
    budget: 8,
    wiring: true,
    logic: true,
    par: { gates: 4, seconds: 12 },
    setups: [arena(26, 12, { start: { x: 3, y: 6, a: H }, sugar: [{ x: 21, y: 6 }], fragile: 1.6 })]
  },
  {
    id: "glass2",
    chapter: 3,
    title: { zh: "更脆的玻璃糖", en: "Thinner glass" },
    brief: {
      zh: "玻璃更薄了：撞上去超过 1.0 就碎。把节拍减半也还是太快。",
      en: "Thinner glass: anything faster than 1.0 shatters it. Halving the beat is still too fast."
    },
    lesson: {
      zh: "节拍器和它的一半再“而且”一下，翅膀只在四分之一的时间里扇：这就是占空比。芯片里控制电机快慢，用的就是这一招。",
      en: "AND the metronome with its own half and the wings beat a quarter of the time: that is a duty cycle. Chips set a motor's speed with exactly this trick."
    },
    hints: [
      { zh: "节拍器接一个翻转格：翻转格就是慢一半的节拍。", en: "Feed the metronome into a toggle: the toggle is the beat at half speed." },
      { zh: "节拍器和翻转格都接到两只翅膀上，翅膀改成“全部”。", en: "Wire both the metronome and the toggle into both wings and set the wings to ‘all’." }
    ],
    goal: { kind: "eat" },
    seconds: 34,
    parts: ["body", "wingS", "wingL", "clock", "toggle", "memory", "gate"],
    budget: 8,
    wiring: true,
    logic: true,
    par: { gates: 12, seconds: 31 },
    setups: [arena(30, 12, { start: { x: 3, y: 6, a: H }, sugar: [{ x: 25, y: 6 }], fragile: 1.0 })]
  },
  /* ── sandbox ───────────────────────────────────────────────────────────── */
  {
    id: "sandbox",
    chapter: 0,
    title: { zh: "沙盒", en: "Sandbox" },
    brief: {
      zh: "所有零件，几乎不限预算，没有目标。挑一个场地，随便搭，随便飞。",
      en: "Every part, almost no budget limit, no goal. Pick an arena, build anything, fly it."
    },
    lesson: { zh: "", en: "" },
    hints: [],
    goal: { kind: "free" },
    seconds: 60,
    parts: ["body", "wingS", "wingL", "weight", "eye", "antenna", "hair", "mouth", "nose", "gate", "memory", "toggle", "clock"],
    budget: 99,
    wiring: true,
    logic: true,
    setups: [
      arena(30, 18, { start: { x: 4, y: 9, a: H }, nest: { x: 4, y: 9 }, sugar: [{ x: 20, y: 4 }, { x: 24, y: 14 }, { x: 14, y: 12 }] }),
      arena(30, 16, { cubes: tower(20, 3.4, 8, 10) }),
      corridor(3, 1),
      arena(28, 18, { start: { x: 3, y: 15, a: H }, walls: [{ x: 9, y: 0, w: 1.4, h: 12 }, { x: 17, y: 6, w: 1.4, h: 12 }], sugar: [{ x: 24, y: 3 }], spiders: [{ x: 13.5, y: 4 }] })
    ]
  }
];
