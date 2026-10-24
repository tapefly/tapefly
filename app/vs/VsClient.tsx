"use client";

/* ── Versus ──────────────────────────────────────────────────────────────────
   My fly against yours. A match is a link: both brains, both names and the
   date travel in the URL, so what you send is exactly what your friend sees.
   Two flies wake on the same cell of the same dish and race for the same food,
   seven dishes in a row (sim/versus.ts). */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Petri, { type PetriFly } from "../components/ui/Petri";
import Timeline from "../components/ui/Timeline";
import { useClock } from "../components/ui/clock";
import { C } from "../components/ui/tokens";
import { match, readChallenge, challengeQuery, cleanName, type Round, type Life, type Side } from "@/sim/versus";
import { brainFromProgram, card } from "@/sim/challenge";
import { OFFICIAL_PROGRAM, decodeProgram, encodeProgram, type Program } from "@/sim/program";
import wanderer from "@/challengers/house/wanderer.json";
import { defaultFlyName } from "@/sim/identity";
import { useLang } from "../i18n/client";

const HUE = [C.agar, C.frost];

const RIVALS: [string, string, Program][] = [
  ["The official rules", "官方规则", OFFICIAL_PROGRAM],
  ["Greedy", "贪吃鬼", { rules: [], otherwise: { then: 0 } }],
  ["Careful eater", "谨慎的吃货", { rules: [{ when: { threat: [2, 3] }, then: 1, gf: true }, { when: { food: [1, 3] }, then: 0 }], otherwise: { then: 2 } }],
  ["Wanderer", "流浪者", decodeProgram((wanderer as { program: string }).program)]
];

/** The fly you have been building, if any (the builder keeps it in this browser). */
function myFly(): Side | null {
  try {
    const p = localStorage.getItem("tapefly.build");
    if (!p) return null;
    return { program: decodeProgram(p), name: cleanName(localStorage.getItem("tapefly.name"), defaultFlyName(encodeProgram(decodeProgram(p)))) };
  } catch {
    return null;
  }
}

function fate(l: Life, ticks: number, zh: boolean): string {
  if (l.alive && l.lived >= ticks) return zh ? "撑到了天黑" : "reached dusk";
  if (l.death === "trap") return zh ? `在第 ${l.lived - 1} 步掉进陷阱` : `walked into a trap at tick ${l.lived - 1}`;
  return zh ? `在第 ${l.lived - 1} 步饿死` : `starved at tick ${l.lived - 1}`;
}

function RoundView({ r, names }: { r: Round; names: string[] }) {
  const { t, lang } = useLang();
  const zh = lang === "zh";
  const flies: PetriFly[] = useMemo(
    () => r.lives.map((l, i) => ({ name: names[i], hue: HUE[i], ticks: l.ticks })),
    [r, names]
  );
  const longest = Math.max(...flies.map((f) => f.ticks.length));
  const clock = useClock(longest + 3, { autoplay: true, speed: 12 });
  const [focus, setFocus] = useState(0);
  const now = Math.min(clock.tick, longest - 1);
  const ate = r.lives.map((l) => l.ticks.slice(0, now + 1).filter((t) => t.ate).length);

  return (
    <div className="vs-round">
      <Petri world={r.world} flies={flies} clock={clock} focus={focus} onPick={setFocus} labels ariaLabel={t(`${names[0]} 是金色，${names[1]} 是蓝色`, `${names[0]} in gold, ${names[1]} in blue`)} />
      <Timeline clock={clock} flies={flies} focus={focus} dusk={longest} />
      <div className="vs-live" aria-live="off">
        {r.lives.map((l, i) => (
          <div key={i} className="vs-live-row">
            <i style={{ background: HUE[i] }} />
            <b>{names[i]}</b>
            <span>{t(`${ate[i]} 口`, `${ate[i]} meal${ate[i] === 1 ? "" : "s"}`)}</span>
            <span>{clock.tick >= l.lived - 1 && !(l.alive && l.lived >= 150) ? t("死亡", "dead") : t("活着", "alive")}</span>
          </div>
        ))}
      </div>
      <p className="vs-says">
        {zh
          ? <>{names[0]} {fate(r.lives[0], 150, true)}，吃了 {r.lives[0].meals} 口；{names[1]} {fate(r.lives[1], 150, true)}，吃了 {r.lives[1].meals} 口。{r.winner === -1 ? "平局。" : `这一轮 ${names[r.winner]} 赢。`}</>
          : <>{names[0]} {fate(r.lives[0], 150, false)} with {r.lives[0].meals} meal{r.lives[0].meals === 1 ? "" : "s"}; {names[1]} {fate(r.lives[1], 150, false)} with {r.lives[1].meals}. {r.winner === -1 ? "A draw." : `${names[r.winner]} takes the round.`}</>}
        {r.lives.some((l) => l.snatched > 0) && (
          <> {r.lives.map((l, i) => (l.snatched ? (zh ? `${names[i]} 抢先吃掉了对方正要去吃的 ${l.snatched} 颗食物。` : `${names[i]} ate ${l.snatched} drop${l.snatched === 1 ? "" : "s"} the other fly was heading for.`) : "")).join(" ")}</>
        )}
      </p>
    </div>
  );
}

export default function VsClient({ through }: { through: string }) {
  const q = useSearchParams();
  const { t, lang } = useLang();
  const [mine, setMine] = useState<Side | null>(null);
  const [rival, setRival] = useState(0);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const m = myFly();
    setMine(m);
    // never open on a mirror match: pick the first rival that is not your own fly
    const yours = encodeProgram(m?.program ?? OFFICIAL_PROGRAM);
    setRival(Math.max(0, RIVALS.findIndex(([, , p]) => encodeProgram(p) !== yours)));
  }, []);

  const parsed = useMemo(() => {
    if (!q.get("a")) return null;
    try { return readChallenge(new URLSearchParams(q.toString()), through); } catch (e) { return e as Error; }
  }, [q, through]);

  if (parsed instanceof Error) {
    return (
      <div className="page vs">
        <div className="panel"><h2>{t("这个链接坏了", "This link is broken")}</h2><p>{t(<>{parsed.message} 请对方重新发一次链接，或者<Link className="link" href="/vs">开一场新对战</Link>。</>, <>{parsed.message} Ask for the link again, or <Link className="link" href="/vs">start a new match</Link>.</>)}</p></div>
      </div>
    );
  }

  // who is on each side
  const open = parsed !== null && parsed.b === null; // a challenge waiting for an answer
  const you: Side = mine ?? { program: OFFICIAL_PROGRAM, name: t("我的果蝇", "My fly") };
  const a: Side = parsed ? parsed.a : you;
  const b: Side = parsed?.b ?? (parsed ? you : { program: RIVALS[rival][2], name: lang === "zh" ? RIVALS[rival][1] : RIVALS[rival][0] });
  const date = parsed ? parsed.through : through;

  return <Match a={a} b={b} date={date} mode={!parsed ? "practice" : open ? "answer" : "shared"} mine={mine} rival={rival} setRival={setRival} tab={tab} setTab={setTab} toast={toast} setToast={setToast} />;
}

function Match({ a, b, date, mode, mine, rival, setRival, tab, setTab, toast, setToast }: {
  a: Side; b: Side; date: string; mode: "practice" | "answer" | "shared"; mine: Side | null;
  rival: number; setRival: (i: number) => void; tab: number; setTab: (i: number) => void; toast: string; setToast: (s: string) => void;
}) {
  const ca = encodeProgram(a.program), cb = encodeProgram(b.program);
  const m = useMemo(() => match(brainFromProgram(a.program), brainFromProgram(b.program), date), [ca, cb, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const names = useMemo(() => [a.name, a.name === b.name ? `${b.name} (2)` : b.name], [a.name, b.name]);
  const r = m.rounds[Math.min(tab, m.rounds.length - 1)];
  const { t } = useLang();
  const gates = useMemo(() => [card(brainFromProgram(a.program).netlist).gates, card(brainFromProgram(b.program).netlist).gates], [ca, cb]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (s: string) => { setToast(s); setTimeout(() => setToast(""), 2200); };
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); flash(t(`${what}已复制`, `${what} copied`)); } catch { flash(t("复制失败，请直接复制地址栏", "Copy failed. Select the address bar instead")); }
  };
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const challengeLink = `${origin}/vs?${challengeQuery({ a, b: null, through: date })}`;
  const matchLink = `${origin}/vs?${challengeQuery({ a, b, through: date })}`;
  const answerHref = `/?vs=${encodeURIComponent(challengeQuery({ a, b: null, through: date }))}`;

  const headline =
    m.winner === -1
      ? t(`${m.wins[0]}–${m.wins[1]}，打平`, `A drawn match, ${m.wins[0]}–${m.wins[1]}`)
      : t(`${names[m.winner]} 以 ${Math.max(...m.wins)}–${Math.min(...m.wins)} 赢下比赛`, `${names[m.winner]} wins the match ${Math.max(...m.wins)}–${Math.min(...m.wins)}`);

  return (
    <div className="page vs">
      <header className="vs-head">
        <p className="kicker">
          {mode === "practice" ? t("对战 · 练习", "Versus · practice") : mode === "answer" ? t(`${a.name} 向你发起挑战`, `${a.name} challenges you`) : t("对战", "Versus")}
        </p>
        <h1>
          <span style={{ color: HUE[0] }}>{names[0]}</span> <em>vs</em> <span style={{ color: HUE[1] }}>{names[1]}</span>
        </h1>
        <p className="lede">
          {t(`同一个培养皿，同样的身体，同样的食物。谁先到谁吃。一共 7 个培养皿（${m.rounds[0].date.slice(5)} 到 ${date.slice(5)}）；每轮活得更久的赢，一样久就比谁吃得多。`,
             `Same dish, same body, the same drops of food. Whoever gets to a drop first eats it. Seven dishes, ${m.rounds[0].date.slice(5)} to ${date.slice(5)}; a round goes to the fly that lives longer, then the one that eats more.`)}
        </p>
      </header>

      <section className="vs-score" aria-label={t("比分", "Score")}>
        {[0, 1].map((i) => (
          <div key={i} className={`vs-side ${m.winner === i ? "won" : ""}`}>
            <i style={{ background: HUE[i] }} />
            <span>{names[i]}<em className="vs-nand">{t(`${gates[i]} 个 NAND 门`, `${gates[i]} NAND gates`)}</em></span>
            <b>{m.wins[i]}</b>
          </div>
        ))}
        <div className="vs-mid"><b>{m.draws}</b><span>{t("平局", `draw${m.draws === 1 ? "" : "s"}`)}</span></div>
        <p className="vs-headline">{headline}{t("。", ".")}</p>
        <p className="vs-tape">{t("每颗大脑都是一个由 NAND 门组成的 TapeOut 电路。赢的那颗可以在 TapeOut 上流片，变成你拥有的电路 NFT。", "Each brain is a TapeOut circuit of NAND gates. The winning brain can be taped out on TapeOut and owned as a circuit NFT.")} <Link className="link" href="/tapeout#tape-out">{t("怎么做", "How")}</Link></p>
      </section>

      <div className="vs-rounds" role="tablist" aria-label={t("回合", "Rounds")}>
        {m.rounds.map((x, i) => (
          <button key={x.date} role="tab" aria-selected={i === tab} className={i === tab ? "on" : ""} onClick={() => setTab(i)}>
            <span>{x.date.slice(5)}</span>
            <b style={{ color: x.winner === -1 ? "var(--fog)" : HUE[x.winner] }}>{x.winner === -1 ? t("平", "draw") : names[x.winner]}</b>
            <i aria-hidden style={{ background: x.winner === -1 ? "transparent" : HUE[x.winner], borderColor: x.winner === -1 ? "var(--fog)" : HUE[x.winner] }} />
          </button>
        ))}
      </div>

      <RoundView key={`${ca}-${cb}-${r.date}`} r={r} names={names} />

      <section className="vs-actions panel">
        {mode === "practice" && (
          <>
            <h3>{t("选一个对手", "Pick a rival")}</h3>
            <div className="seg" role="tablist" aria-label={t("对手", "Rival")}>
              {RIVALS.map(([n, zh], i) => (
                <button key={n} role="tab" aria-selected={i === rival} className={i === rival ? "on" : ""} onClick={() => { setRival(i); setTab(0); }}>{t(zh, n)}</button>
              ))}
            </div>
            <p>
              {mine
                ? t(<>金色是 <b>{mine.name}</b>，就是你一直在调的那只果蝇。</>, <>Gold is <b>{mine.name}</b>, the fly you have been building.</>)
                : t(<>你还没调自己的果蝇，金色暂时用官方规则。</>, <>Gold is the official rules until you build a fly of your own.</>)}
              {" "}{t("把挑战发出去，朋友的果蝇就会在这同样的 7 个培养皿里和你比。", "Send the challenge and your friend’s fly races yours on these same seven dishes.")}
            </p>
            <div className="row">
              <button className="btn primary" onClick={() => copy(challengeLink, t("挑战链接", "Challenge link"))}>{t("复制挑战链接", "Copy a challenge link")}</button>
              <Link className="btn" href="/">{mine ? t("调整我的果蝇", "Change my fly") : t("造我的果蝇", "Build my fly")}</Link>
            </div>
          </>
        )}
        {mode === "answer" && (
          <>
            <h3>{t("你的应战", "Your answer")}</h3>
            <p>
              {mine
                ? t(<>蓝色是 <b>{mine.name}</b>，就是你一直在调的那只果蝇。</>, <>Blue is <b>{mine.name}</b>, the fly you have been building.</>)
                : t(<>蓝色暂时是官方规则。造一只你自己的果蝇来正式应战吧。</>, <>Blue is the official rules for now. Build your own fly to answer properly.</>)}
              {" "}{t("调满意了，就把这场对战发回去。", "When you are happy with it, send the match back.")}
            </p>
            <div className="row">
              <Link className="btn primary" href={answerHref}>{t("调一只果蝇来应战", "Build an answer")}</Link>
              <button className="btn" onClick={() => copy(matchLink, t("对战链接", "Match link"))}>{t("把这场对战发回去", "Send this match back")}</button>
            </div>
          </>
        )}
        {mode === "shared" && (
          <>
            <h3>{t("再来一场", "Rematch")}</h3>
            <p>{t("这场对战已经定格：任何人打开链接看到的都是这 7 个回合。用你自己的果蝇应战，就能开新的一场。", "This match is fixed: anyone who opens the link sees exactly these seven rounds. Answer it with your own fly to start a new one.")}</p>
            <div className="row">
              <Link className="btn primary" href={answerHref}>{t("用我的果蝇应战", "Answer with my own fly")}</Link>
              <button className="btn" onClick={() => copy(matchLink, t("对战链接", "Match link"))}>{t("复制这场对战", "Copy this match")}</button>
            </div>
          </>
        )}
      </section>
      <div className={`toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </div>
  );
}
