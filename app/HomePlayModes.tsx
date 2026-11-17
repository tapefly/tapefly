"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { configuredClaimContract } from "@/sim/circuit-claims";
import { useLang } from "./i18n/client";
import { track } from "./lib/telemetry";

type Mode = "workshop" | "brawl";
type Choice = 1 | 2;

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
      ["方案 A · 28 门偷跑", "Plan A · 28-gate shortcut"],
      ["方案 B · 50 门稳健", "Plan B · 50-gate route"],
    ],
  },
  brawl: {
    kicker: ["PvP 规则 · 自动战斗", "PvP rules · auto battle"],
    title: ["红方重甲抢糖，蓝方复眼诱敌。", "Red rushes the food. Blue reads the spider."],
    body: [
      "两套战术大脑在同一盘里自动开打。红方先抢到中央糖，蓝方放弃危险区域，先去边路，再把对手引向蜘蛛。",
      "Two tactical brains fight automatically in one dish. Red takes the centre sugar first. Blue yields the danger zone, farms the edge and steers its rival toward the spider.",
    ],
    reward: ["实际完成整局后可领取「每日对战电路」", "Finish a real daily run to claim a Brawl circuit receipt"],
    href: "/brawl",
    cta: ["进入 Brawl 实际对战", "Play the real Brawl"],
    options: [
      ["红方 #R09 · 重甲冲撞", "Red #R09 · armoured rush"],
      ["蓝方 #B12 · 复眼游击", "Blue #B12 · compound-eye route"],
    ],
  },
} as const;

function HomeModeCanvas({ mode, choice, runId, onDone }: { mode: Mode; choice: Choice; runId: number; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || runId === 0) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 180 : 4350;
    const started = performance.now();
    let raf = 0;

    const point = (a: [number, number], b: [number, number], c: [number, number], d: [number, number], t: number): [number, number] => {
      const s = 1 - t;
      return [
        s * s * s * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t * t * t * d[0],
        s * s * s * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t * t * t * d[1],
      ];
    };

    const draw = (now: number) => {
      const p = Math.min(1, (now - started) / duration);
      const W = canvas.width, H = canvas.height;
      g.clearRect(0, 0, W, H);

      const bg = g.createRadialGradient(W * .52, H * .48, 20, W * .52, H * .48, W * .55);
      bg.addColorStop(0, mode === "workshop" ? "#123230" : "#32191c");
      bg.addColorStop(1, "#061013");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      g.strokeStyle = "rgba(99,231,192,.13)";
      g.lineWidth = 1;
      for (let x = 70; x < W; x += 56) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 50; y < H; y += 56) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

      g.save();
      g.translate(W / 2, H / 2);
      g.strokeStyle = "rgba(217,241,228,.2)";
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(0, 8, 265, 196, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "rgba(99,231,192,.13)";
      g.beginPath(); g.ellipse(0, 8, 222, 158, 0, 0, Math.PI * 2); g.stroke();
      g.restore();

      const foods: [number, number][] = [[150, 365], [520, 345], [513, 138]];
      foods.forEach(([x, y], i) => {
        const eatenAt = mode === "workshop" ? (i === 0 ? .28 : i === 1 ? .68 : .86) : (i === 0 ? .18 : i === 1 ? .63 : .84);
        if (p < eatenAt) {
          g.fillStyle = "#dfb65a";
          g.shadowColor = "#dfb65a";
          g.shadowBlur = 18;
          g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
          g.shadowBlur = 0;
        }
      });

      const spiderX = 351 + Math.sin(p * Math.PI * 5) * 18;
      const spiderY = 250 + Math.cos(p * Math.PI * 3) * 11;
      g.strokeStyle = "#ef4b58";
      g.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + p * .3;
        g.beginPath(); g.moveTo(spiderX, spiderY); g.lineTo(spiderX + Math.cos(a) * 22, spiderY + Math.sin(a) * 17); g.stroke();
      }
      g.fillStyle = "#ef4b58";
      g.beginPath(); g.arc(spiderX, spiderY, 10, 0, Math.PI * 2); g.fill();

      const drawFly = (x: number, y: number, color: string, label: string, dead = false) => {
        g.save();
        g.translate(x, y);
        g.globalAlpha = dead ? .38 : 1;
        g.strokeStyle = color;
        g.fillStyle = color;
        g.lineWidth = 2;
        g.beginPath(); g.ellipse(-7, -5, 13, 6, -.4, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.ellipse(7, -5, 13, 6, .4, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.ellipse(0, 2, 7, 13, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#071013";
        g.font = "700 11px ui-monospace, monospace";
        g.fillText(label, -12, 33);
        g.restore();
      };

      if (mode === "workshop") {
        const aT = Math.min(1, p / .57);
        const a = point([140, 448], [245, 390], [318, 295], [350, 250], aT);
        drawFly(a[0], a[1], "#e4b65e", "A", p > .57);
        if (p > .57) {
          g.fillStyle = "rgba(255,212,111,.12)";
          g.beginPath(); g.arc(a[0], a[1], 30 + Math.sin(p * 20) * 2, 0, Math.PI * 2); g.fill();
        }
        const bT = Math.min(1, p / .95);
        const b = point([175, 438], [210, 180], [485, 130], [520, 330], bT);
        drawFly(b[0], b[1], "#63e7c0", "B");
        if (p > .45) {
          g.strokeStyle = "#dfb65a";
          g.lineWidth = 2;
          g.beginPath(); g.arc(505, 255, 22, -1.2, 1.5); g.stroke();
        }
      } else {
        const redT = Math.min(1, p / .64);
        const red = point([165, 425], [245, 305], [320, 235], [350, 252], redT);
        drawFly(red[0], red[1], "#ef5963", "R", p > .64);
        const blueT = Math.min(1, p / .95);
        const blue = point([520, 440], [520, 300], [440, 155], [260, 130], blueT);
        drawFly(blue[0], blue[1], "#72d8ff", "B");
        if (p > .64) {
          g.fillStyle = "rgba(239,89,99,.11)";
          g.beginPath(); g.arc(red[0], red[1], 35, 0, Math.PI * 2); g.fill();
        }
      }

      g.fillStyle = "rgba(4,13,15,.82)";
      g.fillRect(18, 18, 144, 28);
      g.fillStyle = "#63e7c0";
      g.font = "700 11px ui-monospace, monospace";
      g.fillText(`130 FRAMES · ${Math.round(p * 100)}%`, 30, 36);

      if (p < 1) raf = requestAnimationFrame(draw);
      else onDone();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [choice, mode, onDone, runId]);

  return <canvas ref={ref} width={720} height={500} className="home-mode-canvas" aria-label={`${mode} deterministic preview`} />;
}

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
          <HomeModeCanvas mode={mode} choice={choice} runId={runId} onDone={done} />
          {runId === 0 && (
            <div className="home-mode-idle">
              <b>{mode === "workshop" ? "A / B" : "R / B"}</b>
              <span>{t("选一边，点开始", "Pick a side and start")}</span>
            </div>
          )}
          {finished && (
            <div className="home-mode-result">
              <small>{t("结果", "Result")}</small>
              <b>{mode === "workshop" ? t("A 撞蛛，B 通关", "A hits the spider. B clears.") : t("蓝方 B12 从边路获胜", "Blue B12 wins from the edge.")}</b>
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
                {finished ? t("再看一次", "Run it again") : t("看 4 秒实况", "Watch the 4-second preview")}
              </button>
            ) : (
              <button type="button" className="btn primary big" disabled>{t("培养皿运行中…", "Dish running…")}</button>
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

