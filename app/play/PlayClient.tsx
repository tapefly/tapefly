"use client";

/* ── Brain School ────────────────────────────────────────────────────────────
   Eight levels, each a real dish and a starting brain that fails in a way you
   can watch. Goals are checked live as you edit; stars and your rules for each
   level stay in this browser only. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RuleEditor from "../components/ui/RuleEditor";
import Drive from "./Drive";
import Arena from "../components/ui/Arena";
import { LEVELS, grade, type Level } from "@/sim/levels";
import { brainFromProgram } from "@/sim/challenge";
import { encodeProgram, decodeProgram, runProgram, type Program } from "@/sim/program";
import type { Tick } from "@/sim/engine";
import { useLang } from "../i18n/client";
import { LEVELS_ZH } from "./levels-zh";

/** The level text in the visitor's language. */
function useText() {
  const { lang } = useLang();
  return (l: Level) => {
    const z = lang === "zh" ? LEVELS_ZH[l.id] : undefined;
    return { title: z?.title ?? l.title, brief: z?.brief ?? l.brief, lesson: z?.lesson ?? l.lesson, hint: z?.hint ?? l.hint, coach: z?.coach ?? l.coach, goals: l.goals.map((g, i) => z?.goals[i] ?? g.text) };
  };
}

type Stars = Record<string, number>;

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function StarRow({ n, size = 18, pop }: { n: number; size?: number; pop?: boolean }) {
  const { t } = useLang();
  return (
    <span className={`stars ${pop ? "pop" : ""}`} aria-label={t(`3 颗星中的 ${n} 颗`, `${n} of 3 stars`)}>
      {Array.from({ length: n > 0 && size === 14 ? 1 : 3 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i < n ? "on" : ""} style={{ animationDelay: `${0.15 + i * 0.18}s` }} aria-hidden>
          <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" />
        </svg>
      ))}
    </span>
  );
}

function LevelView({ level, index, stars, onStars }: { level: Level; index: number; stars: number; onStars: (n: number) => void }) {
  const key = `tapefly.level.${level.id}`;
  const [program, setProgram] = useState<Program>(level.start);
  const [hint, setHint] = useState(false);
  const [youTick, setYouTick] = useState<Tick | null>(null);
  const [cleared, setCleared] = useState<number | null>(null);
  const { t } = useLang();
  const text = useText();
  const L = text(level);

  useEffect(() => {
    try { const s = localStorage.getItem(key); setProgram(s ? decodeProgram(s) : level.start); } catch { setProgram(level.start); }
    setHint(false); setCleared(null);
  }, [level, key]);

  const brain = useMemo(() => brainFromProgram(program), [program]);
  const g = useMemo(() => grade(level, program), [level, program]);
  const dates = useMemo(() => level.dates, [level]);

  useEffect(() => {
    try { localStorage.setItem(key, encodeProgram(program)); } catch {}
    if (g.stars > stars) { onStars(g.stars); if (g.stars === 3) setCleared(3); }
  }, [g.stars, program, key, stars, onStars]);

  const next = LEVELS[index + 1];
  const firing = youTick ? runProgram(program, youTick.inWord).rule : null;
  const m = g.metrics;

  return (
    <div className={`level ${level.coach && g.stars === 0 ? "coaching" : ""}`}>
      <section className="level-brief-wrap">
        <div className="level-brief">
          <p className="level-n">{t(`第 ${index + 1} 关 / 共 ${LEVELS.length} 关`, `Level ${index + 1} of ${LEVELS.length}`)}</p>
          <h1>{L.title}</h1>
          <p>{L.brief}</p>
          {L.coach && g.stars === 0 && (
            <ol className="coach" aria-label={t("这一关怎么玩", "How to play this level")}>
              {L.coach.map((c, i) => <li key={i}>{c}</li>)}
            </ol>
          )}
          <ul className="goals">
            {level.goals.map((goal, i) => (
              <li key={i} className={g.goals[i] ? "met" : ""}>
                <i aria-hidden>{g.goals[i] ? "✓" : i + 1}</i>
                {L.goals[i]}
              </li>
            ))}
          </ul>
          <div className="level-meta">
            <span>{t(`${m.gates} 个门`, `${m.gates} gates`)}</span>
            {level.exam && <span>{t(`与参考果蝇一致 ${((m.exam.agree / 4096) * 100).toFixed(1)}%`, `agrees with the reference on ${((m.exam.agree / 4096) * 100).toFixed(1)}%`)}</span>}
            {level.dates.length > 1 && <span>{t(`${m.days.length} 天里 ${m.days.filter((d) => d.alive).length} 天活到天黑`, `${m.days.filter((d) => d.alive).length} of ${m.days.length} days to dusk`)}</span>}
            {level.dates.length === 1 && <span>{m.days[0].alive ? t("活到天黑", "reaches dusk") : t(`死于第 ${m.days[0].lived - 1} 步`, `dies at tick ${m.days[0].lived - 1}`)}{t(`，吃了 ${m.days[0].meals} 口`, `, ${m.days[0].meals} meals`)}</span>}
          </div>
          <div className="row">
            <button className="btn small" onClick={() => setHint((h) => !h)}>{hint ? t("收起提示", "Hide the hint") : t("看提示", "Show a hint")}</button>
            <button className="btn small" onClick={() => setProgram(level.start)}>{t("重来", "Start over")}</button>
          </div>
          {hint && <p className="hint">{L.hint}</p>}
          {g.stars > 0 && (
            <div className="cleared-inline" role="status">
              <StarRow n={g.stars} size={20} pop />
              <div>
                <b>{g.stars === 3 ? t("三颗星全拿。", "All three stars.") : t("过关了。", "Level cleared.")}</b>
                <p>{L.lesson}</p>
              </div>
              {next ? <Link className="btn small primary" href={`/play?l=${next.id}`}>{t("下一关", "Next level")}</Link> : <Link className="btn small primary" href="/build">{t("打开大脑编辑器", "Open the brain editor")}</Link>}
            </div>
          )}
        </div>
      </section>
      <section className="level-rules">
        <RuleEditor program={program} onChange={setProgram} firing={firing} />
      </section>
      <section className="level-right">
        <Arena brain={brain} dates={dates} onTick={setYouTick} />
      </section>

      {cleared !== null && (
        <div className="cleared" role="dialog" aria-modal="true" aria-labelledby="cleared-h">
          <div className="cleared-card">
            <StarRow n={cleared} size={44} pop />
            <h2 id="cleared-h">{cleared === 3 ? t("完美。", "Perfect.") : t("过关了。", "Level cleared.")}</h2>
            <p className="lesson">{L.lesson}</p>
            {cleared < 3 && <p className="dim">{t(`还有一个目标没完成：${L.goals[cleared].replace(/^……?/, "")}。`, `One more goal is still open: ${L.goals[cleared].replace(/^…/, "")}.`)}</p>}
            <div className="row">
              {next ? (
                <Link className="btn primary" href={`/play?l=${next.id}`} onClick={() => setCleared(null)}>{t(`下一关：${text(next).title}`, `Next: ${next.title}`)}</Link>
              ) : (
                <Link className="btn primary" href="/build">{t("造你自己的大脑", "Build your own brain")}</Link>
              )}
              <button className="btn" onClick={() => setCleared(null)}>{cleared < 3 ? t("继续在这关玩", "Keep going here") : t("留在这里", "Stay")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayClient() {
  const [stars, setStars] = useState<Stars>({});
  const id = useSearchParams().get("l");
  const [driven, setDriven] = useState(false);
  const { t } = useLang();
  const text = useText();
  useEffect(() => { try { setDriven(localStorage.getItem("tapefly.drove") === "1"); } catch {} }, [id]);

  useEffect(() => { setStars(load<Stars>("tapefly.stars", {})); }, []);

  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const idx = LEVELS.findIndex((l) => l.id === id);

  const setLevelStars = (lid: string) => (n: number) => setStars((s) => { const v = { ...s, [lid]: Math.max(s[lid] ?? 0, n) }; save("tapefly.stars", v); return v; });

  return (
    <div className="play">
      <nav className="level-map" aria-label={t("关卡", "Levels")}>
        <div className="lm-head">
          <h2 className="lm-title">{t("大脑学校", "Brain School")}</h2>
          <span className="lm-total"><StarRow n={1} size={14} /> {t(`${total} / ${LEVELS.length * 3} 颗星`, `${total} of ${LEVELS.length * 3} stars`)}</span>
        </div>
        <ol>
          <li className={`${id === null || id === "drive" ? "on" : ""} ${driven ? "done" : ""}`}>
            <Link href="/play?l=drive">
              <span className="lm-n">0</span>
              <span className="lm-name">{t("当一回果蝇", "Be the fly")}</span>
              <span className="lm-sub">{t("亲手操控它", "steer it yourself")}</span>
            </Link>
          </li>
          {LEVELS.map((l, i) => {
            const s = stars[l.id] ?? 0;
            return (
              <li key={l.id} className={`${l.id === id ? "on" : ""} ${s > 0 ? "done" : ""}`}>
                <Link href={`/play?l=${l.id}`}>
                  <span className="lm-n">{i + 1}</span>
                  <span className="lm-name">{text(l).title}</span>
                  <StarRow n={s} size={12} />
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {idx >= 0 ? (
        <LevelView key={LEVELS[idx].id} level={LEVELS[idx]} index={idx} stars={stars[LEVELS[idx].id] ?? 0} onStars={setLevelStars(LEVELS[idx].id)} />
      ) : (
        <Drive next={`/play?l=${LEVELS[0].id}`} />
      )}
    </div>
  );
}
