import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteNav } from "../../components/ui/Shell";
import { readCircuitClaim } from "@/app/api/v1/claims/read";
import { CLAIM_MODE } from "@/sim/circuit-claims";
import { WLEVELS } from "@/sim/workshop/levels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TapeFly Circuit Claim",
  description: "A verified commemorative circuit receipt from TapeFly.",
};

function brawlDate(activityCode: number) {
  const text = String(activityCode);
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default async function CircuitClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const claim = await readCircuitClaim(id).catch(() => null);
  if (!claim) notFound();

  const workshop = claim.mode === CLAIM_MODE.workshop;
  const level = workshop ? WLEVELS[claim.activityCode - 1] : undefined;
  const date = workshop ? undefined : brawlDate(claim.activityCode);
  const title = workshop
    ? level?.title.en ?? `Workshop stage ${claim.activityCode}`
    : `Brain Brawl · ${date}`;
  const destination = workshop ? "/workshop" : "/brawl";
  const shareText = workshop
    ? `I cleared ${level?.title.en ?? `Workshop stage ${claim.activityCode}`} with a ${claim.gateCount}-gate NAND brain in TapeFly.`
    : `I finished the ${date} Brain Brawl with a ${claim.gateCount}-gate NAND brain in TapeFly.`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`https://tapefly.xyz/claims/${id}`)}`;

  return (
    <main>
      <SiteNav />
      <article className="page claim-page">
        <header className="claim-page-head">
          <p className="kicker">Verified commemorative receipt</p>
          <h1>{title}</h1>
          <p>
            The server reconstructed this result, compiled the circuit and attached its hash.
            The owner is <code>{shortAddress(claim.recipient)}</code>.
          </p>
        </header>

        <div className="claim-page-grid">
          <img className="claim-page-art" src={`/api/v1/claims/image/${id}`} alt={`Circuit claim art for ${title}`} />
          <section className="panel claim-page-data">
            <span className="dtag live">X Layer claim</span>
            <div className="claim-page-stats">
              <div><small>Mode</small><b>{workshop ? "Workshop" : "Brain Brawl"}</b></div>
              <div><small>Season</small><b>{claim.seasonId}</b></div>
              <div><small>{workshop ? "Stage" : "Date"}</small><b>{workshop ? claim.activityCode : date}</b></div>
              <div><small>NAND gates</small><b>{claim.gateCount}</b></div>
              <div><small>Logic depth</small><b>{claim.depth}</b></div>
              <div><small>State bits</small><b>{claim.stateBits}</b></div>
              <div><small>{workshop ? "Clear time" : "Wins"}</small><b>{workshop ? `${(claim.score / 10).toFixed(1)}s` : claim.score}</b></div>
            </div>
            <div className="claim-page-hash">
              <small>Circuit bytes hash</small>
              <code>{claim.circuitHash}</code>
            </div>
            <p className="fine">
              This is a commemorative receipt. It is not a TapeOut Circuit NFT and does not
              provide an on-chain <code>eval</code> function.
            </p>
            <div className="row">
              <a className="btn primary" href={shareUrl} target="_blank" rel="noreferrer">Share on X</a>
              <Link className="btn" href={destination}>{workshop ? "Open Workshop" : "Open Brain Brawl"}</Link>
              <a className="btn" href={`/api/v1/claims/token/${id}`} target="_blank" rel="noreferrer">Metadata JSON</a>
            </div>
          </section>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}

