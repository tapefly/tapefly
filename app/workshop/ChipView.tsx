"use client";

/* The fly's brain at gate level: the NAND netlist the wiring compiles to,
   laid out left (inputs) to right (outputs), lit live while it flies. This is
   the same netlist that could be taped out. */

import { useEffect, useMemo, useRef, useState } from "react";
import { compileWiring } from "@/sim/workshop/compile";
import { toVerilog } from "@/sim/workshop/verilog";
import type { Design } from "@/sim/workshop/parts";
import type { World } from "@/sim/workshop/physics";
import type { T } from "../evo/text";

export default function ChipView({ design, world, tick, t, nameOf }: { design: Design; world: World | null; tick: number; t: T; nameOf: (id: string) => string }) {
  const chip = useMemo(() => compileWiring(design), [design]);
  const ref = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const layout = useMemo(() => {
    const base = 2 + chip.nIn;
    const level = new Int32Array(base + chip.gates.length);
    const firstOut = base + chip.gates.length - chip.nOut;
    chip.gates.forEach(([a, b], i) => { level[base + i] = 1 + Math.max(level[a], level[b]); });
    const maxL = Math.max(1, ...Array.from(level));
    for (let s = firstOut; s < level.length; s++) level[s] = maxL;
    const cols: number[][] = Array.from({ length: maxL + 1 }, () => []);
    for (let s = 2; s < level.length; s++) cols[level[s]].push(s);
    return { base, level, firstOut, maxL, cols };
  }, [chip]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const { base, level, firstOut, maxL, cols } = layout;
    // live values
    const sig = new Uint8Array(base + chip.gates.length);
    sig[1] = 1;
    chip.inputs.forEach((id, i) => { sig[2 + i] = world?.parts.find((p) => p.id === id)?.on ? 1 : 0; });
    chip.state.forEach(([id, k], j) => { sig[2 + chip.inputs.length + j] = (k === "q" ? world?.brain.q[id] : world?.brain.wasOff[id]) ? 1 : 0; });
    chip.gates.forEach(([a, b], i) => { sig[base + i] = sig[a] & sig[b] ? 0 : 1; });

    const inLabel = (k: number) => (k < chip.inputs.length
      ? nameOf(chip.inputs[k])
      : `${nameOf(chip.state[k - chip.inputs.length][0])} · ${chip.state[k - chip.inputs.length][1] === "q" ? t("记着", "held") : t("上刻关", "was off")}`);
    const outLabel = (k: number) => (k < chip.outputs.length
      ? nameOf(chip.outputs[k])
      : `↺ ${nameOf(chip.state[k - chip.outputs.length][0])} · ${chip.state[k - chip.outputs.length][1] === "q" ? t("下一刻", "next") : t("下一刻 关", "next off")}`);
    const measure = cv.getContext("2d")!;
    measure.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    const widest = (n: number, f: (i: number) => string) => { let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, measure.measureText(f(i)).width); return m; };
    const rowH = 26, colW = 56, padT = 18;
    const padL = Math.ceil(widest(chip.nIn, inLabel)) + 26;
    const padR = Math.ceil(widest(chip.nOut, outLabel)) + 34;
    const rows = Math.max(...cols.map((c) => c.length), 1);
    const W = padL + maxL * colW + padR, H = padT * 2 + rows * rowH;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const pos = new Map<number, [number, number]>();
    cols.forEach((col, L) => {
      const off = (rows - col.length) * rowH * 0.5;
      col.forEach((s, k) => pos.set(s, [padL + L * colW, padT + off + k * rowH + rowH / 2]));
    });
    const on = "#ffd27a", off = "rgba(185,156,255,0.28)";
    // wires
    chip.gates.forEach(([a, b], i) => {
      const s = base + i;
      const [x, y] = pos.get(s)!;
      for (const src of [a, b]) {
        const p = pos.get(src);
        if (!p) continue;
        g.strokeStyle = sig[src] ? on : off;
        g.lineWidth = sig[src] ? 1.8 : 1;
        g.beginPath();
        g.moveTo(p[0] + 6, p[1]);
        const mx = (p[0] + x) / 2;
        g.bezierCurveTo(mx, p[1], mx, y, x - 7, y);
        g.stroke();
      }
    });
    // input pins
    g.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    g.textBaseline = "middle";
    for (let s = 2; s < base; s++) {
      const [x, y] = pos.get(s)!;
      const k = s - 2;
      const label = inLabel(k);
      g.fillStyle = k < chip.inputs.length ? "#73f5c1" : "#9ec3ff";
      g.textAlign = "right";
      g.fillText(label, x - 12, y);
      g.fillStyle = sig[s] ? on : "#1b3a40";
      g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#73f5c1"; g.lineWidth = 1; g.stroke();
    }
    // gates
    chip.gates.forEach((_, i) => {
      const s = base + i;
      const [x, y] = pos.get(s)!;
      const out = s >= firstOut;
      g.fillStyle = sig[s] ? "#3a2a08" : "#0f2a2f";
      g.strokeStyle = sig[s] ? on : "rgba(185,156,255,0.7)";
      g.lineWidth = out ? 2 : 1.2;
      g.beginPath();
      g.moveTo(x - 7, y - 7); g.lineTo(x + 1, y - 7); g.arc(x + 1, y, 7, -Math.PI / 2, Math.PI / 2); g.lineTo(x - 7, y + 7); g.closePath();
      g.fill(); g.stroke();
      g.beginPath(); g.arc(x + 10, y, 2.4, 0, Math.PI * 2); g.stroke();
      if (out) {
        const k = s - firstOut;
        const isWing = k < chip.outputs.length;
        const label = outLabel(k);
        g.fillStyle = isWing ? (sig[s] ? on : "#e8f0eb") : "#9ec3ff";
        g.textAlign = "left";
        g.fillText(label, x + 18, y);
      }
    });
    void level;
  }, [layout, chip, world, tick, nameOf, t]);

  const depth = layout.maxL;
  const copy = async () => {
    const text = JSON.stringify({ version: chip.version, nIn: chip.nIn, nOut: chip.nOut, gates: chip.gates });
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard refused */ }
  };
  /** The same circuit in the format every synthesis tool reads — so "this can be
      taped out" is something the player can check rather than take on trust. */
  const grabVerilog = () => {
    const v = toVerilog(design, "tapefly_brain");
    const url = URL.createObjectURL(new Blob([v.text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${v.module}.v`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="ws-chip">
      <div className="hd">
        <b>{t("芯片视图", "Chip view")}</b>
        <span>{t(`${chip.gates.length} 个 NAND 门 · ${chip.state.length} 个记忆位 · ${depth} 层`, `${chip.gates.length} NAND gates · ${chip.state.length} state bits · depth ${depth}`)}</span>
        <button type="button" className="ws-mini" onClick={copy}>{copied ? t("已复制", "Copied") : t("复制网表", "Copy netlist")}</button>
        <button type="button" className="ws-mini" onClick={grabVerilog}>{saved ? t("已下载 .v", "Saved .v") : t("下载 Verilog（.v）", "Download Verilog (.v)")}</button>
      </div>
      <p className="note">
        {t("这是你接的神经编译出来的真实电路。每个 D 形符号是一个 NAND 门，亮的线是 1。蓝色的是记忆位：右边的“下一刻”会在下一拍写回左边。", "This is the real circuit your nerves compile to. Each D-shaped symbol is one NAND gate; lit wires carry 1. Blue are state bits: the ‘next’ values on the right are written back to the left on the next tick.")}
        {!world && <b> {t("现在没在飞，灯显示的是所有感官都关着时的状态。", "Not flying: the lights show the state with every sense off.")}</b>}
      </p>
      <div className="scroll"><canvas ref={ref} aria-label={t("NAND 电路图", "NAND circuit diagram")} /></div>
    </div>
  );
}
