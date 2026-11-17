/* What this browser remembers: best scores and the brain on each level. Local only. */
import { useCallback, useEffect, useState } from "react";

export interface Best { gates: number; steps: number; depth: number }
export interface Progress { best: Record<string, Best>; brains: Record<string, string>; sound: boolean; seen: Record<string, boolean> }

const KEY = "tapefly.evo.v1";
const EMPTY: Progress = { best: {}, brains: {}, sound: true, seen: {} };

export function loadProgress(): Progress {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return EMPTY;
    const p = JSON.parse(v) as Partial<Progress>;
    return { best: p.best ?? {}, brains: p.brains ?? {}, sound: p.sound ?? true, seen: p.seen ?? {} };
  } catch {
    return EMPTY;
  }
}

export function useProgress() {
  const [p, setP] = useState<Progress>(EMPTY);
  useEffect(() => setP(loadProgress()), []);
  const update = useCallback((f: (p: Progress) => Progress) => {
    setP((cur) => {
      const next = f(cur);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return [p, update] as const;
}

/** Merge a cleared score into the per-metric bests. */
export function better(old: Best | undefined, s: Best): Best {
  if (!old) return s;
  return { gates: Math.min(old.gates, s.gates), steps: Math.min(old.steps, s.steps), depth: Math.min(old.depth, s.depth) };
}
