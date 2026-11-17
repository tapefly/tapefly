"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { configuredClaimContract } from "@/sim/circuit-claims";
import { useLang } from "./i18n/client";
import { track } from "./lib/telemetry";

type Mode = "workshop" | "brawl";
type Choice = 1 | 2;

const WorkshopModePreview = dynamic(() => import("./home/WorkshopModePreview"), { ssr: false });
const BrawlModePreview = dynamic(() => import("./home/BrawlModePreview"), { ssr: false });

const COPY = {
  workshop: {
    kicker: ["PvE · 拼装与逻辑", "PvE · build and logic"],
    title: ["一只省门偷跑，一只稳健绕蛛。", "One cuts gates. One reads the spider."],
    body: [
      "两套真实电路同场试飞。方案 A 只有 28 个门，却省掉了威胁抑制；方案 B 用更完整的接线先触发记忆，再绕开蜘蛛。",
      "Two real circuits fly the same dish. Plan A saves gates but omits threat suppression. Plan B carries more wiring, opens its memory switch, then routes around the spider.",
    ],
    reward: ["实际通关后可领取「工坊电路拓片」", "Clear the real level to claim a Workshop circuit receipt"],
    href: "/workshop",
    cta: ["进入工坊实际通关", "Play the real level"],
    options: [
      ["方案 A · 偷跑", "Plan A · shortcut"],
      ["方案 B · 稳健", "Plan B · route"],
    ],
  },
  brawl: {
    kicker: ["PvP 规则 · 自动战斗", "PvP rules · auto battle"],
    title: ["红方重甲抢糖，蓝方复眼诱敌。", "Red rushes the food. Blue reads the spider."],
    body: [
      "两套战术大脑在同一盘里自动开打。红方先抢中央糖，蓝方放弃危险区域，先去边路，再把对手引向蜘蛛。",
      "Two tactical brains fight automatically in one dish. Red takes the centre sugar first. Blue yields the danger zone, farms the edge and steers its rival toward the spider.",
    ],
    reward: ["实际完成整局后可领取「每日对战电路」", "Finish a real daily run to claim a Brawl circuit receipt"],
    href: "/brawl",
    cta: ["进入 Brawl 实际对战", "Play the real Brawl"],
    options: [
      ["红方 #R09", "Red #R09"],
      ["蓝方 #B12", "Blue #B12"],
    ],
  },
} as const;

export default function HomePlayModes() {
  const { t } = useLang();
  const [mode, setMode] = useState<Mode>("workshop");
  const [choice, setChoice] = useState<Choice>(1);
  const [runId, setRunId] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const claimsLive = !!configuredClaimContract();
  const active = COPY[mode];

  useEffect(() => {
    setChoice(1);
    setRunId(0);
    setRunning(false);
    setFinished(false);
  }, [mode]);

  const selectMode = (next: Mode) => {
    setMode(next);
    track("lab_mode_switched", { mode: next === "workshop" ? "besiege" : "brawl" });
  };
  const start = () => {
    setRunning(true);
    setFinished(false);
    setRunId((n) => n + 1);
    track("lab_sim_triggered", { mode, pickedSide: choice });
  };
  const done = useCallback(() => {
    setRunning(false);
    setFinished(true);
  }, []);

  return (
    <section className="page home-modes" aria-labelledby="home-modes-title">
      <div className="home-modes-head">
        <div>
          <p className="kicker">{t("全人群互动实验室 · 5 秒看懂", "Universal circuit lab · understand it in five seconds")}</p>
          <h2 id="home-modes-title">{t("先选一种玩法，再看两颗大脑自己行动。", "Pick a game, then watch two brains act on their own.")}</h2>
        </div>
        <div className="home-mode-tabs" role="tablist" aria-label={t("选择玩法", "Choose a mode")}>
          <button type="button" role="tab" aria-selected={mode === "workshop"} className={mode === "workshop" ? "on" : ""} onClick={() => selectMode("workshop")}>
            <span>01</span>{t("工坊闯关", "Workshop")}
          </button>
          <button type="button" role="tab" aria-selected={mode === "brawl"} className={mode === "brawl" ? "on" : ""} onClick={() => selectMode("brawl")}>
            <span>02</span>{t("零件对战", "Brain Brawl")}
          </button>
        </div>
      </div>

      <div className={`home-mode-body mode-${mode}`} role="tabpanel">
        <div className="home-mode-visual">
          {runId === 0 ? (
            <div className="home-mode-idle">
              <b>{mode === "workshop" ? "A / B" : "R / B"}</b>
              <span>{t("点开始，运行真实游戏画面", "Press start to run the real game")}</span>
            </div>
          ) : mode === "workshop" ? (
            <WorkshopModePreview key={`w-${runId}`} onDone={done} />
          ) : (
            <BrawlModePreview key={`b-${runId}`} onDone={done} />
          )}
          {finished && (
            <div className="home-mode-result">
              <small>{t("真实回放结果", "Real replay result")}</small>
              <b>{mode === "workshop" ? t("果蝇自己完成关卡", "The fly cleared the level on its own.") : t("这一场由真实战斗引擎判定", "The real fight engine decided this round.")}</b>
            </div>
          )}
        </div>
        <div className="home-mode-copy">
          <p className="kicker">{t(active.kicker[0], active.kicker[1])}</p>
          <h3>{t(active.title[0], active.title[1])}</h3>
          <p>{t(active.body[0], active.body[1])}</p>

          <div className="home-mode-options" role="group" aria-label={t("选择预览方案", "Choose a preview")}>
            {active.options.map(([zh, en], i) => (
              <button key={zh} type="button" className={choice === i + 1 ? "on" : ""} onClick={() => setChoice((i + 1) as Choice)} disabled={running}>
                <span>{i === 0 ? "A" : "B"}</span>
                {t(zh, en)}
              </button>
            ))}
          </div>

          <div className={`home-mode-reward ${claimsLive ? "live" : ""}`}>
            <span className="reward-mark">NFT</span>
            <div>
              <b>{t(active.reward[0], active.reward[1])}</b>
              <small>{claimsLive ? t("X Layer 纪念凭证 · 服务器重算结果后签发", "X Layer commemorative receipt · signed after server recomputation") : t("领取流程已经接好；主网合约部署后开放", "Claim flow is wired; opens when the X Layer contract is deployed")}</small>
            </div>
          </div>

          <div className="row">
            {runId === 0 || finished ? (
              <button type="button" className="btn primary big" onClick={start}>
                {finished ? t("再看一次真实回放", "Replay the real run") : t("运行真实游戏画面", "Run the real game")}
              </button>
            ) : (
              <button type="button" className="btn primary big" disabled>{t("游戏运行中…", "Game running…")}</button>
            )}
            <Link className="btn big" href={active.href}>{t(active.cta[0], active.cta[1])} →</Link>
          </div>

          {finished && (
            <div className="home-mode-after">
              <Link href={active.href}>{t("去实际玩一局，完成验证后领取纪念电路", "Play the real game and claim after verification")}</Link>
              <a
                href="https://web3.okx.com/xlayer/hackathon-voting"
                target="_blank"
                rel="noreferrer"
                onClick={() => track("lab_okx_vote_clicked", { sourceMode: mode, hasMinted: false })}
              >
                {t("去 OKX 给 TapeFly 投票 ↗", "Vote for TapeFly on OKX ↗")}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

