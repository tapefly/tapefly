import Link from "next/link";
import { SiteNav, SiteFooter } from "../components/ui/Shell";
import { loadBoard, boardThrough } from "@/sim/board";
import { addDays } from "@/sim/lineage";
import { seasonOf, seasonDates, trophies, type SeasonLedger } from "@/sim/seasons";
import seasonsFile from "@/challengers/seasons.json";
import { getLang, serverT } from "../i18n/server";

const HOUSE_ZH: Record<string, [string, string]> = {
  "Greedy": ["贪吃鬼", "永远冲向最近的食物。天不怕地不怕，结果也看得出来。"],
  "Official FFW-NAND/1": ["官方大脑 FFW-NAND/1", "培养皿里每只果蝇都在用的大脑，50 个手工调好的门。"],
  "Wanderer": ["流浪者", "闻到食物就吃，没闻到就闲逛，不管危险。"]
};

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await serverT();
  return { title: t("冠军榜 — TapeFly", "Champions — TapeFly"), description: t("本周最强的 TapeFly 大脑，在同样 7 个培养皿里排名。", "This week's best TapeFly brains, ranked on the same seven dishes.") };
}

export default async function BoardPage() {
  const rows = loadBoard();
  const through = boardThrough();
  const from = addDays(through, -6);
  const ledger = seasonsFile as SeasonLedger;
  const won = trophies(ledger);
  const now = seasonOf(addDays(through, 1));
  const cur = seasonDates(now);
  const t = await serverT();
  const zh = (await getLang()) === "zh";
  const nm = (r: { name: string; house: boolean }) => (zh && r.house && HOUSE_ZH[r.name] ? HOUSE_ZH[r.name][0] : r.name);
  const note = (r: { name: string; house: boolean; note?: string }) => (zh && r.house && HOUSE_ZH[r.name] ? HOUSE_ZH[r.name][1] : r.note);

  return (
    <main>
      <SiteNav here="/board" />
      <div className="page">
        <header className="page-head">
          <h1>{t("冠军榜", "Champions")}</h1>
          <p>
            {t(`每周最强的果蝇大脑赢下这个赛季。每个参赛者都跑最近 7 个已结束的培养皿（${from} 到 ${through}）。先比活到天黑的天数，再比活了多少步，再比吃了多少；全部打平时，NAND 门更少的大脑赢。`,
               `Every week, the best fly brain wins the season. Each entry lives the last seven finished dishes, ${from} to ${through}. Ranked by days survived to dusk, then ticks lived, then meals; on a full tie, the brain with fewer NAND gates wins.`)}
          </p>
        </header>

        <section className="prize" aria-label={t("冠军奖品", "The champion's prize")}>
          <div>
            <p className="kicker">{t(`第 ${now} 赛季 · ${cur.through} 结束（UTC）`, `Season ${now} · ends ${cur.through} (UTC)`)}</p>
            <h2>{t("冠军的大脑会上链", "The champion’s brain goes on chain")}</h2>
            <p>
              {t("计划中的奖品：TapeFly 每周把冠军的大脑在 TapeOut 上流片，电路 NFT 送给冠军。没有钱，没有代币：奖品就是你的大脑，刻在链上，写着你的名字。",
                 "Planned prize: TapeFly tapes out each week’s champion brain on TapeOut and sends the circuit NFT to the winner. No money, no tokens: the prize is your brain, on chain, with your name on it.")}
            </p>
          </div>
          <p className="prize-state">
            {t(<><b>即将开始。</b>官方大脑已经在电路 #1 上完成流片和全量核对；第一季竞技场开赛后开始发放冠军电路。</>,
               <><b>Opening soon.</b> The official brain is taped out and fully verified as circuit #1; champion circuits begin with the first arena season.</>)}{" "}
            <Link className="link" href="/tapeout">{t("看进度", "Status")}</Link>
          </p>
        </section>

        <div className="board-wrap">
          <table className="board">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>{t("大脑", "Brain")}</th>
                <th>{t("7 天", "Seven days")}</th>
                <th className="num">{t("天黑", "Dusk")}</th>
                <th className="num">{t("步数", "Ticks")}</th>
                <th className="num">{t("进食", "Meals")}</th>
                <th className="num">NAND</th>
                <th className="num">{t("成本", "Cost")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={r.house ? "house" : ""}>
                  <td className="num rank">{i + 1}</td>
                  <td>
                    <b className="b-name">{nm(r)}</b>
                    <span className="b-by">
                      {r.status === "official"
                        ? <span className="tag official" title={`Circuit ${r.tapeout?.circuitId} on ${r.tapeout?.processor}`}>{t("已上链", "official")} · #{r.tapeout?.circuitId}</span>
                        : <span className="tag practice">{t("练习", "practice")}</span>}
                      {r.house ? <span className="tag house">{t("官方基准", "house baseline")}</span> : <>{t("作者", "by")} {r.handle}</>}
                      {(won.get(r.id) ?? []).map((n) => <span key={n} className="tag trophy" title={t(`第 ${n} 赛季冠军`, `Champion of season ${n}`)}>🏆 S{n}</span>)}
                    </span>
                    {note(r) && <span className="b-note">{note(r)}</span>}
                  </td>
                  <td>
                    <span className="pills" aria-label={t(`7 天里有 ${r.week.survived} 天活到天黑`, `${r.week.survived} of 7 days to dusk`)}>
                      {r.week.days.map((d) => (
                        <i key={d.date} className={d.alive ? "dusk" : "died"} title={t(`${d.date}：${d.alive ? "活到天黑" : `死于第 ${d.lived - 1} 步`}，吃了 ${d.meals} 口`, `${d.date}: ${d.alive ? "reached dusk" : `died at ${d.lived - 1}`}, ${d.meals} meals`)} />
                      ))}
                    </span>
                  </td>
                  <td className="num"><b>{r.week.survived}</b>/7</td>
                  <td className="num">{r.week.lived}</td>
                  <td className="num">{r.week.meals}</td>
                  <td className="num">{r.card.gates}</td>
                  <td className="num">{r.card.cost.toLocaleString()}</td>
                  <td>{r.program ? <Link className="link" href={`/build?p=${r.program}`}>{t("打开", "Open")}</Link> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="panel seasons" aria-labelledby="seasons-h">
          <h2 id="seasons-h">{t("赛季", "Seasons")}</h2>
          <p>
            {t("一个赛季就是一周，周一到周日（UTC）。赛季结束时，这 7 个培养皿里表现最好的玩家果蝇拿走奖杯，结果写进一本任何人都能重算的账本。官方基准是用来被打败的，它们永远拿不了奖杯。",
               "A season is one week, Monday to Sunday (UTC). When it ends, the best player’s fly over those seven dishes takes the trophy, and the result is written into a ledger that anyone can recompute. House baselines are there to beat; they never take a trophy.")}
          </p>
          <ol className="season-list">
            <li className="live">
              <b>{t(`第 ${now} 赛季`, `Season ${now}`)}</b>
              <span>{t(`${cur.from} 到 ${cur.through}`, `${cur.from} to ${cur.through}`)}</span>
              <span>{t("进行中：周日结束前报名", "in progress: enter a fly before Sunday ends")}</span>
            </li>
            {[...ledger.seasons].reverse().map((s) => (
              <li key={s.n}>
                <b>{t(`第 ${s.n} 赛季`, `Season ${s.n}`)}</b>
                <span>{t(`${s.from} 到 ${s.through}`, `${s.from} to ${s.through}`)}</span>
                <span>
                  {s.champion
                    ? <>🏆 {s.champion.split("/").slice(1).join("/")} <em>{t("作者", "by")} {s.champion.split("/")[0]}</em></>
                    : t(<>没有玩家参赛。{s.table[0] ? <>官方基准 {s.table[0].id.split("/").slice(1).join("/")} 排第一，7 天里 {s.table[0].survived} 天活到天黑。</> : null}</>,
                        <>No player entered. {s.table[0] ? <>The house&rsquo;s {s.table[0].id.split("/").slice(1).join("/")} topped the table, {s.table[0].survived}/7 days to dusk.</> : null}</>)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="two" style={{ marginTop: 32 }}>
          <div className="panel">
            <h2>{t("报名本周", "Enter this week")}</h2>
            <p>
              {t(<>在首页拨好本能，或者在大脑编辑器里写好规则，然后在编辑器里点<b>报名参赛</b>。你会拿到一个小文件，提交到公开仓库即可。每个分数都会从头重算，所以没人能虚报成绩。</>,
                 <>Set your fly&rsquo;s instincts on the home page, or write exact rules in the editor, then press <b>Enter it on the board</b> in the editor. You get a small file to add to the public repository. Every score is recomputed from scratch, so an entry cannot claim a number it did not earn.</>)}
            </p>
            <div className="row" style={{ marginTop: 16 }}>
              <Link className="btn primary" href="/">{t("造一颗大脑", "Build a brain")}</Link>
              <Link className="btn" href="/build">{t("打开编辑器", "Open the editor")}</Link>
            </div>
          </div>
          <div className="panel">
            <h2>{t("为什么官方大脑会输", "Why the house is losing")}</h2>
            <p>
              {t("官方大脑是照着真实果蝇的行为调的，目标不是活下来，所以这几天里它很少撑到天黑。只会冲向最近食物的大脑表现更好，直到碰上陷阱。把两者都打败，就是这个游戏。",
                 "The official brain was tuned to act like a reference fly, not to survive: it reaches dusk on few of these days. A brain that just runs at the nearest food does better, until it meets a trap. Beating both is the game.")}
            </p>
            <p>{t("分数只算已经结束的日子，所以白天排名不会变。明天每一行都会往后挪一个培养皿。", "Scores use finished days only, so a row does not move during the day. Tomorrow every row shifts by one dish.")}</p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
