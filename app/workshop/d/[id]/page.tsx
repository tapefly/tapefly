/* /workshop/d/:id — one published design: its scores as the server measured
   them, where it came from, what was built on it, and buttons to load or duel it. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { gallery, levelOf } from "@/sim/workshop/gallery";
import { decodeDesign } from "@/sim/workshop/codec";
import { WLEVELS } from "@/sim/workshop/levels";
import { serverT } from "../../../i18n/server";
import DesignGlyph from "../../DesignGlyph";
import ChainPanel from "./ChainPanel";
import ReportDesign from "./ReportDesign";
import { chipFingerprint, recordText, recordData } from "@/sim/workshop/record";
import { toVerilog } from "@/sim/workshop/verilog";
import { compileWiring } from "@/sim/workshop/compile";
import { netlistBytes } from "@/sim/tapeout";
import { CHAIN, EXPLORER } from "@/sim/onchain";
import { SiteNav, SiteFooter } from "../../../components/ui/Shell";
import "../../workshop.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await serverT();
  const d = /^[0-9a-f]{12}$/.test(id) ? gallery().get(id) : undefined;
  if (!d) return { title: "TapeFly Workshop" };
  const l = levelOf(d.level);
  return { title: `${d.name || t("无名果蝇", "Nameless fly")} · ${l ? t(l.title.zh, l.title.en) : d.level} · TapeFly Workshop` };
}

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{12}$/.test(id)) notFound();
  const t = await serverT();
  const g = gallery();
  const d = g.get(id);
  if (!d) notFound();
  const design = decodeDesign(d.code);
  const level = levelOf(d.level);
  if (!design || !level) notFound();
  const parent = d.parent ? g.get(d.parent) : undefined;
  const children = g.children(id);
  const board = d.cleared ? g.board(d.level, 1000) : [];
  const rank = board.findIndex((r) => r.id === id);
  const idx = WLEVELS.filter((l) => l.goal.kind !== "free").indexOf(level);
  const name = d.name || t("无名果蝇", "Nameless fly");
  const q = `l=${d.level}`;
  return (
    <>
      <SiteNav here="/workshop/gallery" />
      <main className="ws">
        <div className="wg">
        <nav className="wg-nav">
          <Link href="/workshop">← {t("工坊", "Workshop")}</Link>
          <Link href={`/workshop/gallery?level=${d.level}`}>{t("这一关的全部设计", "All designs for this level")}</Link>
        </nav>
        <section className="wg-hero">
          <DesignGlyph design={design} size={220} />
          <div className="wg-hero-text">
            <p className="wg-kicker">{level.chapter === 0 ? t("沙盒", "Sandbox") : t(`第 ${idx + 1} 关`, `Level ${idx + 1}`)} · {t(level.title.zh, level.title.en)}</p>
            <h1>{name}</h1>
            <dl className="wg-stats">
              {level.chapter !== 0 && <div><dt>{t("成绩", "Result")}</dt><dd>{d.cleared ? t("过关", "Cleared") : t("未过关", "Not cleared")}</dd></div>}
              {level.chapter !== 0 && <div><dt>{t("用时", "Time")}</dt><dd>{d.seconds.toFixed(2)} s</dd></div>}
              <div><dt>{t("NAND 门", "NAND gates")}</dt><dd>{d.gates}{d.bits ? <small> + {d.bits} {t("位", "bits")}</small> : null}</dd></div>
              <div><dt>{t("零件花费", "Part cost")}</dt><dd>{d.cost}</dd></div>
              {rank >= 0 && <div><dt>{t("全球排名", "Global rank")}</dt><dd>#{rank + 1} / {board.length}</dd></div>}
            </dl>
            <p className="wg-fine">{t("这些数字是服务器把这个设计重新跑一遍量出来的，不是发布的人报的。", "These numbers were measured by the server re-running this design, not reported by whoever published it.")}</p>
            <div className="wg-acts">
              <a className="ws-go small" href={`/workshop?${q}&d=${d.code}&from=${d.id}`}>{t("载入，在它上面改", "Load it and build on it")}</a>
              {level.chapter !== 0 && <a className="ws-ghost" href={`/workshop?${q}&vs=${d.code}`}>{t("用我的果蝇和它对决", "Duel it with my fly")}</a>}
              {level.chapter !== 0 && <Link className="ws-ghost" href={`/workshop/gallery?level=${d.level}&tab=board`}>{t("这一关的排行", "This level's board")}</Link>}
            </div>
            <ReportDesign id={id} zh={t("zh", "en") === "zh"} />
          </div>
        </section>
        {(() => {
          const text = recordText(d, chipFingerprint(design));
          const recs = g.chainRecords(id).map(({ tx, from, block }) => ({ tx, from, block }));
          return <ChainPanel id={id} text={text} data={recordData(text)} chainId={CHAIN.id} explorer={EXPLORER} records={recs} verilog={toVerilog(design, "tapefly_brain").text} bytes={netlistBytes(compileWiring(design))} fileName={`tapefly_${d.level}_${id}.v`} />;
        })()}
        {(parent || children.length > 0) && (
          <section className="wg-tree">
            <h2>{t("派生关系", "Lineage")}</h2>
            <p className="wg-fine">{t("派生只记来源，不继承成绩：每个设计的数字都是它自己跑出来的。", "Lineage records the source only; scores are never inherited. Every number belongs to the design that ran it.")}</p>
            {parent && <p>{t("改自", "Derived from")} <Link href={`/workshop/d/${parent.id}`}>{parent.name || t("无名果蝇", "Nameless fly")}</Link> <span className="wg-mute">· {parent.gates} {t("门", "gates")}{parent.cleared ? ` · ${parent.seconds.toFixed(2)} s` : ""}</span></p>}
            {children.length > 0 && (
              <ul className="wg-kids">
                {children.map((c) => (
                  <li key={c.id}><Link href={`/workshop/d/${c.id}`}>{c.name || t("无名果蝇", "Nameless fly")}</Link> <span className="wg-mute">· {c.gates} {t("门", "gates")}{c.cleared ? ` · ${c.seconds.toFixed(2)} s` : ""}</span></li>
                ))}
              </ul>
            )}
          </section>
        )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
