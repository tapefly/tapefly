"use client";

/* The brain as it really runs: every NAND gate, laid out by depth, lit when its
   output is 1 for the word the fly is reading right now. */

import { useMemo } from "react";
import type { Netlist } from "@/sim/netlist";
import { evalTrace } from "@/sim/netlist";
import { gateLevels } from "@/sim/evo/brain";
import type { T } from "./text";

const IN_LABEL: [string, string][] = [
  ["前墙", "wall F"], ["左墙", "wall L"], ["右墙", "wall R"], ["气味0", "smell0"], ["气味1", "smell1"], ["气味2", "smell2"],
  ["前网", "web"], ["记忆", "mem"], ["—", "r8"], ["—", "r9"], ["—", "r10"], ["—", "r11"]
];
const OUT_LABEL: [string, string][] = [["动作0", "act0"], ["动作1", "act1"], ["写记忆", "mem W"], ["记忆值", "mem V"]];

export default function CircuitView({ netlist, word, t, compact = false }: { netlist: Netlist; word: number | null; t: T; compact?: boolean }) {
  const layout = useMemo(() => {
    const base = 2 + netlist.nIn;
    const lv = gateLevels(netlist);
    const nOut = netlist.nOut;
    const firstOut = netlist.gates.length - nOut;
    const maxLv = Math.max(1, ...lv);
    // inputs actually read by some gate
    const used = new Set<number>();
    for (const [a, b] of netlist.gates) { if (a >= 2 && a < base) used.add(a); if (b >= 2 && b < base) used.add(b); }
    const ins = [...used].sort((a, b) => a - b);
    // columns: 0 inputs, 1..maxLv gates, maxLv+1 outputs
    const cols: number[][] = Array.from({ length: maxLv + 2 }, () => []);
    netlist.gates.forEach((_, i) => { if (i < firstOut) cols[lv[i]].push(i); });
    for (let k = 0; k < nOut; k++) cols[maxLv + 1].push(firstOut + k);
    const rows = Math.max(ins.length, ...cols.map((c) => c.length), 4);
    const W = 640, rowH = compact ? 18 : 22, H = rows * rowH + 40;
    const colX = (c: number) => 70 + (c * (W - 150)) / (maxLv + 1);
    const pos = new Map<number, { x: number; y: number }>();
    const yOf = (i: number, n: number) => 20 + ((i + 0.5) * (H - 40)) / n;
    ins.forEach((s, i) => pos.set(s, { x: 70, y: yOf(i, ins.length) }));
    pos.set(0, { x: 30, y: H - 10 });
    pos.set(1, { x: 30, y: 10 });
    cols.forEach((c, ci) => { if (ci === 0) return; c.forEach((g, i) => pos.set(base + g, { x: colX(ci), y: yOf(i, c.length) })); });
    return { base, ins, pos, W, H, firstOut };
  }, [netlist, compact]);

  const sig = useMemo(() => (word === null ? null : evalTrace(netlist, word)), [netlist, word]);
  const { base, ins, pos, W, H, firstOut } = layout;
  const on = (s: number) => (sig ? sig[s] === 1 : false);

  return (
    <div className="evo-circuit">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t(`大脑电路：${netlist.gates.length} 个 NAND 门`, `The brain's circuit: ${netlist.gates.length} NAND gates`)}>
        <g className="wires">
          {netlist.gates.map(([a, b], i) => {
            const p = pos.get(base + i)!;
            return [a, b].map((s, k) => {
              const q = pos.get(s);
              if (!q) return null;
              const mx = (q.x + p.x) / 2;
              return <path key={`${i}-${k}`} d={`M${q.x},${q.y} C${mx},${q.y} ${mx},${p.y} ${p.x - 7},${p.y}`} className={on(s) ? "w on" : "w"} />;
            });
          })}
        </g>
        {ins.map((s) => {
          const p = pos.get(s)!;
          const [zh, en] = IN_LABEL[s - 2];
          return (
            <g key={s} className={on(s) ? "pin on" : "pin"}>
              <text x={p.x - 12} y={p.y + 4} textAnchor="end">{t(zh, en)}</text>
              <circle cx={p.x} cy={p.y} r={5} />
            </g>
          );
        })}
        {netlist.gates.map((_, i) => {
          const p = pos.get(base + i)!;
          const out = i >= firstOut;
          return (
            <g key={i} className={`gate ${on(base + i) ? "on" : ""} ${out ? "out" : ""}`}>
              <path d={`M${p.x - 7},${p.y - 6} h6 a6,6 0 0 1 0,12 h-6 z`} />
              <circle cx={p.x + 2} cy={p.y} r={1.8} className="bubble" />
              {out && <text x={p.x + 12} y={p.y + 4}>{t(OUT_LABEL[i - firstOut][0], OUT_LABEL[i - firstOut][1])}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
