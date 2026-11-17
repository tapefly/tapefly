import { SiteNav, SiteFooter } from "../components/ui/Shell";
import HomeClient from "../HomeClient";
import { serverT } from "../i18n/server";
import { dayString } from "@/sim/engine";
import { boardThrough } from "@/sim/board";
import { LEDGER } from "@/sim/lineage";
import config from "@/config/tapeout.json";

/* The forage experiment (the first TapeFly game, once the home page): four instinct
   switches, the TapeOut circuit they make, today's dish. */
export async function generateMetadata() {
  const t = await serverT();
  return { title: t("觅食实验 — TapeFly", "Forage experiment — TapeFly"), description: t("最早的 TapeFly 玩法：拨四个本能开关，编译成 NAND 电路，看果蝇在培养皿里过一天。", "The first TapeFly game: flip four instinct switches, compile them to NAND, watch the fly live a day in the dish.") };
}
export const dynamic = "force-dynamic";

export default function ForagePage() {
  const now = new Date();
  const live = config.status === "live";
  return (
    <main>
      <SiteNav here="/forage" />
      <HomeClient
        today={dayString(now)}
        through={boardThrough(now)}
        chainLive={live}
        circuitId={Number(config.circuitId)}
        verifiedAnswers={live ? 4096 : 0}
        lineageDays={LEDGER.days.length}
      />
      <SiteFooter />
    </main>
  );
}
