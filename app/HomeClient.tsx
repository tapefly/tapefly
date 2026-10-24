"use client";

/* ── the home page ───────────────────────────────────────────────────────────
   One screen. Four instinct switches make a program; the program compiles to
   NAND gates (the same gates TapeOut tapes out) and your fly lives today's
   dish. Below: the circuit itself, what it would take to put it on chain, and
   one button to race a friend. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Arena from "./components/ui/Arena";
import Circuit from "./components/ui/Circuit";
import { useLang } from "./i18n/client";
import { SWITCHES, NO_SWITCHES, programFromSwitches, switchesFromProgram, type Switches, type SwitchId } from "@/sim/instincts";
import { brainFromProgram, week, card, type Duel } from "@/sim/challenge";
import { decodeProgram, encodeProgram, type Program } from "@/sim/program";
import { defaultFlyName } from "@/sim/identity";
import { challengeQuery, cleanName, readChallenge, type Challenge } from "@/sim/versus";
import type { Tick } from "@/sim/engine";

const START: Switches = { ...NO_SWITCHES, eat: true };

export default function HomeClient({ today, through }: { today: string; through: string }) {
  const { t } = useLang();
  const [program, setProgram] = useState<Program>(programFromSwitches(START));
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState<Tick | null>(null);
  const [result, setResult] = useState<Duel | null>(null);
  const [toast, setToast] = useState("");
  const [rival, setRival] = useState<Challenge | null>(null); // a friend's challenge this visit answers

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tapefly.build");
      if (saved) setProgram(decodeProgram(saved));
      setName(localStorage.getItem("tapefly.name") ?? "");
    } catch {}
    try {
      const vs = new URLSearchParams(window.location.search).get("vs");
      if (vs) setRival(readChallenge(new URLSearchParams(vs), through));
    } catch {}
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const code = useMemo(() => encodeProgram(program), [program]);
  useEffect(() => { if (ready) { try { localStorage.setItem("tapefly.build", code); } catch {} } }, [code, ready]);

  const switches = useMemo(() => switchesFromProgram(program), [program]);
  const brain = useMemo(() => brainFromProgram(program), [program]);
  const c = useMemo(() => card(brain.netlist), [brain]);
  const wk = useMemo(() => week(brain, through), [brain, through]);
  const dates = useMemo(() => [today], [today]);
  const flyName = cleanName(name, defaultFlyName(code));

  const flip = (id: SwitchId) => {
    const s = switches ?? START;
    setProgram(programFromSwitches({ ...s, [id]: !s[id] }));
  };
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2400); };
  const race = async () => {
    const link = `${window.location.origin}/vs?${challengeQuery({ a: { program, name: flyName }, b: null, through })}`;
    try { await navigator.clipboard.writeText(link); flash(t("挑战链接已复制，发给朋友吧", "Challenge link copied. Send it to a friend")); } catch { flash(link); }
  };

  return (
    <div className="home">
      <section className="home-top">
        <div className="home-dish">
          <Arena brain={brain} dates={dates} onTick={setTick} onResult={(d) => setResult(d[0] ?? null)} compact solo />
          <p className="dish-legend">
            <span><i className="lg-food" />{t("食物", "food")}</span>
            <span><i className="lg-trap" />{t("陷阱", "trap")}</span>
            <span><i className="lg-you" />{t("你的果蝇", "your fly")}</span>
            <em>{t("今天的培养皿。你的果蝇要一边吃东西一边躲陷阱，撑到天黑（进度条走到头）。", "Today’s dish. Your fly has to eat and avoid traps until dusk, the end of the bar.")}</em>
          </p>
        </div>

        <div className="home-panel">
          {rival && (
            <p className="answering">
              {t(<><b>{rival.a.name}</b> 向你发起挑战。拨好你果蝇的本能，然后开赛。</>, <><b>{rival.a.name}</b> challenged you. Set your fly&rsquo;s instincts, then race.</>)}{" "}
              <Link className="btn primary small" href={`/vs?${challengeQuery({ a: rival.a, b: { program, name: flyName }, through: rival.through })}`}>{t(`和 ${rival.a.name} 对战`, `Race ${rival.a.name}`)}</Link>
            </p>
          )}
          <p className="kicker">{t("基于 TapeOut · 独立游戏", "Built on TapeOut · an independent game")}</p>
          <h1>{t("用 TapeOut 的门电路，造一颗果蝇大脑。", "Build a fly’s brain from TapeOut gates.")}</h1>
          <p className="lede">
            {t("拨动它的本能开关。这些本能会编译成一个由 NAND 门组成的电路，就是大家在 TapeOut 上流片的那种门。然后看你的果蝇能不能在今天的培养皿里活到天黑。",
               "Flip its instincts. They compile into a circuit of NAND gates, the same gates people tape out on TapeOut. Then watch your fly try to survive today’s dish until dusk.")}
          </p>

          <div className="switches" role="group" aria-label={t("果蝇的本能", "Your fly's instincts")}>
            {SWITCHES.map((s) => {
              const on = !!switches?.[s.id];
              return (
                <button key={s.id} type="button" role="switch" aria-checked={on} className={`sw ${on ? "on" : ""}`} onClick={() => flip(s.id)} disabled={!switches && !ready}>
                  <span className="sw-knob" aria-hidden />
                  <span className="sw-text"><b>{t(s.zh, s.label)}</b><span>{t(s.zhLine, s.line)}</span></span>
                </button>
              );
            })}
          </div>
          {!switches && (
            <p className="custom-note">
              {t("你的果蝇用的是大脑编辑器里自己写的规则。", "Your fly has a custom brain from the editor.")}{" "}
              <button type="button" className="link-btn" onClick={() => setProgram(programFromSwitches(START))}>{t("改回用开关", "Use the switches instead")}</button>
            </p>
          )}

          <div className="result" aria-live="polite">
            <div>
              <span>{t("今天", "Today")}</span>
              <b>{result ? (result.day.alive ? t("活下来了", "Survived") : t("死了", "Died")) : "…"}</b>
              <em>{result
                ? (result.day.alive ? t(`撑到天黑 · 吃了 ${result.meals} 口`, `made it to dusk · ${result.meals} meal${result.meals === 1 ? "" : "s"}`) : t(`第 ${result.lived - 1} 步 · 吃了 ${result.meals} 口`, `at step ${result.lived - 1} · ${result.meals} meal${result.meals === 1 ? "" : "s"}`))
                : t("运行中", "running")}</em>
            </div>
            <div>
              <span>{t("最近 7 天", "Last 7 days")}</span>
              <b>{wk.survived}/7</b>
              <em>{t("活到天黑的天数", "days it reached dusk")}</em>
            </div>
            <div>
              <span>{t("大脑", "Brain")}</span>
              <b>{c.gates} NAND</b>
              <em>{t("个 TapeOut 门", "gates on TapeOut")}</em>
            </div>
          </div>

          <div className="home-actions">
            <input className="name-field" aria-label={t("果蝇的名字", "Your fly's name")} maxLength={24} value={name} placeholder={t(`给果蝇起个名（现在叫：${flyName}）`, `Name your fly (now: ${flyName})`)}
              onChange={(e) => { setName(e.target.value); try { localStorage.setItem("tapefly.name", e.target.value); } catch {} }} />
            <div className="row">
              <button type="button" className="btn primary" onClick={race}>{t("和朋友对战", "Race a friend")}</button>
              <Link className="btn" href="/tapeout#tape-out">{t("把这颗大脑放上链", "Put this brain on chain")}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-circuit">
        <div className="hc-copy">
          <p className="kicker">{t("你的果蝇大脑，按 TapeOut 的方式搭出来", "Your fly’s brain, as TapeOut would build it")}</p>
          <h2>{t(`${c.gates} 个 NAND 门，${c.depth} 层深`, `${c.gates} NAND gates, ${c.depth} layers deep`)}</h2>
          <p>
            {t(`你每拨一个开关，这个电路就重新接一次线。在 TapeOut 上，每个门就是一个 NAND 晶体管代币：把这颗大脑流片上链，会烧掉 ${c.gates} 个，并铸造一个属于你的电路 NFT。TapeOut 用"门数 × 层数³"给电路打分，这颗是 ${c.cost.toLocaleString()}，越小越好。`,
               `Every switch you flip rewires this circuit. On TapeOut, each gate is one NAND transistor token: taping out this brain would burn ${c.gates} of them and mint a circuit NFT that is yours. TapeOut ranks designs by gates × layers³; this one scores ${c.cost.toLocaleString()}.`)}
          </p>
          <p className="dim">{t("亮起来的线，就是你的果蝇此刻在培养皿里做的决定。", "Lit wires show the decision your fly is making right now in the dish above.")}</p>
          <div className="row">
            <Link className="btn small" href={`/build?p=${code}`}>{t("在大脑编辑器里打开", "Open in the brain editor")}</Link>
            <Link className="btn small" href="/tapeout">{t("TapeOut 是什么？", "What is TapeOut?")}</Link>
          </div>
        </div>
        <div className="hc-circuit">
          <Circuit netlist={brain.netlist} word={tick?.inWord ?? 0} compact />
        </div>
      </section>

      <section className="home-how">
        <h2>{t("怎么玩", "How it works")}</h2>
        <ol className="how3">
          <li><b>{t("拨本能。", "Flip instincts.")}</b><span>{t("四个开关。开得越多不一定越好：试试弹跳。", "Four switches. More is not always better: try the jump.")}</span></li>
          <li><b>{t("变成 TapeOut 电路。", "It becomes a TapeOut circuit.")}</b><span>{t("你的本能会编译成 NAND 门，可以直接流片上链。", "Your instincts compile into NAND gates you could tape out.")}</span></li>
          <li><b>{t("对战，赢下本周。", "Race and win the week.")}</b><span>{t(<>把对战链接发给朋友。每周最强的果蝇登上<Link className="link" href="/board">冠军榜</Link>。</>, <>Send a friend a race link. Each week&rsquo;s best fly is crowned on <Link className="link" href="/board">Champions</Link>.</>)}</span></li>
        </ol>
      </section>
      <div className={`toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </div>
  );
}
