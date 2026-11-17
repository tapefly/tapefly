"use client";

/* The original home-page shell, now selling Workshop. Keep the same two-column
   hero, three-step cards, four-feature row, chip section, capability grid and
   closing CTA. Only the product story and the live demo change. */

import Link from "next/link";
import { useLang } from "./i18n/client";
import WorkshopHeroDemo from "./WorkshopHeroDemo";
import HomePlayModes from "./HomePlayModes";
import ContinueWorkshop from "./ContinueWorkshop";
import { PARTS } from "@/sim/workshop/parts";
import { WLEVELS } from "@/sim/workshop/levels";

const PART_COUNT = Object.keys(PARTS).length;
const CAMPAIGN_COUNT = WLEVELS.filter((l) => l.chapter !== 0).length;
const SANDBOX_COUNT = WLEVELS.filter((l) => l.chapter === 0).length;

export default function HomeArena({ circuitId, chainLive, officialGates }: { circuitId: number; chainLive: boolean; officialGates: number }) {
  const { t } = useLang();

  return (
    <div className="home2">
      <section className="home2-hero page">
        <div className="home2-copy">
          <p className="kicker">{t("TapeFly 工坊 · 物理搭建 × 神经接线", "TapeFly Workshop · build physics, wire a brain")}</p>
          <h1>{t("拼一只机器果蝇，接出它的大脑。", "Build a robot fly. Wire its brain.")}</h1>
          <p className="lede">{t(
            <>翅膀装在哪、配重加多少、眼睛接到哪只翅膀，都会改变它怎么飞。松开手，看它在关卡里自己找糖、躲开墙和逃过蜘蛛。</>,
            <>Where the wings sit, how much ballast you add and which wing an eye controls all change how it flies. Let go and watch it find sugar, avoid walls and escape spiders on its own.</>
          )}</p>
          <div className="row home2-cta">
            <Link className="btn primary big" href="/workshop">{t("开始造果蝇 →", "Build a fly →")}</Link>
            <ContinueWorkshop />
            <a className="btn" href="#how">{t("30 秒看懂玩法", "How it plays, in 30 s")}</a>
          </div>
          <p className="home2-free">{t("免费试玩 · 不用钱包 · 不用注册", "Free to play · no wallet · no sign-up")}</p>
        </div>
        <div className="home2-stage">
          <WorkshopHeroDemo />
        </div>
      </section>

      <HomePlayModes />

      <section id="how" className="page home2-sec">
        <h2>{t("一局怎么玩", "How a run works")}</h2>
        <ol className="home2-steps">
          <li>
            <span className="n">1</span>
            <b>{t("搭身体，感受重量", "Build the body and feel its weight")}</b>
            <p>{t("翅膀放在哪里、配重加多少，决定它的速度、重心和转弯半径。装歪了，它真的会往一边偏。", "Where the wings sit and how much ballast you add decide speed, balance and turning. Put them off-centre and it really pulls to one side.")}</p>
          </li>
          <li>
            <span className="n">2</span>
            <b>{t("接神经，写出行为", "Wire nerves into behaviour")}</b>
            <p>{t("把眼睛、触角、嘴、记忆格和节拍器接起来。逻辑块决定什么时候扇翅膀，记忆格让它记住刚刚发生过什么。", "Connect eyes, antennae, a mouth, memory cells and a metronome. Logic decides when a wing fires; memory lets it remember what just happened.")}</p>
          </li>
          <li>
            <span className="n">3</span>
            <b>{t("放飞，看回放再改", "Fly it, replay it, change one wire")}</b>
            <p>{t("你不操纵果蝇。撞墙后拖动时间轴，看哪一刻哪个感官亮了、哪只翅膀没有动，再改一根线重新飞。", "You do not steer. After a crash, scrub the timeline to see which sense fired and which wing stayed off, then change one wire and fly again.")}</p>
          </li>
        </ol>
      </section>

      <section className="page home2-sec">
        <h2>{t("每一关为什么会过，都看得见", "Every win and failure is visible")}</h2>
        <div className="home2-reads">
          <div><i className="r-body" aria-hidden /><b>{t("身体会影响结果", "The body changes the result")}</b><p>{t("翅膀、配重和位置都会参与物理，装错了会转圈、变慢或一撞就断。", "Wings, ballast and placement all take part in the physics. A bad build spins, slows down or snaps on impact.")}</p></div>
          <div><i className="r-replay" aria-hidden /><b>{t("失败可以逐刻回放", "Failure replays tick by tick")}</b><p>{t("拖动时间轴，就能看到撞墙前哪根神经亮了、哪只翅膀没有动。", "Scrub the timeline to see which nerve fired and which wing stayed off before the crash.")}</p></div>
          <div><i className="r-chip" aria-hidden /><b>{t("接线就是芯片", "The wiring is the chip")}</b><p>{t("你的每个逻辑块、记忆位和反相连接，都会变成真正的 NAND 门。", "Every logic block, memory bit and inverted connection becomes a real NAND gate.")}</p></div>
          <div><i className="r-proof" aria-hidden /><b>{t("同一设计，同一结果", "Same design, same result")}</b><p>{t("模拟完全确定；同一关卡、同一设计跑一万次，结果仍然一样。", "The simulation is deterministic: the same design in the same level gives the same run every time.")}</p></div>
        </div>
        <p className="dim">{t("所以失败不是“AI 突然变笨”，而是一条可以指出来、改掉并重新验证的接线。", "A failure is therefore not “the AI got worse”. It is a connection you can point to, change and test again.")}</p>
      </section>

      <section className="page home2-sec home2-chip">
        <div>
          <h2>{t("你接的神经就是一张真电路", "Your nerves are a real circuit")}</h2>
          <p>{t(
            <>你看到的是接线，背后是一张 <b>NAND 门电路</b>。逻辑块、记忆格和“反过来”都会编译成门；芯片视图会随着游戏逐刻亮起来。设计还能导出 Verilog 和 TapeOut 字节，离开游戏后仍然可以检查。</>,
            <>You see wiring; underneath is a <b>NAND circuit</b>. Logic blocks, memory cells and inverted nerves compile into gates, and the chip view lights up with the live game. A design can also export Verilog and TapeOut bytes so it can still be checked outside the game.</>
          )}</p>
          <div className="row">
            <Link className="btn" href="/docs#circuit">{t("电路怎么来的", "How the circuit is made")}</Link>
            <Link className="btn" href="/tapeout">{t("TapeOut 流片", "TapeOut")}</Link>
          </div>
        </div>
        <ul className="home2-facts">
          <li><b>{PART_COUNT}</b><span>{t("种零件，各有重量、耐久和价格", "part types, each with weight, durability and cost")}</span></li>
          <li><b>{CAMPAIGN_COUNT} + {SANDBOX_COUNT}</b><span>{t("个战役关卡与沙盒场地", "campaign levels and sandbox stages")}</span></li>
          <li><b>60 Hz</b><span>{t("确定性物理；同一设计可以逐刻重放", "deterministic physics; every run replays tick by tick")}</span></li>
          <li><b>{chainLive ? `#${circuitId}` : `${officialGates}`}</b><span>{chainLive ? t(`TapeOut 已接 X Layer；参考大脑 ${officialGates} 个门`, `TapeOut is wired to X Layer; the reference brain has ${officialGates} gates`) : t("个门：参考大脑待走 TapeOut 流片面板", "gates: the reference brain is awaiting the TapeOut panel")}</span></li>
        </ul>
      </section>

      <section className="page home2-sec">
        <h2>{t("工坊现在有什么", "What Workshop has today")}</h2>
        <div className="home2-built">
          {([
            ["/workshop", "live", "工坊战役", "Workshop campaign", `${CAMPAIGN_COUNT} 个关卡，从翅膀和配重一路学到记忆、节拍和计数`, `${CAMPAIGN_COUNT} levels, from wings and ballast to memory, rhythm and counting`],
            ["/workshop/gallery", "live", "玩家设计库", "Design library", "看别人发布的机器果蝇，载入、对决或继续改", "Browse published flies, load them, duel them or build on them"],
            ["/workshop", "live", "逐刻回放", "Tick-by-tick replay", "拖动时间轴回到任意一刻，查看感官、神经和翅膀信号", "Scrub to any tick and inspect every sense, nerve and wing signal"],
            ["/workshop", "live", "芯片视图", "Chip view", "看见接线编译出来的 NAND 门在游戏里实时亮起", "See the compiled NAND gates light up live while the game runs"],
            ["/workshop", "live", "沙盒场地", "Sandbox", `全部零件与 ${SANDBOX_COUNT} 个自由场地，没有固定答案`, `Every part and ${SANDBOX_COUNT} open stages with no prescribed answer`],
            ["/workshop", "live", "导出设计", "Export", "下载 Verilog，并查看同一设计对应的 TapeOut 字节", "Download Verilog and inspect the TapeOut bytes for the same design"],
            ["/workshop", "live", "Workshop Duel", "Workshop Duel", "同一份设计格式、同一个关卡、同一套物理，和朋友并排比", "The same design format, level and physics, raced side by side with a friend"],
            ["/tapeout", chainLive ? "live" : "next", "TapeOut 流片", "TapeOut", chainLive ? `X Layer 上的处理器电路 #${circuitId}，参考大脑 ${officialGates} 个门` : "流片面板已经接好；参考大脑等待在 X Layer 上完成流片", chainLive ? `Processor circuit #${circuitId} on X Layer; the reference brain has ${officialGates} gates` : "The tape-out panel is wired; the reference brain awaits its X Layer tape-out"]
          ] as [string, "live" | "next", string, string, string, string][]).map(([href, st, z, e, dz, de]) => (
            <Link key={z} href={href} className="home2-tile">
              <span className={`dtag ${st}`}>{st === "live" ? t("已上线", "Live") : t("进行中", "In progress")}</span>
              <b>{t(z, e)}</b>
              <span className="d">{t(dz, de)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page home2-sec home2-more">
        <Link href="/workshop/gallery" className="panel"><b>{t("设计库", "Design library")}</b><span>{t("看别人怎么搭、怎么接，再把设计载入自己的工坊", "See how others build and wire, then load a design into your bench")}</span></Link>
        <Link href="/tapeout" className="panel"><b>{t("TapeOut", "TapeOut")}</b><span>{t("把你的电路带出游戏，查看流片、证明和验证入口", "Take your circuit out of the game through tape-out, proof and verification")}</span></Link>
        <Link href="/docs" className="panel"><b>{t("开发者文档", "Developer docs")}</b><span>{t("玩法、电路、接口、验证记录和路线图", "Play, circuits, interfaces, verification records and roadmap")}</span></Link>
      </section>

      <section className="page home2-end">
        <h2>{t("不用懂电路，先让它飞起来。", "You do not need to know circuits. Make it fly first.")}</h2>
        <Link className="btn primary big" href="/workshop">{t("开始造果蝇 →", "Build a fly →")}</Link>
      </section>
    </div>
  );
}
