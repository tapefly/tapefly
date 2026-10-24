"use client";

/* ── Petri.tsx ───────────────────────────────────────────────────────────────
   The dish, drawn the way it would look under a darkfield microscope: an amber
   agar disc lit from the top (the engine's light field is bright at the top
   row and dark at the bottom), a hemocytometer grid etched over the 21×21
   world, yeast drops for food and red-rimmed traps for danger.

   Flies are drawn as flies. Between ticks they fly the step with an eased
   curve, fluttering; a frozen fly folds its wings. Meals ripple, a Giant Fibre
   escape is a hop with a streak, a trap death flashes red and the fly tips over;
   a starved fly greys out where it stands.

   Everything is a function of the clock's playhead, so scrubbing backwards
   draws exactly what playing forwards drew. The canvas never owns state that
   matters — it only reads the day.
   --------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";
import type { Clock } from "./clock";
import { prefersReducedMotion } from "./clock";
import { C, BEHAVIOUR_COLOR } from "./tokens";

export interface PetriTick {
  x: number;
  y: number;
  behavior: string;
  gf: boolean;
  ate: boolean;
  alive: boolean;
}

export interface PetriFly {
  name: string;
  hue: string;
  ticks: PetriTick[];
  you?: boolean;
}

export interface PetriWorld {
  w: number;
  h: number;
  food: { x: number; y: number }[];
  danger: { x: number; y: number }[];
}

interface Props {
  world: PetriWorld;
  flies: PetriFly[];
  clock: Clock;
  focus: number | null;
  onPick?: (i: number) => void;
  /** Draw every fly's name, not only the focused one. */
  labels?: boolean;
  className?: string;
  ariaLabel?: string;
}

const TAU = Math.PI * 2;
const ease = (f: number) => f * f * (3 - 2 * f);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ── geometry ─────────────────────────────────────────────────────────────── */

interface Geo {
  size: number;
  cx: number;
  cy: number;
  R: number; // agar radius
  gx: number; // grid origin
  gy: number;
  cell: number;
}

function geometry(size: number, w: number, h: number): Geo {
  const cx = size / 2, cy = size / 2;
  const R = size * 0.47;
  const side = R * Math.SQRT2 * 0.985; // the square grid sits inside the disc
  const cell = side / Math.max(w, h);
  return { size, cx, cy, R, gx: cx - (cell * w) / 2, gy: cy - (cell * h) / 2, cell };
}

const px = (g: Geo, x: number) => g.gx + (x + 0.5) * g.cell;
const py = (g: Geo, y: number) => g.gy + (y + 0.5) * g.cell;

/* ── where a fly is at a fractional tick ──────────────────────────────────── */

interface Pose {
  x: number; // in cells
  y: number;
  angle: number;
  moving: boolean;
  behavior: string;
  hop: number; // 0..1, Giant Fibre jump height
  deadFor: number; // ticks since death, or -1
  trapped: boolean;
}

function headingAt(ticks: PetriTick[], k: number): number {
  for (let i = Math.min(k, ticks.length - 1); i >= 1; i--) {
    const dx = ticks[i].x - ticks[i - 1].x, dy = ticks[i].y - ticks[i - 1].y;
    if (dx || dy) return Math.atan2(dy, dx);
  }
  return -Math.PI / 2;
}

function lerpAngle(a: number, b: number, f: number) {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return a + d * f;
}

function poseAt(fly: PetriFly, tau: number, world: PetriWorld): Pose {
  const T = fly.ticks;
  const n = T.length;
  const last = n - 1;
  if (tau >= last) {
    const p = T[last];
    const dead = !p.alive;
    return {
      x: p.x, y: p.y, angle: headingAt(T, last), moving: false, behavior: p.behavior, hop: 0,
      deadFor: dead ? tau - last : -1,
      trapped: dead && world.danger.some((c) => c.x === p.x && c.y === p.y)
    };
  }
  const k = Math.max(0, Math.floor(tau));
  const f = tau - k;
  const a = T[k], b = T[k + 1];
  const e = ease(f);
  const moving = a.x !== b.x || a.y !== b.y;
  const from = headingAt(T, k);
  const to = moving ? Math.atan2(b.y - a.y, b.x - a.x) : from;
  return {
    x: a.x + (b.x - a.x) * e,
    y: a.y + (b.y - a.y) * e,
    angle: lerpAngle(from, to, clamp01(f * 2.2)),
    moving,
    behavior: b.behavior,
    hop: b.gf ? Math.sin(Math.PI * f) : 0,
    deadFor: -1,
    trapped: false
  };
}

/* ── drawing ──────────────────────────────────────────────────────────────── */

function drawDish(ctx: CanvasRenderingContext2D, g: Geo, world: PetriWorld) {
  const { cx, cy, R } = g;

  // a soft pool of light on the bench under the dish
  const pool = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.12);
  pool.addColorStop(0, "rgba(242,182,75,0.10)");
  pool.addColorStop(1, "rgba(242,182,75,0)");
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.12, 0, TAU);
  ctx.fill();

  // glass wall
  ctx.beginPath();
  ctx.arc(cx, cy, R + g.size * 0.018, 0, TAU);
  ctx.fillStyle = "rgba(200,230,225,0.05)";
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(220,240,235,0.22)";
  ctx.stroke();

  // agar
  const agar = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.35, R * 0.1, cx, cy, R);
  agar.addColorStop(0, "#3A2C12");
  agar.addColorStop(0.55, "#2A2110");
  agar.addColorStop(1, "#150F07");
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = agar;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();

  // the lamp: the engine's light field is bright at the top row, dark at the bottom
  const lamp = ctx.createLinearGradient(0, g.gy, 0, g.gy + g.cell * world.h);
  lamp.addColorStop(0, "rgba(255,226,160,0.16)");
  lamp.addColorStop(0.55, "rgba(255,226,160,0.03)");
  lamp.addColorStop(1, "rgba(0,0,0,0.30)");
  ctx.fillStyle = lamp;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // hemocytometer grid over the world
  ctx.lineWidth = 1;
  for (let i = 0; i <= world.w; i++) {
    const major = i % 7 === 0;
    ctx.strokeStyle = major ? "rgba(242,182,75,0.16)" : "rgba(242,182,75,0.06)";
    const x = Math.round(g.gx + i * g.cell) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, g.gy); ctx.lineTo(x, g.gy + world.h * g.cell); ctx.stroke();
  }
  for (let j = 0; j <= world.h; j++) {
    const major = j % 7 === 0;
    ctx.strokeStyle = major ? "rgba(242,182,75,0.16)" : "rgba(242,182,75,0.06)";
    const y = Math.round(g.gy + j * g.cell) + 0.5;
    ctx.beginPath(); ctx.moveTo(g.gx, y); ctx.lineTo(g.gx + world.w * g.cell, y); ctx.stroke();
  }
  ctx.restore();

  // meniscus: a bright rim on the upper left, as if lit from above
  ctx.lineWidth = g.size * 0.006;
  const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  rim.addColorStop(0, "rgba(255,240,210,0.55)");
  rim.addColorStop(0.45, "rgba(255,240,210,0.05)");
  rim.addColorStop(1, "rgba(255,240,210,0.18)");
  ctx.strokeStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, R - g.size * 0.004, 0, TAU);
  ctx.stroke();
}

function drawFood(ctx: CanvasRenderingContext2D, g: Geo, x: number, y: number, scale: number, wall: number, seed: number) {
  if (scale <= 0.01) return;
  const X = px(g, x), Y = py(g, y);
  const r = g.cell * 0.3 * scale * (1 + 0.05 * Math.sin(wall * 1.6 + seed));
  const glow = ctx.createRadialGradient(X, Y, 0, X, Y, r * 3.2);
  glow.addColorStop(0, "rgba(163,227,106,0.32)");
  glow.addColorStop(1, "rgba(163,227,106,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(X, Y, r * 3.2, 0, TAU); ctx.fill();
  const drop = ctx.createRadialGradient(X - r * 0.35, Y - r * 0.4, r * 0.1, X, Y, r);
  drop.addColorStop(0, "#E9FFD0");
  drop.addColorStop(0.35, C.yeast);
  drop.addColorStop(1, "#4E8A2A");
  ctx.fillStyle = drop;
  ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill();
}

function drawTrap(ctx: CanvasRenderingContext2D, g: Geo, x: number, y: number, wall: number, seed: number) {
  const X = px(g, x), Y = py(g, y);
  const r = g.cell * 0.42;
  // slow rings, like something waiting
  for (let k = 0; k < 2; k++) {
    const ph = ((wall * 0.45 + k * 0.5 + seed * 0.13) % 1 + 1) % 1;
    ctx.strokeStyle = `rgba(240,69,79,${0.35 * (1 - ph)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(X, Y, r * (1 + ph * 1.6), 0, TAU); ctx.stroke();
  }
  const pit = ctx.createRadialGradient(X, Y, 0, X, Y, r);
  pit.addColorStop(0, "#09090B");
  pit.addColorStop(0.65, "#2A0B10");
  pit.addColorStop(1, "rgba(240,69,79,0.9)");
  ctx.fillStyle = pit;
  ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(255,140,140,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(X, Y, r, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
}

function ripple(ctx: CanvasRenderingContext2D, g: Geo, x: number, y: number, age: number, color: string, big: boolean) {
  if (age < 0 || age > 1.6) return;
  const X = px(g, x), Y = py(g, y);
  const f = age / 1.6;
  ctx.strokeStyle = color;
  ctx.globalAlpha = (1 - f) * (big ? 0.9 : 0.5);
  ctx.lineWidth = big ? 2 : 1.2;
  ctx.beginPath(); ctx.arc(X, Y, g.cell * (0.3 + f * (big ? 1.6 : 1.0)), 0, TAU); ctx.stroke();
  if (big) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.4;
      const d = g.cell * (0.35 + f * 1.3);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(X + Math.cos(a) * d, Y + Math.sin(a) * d, g.cell * 0.05 * (1 - f) + 0.5, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

interface FlyLook {
  hue: string;
  focus: boolean;
  you: boolean;
  wing: number; // 0 folded .. 1 open
  flutter: number; // phase
  dead: number; // 0 alive .. 1 fully dead
  trapped: boolean;
  dim: boolean;
}

function drawFly(ctx: CanvasRenderingContext2D, X: number, Y: number, angle: number, s: number, hop: number, L: FlyLook) {
  ctx.save();
  ctx.translate(X, Y);

  // shadow on the agar (further away while hopping)
  ctx.fillStyle = `rgba(0,0,0,${0.35 - hop * 0.15})`;
  ctx.beginPath(); ctx.ellipse(s * 0.08 + hop * s * 0.5, s * 0.12 + hop * s * 0.7, s * 0.42, s * 0.24, angle, 0, TAU); ctx.fill();

  // identity halo
  if (!L.dim) {
    ctx.strokeStyle = L.hue;
    if (L.focus || L.you) {
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.78, 0, TAU); ctx.stroke();
    } else {
      // a small identity dot behind the abdomen, so sisters stay tellable apart
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = L.hue;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.11 + 1.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, TAU); ctx.stroke();
    }
    if (L.focus) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = L.hue;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.95, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const lift = 1 + hop * 0.35;
  ctx.scale(lift, lift);
  ctx.rotate(angle + (L.dead > 0 ? L.dead * 0.9 : 0));
  if (L.dim) ctx.globalAlpha = 0.45;

  const grey = L.dead;
  const tint = (c: [number, number, number]) => {
    const gv = (c[0] + c[1] + c[2]) / 3;
    const m = (v: number) => Math.round(v + (gv * 0.7 - v) * grey);
    return `rgb(${m(c[0])},${m(c[1])},${m(c[2])})`;
  };

  // wings: behind the body. open = spread, folded = laid back over the abdomen
  const spread = 0.18 + L.wing * (0.5 + 0.28 * Math.sin(L.flutter));
  ctx.fillStyle = "rgba(214,232,255,0.30)";
  ctx.strokeStyle = "rgba(230,242,255,0.55)";
  ctx.lineWidth = 0.8;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(Math.PI + side * spread);
    ctx.beginPath(); ctx.ellipse(s * 0.34, 0, s * 0.36, s * 0.13, 0, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // abdomen with stripes
  ctx.fillStyle = tint([206, 162, 92]);
  ctx.beginPath(); ctx.ellipse(-s * 0.2, 0, s * 0.28, s * 0.17, 0, 0, TAU); ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = tint([82, 54, 24]);
  for (const sx of [-0.12, -0.24, -0.36]) ctx.fillRect(s * sx - s * 0.03, -s * 0.2, s * 0.05, s * 0.4);
  ctx.restore();

  // thorax
  ctx.fillStyle = tint([170, 128, 70]);
  ctx.beginPath(); ctx.ellipse(s * 0.08, 0, s * 0.15, s * 0.14, 0, 0, TAU); ctx.fill();

  // head and the red eyes
  ctx.fillStyle = tint([150, 110, 60]);
  ctx.beginPath(); ctx.arc(s * 0.27, 0, s * 0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = L.dead > 0.5 ? "#6b5a5a" : L.trapped && L.dead > 0 ? "#7a1c22" : "#E33A44";
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(s * 0.29, side * s * 0.085, s * 0.075, s * 0.06, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.arc(s * 0.31, side * s * 0.075 - s * 0.02, s * 0.018, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ── the component ────────────────────────────────────────────────────────── */

export default function Petri({ world, flies, clock, focus, onPick, labels, className, ariaLabel }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const geo = useRef<Geo | null>(null);
  const live = useRef({ world, flies, focus, hover, labels: !!labels });
  live.current = { world, flies, focus, hover, labels: !!labels };

  useEffect(() => {
    const el = canvas.current!, box = wrap.current!;
    const ctx = el.getContext("2d")!;
    const reduce = prefersReducedMotion();
    let raf = 0;
    let visible = true;

    const fit = () => {
      const size = box.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(size * dpr);
      el.height = Math.round(size * dpr);
      el.style.width = el.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      geo.current = geometry(size, live.current.world.w, live.current.world.h);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(box);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || !geo.current) return;
      const g = geo.current;
      const { world, flies, focus, hover, labels } = live.current;
      const tau = clock.t.current;
      const wall = reduce ? 0 : now / 1000;

      ctx.clearRect(0, 0, g.size, g.size);
      drawDish(ctx, g, world);

      // food: drawn whole until the focused fly (or the first fly) eats it
      const ref = flies[focus ?? 0];
      const eatenAt = new Map<number, number>();
      if (ref) ref.ticks.forEach((t, k) => { if (t.ate) eatenAt.set(t.y * world.w + t.x, k); });
      world.food.forEach((c, i) => {
        const at = eatenAt.get(c.y * world.w + c.x);
        const s = at === undefined ? 1 : 1 - clamp01((tau - at + 0.3) / 0.8);
        drawFood(ctx, g, c.x, c.y, s, wall, i);
      });
      world.danger.forEach((c, i) => drawTrap(ctx, g, c.x, c.y, wall, i));

      // trails
      flies.forEach((fly, i) => {
        const isF = i === focus;
        const T = fly.ticks;
        const k = Math.min(Math.floor(tau), T.length - 1);
        if (isF) {
          ctx.strokeStyle = fly.hue;
          ctx.globalAlpha = 0.14;
          ctx.lineWidth = 1;
          ctx.beginPath();
          T.forEach((t, j) => (j === 0 ? ctx.moveTo(px(g, t.x), py(g, t.y)) : ctx.lineTo(px(g, t.x), py(g, t.y))));
          ctx.stroke();
        }
        const span = isF ? 22 : 12;
        const p = poseAt(fly, tau, world);
        let prevX = px(g, p.x), prevY = py(g, p.y);
        for (let j = k; j >= Math.max(0, k - span); j--) {
          const t = T[j];
          const age = (tau - j) / span;
          ctx.strokeStyle = fly.you ? C.agar : fly.hue;
          ctx.globalAlpha = Math.max(0, (1 - age)) * (isF || fly.you ? 0.75 : 0.32);
          ctx.lineWidth = (isF || fly.you ? 2.4 : 1.4) * (1 - age * 0.6);
          ctx.lineCap = "round";
          const X = px(g, t.x), Y = py(g, t.y);
          ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(X, Y); ctx.stroke();
          prevX = X; prevY = Y;
        }
        ctx.globalAlpha = 1;
      });

      // meal ripples and escape streaks
      flies.forEach((fly, i) => {
        const isF = i === focus || !!fly.you;
        const k = Math.floor(tau);
        for (let j = Math.max(0, k - 2); j <= Math.min(k, fly.ticks.length - 1); j++) {
          const t = fly.ticks[j];
          if (t.ate) ripple(ctx, g, t.x, t.y, tau - j, isF ? C.yeast : fly.hue, isF);
        }
      });

      // flies — the focused one last, on top
      const placed: { x: number; y: number; w: number }[] = []; // labels drawn so far, so two flies on one cell don't print over each other
      const order = flies.map((_, i) => i).filter((i) => i !== focus);
      if (focus !== null && flies[focus]) order.push(focus);
      for (const i of order) {
        const fly = flies[i];
        const p = poseAt(fly, tau, world);
        const X = px(g, p.x), Y = py(g, p.y);
        const s = g.cell * 1.55;
        const deadF = p.deadFor < 0 ? 0 : clamp01(p.deadFor / 1.2);
        if (p.deadFor >= 0 && p.trapped && p.deadFor < 1.4) {
          const f = p.deadFor / 1.4;
          ctx.fillStyle = `rgba(240,69,79,${0.5 * (1 - f)})`;
          ctx.beginPath(); ctx.arc(X, Y, g.cell * (0.6 + f * 1.8), 0, TAU); ctx.fill();
        }
        if (p.hop > 0) {
          // the escape streak
          ctx.strokeStyle = `rgba(242,182,75,${0.6 * p.hop})`;
          ctx.lineWidth = s * 0.25;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(X - Math.cos(p.angle) * s * 1.4, Y - Math.sin(p.angle) * s * 1.4);
          ctx.lineTo(X, Y);
          ctx.stroke();
        }
        const moving = p.moving || (p.behavior !== "freeze" && p.deadFor < 0);
        const wing = deadF > 0 ? 0.45 * deadF : p.behavior === "freeze" ? 0 : moving ? 1 : 0.4;
        drawFly(ctx, X, Y, p.angle, s, p.hop, {
          hue: fly.you ? C.agar : fly.hue,
          focus: i === focus,
          you: !!fly.you,
          wing,
          flutter: reduce ? 0 : (wall * 38 + i * 1.7) * (moving && deadF === 0 ? 1 : 0.08),
          dead: deadF,
          trapped: p.trapped,
          dim: focus !== null && i !== focus && !fly.you && deadF > 0
        });

        const showLabel = labels || i === focus || i === hover || fly.you;
        if (showLabel) {
          const label = fly.name;
          ctx.font = "600 12px 'Bricolage Grotesque Variable', system-ui, sans-serif";
          const w = ctx.measureText(label).width + 12;
          const lx = Math.min(g.size - w - 4, Math.max(4, X - w / 2));
          let ly = Y - s * 1.25 - 16;
          while (placed.some((q) => Math.abs(q.y - ly) < 19 && lx < q.x + q.w && q.x < lx + w)) ly -= 20;
          placed.push({ x: lx, y: ly, w });
          ctx.fillStyle = "rgba(6,25,30,0.82)";
          ctx.beginPath();
          ctx.roundRect(lx, ly, w, 18, 9);
          ctx.fill();
          ctx.fillStyle = fly.you ? C.agar : fly.hue;
          ctx.fillText(label, lx + 6, ly + 13);
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [clock.t]);

  const nearest = (e: { clientX: number; clientY: number }) => {
    const g = geo.current;
    if (!g) return null;
    const r = canvas.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best: number | null = null, bd = Infinity;
    flies.forEach((fly, i) => {
      const p = poseAt(fly, clock.t.current, world);
      const d = Math.hypot(px(g, p.x) - mx, py(g, p.y) - my);
      if (d < bd) { bd = d; best = i; }
    });
    return bd < g.cell * 1.6 ? best : null;
  };

  return (
    <div ref={wrap} className={`petri ${className ?? ""}`}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={ariaLabel ?? "The dish: flies, food and traps / 培养皿：果蝇、食物和陷阱"}
        onPointerMove={(e) => setHover(nearest(e))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => { const i = nearest(e); if (i !== null) onPick?.(i); }}
        style={{ cursor: hover !== null && onPick ? "pointer" : "default" }}
      />
    </div>
  );
}

export { BEHAVIOUR_COLOR };
