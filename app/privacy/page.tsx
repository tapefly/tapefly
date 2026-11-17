import type { Metadata } from "next";
import { SiteNav, SiteFooter } from "../components/ui/Shell";

export const metadata: Metadata = { title: "隐私政策 — TapeFly", description: "TapeFly 网页游戏的本地存档、语言设置、匿名产品事件和公开设计数据说明。" };

export default function PrivacyPage() {
  return (
    <main>
      <SiteNav />
      <article className="page docs" style={{ maxWidth: 860, paddingBlock: 60 }}>
        <p className="kicker">Privacy · 2026-11-13</p>
        <h1>隐私政策</h1>
        <p className="lede">TapeFly 当前不需要账号，也不要求连接钱包。下面说明网页版会保存什么。</p>
        <section className="docs-sec">
          <h2>浏览器本地保存</h2>
          <p>Workshop 的关卡设计、最佳成绩、声音设置和游戏进度保存在你的浏览器 localStorage。它不会自动同步到其他设备。你可以随时在工坊顶部导出完整存档。</p>
          <h2>语言设置</h2>
          <p>网站使用一个语言 Cookie 记住中文或英文选择。该 Cookie 不用于广告或跨站跟踪。</p>
          <h2>匿名产品事件</h2>
          <p>为了改进新手流程和稳定性，我们会记录匿名事件，例如打开关卡、开始飞行、查看回放、打开芯片视图和发布成功。事件不包含姓名、邮箱、钱包地址、私钥、设计代码或公开设计名称。匿名会话 ID 只保存在当前浏览器标签会话中。</p>
          <h2>公开设计</h2>
          <p>你主动发布到设计库的果蝇名称、零件、接线、成绩和派生关系会公开。不要把个人信息写进设计名称。发布前请确认设计可以公开。</p>
          <h2>钱包与 X Layer</h2>
          <p>浏览、搭建、回放和芯片视图都不需要钱包。只有你主动点击流片或链上记录功能时，才会调用你自己的浏览器钱包。TapeFly 不接收、不保存你的私钥或助记词。</p>
          <h2>日志与保留</h2>
          <p>服务器会保存公开设计、匿名产品事件和基础运行日志，用于恢复数据、防滥用和排查故障。当前没有广告画像、出售个人数据或跨站行为跟踪。</p>
          <h2>联系</h2>
          <p>隐私问题请通过 <a className="link" href="/support">支持页面</a> 联系。</p>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
