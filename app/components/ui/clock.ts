"use client";

/* One playhead shared by everything that shows a day: the dish reads the exact
   (fractional) tick every animation frame from a ref, while React only hears
   about whole ticks, a few times a second. */

import { useCallback, useEffect, useRef, useState } from "react";

export interface Clock {
  /** The exact playhead, in ticks (fractional while playing). */
  t: React.MutableRefObject<number>;
  /** The whole tick React renders. */
  tick: number;
  length: number;
  playing: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  restart: () => void;
  setSpeed: (s: number) => void;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * @param length number of ticks in the day (the longest life on screen)
 * @param opts.start initial playhead; opts.autoplay starts playing on mount
 */
export function useClock(length: number, opts: { start?: number; autoplay?: boolean; speed?: number } = {}): Clock {
  const end = Math.max(0, length - 1);
  const t = useRef(Math.min(opts.start ?? 0, end));
  const [tick, setTick] = useState(Math.floor(t.current));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(opts.speed ?? 6);
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (opts.autoplay && !prefersReducedMotion()) setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (t.current > end) { t.current = end; setTick(end); }
  }, [end]);

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const step = (now: number) => {
      const dt = Math.max(0, Math.min(0.1, (now - last.current) / 1000));
      last.current = now;
      t.current = Math.min(end, t.current + dt * speed);
      const whole = Math.floor(t.current);
      setTick((p) => (p === whole ? p : whole));
      if (t.current >= end) { setPlaying(false); return; }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed, end]);

  const seek = useCallback((v: number) => {
    const c = Math.max(0, Math.min(end, v));
    t.current = c;
    setTick(Math.floor(c));
  }, [end]);

  const play = useCallback(() => {
    if (t.current >= end) { t.current = 0; setTick(0); }
    setPlaying(true);
  }, [end]);

  return {
    t, tick, length, playing, speed,
    play,
    pause: () => setPlaying(false),
    toggle: () => (playing ? setPlaying(false) : play()),
    seek,
    restart: () => { t.current = 0; setTick(0); setPlaying(true); },
    setSpeed
  };
}
