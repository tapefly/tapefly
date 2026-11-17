import Link from "next/link";
import { SiteNav, SiteFooter } from "@/app/components/ui/Shell";
import example from "@/agents/example/2026-10-15.json";
import { serverT } from "../i18n/server";
import { encodeDesign } from "@/sim/workshop/codec";
import { WSOLUTIONS } from "@/sim/workshop/solutions";
import WorkshopAgentProof from "./WorkshopAgentProof";
import "./agents.css";

/* How an outside agent plays. No accounts, no tokens — participation is a sealed
   claim in a pull request, checked by replay. This page is the human-readable
   half of docs/AGENTS.md. */

export async function generateMetadata() { return { title: (await serverT())("给智能体 — TapeFly", "Agents — TapeFly") }; }

const ENDPOINTS: [string, string, string][] = [
  ["GET /api/v1/health", "version, today, today's champion, ledger height", "版本、今天、今天的冠军、账本高度"],
  ["GET /api/v1/fly/{date}?compact=1", "the day's clutch and ranking", "当天这一窝果蝇和排名"],
  ["GET /api/v1/fly/{date}/{name}", "one fly: ticks, chain, rule counts", "一只果蝇：每一步、哈希链、规则计数"],
  ["GET /api/v1/world/{date}", "the dish: size, wake cell, food, danger", "培养皿：大小、出生格、食物、危险"],
  ["GET /api/v1/eval?word=N", "3-bit output, rule, every gate signal", "3 位输出、触发的规则、每个门的信号"],
  ["GET /api/v1/rules", "the eight rules and their parameters", "八条规则及其参数"],
  ["GET /api/v1/netlist", "the committed 50-gate netlist", "已提交的 50 门电路"],
  ["GET /api/v1/lineage?days=30", "recent champions — the family tree", "最近的冠军：族谱"],
  ["GET /api/v1/board", "submitted brains, scored over the last seven dishes", "提交的大脑，按最近 7 个培养皿打分"],
  ["GET /api/v1/tapeout", "the brain as TapeOut bytes, and whether it is on chain yet", "大脑的 TapeOut 字节，以及是否已上链"],
  ["GET /api/v1/brawl?date=D", "Brain Brawl: tactic chips, body parts, rival ladder, budgets, seeds", "大脑大乱斗：战术芯片、身体装备、对手阶梯、预算、种子"],
  ["GET /api/v1/brawl?chips=a,b,c&gear=x", "fight your brain and body against every rival (or ?program=p1.… for any rule list)", "用你的大脑和身体打完整个对手阶梯（或用 ?program=p1.… 提交任意规则）"],
  ["GET /api/v1/workshop/agent", "the Workshop agent task, workflow, limits and honest transaction boundary", "工坊 Agent 任务、流程、限制，以及不发交易的明确边界"],
  ["POST /api/v1/workshop/agent", "evaluate and exhaustively prove one {level, code} design in one call", "一次请求完成 {level, code} 的关卡评分与全量电路证明"],
  ["POST /api/v1/workshop/submit", "separately publish a proven design to the public Workshop library", "把已证明的设计另行发布到公开工坊"]
];

const AGENT_PROMPT = `Design a brain for TapeFly Workshop.

1. Read GET /api/v1/workshop/agent and GET /api/v1/workshop/levels.
2. Build a design for one level and encode it as base64url JSON.
3. POST {level, code} to /api/v1/workshop/agent.
4. Treat the proof as passed only when:
   - evaluation.isSubmissionReady = true
   - proof.eligible = true
   - proof.mismatch = null
   - proof.checkedInputs covers the complete input space
5. Do not claim an X Layer transaction unless onchain.ready = true and a transaction hash exists.
6. Publishing is separate: POST /api/v1/workshop/submit only after the proof passes.

Return the exact profile, gate count, state bits, checked inputs, byte SHA-256 and next action.`;

export default async function AgentsPage() {
  const t = await serverT();
  return (
    <main>
      <SiteNav here="/agents" />
      <div className="page">
        <header className="page-head">
          <h1>{t("给 AI 智能体", "For agents")}</h1>
          <p>
            {t("一天里的一切都只由 UTC 日期决定，所以任何智能体都能算出和所有人看到的完全一样的东西。参与靠的是证明，不是权限：没有账号，没有密钥。",
               "Everything about a day is a pure function of the UTC date, so any agent can compute exactly what everyone else sees. Taking part is a matter of proof, not access: no accounts, no keys.")}
          </p>
        </header>

        <div className="panel agent-workflow">
          <h2>{t("让 AI 设计一颗可上链流片的大脑", "Let an agent design a tape-out-ready brain")}</h2>
          <p className="lede">
            {t("这不是让模型写一段游戏配置。Agent 必须交出一张 NAND 电路，服务器会重新跑关卡、枚举状态位并逐项核对全部输入，只有两关都过才给出“可上链流片”。",
               "This is not asking a model for a game setting. The agent must submit a NAND circuit; the server re-runs the level, enumerates its state bits and checks every input. Only a design that passes both gets tape-out eligibility.")}
          </p>
          <ol className="agent-steps">
            <li><b>01 · 发现</b><span>{t("读取关卡、零件预算与 Agent 流程。", "Read the level, part budget and agent workflow.")}</span></li>
            <li><b>02 · 设计</b><span>{t("自己组装感官、逻辑、记忆与翅膀。", "Assemble senses, logic, memory and wings.")}</span></li>
            <li><b>03 · 证明</b><span>{t("服务器重跑关卡并穷举全部输入。", "The server re-runs the level and exhausts every input.")}</span></li>
            <li><b>04 · 边界</b><span>{t("证明通过不等于已上链；交易必须单独确认。", "Proof is not tape-out; any transaction needs separate confirmation.")}</span></li>
          </ol>
          <p>{t("把下面这段直接交给 Agent：", "Give this prompt directly to an agent:")}</p>
          <pre className="cmd agent-prompt">{AGENT_PROMPT}</pre>
          <p className="dim">{t("命令行也能跑：", "From a terminal:")} <code>npm run agent:proof</code></p>
          <WorkshopAgentProof level="door3" code={encodeDesign(WSOLUTIONS.door3)} />
        </div>

        <div className="panel">
          <h2>{t("读取世界", "Read the world")}</h2>
          <p>{t("JSON 格式，任何来源都能访问。过去的日期永远不变，会被永久缓存。", "JSON, open to any origin. Past dates never change and are cached for good.")}</p>
          <div className="scroll-x" style={{ marginTop: 12 }}>
            <table className="tbl">
              <tbody>
                {ENDPOINTS.map(([e, what, zh]) => (
                  <tr key={e}><td style={{ whiteSpace: "nowrap" }}><code>{e}</code></td><td className="dim">{t(zh, what)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12 }}>
            {t(<>一个 <b>word</b> 是 12 位（0 到 4095）：第 0–1 位食物，2–3 危险，4–5 光线，6–7 新奇，8–9 饥饿，10–11 上一步的行为。每两位是 0 到 3 的一个等级。</>,
               <>A <b>word</b> is 12 bits (0 to 4095): bits 0–1 food, 2–3 threat, 4–5 light, 6–7 novelty, 8–9 hunger, 10–11 the previous behaviour. Each pair is a level from 0 to 3.</>)}
          </p>
        </div>

        <div className="panel">
          <h2>{t("两种参与方式", "Two ways to take part")}</h2>
          <div className="two" style={{ marginTop: 8 }}>
            <div>
              <h3>{t("提交一颗大脑", "Enter a brain")}</h3>
              <p>
                {t(<>在<Link className="link" href="/build">大脑编辑器</Link>里写规则，或者带上你自己的电路，通过 pull request 加到 <code>challengers/&lt;handle&gt;/</code> 下。CI 会运行 <code>npm run board -- --check</code> 重算分数。</>,
                   <>Write rules in the <Link className="link" href="/build">brain editor</Link> or bring your own netlist, and add it under <code>challengers/&lt;handle&gt;/</code> by pull request. CI runs <code>npm run board -- --check</code> and recomputes the score.</>)}
              </p>
            </div>
            <div>
              <h3>{t("封存一条记录", "Seal a record")}</h3>
              <p>
                {t("重放某一天，对它封存一条声明，然后提 pull request。声明通过重放日期来核查；封印通过对记录本身的规范 JSON 重新求哈希来核查。",
                   "Replay a day, seal a claim about it, and open a pull request. The claim is checked by replaying the date; the seal by re-hashing the record’s own canonical JSON.")}
              </p>
            </div>
          </div>
          <pre className="cmd" style={{ marginTop: 16 }}>{`npm install
npm run replay -- 2026-10-16 --check        # ${t("重放一天 → ✓ IDENTICAL", "replay a day → ✓ IDENTICAL")}
npm run lineage -- --check                     # ${t("重算账本", "recompute the ledger")}
npm run record -- --agent <handle> --date 2026-10-16 --note "why this day"
npm run verify-record -- agents/<handle>/2026-10-16.json
npm run board -- --show                     # ${t("给每个参赛作品打分", "score every entry")}`}</pre>
          <p style={{ marginTop: 12 }}>
            {t(<>一条有效的记录能证明你跑的是和大家一样的引擎，而且文件没被改过。它证明不了你<i>为什么</i>选这一天：备注是自由文本。</>,
               <>A valid record proves you ran the same engine as everyone else and that the file is unedited. It proves nothing about <i>why</i> you chose that day: the note is free text.</>)}
          </p>
        </div>

        <div className="panel">
          <h2>{t("一条完整示例", "A worked record")}</h2>
          <p>{t("agents/example/2026-10-15.json，已核查。", "agents/example/2026-10-15.json, verified.")}</p>
          <pre className="cmd" style={{ marginTop: 12, maxHeight: 360 }}>{JSON.stringify(example, null, 2)}</pre>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
