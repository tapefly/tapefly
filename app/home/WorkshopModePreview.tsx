"use client";

import { useEffect, useState } from "react";
import ReplayStage from "../workshop/ReplayStage";
import { WLEVELS } from "@/sim/workshop/levels";
import { WSOLUTIONS } from "@/sim/workshop/solutions";
import { runTrace } from "@/sim/workshop/trace";
import { compileWiring } from "@/sim/workshop/compile";
import { useLang } from "../i18n/client";

const level = WLEVELS.find((candidate) => candidate.id === "spider")!;
const design = WSOLUTIONS.spider;
const trace = runTrace(level, design, 0);
const chip = compileWiring(design);

export default function WorkshopModePreview({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTick(trace.ticks - 1);
      onDone();
      return;
    }
    let raf = 0;
    let at = 0;
    let last = performance.now();
    let acc = 0;
    const step = 1000 / 60;
    const run = (now: number) => {
      acc += Math.min(80, now - last);
      last = now;
      while (acc >= step && at < trace.ticks - 1) {
        acc -= step;
        at++;
      }
      setTick(at);
      if (at >= trace.ticks - 1) onDone();
      else raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div className="home-real-preview">
      <ReplayStage level={level} setup={0} trace={trace} tick={tick} t={t} />
      <div className="home-real-preview-meta">
        <span><b>{design.parts.length}</b>{t("零件", "parts")}</span>
        <span><b>{chip.gates.length}</b>{t("NAND 门", "NAND gates")}</span>
        <span><b>{level.title.zh}</b>{t("真实回放", "real replay")}</span>
      </div>
    </div>
  );
}

