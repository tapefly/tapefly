"use client";

/* TapeFly: Evolution. The chapter map and the level screen. No wallet, no
   chain, nothing to sign: the game runs entirely in the browser. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CHAPTERS, LEVELS } from "@/sim/evo/levels";
import { useLang } from "../i18n/client";
import LevelScreen from "./LevelScreen";
import { useProgress } from "./progress";
import { setSound, sfx } from "./sound";
import { drawFly, drawRun } from "./draw";
import { useRef } from "react";
import { parseBoard, type Run } from "@/sim/evo/world";
import type { EvoLevel } from "@/sim/evo/levels";

/** The level's first board, drawn small: the fly at its start, the sugar waiting. */
function Thumb({ level }: { level: EvoLevel }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const b = parseBoard(level.tests[0]);
    const run: Run = { board: b, frames: [{ t: 0, x: b.start.x, y: b.start.y, dir: b.start.dir, mem: 0, word: 0, out: 0, event: null, ate: -1 }], outcome: "timeout", ticks: 0, eaten: 0, bumps: 0, loopFrom: -1 };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth || 220, H = cv.clientHeight || 84;
    const cell = Math.floor(Math.min(W / b.w, H / b.h));
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#041318";
    g.fillRect(0, 0, W, H);
    g.translate(Math.floor((W - b.w * cell) / 2), Math.floor((H - b.h * cell) / 2));
    drawRun(g, run, 0, { cell, time: 0, trail: false });
  }, [level]);
  return <canvas ref={ref} className="evo-thumb" aria-hidden />;
}

function HeroFly() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const cv = ref.current;
      if (cv) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const S = 120;
        if (cv.width !== S * dpr) { cv.width = S * dpr; cv.height = S * dpr; }
        const g = cv.getContext("2d")!;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, S, S);
        drawFly(g, S / 2, S / 2 + Math.sin(now * 0.002) * 3, 104, 35 + Math.sin(now * 0.0007) * 8, now, true);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="evo-hero-fly" style={{ width: 120, height: 120 }} aria-hidden />;
}

export default function EvoGame() {
  const { lang, t, setLang } = useLang();
  const [progress, update] = useProgress();
  const [levelId, setLevelId] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const l = new URLSearchParams(window.location.search).get("l");
      setLevelId(l && LEVELS.some((x) => x.id === l) ? l : null);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  useEffect(() => setSound(progress.sound), [progress.sound]);

  const go = useCallback((id: string | null) => {
    const url = id ? `?l=${id}` : window.location.pathname;
    window.history.pushState(null, "", url);
    setLevelId(id);
    window.scrollTo(0, 0);
  }, []);

  const unlocked = useMemo(() => {
    const u = new Set<string>();
    LEVELS.forEach((l, i) => { if (i < 2 || progress.best[LEVELS[i - 1].id] || progress.best[l.id]) u.add(l.id); });
    return u;
  }, [progress.best]);

  const level = levelId ? LEVELS.find((l) => l.id === levelId) : undefined;
  const cleared = LEVELS.filter((l) => progress.best[l.id]).length;

  const topRight = (
    <div className="evo-top-tools">
      <button type="button" className="evo-mini" onClick={() => { update((p) => ({ ...p, sound: !p.sound })); sfx.click(); }} aria-pressed={progress.sound}>
        {progress.sound ? t("声音 开", "Sound on") : t("声音 关", "Sound off")}
      </button>
      <button type="button" className="evo-mini" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>{lang === "zh" ? "EN" : "中文"}</button>
    </div>
  );

  if (level && unlocked.has(level.id)) {
    const i = LEVELS.indexOf(level);
    const next = LEVELS[i + 1];
    return (
      <main className="evo">
        {topRight}
        <LevelScreen key={level.id} level={level} progress={progress} update={update} t={t} onExit={() => go(null)} onNext={next ? () => go(next.id) : null} />
      </main>
    );
  }

  return (
    <main className="evo evo-map">
      {topRight}
      <header className="evo-hero">
        <HeroFly />
        <div>
          <p className="evo-kicker">TapeFly · {t("进化", "Evolution")}</p>
          <h1>{t("写一只果蝇的大脑。", "Write a fly's brain.")}</h1>
          <p className="evo-lede">
            {t(
              "从一个只会等待的大脑开始，一个器官一个器官地长出来。你写的每条规则都会编译成真正的 NAND 门电路，门越少、走得越快，分数越好。",
              "Start with a brain that can only wait, and grow it one organ at a time. Every rule you write compiles to a real NAND gate circuit: fewer gates and faster flies score better."
            )}
          </p>
          <div className="evo-hero-stats">
            <span><b>{cleared}</b>/{LEVELS.length} {t("关已通过", "levels cleared")}</span>
            <span><b>3</b> {t("个分数：门数 · 步数 · 深度", "scores: gates · steps · depth")}</span>
            <span><b>0</b> {t("个钱包要连", "wallets needed")}</span>
          </div>
        </div>
      </header>

      {CHAPTERS.map((c) => (
        <section key={c.n} className={`evo-chapter ${c.open ? "" : "locked"}`} aria-labelledby={`ch-${c.n}`}>
          <div className="evo-ch-head">
            <span className="num">{String(c.n).padStart(2, "0")}</span>
            <div>
              <h2 id={`ch-${c.n}`}>{t(c.title.zh, c.title.en)}</h2>
              <p>{t(c.blurb.zh, c.blurb.en)}</p>
            </div>
            {!c.open && <span className="soon">{t("即将开放", "Coming soon")}</span>}
          </div>
          {c.open && (
            <ol className="evo-nodes">
              {LEVELS.filter((l) => l.chapter === c.n).map((l, i) => {
                const b = progress.best[l.id];
                const open = unlocked.has(l.id);
                return (
                  <li key={l.id}>
                    <button type="button" className={`evo-node ${b ? "done" : ""} ${open ? "" : "shut"}`} disabled={!open} onClick={() => { sfx.click(); go(l.id); }}>
                      <span className="i">{i + 1}</span>
                      <Thumb level={l} />
                      <span className="tt">{t(l.title.zh, l.title.en)}</span>
                      {l.grows && <span className="organ">+ {t(l.grows.name.zh, l.grows.name.en)}</span>}
                      {b ? (
                        <span className="best">
                          <span><small>{t("门", "gates")}</small>{b.gates}</span>
                          <span><small>{t("步", "steps")}</small>{b.steps}</span>
                          <span><small>{t("深", "depth")}</small>{b.depth}</span>
                        </span>
                      ) : (
                        <span className="state">{open ? t("可以玩", "Open") : t("先通过上一关", "Clear the one before")}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
      <footer className="evo-foot">
        <p>{t("进度只存在这个浏览器里。", "Progress lives in this browser only.")} <a href="/">{t("回到 TapeFly 首页", "Back to TapeFly")}</a></p>
      </footer>
    </main>
  );
}
