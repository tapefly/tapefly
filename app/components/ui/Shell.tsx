"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLang, LangToggle } from "@/app/i18n/client";
import config from "@/config/tapeout.json";

/* The site's chrome: the bar and a footer that says plainly what the project is and is not. */

export function FlyMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="flymark">
      <ellipse cx="11" cy="11" rx="8.5" ry="3.6" transform="rotate(-35 11 11)" fill="rgba(214,232,255,.35)" stroke="rgba(230,242,255,.7)" strokeWidth="1" />
      <ellipse cx="21" cy="11" rx="8.5" ry="3.6" transform="rotate(35 21 11)" fill="rgba(214,232,255,.35)" stroke="rgba(230,242,255,.7)" strokeWidth="1" />
      <ellipse cx="16" cy="21" rx="4.6" ry="7" fill="#CEA25C" />
      <path d="M11.6 20h8.8M11.8 23h8.4M12.6 26h6.8" stroke="#52361A" strokeWidth="1.4" />
      <ellipse cx="16" cy="13.5" rx="3.6" ry="3.2" fill="#AA8046" />
      <circle cx="13.6" cy="9.4" r="2" fill="#E33A44" />
      <circle cx="18.4" cy="9.4" r="2" fill="#E33A44" />
    </svg>
  );
}

/* Workshop and its design library lead. Older playable experiments live
   together under Lab so they remain discoverable without competing with the
   main game. TapeOut and developer resources stay first-class. */
const MAIN: [string, string, string][] = [
  ["/workshop", "工坊", "Workshop"],
  ["/workshop/gallery", "设计库", "Design library"]
];

const TAIL_MAIN: [string, string, string][] = [
  ["/steam", "Steam", "Steam"],
  ["/hardware", "智能硬件", "AI hardware"]
];

type Item = [string, string, string, string, string];
const MENUS: { id: string; label: [string, string]; items: Item[] }[] = [
  { id: "lab", label: ["实验室", "Lab"], items: [
    ["/brawl", "Brain Brawl", "Brain Brawl", "战术芯片、身体装备和实时对决", "Tactic chips, body gear and real-time duels"],
    ["/evo", "进化", "Evolution", "写规则、过固定地图的编程解谜游戏", "A programming puzzle game about writing rules for fixed maps"],
    ["/forage", "觅食实验", "Forage experiment", "拨动四个本能，看果蝇在培养皿里活过一天", "Switch four instincts and watch a fly survive a day in the dish"],
    ["/vs", "觅食赛跑", "Forage race", "两只果蝇抢同一盘食物，连续比赛七天", "Two flies race for the same food across seven days"],
    ["/board", "冠军榜", "Champions", "每周赛季、公开记录和可重算成绩", "Weekly seasons, public records and reproducible scores"],
    ["/build", "经典规则编辑器", "Classic rule editor", "给旧版觅食果蝇写规则并编译成 NAND", "Write rules for the classic forage fly and compile them to NAND"],
    ["/lab", "感觉实验台", "Sense bench", "手动设置感官输入，观察电路如何决定", "Set sensory inputs by hand and inspect the circuit decision"],
    ["/play", "大脑学校", "Brain school", "从第一课开始学习阅读和编写门电路", "Learn to read and write gate circuits from the first lesson"]
  ] },
  { id: "tapeout", label: ["TapeOut", "TapeOut"], items: [
    ["/tapeout", "TapeOut 流片", "TapeOut", "把大脑流片到 TapeOut，核对全部输入答案", "Tape a brain out on TapeOut and verify every input answer"],
    ["/proof", "Proof", "Proof", "每一种核查方法，一页列全", "Every way to verify the project, on one page"],
    ["/verify", "Verify", "Verify", "贴一段记录，自己重算哈希链", "Paste a record and recompute its hash chain"],
    ["/lineage", "Lineage", "Lineage", "从第一天起连续记录并锚定的行为血统", "The continuously recorded and anchored behaviour lineage"],
    ["/calibrate", "Calibrate", "Calibrate", "官方大脑和文献里的果蝇逐一比对", "The official brain checked case by case against the literature"],
    ["/docs#tapeout", "TapeOut 接口文档", "TapeOut interface", "电路接口约定与 TapeOut 集成说明", "The circuit interface convention and TapeOut integration notes"]
  ] },
  { id: "dev", label: ["开发者", "Developers"], items: [
    ["/docs", "开发者文档", "Developer docs", "玩法、电路、接口、验证和路线图的完整说明", "The full picture: play, circuits, APIs, verification and roadmap"],
    ["/docs/workshop", "Workshop API", "Workshop API", "发现关卡、评估设计并提交机器果蝇", "Discover levels, evaluate designs and submit robot flies"],
    ["/agents", "AI Agent API", "AI Agent API", "读取规则、提交大脑并拿回可复算的结果", "Read rules, submit a brain and receive reproducible results"],
    ["https://github.com/tapefly/tapefly", "GitHub ↗", "GitHub ↗", "全部开源代码", "All the source code"]
  ] }
];

export function SiteNav({ here }: { here?: string }) {
  const { t } = useLang();
  const close = (e: React.MouseEvent) => { const d = (e.currentTarget as HTMLElement).closest("details"); if (d) d.open = false; };
  // one menu open at a time
  const only = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const me = e.currentTarget;
    if (!me.open) return;
    me.closest("nav")?.querySelectorAll("details[open]").forEach((d) => { if (d !== me) (d as HTMLDetailsElement).open = false; });
  };
  // a click outside or Escape closes any open menu
  useEffect(() => {
    const shut = () => document.querySelectorAll(".nav details[open]").forEach((d) => { (d as HTMLDetailsElement).open = false; });
    const onClick = (e: MouseEvent) => { if (!(e.target as HTMLElement | null)?.closest?.(".nav details")) shut(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") shut(); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, []);
  return (
    <header className="nav">
      <div className="nav-in">
        <Link href="/" className="brand">
          <FlyMark />
          <span>TapeFly</span>
        </Link>
        <nav aria-label={t("主导航", "Main")}>
          {MAIN.map(([href, zh, en]) => (
            <Link key={href} href={href} className={here === href ? "on" : ""} aria-current={here === href ? "page" : undefined}>
              {t(zh, en)}
            </Link>
          ))}
          {MENUS.map((m) => (
            <details key={m.id} className="nav-more" onToggle={only}>
              <summary className={here && m.items.some((i) => i[0].split("#")[0] === here) ? "on" : ""}>{t(m.label[0], m.label[1])}</summary>
              <div className="nav-menu">
                {m.items.map(([href, zh, en, dzh, den]) => href.startsWith("http")
                  ? <a key={href} href={href} target="_blank" rel="noreferrer" onClick={close}><b>{t(zh, en)}</b><span>{t(dzh, den)}</span></a>
                  : <Link key={href} href={href} onClick={close} aria-current={here === href ? "page" : undefined}><b>{t(zh, en)}</b><span>{t(dzh, den)}</span></Link>)}
              </div>
            </details>
          ))}
          {TAIL_MAIN.map(([href, zh, en]) => (
            <Link key={href} href={href} className={here === href ? "on" : ""} aria-current={here === href ? "page" : undefined}>
              {t(zh, en)}
            </Link>
          ))}
        </nav>
        <Link href="/workshop" className="nav-cta">{t("开始造果蝇", "Build a fly")}</Link>
        <LangToggle />
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="foot">
      <div className="foot-in">
        <div className="foot-brand">
          <FlyMark size={28} />
          <p>
            {t("TapeFly 是一个基于 TapeOut 的游戏：一只大脑由 NAND 门电路组成的果蝇。独立项目，不是 TapeOut 团队出品。",
               "TapeFly is a game built on TapeOut: a fruit fly whose brain is a circuit of NAND gates. An independent project, not made by the TapeOut team.")}
          </p>
        </div>
        <div className="foot-cols">
          <div>
            <h4>{t("主游戏", "Main game")}</h4>
            <Link href="/workshop">{t("TapeFly 工坊", "TapeFly: Workshop")}</Link>
            <Link href="/workshop/gallery">{t("设计库", "Design library")}</Link>
          </div>
          <div>
            <h4>{t("实验室", "Lab")}</h4>
            <Link href="/brawl">{t("Brain Brawl", "Brain Brawl")}</Link>
            <Link href="/evo">{t("进化", "Evolution")}</Link>
            <Link href="/forage">{t("觅食实验", "Forage")}</Link>
            <Link href="/vs">{t("觅食赛跑", "Forage race")}</Link>
            <Link href="/board">{t("冠军榜", "Champions")}</Link>
            <Link href="/build">{t("经典规则编辑器", "Classic editor")}</Link>
          </div>
          <div>
            <h4>{t("TapeOut 生态", "TapeOut ecosystem")}</h4>
            <Link href="/tapeout">{t("TapeOut 流片", "TapeOut")}</Link>
            <Link href="/verify">{t("核查记录", "Verify a record")}</Link>
            <Link href="/proof">{t("怎么证明没作假", "How we prove it")}</Link>
            <Link href="/lineage">{t("行为血统", "Behaviour lineage")}</Link>
            <Link href="/calibrate">{t("公开校准", "Calibration")}</Link>
            <Link href="/docs#tapeout">{t("TapeOut 接口文档", "TapeOut interface")}</Link>
          </div>
          <div>
            <h4>{t("开发者", "Developers")}</h4>
            <Link href="/docs">{t("文档：完整介绍", "Docs: the whole picture")}</Link>
            <Link href="/agents">{t("给 AI 智能体", "For AI agents")}</Link>
            <a href="https://github.com/tapefly/tapefly" target="_blank" rel="noreferrer">
              {t("开源代码（GitHub）", "Source on GitHub")}
            </a>
          </div>
          <div>
            <h4>{t("如实说明", "Honest state")}</h4>
            <p>
              {t(<>TapeFly 的链上部分都在 X Layer。官方 50 门大脑已流片为 <Link href="/tapeout">Circuit #{String(config.circuitId)}</Link>，全部 4,096 个答案一致。当前证明使用 Sillu external test processor。不需要账号。</>,
                 <>Everything TapeFly puts on chain is on X Layer. The official 50-gate brain is live as <Link href="/tapeout">Circuit #{String(config.circuitId)}</Link>, with all 4,096 answers matched. The current proof uses the external Sillu test processor. No accounts.</>)}
            </p>
            <Link href="/changelog">{t("更新记录", "Changelog")}</Link>
            <Link href="/privacy">{t("隐私政策", "Privacy")}</Link>
            <Link href="/terms">{t("服务条款", "Terms")}</Link>
            <Link href="/support">{t("支持与举报", "Support")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
