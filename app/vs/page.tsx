import { Suspense } from "react";
import { SiteNav, SiteFooter } from "../components/ui/Shell";
import VsClient from "./VsClient";
import { boardThrough } from "@/sim/board";
import { serverT } from "../i18n/server";

export const dynamic = "force-dynamic";
type SP = Record<string, string | string[] | undefined>;
const toQuery = (sp: SP) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
  return q;
};

/* A shared match link unfolds into its own card: names, score, the seven rounds. */
export function generateMetadata({ searchParams }: { searchParams: SP }) {
  const q = toQuery(searchParams);
  const t = serverT();
  const base = { title: t("对战 — TapeFly", "Versus — TapeFly"), description: t("我的果蝇对你的果蝇：同一个培养皿，抢同样的食物，比 7 轮。", "My fly against yours: one dish, shared food, seven rounds.") };
  if (!q.get("a")) return base;
  const an = q.get("an") || t("挑战者", "Challenger"), bn = q.get("bn");
  const title = bn ? `${an} vs ${bn} — TapeFly` : t(`${an} 向你发起挑战 — TapeFly`, `${an} challenges you — TapeFly`);
  q.set("kind", "vs");
  const image = `/api/og?${q.toString()}`;
  return { ...base, title, openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] }, twitter: { card: "summary_large_image", title, images: [image] } };
}

export default function VsPage() {
  return (
    <main>
      <SiteNav here="/vs" />
      <Suspense fallback={<div className="page" />}>
        <VsClient through={boardThrough(new Date())} />
      </Suspense>
      <SiteFooter />
    </main>
  );
}
