import { SiteNav, SiteFooter } from "./components/ui/Shell";
import HomeClient from "./HomeClient";
import { dayString } from "@/sim/engine";
import { boardThrough } from "@/sim/board";

/* One screen: four instinct switches, the TapeOut circuit they make, today's dish. */
export const dynamic = "force-dynamic";

export default function Page() {
  const now = new Date();
  return (
    <main>
      <SiteNav here="/" />
      <HomeClient today={dayString(now)} through={boardThrough(now)} />
      <SiteFooter />
    </main>
  );
}
