import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteNav } from "../components/ui/Shell";
import "../project-pages.css";

export const metadata: Metadata = {
  title: "TapeFly on Steam — 一只可以拆开看的 AI 果蝇",
  description: "TapeFly 的 Steam 产品方向：建造、接线、物理、逐刻回放和玩家挑战。网页版现在可以玩。",
};

export default function SteamPage() {
  return (
    <main className="release">
      <SiteNav here="/steam" />

      <section className="release-hero">
        <img className="release-hero-media" src="/promo-v2/cards-v3/steam.png" alt="TapeFly Steam 产品主视觉" />
        <div className="release-hero-content">
          <span className="release-badge"><i aria-hidden="true" /><b>COMING SOON</b> · STEAM 商店页尚未开放</span>
          <h1>一只可以<br /><em>拆开看</em>的 AI。</h1>
          <p className="lede">
            给它装翅膀，接神经，然后放手。它自己找糖、撞墙、躲蜘蛛。失败以后，你可以拖回那一秒，看看哪根线接错了。
          </p>
          <div className="release-actions">
            <Link className="btn" href="/workshop">现在玩网页版</Link>
            <a className="btn" href="#steam-film">看 64 秒演示</a>
          </div>
        </div>
        <span className="release-hero-label">COMING SOON<br />PC / STEAM DECK<br />当前版本：网页版 Workshop</span>
      </section>

      <div className="release-marquee" aria-hidden="true">
        <div>
          <span>BUILD A BODY</span><i>×</i><span>WIRE THE SENSES</span><i>×</i><span>WATCH IT LIVE</span><i>×</i>
          <span>REWIND THE MISTAKE</span><i>×</i><span>CHANGE ONE WIRE</span><i>×</i>
          <span>BUILD A BODY</span><i>×</i><span>WIRE THE SENSES</span><i>×</i><span>DRAFT AND COMPETE</span>
        </div>
      </div>

      <section className="release-section release-wrap" id="steam-film">
        <div className="release-title-grid">
          <div>
            <p className="kicker">01 / The game</p>
            <p>不是把一段网页搬进 Steam，而是把它做成完整的桌面游戏。</p>
          </div>
          <div>
            <h2>先看它活一次。<br />再决定怎么修。</h2>
            <p>你会先被一只会犯错的机器果蝇吸引，再慢慢发现它每次选择的背后都有一张可以打开的电路。</p>
          </div>
        </div>
        <div className="release-video">
          <video controls playsInline preload="metadata" poster="/promo-v2/exports/tapefly-promo-v6-poster.jpg">
            <source src="/promo-v2/exports/tapefly-promo-v6-57s-16x9.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="release-video-meta">
          <span>64 秒 · 中文旁白</span>
          <span>真实游戏画面 · 建议开启声音</span>
        </div>
      </section>

      <section className="release-section" style={{ background: "rgba(255,255,255,.016)", borderBlock: "1px solid var(--line)" }}>
        <div className="release-wrap release-split">
          <div className="release-photo">
            <img src="/promo-v2/gameplay-v4/build.png" alt="TapeFly 工坊搭建界面" />
            <span>REAL BUILD SCREEN</span>
          </div>
          <div className="release-copy">
            <p className="kicker">02 / Build and live</p>
            <h2>它的性格，<br />是你一根一根接出来的。</h2>
            <p>翅膀的位置改变推力，配重改变惯性，眼睛和触角改变它怎么面对世界。没有性格滑杆，也没有一段 AI 随便写出来的人设。</p>
            <p><strong>你给它什么本能，它就过什么样的日子。</strong></p>
            <div className="release-points">
              <div><b>01</b><span>14 种零件，位置、重量和方向都会改变飞行。</span></div>
              <div><b>02</b><span>神经可以接入记忆、翻转格和节拍器，组合出真正的行为。</span></div>
              <div><b>03</b><span>同一设计、同一场地永远得到同一结果，失败可以被完整回放。</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="release-section release-wrap">
        <div className="release-title-grid">
          <div>
            <p className="kicker">03 / Steam edition</p>
            <p>为什么值得做一个真正的桌面版。</p>
          </div>
          <div>
            <h2>更长的路线。<br />更多可以带走的果蝇。</h2>
            <p>网页版负责分享和快速试玩。Steam 版会有完整的章节、更好的音画、离线存档、成就和创作工具。</p>
          </div>
        </div>
        <div className="release-feature-grid">
          <article>
            <small>CAMPAIGN</small>
            <h3>完整关卡路线</h3>
            <p>从反射、记忆、计数到正式竞技。每一章都带来一种新的零件，也带来一种新的失败。</p>
          </article>
          <article>
            <small>WORKSHOP</small>
            <h3>分享你的设计</h3>
            <p>发布果蝇、载入别人的脑子、用同一个起点比较行为，再从对方的设计继续改造。</p>
          </article>
          <article>
            <small>DECK</small>
            <h3>大屏与掌机</h3>
            <p>重新设计手柄操作、暂停、时间轴和芯片视图，让长回放和搭建都适合 Steam Deck。</p>
          </article>
        </div>
        <div className="release-road">
          <div><b>NOW</b><span>网页版 Workshop 已可免费游玩，核心机制和回放系统已上线。</span></div>
          <div><b>NEXT</b><span>Steam 商店页、试玩版、手柄适配和关卡扩展正在准备。</span></div>
          <div><b>LATER</b><span>Steam Workshop、成就、角色收藏与正式赛季竞技。</span></div>
        </div>
      </section>

      <section className="release-section release-manifesto">
        <div className="release-wrap">
          <p className="kicker">One more flight</p>
          <blockquote>“它不是来替你工作的。<br />它是来让你愿意<em>再看一眼</em>的。”</blockquote>
          <div className="release-honesty">
            <h3>Steam 状态</h3>
            <p>目前没有虚构的 Steam 商店链接、愿望单数量或发行日期。网页版已经真实可玩；Steam 页面和最终发行计划会在准备完成后公布。</p>
          </div>
        </div>
      </section>

      <section className="release-section release-wrap">
        <div className="release-callout">
          <h2>在 Steam 版到来之前，<br />先养今天这一只。</h2>
          <div className="release-actions">
            <Link className="btn" href="/workshop">打开工坊</Link>
            <a className="btn" href="/campaign.html#film">众筹概念页</a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
