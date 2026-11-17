"use client";

/* The logic analyzer. One row per signal, drawn as a square wave over the whole
   run, the way you would read a real chip on a bench. Drag anywhere to scrub:
   the arena and the chip view both jump to that tick, because the simulation is
   deterministic and can be replayed exactly. */

import { useCallback, useEffect, useRef, useState } from "react";
import { PARTS } from "@/sim/workshop/parts";
import type { Trace } from "@/sim/workshop/trace";
import type { T } from "../evo/text";

const ROW = 17, PAD_T = 16, PAD_B = 6, LABEL = 118, RIGHT = 10;

const COLOR: Record<string, [string, string]> = {
  sense: ["#73f5c1", "rgba(115,245,193,0.18)"],
  brain: ["#b99cff", "rgba(185,156,255,0.18)"],
  wing: ["#f2b64b", "rgba(242,182,75,0.18)"]
};
const MARK: Record<string, string> = { eat: "#fffbe8", break: "#ffd27a", caught: "#e23b45", smash: "#dff3ff", knock: "#c8873a", hit: "rgba(255,255,255,0.25)" };

export default function Timeline({ trace, tick, onScrub, highlight, t, nameOf }: {
  trace: Trace;
  tick: number;
  onScrub: (tick: number) => void;
  highlight?: number;
  t: T;
  nameOf: (id: string) => string;
}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [w, setW] = useState(760);
  const drag = useRef(false);

  useEffect(() => {
    const el = cv.current?.parentElement;
    if (!el) return;
    const fit = () => setW(Math.max(360, el.clientWidth));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = PAD_T + trace.rows.length * ROW + PAD_B;
  const plotW = Math.max(40, w - LABEL - RIGHT);
  const xOf = useCallback((k: number) => LABEL + (k / Math.max(1, trace.ticks - 1)) * plotW, [plotW, trace.ticks]);

  useEffect(() => {
    const el = cv.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = w * dpr; el.height = H * dpr;
    el.style.width = w + "px"; el.style.height = H + "px";
    const g = el.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, H);

    // second gridlines
    g.strokeStyle = "rgba(115,160,152,0.16)";
    g.lineWidth = 1;
    g.font = "500 9px ui-sans-serif, system-ui, sans-serif";
    g.textBaseline = "top";
    g.textAlign = "center";
    const secs = Math.ceil(trace.ticks / 60);
    const everySec = secs > 40 ? 10 : secs > 16 ? 5 : 1;
    for (let s = 0; s <= secs; s += everySec) {
      const x = Math.round(xOf(s * 60)) + 0.5;
      g.beginPath(); g.moveTo(x, PAD_T - 4); g.lineTo(x, H - PAD_B); g.stroke();
      g.fillStyle = "rgba(150,185,175,0.7)";
      if (x < w - 14) g.fillText(`${s}s`, x, 2);
    }

    // event marks along the top
    for (const e of trace.events) {
      const c = MARK[e.kind];
      if (!c || e.t > trace.ticks) continue;
      const x = xOf(e.t);
      g.fillStyle = c;
      g.fillRect(x - 1, PAD_T - 6, 2, 4);
    }

    // one square wave per signal
    trace.rows.forEach((r, i) => {
      const y0 = PAD_T + i * ROW;
      const hi = y0 + 3, lo = y0 + ROW - 5;
      const bright = highlight === undefined || highlight === i;
      const [on, fill] = COLOR[r.role];
      // row band
      if (highlight === i) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(LABEL, y0, plotW, ROW); }
      // label
      g.font = `${highlight === i ? "700" : "500"} 10px ui-sans-serif, system-ui, sans-serif`;
      g.textAlign = "right";
      g.textBaseline = "middle";
      g.fillStyle = bright ? on : "rgba(150,185,175,0.45)";
      const label = nameOf(r.id);
      g.fillText(label.length > 18 ? label.slice(0, 17) + "…" : label, LABEL - 8, (hi + lo) / 2);

      // the wave: fill under the high stretches, then stroke the edge
      g.globalAlpha = bright ? 1 : 0.3;
      g.fillStyle = fill;
      let runStart = -1;
      for (let k = 0; k < trace.ticks; k++) {
        const v = trace.bits[i * trace.ticks + k];
        if (v && runStart < 0) runStart = k;
        if ((!v || k === trace.ticks - 1) && runStart >= 0) {
          const a = xOf(runStart), b = Math.max(a + 0.7, xOf(v ? k : k - 1));
          g.fillRect(a, hi, b - a, lo - hi);
          runStart = -1;
        }
      }
      g.strokeStyle = on;
      g.lineWidth = highlight === i ? 1.6 : 1.2;
      g.lineJoin = "miter";
      g.beginPath();
      let prev = trace.bits[i * trace.ticks] ? hi : lo;
      g.moveTo(xOf(0), prev);
      for (let k = 1; k < trace.ticks; k++) {
        const v = trace.bits[i * trace.ticks + k] ? hi : lo;
        if (v !== prev) { const x = xOf(k); g.lineTo(x, prev); g.lineTo(x, v); prev = v; }
      }
      g.lineTo(xOf(trace.ticks - 1), prev);
      g.stroke();
      g.globalAlpha = 1;
    });

    // playhead
    const px = Math.round(xOf(tick)) + 0.5;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(px, PAD_T - 7); g.lineTo(px, H - PAD_B); g.stroke();
    g.fillStyle = "#ffffff";
    g.beginPath(); g.moveTo(px - 4, PAD_T - 11); g.lineTo(px + 4, PAD_T - 11); g.lineTo(px, PAD_T - 5); g.closePath(); g.fill();
  }, [trace, tick, w, H, plotW, xOf, highlight, nameOf]);

  const pick = (e: React.PointerEvent) => {
    const el = cv.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const f = (e.clientX - rect.left - LABEL) / plotW;
    onScrub(Math.max(0, Math.min(trace.ticks - 1, Math.round(f * (trace.ticks - 1)))));
  };

  return (
    <div className="ws-timeline">
      <div className="hd">
        <b>{t("信号时序图", "Signal timeline")}</b>
        <span>{t(`${trace.rows.length} 路信号 · ${trace.ticks} 刻 · 拖动任意位置回到那一刻`, `${trace.rows.length} signals · ${trace.ticks} ticks · drag anywhere to jump to that tick`)}</span>
      </div>
      <canvas
        ref={cv}
        role="slider"
        tabIndex={0}
        aria-label={t("时序图：拖动回看任意一刻", "Timeline: drag to replay any tick")}
        aria-valuemin={0}
        aria-valuemax={trace.ticks - 1}
        aria-valuenow={tick}
        onPointerDown={(e) => { drag.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); pick(e); }}
        onPointerMove={(e) => { if (drag.current) pick(e); }}
        onPointerUp={() => { drag.current = false; }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 60 : 6;
          if (e.key === "ArrowLeft") { e.preventDefault(); onScrub(Math.max(0, tick - step)); }
          if (e.key === "ArrowRight") { e.preventDefault(); onScrub(Math.min(trace.ticks - 1, tick + step)); }
          if (e.key === "Home") { e.preventDefault(); onScrub(0); }
          if (e.key === "End") { e.preventDefault(); onScrub(trace.ticks - 1); }
        }}
      />
      <p className="legend">
        <i className="s" />{t("感官", "senses")}
        <i className="b" />{t("逻辑 / 记忆", "logic & memory")}
        <i className="w" />{t("翅膀", "wings")}
        <span>{t("每一格高 = 这一刻这根线是 1", "a raised block = that wire carried 1 on that tick")}</span>
      </p>
    </div>
  );
}

export { PARTS };
