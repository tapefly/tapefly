import Workshop from "./Workshop";
import { serverT } from "../i18n/server";
import { SiteNav, SiteFooter } from "../components/ui/Shell";
import "./workshop.css";

export async function generateMetadata() {
  const t = await serverT();
  return {
    title: t("TapeFly 工坊 — 用零件搭一只机器果蝇", "TapeFly Workshop — build a robot fly from parts"),
    description: t(
      "物理搭建游戏：用翅膀、眼睛、触角和配重拼出一只果蝇，把感官接到翅膀上，放飞它。你接的神经就是一块真的 NAND 芯片。",
      "A physics building game: assemble a fly from wings, eyes, antennae and ballast, wire its senses to its wings and let it go. Your wiring is a real NAND chip."
    )
  };
}

export default function WorkshopPage() {
  return (
    <>
      <SiteNav here="/workshop" />
      <Workshop />
      <SiteFooter />
    </>
  );
}
