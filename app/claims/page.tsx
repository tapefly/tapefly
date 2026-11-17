import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteNav } from "../components/ui/Shell";
import { configuredClaimContract } from "@/sim/circuit-claims";

export const metadata: Metadata = {
  title: "纪念电路 — TapeFly",
  description: "Workshop 和 Brain Brawl 的可验证纪念电路领取系统。",
};

export default function ClaimsHub() {
  const contract = configuredClaimContract();
  const live = !!contract;

  return (
    <main>
      <SiteNav here="/claims" />
      <article className="page claims-hub">
        <header className="claims-hub-head">
          <span className={`dtag ${live ? "live" : "next"}`}>{live ? "X Layer · 已开放" : "X Layer · 合约待部署"}</span>
          <p className="kicker">COMMEMORATIVE CIRCUIT CLAIMS</p>
          <h1>把你飞过的那颗大脑，留成一张电路纪念卡。</h1>
          <p className="lede">
            工坊通关或完成一局 Brain Brawl 后，服务器会重新验证结果，再把门数、深度和电路哈希封装成一张 X Layer 纪念凭证。
          </p>
          <div className="row">
            <Link className="btn primary big" href="/workshop">去工坊造一只</Link>
            <Link className="btn big" href="/brawl">去打一局 Brawl</Link>
          </div>
        </header>

        <section className="claims-preview">
          <div className="claim-art-preview" aria-hidden>
            <div className="claim-art-top">
              <span>TAPEFLY CIRCUIT CLAIM</span>
              <span>WORKSHOP / STAGE 09</span>
            </div>
            <svg viewBox="0 0 720 420" role="presentation">
              <defs>
                <radialGradient id="claim-glow">
                  <stop stopColor="#63e7c0" stopOpacity=".42" />
                  <stop offset="1" stopColor="#63e7c0" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="585" cy="76" r="180" fill="url(#claim-glow)" />
              {Array.from({ length: 24 }, (_, i) => {
                const x = 60 + (i % 8) * 78;
                const y = 130 + Math.floor(i / 8) * 64;
                return <g key={i} opacity={i % 3 === 0 ? ".95" : ".42"}><circle cx={x} cy={y} r="7" fill="#63e7c0" /><path d={`M${x + 7} ${y} H${x + 35}`} stroke="#315f59" strokeWidth="2" /></g>;
              })}
            </svg>
            <div className="claim-art-foot">
              <div><small>CIRCUIT HASH</small><b>3DA820CC456B3757…</b></div>
              <div><small>GATES</small><b>23</b></div>
              <div><small>DEPTH</small><b>6</b></div>
              <div><small>STATE</small><b>4</b></div>
            </div>
          </div>

          <div className="claims-hub-side">
            <section className="panel">
              <p className="kicker">Workshop</p>
              <h2>通关电路拓片</h2>
              <p>只记录经过关卡重跑和全量输入核对的电路。每个钱包、每一关限领一次。</p>
              <ul className="claims-facts">
                <li><b>关卡</b><span>记录本次通关</span></li>
                <li><b>23 门</b><span>记录真实 NAND 门数</span></li>
                <li><b>4 位</b><span>记录记忆状态</span></li>
              </ul>
            </section>
            <section className="panel">
              <p className="kicker">Brain Brawl</p>
              <h2>每日对战电路</h2>
              <p>服务器从开局逐项重放购买、卖出、刷新和战斗操作。浏览器不能自己填写胜负。</p>
              <ul className="claims-facts">
                <li><b>日期</b><span>当天的固定对手</span></li>
                <li><b>胜场</b><span>完整对局结果</span></li>
                <li><b>电路</b><span>最终大脑的字节哈希</span></li>
              </ul>
            </section>
          </div>
        </section>

        <section className="claims-how">
          <h2>领取怎么工作</h2>
          <ol>
            <li><b>1</b><span>玩家完成工坊关卡或整局 Brawl。</span></li>
            <li><b>2</b><span>服务器重新运行游戏结果，不相信浏览器自己上报的数据。</span></li>
            <li><b>3</b><span>服务器编译大脑并签发绑定钱包的 EIP-712 凭证。</span></li>
            <li><b>4</b><span>玩家在 X Layer 支付 gas，铸造一张独属于自己的纪念凭证。</span></li>
          </ol>
        </section>

        <section className="claims-boundary">
          <b>边界写清楚</b>
          <p>
            这是纪念型 ERC-1155 凭证，记录电路哈希和验证属性；它不是可以在 TapeOut 上直接调用 <code>eval</code> 的 Circuit NFT。真正的流片仍然单独进行。
          </p>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}

