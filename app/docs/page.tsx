import Link from "next/link";
import { SiteNav, SiteFooter } from "../components/ui/Shell";
import { BRAIN } from "@/sim/netlist";
import { netDepth } from "@/sim/compile";
import { T, BASE, MOVES, DUEL_PROFILE } from "@/sim/duel";
import { TACTICS, TACTIC_IDS, PARTS, PART_IDS, RUN, BODY_SLOTS, RIVALS, budgetFor, report, aloneGates, type TacticId } from "@/sim/arena";
import config from "@/config/tapeout.json";
import { getLang, serverT } from "../i18n/server";
import { ANCHORS } from "@/sim/anchor";

/* Developer reference. Workshop is the public main game, while this page keeps
   the shipped Brain Brawl interface documentation available for API users and
   anyone checking the circuit/TapeOut claims. Rule for every sentence: either
   it can be checked on this site or on chain today, or it carries a Next /
   Planned tag. Numbers come from the code, not typed in. */

export async function generateMetadata() {
  const t = await serverT();
  return {
    title: t("开发者文档 — TapeFly", "Developer docs — TapeFly"),
    description: t("TapeFly 开发者文档：主游戏 Workshop，以及保留的 Brain Brawl 接口、NAND 电路、TapeOut、验证和 AI 智能体资料。",
      "TapeFly developer docs: the Workshop main game, plus the retained Brain Brawl interface, NAND circuits, TapeOut, verification and AI agent materials.")
  };
}

type State = "live" | "next" | "later";
const TAG: Record<State, [string, string]> = { live: ["已上线", "Live"], next: ["下一步", "Next"], later: ["计划中", "Planned"] };
const Tag = async ({ s }: { s: State }) => <span className={`dtag ${s}`}>{(await getLang()) === "zh" ? TAG[s][0] : TAG[s][1]}</span>;

const TOC: [string, string, string][] = [
  ["play", "一局怎么玩", "How a run works"],
  ["fight", "一场架怎么打", "How a fight works"],
  ["chips", "战术芯片", "Tactic chips"],
  ["body", "身体装备", "Body parts"],
  ["circuit", "大脑是真电路", "The brain is a circuit"],
  ["rivals", "对手", "Rivals"],
  ["fair", "公平与重放", "Fairness and replay"],
  ["tapeout", "建立在 TapeOut 上", "Built on TapeOut"],
  ["agents", "给 AI 智能体", "For AI agents"],
  ["economics", "经济模型", "Economics"],
  ["roadmap", "路线图", "Roadmap"],
  ["lab", "实验室与永生血统", "Lab and lineage"],
  ["promises", "我们不做什么", "What we won't do"],
  ["glossary", "术语表", "Glossary"],
  ["faq", "常见问题", "Questions"]
];

const EXAMPLES: TacticId[][] = [["bite"], ["block", "bite"], ["block", "punish", "bite"], ["sidestep", "punish", "flank", "bite"]];
const MOVE_ZH: Record<string, string> = { press: "逼近", back: "后撤", circle: "绕圈", guard: "举盾" };

export default async function DocsPage() {
  const t = await serverT();
  const zh = (await getLang()) === "zh";
  const live = config.status === "live";
  const sec = (ticks: number) => String(parseFloat((ticks / T.hz).toFixed(2)));
  const name = (c: TacticId) => (zh ? TACTICS[c].zh : TACTICS[c].en);
  const ex = EXAMPLES.map((chips) => ({ chips, r: report(chips) }));
  const S = (n: number) => String(n).padStart(2, "0");
  let k = 0;
  const H = (id: string, zhT: string, enT: string) => <h2 id={`${id}-h`}><span>{S(++k)}</span>{t(zhT, enT)}</h2>;
  const arc = Math.round((T.guardArc * 180) / Math.PI);
  const lastBudget = budgetFor(RIVALS.length - 1);

  return (
    <main>
      <SiteNav here="/docs" />
      <div className="page docs">
        <header className="docs-hero">
          <p className="kicker">{t("TapeFly 开发者文档", "TapeFly developer docs")}</p>
          <h1>{t("主游戏是工坊；接口与验证资料继续公开。", "Workshop is the main game; the interfaces and verification record stay public.")}</h1>
          <p className="lede">{t(
            "TapeFly 对外主游戏是 Workshop：拼装机器果蝇、接出大脑，再让它在物理关卡里自己行动。下面继续保留已交付的 Brain Brawl 开发者接口、NAND 电路、TapeOut 和 AI 智能体资料；这些内容仍有公开 URL，但不再出现在主游戏导航里。",
            "TapeFly's public main game is Workshop: assemble a robot fly, wire its brain and let it solve physics levels. The shipped Brain Brawl developer interface, NAND circuit, TapeOut and AI-agent material remain documented below at stable public URLs, but no longer appear in the main game navigation."
          )}</p>
          <div className="docs-stats">
            <div><b>{TACTIC_IDS.length}</b><span>{t("张战术芯片，顺序就是策略", "tactic chips; the order is the strategy")}</span></div>
            <div><b>{PART_IDS.length}</b><span>{t(`件身体装备，最多装 ${BODY_SLOTS} 件，不占门数`, `body parts, up to ${BODY_SLOTS}, no gates`)}</span></div>
            <div><b>{RIVALS.length}</b><span>{t(`个对手，门数预算从 ${budgetFor(0)} 涨到 ${lastBudget}`, `rivals; the gate budget grows from ${budgetFor(0)} to ${lastBudget}`)}</span></div>
            <div><b>1</b><span>{t("张真的 NAND 电路，就是你的大脑", "real NAND circuit, which is your brain")}</span></div>
          </div>
          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn primary" href="/workshop">{t("开始造果蝇", "Build a fly")}</Link>
            <a className="btn" href="#circuit">{t("查看电路与验证资料", "Circuit and verification material")}</a>
          </div>
        </header>

        <nav className="docs-toc" aria-label={t("本页目录", "On this page")}>
          {TOC.map(([id, z, e], i) => <a key={id} href={`#${id}`}><span>{S(i + 1)}</span>{t(z, e)}</a>)}
        </nav>

        {/* 01 a run */}
        <section id="play" className="docs-sec">
          {H("play", "一局怎么玩", "How a run works")}
          <p className="big">{t("买芯片、排顺序、装身体、开打。赢 5 场通关。", "Buy chips, order them, fit a body, fight. Five wins clear the run.")}</p>
          <ol className="docs-pipe">
            <li><b>{t("商店", "Shop")}</b><span>{t(`每场前有 ${RUN.shopChips} 张芯片和 ${RUN.shopParts} 件装备可买；不满意花 ${RUN.reroll} 金币刷新。`, `Before each fight: ${RUN.shopChips} chips and ${RUN.shopParts} parts for sale; reroll for ${RUN.reroll} gold.`)}</span></li>
            <li><b>{t("大脑", "Brain")}</b><span>{t("芯片从上往下读，第一张满足的说了算。用 ↑ ↓ 调顺序，不要的卖掉拿回一半。", "Chips read top to bottom; the first that fits decides. Reorder with ↑ ↓; sell one for half its price.")}</span></li>
            <li><b>{t("预算", "Budget")}</b><span>{t(`整颗大脑编译成电路后的门数不能超过这场的预算：第 1 场 ${budgetFor(0)} 个，每场多 5 个。`, `The compiled brain must fit this fight's gate budget: ${budgetFor(0)} for the first, 5 more each fight.`)}</span></li>
            <li><b>{t("开打", "Fight")}</b><span>{t("大脑自己打。可以先免费试打，试打用另一个种子，不计分。", "The brain fights on its own. Practise first for free on another seed; it doesn't count.")}</span></li>
            <li><b>{t("结算", "Result")}</b><span>{t(`赢 ${RUN.winsToClear} 场通关，输 ${RUN.lives} 次或打满 ${RUN.maxFights} 场结束。`, `${RUN.winsToClear} wins clear the run; ${RUN.lives} losses or ${RUN.maxFights} fights end it.`)}</span></li>
          </ol>
          <div className="docs-cards three">
            <div><b>{t("金币", "Gold")}</b><p>{t(`开局 ${RUN.startGold} 金币。每打一场 +${RUN.goldPerFight}，赢了再 +${RUN.goldPerWin}。芯片 2 到 4 金币，装备 4 到 5 金币。`, `Start with ${RUN.startGold} gold. +${RUN.goldPerFight} for every fight, +${RUN.goldPerWin} more for a win. Chips cost 2 to 4, parts 4 to 5.`)}</p></div>
            <div><b>{t("输了会告诉你为什么", "Every loss says why")}</b><p>{t("每场结束都有一句话：你被打断了几次、几口咬在盾上、几口咬空，以及该加哪张芯片、把哪张往上挪。", "Each fight ends with one line: how often you were interrupted, how many bites hit a shield or missed, and which chip to add or move up.")}</p></div>
            <div><b>{t("新手任务", "New-player tasks")}</b><p>{t("第一次玩时，页面会一步一步带你：买进攻芯片 → 打第一场 → 学会防守 → 装身体。随时可以跳过。", "On a first visit the page walks you through four tasks: buy an attack chip, fight once, learn to defend, fit a body. Skip any time.")}</p></div>
            <div><b>{t("每天一套新挑战", "A new run every day")}</b><p>{t("商店、对手顺序和每场的种子都由日期决定。同一天里所有人面对的是同一套挑战。", "The shop, the rival ladder and every fight's seed come from the date. On a given day everyone faces the same run.")}</p></div>
            <div><b>{t("挑战朋友", "Challenge a friend")}</b><p>{t("结算页复制一个挑战链接，里面带着你的大脑和身体。朋友打开后，可以用他自己的大脑跟你这只打。", "The result page gives a challenge link that carries your brain and body. A friend opens it and fights it with their own.")}</p></div>
            <div><b>{t("不用钱包", "No wallet")}</b><p>{t("玩、试打、挑战朋友都免费，也不用注册。进度只存在你自己的浏览器里。", "Playing, practice and challenges are free with no sign-up. Progress stays in your own browser.")}</p></div>
          </div>
        </section>

        {/* 02 a fight */}
        <section id="fight" className="docs-sec">
          {H("fight", "一场架怎么打", "How a fight works")}
          <p className="big">{t("赢架靠读招：看到蓄力，就举盾、闪开或者先下口。", "Fights are won by reading: see the wind-up, then shield, step aside or bite first.")}</p>
          <p>{t(`两只果蝇在一个圆形培养皿里，每秒 ${T.hz} 帧，一场最长 ${sec(T.ticks)} 秒。每一帧，每颗大脑读一次自己的感觉，选一个动作：${MOVES.map((m) => MOVE_ZH[m]).join("、")}，外加要不要咬。`,
                `Two flies share a round dish at ${T.hz} ticks a second, for at most ${sec(T.ticks)} seconds. Every tick each brain reads its senses and picks a move (${MOVES.join(", ")}) and whether to bite.`)}</p>
          <figure className="docs-figure">
            <svg viewBox="0 0 760 236" role="img" aria-label={t("一口咬的时间线：蓄力 12 帧，对手 5 到 9 帧后才看到，举盾还要 3 帧，所以有时来得及、有时来不及。", "Timeline of one bite: a 12-tick wind-up, seen by the rival 5 to 9 ticks late, with 3 more ticks to raise a shield, so the answer sometimes lands in time and sometimes doesn't.")}>
              <g className="tl-axis">
                {Array.from({ length: 25 }, (_, i) => <line key={i} x1={110 + i * 26} y1={196} x2={110 + i * 26} y2={i % 6 === 0 ? 206 : 201} />)}
                {[0, 6, 12, 18, 24].map((i) => <text key={i} x={110 + i * 26} y={222} textAnchor="middle">{i}</text>)}
                <text x={8} y={222} className="tl-unit">{t("帧（30 帧 = 1 秒）", "ticks (30 = 1 s)")}</text>
              </g>
              <text x={8} y={46} className="tl-row">{t("出口方", "Biter")}</text>
              <rect x={110} y={28} width={12 * 26} height={28} rx={6} className="tl-wind" />
              <text x={110 + 6 * 26} y={47} textAnchor="middle" className="tl-in">{t("蓄力（发光、方向锁死）", "wind-up (glows, line locked)")}</text>
              <line x1={110 + 12 * 26} y1={20} x2={110 + 12 * 26} y2={190} className="tl-land" />
              <text x={110 + 12 * 26 + 6} y={20} className="tl-note">{t("咬下去", "bite lands")}</text>
              <rect x={110 + 12 * 26} y={28} width={10 * 26} height={28} rx={6} className="tl-open" />
              <text x={110 + 17 * 26} y={47} textAnchor="middle" className="tl-in">{t("收招：有破绽", "recover: open")}</text>
              <text x={8} y={106} className="tl-row">{t("对手看到", "Rival sees")}</text>
              <rect x={110 + 5 * 26} y={88} width={5 * 26} height={28} rx={6} className="tl-see" />
              <text x={110 + 7.5 * 26} y={107} textAnchor="middle" className="tl-in">{t("5–9 帧后", "5–9 ticks late")}</text>
              <text x={8} y={164} className="tl-row">{t("举盾", "Shield")}</text>
              <rect x={110 + 5 * 26} y={146} width={3 * 26} height={28} rx={6} className="tl-up" />
              <text x={110 + 6.5 * 26} y={165} textAnchor="middle" className="tl-in">{t("升盾 3 帧", "3 to raise")}</text>
              <rect x={110 + 8 * 26} y={146} width={4 * 26} height={28} rx={6} className="tl-held" />
              <text x={110 + 10 * 26} y={165} textAnchor="middle" className="tl-in">{t("来得及", "in time")}</text>
            </svg>
            <figcaption>{t(`一口咬要蓄力 ${T.windup} 帧（${sec(T.windup)} 秒）。对手要过 ${T.delay}–${T.delay + T.delayJitter - 1} 帧才看到，举盾还要 ${T.guardUp} 帧：看得早就来得及，看得晚就挨这一口。咬完要收招 ${T.recover} 帧，这段时间谁都能咬它。`,
              `A bite winds up for ${T.windup} ticks (${sec(T.windup)} s). The rival sees it ${T.delay}–${T.delay + T.delayJitter - 1} ticks late and needs ${T.guardUp} more to raise a shield: an early read is in time, a late one takes the bite. After biting, the biter recovers for ${T.recover} ticks, open to anyone.`)}</figcaption>
          </figure>
          <table className="docs-table">
            <thead><tr><th>{t("规则", "Rule")}</th><th>{t("具体", "Detail")}</th></tr></thead>
            <tbody>
              <tr><td>{t("反应时间", "Reaction time")}</td><td>{t(`每只果蝇看到的对手，都是 ${T.delay}–${T.delay + T.delayJitter - 1} 帧以前的样子（约 0.17–0.3 秒，像人的反应时间），每帧随机，由种子决定。`, `Each fly sees its rival as it was ${T.delay}–${T.delay + T.delayJitter - 1} ticks ago (about 0.17–0.3 s, like a human reaction), varying each tick from the seed.`)}</td></tr>
              <tr><td>{t("咬", "Bite")}</td><td>{t(`要 ${T.biteCost} 点体力。蓄力 ${T.windup} 帧，起手时方向就锁死，沿直线冲过去；对手不在那条线上就咬空。基础伤害 ${BASE.dmg}，${Math.round(T.critChance * 100)}% 暴击 ×${T.critMult}。`, `Costs ${T.biteCost} energy. Winds up for ${T.windup} ticks, its line locked at the start; a rival off that line makes it miss. Base damage ${BASE.dmg}, ${Math.round(T.critChance * 100)}% crits for ×${T.critMult}.`)}</td></tr>
              <tr><td>{t("举盾", "Shield")}</td><td>{t(`举 ${T.guardUp} 帧后才生效，只挡正面左右各约 ${arc}°，挡下的咬只漏 ${Math.round(T.guardTakes * 100)}% 伤害并把对方弹开。举盾时转身变慢，所以绕到侧面就能咬中。`, `Works after ${T.guardUp} ticks, covers about ${arc}° either side of the front, lets ${Math.round(T.guardTakes * 100)}% through and bounces the biter. Shielding slows turning, so a bite from the side gets in.`)}</td></tr>
              <tr><td>{t("打断", "Interrupt")}</td><td>{t(`对手还在蓄力时咬中它：伤害 ×${T.interruptBonus}，它被打晕 ${T.staggerInterrupted} 帧，这口咬作废。两口同一帧落下就互相换血。`, `Bite a rival mid-wind-up: ×${T.interruptBonus} damage, it is dazed for ${T.staggerInterrupted} ticks and its bite is lost. Two bites landing on the same tick trade.`)}</td></tr>
              <tr><td>{t("破绽", "Open")}</td><td>{t("刚咬完在收招、被打晕、或者盾没对着你，都算“有破绽”。「抓破绽」就是看这个。", "Recovering from a bite, dazed, or shielding the wrong way all count as open. Punish looks for exactly that.")}</td></tr>
              <tr><td>{t("体力", "Energy")}</td><td>{t(`满 100，每帧回 ${BASE.regen}，举盾时回得更快。体力不够就咬不了。`, `Up to 100, regaining ${BASE.regen} a tick, faster while shielding. No bite without energy.`)}</td></tr>
              <tr><td>{t("胜负", "Winning")}</td><td>{t(`先把对手血打光算击倒（K.O.）。${sec(T.ticks)} 秒到了比剩余血量比例；一样多时，门数更少的大脑赢。`, `Empty the rival's health for a knockout. At ${sec(T.ticks)} s, the larger share of health left wins; if level, the brain with fewer gates wins.`)}</td></tr>
            </tbody>
          </table>
        </section>

        {/* 03 chips */}
        <section id="chips" className="docs-sec">
          {H("chips", "战术芯片", "Tactic chips")}
          <p>{t("每张芯片就是一条“当……就……”的规则。大脑从上往下检查，第一张条件满足的决定这一帧的动作；一张都不满足时就走向对手。同一张芯片放在不同位置，效果完全不同。", "Each chip is one “when… then…” rule. The brain checks them top to bottom and the first that fits decides the tick; if none fits, it walks at the rival. The same chip does different things in different places.")}</p>
          <table className="docs-table">
            <thead><tr><th>{t("芯片", "Chip")}</th><th>{t("规则", "Rule")}</th><th>{t("类型", "Kind")}</th><th className="num">{t("单独门数", "Gates alone")}</th><th className="num">{t("价格", "Price")}</th></tr></thead>
            <tbody>
              {TACTIC_IDS.map((c) => (
                <tr key={c}><td>{name(c)}</td><td>{zh ? TACTICS[c].dzh : TACTICS[c].den}</td><td>{TACTICS[c].tag === "attack" ? t("进攻", "attack") : TACTICS[c].tag === "defend" ? t("防守", "defence") : t("走位", "movement")}</td><td className="num">{aloneGates(c)}</td><td className="num">{TACTICS[c].price}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="docs-cards three">
            <div><b>{t("顺序就是策略", "Order is strategy")}</b><p>{t("「先咬」放在「格挡」上面，看到对手蓄力也照咬不误；反过来，先防住再找机会。", "Bite above Block swings even into a wind-up; the other way round, it defends first and looks for an opening.")}</p></div>
            <div><b>{t("有些芯片是陷阱", "Some chips are traps")}</b><p>{t("「诱招」放在最上面，你会一整场举着盾不出手。它要放在进攻芯片下面才有用。", "Bait at the top keeps your shield up all fight and never bites. It earns its place below the attack chips.")}</p></div>
            <div className="wide"><b>{t("想要商店里没有的战术？", "Want a tactic the shop doesn't sell?")}</b><p>{t("大脑编辑器里，每条规则都由你写：勾选每种感觉在哪几档时触发，再选动作和要不要咬，最多 16 条。每改一下就重新编译成 NAND、在全部 4,096 种输入上核对；写好可以拿去打任何一个对手、把整条阶梯打一遍，或者发成挑战链接。", "In the brain editor every rule is yours: tick the levels of each sense it fires on, pick a move and whether to bite, up to 16 rules. Each change recompiles to NAND and is checked on all 4,096 inputs; then fight any rival, run the whole ladder, or send it as a challenge link.")} <Link className="link" href="/brawl/editor">{t("打开大脑编辑器", "Open the brain editor")}</Link></p></div>
            <div><b>{t("组合更省门", "Combos save gates")}</b><p>{t("芯片们看的是同一组感觉，编译时会共用电路，一起装往往比单独加起来少几个门。", "Chips read the same senses and share circuitry when compiled, so together they often cost fewer gates than the sum.")}</p></div>
          </div>
        </section>

        {/* 04 body */}
        <section id="body" className="docs-sec">
          {H("body", "身体装备", "Body parts")}
          <p>{t(`装备用金币买，最多 ${BODY_SLOTS} 件，不占门数。基础身体：生命 ${BASE.maxHp}，每口 ${BASE.dmg}，速度 ${BASE.speed}，每帧回气 ${BASE.regen}。`, `Parts cost gold, up to ${BODY_SLOTS}, and use no gates. The base body: ${BASE.maxHp} health, ${BASE.dmg} a bite, speed ${BASE.speed}, ${BASE.regen} energy a tick.`)}</p>
          <table className="docs-table">
            <thead><tr><th>{t("装备", "Part")}</th><th>{t("效果", "Effect")}</th><th className="num">{t("价格", "Price")}</th></tr></thead>
            <tbody>{PART_IDS.map((p) => <tr key={p}><td>{zh ? PARTS[p].zh : PARTS[p].en}</td><td>{zh ? PARTS[p].dzh : PARTS[p].den}</td><td className="num">{PARTS[p].price}</td></tr>)}</tbody>
          </table>
          <p className="dim">{t("大脑决定什么时候做什么，身体决定做得多狠。门数预算只管大脑，所以金币和门数是两种不同的资源，要一起规划。", "The brain decides what to do and when; the body decides how hard. The gate budget covers only the brain, so gold and gates are two resources to plan together.")}</p>
        </section>

        {/* 05 circuit */}
        <section id="circuit" className="docs-sec">
          {H("circuit", "大脑是真电路", "The brain is a real circuit")}
          <p className="big">{t("你的芯片不是存档里的设置，而是一张 NAND 门电路。", "Your chips are not a saved setting. They are a circuit of NAND gates.")}</p>
          <ol className="docs-pipe">
            <li><b>{t("感觉", "Sense")}</b><span>{t("距离、对手在干什么、我的血、对手的血、体力，外加上一帧的动作。", "Distance, what the rival is doing, my health, its health, energy, and my last move.")}</span></li>
            <li><b>{t("分级", "Level")}</b><span>{t("每种感觉分成 4 级（0 到 3），拼成 12 位输入。", "Each sense becomes one of four levels (0 to 3); together, 12 input bits.")}</span></li>
            <li><b>{t("电路", "Circuit")}</b><span>{t("12 位送进 NAND 电路，这张电路就是你的芯片编译出来的。", "The 12 bits go through the NAND circuit your chips compiled to.")}</span></li>
            <li><b>{t("动作", "Act")}</b><span>{t("出来 3 位：逼近、后撤、绕圈、举盾，外加要不要咬。", "3 bits come out: press, back, circle or guard, plus whether to bite.")}</span></li>
            <li><b>{t("核对", "Check")}</b><span>{t("编译器在全部 4,096 种输入上，逐一和芯片规则比对。", "The compiler checks the circuit against the chip rules on all 4,096 inputs.")}</span></li>
          </ol>
          <table className="docs-table">
            <thead><tr><th>{t("大脑", "Brain")}</th><th className="num">{t("NAND 门", "NAND gates")}</th><th className="num">{t("分开做", "Built apart")}</th><th className="num">{t("层数", "Depth")}</th><th className="num">{t("TapeOut 成本 A×d³", "TapeOut cost A×d³")}</th></tr></thead>
            <tbody>
              {ex.map(({ chips, r }) => <tr key={chips.join()}><td>{chips.map(name).join(" + ")}</td><td className="num">{r.gates}</td><td className="num">{r.gates + r.saved}</td><td className="num">{r.depth}</td><td className="num">{r.cost.toLocaleString()}</td></tr>)}
              <tr><td>{t("官方觅食大脑（已上链）", "Official forage brain (on chain)")}</td><td className="num">{BRAIN.gates.length}</td><td className="num">—</td><td className="num">{netDepth(BRAIN)}</td><td className="num">{(BRAIN.gates.length * netDepth(BRAIN) ** 3).toLocaleString()}</td></tr>
            </tbody>
          </table>
          <div className="docs-cards two">
            <div><b>{t("门数预算 = 真实成本", "The budget is a real cost")}</b><p>{t("流片时每个门要烧掉一个 NAND 晶体管代币。游戏里的预算，就是把“上链要花多少”变成了玩法：同样能赢，更小的大脑更好。", "A tape-out burns one NAND transistor token per gate. The in-game budget turns “what it costs on chain” into play: if two brains win, the smaller one is better.")}</p></div>
            <div><b>{t("同一种电路格式", "The same circuit format")}</b><p>{t(<>大乱斗的大脑和官方觅食大脑一样，都是 12 位进、3 位出的 NAND 电路，用 TapeOut 的字节格式写出。两种玩法读这 12 位的意思不同，所以我们起草了一个接口约定，给每种意思起名字：大乱斗的叫 <code>{DUEL_PROFILE}</code>。</>, <>Brawl brains are 12-in, 3-out NAND circuits in TapeOut's byte format, just like the official forage brain. The two games read those 12 bits differently, so we drafted an interface convention that names each meaning: Brain Brawl's is <code>{DUEL_PROFILE}</code>.</>)}</p></div>
          </div>
        </section>

        {/* 06 rivals */}
        <section id="rivals" className="docs-sec">
          {H("rivals", "对手", "Rivals")}
          <p>{t("前两个对手是手写的，用来教你最基本的东西；后面的都是 AI 用搜索设计的：在那一场的门数预算和装备格子里，找出能打赢前面所有对手、也能打赢几种新手常用打法的大脑。每个对手都至少有一种组合能赢它。", "The first two rivals are hand-made to teach the basics. The rest were designed by a search: inside that fight's gate budget and body slots, find a brain that beats every rival before it and a few plain plans new players try. Every rival has at least one mix that beats it.")}</p>
          <table className="docs-table">
            <thead><tr><th>{t("第几场", "Fight")}</th><th>{t("对手", "Rival")}</th><th>{t("大脑（从上往下）", "Brain (top to bottom)")}</th><th>{t("身体", "Body")}</th><th className="num">{t("门数 / 预算", "Gates / budget")}</th></tr></thead>
            <tbody>
              {RIVALS.map((r, i) => <tr key={r.name}><td>{i + 1}</td><td>{r.name}{r.ai ? " · AI" : ""}</td><td>{r.chips.map(name).join(" → ")}</td><td>{r.gear.map((g) => (zh ? PARTS[g].zh : PARTS[g].en)).join(" · ") || "—"}</td><td className="num">{report(r.chips).gates} / {budgetFor(i)}</td></tr>)}
            </tbody>
          </table>
          <p className="dim">{t("打满 8 个对手后，第 9 场再打最后一个。", "After the eight, a ninth fight meets the last rival again.")}</p>
        </section>

        {/* 07 fairness */}
        <section id="fair" className="docs-sec">
          {H("fair", "公平与重放", "Fairness and replay")}
          <div className="docs-cards two">
            <div><Tag s="live" /><b>{t("同一天，同一套挑战", "One day, one run for everyone")}</b><p>{t("商店、对手和每场的种子都由日期算出来。同一颗大脑、同一个种子，打出来永远是同一场架，网页和接口用的是同一份代码。", "The shop, the rivals and each fight's seed come from the date. The same brain and seed always give the same fight; the page and the API run the same code.")}</p></div>
            <div><Tag s="live" /><b>{t("试打用另一个种子", "Practice uses other seeds")}</b><p>{t("免费试打的种子和正式比赛不一样，正式那场要开打才揭晓，所以不能靠反复试打来背答案。", "Free practice runs on different seeds from the real fight, which is revealed only when you fight, so you can't memorise the answer by practising.")}</p></div>
            <div><Tag s="next" /><b>{t("用未来的区块当种子", "Seeds from a future block")}</b><p>{t("今天的种子只看日期，提前就能算出来，写程序的人可以先穷举。下一步改用一个还没出的 X Layer 区块哈希当每天的种子：开赛前谁都不知道，开赛后谁都能核对。", "Today's seeds come from the date alone, so a program can compute them in advance and search. Next, each day's seed will be a not-yet-mined X Layer block hash: unknown to everyone before, checkable by everyone after.")}</p></div>
            <div><Tag s="live" /><b>{t("平局给更小的大脑", "Ties go to the smaller brain")}</b><p>{t("时间到且血量一样，门数更少的赢。这和 TapeOut 的“设计证明”是同一个思路：同样的效果，电路越小越好。", "At time with health level, fewer gates win. It is the same idea as TapeOut's Proof of Design: for the same result, the smaller circuit is better.")}</p></div>
          </div>
        </section>

        {/* 08 tapeout */}
        <section id="tapeout" className="docs-sec">
          {H("tapeout", "建立在 TapeOut 上", "Built on TapeOut")}
          <p>{t("TapeOut 是一个链上电路协议：电路由 NAND 和 LATCH 晶体管代币组成，“流片”会烧掉这些代币，把电路存上链并铸成 NFT，谁都能用免费的只读调用 eval 去问它。果蝇的大脑说到底就是电路，所以 TapeFly 把 TapeOut 当作大脑的硬件。", "TapeOut is an on-chain circuit protocol: circuits are made of NAND and LATCH transistor tokens, and a tape-out burns them, stores the circuit on chain and mints it as an NFT that anyone can query with the free read-only eval. A fly's brain is a circuit, so TapeFly uses TapeOut as the brain's hardware.")}</p>
          <table className="docs-table tagged">
            <thead><tr><th>{t("TapeOut 概念", "TapeOut idea")}</th><th>{t("在 TapeFly 里", "In TapeFly")}</th><th /></tr></thead>
            <tbody>
              <tr><td>{t("NAND 晶体管", "NAND transistors")}</td><td>{t("大脑里每个门就是一个 NAND。大乱斗的门数预算，就是这颗大脑上链要烧掉的 NAND 数。", "Every gate in a brain is one NAND. The Brain Brawl gate budget is the NAND a tape-out of that brain would burn.")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("流片、电路 NFT", "Tape-out, circuit NFT")}</td><td>{live ? t("官方觅食大脑已经在 X Layer 上流片，全部 4,096 个答案核对一致。", "The official forage brain is taped out on X Layer, all 4,096 answers verified.") : t("当前配置尚未包含可核对的链上电路证明。", "The current configuration does not yet contain a verifiable on-chain circuit.")}</td><td><Tag s={live ? "live" : "next"} /></td></tr>
              <tr><td>{t("流片你的大乱斗大脑", "Tape out your Brawl brain")}</td><td>{t("结算页已经显示这颗大脑要多少 NAND；从结算页一键进入流片面板还在做。", "The result page already shows how much NAND your brain needs; going straight from there to the tape-out panel is in progress.")}</td><td><Tag s="next" /></td></tr>
              <tr><td>{t("eval 只读调用", "eval, read-only")}</td><td>{t("逐个答案证明：链上的大脑就是你比赛用的那颗。", "Proves, answer by answer, that the brain on chain is the one that fought.")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("门数 × 层数³", "gates × depth³")}</td><td>{t("TapeOut 自己的电路成本指标，每颗大脑都显示。", "TapeOut's own circuit cost, shown for every brain.")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("电路接口约定（TAP 草案）", "Circuit interface (TAP draft)")}</td><td>{t(<>一份 JSON 清单，说明电路每个输入输出位是什么意思，让一颗上链的大脑能被别的应用加载和比较。已经定义了 <code>FLY-12x3/1</code>（觅食）和 <code>{DUEL_PROFILE}</code>（打架）两种。还是草案，没有提交给 TapeOut。</>, <>A JSON manifest saying what each pin of a circuit means, so a taped-out brain can be loaded and compared by other apps. Defines <code>FLY-12x3/1</code> (foraging) and <code>{DUEL_PROFILE}</code> (fighting). A draft, not yet submitted to TapeOut.</>)}</td><td><Tag s="next" /></td></tr>
              <tr><td>{t("X Layer", "X Layer")}</td><td>{t("TapeFly 的所有链上部分都在 X Layer：流片、血统锚定、工坊记录。", "Everything TapeFly puts on chain is on X Layer: tape-outs, lineage anchors, workshop records.")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("电路引用（REF）", "Circuit references (REF)")}</td><td>{t("一个电路可以引用另一个已上链的电路，以后可以让大脑由大脑组成。", "A circuit can reference another taped-out circuit, which could let brains be built from brains.")}</td><td><Tag s="later" /></td></tr>
            </tbody>
          </table>
          <p className="dim">{t("TapeFly 是独立项目，不是 TapeOut 团队出品。当前官方 Circuit #2 使用外部 Sillu 测试处理器；它不是 TapeFly 自有处理器，也不参加官方的设计证明（BEM）挖矿。", "TapeFly is independent, not made by the TapeOut team. The current official Circuit #2 uses the external Sillu test processor; it is not a TapeFly-owned processor and is not part of official Proof-of-Design (BEM) mining.")}</p>
        </section>

        {/* 09 agents */}
        <section id="agents" className="docs-sec">
          {H("agents", "给 AI 智能体", "For AI agents")}
          <p>{t("大乱斗从一开始就给人和 AI 一起玩。AI 不用打开网页，直接调用公开接口：读规则、交一颗大脑和身体、拿回每场结果。", "Brain Brawl is for people and AI alike. An agent skips the page and uses the open API: read the rules, submit a brain and a body, get every fight back.")}</p>
          <table className="docs-table">
            <tbody>
              <tr><td><code>/api/v1/brawl?date=D</code></td><td>{t("当天的芯片、装备、对手阶梯、每场预算和种子、全部规则数值", "The day's chips, parts, rival ladder, budgets, seeds and every rule number")}</td></tr>
              <tr><td><code>&amp;chips=block,punish,bite&amp;gear=shell</code></td><td>{t("用这颗大脑和身体打完整个阶梯", "Fight the whole ladder with this brain and body")}</td></tr>
              <tr><td><code>&amp;program=p1.…</code></td><td>{t("交任意规则列表，不限于商店里的芯片", "Submit any rule list, not only shop chips")}</td></tr>
              <tr><td><code>&amp;fight=i</code></td><td>{t("只打第 i 场，每场可以换一颗大脑", "Only fight i, so each fight can use a different brain")}</td></tr>
            </tbody>
          </table>
          <p>{t(<>仓库里的 <code>npm run agent:demo</code> 是一个只用这个接口的小智能体：每场试遍芯片和装备，留下打得最好的。因为种子今天还能提前算，它能把 8 个对手全打赢，这正是要改用未来区块当种子的原因。</>, <><code>npm run agent:demo</code> in the repository is a small agent that uses only this API: per fight it tries chips and parts and keeps what does best. Because today's seeds can be computed in advance it beats all eight rivals, which is exactly why seeds will move to a future block.</>)} <Link className="link" href="/agents">{t("全部接口 →", "All endpoints →")}</Link></p>
        </section>

        {/* 10 economics */}
        <section id="economics" className="docs-sec">
          {H("economics", "经济模型", "Economics")}
          <p className="big">{t("游戏免费。没有代币，没有收益承诺，没有下注。", "The game is free. No token, no promised yield, no betting.")}</p>
          <div className="docs-flow" aria-label={t("价值怎么流动", "How value moves")}>
            <div className="node"><b>{t("玩家", "Player")}</b><span>{t("免费玩，打出一颗好大脑", "plays free, builds a good brain")}</span></div>
            <div className="arrow">{t("想永久留下 → 买 NAND", "to keep it → buys NAND")}</div>
            <div className="node"><b>{t("处理器", "Processor")}</b><span>{t("按链上价格卖晶体管", "sells transistors at the on-chain price")}</span></div>
            <div className="arrow">{t("流片烧掉它们 →", "tape-out burns them →")}</div>
            <div className="node"><b>{t("电路 NFT", "Circuit NFT")}</b><span>{t("归玩家，可在 TapeOut 市场交易", "the player's, tradable on TapeOut's market")}</span></div>
          </div>
          <table className="docs-table tagged">
            <thead><tr><th>{t("谁", "Who")}</th><th>{t("付出", "Pays")}</th><th>{t("得到", "Gets")}</th><th /></tr></thead>
            <tbody>
              <tr><td>{t("玩家", "Player")}</td><td>{t("什么都不用付就能玩。想流片时付：大脑门数那么多 NAND、处理器流片费、gas", "Nothing to play. To tape out: NAND for each gate, the processor's tape-out fee, gas")}</td><td>{t("自己大脑的电路 NFT", "A circuit NFT of their brain")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("TapeFly 自有处理器（未来）", "TapeFly-owned processor (future)")}</td><td>{t("一次性的工厂费", "A one-time factory fee")}</td><td>{t("玩家在这里买 NAND 的收入；当前证明不依赖 TapeFly 自有处理器", "Income from NAND bought there; the current proof does not depend on a TapeFly-owned processor")}</td><td><Tag s="later" /></td></tr>
              <tr><td>{t("赞助方", "Sponsors")}</td><td>{t("赞助一周的挑战或一个对手", "Sponsor a week's run or a rival")}</td><td>{t("名字出现在那一周的挑战里", "Their name on that week's run")}</td><td><Tag s="later" /></td></tr>
              <tr><td>TapeOut</td><td>{t("不用付", "Nothing")}</td><td>{t("每次流片都烧掉晶体管", "Transistors burned with every tape-out")}</td><td><Tag s="live" /></td></tr>
            </tbody>
          </table>
          <p>{t("流片的总价 = 门数 × 处理器的 NAND 单价 + 流片费 + gas。流片面板会从链上读出每一项，签名前把总数给你看。下面是几颗大乱斗大脑要的 NAND 数：", "A tape-out costs gates × the processor's NAND price + the tape-out fee + gas. The panel reads each from the chain and shows the total before you sign. NAND needed for a few Brawl brains:")}</p>
          <table className="docs-table">
            <thead><tr><th>{t("大脑", "Brain")}</th><th className="num">{t("需要的 NAND", "NAND needed")}</th></tr></thead>
            <tbody>{ex.map(({ chips, r }) => <tr key={chips.join()}><td>{chips.map(name).join(" + ")}</td><td className="num">{r.gates}</td></tr>)}</tbody>
          </table>
          <p className="dim">{t("我们不会因为你玩游戏付钱给你，也不承诺流片后的电路能卖出去。", "We pay nobody for playing, and promise nothing about selling a taped-out circuit.")}</p>
        </section>

        {/* 11 roadmap */}
        <section id="roadmap" className="docs-sec">
          {H("roadmap", "路线图", "Roadmap")}
          <ol className="docs-road">
            <li className="live"><b>{t("现在", "Now")}</b><ul>
              <li>{t("官方 50 门大脑已在 X Layer 上流片为 Circuit #2，4,096 / 4,096 个答案核对一致", "The official 50-gate brain is live on X Layer as Circuit #2, with 4,096 / 4,096 answers verified")}</li>
              <li>{t("大脑大乱斗：实时对打、11 张战术芯片、6 件装备、8 个对手", "Brain Brawl: real-time fights, 11 tactic chips, 6 parts, 8 rivals")}</li>
              <li>{t("每颗大脑编译成 NAND 电路，门数预算", "Every brain compiled to NAND, on a gate budget")}</li>
              <li>{t("大脑编辑器：自己写规则，实时编译和核对", "Brain editor: write your own rules, compiled and checked live")}</li>
              <li>{t("新手任务、输了的原因、免费试打、挑战链接", "New-player tasks, a reason for every loss, free practice, challenge links")}</li>
              <li>{t("给 AI 的公开接口和示范智能体", "An open API and a demo agent for AI")}</li>
              <li>{t("流片面板接到 X Layer：先免费模拟，再由你的钱包签名", "A tape-out panel on X Layer: simulated for free, then signed by your wallet")}</li>
              <li>{t("电路接口约定（TAP 草案）", "Circuit interface convention (TAP draft)")}</li>
            </ul></li>
            <li className="next"><b>{t("下一步", "Next")}</b><ul>
              <li>{t("每天的种子改用未来的 X Layer 区块哈希", "Daily seeds from a future X Layer block hash")}</li>
              <li>{t("从结算页一键流片你的大乱斗大脑", "Tape out your Brawl brain straight from the result page")}</li>
              <li>{t("每日排行：同一套挑战，比谁赢得多、门数少", "A daily board: same run for all, most wins and fewest gates")}</li>
              <li>{t("把 TAP 草案提交给 TapeOut 社区讨论", "Submit the TAP draft to the TapeOut community")}</li>
            </ul></li>
            <li className="later"><b>{t("更远", "Later")}</b><ul>
              <li>{t("智能体联赛：AI 设计的大脑对人类设计的大脑", "An agent league: AI-designed brains against human ones")}</li>
              <li>{t("真人实时对战：两个玩家的大脑直接打", "Live matches between two players' brains")}</li>
              <li>{t("有记忆的大脑（LATCH）：会记住对手习惯", "Brains with memory (LATCH) that learn a rival's habits")}</li>
              <li>{t("把大乱斗大脑当作游戏 AI 角色的“小脑”，给别的游戏用", "Brawl brains as small, verifiable NPC brains for other games")}</li>
            </ul></li>
          </ol>
        </section>

        {/* 12 lab */}
        <section id="lab" className="docs-sec">
          {H("lab", "实验室与永生血统", "Lab and lineage")}
          <p>{t("大乱斗之前，TapeFly 从一个觅食实验开始：一只果蝇独自在培养皿里找吃的、躲陷阱，过完一天。这部分还在运行，收在“更多”菜单里。", "Before Brain Brawl, TapeFly began as a forage experiment: one fly alone in a dish, finding food and avoiding traps for a day. It still runs, under the More menu.")}</p>
          <div className="docs-cards two">
            <div><Tag s="live" /><b>{t("觅食实验", "Forage experiment")}</b><p>{t("四个本能开关（觅食、逃跑、弹跳、探索）编译成电路，看果蝇过一天；可以和朋友赛跑，每周有冠军榜。", "Four instinct switches (forage, flee, jump, explore) compile to a circuit and live a day; race a friend, with a weekly champions board.")} <Link className="link" href="/forage">{t("去看看", "Take a look")}</Link></p></div>
            <div><Tag s="live" /><b>{t("永生血统", "The undying lineage")}</b><p>{t("每天的果蝇都由前一天活得最久的冠军繁衍，从第一天起没断过。每一步都折进哈希链，任何人拿日期就能重算。", "Each day's flies are bred from the previous day's longest-lived champion, unbroken since day one. Every step is folded into a hash chain anyone can recompute from the date.")} <Link className="link" href="/lineage">{t("看血统", "See the lineage")}</Link></p></div>
            <div className="wide"><Tag s={ANCHORS.entries.length ? "live" : "next"} /><b>{t("血统写上链", "The lineage on chain")}</b><p>{ANCHORS.entries.length
              ? t(`整条血统每天折成一个哈希写上 X Layer，已锚定 ${ANCHORS.entries.length} 天。`, `The whole lineage is folded into one hash written to X Layer daily; ${ANCHORS.entries.length} days anchored.`)
              : t("每日把血统哈希写上 X Layer 的功能已经做好，等第一笔交易。", "Writing the lineage hash to X Layer daily is built and waiting for its first transaction.")} <Link className="link" href="/lineage#on-chain">{t("看链上记录", "See the record")}</Link></p></div>
          </div>
        </section>

        {/* 13 promises */}
        <section id="promises" className="docs-sec">
          {H("promises", "我们不做什么", "What we won't do")}
          <ul className="docs-list">
            <li>{t("不发 TapeFly 代币，不搞预售，不搞空投。", "No TapeFly token, no presale, no airdrop.")}</li>
            <li>{t("不承诺收益，不搞“持有就分红”，不说“玩游戏就能挖矿”。", "No promised returns, no pay-for-holding, no “play to mine”.")}</li>
            <li>{t("不做下注、不收报名费发奖金。比的是大脑，不是钱。", "No betting, no paid entry with prizes. It's about brains, not stakes.")}</li>
            <li>{t("不碰你的私钥。每一笔链上操作都由你自己的钱包签名。", "Never touch your keys. Every on-chain action is signed by your own wallet.")}</li>
            <li>{t("不冒充任何人。TapeFly 与 TapeOut 团队、X Layer、OKX 都没有官方关系。", "Never impersonate anyone. TapeFly has no official tie to the TapeOut team, X Layer or OKX.")}</li>
            <li>{t("不说“第一个”。我们只说能被核对的事。", "No “first ever” claims. We say only what can be checked.")}</li>
          </ul>
        </section>

        {/* 14 glossary */}
        <section id="glossary" className="docs-sec">
          {H("glossary", "术语表", "Glossary")}
          <dl className="docs-gloss">
            <div><dt>{t("战术芯片", "Tactic chip")}</dt><dd>{t("一条“当……就……”的规则。大脑就是一串芯片。", "One “when… then…” rule. A brain is a list of chips.")}</dd></div>
            <div><dt>{t("蓄力", "Wind-up")}</dt><dd>{t(`咬之前的 ${T.windup} 帧，果蝇会发光，方向已经锁死。`, `The ${T.windup} ticks before a bite lands: the fly glows and its line is locked.`)}</dd></div>
            <div><dt>{t("破绽", "Open")}</dt><dd>{t("刚咬完、被打晕、或者盾没对着你的时候。", "Just after biting, dazed, or shielding the wrong way.")}</dd></div>
            <div><dt>{t("打断", "Interrupt")}</dt><dd>{t("在对手蓄力时咬中它，伤害更高，它的这口作废。", "Biting a rival mid-wind-up: more damage, and its bite is lost.")}</dd></div>
            <div><dt>{t("门数预算", "Gate budget")}</dt><dd>{t("这一场大脑电路最多能有多少个 NAND 门。", "The most NAND gates the brain's circuit may have in this fight.")}</dd></div>
            <div><dt>NAND</dt><dd>{t("一种逻辑门：两个输入都是 1 时输出 0，否则输出 1。只用它就能搭出任何计算。", "A logic gate that outputs 0 only when both inputs are 1. Any computation can be built from it alone.")}</dd></div>
            <div><dt>{t("流片", "Tape-out")}</dt><dd>{t("芯片行业的说法：设计定稿、交付制造。在 TapeOut 上指把电路永久存上链。", "Chip-industry word for sending a design to be made. On TapeOut, storing a circuit on chain for good.")}</dd></div>
            <div><dt>{t("处理器", "Processor")}</dt><dd>{t("TapeOut 上造电路的合约，各自发行自己的晶体管。", "A TapeOut contract where circuits are built; each issues its own transistors.")}</dd></div>
            <div><dt>eval</dt><dd>{t("免费的只读调用：给链上电路一个输入，拿回它的输出。", "A free read-only call: give an on-chain circuit an input, get its output.")}</dd></div>
            <div><dt>A×d³</dt><dd>{t("TapeOut 的电路成本：门数乘以层数的三次方。越小越好。", "TapeOut's circuit cost: gates times depth cubed. Smaller is better.")}</dd></div>
            <div><dt>{t("接口约定（Profile）", "Profile")}</dt><dd>{t(<>说明一张电路每个输入输出位含义的名字，比如 <code>{DUEL_PROFILE}</code>。</>, <>A name for what each pin of a circuit means, such as <code>{DUEL_PROFILE}</code>.</>)}</dd></div>
            <div><dt>{t("设计证明（PoD）", "Proof of Design (PoD)")}</dt><dd>{t("TapeOut 的挖矿方式：奖励用更小电路正确完成官方任务的人。", "TapeOut's mining: it rewards whoever solves an official task correctly with the smallest circuit.")}</dd></div>
          </dl>
        </section>

        {/* 15 faq */}
        <section id="faq" className="docs-sec">
          {H("faq", "常见问题", "Questions")}
          <div className="docs-faq">
            <details><summary>{t("我要操作果蝇吗？", "Do I control the fly?")}</summary><p>{t("不用。你在商店里设计它的大脑，打的时候它自己决定。这正是好玩的地方：你在写战术，不是在按按键。", "No. You design its brain in the shop; in the fight it decides for itself. That is the point: you write tactics, not button presses.")}</p></details>
            <details><summary>{t("为什么我的芯片没亮？", "Why didn't my chip light up?")}</summary><p>{t("上面有一张条件也满足的芯片抢先了，或者它的条件这一帧没满足。试着把它往上挪。", "A chip above it also fit and went first, or its condition didn't hold that tick. Try moving it up.")}</p></details>
            <details><summary>{t("为什么两张芯片一起比单独加起来门数少？", "Why do two chips cost fewer gates together?")}</summary><p>{t("它们读的是同一组感觉，编译器会让它们共用同一段电路。", "They read the same senses, and the compiler lets them share circuitry.")}</p></details>
            <details><summary>{t("玩需要钱包吗？", "Do I need a wallet?")}</summary><p>{t("不需要。玩、试打、挑战朋友都免费。只有想把大脑流片上链时才需要钱包。", "No. Playing, practice and challenges are free. A wallet is only for taping a brain out.")}</p></details>
            <details><summary>{t("AI 能不能直接把游戏打穿？", "Can an AI just solve it?")}</summary><p>{t("今天可以，因为种子能提前算出来，我们自己的示范智能体就打赢了全部对手。所以下一步要用开赛后才出现的区块哈希当种子。", "Today it can, because seeds can be computed in advance; our own demo agent beats every rival. That is why seeds will move to a block hash that appears only after the run opens.")}</p></details>
            <details><summary>{t("TapeFly 是 TapeOut 官方做的吗？", "Is TapeFly made by TapeOut?")}</summary><p>{t("不是。它是独立项目，建立在 TapeOut 公开的合约之上。", "No. It is an independent project built on TapeOut's public contracts.")}</p></details>
            <details><summary>{t("TapeFly 有代币吗？", "Is there a TapeFly token?")}</summary><p>{t("没有。没有代币，没有预售，没有空投。任何声称有的都不是我们。", "No. No token, presale or airdrop. Anything claiming otherwise is not us.")}</p></details>
            <details><summary>{t("我怎么知道链上的大脑就是比赛用的那颗？", "How do I know the brain on chain is the one that fought?")}</summary><p>{t("流片之后，向链上电路问全部 4,096 个可能的问题，逐个和你的芯片规则比对。任何人都能免费再查一遍。", "After a tape-out, ask the on-chain circuit all 4,096 possible questions and compare each answer with your chip rules. Anyone can repeat it for free.")}</p></details>
            <details><summary>{t("为什么是果蝇？", "Why a fruit fly?")}</summary><p>{t("果蝇是整个大脑被完整画出来的最复杂的动物之一，它的行为（扑上去、躲开、跳走）简单到能装进一张小电路，又真实到值得研究。", "The fruit fly is among the most complex animals whose whole brain has been mapped, and its behaviour, lunge, dodge, leap away, fits in a small circuit while staying worth studying.")}</p></details>
          </div>
        </section>

        <div className="docs-end panel">
          <h2>{t("第一场只要买一张芯片。", "Your first fight takes one chip.")}</h2>
          <div className="row">
            <Link className="btn primary" href="/workshop">{t("开始造果蝇", "Build a fly")}</Link>
            <Link className="btn" href="/tapeout">{t("上链", "On chain")}</Link>
            <Link className="btn" href="/proof">{t("核查我们的说法", "Check our claims")}</Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
