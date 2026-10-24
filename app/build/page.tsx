import { SiteNav, SiteFooter } from "../components/ui/Shell";
import BuildClient from "./BuildClient";
import { dayString } from "@/sim/engine";
import { serverT } from "../i18n/server";

export const dynamic = "force-dynamic";
/* A shared builder link unfolds into the fly's card: its name, brain size and last seven dishes. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await serverT();
  const query = await searchParams;
  const base = { title: t("大脑编辑器 — TapeFly", "Brain editor — TapeFly") };
  const p = typeof query.p === "string" ? query.p : "";
  if (!p.startsWith("p1.")) return base;
  const q = new URLSearchParams({ kind: "fly", p });
  if (typeof query.n === "string") q.set("n", query.n);
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
