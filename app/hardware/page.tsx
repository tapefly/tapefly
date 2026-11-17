import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteNav } from "../components/ui/Shell";
import "../project-pages.css";

export const metadata: Metadata = {
  title: "TapeFly AI 智能硬件 — 让果蝇离开屏幕",
  description: "TapeFly 的 AI 智能硬件愿景：同一套行为电路进入 FPGA、桌面机器人和智能设备。",
};

export default function HardwarePage() {
  return (
    <main className="release">
      <SiteNav here="/hardware" />

      <section className="release-hero">
        <img className="release-hero-media" src="/promo-v2/cards-v3/hardware.png" alt="TapeFly AI 智能硬件果蝇概念设计" />
        <div className="release-hero-content">
          <span className="release-badge"><i aria-hidden="true" /><b>COMING SOON</b> · AI 智能硬件概念阶段</span>
          <h1>让它离开屏幕。<br /><em>还是那只小东西。</em></h1>
          <p className="lede">
            同一个大脑可以进入 FPGA、桌面机器人和智能硬件。它不会突然变成什么都懂的机器人，只会保留自己已经学会的性格。
          </p>
          <div className="release-actions">
            <a className="btn" href="#hardware-film">看硬件概念片段</a>
            <Link className="btn" href="/workshop">先养一只网页果蝇</Link>
          </div>
        </div>
        <span className="release-hero-label">COMING SOON<br />概念设计，不是现货<br />量产前还有工程与认证工作</span>
      </section>

      <div className="release-marquee" aria-hidden="true">
        <div>
          <span>ONE BRAIN</span><i>×</i><span>ONE TINY PERSONALITY</span><i>×</i><span>WEB → FPGA → DESK → DEVICE</span><i>×</i>
          <span>OBSERVE</span><i>×</i><span>REPLAY</span><i>×</i><span>KEEP</span><i>×</i>
          <span>ONE BRAIN</span><i>×</i><span>ONE TINY PERSONALITY</span><i>×</i><span>WEB → FPGA → DESK → DEVICE</span>
        </div>
      </div>

      <section className="hardware-film" id="hardware-film">
        <video autoPlay muted loop playsInline preload="metadata">
          <source src="/promo-v2/fal/ai-hardware.mp4" type="video/mp4" />
        </video>
        <div className="release-wrap">
          <p className="kicker">01 / The hardware idea</p>
          <h2>一只桌上传来的<br />小小 AI 生命。</h2>
          <p>它不需要替你做任何事。它只要会找糖、会害怕、会犯错，而且做过的每一件事都能回放。</p>
        </div>
      </section>

      <section className="release-section release-wrap">
        <div className="release-title-grid">
          <div>
            <p className="kicker">02 / The rules</p>
            <p>不是把网页塞进一个塑料壳。</p>
          </div>
          <div>
            <h2>换设备，<br />不换性格。</h2>
            <p>硬件真正的价值不是多一块屏幕，而是让同一套行为离开浏览器，进入传感器、灯光和真实动作里。</p>
          </div>
        </div>
        <div className="hardware-numbers">
          <div><b>01</b><span>同一个大脑：接线、状态和规则都保留。</span></div>
          <div><b>02</b><span>同一个性格：胆小、贪吃和固执都能继续存在。</span></div>
          <div><b>03</b><span>同一份记录：设备上发生的行为仍然可以回放和比较。</span></div>
        </div>
      </section>

      <section className="release-section" style={{ borderBlock: "1px solid var(--line)", background: "rgba(255,255,255,.016)" }}>
        <div className="release-wrap release-split">
          <div className="release-photo">
            <img src="/promo-v2/characters/tapefly-momo-v1.png" alt="倔强一号 AI 机械果蝇角色设计" />
            <span>CHARACTER 01 · 倔强一号</span>
          </div>
          <div className="release-copy">
            <p className="kicker">03 / A possession with a life</p>
            <h2>潮玩不会告诉你，<br />它为什么总撞墙。</h2>
            <p>它会有一点自己的脾气：不敢靠近蜘蛛、吃糖时太着急、总在某一个转角转错方向。这些不是随机写死的动画，而是可以观察、修改和保留的行为。</p>
            <p><strong>当它离开屏幕，它不是一个带 AI 标签的摆件，而是一只带着自己记录生活的小东西。</strong></p>
            <div className="release-points">
              <div><b>EYES</b><span>红色复眼和发光感官让它在桌面上一眼可认。</span></div>
              <div><b>WINGS</b><span>翅膀会根据线路和状态扇动，可以从透明外壳看见。</span></div>
              <div><b>CORE</b><span>胸口核心随电路活动变化，是它真正“在想事情”的位置。</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="release-section release-wrap">
        <div className="release-title-grid">
          <div>
            <p className="kicker">04 / The path</p>
            <p>先把数字生命做好，再把它放到桌上。</p>
          </div>
          <div>
            <h2>不跳过工程，<br />也不假装已经量产。</h2>
            <p>软件先验证玩法，硬件再验证传感器、结构、供电和长期可靠性。每一步都必须有能摸到的东西。</p>
          </div>
        </div>
        <div className="release-road">
          <div><b>01 · WEB</b><span>网页版已上线。建造、接线、飞行和回放已经可以真实游玩。</span></div>
          <div><b>02 · DESK</b><span>概念阶段。探索桌面机器人形态和可观察的实体动作。</span></div>
          <div><b>03 · DEVICE</b><span>以后。需要样机、模具、认证和小批量试产，不以概念图代替交付。</span></div>
        </div>
      </section>

      <section className="release-section release-manifesto">
        <div className="release-wrap">
          <p className="kicker">Why it matters</p>
          <blockquote>“它不是一只更有用的机器人。<br />它只是让你愿意<em>多看一眼</em>的小东西。”</blockquote>
          <div className="release-honesty">
            <h3>诚实说明</h3>
            <p>TapeFly 智能硬件目前是产品愿景与设计探索，不是可购买商品。任何众筹、预售或发货计划都会在工程样机、成本、认证和供应链明确后单独公布。</p>
          </div>
        </div>
      </section>

      <section className="release-section release-wrap">
        <div className="release-callout">
          <h2>它先在屏幕里活着。<br />以后，也许会在你桌上。</h2>
          <div className="release-actions">
            <a className="btn" href="/campaign.html#hardware">众筹硬件愿景</a>
            <Link className="btn" href="/workshop">认领一只网页果蝇</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
