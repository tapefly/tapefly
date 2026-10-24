import { SiteNav, SiteFooter } from "../../components/ui/Shell";
import AnchorClient from "./AnchorClient";
import { ANCHORS, headOn, yesterdayUTC } from "@/sim/anchor";

export const dynamic = "force-dynamic";
export const metadata = { title: "锚定血统 / Anchor the lineage — TapeFly", robots: { index: false } };

export default async function AnchorPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const query = await searchParams;
  const y = yesterdayUTC();
  const date = query.d && /^\d{4}-\d{2}-\d{2}$/.test(query.d) && query.d <= y ? query.d : y;
  return (
    <main>
      <SiteNav here="/lineage" />
      <div className="page">
        <AnchorClient date={date} head={headOn(date)} done={ANCHORS.entries.some((a) => a.date === date)} />
      </div>
      <SiteFooter />
    </main>
  );
}
