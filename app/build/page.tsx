import { SiteNav, SiteFooter } from "../components/ui/Shell";
import BuildClient from "./BuildClient";
import { dayString } from "@/sim/engine";
import { serverT } from "../i18n/server";

export const dynamic = "force-dynamic";
/* A shared builder link unfolds into the fly's card: its name, brain size and last seven dishes. */
export function generateMetadata({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const t = serverT();
  const base = { title: t("大脑编辑器 — TapeFly", "Brain editor — TapeFly") };
  const p = typeof searchParams.p === "string" ? searchParams.p : "";
  if (!p.startsWith("p1.")) return base;
  const q = new URLSearchParams({ kind: "fly", p });
  if (typeof searchParams.n === "string") q.set("n", searchParams.n);
  const image = `/api/og?${q.toString()}`;
  return { ...base, openGraph: { title: t("TapeFly 上的一只果蝇", "A fly on TapeFly"), images: [{ url: image, width: 1200, height: 630 }] }, twitter: { card: "summary_large_image", images: [image] } };
}

export default function BuildPage() {
  return (
    <main>
      <SiteNav here="/build" />
      <BuildClient today={dayString(new Date())} />
      <SiteFooter />
    </main>
  );
}
