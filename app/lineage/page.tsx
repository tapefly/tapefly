import Link from "next/link";
import { SiteNav, SiteFooter } from "@/app/components/ui/Shell";
import { lineageDays, recentChampions, ledgerThrough, EPOCH } from "@/sim/lineage";
import { genomeDrift } from "@/sim/genome";
import { serverT } from "../i18n/server";
import { ANCHORS, headOn } from "@/sim/anchor";
import AnchorList from "./AnchorList";

/* The family tree: one row per day since the epoch. The ledger is a committed
   file that `npm run lineage -- --check` recomputes from the founder and the calendar. */

export const dynamic = "force-dynamic";
export function generateMetadata() { return { title: serverT()("血统 — TapeFly", "Lineage — TapeFly") }; }

export default function LineagePage() {
  const days = lineageDays();
  const champions = recentChampions(60);
  const survived = days.filter((d) => d.alive).length;
  const last = days[days.length - 1];
  const drift = last ? genomeDrift(last.champion) : 0;
  const maxDrift = Math.max(1, ...days.map((d) => genomeDrift(d.champion)));
  const t = serverT();
  const W = 1000, H = 160;
  const bw = W / Math.max(1, days.length);
  const driftPath = days.map((d, i) => `${i ? "L" : "M"}${(i + 0.5) * bw} ${H - (genomeDrift(d.champion) / maxDrift) * (H - 10) - 4}`).join(" ");

  return (
    <main>
      <SiteNav here="/lineage" />
      <div className="page">
        <header className="page-head">
          <h1>{t("血统", "Lineage")}</h1>
          <p>
            {t(`每天早上的 8 只果蝇，都由前一天活得最久的那只繁衍而来，身体略有变化。这条链从 ${EPOCH} 起从未中断。它存在一个文件里，不在数据库里，任何人都能从始祖和日历把它重建出来。`,
               `Each morning’s eight flies are born from yesterday’s longest-lived, nudged a little. That chain runs unbroken from ${EPOCH}. It is kept in a file, not a database, and anyone can rebuild it from the founder and the calendar.`)}
          </p>
        </header>
        <div className="stats">
          <div className="stat"><b>{days.length}</b><span>{t(`天（自 ${EPOCH} 起）`, `days since ${EPOCH}`)}</span></div>
          <div className="stat"><b>{survived}</b><span>{t("位冠军活到了天黑", "champions reached dusk")}</span></div>
          <div className="stat"><b>{drift}‰</b><span>{t("今天的身体与始祖的差异", "today’s body vs the founder")}</span></div>
          <div className="stat"><b>{ledgerThrough().slice(5)}</b><span>{t("账本里的最后一天", "last day in the ledger")}</span></div>
        </div>

        <div className="panel">
          <h2>{t("每一位冠军", "Every champion")}</h2>
          <p>{t("柱子是每天冠军活了多久（琥珀色活到天黑，红色没有）。折线是它的身体离始祖偏了多远。", "Bars are how long each day’s champion lived (amber reached dusk, red did not). The line is how far its body had drifted from the founder.")}</p>
          <svg className="lin-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={t("历代冠军寿命与基因偏移", "Champion lifetimes and genome drift since the epoch")}>
            {days.map((d, i) => (
              <rect key={d.d} x={i * bw + bw * 0.12} width={bw * 0.76} y={H - (d.lived / 150) * H} height={(d.lived / 150) * H} fill={d.alive ? "#F2B64B" : "rgba(240,69,79,.6)"} opacity={0.55} />
            ))}
            <path d={driftPath} fill="none" stroke="#E8F0EB" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        <div className="panel">
          <h2>{t("最近 60 天", "The last 60 days")}</h2>
          <div className="scroll-x">
            <table className="tbl">
              <thead><tr><th>{t("日期", "Day")}</th><th>{t("冠军", "Champion")}</th><th className="num">{t("存活", "Lived")}</th><th>{t("结果", "Outcome")}</th><th className="num">{t("偏移", "Drift")}</th></tr></thead>
              <tbody>
                {champions.map((d) => (
                  <tr key={d.d}>
                    <td className="dim">{d.d}</td>
                    <td><Link className="link" href={`/fly/${d.name}?d=${d.d}`}>{d.name}</Link></td>
                    <td className="num">{d.lived}</td>
                    <td className={d.alive ? "ok-text" : "bad-text"}>{d.alive ? t("活到天黑", "reached dusk") : t("死亡", "died")}</td>
                    <td className="num dim">{genomeDrift(d.champion)}‰</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" id="on-chain">
          <h2>{t("刻在 BNB Chain 上的记忆", "Memory written on BNB Chain")}</h2>
          <p>
            {t("每天，从第一天到前一天的整条血统，所有冠军的身体、寿命和每一步的哈希，会被折成一个“血统哈希”，用一笔普通交易写上 BNB Chain。写上去就改不了。下面每一行都能在你的浏览器里核对：读出链上交易，和本页从日期算出来的哈希比对。",
               "Every day, the whole lineage from the first day to the day before, every champion’s body, life and the hash of every step, is folded into one lineage head and written onto BNB Chain in an ordinary transaction. Once written, it cannot change. Each row below can be checked in your browser: read the transaction and compare it with the head this page computed from the dates.")}
          </p>
          <div style={{ marginTop: 12 }}>
            <AnchorList anchors={ANCHORS.entries} heads={Object.fromEntries(ANCHORS.entries.map((a) => [a.date, headOn(a.date)]))} />
          </div>
          <pre className="cmd" style={{ marginTop: 12 }}>npm run anchor -- --chain</pre>
        </div>

        <div className="panel">
          <h2>{t("它是怎么保存的", "How it is kept")}</h2>
          <p>
            {t(<>账本是 <code>sim/lineage.json</code>，和电路一起提交。每次打开页面都重放 {days.length} 天、每天 8 只果蝇太浪费，所以改为保存文件并做检查。只要文件和重新计算的结果不一致，错的就是文件。</>,
               <>The ledger is <code>sim/lineage.json</code>, committed alongside the netlist. Replaying {days.length} days of eight flies on every page load would be wasteful, so the file is stored and checked instead. If the file and a fresh recomputation ever disagree, the file is wrong.</>)}
          </p>
          <pre className="cmd" style={{ marginTop: 12 }}>npm run lineage -- --check</pre>
          <p style={{ marginTop: 12 }}>{t("同样的数据（JSON）：", "The same data as JSON: ")}<a className="link" href="/api/v1/lineage?days=60">/api/v1/lineage</a>.</p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
