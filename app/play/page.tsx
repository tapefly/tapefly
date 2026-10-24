import { SiteNav, SiteFooter } from "../components/ui/Shell";
import { Suspense } from "react";
import PlayClient from "./PlayClient";
import { serverT } from "../i18n/server";

export function generateMetadata() { return { title: serverT()("大脑学校 — TapeFly", "Brain School — TapeFly") }; }

export default function PlayPage() {
  return (
    <main>
      <SiteNav here="/play" />
      <Suspense fallback={<div className="page" />}>
        <PlayClient />
      </Suspense>
      <SiteFooter />
    </main>
  );
}
