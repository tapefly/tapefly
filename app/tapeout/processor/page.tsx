import { SiteNav, SiteFooter } from "../../components/ui/Shell";
import ProcessorClient from "./ProcessorClient";
import config from "@/config/tapeout.json";

export const metadata = { title: "TapeFly 处理器 / The TapeFly processor — TapeFly", robots: { index: false } };

export default async function ProcessorPage({ searchParams }: { searchParams: Promise<{ replace?: string }> }) {
  const params = await searchParams;
  const deployed = params.replace !== "1" && config.tapeflyProcessor && config.tapeflyTransistors && config.tapeflyProcessorTx
    ? {
        circuits: config.tapeflyProcessor,
        transistors: config.tapeflyTransistors,
        tx: config.tapeflyProcessorTx,
        created: config.tapeflyProcessorCreated
      }
    : null;

  return (
    <main>
      <SiteNav here="/tapeout" />
      <div className="page">
        <ProcessorClient deployed={deployed} replacementMode={params.replace === "1"} />
      </div>
      <SiteFooter />
    </main>
  );
}
