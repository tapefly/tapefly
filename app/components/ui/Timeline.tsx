"use client";
import { useLang } from "@/app/i18n/client";

/* The playhead, drawn as the day itself: a track from dawn to dusk with the
   focused fly's meals (green), escapes (amber) and death (red) marked on it,
   and every other fly's death as a small red notch above. Drag to scrub. */

import { useRef } from "react";
import type { Clock } from "./clock";
import type { PetriFly } from "./Petri";

const SPEEDS = [3, 6, 12, 24];

export default function Timeline({ clock, flies, focus, dusk }: { clock: Clock; flies: PetriFly[]; focus: number | null; dusk: number }) {
  const { t } = useLang();
  const track = useRef<HTMLDivElement>(null);
  const span = Math.max(1, dusk - 1);
  const pct = (t: number) => `${Math.min(100, (t / span) * 100)}%`;
  const f = focus === null ? null : flies[focus];

  const scrub = (e: React.PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    clock.pause();
    clock.seek(((e.clientX - r.left) / r.width) * span);
  };

  const now = Math.min(clock.tick, span);

  return (
    <div className="timeline">
      <button className="tl-play" onClick={clock.toggle} aria-label={clock.playing ? "Pause" : "Play"}>
        {clock.playing ? (
          <svg viewBox="0 0 16 16" aria-hidden><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden><path d="M4 2.2v11.6a.6.6 0 0 0 .9.5l9.4-5.8a.6.6 0 0 0 0-1L4.9 1.7a.6.6 0 0 0-.9.5z" /></svg>
        )}
      </button>
      <div
        className="tl-track"
        ref={track}
        role="slider"
        aria-label={t("一天中的时间", "Time of day")}
        aria-valuemin={0}
        aria-valuemax={span}
        aria-valuenow={now}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { clock.pause(); clock.seek(now + 1); }
          if (e.key === "ArrowLeft") { clock.pause(); clock.seek(now - 1); }
          if (e.key === " ") { e.preventDefault(); clock.toggle(); }
        }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); scrub(e); }}
        onPointerMove={(e) => { if (e.buttons) scrub(e); }}
      >
        <div className="tl-rail" />
        <div className="tl-fill" style={{ width: pct(now) }} />
        {flies.map((x, i) =>
          i !== focus && !x.ticks[x.ticks.length - 1].alive ? (
            <i key={`d${i}`} className="tl-notch" style={{ left: pct(x.ticks.length - 1) }} title={`${x.name} died`} />
          ) : null
        )}
        {f?.ticks.map((t, k) =>
          t.ate ? <i key={`m${k}`} className="tl-pip meal" style={{ left: pct(k) }} /> :
          t.gf ? <i key={`g${k}`} className="tl-pip jump" style={{ left: pct(k) }} /> : null
        )}
        {f && !f.ticks[f.ticks.length - 1].alive && <i className="tl-pip death" style={{ left: pct(f.ticks.length - 1) }} />}
        <div className="tl-head" style={{ left: pct(now) }} />
      </div>
      <span className="tl-time"><b>{now}</b><span>/{span}</span></span>
      <button
        className="tl-speed"
        onClick={() => clock.setSpeed(SPEEDS[(SPEEDS.indexOf(clock.speed) + 1) % SPEEDS.length])}
        aria-label={t("播放速度", "Playback speed")}
      >
        {clock.speed / 6}×
      </button>
    </div>
  );
}
