import { CLAIM_MODE } from "@/sim/circuit-claims";
import { readCircuitClaim } from "../../read";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  }[char] ?? char));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const claim = await readCircuitClaim(id).catch(() => null);
  if (!claim) return new Response("not found", { status: 404 });

  const workshop = claim.mode === CLAIM_MODE.workshop;
  const dateText = String(claim.activityCode);
  const label = workshop ? `WORKSHOP / ${claim.activityCode} LEVELS` : `BRAWL / ${dateText.slice(0, 4)}.${dateText.slice(4, 6)}.${dateText.slice(6, 8)}`;
  const title = escapeXml(workshop ? "THREE-LEVEL CIRCUIT PASSPORT" : "VERIFIED BATTLE BRAIN");
  const hash = escapeXml(claim.circuitHash.slice(2, 18).toUpperCase());
  const score = workshop ? `${(claim.score / 10).toFixed(1)}s` : `${claim.score} WINS`;

  const gates = Array.from({ length: 30 }, (_, i) => {
    const x = 104 + (i % 10) * 112;
    const y = 610 + Math.floor(i / 10) * 58;
    return `<g opacity="${i % 4 === 0 ? "0.9" : "0.42"}"><circle cx="${x}" cy="${y}" r="8" fill="#63e7c0"/><path d="M${x + 8} ${y} H${x + 44}" stroke="#315f59" stroke-width="2"/></g>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061116"/><stop offset="1" stop-color="#132d2d"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#63e7c0" stop-opacity=".34"/><stop offset="1" stop-color="#63e7c0" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="1200" rx="48" fill="url(#bg)"/>
  <circle cx="920" cy="250" r="360" fill="url(#glow)"/>
  <path d="M0 500 H1200" stroke="#243f3c" stroke-width="2"/>
  <path d="M0 810 H1200" stroke="#243f3c" stroke-width="2"/>
  <g font-family="ui-monospace,SFMono-Regular,Menlo,monospace">
    <text x="84" y="112" fill="#63e7c0" font-size="26" letter-spacing="6">TAPEFLY CIRCUIT CLAIM</text>
    <text x="84" y="180" fill="#f4f3e8" font-size="54" font-weight="700">${title}</text>
    <text x="84" y="240" fill="#88a7a1" font-size="26">${label}</text>
    ${gates}
    <text x="84" y="900" fill="#88a7a1" font-size="22">CIRCUIT HASH</text>
    <text x="84" y="948" fill="#f4f3e8" font-size="38">${hash}…</text>
    <text x="84" y="1050" fill="#88a7a1" font-size="22">GATES</text>
    <text x="84" y="1105" fill="#f4f3e8" font-size="46">${claim.gateCount}</text>
    <text x="400" y="1050" fill="#88a7a1" font-size="22">DEPTH</text>
    <text x="400" y="1105" fill="#f4f3e8" font-size="46">${claim.depth}</text>
    <text x="650" y="1050" fill="#88a7a1" font-size="22">STATE BITS</text>
    <text x="650" y="1105" fill="#f4f3e8" font-size="46">${claim.stateBits}</text>
    <text x="920" y="1050" fill="#88a7a1" font-size="22">${workshop ? "TOTAL TIME" : "RUN RESULT"}</text>
    <text x="920" y="1105" fill="#63e7c0" font-size="42">${score}</text>
    <text x="84" y="1160" fill="#6e8e88" font-size="18">COMMEMORATIVE RECEIPT · NOT A TAPEOUT CIRCUIT NFT</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

