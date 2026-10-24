"use client";

import { useState } from "react";
import { colony } from "@/sim/colony";
import { foundingOn, seedFromDate } from "@/sim/lineage";
import { useLang } from "@/app/i18n/client";

/* Rebuild the whole clutch in the visitor's browser and compare one hash. */
export default function ReplayCheck({ date, champion, hash }: { date: string; champion: string; hash: string }) {
  const [state, setState] = useState<"idle" | "running" | "ok" | "bad">("idle");
  const [mine, setMine] = useState("");
  const [ms, setMs] = useState(0);
  const { t } = useLang();

  function run() {
    setState("running");
    setTimeout(() => {
      const t0 = performance.now();
      const c = colony(seedFromDate(date), date, foundingOn(date));
      const h = c.members[c.champion].day.hash;
      setMs(Math.round(performance.now() - t0));
      setMine(h);
      setState(h === hash ? "ok" : "bad");
    }, 30);
  }

  const chunk = (h: string) => h.match(/.{1,16}/g)!.join(" ");

  return (
    <div className={`replay ${state}`}>
      <p className="r-label">{t(`服务器说 ${champion} 这一天的最终哈希是`, `The server says ${champion}’s day ends in`)}</p>
      <code className="hash">{chunk(hash)}</code>
      <button className="btn primary" onClick={run} disabled={state === "running"}>
        {state === "running" ? t("重建中…", "Rebuilding…") : state === "idle" ? t("在我的浏览器里重建", "Rebuild it in my browser") : t("再重建一次", "Rebuild again")}
      </button>
      {mine && (
        <>
          <p className="r-label">{t("你的浏览器算出", "Your browser got")}</p>
          <code className={`hash ${state}`}>{chunk(mine)}</code>
          <p className={`r-verdict ${state}`}>
            {state === "ok" ? t(`完全一致。${date} 的 8 只果蝇，用 ${ms} 毫秒重建完成。`, `Identical. Eight flies, ${date}, rebuilt in ${ms} ms.`) : t("不一致。这个页面或引擎里有东西被改过。", "Different. Something in this page or the engine has changed.")}
          </p>
        </>
      )}
    </div>
  );
}
