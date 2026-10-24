"use client";

/* ── Circuit.tsx ─────────────────────────────────────────────────────────────
   Any 12-in / 3-out NAND netlist, drawn left to right by gate depth, and
   evaluated live. Each time the input word changes, the answer travels through
   the circuit as a wavefront: depth 1 lights, then depth 2, and so on, so you
   can watch a decision being made rather than read it.

   On-signals glow agar; off-signals are dim. Hover a gate to read its two
   inputs and its output.
   --------------------------------------------------------------------------- */

import { useEffect, useMemo, useRef, useState } from "react";
import { evalTrace, gateDepth, type Netlist } from "@/sim/netlist";
import { prefersReducedMotion } from "./clock";
import { C } from "./tokens";
import { useLang } from "@/app/i18n/client";

const GROUPS: [string, string, number][] = [["food", "食物", 0], ["threat", "危险", 2], ["light", "光线", 4], ["novelty", "新奇", 6], ["hunger", "饥饿", 8], ["previous", "上一步", 10]];
const OUTS: [string, string][] = [["behaviour bit 0", "行为位 0"], ["behaviour bit 1", "行为位 1"], ["escape", "逃逸"]];

interface Lay {
  W: number;
  H: number;
  pos: { x: number; y: number }[];
  depth: number[];
  maxD: number;
  outs: number[];
}

function lay(n: Netlist): Lay {
  const base = 2 + n.nIn;
  const { cols, depth } = gateDepth(n);
  const maxD = cols.length - 1;
  const colW = Math.max(26, Math.min(64, 760 / Math.max(1, maxD)));
  const maxRows = Math.max(n.nIn + 2, ...cols.map((c) => c.length));
  const rowH = Math.max(11, Math.min(26, 420 / maxRows));
  const H = Math.max(260, maxRows * rowH + 40);
  const x0 = 92;
  const W = x0 + maxD * colW + 120;
  const pos: { x: number; y: number }[] = [];
  // inputs: two rows per sense, with a gap between groups
  const inTop = 20, inH = H - 40;
  for (let i = 0; i < n.nIn; i++) {
    const grp = Math.floor(i / 2);
    pos[2 + i] = { x: 64, y: inTop + ((grp * 2.6 + (i % 2) * 1 + 0.8) / (6 * 2.6)) * inH };
  }
  pos[0] = { x: 64, y: H - 8 };
  pos[1] = { x: 64, y: H - 8 };
  cols.forEach((col, d) => {
    if (d === 0) return;
    const top = (H - col.length * rowH) / 2;
    col.forEach((sig, r) => { pos[sig] = { x: x0 + (d - 0.5) * colW, y: top + rowH * (r + 0.5) }; });
  });
  const outs = Array.from({ length: n.nOut }, (_, k) => base + n.gates.length - n.nOut + k);
  return { W, H, pos, depth, maxD, outs };
}

export default function Circuit({ netlist, word, className, compact }: { netlist: Netlist; word: number; className?: string; compact?: boolean }) {
  const L = useMemo(() => lay(netlist), [netlist]);
  const base = 2 + netlist.nIn;
  const sig = useMemo(() => evalTrace(netlist, word), [netlist, word]);
  const prevSig = useRef<Uint8Array>(sig);
  const [front, setFront] = useState(L.maxD + 1); // depth the wavefront has reached
  const [hover, setHover] = useState<number | null>(null);
  const { t } = useLang();

  useEffect(() => {
    if (prefersReducedMotion()) { setFront(L.maxD + 1); prevSig.current = sig; return; }
    let raf = 0;
    const start = performance.now();
    const dur = Math.min(520, 60 * (L.maxD + 1));
    const step = (now: number) => {
      const f = Math.min(1, (now - start) / dur);
      setFront(f * (L.maxD + 1));
      if (f < 1) raf = requestAnimationFrame(step);
      else prevSig.current = sig;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); prevSig.current = sig; };
  }, [sig, L.maxD]);

  // a signal shows its new value once the wavefront has passed its depth
  const val = (s: number) => (s < base || L.depth[s] <= front ? sig[s] : prevSig.current[s] ?? 0);
  const fresh = (s: number) => s >= base && Math.abs(L.depth[s] - front) < 1.2 && front <= L.maxD;

  const wire = (a: number, gx: number, gy: number) => {
    const p = L.pos[a];
    const mx = (p.x + gx) / 2;
    return `M${p.x} ${p.y} C ${mx} ${p.y} ${mx} ${gy} ${gx - 6} ${gy}`;
  };

  const hv = hover === null ? null : netlist.gates[hover];

  return (
    <div className={`circuit ${compact ? "compact" : ""} ${className ?? ""}`}>
      <svg viewBox={`0 0 ${L.W} ${L.H}`} role="img" aria-label={t(`由 ${netlist.gates.length} 个 NAND 门组成的电路`, `A circuit of ${netlist.gates.length} NAND gates`)}>
        {GROUPS.map(([name, zh, i]) => (
          <text key={name} x={8} y={(L.pos[2 + i].y + L.pos[3 + i].y) / 2 + 4} className="c-label">{t(zh, name)}</text>
        ))}
        {/* wires first */}
        <g fill="none">
          {netlist.gates.map(([a, b], i) => {
            const s = base + i;
            const g = L.pos[s];
            const dimmed = hover !== null && hover !== i;
            return (
              <g key={i} opacity={dimmed ? 0.18 : 1}>
                {[a, b].map((x, k) =>
                  x <= 1 ? null : (
                    <path key={k} d={wire(x, g.x, g.y)} stroke={val(x) ? C.agar : C.wire} strokeOpacity={val(x) ? 0.75 : 0.9} strokeWidth={val(x) ? 1.6 : 1} />
                  )
                )}
              </g>
            );
          })}
          {L.outs.map((s, k) => (
            <path key={`o${k}`} d={`M${L.pos[s].x + 8} ${L.pos[s].y} L ${L.W - 104} ${L.pos[s].y}`} stroke={val(s) ? C.agar : C.wire} strokeWidth={val(s) ? 2 : 1.2} />
          ))}
        </g>
        {/* inputs */}
        {Array.from({ length: netlist.nIn }, (_, i) => {
          const p = L.pos[2 + i];
          return <circle key={i} cx={p.x} cy={p.y} r={4.2} fill={sig[2 + i] ? C.agar : "#0F2D33"} stroke={sig[2 + i] ? "none" : C.wire} />;
        })}
        {/* gates: a NAND is a D with a bubble */}
        {netlist.gates.map((_, i) => {
          const s = base + i;
          const p = L.pos[s];
          const on = val(s) === 1;
          const out = L.outs.includes(s);
          const r = out ? 7 : compact ? 5 : 5.5;
          return (
            <g key={i} transform={`translate(${p.x} ${p.y})`} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} className="c-gate">
              {fresh(s) && on && <circle r={r * 2.2} fill={C.agar} opacity={0.25} />}
              <path d={`M${-r} ${-r} H 0 A ${r} ${r} 0 0 1 0 ${r} H ${-r} Z`} fill={on ? C.agar : "#0F2D33"} stroke={on ? "#FFE3A6" : "#2F5961"} strokeWidth={1} />
              <circle cx={r + 2} cy={0} r={1.9} fill={on ? C.agar : "#2F5961"} />
            </g>
          );
        })}
        {L.outs.map((s, k) => (
          <text key={`ol${k}`} x={L.W - 98} y={L.pos[s].y + 4} className={`c-label ${val(s) ? "on" : ""}`}>{t(OUTS[k][1], OUTS[k][0])}</text>
        ))}
      </svg>
      <p className="c-read" aria-live="polite">
        {hv ? (
          t(<>第 {hover! + 1} 个门：<b>{sig[hv[0]]}</b> 和 <b>{sig[hv[1]]}</b> 做 NAND，得到 <b className={sig[base + hover!] ? "on" : ""}>{sig[base + hover!]}</b>。第 {L.depth[base + hover!]} 层。</>,
            <>Gate {hover! + 1}: NAND of <b>{sig[hv[0]]}</b> and <b>{sig[hv[1]]}</b> gives <b className={sig[base + hover!] ? "on" : ""}>{sig[base + hover!]}</b>. Depth {L.depth[base + hover!]}.</>)
        ) : (
          t(<>{netlist.gates.length} 个门，{L.maxD} 层深。把鼠标移到门上看它在算什么。</>, <>{netlist.gates.length} gates, {L.maxD} deep. Hover a gate to read it.</>)
        )}
      </p>
    </div>
  );
}
