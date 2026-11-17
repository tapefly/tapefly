import { SiteNav, SiteFooter } from "../../components/ui/Shell";
import EditorClient from "./EditorClient";
import { dayString } from "@/sim/engine";
import { serverT } from "../../i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await serverT();
  return {
    title: t("大脑编辑器 — TapeFly", "Brain editor — TapeFly"),
    description: t("自己写大乱斗的战术规则：每条规则实时编译成 NAND 电路，在全部 4,096 种输入上核对，拿去打任何一个对手，或者发给朋友挑战。",
      "Write your own Brain Brawl tactics: every rule compiles to NAND live, is checked on all 4,096 inputs, and can fight any rival or go to a friend as a challenge.")
  };
}

export default function BrawlEditorPage() {
  return (
    <main>
      <SiteNav here="/brawl/editor" />
      <EditorClient today={dayString(new Date())} />
      <SiteFooter />
    </main>
  );
}
