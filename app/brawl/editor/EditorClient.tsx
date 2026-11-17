"use client";

/* ── The Brain Brawl editor ───────────────────────────────────────────────────
   Shop chips are ready-made rules. Here every rule is yours: tick the levels of
   each sense it should fire on, pick a move and whether to bite. The brain is
   compiled to NAND on every change, checked against the rules on all 4,096
   inputs, and can fight any rival on the day's ladder (practice seeds), run the
   whole ladder (the day's real seeds, as the API does), or go out as a challenge
   link. Nothing here touches a run: it is a workbench. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FightView from "../FightView";
import { useLang } from "../../i18n/client";
import { FIELDS, MOVE_WORDS, ruleText, actionText, linesOfProgram, otherwiseText } from "../describe";
import { TACTICS, TACTIC_IDS, PARTS, PART_IDS, BODY_SLOTS, RIVALS, budgetFor, fightBrain, practiceSeedFor, ladder, rivalGates, type Fight, type Run } from "@/sim/arena";
import { toProgram, fromProgram, bodyOf, compileFighter, PRESS, type DuelRule, type DuelField, type GearId, type Move } from "@/sim/duel";
import { compileProgram } from "@/sim/compile";
import { evalWord } from "@/sim/netlist";
import { runProgram, encodeProgram, decodeProgram, MAX_RULES } from "@/sim/program";
import { defaultFlyName } from "@/sim/identity";

const KEY = "tapefly.arena.editor";
const RUN_KEY = "tapefly.arena.run";
const MUTE_KEY = "tapefly.arena.mute";

interface Draft { rules: DuelRule[]; otherwise: { then: Move; bite?: boolean }; gear: GearId[] }
const STARTER: Draft = { rules: [TACTICS.block.rule, TACTICS.punish.rule, TACTICS.bite.rule].map(clone), otherwise: { then: PRESS }, gear: [] };

function clone(r: DuelRule): DuelRule { return { when: Object.fromEntries(Object.entries(r.when).map(([k, v]) => [k, [v![0], v![1]]])), then: r.then, ...(r.prev ? { prev: r.prev.slice() } : {}), ...(r.bite ? { bite: true } : {}) }; }
function load<T>(k: string): T | null { try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : null; } catch { return null; } }

/** Click a level: outside the range extends it, an end shrinks it, the middle narrows to that level; empty = any. */
function toggleLevel(r: [number, number] | undefined, v: number): [number, number] | undefined {
  if (!r) return [v, v];
  const [lo, hi] = r;
  if (v < lo) return [v, hi];
  if (v > hi) return [lo, v];
  if (lo === hi) return undefined;
  if (v === lo) return [lo + 1, hi];
  if (v === hi) return [lo, hi - 1];
  return [v, v];
}

export default function EditorClient({ today }: { today: string }) {
  const { t, lang } = useLang();
  const zh = lang === "zh";
  const [d, setD] = useState<Draft>(STARTER);
  const [open, setOpen] = useState(0);
  const [rival, setRival] = useState(0);
  const [tries, setTries] = useState(0);
  const [watch, setWatch] = useState<Fight | null>(null);
  const [board, setBoard] = useState<ReturnType<typeof ladder> | null>(null);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);

  // where to start: a shared program (?p=), the current run (?from=run), the last draft, or the starter
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const gear = (q.get("g") ?? "").split(",").filter((g): g is GearId => (PART_IDS as string[]).includes(g)).slice(0, BODY_SLOTS);
      const pc = q.get("p");
      if (pc) { const f = fromProgram(decodeProgram(pc)); setD({ rules: f.rules, otherwise: f.otherwise, gear }); }
      else if (q.get("from") === "run") { const run = load<Run>(RUN_KEY); if (run && run.chips.length) setD({ rules: run.chips.map((c) => clone(TACTICS[c].rule)), otherwise: { then: PRESS }, gear: run.gear.slice() }); else { const saved = load<Draft>(KEY); if (saved) setD(saved); } }
      else { const saved = load<Draft>(KEY); if (saved && Array.isArray(saved.rules)) setD(saved); }
      setMuted(load<boolean>(MUTE_KEY) ?? false);
    } catch { /* keep the starter */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } }, [d, ready]);

  const program = useMemo(() => toProgram(d.rules, d.otherwise), [d.rules, d.otherwise]);
  const code = useMemo(() => encodeProgram(program), [program]);
  const stats = useMemo(() => {
    const c = compileFighter(program), net = compileProgram(program);
    let bad = -1;
    for (let w = 0; w < 4096 && bad < 0; w++) if (evalWord(net, w) !== runProgram(program, w).out) bad = w;
    return { ...c, bad };
  }, [program]);
  const name = useMemo(() => defaultFlyName(code), [code]);
  const budget = budgetFor(rival);
  const over = stats.gates > budget;
  const body = bodyOf(d.gear);

  const flash = (s: string) => { setToast(s); setTimeout(() => setToast(""), 2000); };
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); flash(t(`${what}已复制`, `${what} copied`)); } catch { flash(t("复制失败，请手动选中复制", "Copy failed; select the text instead")); } };
  const setRule = (i: number, r: DuelRule) => { setBoard(null); setD((x) => ({ ...x, rules: x.rules.map((y, j) => (j === i ? r : y)) })); };
  const setRules = (rules: DuelRule[]) => { setBoard(null); setD((x) => ({ ...x, rules })); };
  const add = (r: DuelRule) => { if (d.rules.length >= MAX_RULES) return; setRules([...d.rules, clone(r)]); setOpen(d.rules.length); };
  const moveRule = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= d.rules.length) return; const r = d.rules.slice(); [r[i], r[j]] = [r[j], r[i]]; setRules(r); setOpen(j); };
  const toggleGear = (g: GearId) => { setBoard(null); setD((x) => ({ ...x, gear: x.gear.includes(g) ? x.gear.filter((y) => y !== g) : x.gear.length < BODY_SLOTS ? [...x.gear, g] : x.gear })); };
  const toggleMute = () => setMuted((m) => { try { localStorage.setItem(MUTE_KEY, JSON.stringify(!m)); } catch { /* ignore */ } return !m; });
  const start = (v: string) => {
    if (v === "blank") { setD({ rules: [], otherwise: { then: PRESS }, gear: [] }); setOpen(0); }
    else if (v === "starter") setD({ ...STARTER, rules: STARTER.rules.map(clone) });
    else if (v === "run") { const run = load<Run>(RUN_KEY); if (run && run.chips.length) setD({ rules: run.chips.map((c) => clone(TACTICS[c].rule)), otherwise: { then: PRESS }, gear: run.gear.slice() }); else flash(t("这台设备上还没有进行中的一局", "No run on this device yet")); }
    else if (v.startsWith("rival:")) { const r = RIVALS[Number(v.slice(6))]; setD({ rules: r.chips.map((c) => clone(TACTICS[c].rule)), otherwise: { then: PRESS }, gear: r.gear.slice() }); }
    setBoard(null);
  };
  const tryFight = () => { setWatch(fightBrain(program, null, d.gear, RIVALS[rival], practiceSeedFor(today, rival, 100 + tries), rival)); setTries((n) => n + 1); };
  const runLadder = () => setBoard(ladder(today, program, null, d.gear));
  const challenge = () => {
    const q = new URLSearchParams({ p: code, n: name });
    if (d.gear.length) q.set("g", d.gear.join(","));
    return `${window.location.origin}/brawl?${q.toString()}`;
  };
  const api = () => `${window.location.origin}/api/v1/brawl?date=${today}&program=${encodeURIComponent(code)}${d.gear.length ? `&gear=${d.gear.join(",")}` : ""}`;

  if (watch) {
    return <FightView f={watch} practice mine={linesOfProgram(program)} mineOtherwise={otherwiseText(program)} myGear={d.gear} flyName={name} muted={muted} toggleMute={toggleMute}
      onBack={() => setWatch(null)} backLabel={t("回编辑器", "Back to the editor")} />;
  }

  return (
    <div className="page brawl arena editor">
      <header className="brawl-head">
        <p className="kicker"><Link className="link" href="/brawl">{t("大脑大乱斗", "Brain Brawl")}</Link> · {t("大脑编辑器", "Brain editor")}</p>
        <h1>{t("自己写战术规则。", "Write your own tactics.")}</h1>
        <p className="lede">{t(<>商店里的芯片只是现成的规则。在这里，每一条都由你决定：<b>在什么情况下，做什么</b>。从上往下第一条满足的说了算；整颗大脑每改一下就重新编译成 NAND 电路。</>,
          <>Shop chips are ready-made rules. Here each one is yours: <b>when this, do that</b>. The first rule that fits decides, and the whole brain recompiles to NAND on every change.</>)}</p>
      </header>

      <div className="ed-tools">
        <label>{t("从这里开始", "Start from")}
          <select onChange={(e) => { start(e.target.value); e.target.value = ""; }} defaultValue="">
            <option value="" disabled>{t("选择…", "Choose…")}</option>
            <option value="starter">{t("示例：格挡 + 抓破绽 + 先咬", "Example: Block + Punish + Bite")}</option>
            <option value="run">{t("我这一局的大脑", "My current run's brain")}</option>
            <option value="blank">{t("空白", "Blank")}</option>
            {RIVALS.map((r, i) => <option key={r.name} value={`rival:${i}`}>{t(`抄对手 ${r.name} 的大脑`, `Copy ${r.name}'s brain`)}</option>)}
          </select>
        </label>
        <label>{t("加一张芯片的规则", "Add a chip's rule")}
          <select onChange={(e) => { const c = e.target.value; if (c) add(TACTICS[c as keyof typeof TACTICS].rule); e.target.value = ""; }} defaultValue="">
            <option value="" disabled>{t("选择…", "Choose…")}</option>
            {TACTIC_IDS.map((c) => <option key={c} value={c}>{zh ? `${TACTICS[c].zh}：${TACTICS[c].dzh}` : `${TACTICS[c].en}: ${TACTICS[c].den}`}</option>)}
          </select>
        </label>
        <button className="btn primary" onClick={() => add({ when: {}, then: PRESS })} disabled={d.rules.length >= MAX_RULES}>{t("+ 新规则", "+ New rule")}</button>
      </div>

      <div className="ed-grid">
        <div className="ed-rules">
          {d.rules.length === 0 && <p className="brawl-empty">{t("还没有规则：你的果蝇会一直执行下面的“都不满足”。点「+ 新规则」开始。", "No rules yet: your fly always does the “none fits” action below. Press “+ New rule”.")}</p>}
          <ol className="ed-list">
            {d.rules.map((r, i) => {
              const text = ruleText(r);
              const isOpen = open === i;
              return (
                <li key={i} className={`ed-rule ${isOpen ? "open" : ""} ${r.bite ? "tag-attack" : r.then === 3 ? "tag-defend" : "tag-move"}`}>
                  <div className="ed-rule-head">
                    <button className="ed-sum" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}>
                      <span className="pri">{i + 1}</span><span className="txt">{t(text.zh, text.en)}</span>
                    </button>
                    <div className="ctl">
                      <button className="btn small" onClick={() => moveRule(i, -1)} disabled={i === 0} aria-label={t("上移", "Move up")}>↑</button>
                      <button className="btn small" onClick={() => moveRule(i, 1)} disabled={i === d.rules.length - 1} aria-label={t("下移", "Move down")}>↓</button>
                      <button className="btn small" onClick={() => { if (d.rules.length < MAX_RULES) { const x = d.rules.slice(); x.splice(i + 1, 0, clone(r)); setRules(x); setOpen(i + 1); } }} aria-label={t("复制", "Duplicate")}>⧉</button>
                      <button className="btn small danger" onClick={() => { setRules(d.rules.filter((_, j) => j !== i)); setOpen(-1); }} aria-label={t("删除", "Delete")}>✕</button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="ed-body">
                      <p className="ed-hint">{t("当（不选 = 任意）", "When (none ticked = any)")}</p>
                      {FIELDS.map((f) => {
                        const v = r.when[f.id];
                        return (
                          <div key={f.id} className="ed-field">
                            <span className="lab">{t(f.zh, f.en)}</span>
                            <div className="pills">
                              {f.levels.map((l, k) => (
                                <button key={k} className={`pill ${v && k >= v[0] && k <= v[1] ? "on" : ""}`} aria-pressed={!!(v && k >= v[0] && k <= v[1])}
                                  onClick={() => { const nv = toggleLevel(v, k); const when = { ...r.when }; if (nv) when[f.id as DuelField] = nv; else delete when[f.id as DuelField]; setRule(i, { ...r, when }); }}>{t(l.zh, l.en)}</button>
                              ))}
                              <span className="any">{v ? "" : t("任意", "any")}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="ed-field">
                        <span className="lab">{t("我上一步", "My last move")}</span>
                        <div className="pills">
                          {MOVE_WORDS.map((m, k) => {
                            const on = !!r.prev?.includes(k as Move);
                            return <button key={k} className={`pill ${on ? "on" : ""}`} aria-pressed={on} onClick={() => { const set = new Set(r.prev ?? []); if (on) set.delete(k as Move); else set.add(k as Move); const prev = [...set].sort() as Move[]; const nr = { ...r }; if (prev.length && prev.length < 4) nr.prev = prev; else delete nr.prev; setRule(i, nr); }}>{t(m.zh, m.en)}</button>;
                          })}
                          <span className="any">{r.prev?.length ? "" : t("任意", "any")}</span>
                        </div>
                      </div>
                      <p className="ed-hint">{t("就", "Then")}</p>
                      <div className="ed-field">
                        <span className="lab">{t("动作", "Move")}</span>
                        <div className="pills">
                          {MOVE_WORDS.map((m, k) => <button key={k} className={`pill act ${r.then === k ? "on" : ""}`} aria-pressed={r.then === k} onClick={() => setRule(i, { ...r, then: k as Move })}>{t(m.zh, m.en)}</button>)}
                          <button className={`pill bite ${r.bite ? "on" : ""}`} aria-pressed={!!r.bite} onClick={() => { const nr = { ...r }; if (r.bite) delete nr.bite; else nr.bite = true; setRule(i, nr); }}>{t("并且咬", "and bite")}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            <li className="ed-rule otherwise">
              <div className="ed-rule-head"><span className="ed-sum static"><span className="pri">·</span><span className="txt">{t("都不满足时", "When none fits")}</span></span></div>
              <div className="ed-body">
                <div className="ed-field">
                  <span className="lab">{t("动作", "Move")}</span>
                  <div className="pills">
                    {MOVE_WORDS.map((m, k) => <button key={k} className={`pill act ${d.otherwise.then === k ? "on" : ""}`} onClick={() => setD((x) => ({ ...x, otherwise: { ...x.otherwise, then: k as Move } }))}>{t(m.zh, m.en)}</button>)}
                    <button className={`pill bite ${d.otherwise.bite ? "on" : ""}`} onClick={() => setD((x) => ({ ...x, otherwise: x.otherwise.bite ? { then: x.otherwise.then } : { then: x.otherwise.then, bite: true } }))}>{t("并且咬", "and bite")}</button>
                  </div>
                </div>
                <p className="ed-hint">{t(`现在：${actionText(d.otherwise.then, d.otherwise.bite, "zh")}`, `Now: ${actionText(d.otherwise.then, d.otherwise.bite, "en")}`)}</p>
              </div>
            </li>
          </ol>
          <p className="dim">{t(`最多 ${MAX_RULES} 条规则。感觉的意思：距离分 4 档；“对手在”看的是 5–9 帧以前的它；血量和体力按区间分 4 档。`, `Up to ${MAX_RULES} rules. Distance has four bands; “Rival is” sees it as it was 5–9 ticks ago; health and energy are in four bands.`)} <Link className="link" href="/docs#fight">{t("规则细节", "Rule details")}</Link></p>
        </div>

        <aside className="ed-side">
          <section className="panel ed-circuit">
            <h2>{t("编译出来的电路", "The compiled circuit")}</h2>
            <p className="big"><b>{stats.gates}</b> {t("个 NAND 门", "NAND gates")}</p>
            <p className="ed-stat">{t(`深度 ${stats.depth} · TapeOut 成本 A×d³ = ${stats.cost.toLocaleString()}`, `depth ${stats.depth} · TapeOut cost A×d³ = ${stats.cost.toLocaleString()}`)}</p>
            <p className={stats.bad < 0 ? "ok" : "warn"}>{stats.bad < 0 ? t("✓ 电路和规则在全部 4,096 种输入上一致", "✓ Circuit matches the rules on all 4,096 inputs") : t(`✗ 第 ${stats.bad} 种输入不一致`, `✗ Mismatch on input ${stats.bad}`)}</p>
            <p className="ed-stat">{t(`你的果蝇叫 ${name}（名字由大脑算出来）`, `Your fly is ${name} (named from its brain)`)}</p>
          </section>

          <section className="panel">
            <h2>{t("身体", "Body")} <span className="brawl-note inline">{t(`${d.gear.length}/${BODY_SLOTS} · 编辑器里免费`, `${d.gear.length}/${BODY_SLOTS} · free here`)}</span></h2>
            <div className="ed-parts">
              {PART_IDS.map((g) => <button key={g} className={`pill ${d.gear.includes(g) ? "on" : ""}`} aria-pressed={d.gear.includes(g)} onClick={() => toggleGear(g)} title={t(PARTS[g].dzh, PARTS[g].den)}>{t(PARTS[g].zh, PARTS[g].en)}</button>)}
            </div>
            <p className="ed-stat">{t(`生命 ${body.maxHp} · 每口 ${body.dmg} · 速度 ${body.speed.toFixed(1)} · 回气 ${body.regen.toFixed(2)}`, `HP ${body.maxHp} · bite ${body.dmg} · speed ${body.speed.toFixed(1)} · regen ${body.regen.toFixed(2)}`)}</p>
          </section>

          <section className="panel">
            <h2>{t("试一试", "Try it")}</h2>
            <label className="ed-pick">{t("对手", "Rival")}
              <select value={rival} onChange={(e) => setRival(Number(e.target.value))}>
                {RIVALS.map((r, i) => <option key={r.name} value={i}>{t(`第 ${i + 1} 场 · ${r.name}（${rivalGates(r)} 门，预算 ${budgetFor(i)}）`, `Fight ${i + 1} · ${r.name} (${rivalGates(r)} gates, budget ${budgetFor(i)})`)}</option>)}
              </select>
            </label>
            {over && <p className="warn">{t(`比这场的预算多 ${stats.gates - budget} 个门：正式比赛不让上，这里照样能试。`, `${stats.gates - budget} gates over this fight's budget: not allowed in a run, but you can still try it here.`)}</p>}
            <div className="row">
              <button className="btn primary" onClick={tryFight}>{t("试打（看回放）", "Practice (watch it)")}</button>
              <button className="btn" onClick={runLadder}>{t("整条阶梯打一遍", "Run the whole ladder")}</button>
            </div>
            {board && (
              <div className="ed-board">
                <p><b>{t(`${board.wins} / ${board.steps.length} 胜`, `${board.wins} / ${board.steps.length} wins`)}</b> {t("（今天的正式种子，和接口一样）", "(today's real seeds, same as the API)")}</p>
                <ol>
                  {board.steps.map((s) => <li key={s.fight} className={s.result === "win" ? "w" : s.result === "loss" ? "l" : s.result === "draw" ? "d" : "o"}><span>{s.fight + 1}. {s.rival}</span><b>{s.result === "win" ? t("胜", "W") : s.result === "loss" ? t("负", "L") : s.result === "draw" ? t("平", "D") : t("超预算", "over")}</b></li>)}
                </ol>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>{t("分享", "Share")}</h2>
            <p className="ed-stat">{t("挑战链接里带着这颗大脑和身体，朋友打开就能用自己的大脑跟它打。", "A challenge link carries this brain and body; a friend opens it and fights it with their own.")}</p>
            <div className="row">
              <button className="btn" onClick={() => copy(challenge(), t("挑战链接", "Challenge link"))}>{t("复制挑战链接", "Copy challenge link")}</button>
              <button className="btn" onClick={() => copy(api(), t("接口地址", "API URL"))}>{t("复制给 AI 的接口地址", "Copy the API URL for an agent")}</button>
            </div>
            <p className="ed-code"><code>{code}</code></p>
          </section>
        </aside>
      </div>
      <div className={`toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </div>
  );
}
