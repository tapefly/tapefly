/* npm run agent:demo -- [base-url] [date]
   A tiny Brain Brawl agent that uses nothing but the public API. For each fight
   it reads the budget, then builds a brain and body greedily: try every chip in
   every position and every part, keep the change that does best, stop when
   nothing helps. It is a search, not a language model; it shows the shape of
   an agent entry: read the rules over HTTP, submit a brain, read the result. */

const base = process.argv[2] ?? "http://localhost:3000";
const date = process.argv[3] ?? new Date().toISOString().slice(0, 10);

type Step = { result: string; health: { you: number; rival: number }; why: { en: string } };
const get = async (q: string) => { const r = await fetch(`${base}/api/v1/brawl?date=${date}${q}`); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); };

let calls = 0;
const score = (s: Step) => (s.result === "over budget" ? -1e9 : (s.result === "win" ? 10000 : s.result === "draw" ? 5000 : 0) + (s.health.you - s.health.rival) * 10);

async function main() {
  const info = await get("");
  const ids: string[] = info.chips.map((c: { id: string }) => c.id);
  const parts: string[] = info.parts.map((p: { id: string }) => p.id);
  const slots: number = info.rules.bodySlots;
  const gatesAlone: Record<string, number> = Object.fromEntries(info.chips.map((c: { id: string; gatesAlone: number }) => [c.id, c.gatesAlone]));
  let wins = 0, losses = 0;
  for (const rung of info.ladder as { fight: number; rival: string; ai: boolean; budget: number; gates: number }[]) {
    let best: string[] = [], gear: string[] = [], bestStep: Step | null = null, bestS = -Infinity;
    const tryOne = async (cand: string[], g: string[]) => {
      const r = await get(`&fight=${rung.fight}&chips=${cand.join(",")}&gear=${g.join(",")}&name=demo-agent`); calls++;
      const sc = score(r.step);
      if (sc > bestS) { best = cand; gear = g; bestS = sc; bestStep = r.step; return true; }
      return false;
    };
    for (let pass = 0; pass < 6; pass++) {
      let improved = false;
      const cur = best.slice(), curGear = gear.slice(); // changes to the brain and body as they stood at the start of this pass
      for (const c of ids) {
        if (cur.includes(c) || gatesAlone[c] > rung.budget) continue;
        for (let at = 0; at <= cur.length; at++) if (await tryOne([...cur.slice(0, at), c, ...cur.slice(at)], curGear)) improved = true;
      }
      if (curGear.length < slots) for (const p of parts) if (!curGear.includes(p) && (await tryOne(cur, [...curGear, p]))) improved = true;
      if (!improved) break;
    }
    const step = bestStep as Step | null;
    if (step?.result === "win") wins++; else if (step?.result === "loss") losses++;
    console.log(`fight ${rung.fight + 1} vs ${rung.rival}${rung.ai ? " (AI)" : ""} · budget ${rung.budget} → ${step?.result.toUpperCase()} with [${best.join(", ")}] + [${gear.join(", ")}] · ${step?.why.en}`);
  }
  console.log(`\n${wins} wins, ${losses} losses on ${date}, ${calls} API calls.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
