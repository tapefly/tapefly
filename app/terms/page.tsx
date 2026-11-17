import type { Metadata } from "next";
import { SiteNav, SiteFooter } from "../components/ui/Shell";

export const metadata: Metadata = { title: "服务条款 — TapeFly" };

export default function TermsPage() {
  return (
    <main>
      <SiteNav />
      <article className="page docs" style={{ maxWidth: 860, paddingBlock: 60 }}>
        <p className="kicker">Terms · 2026-11-13</p>
        <h1>服务条款</h1>
        <p className="lede">使用 TapeFly 网页版即表示你同意以下基本规则。</p>
        <section className="docs-sec">
          <h2>当前服务</h2>
          <p>TapeFly 当前是持续开发中的游戏与实验平台。功能、关卡、在线服务和数据格式可能变化。请不要把测试网或演示功能用于重要资产。</p>
          <h2>你的设计</h2>
          <p>你保留自己创建的果蝇设计的权利。发布到公开设计库即允许其他玩家查看、载入、对战和派生该设计，并在游戏内显示公开名称和成绩。</p>
          <h2>禁止内容与行为</h2>
          <p>不得发布违法、仇恨、骚扰、冒充、恶意软件或试图破坏服务的内容；不得绕过限流、攻击服务、批量制造垃圾内容或冒用他人身份。</p>
          <h2>钱包与链上操作</h2>
          <p>可选的 X Layer 操作由你本人钱包签名。你必须自行核对网络、费用、合约和交易内容。TapeFly 不托管资产，也不能撤销链上交易。</p>
          <h2>不承诺收益</h2>
          <p>TapeFly 不提供投资建议、收益承诺、代币销售或保证流动性的服务。公开证明只表示数据和电路可以检查，不表示资产具有市场价值。</p>
          <h2>可用性与责任</h2>
          <p>服务按现状提供。我们会尽力保护存档和公开设计，但浏览器数据仍可能因清理缓存、设备损坏或浏览器策略丢失；请定期导出存档。</p>
          <h2>联系与举报</h2>
          <p>内容举报、版权问题和服务问题请通过 <a className="link" href="/support">支持页面</a> 提交。</p>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
