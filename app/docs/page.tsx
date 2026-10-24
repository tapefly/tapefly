import Link from "next/link";
import { SiteNav, SiteFooter } from "../components/ui/Shell";
import { BRAIN } from "@/sim/netlist";
import { netDepth, cost } from "@/sim/compile";
import { SWITCHES, programFromSwitches, type Switches } from "@/sim/instincts";
import { brainFromProgram, card } from "@/sim/challenge";
import { nandNeeded } from "@/sim/onchain";
import { TUNE, WORLD } from "@/sim/engine";
import { COLONY_SIZE } from "@/sim/colony";
import config from "@/config/tapeout.json";
import { getLang, serverT } from "../i18n/server";
import { ANCHORS } from "@/sim/anchor";

/* The whole picture in one page. Rule for every sentence: either it can be
   checked on this site or on chain today, or it carries a Next / Planned tag.
   Numbers that come from the code are computed here, not typed in. */

export async function generateMetadata() {
  const t = await serverT();
  return {
    title: t("文档 — TapeFly", "Docs — TapeFly"),
    description: t("TapeFly 全貌：BNB Chain 上的永生果蝇，大脑用 TapeOut 的 NAND 门搭成。缘起、愿景、玩法、技术、经济模型、路线图。", "TapeFly in full: immortal fruit flies on BNB Chain, with brains built from TapeOut's NAND gates. Origins, vision, play, technology, economics and roadmap.")
  };
}

type State = "live" | "next" | "later";
const TAG: Record<State, [string, string]> = { live: ["已上线", "Live"], next: ["下一步", "Next"], later: ["计划中", "Planned"] };
const Tag = async ({ s }: { s: State }) => <span className={`dtag ${s}`}>{(await getLang()) === "zh" ? TAG[s][0] : TAG[s][1]}</span>;

const TOC: [string, string, string][] = [
  ["why-now", "为什么是现在", "Why now"],
  ["immortal", "永生果蝇", "Immortal flies"],
  ["vision", "愿景", "Vision"],
  ["day", "一天怎么过", "How a day works"],
  ["brain", "大脑", "The brain"],
  ["tech", "技术", "Technology"],
  ["play", "玩法", "Play"],
  ["tapeout", "TapeOut", "TapeOut"],
  ["economics", "经济模型", "Economics"],
  ["earn", "怎么赚钱", "Ways to earn"],
  ["build", "开发者与智能体", "Builders & agents"],
  ["roadmap", "路线图", "Roadmap"],
  ["promises", "我们不做什么", "What we won't do"],
  ["glossary", "术语表", "Glossary"],
  ["faq", "常见问题", "Questions"]
];

const COMBO_ORDER: Switches[] = [
  { eat: true, flee: false, jump: false, roam: false },
  { eat: true, flee: true, jump: false, roam: false },
  { eat: true, flee: true, jump: false, roam: true },
  { eat: true, flee: true, jump: true, roam: true },
  { eat: false, flee: false, jump: true, roam: false }
];

export default async function DocsPage() {
  const t = await serverT();
  const zh = (await getLang()) === "zh";
  const live = config.status === "live";
  const combos = COMBO_ORDER.map((s) => {
    const b = brainFromProgram(programFromSwitches(s));
    const c = card(b.netlist);
    const names = SWITCHES.filter((x) => s[x.id]).map((x) => (zh ? x.zh : x.label)).join(" + ");
    return { names, gates: c.gates, depth: c.depth, cost: c.cost, nand: nandNeeded(b.netlist) };
  });
  const PRICE = 0.00005; // the default NAND price on the TapeFly processor form
  const starveTicks = Math.ceil(TUNE.hMax / TUNE.hStep);
  const S = (n: number) => String(n).padStart(2, "0");
  let k = 0;
  const H = (id: string, zhT: string, enT: string) => <h2 id={`${id}-h`}><span>{S(++k)}</span>{t(zhT, enT)}</h2>;

  return (
    <main>
      <SiteNav here="/docs" />
      <div className="page docs">
        <header className="docs-hero">
          <p className="kicker">{t("TapeFly 文档", "TapeFly docs")}</p>
          <h1>{t("BNB Chain 上的永生果蝇。", "Immortal fruit flies, on BNB Chain.")}</h1>
          <p className="lede">
            {t("每只 TapeFly 果蝇都有一颗用 TapeOut 的 NAND 门搭成的大脑。大脑可以流片上链，永远不会被删改；它活过的每一天都能只凭日期重放，分毫不差；每一代都由上一代的冠军繁衍。你来设计大脑，和朋友对战，赢下赛季，把最好的那颗放上链，真正拥有它。",
               "Every TapeFly fly has a brain built from TapeOut’s NAND gates. The brain can be taped out on chain, where it can never be edited or deleted; every day it lives can be replayed from its date alone, exactly; every generation is born from the last one’s champion. You design the brain, race your friends, win the season, and put the best one on chain as something you own.")}
          </p>
          <div className="docs-stats">
            <div><b>4</b><span>{t("个本能开关，16 种大脑等你发现", "instinct switches, 16 brains to discover")}</span></div>
            <div><b>{BRAIN.gates.length}</b><span>{t(`个 NAND 门组成官方大脑，${netDepth(BRAIN)} 层深`, `NAND gates in the official brain, ${netDepth(BRAIN)} deep`)}</span></div>
            <div><b>4,096</b><span>{t("个问题证明链上的大脑，免费提问", "questions that prove a brain on chain, free to ask")}</span></div>
            <div><b>0</b><span>{t("个数据库。每一天只凭日期就能重放", "databases. Every day replays from its date alone")}</span></div>
          </div>
          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn primary" href="/">{t("先玩 10 秒", "Play for ten seconds")}</Link>
            <a className="btn" href="#immortal">{t("永生果蝇是什么意思", "What “immortal” means")}</a>
          </div>
        </header>

        <nav className="docs-toc" aria-label={t("本页目录", "On this page")}>
          {TOC.map(([id, z, e], i) => <a key={id} href={`#${id}`}><span>{S(i + 1)}</span>{t(z, e)}</a>)}
        </nav>

        {/* 01 why now */}
        <section id="why-now" className="docs-sec">
          {H("why-now", "为什么是现在", "Why now")}
          <p className="big">{t("三件事在同一年撞到了一起。", "Three things collided in the same year.")}</p>
          <ol className="docs-time">
            <li><b>2024</b><div><strong>{t("第一张完整的果蝇大脑图", "The first complete fly brain map")}</strong><p>{t("FlyWire 联盟发表了成年雌性果蝇的完整神经连接图：约 14 万个神经元，第一次有一种复杂动物的整个大脑被画了出来。", "The FlyWire consortium published the full wiring map of an adult female fruit fly: about 140,000 neurons, the first whole brain of a complex animal ever mapped.")}</p></div></li>
            <li><b>{t("2026 年 9 月", "Sep 2026")}</b><div><strong>{t("雄性果蝇大脑开源，互联网玩疯了", "The male fly brain goes open, and the internet runs with it")}</strong><p>{t("HHMI Janelia 和 Google Research 发布了雄性果蝇的完整连接组（约 16.6 万个神经元）。很快就有人让模拟的果蝇大脑去打游戏、开无人机、交易加密货币。", "HHMI Janelia and Google Research released the male fly’s full connectome (about 166,000 neurons). Within days people had simulated fly brains playing games, flying drones and trading crypto.")}</p></div></li>
            <li><b>{t("2026 年 9 月 15 日", "15 Sep 2026")}</b><div><strong>{t("CZ：“永生果蝇”", "CZ: “immortal fruit flies”")}</strong><p>{t(<>CZ 发推说，如果有人在 BNB Chain 上做出“永生果蝇”会很酷（<a className="link" href="https://x.com/cz_binance/status/2099713592903995839" target="_blank" rel="noreferrer">原推</a>）。YZi Labs 的 Siyuan 接着提出：BNB Chain 可以永久记录大脑的状态、记忆和经历，让大脑死后重生，或者多个大脑一起进化。</>,
                 <>CZ posted that it would be cool to see someone create &ldquo;immortal fruit flies&rdquo; on BNB Chain (<a className="link" href="https://x.com/cz_binance/status/2099713592903995839" target="_blank" rel="noreferrer">the post</a>). Siyuan of YZi Labs followed up: BNB Chain could be a permanent record of brain states, memories and histories, letting a brain be reborn after death or evolve with others.</>)}</p></div></li>
            <li><b>{t("同一时间", "Meanwhile")}</b><div><strong>{t("TapeOut：链上的硬件", "TapeOut: hardware on chain")}</strong><p>{t("TapeOut 在 BNB Chain 上把 NAND 门变成了代币：任何人都能把电路“流片”上链，铸成 NFT，谁都能免费验证它。大脑说到底就是电路。", "TapeOut turned NAND gates into tokens on BNB Chain: anyone can “tape out” a circuit on chain, mint it as an NFT, and anyone can check it for free. A brain, in the end, is a circuit.")}</p></div></li>
          </ol>
          <p>{t("TapeFly 就站在这三者交汇的地方：真实果蝇的行为、BNB Chain 上的永生，以及 TapeOut 的链上电路。", "TapeFly stands where the three meet: real fly behaviour, immortality on BNB Chain, and TapeOut’s on-chain circuits.")}</p>
          <p className="dim">{t("TapeFly 是独立项目，与 CZ、Binance、YZi Labs 和 TapeOut 团队都没有关联，也没有得到他们的背书。", "TapeFly is independent. It is not affiliated with or endorsed by CZ, Binance, YZi Labs or the TapeOut team.")}</p>
        </section>

        {/* 02 immortal */}
        <section id="immortal" className="docs-sec">
          {H("immortal", "永生果蝇：我们怎么做到", "Immortal flies: how TapeFly does it")}
          <p className="big">{t("在 TapeFly 里，“永生”不是一句口号，而是五件可以验证的事。", "In TapeFly, “immortal” is not a slogan. It is five things you can check.")}</p>
          <div className="docs-cards two">
            <div><Tag s={live ? "live" : "next"} /><b>{t("1 · 大脑永远在链上", "1 · The brain lives on chain for good")}</b><p>{t("流片之后，大脑电路存在 BNB Chain 上，谁都改不了、删不掉，包括我们。只要链在，这颗大脑就在，任何人随时都能向它提问。", "Once taped out, the brain’s circuit sits on BNB Chain. Nobody can edit or delete it, us included. As long as the chain exists, the brain exists, and anyone can ask it questions at any time.")} {live ? null : t("链上状态还没有同步到网站配置；请以流片面板和链上核对结果为准。", "The on-chain status has not been synced to the site configuration yet; use the tape-out panel and on-chain verification as the source of truth.")} <Link className="link" href="/tapeout#tape-out">{t("流片面板", "Tape-out panel")}</Link></p></div>
            <div><Tag s="live" /><b>{t("2 · 每一天都能复活", "2 · Every day can be brought back")}</b><p>{t("一天里发生的一切，都只由日期决定。十年后输入同一个日期，同一只果蝇会在同一个培养皿里醒来，走出完全一样的每一步。死亡只是这一天的结局，不是这只果蝇的终点。", "Everything in a day follows from its date. Enter the same date ten years from now and the same fly wakes in the same dish and takes exactly the same steps. Death ends a day, not the fly.")}</p></div>
            <div><Tag s="live" /><b>{t("3 · 血统从不中断", "3 · The bloodline never breaks")}</b><p>{t(`每天早上的 ${COLONY_SIZE} 只果蝇，都由前一天活得最久的冠军繁衍而来，身体略有变异。这条血统从纪元第一天起从未中断，写在账本里，任何人都能重算。`, `Each morning’s ${COLONY_SIZE} flies are born from yesterday’s longest-lived champion, with small mutations. The line has run unbroken since the first day, kept in a ledger anyone can recompute.`)} <Link className="link" href="/lineage">{t("看血统", "See the lineage")}</Link></p></div>
            <div><Tag s="live" /><b>{t("4 · 记忆被封存", "4 · Memories are sealed")}</b><p>{t("果蝇活过的每一步都折进一条哈希链。改掉任何一步，哈希就会变。这是它的记忆，也是它的身份证。", "Every step a fly lives is folded into a hash chain. Change any step and the hash changes. It is the fly’s memory and its proof of identity.")} <Link className="link" href="/verify">{t("核查一条记忆", "Check a memory")}</Link></p></div>
            <div className="wide"><Tag s={ANCHORS.entries.length ? "live" : "next"} /><b>{t("5 · 记忆刻在 BNB Chain 上", "5 · Memory written on BNB Chain")}</b><p>{t("每天，从第一天起整条血统（每一位冠军的身体、寿命和每一步的哈希）被折成一个“血统哈希”，用一笔交易写上 BNB Chain。这正是“BNB Chain 永久记录大脑的状态和记忆”的字面意思：链上的那一行，任何人都能拿日期重新算出来对照。", "Every day, the whole lineage since the first day (every champion’s body, life and the hash of every step) is folded into one lineage head and written onto BNB Chain in a transaction. That is “BNB Chain as a permanent record of brain states and memories”, literally: a line on chain that anyone can recompute from the dates and compare.")} {ANCHORS.entries.length
              ? <>{t(`已锚定 ${ANCHORS.entries.length} 天，最近一天是 ${ANCHORS.entries[ANCHORS.entries.length - 1].date}。`, `${ANCHORS.entries.length} days anchored so far, the latest ${ANCHORS.entries[ANCHORS.entries.length - 1].date}.`)} </>
              : <>{t("每日锚定已经做好，等第一笔交易发出。", "Daily anchoring is built and waiting for its first transaction.")} </>}<Link className="link" href="/lineage#on-chain">{t("看链上记录", "See the record on chain")}</Link></p></div>
          </div>
          <p>{t("Siyuan 设想的“链上永久记录、死后重生、共同进化”，在 TapeFly 里就是：大脑上链（不朽的身体），血统哈希每天写上链（永久的记忆），日期重放（重生），冠军繁衍（进化），玩家的大脑在同一个培养皿里比拼（多个大脑共同进化）。", "The “permanent record, rebirth after death, shared evolution” Siyuan described is, in TapeFly: a brain on chain (the undying body), the lineage head written on chain daily (lasting memory), replay by date (rebirth), champions breeding the next generation (evolution), and players’ brains competing in the same dish (many brains evolving together).")}</p>
        </section>

        {/* 03 vision */}
        <section id="vision" className="docs-sec">
          {H("vision", "愿景", "Vision")}
          <p className="big">{t("大脑应该是可以搭建、测试、拥有和交易的东西，而且任何人都能验证它。", "Brains should be things you can build, test, own and trade, and anyone should be able to check them.")}</p>
          <div className="docs-cards three">
            <div><b>{t("小到能看懂", "Small enough to understand")}</b><p>{t("TapeFly 的大脑只有几十个逻辑门。果蝇做决定时，你能看到每根线亮起来。没有什么藏在没人读得懂的模型里。", "A TapeFly brain is a few dozen logic gates. You can see every wire light up as the fly decides. Nothing is hidden in a model nobody can read.")}</p></div>
            <div><b>{t("真到能拥有", "Real enough to own")}</b><p>{t("在 TapeOut 上流片后，大脑就成了 BNB Chain 上的一个电路，附带一个证明归你所有的 NFT。", "Taped out on TapeOut, a brain becomes a circuit on BNB Chain with an NFT that says it is yours.")}</p></div>
            <div><b>{t("开放到能信任", "Open enough to trust")}</b><p>{t("每一天都能重放，每颗链上大脑都能免费提问。你不需要相信我们说的任何一个数字。", "Every day replays and every brain on chain answers questions for free. You never have to take our word for a number.")}</p></div>
          </div>
          <p>{t("我们从反射开始：觅食、逃跑、弹跳、探索。这是今天一个人能亲手设计、也付得起上链成本的大脑尺寸。更远的方向是：大脑由别的大脑组合而成（TapeOut 支持电路引用），由人和 AI 智能体一起比拼，在链上留下一条公开、可核查、永不中断的血统。",
                "We start with reflexes: eat, flee, jump, explore. That is the size of brain a person can design by hand and afford to put on chain today. The long arc is brains composed from other brains (TapeOut supports circuit references), raced by people and AI agents, leaving a public, checkable, unbroken lineage on chain.")}</p>
        </section>

        {/* 04 a day */}
        <section id="day" className="docs-sec">
          {H("day", "一天怎么过", "How a day works")}
          <div className="docs-cards three">
            <div><b>{t("培养皿", "The dish")}</b><p>{t(`一个 ${WORLD.w} × ${WORLD.h} 格的圆形培养皿。每天由日期生成：${TUNE.food} 颗食物，几个陷阱，位置天天不同。`, `A round dish of ${WORLD.w} × ${WORLD.h} cells, generated from the date: ${TUNE.food} drops of food and a few traps, in new places every day.`)}</p></div>
            <div><b>{t("身体", "The body")}</b><p>{t(`每走一步饥饿加 ${TUNE.hStep}，到 ${TUNE.hMax} 就饿死；吃一口减 ${TUNE.hFood}。不吃东西，大约 ${starveTicks} 步就会死。踩进陷阱当场死亡。`, `Hunger rises ${TUNE.hStep} a step and kills at ${TUNE.hMax}; a meal takes off ${TUNE.hFood}. Without food a fly dies in about ${starveTicks} steps. Stepping on a trap kills at once.`)}</p></div>
            <div><b>{t("天黑", "Dusk")}</b><p>{t(`一天 ${TUNE.ticks} 步。撑到第 ${TUNE.ticks} 步就算活到了天黑。比赛先比活没活到天黑，再比活了几步，再比吃了几口。`, `A day is ${TUNE.ticks} steps. Reaching step ${TUNE.ticks} is reaching dusk. Races compare dusk first, then steps lived, then meals.`)}</p></div>
          </div>
          <ol className="docs-pipe">
            <li><b>{t("感知", "Sense")}</b><span>{t("闻食物、看危险、感光线、觉新奇、知饥饿，再记住上一步。", "Smell food, see danger, feel light, notice novelty, know hunger, and remember the last move.")}</span></li>
            <li><b>{t("分级", "Level")}</b><span>{t("每种感觉分成 4 级（0 到 3），一共拼成 12 位。", "Each sense becomes one of four levels (0 to 3); together they make 12 bits.")}</span></li>
            <li><b>{t("决定", "Decide")}</b><span>{t("12 位送进 NAND 电路，出来 3 位：靠近、躲开、探索、不动，外加要不要弹跳。", "The 12 bits go through the NAND circuit; 3 bits come out: approach, avoid, explore or freeze, plus whether to jump.")}</span></li>
            <li><b>{t("行动", "Act")}</b><span>{t("果蝇走一格，世界更新，这一步写进哈希链。", "The fly moves one cell, the world updates, and the step is written into the hash chain.")}</span></li>
            <li><b>{t("重复", "Repeat")}</b><span>{t(`一直到天黑（第 ${TUNE.ticks} 步），或者死掉。`, `Until dusk (step ${TUNE.ticks}) or death.`)}</span></li>
          </ol>
        </section>

        {/* 05 brain */}
        <section id="brain" className="docs-sec">
          {H("brain", "大脑", "The brain")}
          <p>{t("TapeFly 的大脑不是神经网络，而是一组看得懂的规则，被编译成 NAND 门。官方大脑参照真实果蝇的行为调出来，包括真实存在的“巨纤维”逃逸反射：危险贴身时，果蝇不经思考一跳逃开。",
                "A TapeFly brain is not a neural network. It is a set of readable rules compiled into NAND gates. The official brain is tuned to real fly behaviour, including the real Giant Fibre escape reflex: when danger touches it, a fly jumps away without thinking.")}</p>
          <div className="docs-cards two">
            <div><b>{t("官方大脑", "The official brain")}</b><p>{t(`${BRAIN.gates.length} 个 NAND 门，${netDepth(BRAIN)} 层深，TapeOut 成本 ${cost(BRAIN).toLocaleString()}。它和一只照文献单独写出的参考果蝇逐一比对过全部 4,096 种情况。`, `${BRAIN.gates.length} NAND gates, ${netDepth(BRAIN)} deep, TapeOut cost ${cost(BRAIN).toLocaleString()}. It has been compared, case by case, with a reference fly written separately from the literature on all 4,096 situations.`)} <Link className="link" href="/calibrate">{t("看考卷", "See the exam")}</Link></p></div>
            <div><b>{t("你的大脑", "Your brain")}</b><p>{t("四个开关就是四条现成规则；大脑编辑器让你自己写规则。规则越精炼，门越少，流片越便宜，平局时也越占优。", "The four switches are four ready-made rules; the brain editor lets you write your own. Tighter rules mean fewer gates, a cheaper tape-out and the edge in a tie.")} <Link className="link" href="/build">{t("打开编辑器", "Open the editor")}</Link></p></div>
          </div>
          <table className="docs-table">
            <thead><tr><th>{t("开关组合", "Switches on")}</th><th className="num">{t("NAND 门", "NAND gates")}</th><th className="num">{t("层数", "Depth")}</th><th className="num">{t("TapeOut 成本", "TapeOut cost")}</th><th className="num">{t("流片需持有 NAND", "NAND to tape out")}</th></tr></thead>
            <tbody>
              {combos.map((c) => <tr key={c.names}><td>{c.names}</td><td className="num">{c.gates}</td><td className="num">{c.depth}</td><td className="num">{c.cost.toLocaleString()}</td><td className="num">{c.nand}</td></tr>)}
              <tr><td>{t("官方大脑", "Official brain")}</td><td className="num">{BRAIN.gates.length}</td><td className="num">{netDepth(BRAIN)}</td><td className="num">{cost(BRAIN).toLocaleString()}</td><td className="num">{nandNeeded(BRAIN)}</td></tr>
            </tbody>
          </table>
          <p className="dim">{t("流片时每个门烧掉 1 个 NAND，另付 0.0002 BNB 流片费。哪种组合最能活，每天都不一样，去首页试。", "A tape-out burns one NAND per gate, plus a 0.0002 BNB tape-out fee. Which combination survives best changes daily: try it on the home page.")}</p>
        </section>

        {/* 06 tech */}
        <section id="tech" className="docs-sec">
          {H("tech", "技术", "Technology")}
          <ol className="docs-pipe">
            <li><b>{t("规则", "Rules")}</b><span>{t("当什么发生，就做什么；从上往下第一条符合的说了算。", "When this, do that; the first rule that matches decides.")}</span></li>
            <li><b>{t("编译", "Compile")}</b><span>{t("编译器把规则变成 NAND 门，并在全部 4,096 种输入上和规则逐一比对。", "A compiler turns the rules into NAND gates and checks them against the rules on all 4,096 inputs.")}</span></li>
            <li><b>{t("字节", "Bytes")}</b><span>{t("按 TapeOut 的电路格式写出：每个 NAND 7 字节。", "Written in TapeOut’s circuit format: 7 bytes per NAND.")}</span></li>
            <li><b>{t("流片", "Tape out")}</b><span>{t("tapeout(字节, 12, 3) 烧掉晶体管，把电路存上 BNB Chain，铸成 NFT。", "tapeout(bytes, 12, 3) burns transistors, stores the circuit on BNB Chain and mints the NFT.")}</span></li>
            <li><b>{t("验证", "Verify")}</b><span>{t("免费的只读调用 eval 回答任何输入；全部 4,096 个答案逐一比对。", "The free read-only eval answers any input; all 4,096 answers are compared.")}</span></li>
          </ol>
          <div className="docs-cards two">
            <div><Tag s="live" /><b>{t("确定性的世界", "Deterministic world")}</b><p>{t("培养皿、食物、陷阱和每只果蝇的身体都由日期生成。全部是整数运算，所以每台设备算出的都是同一天。", "The dish, food, traps and every fly’s body come from the date. Integer maths only, so every device computes the same day.")} <Link className="link" href="/verify">{t("重放某一天", "Replay a day")}</Link></p></div>
            <div><Tag s="live" /><b>{t("哈希链与账本", "Hash chain and ledgers")}</b><p>{t("每一步折进哈希，每一天链到前一天；血统和赛季都是提交在仓库里的账本，检查程序会从头重算，对不上就报错。", "Every step is folded into a hash and every day chained to the last; the lineage and the seasons are committed ledgers that a check recomputes from scratch and rejects on any difference.")} <Link className="link" href="/lineage">{t("看账本", "See the ledger")}</Link></p></div>
            <div><Tag s="live" /><b>{t("先模拟再签名", "Simulate, then sign")}</b><p>{t("流片面板先读链上价格，再免费模拟一次交易，确认会成功才请钱包签名。网站从不接触私钥。", "The tape-out panel reads prices from the chain and simulates the transaction for free before asking a wallet to sign. The site never touches a key.")} <Link className="link" href="/tapeout#tape-out">{t("流片面板", "Tape-out panel")}</Link></p></div>
            <div><Tag s="live" /><b>{t("没有服务器状态", "No server state")}</b><p>{t("没有数据库，没有账号。对战是一个链接，大脑是一串短代码。网站停了，任何人拿着代码和日期也能把一切算回来。", "No database, no accounts. A match is a link and a brain is a short code. If the site went away, anyone with the code and a date could compute everything back.")}</p></div>
          </div>
        </section>

        {/* 07 play */}
        <section id="play" className="docs-sec">
          {H("play", "玩法", "Play")}
          <div className="docs-cards three">
            <div><b>{t("十秒上手", "Ten seconds to start")}</b><p>{t("拨一个开关，看你的果蝇过完这一天。不用钱包，不用注册。", "Flip a switch and watch your fly live the day. No wallet, no sign-up.")} <Link className="link" href="/">{t("开始", "Start")}</Link></p></div>
            <div><b>{t("开得多不等于好", "More is not better")}</b><p>{t("把所有本能都打开，弹跳反射可能把你的果蝇送进陷阱。找出能撑满 7 天的组合。", "Turn every instinct on and the jump reflex can throw your fly into a trap. Find the combination that survives all seven days.")}</p></div>
            <div><b>{t("门越少，脑越精", "Fewer gates, sharper brain")}</b><p>{t("两颗大脑撑过同样的一周，就比谁更小。最小的大脑赢得平局，流片也最便宜。", "Two brains that survive the same week are split by size. The smallest wins the tie and is the cheapest to put on chain.")}</p></div>
            <div><b>{t("和朋友对战", "Race a friend")}</b><p>{t("发一个链接。两只果蝇在同一个培养皿里醒来，抢同样的食物，谁先到谁吃，连比 7 天。", "Send a link. Both flies wake in the same dish and race for the same food, first come first served, seven days in a row.")} <Link className="link" href="/vs">{t("对战", "Race")}</Link></p></div>
            <div><b>{t("每周赛季", "Weekly seasons")}</b><p>{t("每周一（UTC）开新赛季。7 个培养皿里最强的玩家大脑拿走奖杯，结果写进任何人都能重算的账本。官方基准只陪跑，永远拿不了奖杯。", "A new season every Monday (UTC). The best player brain over seven dishes takes the trophy, written to a ledger anyone can recompute. House baselines run along but never take a trophy.")} <Link className="link" href="/board">{t("冠军榜", "Champions")}</Link></p></div>
            <div><b>{t("每天一个新培养皿", "A new dish every day")}</b><p>{t("食物和陷阱天天换位置，上周的冠军这周也可能翻车。没有一劳永逸的大脑。", "Food and traps move every day, so last week’s champion can fall this week. No brain wins forever.")}</p></div>
          </div>
        </section>

        {/* 08 tapeout */}
        <section id="tapeout" className="docs-sec">
          {H("tapeout", "建立在 TapeOut 上", "Built on TapeOut")}
          <p>{t("TapeOut 是 BNB Chain 上的协议：电路由 NAND 和 LATCH 晶体管代币组成，流片会烧掉这些代币，把电路铸成 NFT。每个处理器自己发行晶体管；特定处理器上的电路还能参加“设计证明”挖矿。TapeFly 把 TapeOut 当作果蝇大脑的硬件。",
                "TapeOut is a protocol on BNB Chain: circuits are made of NAND and LATCH transistor tokens, and taping out burns them and mints the circuit as an NFT. Each processor issues its own transistors; circuits on certain processors can join Proof-of-Design mining. TapeFly uses TapeOut as the hardware for fly brains.")}</p>
          <table className="docs-table tagged">
            <thead><tr><th>{t("TapeOut 概念", "TapeOut idea")}</th><th>{t("在 TapeFly 里", "In TapeFly")}</th><th /></tr></thead>
            <tbody>
              <tr><td>{t("NAND 晶体管代币", "NAND transistor tokens")}</td><td>{t("果蝇大脑里的每个门就是一个 NAND。你拨开关时，首页实时显示门数。", "Every gate in your fly’s brain is one NAND. The home page shows the count as you flip switches.")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("流片、电路 NFT", "Tape-out, circuit NFT")}</td><td>{t("在“上链”页面用你自己的钱包流片；NFT 归你。", "Tape out from your own wallet on the On TapeOut page; the NFT is yours.")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("eval 只读调用", "eval, read-only")}</td><td>{t("用来逐个答案证明：上链的大脑就是你比赛用的那颗。", "Proves, answer by answer, that the brain on chain is the one you raced.")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("门数 × 层数³", "gates × depth³")}</td><td>{t("TapeOut 自己的电路成本指标。TapeFly 给每颗大脑显示它，并用大小打破平局。", "TapeOut’s own cost measure. TapeFly shows it for every brain and breaks ties on size.")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("处理器", "Processors")}</td><td>{t("官方处理器的 NAND 已经卖完。TapeFly 处理器已经上线，并直接出售果蝇大脑需要的 NAND。", "The official processors’ NAND has sold out. The TapeFly processor is live and sells the NAND a fly brain needs.")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("电路引用（REF）", "Circuit references (REF)")}</td><td>{t("一个电路可以引用另一个已上链的电路。这让“大脑由大脑组成”、后代继承祖先成为可能。", "A circuit can reference another taped-out circuit. That makes brains built from brains, and offspring inheriting ancestors, possible.")}</td><td><Tag s="later" /></td></tr>
              <tr><td>{t("设计证明（PoD）挖矿", "Proof-of-Design mining")}</td><td>{t("TapeOut 奖励做出最小正确电路的矿工。TapeFly 练的就是这项本事。我们起草了一个“果蝇反射”挖矿任务提案。", "TapeOut rewards miners for the smallest correct circuits. TapeFly trains exactly that skill. We drafted a proposal for a fly-reflex mining task.")}</td><td><Tag s="later" /></td></tr>
            </tbody>
          </table>
          <p className="dim">{t("TapeOut 市场快照（2026 年 10 月 21 日，来自公开数据镜像）：1,383 个处理器，6,006 个电路挂单，电路累计成交约 2,394 BNB，最近一天约 79 BNB。", "TapeOut market snapshot, 21 Oct 2026, from the public data mirror: 1,383 processors, 6,006 circuit listings, about 2,394 BNB traded in circuits in total and about 79 BNB in the last day.")}</p>
        </section>

        {/* 09 economics */}
        <section id="economics" className="docs-sec">
          {H("economics", "经济模型", "Economics")}
          <p className="big">{t("没有代币，没有收益承诺，没有下注。只有当有人把真电路放上链、或者交易电路时，价值才会流动。", "No token, no promised yield, no betting. Value moves only when someone puts a real circuit on chain or trades one.")}</p>
          <div className="docs-flow" aria-label={t("价值怎么流动", "How value moves")}>
            <div className="node"><b>{t("玩家", "Player")}</b><span>{t("免费设计、对战", "designs and races for free")}</span></div>
            <div className="arrow">{t("买 NAND →", "buys NAND →")}</div>
            <div className="node"><b>{t("处理器", "Processor")}</b><span>{t("按固定价格卖晶体管", "sells transistors at a fixed price")}</span></div>
            <div className="arrow">{t("流片烧掉它们 →", "tape-out burns them →")}</div>
            <div className="node"><b>{t("电路 NFT", "Circuit NFT")}</b><span>{t("归玩家所有，可在 TapeOut 市场交易", "owned by the player, tradable on TapeOut’s market")}</span></div>
          </div>
          <table className="docs-table tagged">
            <thead><tr><th>{t("谁", "Who")}</th><th>{t("付出", "Pays")}</th><th>{t("得到", "Gets")}</th><th /></tr></thead>
            <tbody>
              <tr><td>{t("玩家", "Player")}</td><td>{t("大脑需要的 NAND、处理器的流片费、gas", "NAND for the brain, the processor’s tape-out fee, gas")}</td><td>{t("自己大脑的电路 NFT，以及榜上的战绩", "A circuit NFT of their brain, with its record on the board")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("TapeFly 处理器", "TapeFly processor")}</td><td>{t("一次性的工厂费", "A one-time factory fee")}</td><td>{t("玩家在这里买 NAND 的收入。具体分成由 TapeOut 合约决定，链上可查", "NAND sales from players who tape out there. The split is set by TapeOut’s contracts and can be checked on chain")}</td><td><Tag s="live" /></td></tr>
              <tr><td>{t("每周冠军", "Weekly champion")}</td><td>{t("不用付", "Nothing")}</td><td>{t("自己的大脑由 TapeFly 出钱流片，电路 NFT 送到手", "Their brain taped out by TapeFly, the circuit NFT sent to them")}</td><td><Tag s="later" /></td></tr>
              <tr><td>TapeOut</td><td>{t("不用付", "Nothing")}</td><td>{t("每次流片都烧掉晶体管，供应只减不增", "Transistors burned with every tape-out, so supply only shrinks")}</td><td><Tag s="live" /></td></tr>
            </tbody>
          </table>
          <h3 className="docs-h3">{t("流片一颗大脑要多少钱", "What a tape-out costs")}</h3>
          <p>{t(`以 TapeFly 处理器的默认价格（每个 NAND ${PRICE} BNB，创建处理器时设定）估算，不含流片费和 gas：`, `At the TapeFly processor’s default price (${PRICE} BNB per NAND, set when it is created), before the tape-out fee and gas:`)}</p>
          <table className="docs-table">
            <thead><tr><th>{t("大脑", "Brain")}</th><th className="num">{t("NAND", "NAND")}</th><th className="num">{t("约合 BNB", "About BNB")}</th></tr></thead>
            <tbody>
              {combos.slice(0, 3).map((c) => <tr key={c.names}><td>{c.names}</td><td className="num">{c.nand}</td><td className="num">{(c.nand * PRICE).toFixed(5)}</td></tr>)}
              <tr><td>{t("官方大脑", "Official brain")}</td><td className="num">{nandNeeded(BRAIN)}</td><td className="num">{(nandNeeded(BRAIN) * PRICE).toFixed(5)}</td></tr>
            </tbody>
          </table>
          <p className="dim">{live
            ? t("第一次流片已经核对通过；冠军奖品在第一季竞技场开赛后开始。", "The first tape-out is verified; the champion prize begins when the first arena season opens.")
            : t("冠军奖品在第一季竞技场开赛后开始；具体状态以流片面板和链上记录为准。", "The champion prize begins when the first arena season opens; use the tape-out panel and on-chain record as the source of truth.")}</p>
        </section>

        {/* 10 earn */}
        <section id="earn" className="docs-sec">
          {H("earn", "怎么赚钱", "Ways to earn")}
          <p>{t("下面是今天围绕 TapeOut 真实存在的赚钱方式。没有一条是保证的，TapeFly 也不会因为你玩游戏就付钱给你。", "These are real ways people make money around TapeOut today. None is guaranteed, and TapeFly pays nobody for playing.")}</p>
          <div className="docs-cards two">
            <div><b>{t("卖大脑", "Sell a brain")}</b><p>{t("流片后的大脑是一个电路 NFT，可以挂到 TapeOut 市场上卖。有公开战绩（拿过几次赛季冠军、活了几天）的大脑，有一段买家能自己核查的故事。", "A taped-out brain is a circuit NFT you can list on TapeOut’s market. A brain with a public record (seasons won, days survived) has a story a buyer can check.")}</p><em>{t("风险：可能没人买。", "Risk: there may be no buyer.")}</em></div>
            <div><b>{t("用小电路挖矿", "Mine with small circuits")}</b><p>{t("TapeOut 的设计证明挖矿每天拿出 7,200 BEM，分给电路又小又对的人。TapeFly 训练的本事，用更少的门表达更多，正是挖矿奖励的本事。", "TapeOut’s Proof-of-Design mining shares 7,200 BEM a day among people whose circuits are small and correct. The skill TapeFly trains, saying more with fewer gates, is the skill mining pays for.")}</p><em>{t("风险：竞争激烈，奖励会变。", "Risk: competition is hard and rewards change.")}</em></div>
            <div><b>{t("赢下赛季", "Win a season")}</b><p>{t("从第一次流片核对通过开始，每周冠军都会收到自己大脑的电路 NFT，由 TapeFly 出钱流片。", "From the first verified tape-out on, the weekly champion receives their brain as a circuit NFT, taped out by TapeFly.")}</p><em>{t("计划中。", "Planned.")}</em></div>
            <div><b>{t("在 TapeFly 上做东西", "Build on TapeFly")}</b><p>{t("大脑是代码，对战是链接，记录是公开的。围绕它们做工具、机器人、教程、内容，谁都可以。", "Brains are codes, matches are links, records are public. Tools, bots, guides and content around them are open to anyone.")}</p><em>{t("你自己的项目，你自己定规则。", "Your own project, your own terms.")}</em></div>
          </div>
        </section>

        {/* 11 builders */}
        <section id="build" className="docs-sec">
          {H("build", "开发者与智能体", "Builders & agents")}
          <p>{t("TapeFly 从一开始就是给人和 AI 智能体一起用的。所有数据都是公开 JSON，任何来源都能读；过去的日期永远不变。", "TapeFly was built for people and AI agents alike. All data is open JSON, readable from any origin; past dates never change.")}</p>
          <table className="docs-table">
            <tbody>
              <tr><td><code>/api/v1/fly/&#123;date&#125;</code></td><td>{t("当天的果蝇和排名", "The day’s flies and ranking")}</td></tr>
              <tr><td><code>/api/v1/world/&#123;date&#125;</code></td><td>{t("当天的培养皿：食物、陷阱、出生格", "The day’s dish: food, traps, wake cell")}</td></tr>
              <tr><td><code>/api/v1/eval?word=N</code></td><td>{t("向官方大脑提任意一个问题", "Ask the official brain any question")}</td></tr>
              <tr><td><code>/api/v1/board</code></td><td>{t("所有参赛大脑和得分", "Every entered brain and its score")}</td></tr>
              <tr><td><code>/api/v1/tapeout</code></td><td>{t("大脑的 TapeOut 字节和上链状态", "The brain’s TapeOut bytes and on-chain status")}</td></tr>
            </tbody>
          </table>
          <p><Link className="link" href="/agents">{t("完整接口和签名记录 →", "All endpoints and signed records →")}</Link></p>
        </section>

        {/* 12 roadmap */}
        <section id="roadmap" className="docs-sec">
          {H("roadmap", "路线图", "Roadmap")}
          <ol className="docs-road">
            <li className="live"><b>{t("现在", "Now")}</b><ul>
              <li>{t("四个本能开关，大脑实时显示成电路", "Four instinct switches, the brain shown as a live circuit")}</li>
              <li>{t("用链接和朋友对战；每周赛季写进公开账本", "Race a friend by link; weekly seasons on a public ledger")}</li>
              <li>{t("流片面板：买 NAND、流片、核对全部 4,096 个答案", "Tape-out panel: buy NAND, tape out, verify all 4,096 answers")}</li>
              <li>{t("永不中断的血统账本、哈希链、签名记录", "An unbroken lineage ledger, hash chains and signed records")}</li>
              <li>{t("官方大脑第一次流片并完成全部答案核对", "The official brain taped out and fully verified on chain")}</li>
              <li>{t("TapeFly 处理器上线，玩家能买到大脑需要的 NAND", "The TapeFly processor is live, so players can buy the NAND a brain needs")}</li>
              <li>{t("中英双语", "Chinese and English")}</li>
            </ul></li>
            <li className="next"><b>{t("下一步", "Next")}</b><ul>
              <li>{t("每天把血统哈希写上 BNB Chain（已做好，等第一笔）", "The lineage head written onto BNB Chain every day (built, awaiting the first)")}</li>
              <li>{t("冠军奖品：每周最强大脑流片后送给它的作者", "Champion prize: the week’s best brain taped out and sent to its builder")}</li>
              <li>{t("网页内直接报名参赛，不用 GitHub", "Enter the board from the page, no GitHub needed")}</li>
            </ul></li>
            <li className="later"><b>{t("更远", "Later")}</b><ul>
              <li>{t("用电路引用，让后代继承祖先的大脑", "Offspring inheriting ancestors’ brains through circuit references")}</li>
              <li>{t("智能体联赛：AI 设计的大脑对人类设计的大脑", "An agent league: AI-designed brains against human ones")}</li>
              <li>{t("向 TapeOut 挖矿提议一个“果蝇反射”任务", "A fly-reflex task proposed to TapeOut’s mining")}</li>
              <li>{t("更大的大脑：从反射走向记忆（LATCH）", "Bigger brains: from reflexes to memory (LATCH)")}</li>
            </ul></li>
          </ol>
        </section>

        {/* 13 promises */}
        <section id="promises" className="docs-sec">
          {H("promises", "我们不做什么", "What we won't do")}
          <ul className="docs-list">
            <li>{t("不发 TapeFly 代币，不搞预售，不搞空投。", "No TapeFly token, no presale, no airdrop.")}</li>
            <li>{t("不承诺收益，不搞“持有就分红”。", "No promised returns, no pay-for-holding.")}</li>
            <li>{t("不做下注、不做赌博。对战和赛季只比大脑，不比钱。", "No betting or gambling. Races and seasons are about brains, not stakes.")}</li>
            <li>{t("不碰你的私钥。每一笔链上操作都由你自己的钱包签名。", "Never touch your keys. Every on-chain action is signed by your own wallet.")}</li>
            <li>{t("不冒充任何人。TapeFly 与 TapeOut 团队、CZ、Binance 都没有关联。", "Never impersonate anyone. TapeFly is not affiliated with the TapeOut team, CZ or Binance.")}</li>
          </ul>
        </section>

        {/* 14 glossary */}
        <section id="glossary" className="docs-sec">
          {H("glossary", "术语表", "Glossary")}
          <dl className="docs-gloss">
            <div><dt>NAND</dt><dd>{t("一种逻辑门：两个输入都是 1 时输出 0，否则输出 1。只用它就能搭出任何计算。", "A logic gate that outputs 0 only when both inputs are 1. Any computation can be built from it alone.")}</dd></div>
            <div><dt>{t("流片（Tape-out）", "Tape-out")}</dt><dd>{t("芯片行业的说法：设计定稿、交付制造。在 TapeOut 上指把电路永久存上链。", "Chip-industry word for sending a finished design to be made. On TapeOut, storing a circuit on chain for good.")}</dd></div>
            <div><dt>{t("晶体管代币", "Transistor token")}</dt><dd>{t("TapeOut 上的 NAND 或 LATCH 代币，流片时按门数烧掉。", "A NAND or LATCH token on TapeOut, burned per gate at tape-out.")}</dd></div>
            <div><dt>{t("处理器", "Processor")}</dt><dd>{t("TapeOut 上造电路的合约，各自发行自己的晶体管。", "A TapeOut contract where circuits are built; each issues its own transistors.")}</dd></div>
            <div><dt>{t("电路 NFT", "Circuit NFT")}</dt><dd>{t("流片时铸造的 NFT，证明电路归谁所有。", "The NFT minted at tape-out that says who owns the circuit.")}</dd></div>
            <div><dt>eval</dt><dd>{t("免费的只读调用：给链上电路一个输入，拿回它的输出。", "A free read-only call: give an on-chain circuit an input, get its output back.")}</dd></div>
            <div><dt>{t("连接组", "Connectome")}</dt><dd>{t("一个大脑里所有神经元及其连接的完整地图。", "A complete map of every neuron in a brain and how they connect.")}</dd></div>
            <div><dt>{t("巨纤维", "Giant Fibre")}</dt><dd>{t("果蝇身上真实存在的一条神经通路，危险贴身时触发一跳逃逸。", "A real neural pathway in flies that fires an escape jump when danger is close.")}</dd></div>
            <div><dt>{t("哈希链", "Hash chain")}</dt><dd>{t("每一步的指纹都包含前一步的指纹，改动任何一步都会被发现。", "Each step’s fingerprint includes the previous one, so changing any step shows.")}</dd></div>
            <div><dt>{t("设计证明（PoD）", "Proof of Design (PoD)")}</dt><dd>{t("TapeOut 的挖矿方式：奖励用更小电路正确完成任务的人，奖励代币是 BEM。", "TapeOut’s mining: it rewards whoever solves a task correctly with the smallest circuit, paid in BEM.")}</dd></div>
          </dl>
        </section>

        {/* 15 faq */}
        <section id="faq" className="docs-sec">
          {H("faq", "常见问题", "Questions")}
          <div className="docs-faq">
            <details><summary>{t("TapeFly 是 TapeOut 官方做的吗？", "Is TapeFly made by TapeOut?")}</summary><p>{t("不是。它是一个独立项目，建立在 TapeOut 公开的合约之上。", "No. It is an independent project built on TapeOut’s public contracts.")}</p></details>
            <details><summary>{t("和 CZ 有关系吗？", "Is CZ involved?")}</summary><p>{t("没有。CZ 说过希望有人在 BNB Chain 上做出“永生果蝇”，TapeFly 是我们对这个想法的回答，但没有得到他或 Binance 的任何背书。", "No. CZ said he would like to see someone make “immortal fruit flies” on BNB Chain; TapeFly is our answer to that idea, with no endorsement from him or Binance.")}</p></details>
            <details><summary>{t("TapeFly 有代币吗？", "Is there a TapeFly token?")}</summary><p>{t("没有。没有代币，没有预售，没有空投。任何声称有的都不是我们。", "No. There is no token, no presale and no airdrop. Anything claiming otherwise is not us.")}</p></details>
            <details><summary>{t("玩需要钱包吗？", "Do I need a wallet to play?")}</summary><p>{t("不需要。玩、对战、看冠军榜都免费，什么都不用。只有流片大脑才需要钱包。", "No. Playing, racing and the champions board are free and need nothing. A wallet is only for taping a brain out.")}</p></details>
            <details><summary>{t("流片要花多少钱？", "What does a tape-out cost?")}</summary><p>{t("大脑需要的 NAND、处理器的流片费和 gas。面板会从链上读出每一项价格，签名前把总数给你看。", "The NAND your brain needs, the processor’s tape-out fee and gas. The panel reads every price from the chain and shows the total before you sign.")}</p></details>
            <details><summary>{t("我怎么知道链上的大脑就是我比赛用的那颗？", "How do I know the brain on chain is the one I raced?")}</summary><p>{t("流片之后，网站立刻向电路问全部 4,096 个可能的问题，逐个比对答案。任何人都能免费再查一遍。", "Right after a tape-out the site asks the circuit all 4,096 possible questions and compares every answer. Anyone can repeat the check for free.")}</p></details>
            <details><summary>{t("果蝇死了怎么办？", "What happens when a fly dies?")}</summary><p>{t("那一天结束了，但它没有消失：那一天可以永远重放，它的大脑如果上了链也永远在。第二天，新的一代由前一天的冠军繁衍出来。", "That day ends, but the fly does not vanish: the day can be replayed forever, and its brain, if taped out, stays on chain. The next morning a new generation is born from yesterday’s champion.")}</p></details>
            <details><summary>{t("大脑会学习吗？", "Does the brain learn?")}</summary><p>{t("单颗大脑不会，它是固定的电路，这正是它能被验证的原因。进化发生在代与代之间，和玩家之间：你改规则，冠军繁衍，好的设计留下来。", "A single brain does not: it is a fixed circuit, which is exactly why it can be verified. Evolution happens between generations and between players: you change the rules, champions breed, good designs survive.")}</p></details>
            <details><summary>{t("为什么是果蝇？", "Why a fruit fly?")}</summary><p>{t("它是整个大脑被完整绘制出来的最复杂的动物；它每天要解决的问题，找吃的、躲危险，正好能装进一个小到可以拥有的电路。", "It is the most complex animal whose whole brain has been mapped, and its everyday problems, find food and avoid danger, fit in a circuit small enough to own.")}</p></details>
            <details><summary>{t("为什么在 BNB Chain？", "Why BNB Chain?")}</summary><p>{t("因为 TapeOut 在这里：链上电路、晶体管代币和电路市场都在 BNB Chain。“永生果蝇”的想法也是在这里提出的。", "Because TapeOut lives here: on-chain circuits, transistor tokens and the circuit market are all on BNB Chain. It is also where the “immortal fruit flies” idea was raised.")}</p></details>
          </div>
        </section>

        <div className="docs-end panel">
          <h2>{t("从拨一个开关开始。", "Start with one switch.")}</h2>
          <div className="row">
            <Link className="btn primary" href="/">{t("造一颗大脑", "Build a brain")}</Link>
            <Link className="btn" href="/tapeout#tape-out">{t("流片一颗", "Tape one out")}</Link>
            <Link className="btn" href="/proof">{t("核查我们的说法", "Check our claims")}</Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
