import { SiteNav, SiteFooter } from "../../components/ui/Shell";
import ProcessorClient from "./ProcessorClient";

export const metadata = { title: "TapeFly 处理器 / The TapeFly processor — TapeFly", robots: { index: false } };

export default function ProcessorPage() {
  return (
    <main>
      <SiteNav here="/tapeout" />
      <div className="page">
        <ProcessorClient />
      </div>
      <SiteFooter />
    </main>
  );
}
