"use client";

/* The frozen arena after a run, at whatever tick the player has scrubbed to.
   Nothing is re-simulated loosely: the world is rebuilt from the nearest
   snapshot and stepped forward, so what is on screen is exactly what happened. */

import { useEffect, useMemo, useRef, useState } from "react";
import { worldAt, type Trace } from "@/sim/workshop/trace";
import type { WLevel } from "@/sim/workshop/levels";
import type { World } from "@/sim/workshop/physics";
import { drawWorld } from "./FlyCanvas";
import { newFx } from "./wdraw";
import type { T } from "../evo/text";

export default function ReplayStage({ level, setup, trace, tick, t, share = 0.5 }: {
  /** `share` is how much of the window this stage may take: a duel puts two side by side. */
  level: WLevel; setup: number; trace: Trace; tick: number; t: T; share?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 800, h: 520 });
  const S = level.setups[setup];

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setBox({ w: el.clientWidth, h: Math.max(260, Math.min(el.clientHeight || 600, window.innerHeight * 0.5)) });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [share]);

  const world: World = useMemo(() => worldAt(trace, tick), [trace, tick]);

  useEffect(() => {
    const el = cv.current;
    if (!el) return;
    const c = Math.min(box.w / S.w, box.h / S.h);
    const W = S.w * c, H = S.h * c;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(W * dpr); el.height = Math.round(H * dpr);
    el.style.width = W + "px"; el.style.height = H + "px";
    const g = el.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the trail up to this tick comes straight out of the recording
    const fx = newFx();
    for (let k = Math.max(0, tick - 660); k <= tick; k += 3) fx.trail.push([trace.px[k], trace.py[k]]);
    drawWorld(g, world, fx, c, 0, W, H);
    // a still frame reads better with the tick stamped on it
    g.font = `600 ${Math.round(Math.max(11, c * 0.42))}px ui-sans-serif, system-ui, sans-serif`;
    g.textAlign = "right";
    g.textBaseline = "top";
    g.fillStyle = "rgba(6,25,30,0.72)";
    const label = `${(tick / 60).toFixed(2)}s · ${t("第", "tick ")}${tick}${t(" 刻", "")}`;
    const tw = g.measureText(label).width;
    g.fillRect(W - tw - 18, 8, tw + 10, Math.max(18, c * 0.62));
    g.fillStyle = "#ffd27a";
    g.fillText(label, W - 13, 11);
  }, [world, box.w, box.h, S, tick, trace, t]);

  return (
    <div className="ws-arena replay" ref={wrap}>
      <canvas ref={cv} aria-label={t("回放中的场地", "Arena, replayed")} />
    </div>
  );
}
