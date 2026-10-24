import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "./site";
import { getLang } from "./i18n/server";
import { LangProvider } from "./i18n/client";

const ZH_TITLE = "TapeFly — 用 TapeOut 门电路造一颗果蝇大脑";
const ZH_DESCRIPTION = "拨动果蝇的本能开关，它们会编译成 NAND 门电路，就是大家在 TapeOut 上流片的那种门。和朋友对战，赢下本周。每一天都能只凭日期重放验证。";

export async function generateMetadata(): Promise<Metadata> {
  const zh = (await getLang()) === "zh";
  const title = zh ? ZH_TITLE : SITE_TITLE, description = zh ? ZH_DESCRIPTION : SITE_DESCRIPTION;
  return {
  title,
  description,
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  openGraph: { title, description, type: "website", siteName: SITE_NAME, locale: zh ? "zh_CN" : "en_US" },
  twitter: { card: "summary_large_image", title, description },
  icons: { icon: "/icon.svg" }
  };
}

export const viewport = { themeColor: "#06191e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === "zh" ? "zh-CN" : "en"}>
      <body><LangProvider lang={lang}>{children}</LangProvider></body>
    </html>
  );
}
