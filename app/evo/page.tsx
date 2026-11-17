import EvoGame from "./EvoGame";
import { serverT } from "../i18n/server";
import "./evo.css";

export async function generateMetadata() {
  const t = await serverT();
  return {
    title: t("TapeFly 进化 — 写一只果蝇的大脑", "TapeFly: Evolution — write a fly's brain"),
    description: t(
      "一个编程解谜游戏：用规则写果蝇的大脑，规则编译成真正的 NAND 门电路。门数、步数、深度三个分数，跟所有人比。",
      "A programming puzzle game: write a fly's brain as rules that compile to a real NAND gate circuit. Three scores — gates, steps, depth — against everyone else."
    )
  };
}

export default function EvoPage() {
  return <EvoGame />;
}
