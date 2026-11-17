import { SiteNav, SiteFooter } from "./components/ui/Shell";
import HomeArena from "./HomeArena";
import { BRAIN } from "@/sim/netlist";
import config from "@/config/tapeout.json";

/* The front door: Brain Brawl, one button, a live fight. The forage experiment
   that used to live here is at /forage. */
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main>
      <SiteNav here="/" />
      <HomeArena circuitId={Number(config.circuitId)} chainLive={config.status === "live"} officialGates={BRAIN.gates.length} />
      <SiteFooter />
    </main>
  );
}
