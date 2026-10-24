import Link from "next/link";
import { SiteNav, SiteFooter } from "../components/ui/Shell";
import { serverT } from "../i18n/server";

/* The corner page: every way to check TapeFly without trusting it, in one list. */
export function generateMetadata() {
  const t = serverT();
  return {
    title: t("怎么证明没作假 — TapeFly", "How we prove it — TapeFly"),
    description: t("TapeFly 的每一天都能只凭日期重放。这里教你亲自核查每一个说法。", "Every TapeFly day can be replayed from its date. Here is how to check each claim yourself.")
  };
}

export default function ProofPage() {
  const t = serverT();
  const ITEMS: { href: string; title: string; line: string }[] = [
    { href: "/verify", title: t("重放任意一天", "Replay any day"), line: t("每一天只由日期决定，每一步都折进一个哈希。在浏览器里重放一天，对比哈希。", "Each day is a pure function of its date, and every step is folded into a hash. Replay a day in your browser and compare the hash.") },
    { href: "/lineage", title: t("血统账本", "The lineage ledger"), line: t("每个结束的日子都和前一天链在一起，所以过去的任何一天都没法被悄悄改掉。", "Every finished day is chained to the one before it, so no past day can be quietly changed.") },
    { href: "/tapeout#bytes", title: t("大脑的字节", "The brain's bytes"), line: t("官方大脑按 TapeOut 自己的电路格式逐字节列出，以及上链前必须通过的检查。", "The official brain in TapeOut's own circuit format, byte for byte, with the checks it has to pass before it goes on chain.") },
    { href: "/calibrate", title: t("这颗大脑公平吗？", "Is the brain fair?"), line: t("官方大脑是照着参考果蝇的行为调的。逐个决定看看它有多接近。", "The official brain was tuned to act like a reference fly. See how close it gets, decision by decision.") },
    { href: "/agents", title: t("给 AI 智能体", "For AI agents"), line: t("智能体可以抓取并核查的签名记录，规则和人用的一样。", "Signed records an agent can fetch and check, with the same rules a person uses.") },
    { href: "/lab", title: t("实验室", "The lab"), line: t("手动设定果蝇感觉到什么，看门电路怎么做决定，一次一个输入。", "Set what the fly senses by hand and watch the gates decide, one input at a time.") },
    { href: "/play", title: t("大脑学校", "Brain School"), line: t("几节讲大脑如何工作的小课，给好奇的人。", "Short lessons on how the brain works, for the curious.") }
  ];
  return (
    <main>
      <SiteNav here="/proof" />
      <div className="page">
        <header className="page-head">
          <h1>{t("怎么证明没作假", "How we prove it")}</h1>
          <p>
            {t("TapeFly 没有秘密状态，也没有数据库。你看到的一切都能只凭日期重新算出来，大脑也都是普通的 TapeOut 电路。你不需要相信我们：挑一个说法，自己去查。",
               "TapeFly keeps no secret state and no database. Everything you see can be recomputed from the date alone, and the brains are ordinary TapeOut circuits. You do not have to trust us: pick a claim below and check it.")}
          </p>
        </header>
        <ul className="proof-list">
          {ITEMS.map((i) => (
            <li key={i.href}>
              <Link href={i.href}>
                <b>{i.title}</b>
                <span>{i.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <SiteFooter />
    </main>
  );
}
