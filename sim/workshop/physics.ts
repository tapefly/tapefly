/* ── sim/workshop/physics.ts ─────────────────────────────────────────────────
   The world a built fly is let loose in: a top-down arena, seen from above,
   with walls, sugar, sugar cubes that can be knocked about, and spiders.

   The fly is one rigid body made of round parts. Each tick:
     1. every sensor reads the world (eyes see sugar, antennae touch walls,
        spider hair feels spiders, the core's heartbeat is always on);
     2. the wiring decides which wings are powered;
     3. a powered wing pushes forward at its own position, so wings off the
        centre line also turn the fly;
     4. drag (much stronger sideways than forwards, so it flies like a dart),
        then collisions; a part hit harder than it can take breaks off and
        tumbles away as debris.
   Fixed step, no randomness: the same design in the same level always plays
   out the same way.
   --------------------------------------------------------------------------- */
import { DIRS, PARTS, isWing, massProps, type Design, type PartKind } from "./parts";
import { brainTick, emptyBrain, gateOrder, type BrainState } from "./brain";

export const DT = 1 / 60;
const R = 0.42; // radius of every part and cube
const DRAG_F = 1.6, DRAG_S = 7, DRAG_W = 4.5;
const CUBE_DRAG = 3.2;
/** a stacked cube holds until hit this hard (a light fly bounces off the tower; a heavy one breaks in) */
const STICK = 22, STICK_CHAIN = 0.5;

export interface Rect { x: number; y: number; w: number; h: number }
export interface Setup {
  w: number;
  h: number;
  start: { x: number; y: number; a: number };
  walls: Rect[];
  /** sugar to reach: touching one eats it */
  sugar: { x: number; y: number }[];
  /** sugar cubes stacked as a tower: [x, y] of each */
  cubes: [number, number][];
  spiders: { x: number; y: number }[];
  /** home: noses smell it; "home" goals end here */
  nest?: { x: number; y: number };
  /** glass sugar: touching it faster than this (units/s) shatters it */
  fragile?: number;
}

export interface BodyPart {
  id: string;
  kind: PartKind;
  /** local position relative to the centre of mass */
  lx: number;
  ly: number;
  dir: number;
  /** last sensed value / powered state, for drawing */
  on: boolean;
}

export interface Debris { kind: PartKind; x: number; y: number; vx: number; vy: number; a: number; w: number }
export interface Cube { x: number; y: number; vx: number; vy: number; a: number; w: number; x0: number; y0: number; knocked: boolean; rest: boolean }

export interface World {
  setup: Setup;
  design: Design;
  t: number;
  x: number; y: number; a: number;
  vx: number; vy: number; w: number;
  mass: number; inertia: number;
  parts: BodyPart[];
  debris: Debris[];
  cubes: Cube[];
  eaten: boolean[];
  knocked: number;
  caught: number; // index of the spider, −1
  /** shattered glass sugar */
  smashed: boolean;
  brain: BrainState;
  order: ReturnType<typeof gateOrder>;
  /** tick of the last sugar eaten (for the mouth), −∞ before */
  ateAt: number;
  /** tick the level's goal was first met, −1 before (for goals that must then be held) */
  doneAt: number;
  events: { t: number; kind: "hit" | "break" | "eat" | "caught" | "knock" | "smash"; x: number; y: number; power: number; part?: PartKind }[];
}

const rot = (a: number, x: number, y: number) => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y] as const;

export function makeWorld(setup: Setup, design: Design): World {
  const mp = massProps(design.parts);
  const parts: BodyPart[] = design.parts.map((p) => ({ id: p.id, kind: p.kind, lx: p.x - mp.cx, ly: p.y - mp.cy, dir: p.dir, on: false }));
  // place the core at the start point
  const [ox, oy] = rot(setup.start.a, -mp.cx, -mp.cy);
  return {
    setup, design, t: 0,
    x: setup.start.x - ox, y: setup.start.y - oy, a: setup.start.a,
    vx: 0, vy: 0, w: 0,
    mass: mp.mass, inertia: mp.inertia,
    parts,
    debris: [],
    cubes: setup.cubes.map(([x, y]) => ({ x, y, vx: 0, vy: 0, a: 0, w: 0, x0: x, y0: y, knocked: false, rest: true })),
    eaten: setup.sugar.map(() => false),
    knocked: 0,
    caught: -1,
    smashed: false,
    brain: emptyBrain(),
    order: gateOrder(design),
    ateAt: -1e9,
    doneAt: -1,
    events: []
  };
}

export const partWorld = (w: World, p: BodyPart) => { const [dx, dy] = rot(w.a, p.lx, p.ly); return [w.x + dx, w.y + dy] as const; };

/* ── sensing ───────────────────────────────────────────────────────────────── */

function segHitsRect(x0: number, y0: number, x1: number, y1: number, r: Rect) {
  // Liang–Barsky
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  return clip(-dx, x0 - r.x) && clip(dx, r.x + r.w - x0) && clip(-dy, y0 - r.y) && clip(dy, r.y + r.h - y0) && t0 <= t1;
}

const EYE_RANGE = 30, EYE_HALF = (62 * Math.PI) / 180;
const HAIR_RANGE = 4.5, HAIR_HALF = (70 * Math.PI) / 180;
const ANT_LEN = 1.9;
const NOSE_HALF = (30 * Math.PI) / 180;
const TASTE_TICKS = 15;
export const CLOCK_HALF = 6; // ticks on, then ticks off (5 beats a second)

function facing(w: World, p: BodyPart) {
  const [dx, dy] = DIRS[p.dir];
  return rot(w.a, dx, dy);
}

function inCone(px: number, py: number, fx: number, fy: number, tx: number, ty: number, range: number, half: number) {
  const dx = tx - px, dy = ty - py;
  const d = Math.hypot(dx, dy);
  if (d > range || d < 1e-6) return false;
  return (dx * fx + dy * fy) / d >= Math.cos(half);
}

export function sense(w: World, p: BodyPart): boolean {
  const spec = PARTS[p.kind];
  if (spec.sense === "heartbeat") return true;
  if (spec.sense === "clock") return Math.floor(w.t / CLOCK_HALF) % 2 === 0;
  if (spec.sense === "taste") return w.t - w.ateAt < TASTE_TICKS;
  const [px, py] = partWorld(w, p);
  const [fx, fy] = facing(w, p);
  const S = w.setup;
  if (spec.sense === "wall") {
    const ex = px + fx * ANT_LEN, ey = py + fy * ANT_LEN;
    if (ex < 0 || ey < 0 || ex > S.w || ey > S.h) return true;
    return S.walls.some((r) => segHitsRect(px, py, ex, ey, r));
  }
  if (spec.sense === "nest") {
    const n = S.nest;
    return !!n && inCone(w.x, w.y, fx, fy, n.x, n.y, 200, NOSE_HALF) && !S.walls.some((r) => segHitsRect(px, py, n.x, n.y, r));
  }
  if (spec.sense === "spider") return S.spiders.some((s) => inCone(px, py, fx, fy, s.x, s.y, HAIR_RANGE, HAIR_HALF));
  if (spec.sense === "sugar") {
    // eyes judge direction from the body's centre (no parallax at close range), line of sight from the eye
    const seen = (tx: number, ty: number) => inCone(w.x, w.y, fx, fy, tx, ty, EYE_RANGE, EYE_HALF) && !S.walls.some((r) => segHitsRect(px, py, tx, ty, r));
    return S.sugar.some((s, i) => !w.eaten[i] && seen(s.x, s.y)) || w.cubes.some((c) => !c.knocked && seen(c.x, c.y));
  }
  return false;
}

/* ── one tick ──────────────────────────────────────────────────────────────── */

function rectContact(cx: number, cy: number, r: Rect) {
  const qx = Math.max(r.x, Math.min(cx, r.x + r.w)), qy = Math.max(r.y, Math.min(cy, r.y + r.h));
  let dx = cx - qx, dy = cy - qy;
  let d = Math.hypot(dx, dy);
  if (d >= R) return null;
  if (d < 1e-9) {
    // centre inside: push out the nearest side
    const l = cx - r.x, rr = r.x + r.w - cx, t = cy - r.y, b = r.y + r.h - cy;
    const m = Math.min(l, rr, t, b);
    if (m === l) { dx = -1; dy = 0; } else if (m === rr) { dx = 1; dy = 0; } else if (m === t) { dx = 0; dy = -1; } else { dx = 0; dy = 1; }
    return { nx: dx, ny: dy, pen: R + m };
  }
  return { nx: dx / d, ny: dy / d, pen: R - d };
}

function arenaRects(S: Setup): Rect[] {
  return [
    ...S.walls,
    { x: -5, y: -5, w: S.w + 10, h: 5 },
    { x: -5, y: S.h, w: S.w + 10, h: 5 },
    { x: -5, y: 0, w: 5, h: S.h },
    { x: S.w, y: 0, w: 5, h: S.h }
  ];
}

function breakOff(w: World, p: BodyPart, power: number) {
  const [px, py] = partWorld(w, p);
  const rx = px - w.x, ry = py - w.y;
  w.debris.push({ kind: p.kind, x: px, y: py, vx: w.vx - w.w * ry, vy: w.vy + w.w * rx, a: w.a, w: w.w * 2 + (power % 3) - 1 });
  w.events.push({ t: w.t, kind: "break", x: px, y: py, power, part: p.kind });
  // recompute the body without it, keeping every other part where it is in the world
  const rest = w.parts.filter((q) => q !== p);
  const mp = massProps(rest.map((q) => ({ kind: q.kind, x: q.lx, y: q.ly })));
  const [sx, sy] = rot(w.a, mp.cx, mp.cy);
  w.x += sx; w.y += sy;
  // velocity of the new centre of mass
  w.vx += -w.w * sy; w.vy += w.w * sx;
  for (const q of rest) { q.lx -= mp.cx; q.ly -= mp.cy; }
  w.parts = rest;
  w.mass = mp.mass;
  w.inertia = mp.inertia;
}

export function step(w: World): void {
  const S = w.setup;
  const present = new Set(w.parts.map((p) => p.id));
  const sensed = new Map<string, boolean>();
  for (const p of w.parts) if (PARTS[p.kind].sense) sensed.set(p.id, sense(w, p));
  const tick = brainTick(w.design, sensed, present, w.brain, w.order);
  w.brain = tick.next;
  for (const p of w.parts) p.on = tick.out.get(p.id) ?? false;
  const on = tick.wings;

  // forces
  let fx = 0, fy = 0, tq = 0;
  const [ffx, ffy] = rot(w.a, 0, -1);
  for (const p of w.parts) {
    if (!isWing(p.kind)) continue;
    const pw = on.get(p.id) ?? false;
    p.on = pw;
    if (!pw) continue;
    const T = PARTS[p.kind].thrust!;
    const Fx = ffx * T, Fy = ffy * T;
    const [rx, ry] = rot(w.a, p.lx, p.ly);
    fx += Fx; fy += Fy;
    tq += rx * Fy - ry * Fx;
  }
  w.vx += (fx / w.mass) * DT;
  w.vy += (fy / w.mass) * DT;
  w.w += (tq / w.inertia) * DT;
  // anisotropic drag
  const vf = w.vx * ffx + w.vy * ffy;
  const sxv = -ffy, syv = ffx;
  const vs = w.vx * sxv + w.vy * syv;
  const nf = vf * Math.exp(-DRAG_F * DT), ns = vs * Math.exp(-DRAG_S * DT);
  w.vx = ffx * nf + sxv * ns;
  w.vy = ffy * nf + syv * ns;
  w.w *= Math.exp(-DRAG_W * DT);
  w.x += w.vx * DT;
  w.y += w.vy * DT;
  w.a += w.w * DT;

  const rects = arenaRects(S);

  // fly vs walls (antennae are flexible: they feel, they do not collide)
  for (const p of w.parts.slice()) {
    if (!w.parts.includes(p) || p.kind === "antenna") continue;
    const [px, py] = partWorld(w, p);
    for (const r of rects) {
      const c = rectContact(px, py, r);
      if (!c) continue;
      w.x += c.nx * c.pen;
      w.y += c.ny * c.pen;
      const rx = px - w.x, ry = py - w.y;
      const vpx = w.vx - w.w * ry, vpy = w.vy + w.w * rx;
      const vn = vpx * c.nx + vpy * c.ny;
      if (vn >= 0) continue;
      const rn = rx * c.ny - ry * c.nx;
      const j = (-(1 + 0.25) * vn) / (1 / w.mass + (rn * rn) / w.inertia);
      w.vx += (j * c.nx) / w.mass;
      w.vy += (j * c.ny) / w.mass;
      w.w += (rn * j) / w.inertia;
      if (j > 1.5) w.events.push({ t: w.t, kind: "hit", x: px - c.nx * R, y: py - c.ny * R, power: j, part: p.kind });
      if (j > PARTS[p.kind].hp && w.parts.length > 1) { breakOff(w, p, j); break; }
    }
  }

  // fly vs cubes
  for (const p of w.parts.slice()) {
    if (!w.parts.includes(p) || p.kind === "antenna") continue;
    const [px, py] = partWorld(w, p);
    for (const c of w.cubes) {
      const dx = c.x - px, dy = c.y - py;
      const d = Math.hypot(dx, dy);
      if (d >= 2 * R || d < 1e-9) continue;
      const nx = dx / d, ny = dy / d, pen = 2 * R - d;
      const mc = 0.45;
      const rx0 = px - w.x, ry0 = py - w.y;
      const vpx0 = w.vx - w.w * ry0, vpy0 = w.vy + w.w * rx0;
      const vn0 = (c.vx - vpx0) * nx + (c.vy - vpy0) * ny;
      const rn0 = rx0 * ny - ry0 * nx;
      if (c.rest) {
        // against a stacked cube the fly hits the whole tower
        const jw = vn0 < 0 ? (-(1 + 0.3) * vn0) / (1 / w.mass + (rn0 * rn0) / w.inertia) : 0;
        if (jw < STICK) {
          w.x -= nx * pen; w.y -= ny * pen;
          if (jw > 0) {
            w.vx -= (jw * nx) / w.mass; w.vy -= (jw * ny) / w.mass; w.w -= (rn0 * jw) / w.inertia;
            if (jw > 1.5) w.events.push({ t: w.t, kind: "hit", x: (px + c.x) / 2, y: (py + c.y) / 2, power: jw, part: p.kind });
          }
          continue;
        }
        // the tower gives way: the hit loosens the cubes around the point of impact
        c.rest = false;
        const reach = 1.2 + (jw - STICK) * 0.09;
        for (const o of w.cubes) {
          if (!o.rest) continue;
          const ox = o.x - px, oy = o.y - py, od = Math.hypot(ox, oy);
          if (od > reach) continue;
          o.rest = false;
          const push = Math.min(5, jw * 0.11) * (1 - od / (reach + 0.5));
          o.vx += (ox / (od || 1)) * push + w.vx * 0.5;
          o.vy += (oy / (od || 1)) * push + w.vy * 0.5;
          o.w += (ox * w.vy - oy * w.vx) * 0.8;
        }
        w.events.push({ t: w.t, kind: "hit", x: (px + c.x) / 2, y: (py + c.y) / 2, power: jw, part: p.kind });
      }
      const tot = w.mass + mc;
      w.x -= nx * pen * (mc / tot); w.y -= ny * pen * (mc / tot);
      c.x += nx * pen * (w.mass / tot); c.y += ny * pen * (w.mass / tot);
      const rx = px - w.x, ry = py - w.y;
      const vpx = w.vx - w.w * ry, vpy = w.vy + w.w * rx;
      const vn = (c.vx - vpx) * nx + (c.vy - vpy) * ny;
      if (vn >= 0) continue;
      const rn = rx * ny - ry * nx;
      const j = (-(1 + 0.3) * vn) / (1 / w.mass + (rn * rn) / w.inertia + 1 / mc);
      w.vx -= (j * nx) / w.mass; w.vy -= (j * ny) / w.mass; w.w -= (rn * j) / w.inertia;
      c.vx += (j * nx) / mc; c.vy += (j * ny) / mc;
      c.w += ((vpx * -ny + vpy * nx) * 2.5);
      if (j > 1) w.events.push({ t: w.t, kind: "hit", x: (px + c.x) / 2, y: (py + c.y) / 2, power: j, part: p.kind });
      if (j > PARTS[p.kind].hp * 1.4 && w.parts.length > 1) { breakOff(w, p, j); break; }
    }
  }

  // cubes: move, drag, collide with each other and walls
  for (const c of w.cubes) {
    c.x += c.vx * DT; c.y += c.vy * DT; c.a += c.w * DT;
    const k = Math.exp(-CUBE_DRAG * DT);
    c.vx *= k; c.vy *= k; c.w *= Math.exp(-2 * DT);
  }
  for (let i = 0; i < w.cubes.length; i++) for (let j2 = i + 1; j2 < w.cubes.length; j2++) {
    const a = w.cubes[i], b = w.cubes[j2];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d >= 2 * R || d < 1e-9) continue;
    if (a.rest && b.rest) continue;
    const nx = dx / d, ny = dy / d, pen = 2 * R - d;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    // a moving cube knocks a resting one loose only if it hits hard enough
    if (a.rest && -vn > STICK_CHAIN) a.rest = false;
    if (b.rest && -vn > STICK_CHAIN) b.rest = false;
    if (a.rest || b.rest) {
      const m = a.rest ? b : a, sgn = a.rest ? 1 : -1;
      m.x += sgn * nx * pen; m.y += sgn * ny * pen;
      const vm = m.vx * nx + m.vy * ny;
      if (sgn * vm < 0) { m.vx -= 1.3 * vm * nx; m.vy -= 1.3 * vm * ny; }
      continue;
    }
    a.x -= nx * pen / 2; a.y -= ny * pen / 2; b.x += nx * pen / 2; b.y += ny * pen / 2;
    if (vn >= 0) continue;
    const jj = -(1 + 0.3) * vn / 2;
    a.vx -= jj * nx; a.vy -= jj * ny; b.vx += jj * nx; b.vy += jj * ny;
    const tv = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
    a.w -= tv * 1.5; b.w += tv * 1.5;
  }
  for (const c of w.cubes) for (const r of rects) {
    const ct = rectContact(c.x, c.y, r);
    if (!ct) continue;
    c.x += ct.nx * ct.pen; c.y += ct.ny * ct.pen;
    const vn = c.vx * ct.nx + c.vy * ct.ny;
    if (vn < 0) { c.vx -= 1.3 * vn * ct.nx; c.vy -= 1.3 * vn * ct.ny; }
  }
  for (const c of w.cubes) if (!c.knocked && Math.hypot(c.x - c.x0, c.y - c.y0) > 0.7) {
    c.knocked = true; w.knocked++;
    w.events.push({ t: w.t, kind: "knock", x: c.x, y: c.y, power: 1 });
  }

  // debris tumbles to a stop, and bounces off walls
  for (const d of w.debris) {
    d.x += d.vx * DT; d.y += d.vy * DT; d.a += d.w * DT;
    const k = Math.exp(-1.8 * DT);
    d.vx *= k; d.vy *= k; d.w *= k;
    for (const r of rects) {
      const ct = rectContact(d.x, d.y, r);
      if (!ct) continue;
      d.x += ct.nx * ct.pen; d.y += ct.ny * ct.pen;
      const vn = d.vx * ct.nx + d.vy * ct.ny;
      if (vn < 0) { d.vx -= 1.4 * vn * ct.nx; d.vy -= 1.4 * vn * ct.ny; }
    }
  }

  // sugar and spiders
  for (const p of w.parts) {
    const [px, py] = partWorld(w, p);
    S.sugar.forEach((s, i) => {
      if (!w.eaten[i] && !w.smashed && Math.hypot(s.x - px, s.y - py) < R + 0.45) {
        const sp = Math.hypot(w.vx, w.vy);
        if (S.fragile !== undefined && sp > S.fragile) {
          w.smashed = true;
          w.events.push({ t: w.t, kind: "smash", x: s.x, y: s.y, power: sp });
          return;
        }
        w.eaten[i] = true;
        w.ateAt = w.t;
        w.events.push({ t: w.t, kind: "eat", x: s.x, y: s.y, power: 1 });
      }
    });
    if (w.caught < 0) S.spiders.forEach((s, i) => {
      if (w.caught < 0 && Math.hypot(s.x - px, s.y - py) < R + 0.7) {
        w.caught = i;
        w.events.push({ t: w.t, kind: "caught", x: s.x, y: s.y, power: 1 });
      }
    });
  }
  w.t++;
}

