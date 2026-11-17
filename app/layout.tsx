import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "./site";
import { getLang } from "./i18n/server";
import { LangProvider } from "./i18n/client";

const ZH_TITLE = "TapeFly — 用零件搭一只会自己飞的机器果蝇";
const ZH_DESCRIPTION = "TapeFly 工坊：拼装机器果蝇、接出它的 NAND 大脑，让它在关卡里自己找糖、避障和逃生。免费玩，不用钱包。";

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
