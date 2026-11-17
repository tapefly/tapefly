"use client";

/* The fight screen: both brains with the deciding rule lit, the canvas, speed and
   sound controls, and the result with its reason. Used by a run and by the editor. */

import { useCallback, useEffect, useMemo, useState } from "react";
import FightCanvas from "./FightCanvas";
import { C } from "../components/ui/tokens";
import { useLang } from "../i18n/client";
import type { Fight } from "@/sim/arena";
import { bodyOf, MOVES, T, type GearId, type FlyFrame } from "@/sim/duel";
import { linesOfRival, otherwiseText, type BrainLine, type ZhEn } from "./describe";

const HUES: [string, string] = [C.agar, C.frost];
const MOVE_ZH: Record<string, string> = { press: "逼近", back: "后撤", circle: "绕圈", guard: "举盾" };

export default function FightView({ f, practice: isPractice, mine, myGear, flyName, muted, toggleMute, onBack, backLabel, coach, mineOtherwise }: {
  f: Fight; practice: boolean; mine: BrainLine[]; myGear: readonly GearId[]; flyName: string; muted: boolean; toggleMute: () => void; onBack: () => void; backLabel: string; coach?: boolean;
  /** what the brain does when no rule fits (default: walk in) */ mineOtherwise?: ZhEn;
}) {
  const { t, lang } = useLang();
  const zh = lang === "zh";
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState<number>(T.hz);
  const [done, setDone] = useState(false);
  const [seek, setSeek] = useState<number | null>(null);
  const names = useMemo<[string, string]>(() => [flyName, f.rival.name], [flyName, f.rival.name]);
  const maxHp = useMemo<[number, number]>(() => [bodyOf(myGear).maxHp, bodyOf(f.rival.gear).maxHp], [myGear, f.rival.gear]);
  const theirs = useMemo(() => linesOfRival(f.rival), [f.rival]);
  const frame = f.result.frames[Math.min(tick, f.result.frames.length - 1)];
  const onTick = useCallback((x: number) => setTick(x), []);
  const onDone = useCallback(() => setDone(true), []);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => { try { document.querySelector(".brawl-result")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch { /* ignore */ } }, 700);
    return () => clearTimeout(id);
  }, [done]);
  const won = f.winner === 0;
  const verdict = useMemo(() => f.winner === -1 ? { text: t("平局", "Draw"), color: C.chalk }
    : { text: `${names[f.winner]} ${t("胜", "wins")}${f.tieBreak ? t("（门更少）", " (fewer gates)") : ""}`, color: HUES[f.winner] }, [f.winner, f.tieBreak, names, t]);
  const doing = (x: FlyFrame) =>
    x.phase === "windup" ? t("蓄力咬！", "biting!") : x.phase === "recover" ? t("收招（有破绽）", "recovering (open)") : x.phase === "stagger" ? t("被打晕（有破绽）", "dazed (open)")
      : x.move === 3 ? (x.guard ? t("举盾", "shield up") : t("举盾中…", "raising shield…")) : zh ? MOVE_ZH[MOVES[x.move]] : MOVES[x.move];

  const Lights = ({ lines, rule, side, otherwise }: { lines: BrainLine[]; rule: number; side: number; otherwise?: ZhEn }) => (
    <ol className={`brawl-chips live side-${side}`}>
      {lines.map((l, i) => (
        <li key={i} className={`${rule === i ? "fire" : ""} ${l.tag ? `tag-${l.tag}` : ""}`}><span className="pri">{i + 1}</span><div className="what"><b>{t(l.title.zh, l.title.en)}</b>{l.sub && <span>{t(l.sub.zh, l.sub.en)}</span>}</div></li>
      ))}
      <li className={rule === -1 ? "fire" : ""}><span className="pri">·</span><div className="what"><b>{otherwise ? t(otherwise.zh, otherwise.en) : t("都不满足：逼近", "None: walk in")}</b></div></li>
    </ol>
  );

  return (
    <div className="page brawl arena fight">
      <header className="brawl-head fight-head">
        <p className="kicker">{isPractice ? t("试打 · 不计分", "Practice · not counted") : t(`第 ${f.index + 1} 场`, `Fight ${f.index + 1}`)} · {t("种子", "seed")} {f.seed}</p>
        <h1><span style={{ color: HUES[0] }}>{names[0]}</span> <em>vs</em> <span style={{ color: HUES[1] }}>{names[1]}</span>{f.rival.ai && <span className="ai">AI</span>}</h1>
      </header>
      <div className="duel-layout">
        <aside className="panel duel-brain">
          <h3 style={{ color: HUES[0] }}>{t("你的大脑", "Your brain")}<span>{t(`${f.gates} 门`, `${f.gates} gates`)}</span></h3>
          <p className="doing">{t("正在", "Now")}：<b>{doing(frame[0])}</b></p>
          <Lights lines={mine} rule={frame[0].rule} side={0} otherwise={mineOtherwise} />
        </aside>
        <div className="duel-stage">
          {coach && <p className="coach-tip">{t(<><b>怎么看：</b>两边亮起来的芯片，就是两只果蝇此刻的决定。发光的圈 = 正在蓄力咬，它会沿直线冲过去，闪开就咬空。你不用操作，大脑自己打。</>, <><b>How to watch:</b> the lit chip on each side is that fly's decision right now. A glowing ring is a bite winding up; it lunges in a straight line, so stepping aside makes it miss. You don't steer; the brain fights.</>)}</p>}
          <FightCanvas result={f.result} names={names} maxHp={maxHp} hues={HUES} speed={speed} muted={muted} onTick={onTick} onDone={onDone} seekTo={seek} zh={zh} verdict={verdict} />
          <div className="duel-controls">
            <div className="seg" role="group" aria-label={t("速度", "Speed")}>
              {[[T.hz, "1×"], [T.hz * 2, "2×"], [T.hz * 4, "4×"]].map(([v, l]) => <button key={l} className={speed === v ? "on" : ""} onClick={() => setSpeed(v as number)}>{l}</button>)}
            </div>
            <button className="btn small" onClick={() => { setSeek(f.result.ticks - 1); setTimeout(() => setSeek(null), 50); }}>{t("跳到结果", "Skip to end")}</button>
            <button className="btn small" onClick={toggleMute}>{muted ? t("声音：关", "Sound: off") : t("声音：开", "Sound: on")}</button>
          </div>
        </div>
        <aside className="panel duel-brain">
          <h3 style={{ color: HUES[1] }}>{t(`${f.rival.name} 的大脑`, `${f.rival.name}'s brain`)}<span>{t(`${f.rivalGates} 门`, `${f.rivalGates} gates`)}</span></h3>
          <p className="doing">{t("正在", "Now")}：<b>{doing(frame[1])}</b></p>
          <Lights lines={theirs} rule={frame[1].rule} side={1} otherwise={f.rival.program ? otherwiseText(f.rival.program) : undefined} />
        </aside>
      </div>
      <section className={`panel brawl-result ${done ? "show" : ""}`} aria-live="polite">
        {done ? (
          <>
            <h2 className={won ? "win" : f.winner === 1 ? "lose" : ""}>{isPractice ? t("试打：", "Practice: ") : ""}{won ? t("赢了", "You win") : f.winner === 1 ? t("输了", "You lose") : t("平局", "A draw")}{f.tieBreak ? t("（比门数）", " (on gates)") : ""}</h2>
            <p>{zh ? f.why.zh : f.why.en}</p>
            <div className="row">
              <button className="btn primary" onClick={onBack}>{backLabel}</button>
              <button className="btn" onClick={() => { setDone(false); setSeek(0); setTimeout(() => setSeek(null), 50); }}>{t("再看一遍", "Watch again")}</button>
            </div>
          </>
        ) : <p className="brawl-wait">{t("蓄力时会发光：看你的芯片在哪一刻亮起来。", "Wind-ups glow: watch which chip lights up, and when.")}</p>}
      </section>
    </div>
  );
}
