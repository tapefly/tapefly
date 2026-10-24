import { ImageResponse } from "next/og";
import { readChallenge, match, cleanName } from "@/sim/versus";
import { brainFromProgram, week, card } from "@/sim/challenge";
import { decodeProgram, encodeProgram } from "@/sim/program";
import { defaultFlyName } from "@/sim/identity";
import { boardThrough } from "@/sim/board";

/* Share cards. A shared link unfolds into a picture of what it holds:
     ?kind=vs&a=…&an=…&b=…&bn=…&d=…   a match (or an open challenge when b is missing)
     ?kind=fly&p=…&n=…                a fly: its name, its brain size, its last seven dishes
   Everything is computed from the link itself, the same way the page computes it. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1200, H = 630;
const BG = "#06191e", PANEL = "#0c252b", INK = "#e8f0eb", MUTED = "#8ba9a5", GOLD = "#f2b64b", BLUE = "#86a7d6", GREEN = "#a3e36a", RED = "#f0454f";

const frame = (children: React.ReactNode) =>
  new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: INK, padding: 56, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: GOLD, fontSize: 24, letterSpacing: 8, fontFamily: "monospace" }}>TAPEFLY</div>
          <div style={{ color: MUTED, fontSize: 22, fontFamily: "monospace" }}>a fruit fly with a NAND-gate brain</div>
        </div>
        {children}
      </div>
    ),
    { width: W, height: H }
  );

function days(list: { alive: boolean }[]) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
      {list.map((d, i) => <div key={i} style={{ width: 54, height: 54, borderRadius: 10, background: d.alive ? GREEN : "#4a2026", display: "flex" }} />)}
    </div>
  );
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const through = boardThrough();
  try {
    if (q.get("kind") === "fly") {
      const p = decodeProgram(q.get("p") ?? "");
      const code = encodeProgram(p);
      const name = cleanName(q.get("n"), defaultFlyName(code));
      const brain = brainFromProgram(p);
      const wk = week(brain, through), c = card(brain.netlist);
      return frame(
        <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
          <div style={{ color: MUTED, fontSize: 28 }}>meet</div>
          <div style={{ fontSize: 96, fontWeight: 800, color: GOLD, letterSpacing: -2 }}>{name}</div>
          <div style={{ fontSize: 30, color: INK, marginTop: 8 }}>{`${c.gates} NAND gates · ${wk.survived} of the last 7 days to dusk · ${wk.meals} meals`}</div>
          {days(wk.days)}
          <div style={{ fontSize: 26, color: MUTED, marginTop: 34 }}>Can your fly do better? Teach one and race it.</div>
        </div>
      );
    }
    const c = readChallenge(q, through);
    if (!c.b) {
      return frame(
        <div style={{ display: "flex", flexDirection: "column", marginTop: 64 }}>
          <div style={{ fontSize: 40, color: MUTED }}>a challenge from</div>
          <div style={{ fontSize: 110, fontWeight: 800, color: GOLD, letterSpacing: -3 }}>{c.a.name}</div>
          <div style={{ fontSize: 36, color: INK, marginTop: 16 }}>My fly against yours. Same dish, same food, seven rounds.</div>
          <div style={{ fontSize: 28, color: MUTED, marginTop: 40 }}>Open the link and teach a fly to answer.</div>
        </div>
      );
    }
    const m = match(brainFromProgram(c.a.program), brainFromProgram(c.b.program), c.through);
    const names = [c.a.name, c.b.name];
    const head = m.winner === -1 ? "a drawn match" : `${names[m.winner]} wins`;
    return frame(
      <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
        <div style={{ fontSize: 34, color: MUTED }}>{head}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", background: PANEL, borderRadius: 20, padding: "22px 30px", width: 470, border: m.winner === 0 ? `3px solid ${GOLD}` : "3px solid transparent" }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: GOLD }}>{names[0]}</div>
            <div style={{ fontSize: 110, fontWeight: 800, color: INK, fontFamily: "monospace" }}>{String(m.wins[0])}</div>
          </div>
          <div style={{ fontSize: 40, color: MUTED }}>vs</div>
          <div style={{ display: "flex", flexDirection: "column", background: PANEL, borderRadius: 20, padding: "22px 30px", width: 470, border: m.winner === 1 ? `3px solid ${BLUE}` : "3px solid transparent" }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: BLUE }}>{names[1]}</div>
            <div style={{ fontSize: 110, fontWeight: 800, color: INK, fontFamily: "monospace" }}>{String(m.wins[1])}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {m.rounds.map((r, i) => <div key={i} style={{ width: 64, height: 18, borderRadius: 6, background: r.winner === -1 ? MUTED : r.winner === 0 ? GOLD : BLUE, display: "flex" }} />)}
        </div>
        <div style={{ fontSize: 24, color: MUTED, marginTop: 22 }}>{`seven dishes, ${m.rounds[0].date} to ${c.through} · shared food · ${m.draws} draw${m.draws === 1 ? "" : "s"}`}</div>
      </div>
    );
  } catch {
    return frame(
      <div style={{ display: "flex", flexDirection: "column", marginTop: 90 }}>
        <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2 }}>Teach a fly to survive the day.</div>
        <div style={{ fontSize: 32, color: RED, marginTop: 20 }}>(this link could not be read)</div>
      </div>
    );
  }
}
