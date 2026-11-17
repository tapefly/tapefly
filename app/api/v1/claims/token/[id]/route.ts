import { NextResponse } from "next/server";
import { WLEVELS } from "@/sim/workshop/levels";
import { CLAIM_MODE } from "@/sim/circuit-claims";
import { readCircuitClaim } from "../../read";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function brawlDate(activityCode: number): string {
  const text = String(activityCode);
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const claim = await readCircuitClaim(id).catch(() => null);
  if (!claim) return NextResponse.json({ error: "circuit claim not found" }, { status: 404 });

  const workshop = claim.mode === CLAIM_MODE.workshop;
  const level = workshop ? WLEVELS[claim.activityCode - 1] : undefined;
  const date = claim.mode === CLAIM_MODE.brawl ? brawlDate(claim.activityCode) : undefined;
  const title = workshop
    ? `TapeFly Workshop Circuit — ${level?.title.en ?? `Stage ${claim.activityCode}`}`
    : `TapeFly Brawl Circuit — ${date}`;
  const shortRecipient = `${claim.recipient.slice(0, 6)}…${claim.recipient.slice(-4)}`;

  return NextResponse.json(
    {
      name: title,
      description: workshop
        ? `A commemorative receipt for a Workshop design that cleared its level and passed exhaustive circuit verification. Owned by ${shortRecipient}. This is not a TapeOut Circuit NFT.`
        : `A commemorative receipt for a completed deterministic Brain Brawl run. Owned by ${shortRecipient}. This is not a TapeOut Circuit NFT.`,
      image: `https://tapefly.xyz/api/v1/claims/image/${id}`,
      external_url: `https://tapefly.xyz/claims/${id}`,
      attributes: [
        { trait_type: "Mode", value: workshop ? "Workshop" : "Brain Brawl" },
        { trait_type: "Season", value: claim.seasonId },
        ...(workshop
          ? [
              { trait_type: "Stage", value: claim.activityCode },
              { trait_type: "Clear time", value: claim.score / 10, display_type: "number" },
            ]
          : [
              { trait_type: "Date", value: date },
              { trait_type: "Wins", value: claim.score, display_type: "number" },
            ]),
        { trait_type: "NAND gates", value: claim.gateCount, display_type: "number" },
        { trait_type: "Logic depth", value: claim.depth, display_type: "number" },
        { trait_type: "State bits", value: claim.stateBits, display_type: "number" },
        { trait_type: "Circuit hash", value: claim.circuitHash },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}

