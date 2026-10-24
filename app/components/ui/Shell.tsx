"use client";

import Link from "next/link";
import { useLang, LangToggle } from "@/app/i18n/client";

/* The site's chrome: a quiet bar with the five places a visitor goes, and a
   footer that says plainly what the project is and is not. */

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

const MAIN: [string, string, string][] = [
  ["/", "玩", "Play"],
  ["/vs", "对战", "Race"],
  ["/board", "冠军", "Champions"],
  ["/build", "大脑编辑器", "Brain editor"],
  ["/tapeout", "上链", "On TapeOut"],
  ["/docs", "文档", "Docs"]
];

export function SiteNav({ here }: { here?: string }) {
  const { t } = useLang();
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
        </nav>
        <Link href="/tapeout" className="nav-cta">{t("基于 TapeOut", "Built on TapeOut")}</Link>
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
            <h4>{t("玩", "Play")}</h4>
            <Link href="/">{t("拨本能开关", "Flip instincts")}</Link>
            <Link href="/vs">{t("和朋友对战", "Race a friend")}</Link>
            <Link href="/board">{t("冠军榜", "Champions")}</Link>
          </div>
          <div>
            <h4>{t("深入了解", "Go deeper")}</h4>
            <Link href="/tapeout">{t("上链（TapeOut）", "On TapeOut")}</Link>
            <Link href="/docs">{t("文档：完整介绍", "Docs: the whole picture")}</Link>
            <Link href="/build">{t("大脑编辑器", "Brain editor")}</Link>
            <Link href="/proof">{t("怎么证明没作假", "How we prove it")}</Link>
          </div>
          <div>
            <h4>{t("如实说明", "Honest state")}</h4>
            <p>
              {t(<>官方大脑已经在 BNB Chain 上流片：<Link href="/tapeout">TapeFly 处理器电路 #1，全部 4,096 个答案核对一致</Link>。没有代币，没有数据库，没有账号。</>,
                 <>The official brain is <b>live on BNB Chain</b>: <Link href="/tapeout">TapeFly processor circuit #1 passed all 4,096 answer checks</Link>. No token, no database, no accounts.</>)}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
