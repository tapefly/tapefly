import { ImageResponse } from "next/og";
import { dayString } from "@/sim/engine";
import { RIVALS, TACTIC_IDS, budgetFor, report } from "@/sim/arena";

/* The card that stands in for TapeFly when a link is shared: Brain Brawl, today's
   ladder, and the one fact that makes it TapeFly: the brain is a real NAND circuit. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "TapeFly Brain Brawl — two flies fight, you write the brain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#06191e";
const PANEL = "#0c252b";
const INK = "#e8f0eb";
const MUTED = "#8ba9a5";
const AGAR = "#f2b64b";
const FROST = "#86a7d6";
const EYE = "#f0454f";

export default function Image() {
  const date = dayString(new Date());
  const boss = RIVALS[RIVALS.length - 1];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: INK, padding: 56, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: AGAR, fontSize: 24, letterSpacing: 8, fontFamily: "monospace" }}>TAPEFLY · BRAIN BRAWL</div>
          <div style={{ color: MUTED, fontSize: 22, fontFamily: "monospace" }}>{`${date} · UTC`}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>Two flies fight.</div>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, color: AGAR }}>You write the brain.</div>
        </div>
        <div style={{ display: "flex", marginTop: 40, gap: 18 }}>
          <Stat n={String(TACTIC_IDS.length)} label="tactic chips" color={AGAR} />
          <Stat n={String(RIVALS.length)} label="rivals today" color={FROST} />
          <Stat n={`${budgetFor(0)}-${budgetFor(RIVALS.length - 1)}`} label="NAND gate budget" color={INK} />
          <Stat n={String(report(boss.chips).gates)} label={`gates in ${boss.name}, the last`} color={EYE} />
        </div>
        <div style={{ color: MUTED, fontSize: 22, marginTop: 36 }}>
          Every brain compiles to one real NAND circuit, the gates people tape out on TapeOut. Free, no wallet.
        </div>
      </div>
    ),
    size
  );
}

function Stat({ n, label, color }: { n: string; label: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: PANEL, borderRadius: 14, padding: "14px 22px", minWidth: 220 }}>
      <div style={{ fontSize: 42, fontWeight: 800, color, fontFamily: "monospace" }}>{n}</div>
      <div style={{ fontSize: 19, color: MUTED, marginTop: 2 }}>{label}</div>
    </div>
  );
}
