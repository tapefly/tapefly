"use client";

/* ── Brain Brawl ─────────────────────────────────────────────────────────────
   Shop → brain and body → fight → shop.

   The brain is a list of tactic chips, read top to bottom; the page compiles it
   with sim/compile.ts on every change and shows the real gate count against
   the fight's budget. The body is up to three parts bought with gold. A fight
   is decided by sim/duel.ts and played back by FightCanvas, with the chip that
   is deciding lit up for both flies. The run lives in this browser; the shop,
   rivals and fight seeds are a pure function of the date. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FightView from "./FightView";
import { linesOfChips, linesOfRival } from "./describe";
import { C } from "../components/ui/tokens";
import { useLang } from "../i18n/client";
import {
  TACTICS, PARTS, RUN, BODY_SLOTS, report, aloneGates, budgetFor, rivalFor, newRun, buy, sellChip, sellPart, move, reroll, canFight, fight, practice,
  programOf, priceOf, fightRival, seedFor, isTactic, isPart, rivalGates, type TacticId, type Run, type Fight, type Offer, type Rival
} from "@/sim/arena";
import { bodyOf, type GearId } from "@/sim/duel";
import { encodeProgram, decodeProgram, type Program } from "@/sim/program";
import { defaultFlyName } from "@/sim/identity";

const RUN_KEY = "tapefly.arena.run";
const BEST_KEY = "tapefly.arena.best";
const MUTE_KEY = "tapefly.arena.mute";
const COACH_KEY = "tapefly.arena.coach"; // "skip" | "done" once the new-player tasks are over
const HUES: [string, string] = [C.agar, C.frost];

function load<T>(key: string): T | null { try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; } }
function save(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private window */ } }

interface Best { date: string; wins: number; gates: number; cleared: boolean }


export default function BrawlClient({ today }: { today: string }) {
  const { t } = useLang();
  const [run, setRun] = useState<Run>(() => newRun(today));
  const [watch, setWatch] = useState<{ f: Fight; practice: boolean } | null>(null);
  const [practices, setPractices] = useState(0);
  const [best, setBest] = useState<Best | null>(null);
  const [muted, setMuted] = useState(false);
  const [name, setName] = useState("");
  const [toast, setToast] = useState("");
  const [friend, setFriend] = useState<Rival | null>(null);
  const [coachOff, setCoachOff] = useState(true);

  useEffect(() => {
    const saved = load<Run>(RUN_KEY);
    if (saved && saved.date === today && Array.isArray(saved.chips) && Array.isArray(saved.gear)) setRun(saved);
    setBest(load<Best>(BEST_KEY));
    setMuted(load<boolean>(MUTE_KEY) ?? false);
    try { setName(localStorage.getItem("tapefly.name") || ""); } catch { /* ignore */ }
    setFriend(friendFromUrl());
    try { setCoachOff(!!localStorage.getItem(COACH_KEY)); } catch { setCoachOff(false); }
  }, [today]);
  useEffect(() => { save(RUN_KEY, run); }, [run]);
  useEffect(() => { try { window.scrollTo({ top: 0 }); } catch { /* ignore */ } }, [watch, run.over]);

  const flyName = name || defaultFlyName(encodeProgram(programOf(run.chips)));
  const flash = (s: string) => { setToast(s); setTimeout(() => setToast(""), 2200); };
  const toggleMute = () => { setMuted((m) => { save(MUTE_KEY, !m); return !m; }); };
  const endCoach = (why: "skip" | "done") => { setCoachOff(true); try { localStorage.setItem(COACH_KEY, why); } catch { /* ignore */ } };

  const go = () => {
    if (!canFight(run).ok) return;
    const { run: next, fight: f } = fight(run);
    setWatch({ f, practice: false });
    setRun(next);
    setPractices(0);
    if (next.over) {
      const b: Best = { date: today, wins: next.wins, gates: report(next.chips).gates, cleared: next.over === "cleared" };
      const prev = load<Best>(BEST_KEY);
      if (!prev || b.wins > prev.wins || (b.wins === prev.wins && b.gates < prev.gates)) { save(BEST_KEY, b); setBest(b); }
    }
  };
  const tryOut = () => { if (!canFight(run).ok) return; setWatch({ f: practice(run, practices), practice: true }); setPractices((n) => n + 1); };
  const restart = () => { setWatch(null); setPractices(0); setRun(newRun(today)); };
  const vsFriend = () => { if (!friend || !canFight(run).ok) return; setWatch({ f: fightRival(run.chips, run.gear, friend, (seedFor(today, 40) ^ practices) >>> 0, run.fight), practice: true }); setPractices((n) => n + 1); };

  if (watch) {
    return <FightView f={watch.f} practice={watch.practice} mine={linesOfChips(run.chips)} myGear={run.gear} flyName={flyName} muted={muted} toggleMute={toggleMute} onBack={() => setWatch(null)}
      backLabel={watch.practice ? t("回去调整", "Back to adjust") : run.over ? t("看结算", "See the result") : t("回商店", "Back to the shop")} coach={!coachOff && run.history.length < 3} />;
  }
  if (run.over) return <Summary run={run} today={today} flyName={flyName} best={best} onRestart={restart} flash={flash} toast={toast} />;
  return <Shop run={run} setRun={setRun} today={today} onFight={go} onPractice={tryOut} onRestart={restart} muted={muted} toggleMute={toggleMute} friend={friend} onFriend={vsFriend} coach={!coachOff} endCoach={endCoach} />;
}

/* ── the shop ─────────────────────────────────────────────────────────────── */

function Shop({ run, setRun, today, onFight, onPractice, onRestart, muted, toggleMute, friend, onFriend, coach, endCoach }: {
  run: Run; setRun: (r: Run) => void; today: string; onFight: () => void; onPractice: () => void; onRestart: () => void; muted: boolean; toggleMute: () => void;
  friend: Rival | null; onFriend: () => void; coach: boolean; endCoach: (why: "skip" | "done") => void;
}) {
  const { t } = useLang();
  const rep = useMemo(() => report(run.chips), [run.chips]);
  const budget = budgetFor(run.fight);
  const rival = rivalFor(run.fight);
  const rivalRep = useMemo(() => report(rival.chips), [rival]);
  const over = rep.gates > budget;
  const body = bodyOf(run.gear);
  const rivalBody = bodyOf(rival.gear);
  const plan = coach ? coachPlan(run, rep.gates, budget) : null;
  const focus = plan?.focus ?? "";

  return (
    <div className="page brawl arena">
      <header className="brawl-head">
        <p className="kicker">{t("大脑大乱斗 · 今日挑战", "Brain Brawl · today's run")} <span className="brawl-date">{today}</span></p>
        <h1>{t("给果蝇装上战术大脑，让它去打架。", "Give your fly a tactical brain. Send it to fight.")}</h1>
        <p className="lede">{t(<>芯片是战术，从上往下第一张满足的说了算；整个大脑编译成<b>一张真的 NAND 电路</b>，门数有预算。身体装备用金币买。读懂对手的蓄力，格挡、闪身、打断、抓破绽。</>,
          <>Chips are tactics, read top to bottom; the whole brain compiles to <b>one real NAND circuit</b> with a gate budget. Body parts cost gold. Read the rival's wind-up: block, sidestep, interrupt, punish.</>)}</p>
      </header>

      <section className="brawl-status" aria-label={t("这一局", "This run")}>
        <div><span>{t("第几场", "Fight")}</span><b>{run.fight + 1}</b></div>
        <div><span>{t("生命", "Lives")}</span><b className="hearts">{"♥".repeat(run.lives)}<i>{"♥".repeat(Math.max(0, RUN.lives - run.lives))}</i></b></div>
        <div><span>{t("胜场", "Wins")}</span><b>{run.wins}<i>/{RUN.winsToClear}</i></b></div>
        <div><span>{t("金币", "Gold")}</span><b className="gold">{run.gold}</b></div>
        <div><span>{t("门数预算", "Gate budget")}</span><b>{budget}</b></div>
      </section>

      {plan && <CoachCard plan={plan} onSkip={() => endCoach("skip")} onDone={() => endCoach("done")} />}

      <div className="brawl-grid">
        <div className="brawl-side">
          <section className="panel brawl-bag" aria-label={t("大脑", "Brain")}>
            <div className="brawl-shop-head"><h2>{t("大脑", "Brain")}</h2><span className="brawl-note inline">{t("从上往下，第一张满足的说了算；都不满足就逼近对手", "Top to bottom, first match decides; otherwise it walks at the rival")}</span></div>
            <p className="brawl-advanced"><Link className="link" href="/brawl/editor?from=run">{t("高级：在大脑编辑器里自己写规则 →", "Advanced: write your own rules in the brain editor →")}</Link></p>
            {run.chips.length === 0 ? (
              <p className="brawl-empty">{t("大脑是空的：你的果蝇只会走向对手，不会咬。先买一张「先咬」。", "The brain is empty: your fly walks at the rival and never bites. Buy Bite first.")}</p>
            ) : (
              <ol className="brawl-chips">
                {run.chips.map((c, i) => (
                  <li key={c} className={`tag-${TACTICS[c].tag}`}>
                    <span className="pri">{i + 1}</span>
                    <div className="what"><b>{t(TACTICS[c].zh, TACTICS[c].en)}</b><span>{t(TACTICS[c].dzh, TACTICS[c].den)}</span></div>
                    <span className="alone">{t(`单独 ${aloneGates(c)} 门`, `${aloneGates(c)} alone`)}</span>
                    <div className="ctl">
                      <button className={`btn small ${focus === `up:${i}` ? "coach-pulse" : ""}`} onClick={() => setRun(move(run, i, -1))} disabled={i === 0} aria-label={t("上移", "Move up")}>↑</button>
                      <button className="btn small" onClick={() => setRun(move(run, i, 1))} disabled={i === run.chips.length - 1} aria-label={t("下移", "Move down")}>↓</button>
                      <button className="btn small" onClick={() => setRun(sellChip(run, i))}>{t(`卖 +${Math.floor(TACTICS[c].price / 2)}`, `Sell +${Math.floor(TACTICS[c].price / 2)}`)}</button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className={`brawl-meter ${over ? "over" : ""}`}>
              <div className="bar"><i style={{ width: `${Math.min(100, (rep.gates / budget) * 100)}%` }} /></div>
              <div className="nums">
                <b>{t(`${rep.gates} / ${budget} 个 NAND 门`, `${rep.gates} / ${budget} NAND gates`)}</b>
                {run.chips.length > 1 && <span className={rep.saved >= 0 ? "saved" : "cost"}>{rep.saved >= 0 ? t(`单独做要 ${rep.gates + rep.saved} 个，编译时共用省了 ${rep.saved} 个`, `${rep.gates + rep.saved} apart; sharing saved ${rep.saved}`) : t(`合并输出多花了 ${-rep.saved} 个`, `merging outputs cost ${-rep.saved} more`)}</span>}
                <span className="tape">{t(`深度 ${rep.depth} · TapeOut 成本 A×d³ = ${rep.cost.toLocaleString()}`, `depth ${rep.depth} · TapeOut cost A×d³ = ${rep.cost.toLocaleString()}`)}</span>
              </div>
              {over && <p className="warn">{t(`超出预算 ${rep.gates - budget} 个门：卖掉一张，或者换更省门的组合。`, `${rep.gates - budget} gates over budget: sell a chip or find a leaner mix.`)}</p>}
            </div>
          </section>

          <section className="panel brawl-body" aria-label={t("身体", "Body")}>
            <div className="brawl-shop-head"><h2>{t("身体", "Body")}</h2><span className="brawl-note inline">{t(`${run.gear.length} / ${BODY_SLOTS} 格 · 不占门数`, `${run.gear.length} / ${BODY_SLOTS} slots · no gates`)}</span></div>
            <div className="body-slots">
              {Array.from({ length: BODY_SLOTS }, (_, i) => {
                const g = run.gear[i];
                return g ? (
                  <div key={g} className="body-slot full">
                    <b>{t(PARTS[g].zh, PARTS[g].en)}</b><span>{t(PARTS[g].dzh, PARTS[g].den)}</span>
                    <button className="btn small" onClick={() => setRun(sellPart(run, i))}>{t(`卖 +${Math.floor(PARTS[g].price / 2)}`, `Sell +${Math.floor(PARTS[g].price / 2)}`)}</button>
                  </div>
                ) : <div key={`e${i}`} className="body-slot">{t("空", "empty")}</div>;
              })}
            </div>
            <p className="stats">{t(`生命 ${body.maxHp} · 每口 ${body.dmg} · 速度 ${body.speed.toFixed(1)} · 回气 ${body.regen.toFixed(2)}`, `HP ${body.maxHp} · bite ${body.dmg} · speed ${body.speed.toFixed(1)} · regen ${body.regen.toFixed(2)}`)}{body.venom ? t(" · 毒", " · venom") : ""}{body.spines ? t(" · 背刺", " · spines") : ""}</p>
          </section>
        </div>

        <div className="brawl-side">
          <section className="panel brawl-shop" aria-label={t("商店", "Shop")}>
            <div className="brawl-shop-head">
              <h2>{t("商店", "Shop")}</h2>
              <button className={`btn small ${focus === "reroll" ? "coach-pulse" : ""}`} onClick={() => setRun(reroll(run))} disabled={run.gold < RUN.reroll}>{t(`刷新 −${RUN.reroll}`, `Reroll −${RUN.reroll}`)}</button>
            </div>
            <div className="brawl-offers">
              {run.shop.map((o, i) => <OfferCard key={i} o={o} run={run} budget={budget} onBuy={() => setRun(buy(run, i))} pulse={!!o && offerMatches(focus, o)} />)}
            </div>
          </section>

          <section className="panel brawl-rival" aria-label={t("下一个对手", "Next rival")}>
            <h2>{t("下一个对手", "Next rival")}</h2>
            <p className="who">
              <b style={{ color: C.frost }}>{rival.name}</b>
              {rival.ai ? <span className="ai">{t("AI · 自动搜索设计", "AI · designed by search")}</span> : <span className="hand">{t("人工设计", "hand-made")}</span>}
              <span className="g">{t(`${rivalRep.gates} 个门`, `${rivalRep.gates} gates`)}</span>
            </p>
            <ol className="rival-chips">{rival.chips.map((c: TacticId) => <li key={c}>{t(TACTICS[c].zh, TACTICS[c].en)}</li>)}</ol>
            {rival.gear.length > 0 && <p className="rival-gear">{rival.gear.map((g: GearId) => t(PARTS[g].zh, PARTS[g].en)).join(" · ")}<span>{t(` · 生命 ${rivalBody.maxHp} · 每口 ${rivalBody.dmg}`, ` · HP ${rivalBody.maxHp} · bite ${rivalBody.dmg}`)}</span></p>}
            <div className="row">
              <button className="btn" onClick={onPractice} disabled={over}>{t("免费试打（不计分）", "Free practice")}</button>
              <button className={`btn primary big ${focus === "fight" ? "coach-pulse" : ""}`} onClick={onFight} disabled={over}>{t("开打", "Fight")}</button>
              <button className="btn small ghost-btn" onClick={toggleMute} aria-pressed={!muted}>{muted ? t("声音：关", "Sound: off") : t("声音：开", "Sound: on")}</button>
            </div>
            <p className="brawl-note">{t("试打用另一个种子，正式比赛的种子要开打才揭晓。", "Practice uses another seed; the real fight's seed is revealed when you fight.")}</p>
          </section>
          {friend && (
            <section className="panel brawl-rival friend" aria-label={t("好友挑战", "A friend's challenge")}>
              <h2>{t("好友挑战", "A friend's challenge")}</h2>
              <p className="who"><b style={{ color: C.frost }}>{friend.name}</b><span className="g">{t(`${rivalGates(friend)} 个门`, `${rivalGates(friend)} gates`)}</span></p>
              {friend.program ? <ol className="rival-rules">{linesOfRival(friend).map((l, i) => <li key={i}>{l.sub ? t(l.sub.zh, l.sub.en) : ""}</li>)}</ol>
                : <ol className="rival-chips">{friend.chips.map((c) => <li key={c}>{t(TACTICS[c].zh, TACTICS[c].en)}</li>)}</ol>}
              {friend.gear.length > 0 && <p className="rival-gear">{friend.gear.map((g) => t(PARTS[g].zh, PARTS[g].en)).join(" · ")}</p>}
              <div className="row"><button className="btn" onClick={onFriend} disabled={over}>{t(`用现在的大脑打 ${friend.name}（不计分）`, `Fight ${friend.name} with this brain (not counted)`)}</button></div>
            </section>
          )}
        </div>
      </div>

      <div className="arena-dock" role="region" aria-label={t("出战", "Fight")}>
        <div className="info">
          <div>{t("大脑", "Brain")} <b className={over ? "over" : ""}>{rep.gates}/{budget}</b> {t("门", "gates")} · {t("金币", "gold")} <b>{run.gold}</b></div>
          <div>{t("对手", "vs")} <b>{rival.name}</b>{rival.ai ? " · AI" : ""}</div>
        </div>
        <button className="btn small" onClick={onPractice} disabled={over}>{t("试打", "Practice")}</button>
        <button className={`btn primary ${focus === "fight" ? "coach-pulse" : ""}`} onClick={onFight} disabled={over}>{t("开打", "Fight")}</button>
      </div>

      {run.history.length > 0 && (
        <section className="brawl-history" aria-label={t("战绩", "Record")}>
          {run.history.map((h, i) => <span key={i} className={h.winner === 0 ? "w" : h.winner === 1 ? "l" : "d"}>{i + 1}. {h.rival}{h.ai ? " · AI" : ""} {h.winner === 0 ? t("胜", "W") : h.winner === 1 ? t("负", "L") : t("平", "D")}</span>)}
          <button className="btn small" onClick={onRestart}>{t("重新开始", "Start over")}</button>
        </section>
      )}
    </div>
  );
}

function OfferCard({ o, run, budget, onBuy, pulse }: { o: Offer; run: Run; budget: number; onBuy: () => void; pulse?: boolean }) {
  const { t } = useLang();
  const withIt = useMemo(() => (o && o.kind === "chip" ? report([...run.chips, o.id]).gates : null), [o, run.chips]);
  if (!o) return <div className="brawl-offer sold">{t("已买", "Bought")}</div>;
  const price = priceOf(o);
  const full = o.kind === "part" && run.gear.length >= BODY_SLOTS;
  const info = o.kind === "chip" ? TACTICS[o.id] : PARTS[o.id];
  return (
    <button className={`brawl-offer kind-${o.kind} ${o.kind === "chip" ? `tag-${TACTICS[o.id].tag}` : ""} ${pulse ? "coach-pulse" : ""}`} onClick={onBuy} disabled={run.gold < price || full}>
      <span className="kind">{o.kind === "chip" ? t("战术芯片", "Tactic chip") : t("身体", "Body part")}</span>
      <b>{t(info.zh, info.en)}</b>
      <span>{t(info.dzh, info.den)}</span>
      <em><i className="gold">{price}</i> {t("金币", "gold")}{o.kind === "chip" ? t(` · 单独 ${aloneGates(o.id)} 门`, ` · ${aloneGates(o.id)} gates alone`) : ""}</em>
      {withIt !== null && <strong className={withIt > budget ? "over" : "fits"}>{t(`买下后大脑 ${withIt} / ${budget} 门`, `with it: ${withIt} / ${budget} gates`)}</strong>}
      {full && <strong className="over">{t("身体格子满了", "Body slots full")}</strong>}
    </button>
  );
}

/* ── the fight ───────────────────────────────────────────────────────────── */

/* ── the end of a run ─────────────────────────────────────────────────────── */

function Summary({ run, today, flyName, best, onRestart, flash, toast }: { run: Run; today: string; flyName: string; best: Best | null; onRestart: () => void; flash: (s: string) => void; toast: string }) {
  const { t } = useLang();
  const rep = report(run.chips);
  const brag = t(
    `我在 TapeFly 大脑大乱斗里用 ${rep.gates} 个 NAND 门的战术大脑打出 ${run.wins} 胜（${today}）。大脑是一块真的电路。`,
    `I went ${run.wins} wins in TapeFly Brain Brawl with a ${rep.gates}-gate NAND brain (${today}). The brain is a real circuit.`
  );
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); flash(t(`${what}已复制`, `${what} copied`)); } catch { flash(t("复制失败，请手动选中复制", "Copy failed. Select the text instead")); } };
  return (
    <div className="page brawl arena">
      <header className="brawl-head">
        <p className="kicker">{t("大脑大乱斗 · 结算", "Brain Brawl · result")} <span className="brawl-date">{today}</span></p>
        <h1>{run.over === "cleared" ? t(`通关！${run.wins} 胜`, `Cleared! ${run.wins} wins`) : t(`这局结束：${run.wins} 胜`, `Run over: ${run.wins} wins`)}</h1>
      </header>
      <div className="brawl-grid">
        <section className="panel brawl-card">
          <h2>{flyName}</h2>
          <p className="big">{t(`${rep.gates} 个 NAND 门`, `${rep.gates} NAND gates`)}<span>{t(`深度 ${rep.depth} · A×d³ ${rep.cost.toLocaleString()}`, `depth ${rep.depth} · A×d³ ${rep.cost.toLocaleString()}`)}</span></p>
          <ol className="brawl-chips">{run.chips.map((c, i) => <li key={c} className={`tag-${TACTICS[c].tag}`}><span className="pri">{i + 1}</span><div className="what"><b>{t(TACTICS[c].zh, TACTICS[c].en)}</b><span>{t(TACTICS[c].dzh, TACTICS[c].den)}</span></div></li>)}</ol>
          {run.gear.length > 0 && <p className="rival-gear">{run.gear.map((g) => t(PARTS[g].zh, PARTS[g].en)).join(" · ")}</p>}
          <div className="brawl-history">{run.history.map((h, i) => <span key={i} className={h.winner === 0 ? "w" : h.winner === 1 ? "l" : "d"}>{i + 1}. {h.rival}{h.ai ? " · AI" : ""} {h.winner === 0 ? t("胜", "W") : h.winner === 1 ? t("负", "L") : t("平", "D")}{h.how === "ko" ? " KO" : ""}</span>)}</div>
        </section>
        <div className="brawl-side">
          <section className="panel">
            <h2>{t("晒出去", "Share it")}</h2>
            <p>{t("挑战链接里带着你这颗大脑和身体：朋友打开就能用自己的大脑跟它打。", "The challenge link carries this brain and body: a friend opens it and fights it with their own.")}</p>
            <div className="row">
              <button className="btn primary" onClick={() => copy(`${brag} ${challengeUrl(run, flyName)}`, t("战绩文案", "Post"))}>{t("复制战绩 + 挑战链接", "Copy post + challenge link")}</button>
              <button className="btn" onClick={() => copy(challengeUrl(run, flyName), t("挑战链接", "Challenge link"))}>{t("只复制挑战链接", "Copy the challenge link")}</button>
              <Link className="btn" href="/brawl/editor?from=run">{t("在大脑编辑器里改", "Refine it in the editor")}</Link>
            </div>
          </section>
          <section className="panel">
            <h2>{t("永久留下这颗大脑", "Keep this brain for good")}</h2>
            <p>{t(<>流片到 TapeOut 上，每个门买一个 NAND：这颗大脑需要 <b>{rep.gates} 个 NAND</b>。在游戏里越精简，上链越便宜。</>, <>Taping out buys one NAND per gate: this brain needs <b>{rep.gates} NAND</b>. Leaner in the game, cheaper on chain.</>)}</p>
            <div className="row"><Link className="btn" href="/tapeout#tape-out">{t("怎么流片", "How to tape out")}</Link></div>
          </section>
          <section className="panel">
            <h2>{t("本机最好成绩", "Best on this device")}</h2>
            <p>{best ? t(`${best.date}：${best.wins} 胜，${best.gates} 个门${best.cleared ? "，通关" : ""}。`, `${best.date}: ${best.wins} wins, ${best.gates} gates${best.cleared ? ", cleared" : ""}.`) : t("还没有记录。", "No record yet.")}</p>
            <div className="row"><button className="btn primary" onClick={onRestart}>{t("再来一局", "Play again")}</button></div>
          </section>
        </div>
      </div>
      <div className={`toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </div>
  );
}

/* ── challenge links: /brawl?c=bite,block&g=shell&n=name ───────────────────── */

function challengeUrl(run: Run, name: string): string {
  const q = new URLSearchParams({ c: run.chips.join(","), n: name });
  if (run.gear.length) q.set("g", run.gear.join(","));
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tapefly.xyz";
  return `${origin}/brawl?${q.toString()}`;
}

function friendFromUrl(): Rival | null {
  try {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("c"), pc = q.get("p");
    if (!c && !pc) return null;
    const gear = [...new Set((q.get("g") ?? "").split(",").map((x) => x.trim()).filter(isPart))].slice(0, BODY_SLOTS);
    const name = (q.get("n") ?? "").replace(/[\u0000-\u001f<>]/g, "").slice(0, 24) || "Friend";
    if (pc) { let program: Program; try { program = decodeProgram(pc); } catch { return null; } return { name, ai: false, chips: [], gear, program }; }
    const chips = [...new Set(c!.split(",").map((x) => x.trim()).filter(isTactic))].slice(0, 11);
    return chips.length ? { name, ai: false, chips, gear } : null;
  } catch { return null; }
}

/* ── new-player tasks ─────────────────────────────────────────────────────────
   Four things a first run teaches, one at a time, each with the element to press
   pulsing: buy an attack chip, fight once, put a defence above the attack, fit a
   body part. A tip about the gate budget shows the first time it gets tight. */

interface CoachPlan { step: number; done: boolean[]; zh: string; en: string; focus: string; tip?: { zh: string; en: string } }

const DEFENCE: TacticId[] = ["block", "sidestep", "hop"];
const ATTACK = (c: TacticId) => TACTICS[c].tag === "attack";

function offerMatches(focus: string, o: Exclude<Offer, null>): boolean {
  if (focus === "offer:bite") return o.kind === "chip" && o.id === "bite";
  if (focus === "offer:defend") return o.kind === "chip" && DEFENCE.includes(o.id);
  if (focus === "offer:part") return o.kind === "part";
  return false;
}

function coachPlan(run: Run, gates: number, budget: number): CoachPlan {
  const hasAttack = run.chips.some(ATTACK);
  const fought = run.history.length > 0;
  const firstAttack = run.chips.findIndex(ATTACK);
  const def = run.chips.findIndex((c) => DEFENCE.includes(c));
  const defended = def >= 0 && (firstAttack < 0 || def < firstAttack);
  const bodied = run.gear.length > 0;
  const done = [hasAttack, fought, defended, bodied];
  const shopHas = (pred: (o: Exclude<Offer, null>) => boolean) => run.shop.some((o) => o && pred(o));
  const tip = gates > budget * 0.75 && gates > 0
    ? { zh: `门数快满了（${gates}/${budget}）。卖掉用不上的芯片能省门；有些芯片放在一起会共用电路，比分开加起来更省。预算每场都会涨。`, en: `The gate budget is nearly full (${gates}/${budget}). Selling a chip you don't use frees gates; some chips share circuitry, so together they cost less than apart. The budget grows every fight.` }
    : undefined;
  if (!hasAttack) return { step: 0, done, tip, focus: shopHas((o) => o.kind === "chip" && o.id === "bite") ? "offer:bite" : "reroll",
    zh: "买一张「先咬」：它的规则是「贴身、有体力 → 咬」。没有进攻芯片，你的果蝇只会走向对手，一口都不咬。", en: "Buy Bite: “in reach with energy → bite”. Without an attack chip your fly walks at the rival and never bites." };
  if (!fought) return { step: 1, done, tip, focus: "fight",
    zh: "点「开打」。打的时候看左边：亮起来的芯片就是它此刻在用的战术。想先看看，也可以点「免费试打」，不计分。", en: "Press Fight. While it fights, watch the left: the lit chip is the tactic it is using right now. Free practice works too and doesn't count." };
  if (!defended) {
    if (def >= 0) return { step: 2, done, tip, focus: `up:${def}`,
      zh: `把「${TACTICS[run.chips[def]].zh}」挪到进攻芯片上面（点 ↑）。从上往下第一张满足的说了算，排在下面它永远轮不到。`, en: `Move ${TACTICS[run.chips[def]].en} above your attack chips (press ↑). The first chip that fits decides, so below them it never gets a turn.` };
    return { step: 2, done, tip, focus: shopHas((o) => o.kind === "chip" && DEFENCE.includes(o.id)) ? "offer:defend" : "reroll",
      zh: "对手也会咬你。它蓄力时会发光：买一张「格挡」「闪身」或「后跳」去应对。商店里没有就点「刷新」。", en: "Rivals bite back. Their wind-up glows: buy Block, Sidestep or Hop back to answer it. None in the shop? Reroll." };
  }
  if (!bodied) return { step: 3, done, tip, focus: shopHas((o) => o.kind === "part") ? "offer:part" : "reroll",
    zh: "装一件身体装备：用金币买，不占门数。「硬甲」+30 血最稳，「尖颚」咬得更疼。", en: "Fit a body part: bought with gold, no gates. Shell (+30 health) is the safe pick; Jaws bite harder." };
  return { step: 4, done, tip, focus: "",
    zh: "新手任务完成。接下来自己摸索：「抓破绽」「绕开格挡」「斩杀」……每个对手都有能赢它的组合。输了会告诉你该改哪里。", en: "Tasks done. From here, explore: Punish, Flank, Finisher… every rival has a mix that beats it, and a loss tells you what to change." };
}

const COACH_STEPS: [string, string][] = [["买进攻芯片", "Buy an attack"], ["打第一场", "Fight once"], ["学会防守", "Learn to defend"], ["装身体", "Fit a body"]];

function CoachCard({ plan, onSkip, onDone }: { plan: CoachPlan; onSkip: () => void; onDone: () => void }) {
  const { t } = useLang();
  const finished = plan.step >= 4;
  return (
    <section className={`panel coach ${finished ? "finished" : ""}`} aria-label={t("新手任务", "New-player tasks")} aria-live="polite">
      <div className="coach-head">
        <h2>{finished ? t("新手任务完成 ✓", "Tasks done ✓") : t(`新手任务 ${plan.step + 1}/4`, `New-player task ${plan.step + 1}/4`)}</h2>
        <ol className="coach-steps">
          {COACH_STEPS.map(([z, e], i) => <li key={e} className={plan.done[i] ? "done" : i === plan.step ? "now" : ""}>{plan.done[i] ? "✓ " : ""}{t(z, e)}</li>)}
        </ol>
      </div>
      <p className="coach-say">{t(plan.zh, plan.en)}</p>
      {plan.tip && <p className="coach-extra">{t(plan.tip.zh, plan.tip.en)}</p>}
      <div className="row">
        {finished ? <button className="btn small primary" onClick={onDone}>{t("收起", "Close")}</button>
          : <button className="btn small ghost-btn" onClick={onSkip}>{t("我会玩了，跳过", "I know how, skip")}</button>}
        <Link className="link" href="/docs#play">{t("完整规则", "Full rules")}</Link>
      </div>
    </section>
  );
}
