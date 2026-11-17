/* ── app/workshop/wdraw.ts ───────────────────────────────────────────────────
   Drawing the workshop: parts (the same drawing on the build grid, in flight
   and in the parts tray), the arena, and the effects that make a crash feel
   like a crash. All in canvas units of one cell = `c` pixels.
   --------------------------------------------------------------------------- */
import { DIRS, PARTS, type PartKind } from "@/sim/workshop/parts";
import { partWorld, type World, type Setup } from "@/sim/workshop/physics";

export const C = {
  bench: "#06191e",
  agarHi: "#f8e8bf",
  agar: "#e8c98a",
  agarLo: "#c99d58",
  amber: "#e0a24a",
  amberHi: "#ffd27a",
  amberDk: "#7a4d1c",
  wing: "rgba(225,244,255,0.55)",
  wingEdge: "rgba(120,160,185,0.9)",
  eye: "#e23b45",
  eyeDk: "#7a1d22",
  ant: "#2bb58a",
  antHi: "#73f5c1",
  slate: "#4c5560",
  slateDk: "#262c33",
  hair: "#9b7be8",
  nerve: "#b99cff",
  sugar: "#fffaf0",
  glass: "rgba(255,255,255,0.42)",
  chip: "#1d3b33",
  chipHi: "#2e5a4d",
  pin: "#c8b27a",
  led: "#ffd27a",
  mouth: "#e2788f",
  nose: "#c98f5a"
};

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function studs(g: CanvasRenderingContext2D, c: number, n: number, color: string) {
  g.fillStyle = color;
  const pts = n === 4 ? [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] : [[-0.22, -0.18], [0, -0.18], [0.22, -0.18]];
  for (const [x, y] of pts) { g.beginPath(); g.arc(x * c, y * c, c * 0.07, 0, Math.PI * 2); g.fill(); }
}

export interface PartLook {
  /** which side a wing grows toward: −1 left, 1 right, 0 back */
  side?: number;
  on?: boolean;
  time?: number;
  ghost?: boolean;
  bad?: boolean;
}

/** Draw one part centred at the origin, in the body's frame (forward = −y). */
export function drawPart(g: CanvasRenderingContext2D, kind: PartKind, dir: number, c: number, look: PartLook = {}) {
  const t = look.time ?? 0;
  g.save();
  if (look.ghost) g.globalAlpha *= 0.45;
  const block = (fill: string, hi: string, dk: string, nStuds: number) => {
    g.fillStyle = "rgba(0,0,0,0.22)";
    rr(g, -c * 0.44, -c * 0.38, c * 0.88, c * 0.88, c * 0.16);
    g.fill();
    const grd = g.createLinearGradient(0, -c * 0.45, 0, c * 0.45);
    grd.addColorStop(0, hi);
    grd.addColorStop(1, fill);
    g.fillStyle = grd;
    rr(g, -c * 0.45, -c * 0.45, c * 0.9, c * 0.9, c * 0.16);
    g.fill();
    g.strokeStyle = dk;
    g.lineWidth = Math.max(1, c * 0.035);
    g.stroke();
    if (nStuds) studs(g, c, nStuds, "rgba(255,240,200,0.55)");
  };
  switch (kind) {
    case "core": {
      block(C.amber, C.amberHi, C.amberDk, 0);
      const beat = 1 + Math.sin(t * 0.008) * 0.08;
      g.save();
      g.scale(beat, beat);
      g.fillStyle = "#e23b45";
      g.beginPath();
      const s = c * 0.16;
      g.moveTo(0, s * 1.1);
      g.bezierCurveTo(-s * 2, -s * 0.2, -s * 0.9, -s * 1.6, 0, -s * 0.5);
      g.bezierCurveTo(s * 0.9, -s * 1.6, s * 2, -s * 0.2, 0, s * 1.1);
      g.fill();
      g.restore();
      break;
    }
    case "body":
      block(C.amber, C.amberHi, C.amberDk, 4);
      break;
    case "weight": {
      block(C.slate, "#6b7682", C.slateDk, 0);
      g.strokeStyle = "rgba(255,255,255,0.18)";
      g.lineWidth = c * 0.05;
      for (const k of [-0.18, 0, 0.18]) { g.beginPath(); g.moveTo(-c * 0.3, k * c); g.lineTo(c * 0.3, k * c); g.stroke(); }
      g.fillStyle = "#e8f0eb";
      g.font = `700 ${Math.round(c * 0.26)}px sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("kg", 0, c * 0.02);
      break;
    }
    case "wingS":
    case "wingL": {
      const big = kind === "wingL";
      const side = look.side ?? 1;
      const len = (big ? 1.65 : 1.15) * c;
      const wid = (big ? 0.62 : 0.46) * c;
      const flap = look.on ? Math.sin(t * 0.09) : 0;
      // the stub that holds it
      g.fillStyle = C.amberDk;
      rr(g, -c * 0.22, -c * 0.22, c * 0.44, c * 0.44, c * 0.1);
      g.fill();
      g.save();
      const base = side === 0 ? Math.PI / 2 : side < 0 ? Math.PI : 0;
      g.rotate(base + (side === 0 ? 0 : side * 0.32) + flap * 0.28 * (side || 1));
      g.scale(1, 1 - Math.abs(flap) * 0.35);
      g.beginPath();
      g.ellipse(len * 0.5, 0, len * 0.55, wid * 0.5, 0, 0, Math.PI * 2);
      const wg = g.createLinearGradient(0, 0, len, 0);
      wg.addColorStop(0, look.on ? "rgba(240,250,255,0.85)" : "rgba(225,244,255,0.6)");
      wg.addColorStop(1, "rgba(170,215,240,0.3)");
      g.fillStyle = wg;
      g.fill();
      g.strokeStyle = big ? "rgba(242,182,75,0.95)" : C.wingEdge;
      g.lineWidth = Math.max(1, c * (big ? 0.05 : 0.035));
      g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.45)";
      g.lineWidth = Math.max(0.6, c * 0.02);
      for (const k of [-0.25, 0, 0.25]) { g.beginPath(); g.moveTo(c * 0.1, 0); g.quadraticCurveTo(len * 0.5, k * wid, len * 0.98, k * wid * 0.8); g.stroke(); }
      g.restore();
      break;
    }
    case "eye": {
      const [fx, fy] = DIRS[dir];
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.beginPath(); g.arc(c * 0.03, c * 0.06, c * 0.38, 0, Math.PI * 2); g.fill();
      const eg = g.createRadialGradient(-c * 0.12, -c * 0.14, c * 0.04, 0, 0, c * 0.4);
      eg.addColorStop(0, "#ff7a82");
      eg.addColorStop(1, C.eye);
      g.fillStyle = eg;
      g.beginPath(); g.arc(0, 0, c * 0.38, 0, Math.PI * 2); g.fill();
      g.strokeStyle = C.eyeDk; g.lineWidth = c * 0.035; g.stroke();
      // facets
      g.strokeStyle = "rgba(122,29,34,0.35)";
      g.lineWidth = c * 0.015;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * c * 0.12, -c * 0.34); g.lineTo(i * c * 0.12, c * 0.34); g.stroke(); }
      g.fillStyle = "#2a0d10";
      g.beginPath(); g.arc(fx * c * 0.18, fy * c * 0.18, c * 0.11, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.beginPath(); g.arc(-c * 0.12, -c * 0.14, c * 0.07, 0, Math.PI * 2); g.fill();
      if (look.on) {
        g.strokeStyle = "rgba(255,240,180,0.95)";
        g.lineWidth = c * 0.06;
        g.beginPath(); g.arc(0, 0, c * 0.46, 0, Math.PI * 2); g.stroke();
      }
      break;
    }
    case "antenna": {
      const [fx, fy] = DIRS[dir];
      const px = -fy, py = fx;
      g.fillStyle = "#1f7a63";
      g.beginPath(); g.arc(0, 0, c * 0.2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = look.on ? C.antHi : C.ant;
      g.lineWidth = c * 0.09;
      g.lineCap = "round";
      const L = c * 1.15;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(fx * L * 0.5 + px * c * 0.25, fy * L * 0.5 + py * c * 0.25, fx * L, fy * L);
      g.stroke();
      g.fillStyle = look.on ? "#ffffff" : C.antHi;
      g.beginPath(); g.arc(fx * L, fy * L, c * (look.on ? 0.15 : 0.1), 0, Math.PI * 2); g.fill();
      break;
    }
    case "hair": {
      const [fx, fy] = DIRS[dir];
      g.fillStyle = "#4b3a7a";
      g.beginPath(); g.arc(0, 0, c * 0.24, 0, Math.PI * 2); g.fill();
      g.strokeStyle = look.on ? "#e9ddff" : C.hair;
      g.lineWidth = c * 0.05;
      g.lineCap = "round";
      const a0 = Math.atan2(fy, fx);
      for (let i = -3; i <= 3; i++) {
        const a = a0 + i * 0.22 + (look.on ? Math.sin(t * 0.05 + i) * 0.08 : 0);
        g.beginPath();
        g.moveTo(Math.cos(a) * c * 0.15, Math.sin(a) * c * 0.15);
        g.lineTo(Math.cos(a) * c * 0.62, Math.sin(a) * c * 0.62);
        g.stroke();
      }
      break;
    }
    case "mouth": {
      g.fillStyle = "#7a2f43";
      g.beginPath(); g.arc(0, 0, c * 0.26, 0, Math.PI * 2); g.fill();
      g.strokeStyle = look.on ? "#ffe1ea" : C.mouth;
      g.lineWidth = c * 0.09;
      g.lineCap = "round";
      const open = look.on ? 0.55 : 0.25;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * c * 0.12, c * 0.05);
        g.quadraticCurveTo(s * c * (0.32 + open * 0.2), -c * 0.2, s * c * 0.08, -c * (0.42 + open * 0.1));
        g.stroke();
      }
      break;
    }
    case "nose": {
      const [fx, fy] = DIRS[dir];
      g.fillStyle = "#6d4523";
      g.beginPath(); g.arc(0, 0, c * 0.24, 0, Math.PI * 2); g.fill();
      g.fillStyle = look.on ? "#ffe3c2" : C.nose;
      g.beginPath();
      g.ellipse(fx * c * 0.22, fy * c * 0.22, c * 0.26, c * 0.19, Math.atan2(fy, fx), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#3a230f";
      for (const s of [-1, 1]) { g.beginPath(); g.arc(fx * c * 0.36 - fy * s * c * 0.08, fy * c * 0.36 + fx * s * c * 0.08, c * 0.04, 0, Math.PI * 2); g.fill(); }
      if (look.on) {
        g.strokeStyle = "rgba(255,227,194,0.7)";
        g.lineWidth = c * 0.04;
        for (let i = 1; i <= 2; i++) { g.beginPath(); g.arc(fx * c * 0.4, fy * c * 0.4, c * (0.12 + i * 0.12 + ((t * 0.002) % 0.12)), Math.atan2(fy, fx) - 0.6, Math.atan2(fy, fx) + 0.6); g.stroke(); }
      }
      break;
    }
    case "gate":
    case "memory":
    case "toggle":
    case "clock": {
      // a little chip: pins, body, label, and a light that shows its output
      g.fillStyle = C.pin;
      for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) { g.fillRect(s * c * 0.44 - c * 0.04, i * c * 0.2 - c * 0.04, c * 0.08, c * 0.08); g.fillRect(i * c * 0.2 - c * 0.04, s * c * 0.44 - c * 0.04, c * 0.08, c * 0.08); }
      const grd = g.createLinearGradient(0, -c * 0.4, 0, c * 0.4);
      grd.addColorStop(0, C.chipHi);
      grd.addColorStop(1, C.chip);
      g.fillStyle = grd;
      rr(g, -c * 0.38, -c * 0.38, c * 0.76, c * 0.76, c * 0.1);
      g.fill();
      g.strokeStyle = "#0c1f1a";
      g.lineWidth = Math.max(1, c * 0.03);
      g.stroke();
      g.fillStyle = "rgba(232,240,235,0.92)";
      g.font = `800 ${Math.round(c * 0.3)}px ui-monospace, monospace`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(kind === "gate" ? "&" : kind === "memory" ? "M" : kind === "toggle" ? "T" : "♩", 0, c * 0.03);
      g.fillStyle = look.on ? C.led : "rgba(80,60,30,0.9)";
      if (look.on) { g.shadowColor = C.led; g.shadowBlur = c * 0.3; }
      g.beginPath(); g.arc(c * 0.22, -c * 0.22, c * 0.07, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
      break;
    }
  }
  if (look.bad) {
    g.strokeStyle = "#ff5a64";
    g.lineWidth = c * 0.06;
    g.setLineDash([c * 0.12, c * 0.08]);
    rr(g, -c * 0.48, -c * 0.48, c * 0.96, c * 0.96, c * 0.18);
    g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

/** Which side a wing at grid x grows toward. */
export const wingSide = (x: number) => (x < 0 ? -1 : x > 0 ? 1 : 0);

/* ── the arena ─────────────────────────────────────────────────────────────── */

export interface Fx {
  particles: { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }[];
  shake: number;
  flash: number;
  popups: { x: number; y: number; text: string; life: number }[];
  trail: [number, number][];
}

export const newFx = (): Fx => ({ particles: [], shake: 0, flash: 0, popups: [], trail: [] });

export function drawArena(g: CanvasRenderingContext2D, S: Setup, c: number, W: number, H: number) {
  g.fillStyle = C.bench;
  g.fillRect(0, 0, W, H);
  const aw = S.w * c, ah = S.h * c;
  g.save();
  rr(g, 0, 0, aw, ah, c * 0.9);
  g.clip();
  const grd = g.createRadialGradient(aw * 0.55, ah * 0.45, c, aw * 0.5, ah * 0.5, Math.max(aw, ah) * 0.75);
  grd.addColorStop(0, C.agarHi);
  grd.addColorStop(0.6, C.agar);
  grd.addColorStop(1, C.agarLo);
  g.fillStyle = grd;
  g.fillRect(0, 0, aw, ah);
  g.strokeStyle = "rgba(120,80,20,0.07)";
  g.lineWidth = 1;
  for (let x = 1; x < S.w; x++) { g.beginPath(); g.moveTo(x * c, 0); g.lineTo(x * c, ah); g.stroke(); }
  for (let y = 1; y < S.h; y++) { g.beginPath(); g.moveTo(0, y * c); g.lineTo(aw, y * c); g.stroke(); }
  // rim of the dish
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.lineWidth = c * 0.3;
  rr(g, 0, 0, aw, ah, c * 0.9);
  g.stroke();
  g.restore();
  // start pad
  g.save();
  g.strokeStyle = "rgba(90,60,10,0.35)";
  g.setLineDash([c * 0.2, c * 0.15]);
  g.lineWidth = 2;
  g.beginPath(); g.arc(S.start.x * c, S.start.y * c, c * 1.4, 0, Math.PI * 2); g.stroke();
  g.restore();
  for (const r of S.walls) {
    g.fillStyle = "rgba(90,60,10,0.25)";
    rr(g, r.x * c + c * 0.12, r.y * c + c * 0.2, r.w * c, r.h * c, c * 0.18);
    g.fill();
    const wg = g.createLinearGradient(r.x * c, r.y * c, (r.x + r.w) * c, (r.y + r.h) * c);
    wg.addColorStop(0, "rgba(255,255,255,0.62)");
    wg.addColorStop(1, "rgba(255,255,255,0.32)");
    g.fillStyle = wg;
    rr(g, r.x * c, r.y * c, r.w * c, r.h * c, c * 0.18);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 1.5;
    g.stroke();
  }
}

export function drawNest(g: CanvasRenderingContext2D, x: number, y: number, c: number, t: number) {
  g.save();
  g.translate(x, y);
  const r = c * 1.5;
  g.fillStyle = "rgba(122,77,28,0.18)";
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(122,77,28,0.7)";
  g.lineWidth = c * 0.08;
  g.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.sin(t * 0.0006 + i) * 0.03;
    g.beginPath();
    g.arc(0, 0, r * (0.72 + (i % 3) * 0.09), a, a + 0.9);
    g.stroke();
  }
  g.fillStyle = "rgba(90,60,10,0.75)";
  g.font = `700 ${Math.round(c * 0.5)}px sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("⌂", 0, c * 0.04);
  g.restore();
}

export function drawGlassSugar(g: CanvasRenderingContext2D, x: number, y: number, c: number, t: number) {
  drawSugar(g, x, y, c, t, 0.7);
  g.save();
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.fillStyle = "rgba(200,235,255,0.28)";
  g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, c * 0.72, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.8)";
  g.beginPath(); g.arc(x - c * 0.2, y - c * 0.2, c * 0.35, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
  g.restore();
}

export function drawSugar(g: CanvasRenderingContext2D, x: number, y: number, c: number, t: number, size = 0.9) {
  const bob = Math.sin(t * 0.004 + x) * c * 0.04;
  const glow = g.createRadialGradient(x, y, 0, x, y, c * 1.3);
  glow.addColorStop(0, "rgba(255,250,220,0.85)");
  glow.addColorStop(1, "rgba(255,250,220,0)");
  g.fillStyle = glow;
  g.fillRect(x - c * 1.3, y - c * 1.3, c * 2.6, c * 2.6);
  g.save();
  g.translate(x, y + bob);
  g.rotate(0.25);
  const s = c * size;
  const cg = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
  cg.addColorStop(0, "#ffffff");
  cg.addColorStop(1, "#f0d9a4");
  g.fillStyle = cg;
  rr(g, -s / 2, -s / 2, s, s, s * 0.18);
  g.fill();
  g.strokeStyle = "#d9b56e";
  g.lineWidth = 1.5;
  g.stroke();
  g.restore();
}

export function drawCube(g: CanvasRenderingContext2D, x: number, y: number, a: number, c: number) {
  g.save();
  g.translate(x, y);
  g.fillStyle = "rgba(90,60,10,0.22)";
  g.fillRect(-c * 0.36 + c * 0.08, -c * 0.36 + c * 0.12, c * 0.72, c * 0.72);
  g.rotate(a);
  const s = c * 0.76;
  const cg = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
  cg.addColorStop(0, "#ffffff");
  cg.addColorStop(1, "#efd7a0");
  g.fillStyle = cg;
  rr(g, -s / 2, -s / 2, s, s, s * 0.14);
  g.fill();
  g.strokeStyle = "#d4ae66";
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.7)";
  g.fillRect(-s * 0.32, -s * 0.32, s * 0.25, s * 0.12);
  g.restore();
}

export function drawSpider(g: CanvasRenderingContext2D, x: number, y: number, c: number, t: number, pounce: number) {
  g.save();
  g.translate(x, y);
  const s = c * (1 + pounce * 0.3);
  g.strokeStyle = "rgba(70,55,40,0.25)";
  g.lineWidth = 1;
  for (let r = 1; r <= 3; r++) { g.beginPath(); g.arc(0, 0, c * r * 0.7, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * c * 2.2, Math.sin(a) * c * 2.2); g.stroke(); }
  g.strokeStyle = "#2a1f1a";
  g.lineCap = "round";
  g.lineWidth = s * 0.09;
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const a = (side < 0 ? Math.PI : 0) + side * (-0.9 + i * 0.6) + Math.sin(t * 0.004 + i) * 0.08;
    const kx = Math.cos(a) * s * 0.55, ky = Math.sin(a) * s * 0.55;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(kx, ky - s * 0.15); g.lineTo(kx * 1.5, ky * 1.5 + s * 0.15); g.stroke();
  }
  g.fillStyle = "#2a1f1a";
  g.beginPath(); g.ellipse(0, s * 0.1, s * 0.34, s * 0.42, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(0, -s * 0.36, s * 0.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f2b64b";
  for (const k of [-1, 1]) { g.beginPath(); g.arc(k * s * 0.08, -s * 0.4, s * 0.05, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/** The whole fly in flight: wires under, parts over. */
export function drawFly(g: CanvasRenderingContext2D, w: World, c: number, t: number) {
  const byId = new Map(w.parts.map((p) => [p.id, p]));
  // nerves
  g.save();
  g.lineCap = "round";
  for (const x of w.design.wires) {
    const a = byId.get(x.from), b = byId.get(x.to);
    if (!a || !b) continue;
    const [ax, ay] = partWorld(w, a), [bx, by] = partWorld(w, b);
    const live = (a.on !== x.inv) && b.on;
    g.strokeStyle = live ? "rgba(214,196,255,0.95)" : "rgba(185,156,255,0.35)";
    g.lineWidth = c * (live ? 0.12 : 0.07);
    g.beginPath(); g.moveTo(ax * c, ay * c); g.lineTo(bx * c, by * c); g.stroke();
  }
  g.restore();
  // body shadow
  for (const p of w.parts) {
    const [px, py] = partWorld(w, p);
    g.fillStyle = "rgba(90,60,10,0.18)";
    g.beginPath(); g.arc(px * c + c * 0.15, py * c + c * 0.3, c * 0.45, 0, Math.PI * 2); g.fill();
  }
  // wings first so the body sits on top
  const order = [...w.parts].sort((a, b) => (PARTS[a.kind].thrust ? 0 : 1) - (PARTS[b.kind].thrust ? 0 : 1));
  for (const p of order) {
    const [px, py] = partWorld(w, p);
    g.save();
    g.translate(px * c, py * c);
    g.rotate(w.a);
    const gp = w.design.parts.find((q) => q.id === p.id);
    drawPart(g, p.kind, p.dir, c, { on: p.on, time: t, side: wingSide(gp?.x ?? 0) });
    g.restore();
  }
}

export function drawDebris(g: CanvasRenderingContext2D, w: World, c: number, t: number) {
  for (const d of w.debris) {
    g.save();
    g.translate(d.x * c, d.y * c);
    g.rotate(d.a);
    drawPart(g, d.kind, 0, c, { time: t, side: 1 });
    g.restore();
  }
}

export function spawnBurst(fx: Fx, x: number, y: number, n: number, color: string, speed: number, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 3) * 0.37;
    const s = speed * (0.5 + ((i * 7) % 10) / 10);
    fx.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.5 + ((i * 3) % 5) / 10, color, size });
  }
}

export function drawFx(g: CanvasRenderingContext2D, fx: Fx, c: number) {
  for (const p of fx.particles) {
    const k = 1 - p.life / p.max;
    g.globalAlpha = Math.max(0, k);
    g.fillStyle = p.color;
    g.beginPath(); g.arc(p.x * c, p.y * c, p.size * (0.5 + k * 0.5), 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  for (const p of fx.popups) {
    const k = p.life;
    g.globalAlpha = Math.max(0, 1 - k / 1.4);
    g.font = `800 ${Math.round(c * 0.62)}px "Bricolage Grotesque","Noto Sans SC",sans-serif`;
    g.textAlign = "center";
    g.lineWidth = 4;
    g.strokeStyle = "rgba(42,29,5,0.85)";
    g.strokeText(p.text, p.x * c, p.y * c - k * c * 1.2);
    g.fillStyle = "#fff6d8";
    g.fillText(p.text, p.x * c, p.y * c - k * c * 1.2);
  }
  g.globalAlpha = 1;
}

export function stepFx(fx: Fx, dt: number) {
  for (const p of fx.particles) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
  fx.particles = fx.particles.filter((p) => p.life < p.max);
  for (const p of fx.popups) p.life += dt;
  fx.popups = fx.popups.filter((p) => p.life < 1.4);
  fx.shake *= Math.exp(-dt * 9);
  fx.flash *= Math.exp(-dt * 8);
}
