"use client";

import { useEffect, useMemo, useState } from "react";
import ReplayStage from "./workshop/ReplayStage";
import { compileWiring } from "@/sim/workshop/compile";
import { WLEVELS } from "@/sim/workshop/levels";
import { WSOLUTIONS } from "@/sim/workshop/solutions";
import { runTrace } from "@/sim/workshop/trace";
import { useLang } from "./i18n/client";

const LEVEL_ID = "spider";
const level = WLEVELS.find((l) => l.id === LEVEL_ID)!;
const design = WSOLUTIONS[LEVEL_ID];
const trace = runTrace(level, design, 0);
const chip = compileWiring(design);

export default function WorkshopHeroDemo() {
  const { t } = useLang();
  const [tick, setTick] = useState(0);
  const seconds = useMemo(() => (trace.ticks / 60).toFixed(1), []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTick(Math.floor(trace.ticks * 0.62));
      return;
    }
    let frame = 0;
    let last = performance.now();
    let at = 0;
    let acc = 0;
    let wait = 0;
    const stepMs = 1000 / 60;
    const run = (now: number) => {
      const dt = Math.min(80, now - last);
      last = now;
      if (at >= trace.ticks - 1) {
        wait += dt;
        if (wait > 1200) {
          at = 0;
          acc = 0;
          wait = 0;
          setTick(0);
        }
      } else {
        acc += dt;
        while (acc >= stepMs && at < trace.ticks - 1) {
          at++;
          acc -= stepMs;
        }
        setTick(at);
      }
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="home2-workshop-demo">
      <div className="home2-demo-frame">
        <ReplayStage level={level} setup={0} trace={trace} tick={tick} t={t} />
      </div>
      <div className="home2-demo-meta" aria-label={t("演示设计的成绩", "The demo design's scores")}>
        <span><b>{design.parts.length}</b>{t("零件", "parts")}</span>
        <span><b>{chip.gates.length}</b>{t("个 NAND 门", "NAND gates")}</span>
        <span><b>{seconds}s</b>{t("过关", "clear")}</span>
      </div>
      <p className="home2-cap">
        {t(
          "真实回放：同一套物理、同一套接线和点击“放飞”后完全一样。它看见糖和蜘蛛，自己决定哪只翅膀该动。",
          "Real replay: the same physics and wiring as pressing “Fly”. It sees sugar and a spider, then decides which wing moves."
        )}
      </p>
    </div>
  );
}
