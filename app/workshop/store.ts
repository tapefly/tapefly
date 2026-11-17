/* What this browser remembers for the workshop. Local only. */
import { useCallback, useEffect, useState } from "react";
import type { Design } from "@/sim/workshop/parts";

export interface WBest { cost: number; gates: number; seconds: number }
export interface WSave { designs: Record<string, Design>; best: Record<string, WBest>; sound: boolean }

const KEY = "tapefly.workshop.v1";
const EMPTY: WSave = { designs: {}, best: {}, sound: true };

export function useWSave() {
  const [s, set] = useState<WSave>(EMPTY);
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) { const p = JSON.parse(v) as Partial<WSave>; set({ designs: p.designs ?? {}, best: p.best ?? {}, sound: p.sound ?? true }); }
    } catch {}
  }, []);
  const update = useCallback((f: (s: WSave) => WSave) => {
    set((cur) => {
      const next = f(cur);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return [s, update] as const;
}

export function mergeBest(o: WBest | undefined, n: WBest): WBest {
  if (!o) return n;
  return { cost: Math.min(o.cost, n.cost), gates: Math.min(o.gates, n.gates), seconds: Math.min(o.seconds, n.seconds) };
}
