/* ── app/evo/draw.ts ─────────────────────────────────────────────────────────
   Drawing a run on a 2D canvas. Pure functions of (run, time), so the live
   board and the GIF exporter draw the same pictures.

   `at` is a fractional frame index: 3.5 is halfway between the state after
   tick 3 and the state after tick 4. Moves glide, turns swing, bumps nudge.
   --------------------------------------------------------------------------- */
import type { Run, Frame } from "@/sim/evo/world";

export const PAL = {
  bench: "#06191e",
  void: "#041318",
  floor: "#102b30",
  floor2: "#0e272c",
  floorDot: "#1c3e44",
  wall: "#132e35",
  wallTop: "#1f444c",
  wallRim: "#33646d",
  sugar: "#f2b64b",
  sugarHi: "#ffe3a3",
  web: "#d9e6e1",
  fly: "#c8873a",
  flyDark: "#7a4d1c",
  eye: "#f0454f",
  wing: "#d8f0ff",
  trail: "#f2b64b",
  loop: "#f0454f",
  chalk: "#e8f0eb"
} as const;

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export interface Pose {
  x: number;
  y: number;
  angle: number;
  /** 0..1 while being caught in a web */
  caught: number;
  /** wing beat phase driver: nonzero while moving */
  moving: boolean;
}

/** Where the fly is drawn at fractional frame `at`. */
export function poseAt(run: Run, at: number): Pose {
  const fs = run.frames;
  const last = fs.length - 1;
  const i = Math.max(0, Math.min(last, Math.floor(at)));
  const a = fs[i];
  const b = fs[Math.min(last, i + 1)];
  const k = i >= last ? 0 : ease(at - i);
  let angA = a.dir * 90, angB = b.dir * 90;
  if (angB - angA > 180) angB -= 360;
  if (angA - angB > 180) angB += 360;
  let x = a.x + (b.x - a.x) * k;
  let y = a.y + (b.y - a.y) * k;
  if (b.event === "bump" && i < last) {
    const n = Math.sin(Math.min(1, at - i) * Math.PI) * 0.18;
    x += [0, 1, 0, -1][a.dir] * n;
    y += [-1, 0, 1, 0][a.dir] * n;
  }
  const caught = run.outcome === "caught" ? (i >= last ? 1 : i === last - 1 ? Math.max(0, at - i) : 0) : 0;
  return { x, y, angle: angA + (angB - angA) * k, caught, moving: i < last && (a.x !== b.x || a.y !== b.y) };
}

/** Food still on the board at fractional frame `at`. */
export function eatenBy(run: Run, at: number): Set<number> {
  const s = new Set<number>();
  const upto = Math.floor(at + 0.55);
  for (let i = 1; i <= Math.min(upto, run.frames.length - 1); i++) if (run.frames[i].ate >= 0) s.add(run.frames[i].ate);
  return s;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function drawFly(g: CanvasRenderingContext2D, cx: number, cy: number, size: number, angle: number, time: number, moving: boolean, caught = 0) {
  g.save();
  g.translate(cx, cy);
  g.rotate((angle * Math.PI) / 180);
  const s = size * (1 - caught * 0.25);
  // wings
  const beat = moving ? Math.sin(time * 0.06) * 0.35 : Math.sin(time * 0.004) * 0.05;
  for (const side of [-1, 1]) {
    g.save();
    g.rotate(side * (0.45 + beat) * (1 - caught));
    g.beginPath();
    g.ellipse(side * s * 0.2, s * 0.18, s * 0.17, s * 0.38, side * 0.25, 0, Math.PI * 2);
    g.fillStyle = "rgba(216,240,255,0.32)";
    g.fill();
    g.strokeStyle = "rgba(216,240,255,0.55)";
    g.lineWidth = Math.max(0.6, s * 0.02);
    g.stroke();
    g.restore();
  }
  // legs
  g.strokeStyle = PAL.flyDark;
  g.lineWidth = Math.max(0.8, s * 0.035);
  g.lineCap = "round";
  for (const side of [-1, 1]) for (const k of [-0.12, 0.02, 0.16]) {
    const wig = moving ? Math.sin(time * 0.03 + k * 20) * s * 0.03 : 0;
    g.beginPath();
    g.moveTo(side * s * 0.08, k * s);
    g.lineTo(side * s * 0.26, k * s + s * 0.08 * Math.sign(k + 0.01) + wig);
    g.stroke();
  }
  // abdomen
  g.beginPath();
  g.ellipse(0, s * 0.2, s * 0.16, s * 0.26, 0, 0, Math.PI * 2);
  const ab = g.createLinearGradient(-s * 0.16, 0, s * 0.16, 0);
  ab.addColorStop(0, PAL.flyDark);
  ab.addColorStop(0.45, PAL.fly);
  ab.addColorStop(1, PAL.flyDark);
  g.fillStyle = ab;
  g.fill();
  // stripes
  g.strokeStyle = "rgba(42,29,5,0.55)";
  g.lineWidth = Math.max(0.6, s * 0.03);
  for (const k of [0.16, 0.26, 0.35]) {
    g.beginPath();
    g.moveTo(-s * 0.13, k * s);
    g.quadraticCurveTo(0, k * s + s * 0.04, s * 0.13, k * s);
    g.stroke();
  }
  // thorax
  g.beginPath();
  g.ellipse(0, -s * 0.07, s * 0.14, s * 0.13, 0, 0, Math.PI * 2);
  g.fillStyle = PAL.fly;
  g.fill();
  // head + eyes
  g.beginPath();
  g.ellipse(0, -s * 0.24, s * 0.1, s * 0.08, 0, 0, Math.PI * 2);
  g.fillStyle = PAL.flyDark;
  g.fill();
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(side * s * 0.085, -s * 0.26, s * 0.07, s * 0.08, 0, 0, Math.PI * 2);
    g.fillStyle = PAL.eye;
    g.fill();
    g.beginPath();
    g.arc(side * s * 0.065, -s * 0.29, s * 0.02, 0, Math.PI * 2);
    g.fillStyle = "rgba(255,255,255,0.7)";
    g.fill();
  }
  g.restore();
  if (caught > 0) {
    g.save();
    g.translate(cx, cy);
    g.strokeStyle = `rgba(217,230,225,${0.8 * caught})`;
    g.lineWidth = Math.max(0.8, size * 0.03);
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.ellipse(0, 0, size * 0.32, size * 0.14, (i * Math.PI) / 6 + caught, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }
}

function drawSugar(g: CanvasRenderingContext2D, cx: number, cy: number, c: number, time: number, pop: number) {
  const bob = Math.sin(time * 0.003 + cx * 0.1) * c * 0.03;
  const s = c * 0.34 * (1 + pop * 0.6);
  g.save();
  g.globalAlpha = 1 - pop;
  const glow = g.createRadialGradient(cx, cy + bob, 0, cx, cy + bob, c * 0.6);
  glow.addColorStop(0, "rgba(242,182,75,0.28)");
  glow.addColorStop(1, "rgba(242,182,75,0)");
  g.fillStyle = glow;
  g.fillRect(cx - c, cy - c, c * 2, c * 2);
  g.translate(cx, cy + bob);
  g.rotate(0.3);
  roundRect(g, -s / 2, -s / 2, s, s, s * 0.18);
  g.fillStyle = PAL.sugar;
  g.fill();
  roundRect(g, -s / 2 + s * 0.12, -s / 2 + s * 0.1, s * 0.42, s * 0.3, s * 0.1);
  g.fillStyle = PAL.sugarHi;
  g.fill();
  g.restore();
}

function drawWeb(g: CanvasRenderingContext2D, cx: number, cy: number, c: number) {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = "rgba(217,230,225,0.55)";
  g.lineWidth = Math.max(0.6, c * 0.022);
  const R = c * 0.46;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    g.stroke();
  }
  for (const r of [0.3, 0.55, 0.82]) {
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i * Math.PI) / 4 + 0.2;
      const x = Math.cos(a) * R * r, y = Math.sin(a) * R * r;
      if (i === 0) g.moveTo(x, y);
      else g.quadraticCurveTo(Math.cos(a - Math.PI / 8) * R * r * 0.86, Math.sin(a - Math.PI / 8) * R * r * 0.86, x, y);
    }
    g.stroke();
  }
  g.fillStyle = "#2a1414";
  g.beginPath();
  g.arc(c * 0.06, -c * 0.04, c * 0.07, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export interface DrawOpts {
  /** pixel size of one cell */
  cell: number;
  time: number;
  trail?: boolean;
  /** the canvas has room for a margin of this many pixels */
  pad?: number;
  /** how far the nose reaches; drawn as a faint diamond when it is short */
  smell?: number;
}

export function drawRun(g: CanvasRenderingContext2D, run: Run, at: number, o: DrawOpts) {
  const b = run.board;
  const c = o.cell;
  const pad = o.pad ?? 0;
  const W = b.w * c + pad * 2, H = b.h * c + pad * 2;
  g.fillStyle = PAL.bench;
  g.fillRect(0, 0, W, H);
  g.save();
  g.translate(pad, pad);
  // void, then floor, then raised wall blocks where walls meet the floor
  const isWall = (x: number, y: number) => x < 0 || y < 0 || x >= b.w || y >= b.h || b.grid[y * b.w + x] === 1;
  const nearFloor = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!isWall(x + dx, y + dy)) return true;
    return false;
  };
  g.fillStyle = PAL.void;
  g.fillRect(0, 0, b.w * c, b.h * c);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (isWall(x, y)) continue;
    g.fillStyle = (x + y) % 2 ? PAL.floor : PAL.floor2;
    g.fillRect(x * c, y * c, c, c);
    g.fillStyle = PAL.floorDot;
    g.fillRect(x * c + c / 2 - 1, y * c + c / 2 - 1, 2, 2);
    if (isWall(x, y - 1)) {
      const sh = g.createLinearGradient(0, y * c, 0, y * c + c * 0.35);
      sh.addColorStop(0, "rgba(0,0,0,0.38)");
      sh.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = sh;
      g.fillRect(x * c, y * c, c, c * 0.35);
    }
  }
  const face = c * 0.22;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    if (!isWall(x, y) || !nearFloor(x, y)) continue;
    const front = !isWall(x, y + 1);
    g.fillStyle = PAL.wallTop;
    g.fillRect(x * c, y * c - (isWall(x, y - 1) && nearFloor(x, y - 1) ? 0 : 0), c, front ? c - face : c);
    if (front) {
      g.fillStyle = PAL.wall;
      g.fillRect(x * c, y * c + c - face, c, face);
      g.fillStyle = "rgba(255,255,255,0.05)";
      g.fillRect(x * c, y * c + c - face, c, 1);
    }
    // a lit rim where the block meets open floor above or to the sides
    g.fillStyle = PAL.wallRim;
    if (!isWall(x, y - 1)) g.fillRect(x * c, y * c, c, Math.max(1, c * 0.05));
    if (!isWall(x - 1, y)) g.fillRect(x * c, y * c, Math.max(1, c * 0.04), front ? c - face : c);
    if (!isWall(x + 1, y)) g.fillRect(x * c + c - Math.max(1, c * 0.04), y * c, Math.max(1, c * 0.04), front ? c - face : c);
  }
  // the reach of a short nose
  if (o.smell !== undefined && o.smell < 20) {
    const fp = poseAt(run, at);
    const fx = Math.round(fp.x), fy = Math.round(fp.y);
    g.fillStyle = "rgba(115,245,193,0.07)";
    for (let y = fy - o.smell; y <= fy + o.smell; y++) for (let x = fx - o.smell; x <= fx + o.smell; x++) {
      if (Math.abs(x - fx) + Math.abs(y - fy) > o.smell || isWall(x, y)) continue;
      g.fillRect(x * c, y * c, c, c);
    }
  }
  // webs
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.grid[y * b.w + x] === 2) drawWeb(g, x * c + c / 2, y * c + c / 2, c);

  // trail
  const upto = Math.min(run.frames.length - 1, Math.floor(at));
  if (o.trail !== false && upto > 0) {
    g.save();
    g.lineCap = "round";
    g.lineJoin = "round";
    const loopFrom = run.outcome === "loop" ? run.loopFrom : Infinity;
    const seg = (from: number, to: number, color: string, alpha: number, dash: number[]) => {
      if (to <= from) return;
      g.beginPath();
      for (let i = from; i <= to; i++) {
        const f = run.frames[i];
        const px = f.x * c + c / 2, py = f.y * c + c / 2;
        if (i === from) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokeStyle = color;
      g.globalAlpha = alpha;
      g.lineWidth = Math.max(1.5, c * 0.07);
      g.setLineDash(dash.map((d) => d * c));
      g.stroke();
    };
    seg(0, Math.min(upto, loopFrom), PAL.trail, 0.32, [0.08, 0.16]);
    if (upto >= loopFrom) seg(loopFrom, upto, PAL.loop, 0.75, [0.18, 0.1]);
    g.restore();
  }

  // food
  const gone = eatenBy(run, at);
  b.food.forEach((f, i) => {
    let pop = 0;
    if (gone.has(i)) {
      const fi = run.frames.findIndex((fr) => fr.ate === i);
      pop = Math.min(1, (at - fi + 0.45) / 0.6);
      if (pop >= 1) return;
    }
    drawSugar(g, f.x * c + c / 2, f.y * c + c / 2, c, o.time, Math.max(0, pop));
  });

  // start marker
  g.strokeStyle = "rgba(232,240,235,0.18)";
  g.lineWidth = 1;
  g.setLineDash([3, 3]);
  g.strokeRect(b.start.x * c + 3, b.start.y * c + 3, c - 6, c - 6);
  g.setLineDash([]);

  // fly
  const p = poseAt(run, at);
  drawFly(g, p.x * c + c / 2, p.y * c + c / 2, c * 0.92, p.angle, o.time, p.moving, p.caught);

  // bump flash
  const fi = Math.min(run.frames.length - 1, Math.floor(at) + 1);
  const fr: Frame | undefined = run.frames[fi];
  if (fr && fr.event === "bump" && Math.floor(at) < run.frames.length - 1) {
    const k = Math.sin((at - Math.floor(at)) * Math.PI);
    const prev = run.frames[fi - 1];
    const wx = prev.x + [0, 1, 0, -1][prev.dir] * 0.5, wy = prev.y + [-1, 0, 1, 0][prev.dir] * 0.5;
    g.strokeStyle = `rgba(242,182,75,${0.8 * k})`;
    g.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      const ox = wx * c + c / 2, oy = wy * c + c / 2;
      const nx = [0, 1, 0, -1][prev.dir], ny = [-1, 0, 1, 0][prev.dir];
      g.moveTo(ox - ny * i * c * 0.15, oy + nx * i * c * 0.15);
      g.lineTo(ox - ny * i * c * 0.25 - nx * c * 0.12, oy + nx * i * c * 0.25 - ny * c * 0.12);
      g.stroke();
    }
  }
  g.restore();
}
