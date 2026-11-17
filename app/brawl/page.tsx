import { SiteNav, SiteFooter } from "../components/ui/Shell";
import BrawlClient from "./BrawlClient";
import { dayString } from "@/sim/engine";
import { serverT } from "../i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await serverT();
  return {
    title: t("大脑大乱斗 — TapeFly", "Brain Brawl — TapeFly"),
    description: t(
      "两只果蝇实时对打：蓄力、举盾、闪身、打断、抓破绽。你写的是它的战术大脑，整个大脑编译成一张真的 NAND 电路，门数有预算。",
      "Two flies fight in real time: wind-ups, shields, sidesteps, interrupts, punishes. You write the tactical brain, and the whole brain compiles to one real NAND circuit with a gate budget."
    )
  };
}

export default function BrawlPage() {
  return (
    <main>
      <SiteNav here="/brawl" />
      <BrawlClient today={dayString(new Date())} />
      <SiteFooter />
    </main>
  );
}
