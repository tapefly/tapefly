"use client";

/* The build plate: a studded grid around the core. Parts are drawn exactly as
   they fly; nerves run between them; the forward direction is up. */

import { useEffect, useRef, useState } from "react";
import { DIRS, GRID, PARTS, isSink, isSource, isWing, looseParts, type Design, type PartKind } from "@/sim/workshop/parts";
import { drawPart, wingSide } from "./wdraw";

export interface BuildHit { kind: "cell"; x: number; y: number }

export default function BuildCanvas({
  design,
  ghostKind,
  mode,
  selected,
  wireFrom,
  onCell,
  onWire,
  sensed
}: {
  design: Design;
  ghostKind: PartKind | null;
  mode: "place" | "wire" | "erase";
  selected: string | null;
  wireFrom: string | null;
  onCell: (x: number, y: number) => void;
  onWire: (index: number) => void;
  sensed?: Set<string>;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(560);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const N = GRID * 2 + 1;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setSize(Math.max(300, Math.min(el.clientWidth, el.clientHeight || 9999, 720)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const c = size / (N + 1);
  const ox = size / 2, oy = size / 2;
  const toPx = (x: number, y: number) => [ox + x * c, oy + y * c] as const;

  const wireMid = (i: number) => {
    const x = design.wires[i];
    const a = design.parts.find((p) => p.id === x.from), b = design.parts.find((p) => p.id === x.to);
    if (!a || !b) return null;
    const [ax, ay] = toPx(a.x, a.y), [bx, by] = toPx(b.x, b.y);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const nx = -(by - ay), ny = bx - ax;
    const l = Math.hypot(nx, ny) || 1;
    const bend = c * 0.55 * (i % 2 ? 1 : -1);
    return { ax, ay, bx, by, cx: mx + (nx / l) * bend, cy: my + (ny / l) * bend, mx: mx + (nx / l) * bend * 0.5, my: my + (ny / l) * bend * 0.5 };
  };

  useEffect(() => {
    let raf = 0;
    const draw = (t: number) => {
      const el = cv.current;
      if (!el) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (el.width !== size * dpr) { el.width = size * dpr; el.height = size * dpr; el.style.width = size + "px"; el.style.height = size + "px"; }
      const g = el.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, size, size);
      // plate
      g.fillStyle = "#0e2c33";
      g.beginPath();
      g.roundRect(c * 0.5, c * 0.5, size - c, size - c, c * 0.4);
      g.fill();
      g.fillStyle = "#1b4650";
      for (let i = -GRID; i <= GRID; i++) for (let j = -GRID; j <= GRID; j++) {
        const [px, py] = toPx(i, j);
        g.beginPath(); g.arc(px, py, c * 0.1, 0, Math.PI * 2); g.fill();
      }
      const occupied = new Set(design.parts.map((p) => `${p.x},${p.y}`));
      const loose = looseParts(design);
      const connected = design.parts.filter((p) => !loose.has(p.id));
      const nextCells = new Set<string>();
      for (const p of connected) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const x = p.x + dx, y = p.y + dy, key = `${x},${y}`;
          if (Math.abs(x) <= GRID && Math.abs(y) <= GRID && !occupied.has(key)) nextCells.add(key);
        }
      }
      // empty cells touching the connected body: these are the safest places to grow
      g.fillStyle = "rgba(242,182,75,0.075)";
      g.strokeStyle = "rgba(242,182,75,0.2)";
      g.lineWidth = 1;
      for (const key of nextCells) {
        const [x, y] = key.split(",").map(Number);
        const [px, py] = toPx(x, y);
        g.beginPath(); g.roundRect(px - c * 0.38, py - c * 0.38, c * 0.76, c * 0.76, c * 0.13); g.fill(); g.stroke();
      }
      // forward marker
      g.fillStyle = "rgba(242,182,75,0.85)";
      g.beginPath(); g.moveTo(ox, c * 0.15); g.lineTo(ox - c * 0.22, c * 0.48); g.lineTo(ox + c * 0.22, c * 0.48); g.fill();
      // hover
      if (hover && mode !== "wire") {
        const [hx, hy] = toPx(hover[0], hover[1]);
        const taken = design.parts.some((p) => p.x === hover[0] && p.y === hover[1]);
        g.strokeStyle = mode === "erase" ? "rgba(240,69,79,0.9)" : taken ? "rgba(190,232,222,0.6)" : "rgba(242,182,75,0.9)";
        g.lineWidth = 2;
        g.beginPath(); g.roundRect(hx - c * 0.5, hy - c * 0.5, c, c, c * 0.18); g.stroke();
        if (mode === "place" && !taken && ghostKind) {
          g.save(); g.translate(hx, hy); drawPart(g, ghostKind, 0, c, { ghost: true, side: wingSide(hover[0]), time: t }); g.restore();
        }
      }
      if (mode === "wire" && wireFrom && hover) {
        const from = design.parts.find((p) => p.id === wireFrom);
        if (from) {
          const [ax, ay] = toPx(from.x, from.y);
          const [bx, by] = toPx(hover[0], hover[1]);
          g.save();
          g.strokeStyle = "rgba(185,156,255,0.78)";
          g.lineWidth = c * 0.08;
          g.setLineDash([c * 0.15, c * 0.1]);
          g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
          g.setLineDash([]);
          g.fillStyle = "rgba(185,156,255,0.9)";
          g.beginPath(); g.arc(bx, by, c * 0.13, 0, Math.PI * 2); g.fill();
          g.restore();
        }
      }
      // eye cones, faint, for the selected sensor
      const sel = design.parts.find((p) => p.id === selected);
      if (sel && PARTS[sel.kind].aims) {
        const [px, py] = toPx(sel.x, sel.y);
        const [fx, fy] = DIRS[sel.dir];
        const a0 = Math.atan2(fy, fx);
        const half = sel.kind === "eye" ? (62 * Math.PI) / 180 : sel.kind === "hair" ? (70 * Math.PI) / 180 : sel.kind === "nose" ? (30 * Math.PI) / 180 : 0.06;
        const R = sel.kind === "eye" ? c * 4.5 : sel.kind === "hair" ? c * 3 : sel.kind === "nose" ? c * 5 : c * 1.9;
        const cg = g.createRadialGradient(px, py, 0, px, py, R);
        cg.addColorStop(0, sel.kind === "eye" ? "rgba(255,240,180,0.35)" : sel.kind === "hair" ? "rgba(185,156,255,0.35)" : sel.kind === "nose" ? "rgba(255,200,150,0.4)" : "rgba(115,245,193,0.45)");
        cg.addColorStop(1, "rgba(255,240,180,0)");
        g.fillStyle = cg;
        g.beginPath(); g.moveTo(px, py); g.arc(px, py, R, a0 - half, a0 + half); g.closePath(); g.fill();
      }
      // nerves
      design.wires.forEach((x, i) => {
        const m = wireMid(i);
        if (!m) return;
        const live = sensed ? sensed.has(x.from) !== x.inv : false;
        g.strokeStyle = live ? "#e2d6ff" : "#b99cff";
        g.lineWidth = c * 0.11;
        g.lineCap = "round";
        g.beginPath(); g.moveTo(m.ax, m.ay); g.quadraticCurveTo(m.cx, m.cy, m.bx, m.by); g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.5)";
        g.lineWidth = c * 0.025;
        g.setLineDash([c * 0.08, c * 0.16]);
        g.lineDashOffset = -t * 0.03;
        g.beginPath(); g.moveTo(m.ax, m.ay); g.quadraticCurveTo(m.cx, m.cy, m.bx, m.by); g.stroke();
        g.setLineDash([]);
        // a badge in the middle: plain, NOT, and for a memory cell which input (S set / R reset)
        const toMem = PARTS[design.parts.find((p) => p.id === x.to)?.kind ?? "body"].brain === "memory";
        const reset = toMem && x.port === "reset";
        g.fillStyle = x.inv ? "#f08a6a" : reset ? "#3a5bd0" : "#2a1d4a";
        g.beginPath(); g.arc(m.mx, m.my, c * 0.22, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#b99cff"; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = x.inv ? "#2a0d10" : "#e2d6ff";
        g.font = `800 ${Math.round(c * 0.2)}px ui-monospace, monospace`;
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText((x.inv ? "¬" : "") + (toMem ? (reset ? "R" : "S") : x.inv ? "" : "→"), m.mx, m.my + 1);
      });
      // parts: wings under
      const parts = [...design.parts].sort((a, b) => (isWing(a.kind) ? 0 : 1) - (isWing(b.kind) ? 0 : 1));
      for (const p of parts) {
        const [px, py] = toPx(p.x, p.y);
        g.save();
        g.translate(px, py);
        drawPart(g, p.kind, p.dir, c, { side: wingSide(p.x), time: t, bad: loose.has(p.id), on: sensed?.has(p.id) });
        g.restore();
        if (PARTS[p.kind].aims) {
          const [fx, fy] = DIRS[p.dir];
          g.fillStyle = "rgba(255,255,255,0.85)";
          g.beginPath();
          g.moveTo(px + fx * c * 0.5, py + fy * c * 0.5);
          g.lineTo(px + fx * c * 0.32 - fy * c * 0.1, py + fy * c * 0.32 + fx * c * 0.1);
          g.lineTo(px + fx * c * 0.32 + fy * c * 0.1, py + fy * c * 0.32 - fx * c * 0.1);
          g.fill();
        }
        if (p.id === selected || p.id === wireFrom) {
          g.strokeStyle = p.id === wireFrom ? "#b99cff" : "#f2b64b";
          g.lineWidth = 3;
          g.shadowColor = p.id === wireFrom ? "#b99cff" : "#f2b64b";
          g.shadowBlur = c * 0.25;
          g.beginPath(); g.roundRect(px - c * 0.55, py - c * 0.55, c * 1.1, c * 1.1, c * 0.22); g.stroke();
          g.shadowBlur = 0;
        }
        if (mode === "wire") {
          // green dot: a nerve can start here; purple dot: a nerve can end here
          if (isSource(p.kind)) { g.fillStyle = "#73f5c1"; g.beginPath(); g.arc(px + c * 0.36, py - c * 0.36, c * 0.1, 0, Math.PI * 2); g.fill(); }
          if (isSink(p.kind)) { g.fillStyle = "#b99cff"; g.beginPath(); g.arc(px - c * 0.36, py - c * 0.36, c * 0.1, 0, Math.PI * 2); g.fill(); }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });

  const cellAt = (e: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    const r = cv.current!.getBoundingClientRect();
    const x = Math.round((e.clientX - r.left - ox) / c), y = Math.round((e.clientY - r.top - oy) / c);
    if (Math.abs(x) > GRID || Math.abs(y) > GRID) return null;
    return [x, y] as [number, number];
  };

  return (
    <div className="ws-plate" ref={wrap}>
      <canvas
        ref={cv}
        onMouseMove={(e) => setHover(cellAt(e))}
        onMouseLeave={() => setHover(null)}
        onPointerMove={(e) => setHover(cellAt(e))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const r = cv.current!.getBoundingClientRect();
          const mx = e.clientX - r.left, my = e.clientY - r.top;
          if (mode === "wire") {
            for (let i = 0; i < design.wires.length; i++) {
              const m = wireMid(i);
              if (m && Math.hypot(m.mx - mx, m.my - my) < c * 0.28) { onWire(i); return; }
            }
          }
          const cell = cellAt(e);
          if (cell) onCell(cell[0], cell[1]);
        }}
        style={{ touchAction: "none" }}
        aria-label="build grid"
      />
    </div>
  );
}
