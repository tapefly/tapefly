import type { Metadata } from "next";
import { SiteNav, SiteFooter } from "../components/ui/Shell";

export const metadata: Metadata = { title: "更新记录 — TapeFly" };

const updates = [
  ["2026-11-17", "纪念电路 NFT 开发版", "工坊通关和 Brawl 结算现在可以基于服务端重算结果生成电路纪念凭证；主网合约部署后开放领取。"],
  ["2026-11-13", "Workshop 成为网页主游戏", "首页、导航、设计库和版本元数据统一到 Workshop；旧玩法归入实验室。"],
  ["2026-11-13", "TapeOut 独立导航", "流片、Proof、Verify、Lineage 和 Calibrate 集中到 TapeOut 生态。"],
  ["2026-11-13", "发布基础增强", "加入存档导出/导入、匿名产品事件、错误恢复、隐私与支持页面。"],
  ["2026-11-04", "Workshop 记忆与计数", "加入感官接线、逻辑、记忆、翻转、节拍器、芯片视图和 Verilog 导出。"],
];

export default function ChangelogPage() {
  return (
    <main>
      <SiteNav />
      <article className="page docs" style={{ maxWidth: 860, paddingBlock: 60 }}>
        <p className="kicker">Changelog</p>
        <h1>更新记录</h1>
        <p className="lede">这里记录影响玩家、开发者或公开数据格式的更新。</p>
        <div className="docs-cards">
          {updates.map(([date, title, body]) => (
            <div key={date + title}>
              <code>{date}</code>
              <h2 style={{ fontSize: 22, marginTop: 10 }}>{title}</h2>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
