/* /workshop/gallery — everything players published. Two views: the newest
   designs, and a level's global board (every row re-run by the server). */
import Link from "next/link";
import { gallery, levelOf, type Published } from "@/sim/workshop/gallery";
import { decodeDesign } from "@/sim/workshop/codec";
import { WLEVELS } from "@/sim/workshop/levels";
import { serverT } from "../../i18n/server";
import { SiteNav, SiteFooter } from "../../components/ui/Shell";
import DesignGlyph from "../DesignGlyph";
import "../workshop.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await serverT();
  return { title: t("工坊 · 大家的设计 — TapeFly", "Workshop gallery — TapeFly") };
}

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ level?: string; tab?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const t = await serverT();
  const g = gallery();
  const campaign = WLEVELS.filter((l) => l.goal.kind !== "free");
  const level = sp.level && levelOf(sp.level) ? levelOf(sp.level)! : undefined;
  const tab = sp.tab === "board" && level?.goal.kind !== "free" ? "board" : "new";
  const boardLevel = tab === "board" ? level ?? campaign[0] : undefined;
  const query = (sp.q ?? "").trim().slice(0, 40);
  const page = Math.max(0, Math.floor(Number(sp.page) || 0));
  const pageSize = 24;
  const allRows: Published[] = boardLevel ? g.board(boardLevel.id) : g.search(level?.id, query, 500);
  const rows = boardLevel ? allRows : allRows.slice(page * pageSize, (page + 1) * pageSize);
  const hasNext = !boardLevel && allRows.length > (page + 1) * pageSize;
  const title = (id: string) => { const l = levelOf(id); return l ? t(l.title.zh, l.title.en) : id; };
  const href = (o: { level?: string; tab?: string; q?: string; page?: number }) => {
    const p = new URLSearchParams();
    if (o.level) p.set("level", o.level);
    if (o.tab === "board") p.set("tab", "board");
    if (o.q) p.set("q", o.q);
    if (o.page) p.set("page", String(o.page));
    const s = p.toString();
    return `/workshop/gallery${s ? `?${s}` : ""}`;
  };
  const current = boardLevel?.id ?? level?.id;
  return (
    <>
      <SiteNav here="/workshop/gallery" />
      <main className="ws">
        <div className="wg">
        <nav className="wg-nav"><Link href="/workshop">← {t("工坊", "Workshop")}</Link></nav>
        <h1 className="wg-h1">{t("大家的设计", "Designs by players")}</h1>
        <p className="wg-fine">{t("每个设计发布时，服务器都会把它重新跑一遍，下面的秒数和门数都是服务器自己量的。点进去可以载入、对决，或者在它上面改。", "Every design is re-run by the server when it is published, so each time and gate count below was measured by the server. Open one to load it, duel it, or build on it.")}</p>
        <div className="wg-tabs" role="tablist">
          <Link role="tab" aria-selected={tab === "new"} className={tab === "new" ? "on" : ""} href={href({ level: level?.id })}>{t("最新", "Newest")}</Link>
          <Link role="tab" aria-selected={tab === "board"} className={tab === "board" ? "on" : ""} href={href({ level: (level && level.goal.kind !== "free" ? level : campaign[0]).id, tab: "board" })}>{t("排行", "Board")}</Link>
        </div>
        <div className="wg-chips">
          {tab === "new" && <Link className={!level ? "on" : ""} href={href({})}>{t("全部", "All")}</Link>}
          {(tab === "board" ? campaign : WLEVELS).map((l) => {
            const i = campaign.indexOf(l);
            return <Link key={l.id} className={current === l.id ? "on" : ""} href={href({ level: l.id, tab })}>{i >= 0 ? `${i + 1}. ` : "∞ "}{t(l.title.zh, l.title.en)}</Link>;
          })}
        </div>
        {tab === "new" && (
          <form className="wg-search" action="/workshop/gallery">
            {level && <input type="hidden" name="level" value={level.id} />}
            <input name="q" defaultValue={query} placeholder={t("搜索公开名称或设计 ID", "Search public name or design ID")} maxLength={40} />
            <button type="submit" className="ws-ghost">{t("搜索", "Search")}</button>
            {query && <Link href={href({ level: level?.id })}>{t("清除", "Clear")}</Link>}
          </form>
        )}
        {rows.length === 0 ? (
          <p className="wg-empty">{tab === "board" ? t("这一关还没有人上榜。过关之后点「发布到工坊」，你就是第一名。", "No one is on this board yet. Clear the level and press Publish to be first.") : t("还没有人发布设计。过关之后点「发布到工坊」，你就是第一个。", "Nothing published yet. Clear a level and press Publish to be the first.")}</p>
        ) : tab === "board" ? (
          <ol className="wg-board">
            {rows.map((r, i) => (
              <li key={r.id}>
                <span className="wg-rank">{i + 1}</span>
                <Link href={`/workshop/d/${r.id}`} className="wg-bname">{r.name || t("无名果蝇", "Nameless fly")}</Link>
                <span className="wg-num">{r.seconds.toFixed(2)} s</span>
                <span className="wg-num">{r.gates} {t("门", "gates")}</span>
                <span className="wg-num">{t("花费", "cost")} {r.cost}</span>
              </li>
            ))}
          </ol>
        ) : (
          <ul className="wg-grid">
            {rows.map((r) => {
              const d = decodeDesign(r.code);
              return (
                <li key={r.id}>
                  <Link href={`/workshop/d/${r.id}`} className="wg-card">
                    {d && <DesignGlyph design={d} size={120} />}
                    <span className="wg-cname">{r.name || t("无名果蝇", "Nameless fly")}</span>
                    <span className="wg-mute">{title(r.level)}</span>
                    <span className="wg-mute">{r.cleared ? `${r.seconds.toFixed(2)} s · ` : ""}{r.gates} {t("门", "gates")}{r.parent ? ` · ${t("派生", "derived")}` : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {tab === "new" && (page > 0 || hasNext) && (
          <nav className="wg-pages" aria-label={t("设计分页", "Design pages")}>
            {page > 0 ? <Link href={href({ level: level?.id, q: query, page: page - 1 })}>← {t("上一页", "Previous")}</Link> : <span />}
            <span>{t(`第 ${page + 1} 页`, `Page ${page + 1}`)}</span>
            {hasNext ? <Link href={href({ level: level?.id, q: query, page: page + 1 })}>{t("下一页", "Next")} →</Link> : <span />}
          </nav>
        )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
