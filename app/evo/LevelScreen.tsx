"use client";

/* One level: the board on the left, the brain on the right. Every edit
   recompiles the brain to gates and reruns every test board at once; the board
   plays the selected run back so you can watch the brain think. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeBrain, encodeBrain, runRules, type EvoProgram } from "@/sim/evo/brain";
import { gradeBrain } from "@/sim/evo/game";
import { LEVELS, type EvoLevel } from "@/sim/evo/levels";
import { fieldValue, FIELDS } from "@/sim/evo/brain";
import histos from "@/sim/evo/histos.json";
import BrainEditor from "./BrainEditor";
import CircuitView from "./CircuitView";
import Histo from "./Histo";
import { drawRun, PAL } from "./draw";
import { GifWriter, makePalette } from "./gif";
import { ACT, SENSE, outcomeLine, type T } from "./text";
import { sfx } from "./sound";
import { better, type Progress } from "./progress";

const SPEEDS = [2, 4, 8, 16, 32];
const H = histos as Record<string, { n: number; gates: number[]; steps: number[]; depth: number[] }>;

function useBoardSize(ref: React.RefObject<HTMLDivElement>, cols: number, rows: number) {
  const [cell, setCell] = useState(32);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const maxH = Math.max(260, window.innerHeight * (window.innerWidth < 900 ? 0.5 : 0.62));
      setCell(Math.max(14, Math.min(58, Math.floor(Math.min((w - 22) / cols, maxH / rows)))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [ref, cols, rows]);
  return cell;
}

export default function LevelScreen({
  level,
  progress,
  update,
  t,
  onExit,
  onNext
}: {
  level: EvoLevel;
  progress: Progress;
  update: (f: (p: Progress) => Progress) => void;
  t: T;
  onExit: () => void;
  onNext: (() => void) | null;
}) {
  const index = LEVELS.indexOf(level);
  const [program, setProgram] = useState<EvoProgram>(() => {
    try { const s = progress.brains[level.id]; return s ? decodeBrain(s) : level.start; } catch { return level.start; }
  });
  const g = useMemo(() => gradeBrain(level, program), [level, program]);
  const [test, setTest] = useState(0);
  const run = g.runs[Math.min(test, g.runs.length - 1)];
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState<"rules" | "circuit">("rules");
  const [hints, setHints] = useState(0);
  const [results, setResults] = useState(false);
  const [gifBusy, setGifBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(true);
  const [played, setPlayed] = useState(false);
  const coach = level.id === "first-bite" && !progress.best[level.id];
  const lastFrame = run.frames.length - 1;

  // remember the brain
  useEffect(() => {
    const s = encodeBrain(program);
    update((p) => (p.brains[level.id] === s ? p : { ...p, brains: { ...p.brains, [level.id]: s } }));
  }, [program, level.id, update]);

  // edits stop the run and rewind it
  const edit = useCallback((p: EvoProgram) => { setProgram(p); setPlaying(false); setAt(0); }, []);

  // playback
  const atRef = useRef(at);
  atRef.current = at;
  useEffect(() => {
    if (!playing) return;
    let raf = 0, prev = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      const before = atRef.current;
      const next = Math.min(lastFrame, before + dt * SPEEDS[speed]);
      // sound for each frame crossed (only at watchable speeds)
      if (SPEEDS[speed] <= 8) {
        for (let i = Math.floor(before) + 1; i <= Math.floor(next); i++) {
          const f = run.frames[i];
          if (f.event === "eat") sfx.eat();
          else if (f.event === "bump") sfx.bump();
          else if (f.event === "caught") sfx.caught();
          else if ((f.out & 3) === 1) sfx.step();
          else if ((f.out & 3) >= 2) sfx.turn();
        }
      }
      setAt(next);
      if (next >= lastFrame) {
        setPlaying(false);
        setPlayed(true);
        if (run.outcome === "cleared") {
          if (g.cleared) { sfx.clear(); setResults(true); }
        } else if (run.outcome === "loop") sfx.loop();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, lastFrame, run, g.cleared]);

  // record a clear
  useEffect(() => {
    if (!g.cleared) return;
    const s = { gates: g.gates, steps: g.steps, depth: g.depth };
    update((p) => {
      const b = better(p.best[level.id], s);
      const o = p.best[level.id];
      if (o && o.gates === b.gates && o.steps === b.steps && o.depth === b.depth) return p;
      return { ...p, best: { ...p.best, [level.id]: b } };
    });
  }, [g.cleared, g.gates, g.steps, g.depth, level.id, update]);

  const play = useCallback(() => {
    sfx.click();
    if (atRef.current >= lastFrame) setAt(0);
    setPlaying((p) => !p);
  }, [lastFrame]);

  // keys: space play/pause, ←/→ step, r rewind
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); play(); }
      else if (e.key === "ArrowRight") { setPlaying(false); setAt((a) => Math.min(lastFrame, Math.floor(a) + 1)); }
      else if (e.key === "ArrowLeft") { setPlaying(false); setAt((a) => Math.max(0, Math.ceil(a) - 1)); }
      else if (e.key === "r" || e.key === "R") { setPlaying(false); setAt(0); }
      else if (e.key === "Escape") setResults(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [play, lastFrame]);

  // canvas
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cell = useBoardSize(wrapRef, run.board.w, run.board.h);
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const cv = canvasRef.current;
      if (cv) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = run.board.w * cell, Hh = run.board.h * cell;
        if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = Hh * dpr; cv.style.width = W + "px"; cv.style.height = Hh + "px"; }
        const g2 = cv.getContext("2d")!;
        g2.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawRun(g2, run, atRef.current, { cell, time: now, smell: level.senses.includes("smell") ? level.smellRange : undefined });
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [run, cell, level]);

  // what the fly senses now, and which rule decides
  const i = Math.min(lastFrame, Math.floor(at));
  const nextWord = i < lastFrame ? run.frames[i + 1].word : lastFrame > 0 ? run.frames[lastFrame].word : null;
  const firing = nextWord === null ? null : runRules(program, nextWord).rule;
  const outcome = outcomeLine(run, t);
  const ended = at >= lastFrame;

  const exportGif = async () => {
    setGifBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    try {
      const c = Math.max(20, Math.min(40, Math.floor(480 / run.board.w)));
      const strip = 30;
      const W = run.board.w * c, Hb = run.board.h * c, Hh = Hb + strip;
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = Hh;
      const g2 = cv.getContext("2d", { willReadFrequently: true })!;
      const gw = new GifWriter(W, Hh, makePalette(Object.values(PAL)));
      const sub = 3;
      const total = run.frames.length - 1;
      const label = `TapeFly · ${t(level.title.zh, level.title.en)}`;
      const score = t(`${g.gates} 门 · ${run.ticks} 步`, `${g.gates} gates · ${run.ticks} ticks`);
      for (let k = 0; k <= total * sub; k++) {
        const a = k / sub;
        drawRun(g2, run, a, { cell: c, time: k * 40, smell: level.senses.includes("smell") ? level.smellRange : undefined });
        g2.fillStyle = PAL.bench;
        g2.fillRect(0, Hb, W, strip);
        g2.font = "600 13px sans-serif";
        g2.textBaseline = "middle";
        g2.fillStyle = PAL.sugar;
        g2.textAlign = "left";
        g2.fillText(label, 8, Hb + strip / 2);
        g2.fillStyle = PAL.chalk;
        g2.textAlign = "right";
        g2.fillText(score, W - 8, Hb + strip / 2);
        gw.frame(g2.getImageData(0, 0, W, Hh).data, k === total * sub ? 150 : 4);
      }
      const blob = new Blob([gw.finish() as Uint8Array<ArrayBuffer>], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tapefly-${level.id}-${test + 1}.gif`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setToast(t("GIF 已导出", "GIF saved"));
    } catch {
      setToast(t("导出失败", "Export failed"));
    }
    setGifBusy(false);
  };

  const copyBrain = async () => {
    try { await navigator.clipboard.writeText(encodeBrain(program)); setToast(t("大脑代码已复制", "Brain code copied")); }
    catch { setToast(t("复制不了，浏览器拒绝了", "The browser refused to copy")); }
  };
  const pasteBrain = () => {
    const s = window.prompt?.(t("粘贴大脑代码", "Paste a brain code"));
    if (!s) return;
    try { edit(decodeBrain(s.trim())); setToast(t("已载入", "Loaded")); } catch { setToast(t("这段代码读不懂", "That code does not parse")); }
  };
  useEffect(() => { if (!toast) return; const h = setTimeout(() => setToast(null), 1800); return () => clearTimeout(h); }, [toast]);

  const best = progress.best[level.id];
  const hist = H[level.id];

  return (
    <div className="evo-level">
      <header className="evo-bar">
        <button type="button" className="evo-back" onClick={onExit}>← {t("地图", "Map")}</button>
        <div className="evo-title">
          <span className="ch">{t(`第 1 章 · 觅食 · ${index + 1}/${LEVELS.length}`, `Chapter 1 · Forage · ${index + 1}/${LEVELS.length}`)}</span>
          <h1>{t(level.title.zh, level.title.en)}</h1>
        </div>
        <div className="evo-scores" aria-label={t("当前大脑的分数", "This brain's scores")}>
          <span title={t("门数：大脑编译成多少个 NAND 门", "Gates: how many NAND gates the brain compiles to")}><small>{t("门数", "gates")}</small><b>{g.gates}</b></span>
          <span title={t("深度：从感官到动作最长要经过几级门", "Depth: the longest chain of gates from a sense to an action")}><small>{t("深度", "depth")}</small><b>{g.depth}</b></span>
          <span title={t("步数：所有测试地块加起来用了多少步", "Steps: ticks summed over every test board")}><small>{t("步数", "steps")}</small><b>{g.cleared ? g.steps : "—"}</b></span>
        </div>
      </header>

      <div className="evo-main">
        <section className="evo-stage">
          <div className="evo-tests" role="tablist" aria-label={t("测试地块", "Test boards")}>
            {g.runs.map((r, k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === test}
                className={`${k === test ? "on" : ""} ${r.outcome === "cleared" ? "pass" : "fail"}`}
                onClick={() => { sfx.click(); setTest(k); setAt(0); setPlaying(false); }}
              >
                <i aria-hidden>{r.outcome === "cleared" ? "✓" : "✗"}</i>
                {t(`地块 ${k + 1}`, `Board ${k + 1}`)}
              </button>
            ))}
            <span className="evo-tests-sum">{t(`通过 ${g.passed}/${g.runs.length}`, `${g.passed}/${g.runs.length} pass`)}</span>
          </div>

          <div className="evo-board" ref={wrapRef}>
            <canvas ref={canvasRef} />
            {ended && at > 0 && (
              <div className={`evo-verdict ${outcome.tone}`} role="status">
                <b>{outcome.head}</b>
                <span>{outcome.body}</span>
              </div>
            )}
          </div>

          <div className="evo-transport">
            <button type="button" onClick={() => { setPlaying(false); setAt(0); }} aria-label={t("回到开始", "Rewind")} title="R">⏮</button>
            <button type="button" onClick={() => { setPlaying(false); setAt((a) => Math.max(0, Math.ceil(a) - 1)); }} aria-label={t("上一步", "Step back")} title="←">◀︎</button>
            <button type="button" className={`evo-play ${coach && program.otherwise.act === 1 && !played ? "pulse" : ""}`} onClick={play} aria-label={playing ? t("暂停", "Pause") : t("运行", "Run")} title={t("空格", "Space")}>
              {playing ? "❚❚" : "▶"} <span>{playing ? t("暂停", "Pause") : ended && at > 0 ? t("重播", "Replay") : t("运行", "Run")}</span>
            </button>
            <button type="button" onClick={() => { setPlaying(false); setAt((a) => Math.min(lastFrame, Math.floor(a) + 1)); }} aria-label={t("下一步", "Step")} title="→">▶︎</button>
            <div className="evo-speed" role="radiogroup" aria-label={t("速度", "Speed")}>
              {SPEEDS.map((s, k) => (
                <button key={s} type="button" role="radio" aria-checked={k === speed} className={k === speed ? "on" : ""} onClick={() => setSpeed(k)}>{s / 2}×</button>
              ))}
            </div>
            <span className="evo-tick">{t("第", "tick")} <b>{i}</b> / {lastFrame}</span>
          </div>
          <input
            className="evo-scrub"
            type="range"
            min={0}
            max={lastFrame}
            step={1}
            value={i}
            onChange={(e) => { setPlaying(false); setAt(Number(e.target.value)); }}
            aria-label={t("时间轴", "Timeline")}
            style={{ ["--p" as string]: `${lastFrame ? (i / lastFrame) * 100 : 0}%`, ["--loop" as string]: run.outcome === "loop" ? `${(run.loopFrom / Math.max(1, lastFrame)) * 100}%` : "100%" }}
          />

          <div className="evo-senses" aria-live="off">
            {level.senses.length === 0 && <span className="none">{t("没有感官：它什么也感觉不到。", "No senses: it feels nothing at all.")}</span>}
            {FIELDS.filter((f) => level.senses.includes(f.id)).map((f) => {
              const v = nextWord === null ? null : fieldValue(nextWord, f);
              const S = SENSE[f.id];
              return (
                <span key={f.id} className={`evo-sense ${v !== null && v > 0 ? "lit" : ""}`}>
                  <i aria-hidden>{S.icon}</i>
                  <small>{t(S.zh, S.en)}</small>
                  <b>{v === null ? "—" : t(S.values[v].zh, S.values[v].en)}</b>
                </span>
              );
            })}
            {nextWord !== null && i < lastFrame && (
              <span className="evo-sense act">
                <i aria-hidden>{ACT[run.frames[i + 1].out & 3].glyph}</i>
                <small>{t("决定", "decides")}</small>
                <b>{t(ACT[run.frames[i + 1].out & 3].zh, ACT[run.frames[i + 1].out & 3].en)}</b>
              </span>
            )}
          </div>
        </section>

        <section className="evo-side">
          <div className={`evo-brief ${briefOpen ? "" : "closed"}`}>
            <div className="evo-brief-head">
              <span>{t("任务", "Brief")}</span>
              <button type="button" className="evo-brief-toggle" onClick={() => setBriefOpen((o) => !o)} aria-expanded={briefOpen}>
                {briefOpen ? t("收起", "Hide") : t("展开", "Show")}
              </button>
            </div>
            {briefOpen && (
              <>
                <p>{t(level.brief.zh, level.brief.en)}</p>
                {level.grows && (
                  <div className="evo-grows">
                    <span className="tag">{t("新器官", "New organ")}</span>
                    <b>{t(level.grows.name.zh, level.grows.name.en)}</b>
                    <span>{t(level.grows.text.zh, level.grows.text.en)}</span>
                  </div>
                )}
                <div className="evo-hints">
                  {level.hints.slice(0, hints).map((h, k) => <p key={k}><i>{t(`提示 ${k + 1}`, `Hint ${k + 1}`)}</i>{t(h.zh, h.en)}</p>)}
                  {hints < level.hints.length && (
                    <button type="button" className="evo-link" onClick={() => setHints((h) => h + 1)}>
                      {t(`给个提示（${hints + 1}/${level.hints.length}）`, `Show a hint (${hints + 1}/${level.hints.length})`)}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="evo-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "rules"} className={tab === "rules" ? "on" : ""} onClick={() => setTab("rules")}>{t("规则", "Rules")}</button>
            <button type="button" role="tab" aria-selected={tab === "circuit"} className={tab === "circuit" ? "on" : ""} onClick={() => setTab("circuit")}>
              {t("电路", "Circuit")} <small>{g.gates}</small>
            </button>
            <span className="grow" />
            <button type="button" className="evo-mini" onClick={copyBrain}>{t("复制大脑", "Copy brain")}</button>
            <button type="button" className="evo-mini" onClick={pasteBrain}>{t("粘贴", "Paste")}</button>
            <button type="button" className="evo-mini" onClick={() => edit(level.start)}>{t("重置", "Reset")}</button>
          </div>
          {coach && (
            <ol className="evo-coach" aria-label={t("怎么玩", "How to play")}>
              <li className={program.otherwise.act === 1 ? "done" : "now"}>{t("在“否则”那一行，把 ‖ 等待 换成 ↑ 前进。", "On the ‘otherwise’ row, change ‖ wait to ↑ forward.")}</li>
              <li className={played && program.otherwise.act === 1 ? "done" : program.otherwise.act === 1 ? "now" : ""}>{t("按左边的 ▶ 运行，看它走过去。", "Press ▶ Run on the left and watch it walk.")}</li>
              <li className={g.cleared && played ? "done" : ""}>{t("两块地都吃完，这一关就过了。", "Clear both boards and the level is done.")}</li>
            </ol>
          )}
          {tab === "rules" ? (
            <BrainEditor level={level} program={program} onChange={edit} firing={firing} t={t} pulseOtherwise={coach && program.otherwise.act !== 1} />
          ) : (
            <CircuitView netlist={g.netlist} word={nextWord} t={t} />
          )}

          <div className={`evo-submit ${g.cleared ? "ready" : ""}`}>
            {g.cleared ? (
              <>
                <span>{t("所有地块都通过了。", "Every board passes.")}</span>
                <button type="button" className="evo-cta" onClick={() => { sfx.clear(); setResults(true); }}>{t("看成绩", "See scores")}</button>
              </>
            ) : (
              <span>{t(`还差 ${g.runs.length - g.passed} 块地没通过。点上面的地块看看哪里出了问题。`, `${g.runs.length - g.passed} board(s) still fail. Pick one above and watch what goes wrong.`)}</span>
            )}
          </div>
        </section>
      </div>

      {results && g.cleared && (
        <div className="evo-modal" role="dialog" aria-modal="true" aria-labelledby="evo-res-h" onClick={(e) => { if (e.target === e.currentTarget) setResults(false); }}>
          <div className="evo-modal-card">
            <p className="ch">{t(`第 ${index + 1} 关`, `Level ${index + 1}`)}</p>
            <h2 id="evo-res-h">{t(`${level.title.zh}，通关`, `${level.title.en}: cleared`)}</h2>
            <p className="lesson">{t(level.lesson.zh, level.lesson.en)}</p>
            <div className="evo-histos">
              <Histo label={t("门数", "Gates")} unit={t("个门", "gates")} values={hist?.gates ?? []} yours={g.gates} best={best?.gates} t={t} />
              <Histo label={t("步数", "Steps")} unit={t("步", "ticks")} values={hist?.steps ?? []} yours={g.steps} best={best?.steps} t={t} />
              <Histo label={t("深度", "Depth")} unit={t("级", "levels")} values={hist?.depth ?? []} yours={g.depth} best={best?.depth} t={t} />
            </div>
            <p className="evo-fine">
              {t(
                `对比的是 ${hist?.n ?? 0} 个由搜索程序找到的通关大脑；玩家成绩上线后换成真实玩家。三个分数通常不能同时最好：门少的大脑往往走得慢。`,
                `Compared with ${hist?.n ?? 0} clearing brains found by a search program; real players' scores replace them once they exist. The three scores rarely peak together: fewer gates often means slower flies.`
              )}
            </p>
            <div className="evo-modal-actions">
              <button type="button" className="evo-btn" onClick={() => setResults(false)}>{t("继续优化", "Keep optimising")}</button>
              <button type="button" className="evo-btn" onClick={exportGif} disabled={gifBusy}>{gifBusy ? t("正在生成…", "Rendering…") : t("导出这一局 GIF", "Export this run as GIF")}</button>
              {onNext ? (
                <button type="button" className="evo-cta" onClick={() => { setResults(false); onNext(); }}>{t("下一关 →", "Next level →")}</button>
              ) : (
                <button type="button" className="evo-cta" onClick={onExit}>{t("回到地图", "Back to the map")}</button>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && <div className="evo-toast" role="status">{toast}</div>}
    </div>
  );
}
