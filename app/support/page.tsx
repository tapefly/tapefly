import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav, SiteFooter } from "../components/ui/Shell";

export const metadata: Metadata = { title: "支持与举报 — TapeFly" };

export default function SupportPage() {
  return (
    <main>
      <SiteNav />
      <article className="page docs" style={{ maxWidth: 820, paddingBlock: 60 }}>
        <p className="kicker">Support</p>
        <h1>支持、举报与问题反馈</h1>
        <p className="lede">遇到错误、存档问题、公开设计违规或安全问题，请按下面渠道提交。</p>
        <section className="docs-sec">
          <h2>游戏问题</h2>
          <p>请在公开发布平台提交 Issue，并附上浏览器、设备、当前网址和复现步骤。不要附私钥、助记词或钱包文件。</p>
          <p><a className="btn" href="https://github.com/tapefly/tapefly/issues" target="_blank" rel="noreferrer">打开问题反馈 ↗</a></p>
          <h2>设计库举报</h2>
          <p>请提供设计页面链接、公开名称和举报原因。举报不会自动删除设计，管理员会核对名称、内容和来源。</p>
          <h2>安全漏洞</h2>
          <p>不要公开发布可被利用的漏洞细节。请使用 GitHub 的私密 Security Advisory 或先通过项目仓库维护者联系。</p>
          <h2>存档恢复</h2>
          <p>先尝试工坊顶部的“导入存档”。如果没有导出文件，浏览器 localStorage 被清除后通常无法从服务器恢复，因为服务器不保存私人生关卡进度。</p>
          <p><Link className="link" href="/workshop">回到工坊导出存档 →</Link></p>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
