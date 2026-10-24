"use client";

/* One fly's whole day: its dish (sisters faint behind it), a timeline of its
   meals and escapes, its mind on every tick, its body, and its seal. */

import Link from "next/link";
import { useMemo } from "react";
import Petri, { type PetriFly } from "./Petri";
import Timeline from "./Timeline";
import Circuit from "./Circuit";
import { Meters, Word, Decision, WHY } from "./Mind";
import { useLang } from "@/app/i18n/client";
import { useClock } from "./clock";
import { flyHue } from "./tokens";
import { BRAIN } from "@/sim/netlist";
import { RULES } from "@/sim/rules";
import { GENOME_FIELDS, genomeDrift, type Genome } from "@/sim/genome";
import type { SlimColony } from "@/sim/colony";

const FIELD_NOTE_ZH: Record<keyof Genome, string> = {
  hStep: "每步增加的饥饿",
  hFood: "吃一口减少的饥饿",
  senseDecay: "每远一格损失的嗅觉",
  visitDecay: "每次到访损失的新奇感",
  startX: "出生位置，x 偏移",
  startY: "出生位置，y 偏移"
};

const FIELD_NOTE: Record<keyof Genome, string> = {
  hStep: "hunger gained per tick",
  hFood: "hunger a meal removes",
  senseDecay: "smell lost per cell of distance",
  visitDecay: "novelty lost per visit",
  startX: "where it wakes, x offset",
  startY: "where it wakes, y offset"
};

export default function FlyDay({ colony, index, parent }: { colony: SlimColony; index: number; parent: { name: string; date: string; genome: Genome } | null }) {
  const m = colony.members[index];
  const { t: tr } = useLang();
  const ticks = m.day.ticks;
  const flies: PetriFly[] = useMemo(() => colony.members.map((x, i) => ({ name: x.name, hue: flyHue(i), ticks: x.day.ticks })), [colony]);
  const clock = useClock(ticks.length + 3, { autoplay: true });
  const t = ticks[Math.min(clock.tick, ticks.length - 1)];
  const dead = clock.tick >= ticks.length - 1 && !m.alive;
  const hue = flyHue(index);
  const trapped = !m.alive && colony.world.danger.some((c) => c.x === ticks[ticks.length - 1].x && c.y === ticks[ticks.length - 1].y);

  const usage = useMemo(() => {
    const c = new Map<string, number>();
    for (const x of ticks) c.set(x.rule, (c.get(x.rule) ?? 0) + 1);
    return RULES.map((r) => [r.id, c.get(r.id) ?? 0] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  }, [ticks]);
  const rank = colony.ranking.indexOf(index) + 1;

  return (
    <div className="page flyday">
      <header className="fd-head">
        <p className="kicker">{tr(<><Link className="link" href="/">{colony.date}</Link>，8 只中的第 {index + 1} 只</>, <><Link className="link" href="/">{colony.date}</Link>, fly {index + 1} of 8</>)}</p>
        <h1 style={{ color: hue }}>{m.name}</h1>
        <p className="lede">
          {tr(
            `${m.alive ? "活到了天黑" : trapped ? `在第 ${m.lived - 1} 步掉进陷阱` : `在第 ${m.lived - 1} 步饿死`}，吃了 ${m.meals} 口${m.gf ? `，逃逸弹跳 ${m.gf} 次` : ""}。${rank === 1 ? "当天冠军：明天的 8 只都由这具身体繁衍而来。" : `排第 ${rank} 名（共 8 只）。`}`,
            `${m.alive ? "Reached dusk" : trapped ? `Walked into a trap at tick ${m.lived - 1}` : `Starved at tick ${m.lived - 1}`}, after ${m.meals} ${m.meals === 1 ? "meal" : "meals"}${m.gf ? ` and ${m.gf} escape jumps` : ""}. ${rank === 1 ? "The day's champion: tomorrow's eight are born from this body." : `Finished ${rank} of 8.`}`
          )}
        </p>
      </header>

      <div className="fd-grid">
        <div className="fd-dish">
          <Petri world={colony.world} flies={flies} clock={clock} focus={index} />
          <Timeline clock={clock} flies={flies} focus={index} dusk={ticks.length} />
        </div>
        <div className="fd-mind">
          <div className="panel">
            <h3>{tr(`第 ${Math.min(clock.tick, ticks.length - 1)} 步`, `Tick ${Math.min(clock.tick, ticks.length - 1)}`)}</h3>
            {dead ? (
              <div className="decision"><span className="d-beh dead">{tr("死亡", "dead")}</span><p className="d-why">{trapped ? tr("它踩进了陷阱。", "It stepped onto a trap.") : tr("饥饿到了极限。", "Hunger reached the limit.")}</p></div>
            ) : (
              <Decision behavior={t.behavior} gf={t.gf} why={WHY[t.rule]} rule={t.rule} />
            )}
            <div style={{ marginTop: 18 }}><Meters t={t} /></div>
            <div style={{ marginTop: 16 }}><Word word={t.inWord} /></div>
          </div>
          <div className="panel">
            <h3>{tr("一整天，哪条规则在说话", "Which rule spoke, all day")}</h3>
            <div className="usage">
              {usage.map(([id, n]) => (
                <div key={id} className={`u-row ${id === t.rule && !dead ? "on" : ""}`}>
                  <span>{id}</span>
                  <i><b style={{ width: `${(n / ticks.length) * 100}%` }} /></i>
                  <em>{n}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="row between"><h3>{tr("这一步的电路", "The circuit at this tick")}</h3><span className="dim">{tr("8 只果蝇用的是同样的 50 个门", "Same 50 gates for all eight flies")}</span></div>
        <Circuit netlist={BRAIN} word={t.inWord} />
      </div>

      <div className="two" style={{ marginTop: 16 }}>
        <div className="panel">
          <h2>{tr("它的身体", "Its body")}</h2>
          <table className="tbl">
            <tbody>
              {GENOME_FIELDS.map((f) => (
                <tr key={f}>
                  <td className="dim">{tr(FIELD_NOTE_ZH[f], FIELD_NOTE[f])}</td>
                  <td className="num"><b>{m.genome[f]}</b></td>
                  <td className="num dim">{parent ? (m.genome[f] === parent.genome[f] ? tr("相同", "same") : `${m.genome[f] > parent.genome[f] ? "+" : ""}${m.genome[f] - parent.genome[f]}`) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 12 }}>
            {tr("与始祖的偏移：", "Drift from the founder: ")}<b>{genomeDrift(m.genome)}‰</b>.
            {parent && tr(<> 由 <Link className="link" href={`/fly/${parent.name}?d=${parent.date}`}>{parent.name}</Link>（{parent.date} 的冠军）繁衍而来。</>, <> Born from <Link className="link" href={`/fly/${parent.name}?d=${parent.date}`}>{parent.name}</Link>, champion of {parent.date}.</>)}
          </p>
        </div>
        <div className="panel">
          <h2>{tr("它的封印", "Its seal")}</h2>
          <p>{tr(`${m.day.chainLength} 步，每一步都算哈希并和前一步链在一起。改掉这一天的任何一步，这个哈希就会变。`, `${m.day.chainLength} ticks, each hashed and chained to the one before. Change any tick of this day and this hash changes.`)}</p>
          <code className="hash" style={{ marginTop: 12 }}>{m.day.hash.match(/.{1,16}/g)!.join(" ")}</code>
          <div className="row" style={{ marginTop: 14 }}>
            <Link className="btn small" href="/verify">{tr("核查记录", "Verify a record")}</Link>
            <a className="btn small" href={`/api/v1/fly/${colony.date}/${m.name}`}>{tr("原始 JSON", "Raw JSON")}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
