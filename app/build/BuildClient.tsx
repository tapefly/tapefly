"use client";
import { useLang } from "../i18n/client";

/* ── the builder ─────────────────────────────────────────────────────────────
   Rules on the left, consequences on the right. Every edit recompiles the
   program to NAND gates (sim/compile.ts), re-runs the exam against the
   reference fly, and drops the new fly into a real dish. The program lives in
   the URL, so a brain is a link. */

import { useCallback, useEffect, useMemo, useState } from "react";
import RuleEditor from "../components/ui/RuleEditor";
import Arena from "../components/ui/Arena";
import Circuit from "../components/ui/Circuit";
import { OFFICIAL_PROGRAM, decodeProgram, encodeProgram, runProgram, type Program } from "@/sim/program";
import { brainFromProgram, examine, importNetlist, brainFromNetlist, type Duel } from "@/sim/challenge";
import { netDepth, cost } from "@/sim/compile";
import { netlistBytes } from "@/sim/tapeout";
import { BRAIN } from "@/sim/netlist";
import { addDays } from "@/sim/lineage";
import type { Brain, Tick } from "@/sim/engine";
import { REPO_URL } from "../site";
import Link from "next/link";
import { readChallenge, challengeQuery, cleanName, type Challenge } from "@/sim/versus";
import { defaultFlyName } from "@/sim/identity";

const PRESETS: [string, Program][] = [
  ["The official rules", OFFICIAL_PROGRAM],
  ["Greedy", { rules: [], otherwise: { then: 0 } }],
  ["Careful eater", { rules: [{ when: { threat: [2, 3] }, then: 1, gf: true }, { when: { food: [1, 3] }, then: 0 }], otherwise: { then: 2 } }],
  ["Blank", { rules: [], otherwise: { then: 2 } }]
];

const OFFICIAL_CARD = { gates: BRAIN.gates.length, depth: netDepth(BRAIN), cost: cost(BRAIN), agree: examine(BRAIN).agree };

function read(): { p: Program; name: string; vs: string } {
  let p = OFFICIAL_PROGRAM;
  let name = "";
  let vs = "";
  try {
    const q = new URLSearchParams(window.location.search);
    vs = q.get("vs") ?? "";
    if (q.get("p")) p = decodeProgram(q.get("p")!);
    else {
      const s = localStorage.getItem("tapefly.build");
      if (s) p = decodeProgram(s);
    }
    name = localStorage.getItem("tapefly.name") ?? "";
  } catch {}
  return { p, name, vs };
}

const PRESET_ZH: Record<string, string> = { "The official rules": "官方规则", "Greedy": "贪吃鬼", "Careful eater": "谨慎的吃货", "Blank": "空白" };

export default function BuildClient({ today }: { today: string }) {
  const { t } = useLang();
  const [program, setProgram] = useState<Program>(OFFICIAL_PROGRAM);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"today" | "week">("today");
  const [youTick, setYouTick] = useState<Tick | null>(null);
  const [toast, setToast] = useState("");
  const [sheet, setSheet] = useState<"" | "submit" | "import">("");
  const [imported, setImported] = useState<Brain | null>(null);
  const [importText, setImportText] = useState("");
  const [importErr, setImportErr] = useState("");
  const [result, setResult] = useState<Duel[]>([]);
  const [vs, setVs] = useState("");
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => { try { setAdvanced(localStorage.getItem("tapefly.advanced") === "1"); } catch {} }, []);
  const toggleAdvanced = () => setAdvanced((a) => { try { localStorage.setItem("tapefly.advanced", a ? "0" : "1"); } catch {} return !a; });

  useEffect(() => { const r = read(); setProgram(r.p); setName(r.name); setVs(r.vs); setReady(true); }, []);

  // arriving from someone's challenge: the builder becomes "build your answer"
  const challenge = useMemo<Challenge | null>(() => {
    if (!vs) return null;
    try { return readChallenge(new URLSearchParams(vs), addDays(today, -1)); } catch { return null; }
  }, [vs, today]);

  const code = useMemo(() => encodeProgram(program), [program]);
  useEffect(() => {
    if (!ready) return;
    try {
      window.history.replaceState(null, "", `?p=${code}${vs ? `&vs=${encodeURIComponent(vs)}` : ""}`);
      localStorage.setItem("tapefly.build", code);
    } catch {}
  }, [code, ready, vs]);

  const brain = useMemo(() => imported ?? brainFromProgram(program), [program, imported]);
  const card = useMemo(() => ({ gates: brain.netlist.gates.length, depth: netDepth(brain.netlist), cost: cost(brain.netlist), agree: examine(brain.netlist).agree }), [brain]);
  const dates = useMemo(() => (mode === "today" ? [today] : Array.from({ length: 7 }, (_, i) => addDays(today, i - 7))), [mode, today]);
  const firing = youTick && !imported ? runProgram(program, youTick.inWord).rule : null;

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); flash(t(`${what}已复制`, `${what} copied`)); } catch { flash(t("复制失败，请手动选中文字", "Copy failed — select the text instead")); }
  };
  const change = useCallback((p: Program) => { setImported(null); setProgram(p); }, []);

  const flyName = cleanName(name, defaultFlyName(code));
  const entry = JSON.stringify({ handle: "your-github-handle", name: flyName, note: "", program: code }, null, 1);
  const delta = (v: number, base: number, lowerBetter = true) => {
    if (v === base) return <em className="same">{t("和官方一样", "same as official")}</em>;
    const better = lowerBetter ? v < base : v > base;
    return <em className={better ? "up" : "down"}>{v > base ? "+" : ""}{(v - base).toLocaleString()} {t("对比官方", "vs official")}</em>;
  };

  return (
    <div className="build">
      <section className="build-left">
        <div className="build-head">
          <h1>{t("大脑编辑器", "Brain editor")}</h1>
          <p>{t(<>首页的四个开关就是四条现成的规则。在这里你可以自己写规则：<b>当</b>果蝇感觉到什么，<b>就</b>做什么，从上往下逐条检查。你加的每条规则都会变成 NAND 门，所以更聪明的大脑往往更小，流片也更便宜。</>,
                <>The four switches on the home page are four ready-made rules. Here you write the rules yourself: <b>when</b> the fly senses this, <b>do</b> that, checked top to bottom. Every rule you add becomes NAND gates, so a sharper brain is often a smaller one, and cheaper to tape out.</>)}</p>
          <p className="dim">{t("大多数玩家用首页开关就够了。这里是给想精确控制的人，和设计大脑的 AI 用的。", "Most players never need this page. It is for people who want exact control, and for AI agents that design brains.")}</p>
          <div className="row">
            <input className="name-field" placeholder={t(`给果蝇起个名（现在叫：${defaultFlyName(code)}）`, `Name your fly (now: ${defaultFlyName(code)})`)} maxLength={40} value={name}
              onChange={(e) => { setName(e.target.value); try { localStorage.setItem("tapefly.name", e.target.value); } catch {} }} />
            <select className="preset" aria-label={t("从模板开始", "Start from")} value="" onChange={(e) => { const p = PRESETS.find(([n]) => n === e.target.value); if (p) change(p[1]); }}>
              <option value="" disabled>{t("从模板开始…", "Start from…")}</option>
              {PRESETS.map(([n]) => <option key={n} value={n}>{t(PRESET_ZH[n] ?? n, n)}</option>)}
            </select>
          </div>
        </div>
        {challenge && (
          <div className="panel answer">
            <h3>{t(`应战 ${challenge.a.name}`, `Answering ${challenge.a.name}`)}</h3>
            <p>{t("在这里调好你的果蝇，然后放进培养皿和对方比：7 轮，抢同样的食物。", "Shape your fly here, then send it into the dish against theirs: seven rounds, shared food.")}</p>
            <div className="row">
              <Link className="btn primary small" href={`/vs?${challengeQuery({ a: challenge.a, b: { program, name: flyName }, through: challenge.through })}`}>{t(`和 ${challenge.a.name} 对战`, `Fight ${challenge.a.name}`)}</Link>
              <button className="btn small" onClick={() => setVs("")}>{t("以后再说", "Not now")}</button>
            </div>
          </div>
        )}
        {imported ? (
          <div className="panel imported">
            <h3>{t("导入的电路", "Imported circuit")}</h3>
            <p>{t(`你正在测试粘贴进来的电路，而不是规则。它有 ${imported.netlist.gates.length} 个门。`, `You are testing a netlist you pasted, not rules. It has ${imported.netlist.gates.length} gates.`)}</p>
            <button className="btn small" onClick={() => setImported(null)}>{t("回到我的规则", "Back to my rules")}</button>
          </div>
        ) : (
          <RuleEditor program={program} onChange={change} firing={firing} />
        )}
      </section>

      <section className="build-right">
        <div className={`specs ${advanced ? "" : "simple"}`}>
          <div><span>{t("大脑大小", "Brain size")}</span><b>{t(`${card.gates} 个门`, `${card.gates} gates`)}</b>{delta(card.gates, OFFICIAL_CARD.gates)}</div>
          {advanced && <>
            <div><span>{t("深度", "Depth")}</span><b>{card.depth}</b>{delta(card.depth, OFFICIAL_CARD.depth)}</div>
            <div><span>{t("TapeOut 成本", "TapeOut cost")}</span><b>{card.cost.toLocaleString()}</b>{delta(card.cost, OFFICIAL_CARD.cost)}</div>
            <div><span>{t("像真果蝇的程度", "Acts like a fly")}</span><b>{((card.agree / 4096) * 100).toFixed(1)}%</b>{delta(card.agree, OFFICIAL_CARD.agree, false)}</div>
          </>}
          <button className="btn small adv-toggle" onClick={toggleAdvanced} aria-expanded={advanced}>{advanced ? t("收起高级", "Hide advanced") : t("高级", "Advanced")}</button>
        </div>

        <div className="seg" role="tablist" aria-label={t("哪些培养皿", "Which dishes")}>
          <button role="tab" aria-selected={mode === "today"} className={mode === "today" ? "on" : ""} onClick={() => setMode("today")}>{t("今天的培养皿", "Today’s dish")}</button>
          <button role="tab" aria-selected={mode === "week"} className={mode === "week" ? "on" : ""} onClick={() => setMode("week")}>{t("冠军榜的 7 天", "The board’s seven days")}</button>
        </div>
        <Arena brain={brain} dates={dates} onTick={setYouTick} onResult={setResult} />

        {advanced && <div className="panel circuit-panel">
          <div className="row between">
            <h3>{t("你的电路正在做决定", "Your circuit, deciding")}</h3>
            <span className="dim">{t(`${card.gates} 个 NAND 门`, `${card.gates} NAND gates`)}</span>
          </div>
          <Circuit netlist={brain.netlist} word={youTick?.inWord ?? 0} compact />
        </div>}

        <div className="actions">
          <Link className="btn primary" href="/vs">{t("挑战朋友", "Challenge a friend")}</Link>
          <Link className="btn" href="/tapeout#tape-out">{t("流片上链", "Tape it out")}</Link>
          <button className="btn" onClick={() => setSheet(sheet === "submit" ? "" : "submit")}>{t("报名参赛", "Enter it on the board")}</button>
          <button className="btn" onClick={() => copy(`${window.location.origin}/build?p=${code}&n=${encodeURIComponent(flyName)}`, t("果蝇链接", "Link to your fly"))}>{t("分享我的果蝇", "Share my fly")}</button>
          {advanced && <>
            <button className="btn" onClick={() => copy(netlistBytes(brain.netlist), t("TapeOut 字节", "TapeOut bytes"))}>{t("复制 TapeOut 字节", "Copy TapeOut bytes")}</button>
            <button className="btn" onClick={() => setSheet(sheet === "import" ? "" : "import")}>{t("导入电路", "Import a netlist")}</button>
          </>}
        </div>

        {sheet === "submit" && (
          <div className="panel sheet">
            <h3>{t("报名参赛", "Enter it on the board")}</h3>
            <p>
              {t("冠军榜没有账号。一个参赛作品就是仓库里的一个小文件，通过 pull request 提交；检查程序会重算它的分数，所以谁都不用信任谁。",
                 "The board has no accounts. An entry is one small file in the repository, added by pull request; the check recomputes its score, so nobody has to trust anybody.")}
            </p>
            <ol className="steps">
              <li>{t("在上面给你的大脑起个名字。", "Name your brain above.")}</li>
              <li>{t(<>把下面的内容存成 <code>challengers/&lt;你的 GitHub 用户名&gt;/{flyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json</code>，并填上你的用户名。</>,
                     <>Save this as <code>challengers/&lt;your-github-handle&gt;/{flyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json</code>, with your handle filled in.</>)}</li>
              <li>{t(<>提交一个 pull request{REPO_URL ? <>到<a className="link" href={REPO_URL}>仓库</a></> : ""}。检查通过并合并后，你就上榜了。</>,
                     <>Open a pull request{REPO_URL ? <> on <a className="link" href={REPO_URL}>the repository</a></> : ""}. When the check passes and it is merged, you are on the board.</>)}</li>
            </ol>
            <pre className="cmd">{entry}</pre>
            <button className="btn small" onClick={() => copy(entry, t("参赛文件", "Entry"))}>{t("复制文件内容", "Copy the file")}</button>
          </div>
        )}
        {sheet === "import" && (
          <div className="panel sheet">
            <h3>{t("导入电路", "Import a netlist")}</h3>
            <p>{t("粘贴一个 JSON 电路（12 个输入、3 个输出），或者十六进制的 TapeOut 字节。在你切回去之前，它会替代你的规则。", "Paste a JSON netlist (12 inputs, 3 outputs) or TapeOut bytes in hex. It replaces your rules until you go back.")}</p>
            <textarea className="field" rows={5} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"nIn":12,"nOut":3,"gates":[[2,3],…]}  or  0x00000002000003…' />
            {importErr && <p className="bad-text">{importErr}</p>}
            <button className="btn small" onClick={() => {
              try { setImported(brainFromNetlist(importNetlist(importText))); setImportErr(""); setSheet(""); flash(t("电路已导入", "Circuit imported")); }
              catch (e) { setImportErr((e as Error).message); }
            }}>{t("测试这个电路", "Test this circuit")}</button>
          </div>
        )}
      </section>
      {result.length > 0 && (
        <div className="mobile-bar">
          {result.length === 1 ? (
            <><b>{result[0].day.alive ? t("活下来", "Survived") : t("死了", "Died")}</b><span>{t(`今天 · ${card.gates} 个门`, `today, ${card.gates} gates`)}</span></>
          ) : (
            <><b>{result.filter((d) => d.day.alive).length}/7</b><span>{t(`天活到天黑 · ${card.gates} 个门`, `days to dusk, ${card.gates} gates`)}</span></>
          )}
          <a className="btn small primary" href="#arena">{t("看培养皿", "See the dish")}</a>
        </div>
      )}
      <div className={`toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </div>
  );
}
