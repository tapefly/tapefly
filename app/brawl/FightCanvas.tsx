"use client";

/* ── FightCanvas ─────────────────────────────────────────────────────────────
   Plays a finished duel (sim/duel.ts) back as a fight you want to watch.

   The fight is already decided; this only draws it. Positions are interpolated
   between ticks, and every event the engine recorded becomes something you can
   feel: a bite throws sparks and a number, a crit is bigger and yellow, a guard
   rings, an interrupt flashes, a miss whooshes, a knockout slows time and zooms.
   Wind-ups glow so you can read them the way the brains do. Sound is synthesised
   with WebAudio and only starts after a click. Reduced motion turns off shake,
   slow motion and zoom. */

import { useEffect, useRef } from "react";
import type { DuelResult, DuelEvent, FlyFrame } from "@/sim/duel";
import { T } from "@/sim/duel";
import { C } from "../components/ui/tokens";

export interface FightCanvasProps {
  result: DuelResult;
  names: [string, string];
  maxHp: [number, number];
  hues: [string, string];
  /** ticks per second of playback; 0 = paused */
  speed: number;
  muted: boolean;
  /** called a few times a second with the whole tick on screen */
  onTick?: (t: number) => void;
  onDone?: () => void;
  /** jump to this tick (e.g. the end) when it changes */
  seekTo?: number | null;
  zh: boolean;
  /** shown under K.O. / TIME when the fight ends, e.g. "Ada wins", and its colour */
  verdict?: { text: string; color: string };
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Ring { x: number; y: number; r: number; max: number; color: string; life: number }
interface Floater { x: number; y: number; text: string; color: string; size: number; life: number; max: number }

const TAU = Math.PI * 2;

/* ── sound ─────────────────────────────────────────────────────────────── */
class Sfx {
  ctx: AudioContext | null = null;
  ensure() {
    if (this.ctx) return this.ctx;
    try { const A = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext); this.ctx = new A(); } catch { this.ctx = null; }
    return this.ctx;
  }
  private noise(dur: number, gain: number, freq: number, q = 1) {
    const c = this.ctx; if (!c) return;
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(c.destination); src.start();
  }
  private tone(f0: number, f1: number, dur: number, gain: number, type: OscillatorType = "sine") {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  play(kind: DuelEvent["kind"] | "windup") {
    if (!this.ctx) return;
    if (kind === "bite") { this.noise(0.12, 0.5, 900, 0.8); this.tone(180, 60, 0.14, 0.35); }
    else if (kind === "crit") { this.noise(0.18, 0.7, 1400, 0.7); this.tone(320, 70, 0.22, 0.45, "triangle"); }
    else if (kind === "interrupt") { this.noise(0.16, 0.6, 1100, 0.9); this.tone(520, 120, 0.2, 0.3, "square"); }
    else if (kind === "blocked") { this.tone(1200, 900, 0.18, 0.18, "square"); this.tone(1800, 1500, 0.12, 0.08, "square"); }
    else if (kind === "whiff") { this.noise(0.18, 0.25, 2600, 0.5); }
    else if (kind === "spines") { this.tone(900, 300, 0.12, 0.15, "sawtooth"); }
    else if (kind === "ko") { this.tone(440, 55, 0.9, 0.4, "triangle"); this.noise(0.5, 0.3, 300, 0.6); }
    else if (kind === "windup") { this.tone(220, 520, 0.22, 0.05, "sine"); }
  }
}

export default function FightCanvas({ result, names, maxHp, hues, speed, muted, onTick, onDone, seekTo, zh, verdict }: FightCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    t: 0, last: 0, done: false, shake: 0, slow: 0, zoom: 0, flash: [0, 0], trail: [maxHp[0], maxHp[1]],
    particles: [] as Particle[], floaters: [] as Floater[], rings: [] as Ring[], firedUpTo: -1, lastReported: -1, winding: [false, false],
    hitstop: 0, intro: 0, cam: { x: 0, y: 0, z: 0 }, endAt: 0
  });
  const sfx = useRef(new Sfx());
  const props = useRef({ speed, muted, onTick, onDone, verdict });
  props.current = { speed, muted, onTick, onDone, verdict };

  // audio needs a gesture: the fight starts from a click, so the context exists by now
  useEffect(() => { if (!muted) sfx.current.ensure(); }, [muted]);

  useEffect(() => {
    if (seekTo === null || seekTo === undefined) return;
    const s = state.current;
    s.t = Math.min(seekTo, result.ticks - 1);
    s.firedUpTo = Math.floor(s.t);
    s.particles = []; s.floaters = []; s.rings = []; s.slow = 0; s.zoom = 0; s.shake = 0; s.hitstop = 0; s.intro = 0; s.endAt = 0;
  }, [seekTo, result.ticks]);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const s = state.current;
    s.t = 0; s.done = false; s.firedUpTo = -1; s.particles = []; s.floaters = []; s.rings = []; s.trail = [maxHp[0], maxHp[1]];
    s.hitstop = 0; s.intro = 1.15; s.cam = { x: 0, y: 0, z: 0 }; s.endAt = 0;
    // agar speckles, fixed per fight
    let seed = (result.ticks * 2654435761) >>> 0;
    const rnd = () => ((seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 4294967296);
    const specks = Array.from({ length: 700 }, () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * (T.arena - 4); return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: 0.4 + rnd() * rnd() * 2.4, l: rnd() }; });
    let raf = 0;

    const resize = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);

    const burst = (x: number, y: number, n: number, color: string, power: number, size = 3) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = power * (0.4 + Math.random());
        s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 18 + Math.random() * 18, color, size: size * (0.6 + Math.random() * 0.8) });
      }
    };
    const float = (x: number, y: number, text: string, color: string, size: number) => s.floaters.push({ x, y, text, color, size, life: 0, max: 46 });

    const fire = (e: DuelEvent) => {
      if (!props.current.muted) sfx.current.play(e.kind);
      const dmg = Math.round(e.dmg);
      if (e.kind === "bite") { burst(e.x, e.y, 16, C.agar, 3.2); float(e.x, e.y - 18, `-${dmg}`, C.chalk, 22); s.flash[e.on] = 6; s.shake = Math.max(s.shake, 7); }
      else if (e.kind === "crit") { burst(e.x, e.y, 30, "#FFE07A", 4.6, 4); float(e.x, e.y - 22, `${zh ? "暴击" : "CRIT"} -${dmg}`, "#FFE07A", 30); s.flash[e.on] = 9; s.shake = Math.max(s.shake, 12); }
      else if (e.kind === "interrupt") { burst(e.x, e.y, 26, C.eye, 4.2, 4); float(e.x, e.y - 22, `${zh ? "打断！" : "INTERRUPT"} -${dmg}`, C.eye, 26); s.flash[e.on] = 9; s.shake = Math.max(s.shake, 10); }
      else if (e.kind === "blocked") { burst(e.x, e.y, 14, C.frost, 2.6, 2.5); float(e.x, e.y - 18, zh ? "格挡！" : "BLOCK", C.frost, 22); s.shake = Math.max(s.shake, 4); }
      else if (e.kind === "whiff") { float(e.x, e.y - 16, zh ? "咬空" : "miss", C.fog, 18); }
      else if (e.kind === "spines") { burst(e.x, e.y, 10, C.yeast, 2.4); float(e.x, e.y - 18, `${zh ? "背刺" : "spines"} -${dmg}`, C.yeast, 18); s.flash[e.on] = 5; }
      else if (e.kind === "venom") { /* already shown as bubbles */ }
      else if (e.kind === "ko") { burst(e.x, e.y, 60, C.eye, 5.5, 4); s.shake = Math.max(s.shake, 18); if (!reduce) { s.slow = 50; s.zoom = 1; } }
      const ring = (color: string, max: number) => s.rings.push({ x: e.x, y: e.y, r: 4, max, color, life: 0 });
      if (e.kind === "bite") { s.hitstop = Math.max(s.hitstop, 3); ring("rgba(242,182,75,", 34); }
      else if (e.kind === "crit") { s.hitstop = Math.max(s.hitstop, 7); ring("rgba(255,224,122,", 54); }
      else if (e.kind === "interrupt") { s.hitstop = Math.max(s.hitstop, 6); ring("rgba(240,69,79,", 48); }
      else if (e.kind === "blocked") { s.hitstop = Math.max(s.hitstop, 3); ring("rgba(134,167,214,", 40); }
      else if (e.kind === "ko") { s.hitstop = Math.max(s.hitstop, 12); ring("rgba(240,69,79,", 120); }
      if (reduce) s.shake = 0;
    };

    const drawFly = (f: FlyFrame, g: FlyFrame, i: number, scale: number, now: number) => {
      // g: the rival's frame, for facing
      const hue = hues[i];
      const ang = f.h;
      ctx.save();
      ctx.translate(f.x * scale, f.y * scale);
      // shadow
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(3 * scale, 6 * scale, 15 * scale, 9 * scale, 0, 0, TAU); ctx.fill();
      ctx.rotate(ang);
      ctx.scale(0.82, 0.82);
      const R = T.radius * scale;
      // wind-up: pull back, then the glow ring tightens
      let pull = 0;
      if (f.phase === "windup") {
        pull = f.p < 0.6 ? -f.p * 6 : (f.p - 0.6) * 22 - 3.6;
        const glow = 0.35 + 0.65 * f.p;
        ctx.strokeStyle = `rgba(242,182,75,${glow})`; ctx.lineWidth = 3 * scale;
        ctx.beginPath(); ctx.arc(0, 0, R * (2.6 - 1.2 * f.p), 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(242,182,75,${0.12 + 0.18 * f.p})`; ctx.beginPath(); ctx.arc(0, 0, R * 1.9, 0, TAU); ctx.fill();
      }
      ctx.translate(pull * scale, 0);
      const dead = f.hp <= 0;
      const dim = dead || f.phase === "stagger" || f.phase === "recover";
      // legs
      ctx.strokeStyle = "rgba(40,24,10,.9)"; ctx.lineWidth = 1.6 * scale;
      for (let k = -1; k <= 1; k++) for (const side of [-1, 1]) {
        const wob = dead ? 3 : Math.sin(now / 70 + k + side) * 2;
        ctx.beginPath(); ctx.moveTo(k * 4 * scale, side * 4 * scale); ctx.lineTo((k * 6 + wob) * scale, side * 13 * scale); ctx.stroke();
      }
      // wings
      const flap = dead ? 0.05 : f.phase === "windup" ? 0.9 : f.guard ? 0.2 : 0.55 + 0.45 * Math.sin(now / 38 + i * 2);
      ctx.fillStyle = "rgba(214,232,255,.30)"; ctx.strokeStyle = "rgba(230,242,255,.65)"; ctx.lineWidth = 1 * scale;
      for (const side of [-1, 1]) {
        ctx.save(); ctx.rotate(side * (0.5 + 0.5 * flap)); ctx.beginPath(); ctx.ellipse(-10 * scale, side * 6 * scale, 15 * scale, 5.5 * scale, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      // body
      const flash = s.flash[i] > 0;
      ctx.fillStyle = flash ? "#ffffff" : hue;
      ctx.beginPath(); ctx.ellipse(-4 * scale, 0, 13 * scale, 8 * scale, 0, 0, TAU); ctx.fill();
      if (dim && !flash) { ctx.fillStyle = "rgba(10,6,2,.35)"; ctx.fill(); }
      ctx.strokeStyle = "rgba(60,36,14,.7)"; ctx.lineWidth = 1.4 * scale;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo((-12 + k * 5) * scale, -6.5 * scale); ctx.lineTo((-12 + k * 5) * scale, 6.5 * scale); ctx.stroke(); }
      // head and eyes
      ctx.fillStyle = flash ? "#ffffff" : "#8c6436"; ctx.beginPath(); ctx.arc(9 * scale, 0, 6.5 * scale, 0, TAU); ctx.fill();
      if (dead) {
        ctx.strokeStyle = "#E33A44"; ctx.lineWidth = 1.6 * scale;
        for (const ey of [-4.2, 4.2]) { ctx.beginPath(); ctx.moveTo(9 * scale, (ey - 2.4) * scale); ctx.lineTo(13.5 * scale, (ey + 2.4) * scale); ctx.moveTo(13.5 * scale, (ey - 2.4) * scale); ctx.lineTo(9 * scale, (ey + 2.4) * scale); ctx.stroke(); }
      } else {
        ctx.fillStyle = "#E33A44";
        ctx.beginPath(); ctx.arc(11 * scale, -4.2 * scale, 3.2 * scale, 0, TAU); ctx.arc(11 * scale, 4.2 * scale, 3.2 * scale, 0, TAU); ctx.fill();
      }
      // jaws open while biting
      if (f.phase === "windup" && f.p > 0.6) {
        ctx.strokeStyle = C.agar; ctx.lineWidth = 2 * scale;
        ctx.beginPath(); ctx.moveTo(14 * scale, -2 * scale); ctx.lineTo(21 * scale, -5 * scale); ctx.moveTo(14 * scale, 2 * scale); ctx.lineTo(21 * scale, 5 * scale); ctx.stroke();
      }
      // guard coming up: a faint arc
      if (!f.guard && f.move === 3 && f.phase === "free") {
        ctx.strokeStyle = "rgba(134,167,214,.4)"; ctx.lineWidth = 2 * scale;
        ctx.beginPath(); ctx.arc(0, 0, R * 2.1, -T.guardArc * 0.6, T.guardArc * 0.6); ctx.stroke();
      }
      // guard: a shield arc in front
      if (f.guard) {
        ctx.strokeStyle = "rgba(134,167,214,.95)"; ctx.lineWidth = 4 * scale;
        ctx.beginPath(); ctx.arc(0, 0, R * 2.1, -T.guardArc, T.guardArc); ctx.stroke();
        ctx.strokeStyle = "rgba(134,167,214,.3)"; ctx.lineWidth = 10 * scale;
        ctx.beginPath(); ctx.arc(0, 0, R * 2.1, -T.guardArc * 0.8, T.guardArc * 0.8); ctx.stroke();
      }
      ctx.restore();
      // dizzy stars when staggered
      if (f.phase === "stagger") {
        for (let k = 0; k < 3; k++) {
          const a = now / 160 + (k * TAU) / 3;
          ctx.fillStyle = "#FFE07A"; ctx.beginPath(); ctx.arc(f.x * scale + Math.cos(a) * 14 * scale, f.y * scale - 22 * scale + Math.sin(a) * 4 * scale, 2.6 * scale, 0, TAU); ctx.fill();
        }
      }
      // poison bubbles
      if (f.poisoned) {
        for (let k = 0; k < 3; k++) {
          const ph = ((now / 600 + k / 3) % 1);
          ctx.fillStyle = `rgba(163,227,106,${0.8 * (1 - ph)})`;
          ctx.beginPath(); ctx.arc(f.x * scale + (k - 1) * 7 * scale, f.y * scale - 10 * scale - ph * 22 * scale, (2 + k) * scale, 0, TAU); ctx.fill();
        }
      }
    };

    const bar = (x: number, y: number, w: number, h: number, v: number, trail: number, color: string, right: boolean) => {
      ctx.fillStyle = "rgba(6,25,30,.85)"; ctx.fillRect(x, y, w, h);
      const tw = Math.max(0, Math.min(1, trail)) * w, vw = Math.max(0, Math.min(1, v)) * w;
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(right ? x + w - tw : x, y, tw, h);
      ctx.fillStyle = color; ctx.fillRect(right ? x + w - vw : x, y, vw, h);
      ctx.strokeStyle = "rgba(232,240,235,.35)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    };

    const loop = (now: number) => {
      const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 0;
      s.last = now;
      if (s.intro > 0) s.intro = Math.max(0, s.intro - dt);
      const sp = props.current.speed * (s.slow > 0 ? 0.22 : 1);
      // hit-stop: the world freezes for a few frames on a hit, so it lands
      if (s.hitstop > 0) s.hitstop--;
      else if (!s.done && sp > 0 && s.intro <= 0) s.t = Math.min(result.ticks - 1, s.t + dt * sp);
      if (s.slow > 0) s.slow--;
      // fire events up to the playhead
      const whole = Math.floor(s.t);
      while (s.firedUpTo < whole) {
        s.firedUpTo++;
        for (const e of result.events) if (e.t === s.firedUpTo) fire(e);
        const fr = result.frames[s.firedUpTo];
        if (fr) fr.forEach((f, i) => { const w = f.phase === "windup"; if (w && !s.winding[i] && !props.current.muted) sfx.current.play("windup"); s.winding[i] = w; });
      }
      if (whole !== s.lastReported) { s.lastReported = whole; props.current.onTick?.(whole); }
      if (!s.done && s.t >= result.ticks - 1 && s.slow <= 0 && s.hitstop <= 0) { s.done = true; props.current.onDone?.(); }

      // interpolate
      const i0 = Math.max(0, Math.min(result.frames.length - 1, Math.floor(s.t))), i1 = Math.min(result.frames.length - 1, i0 + 1), fr = s.t - Math.floor(s.t);
      const A = result.frames[i0], B = result.frames[i1];
      const turn = (a: number, b: number) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * fr; };
      const lerp = (a: FlyFrame, b: FlyFrame): FlyFrame => ({ ...a, x: a.x + (b.x - a.x) * fr, y: a.y + (b.y - a.y) * fr, h: turn(a.h, b.h), hp: a.hp + (b.hp - a.hp) * fr });
      const F = [lerp(A[0], B[0]), lerp(A[1], B[1])];

      const W = cv.width, H = cv.height, dpr = W / Math.max(1, cv.clientWidth);
      const hud = 58 * dpr; // room the bars take at the top
      const fitAll = Math.min(W, H - hud) / (2 * (T.arena + 24));
      // camera: follow the pair like a fighting game, closer as they close in
      const ko = result.events.find((e) => e.kind === "ko");
      if (s.zoom > 0) s.zoom = Math.max(0, s.zoom - 0.006);
      const ddx = F[1].x - F[0].x, ddy = F[1].y - F[0].y, dd = Math.sqrt(ddx * ddx + ddy * ddy);
      let tx = (F[0].x + F[1].x) / 2, ty = (F[0].y + F[1].y) / 2, extent = Math.max(78, dd * 0.62 + 56);
      if (ko && s.zoom > 0) { tx = ko.x; ty = ko.y; extent = 62; }
      const tz = Math.max(fitAll, Math.min(fitAll * 3.4, Math.min(W, H - hud) / (2 * extent)));
      const c = s.cam;
      if (c.z === 0) { c.x = tx; c.y = ty; c.z = tz; }
      const k = 1 - Math.pow(0.0015, dt); // frame-rate independent ease
      c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (tz - c.z) * k * 0.8;
      // keep the view inside the dish's surroundings
      const halfW = W / 2 / c.z, room = T.arena + 40 - halfW;
      if (room > 0) { const m = Math.hypot(c.x, c.y); if (m > room) { c.x *= room / m; c.y *= room / m; } } else { c.x *= 0.9; c.y *= 0.9; }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = C.bench; ctx.fillRect(0, 0, W, H);
      const sx = s.shake > 0 ? (Math.random() - 0.5) * s.shake * dpr : 0, sy = s.shake > 0 ? (Math.random() - 0.5) * s.shake * dpr : 0;
      s.shake *= 0.86; if (s.shake < 0.3) s.shake = 0;
      ctx.translate(W / 2 + sx, (H + hud) / 2 + sy);
      ctx.scale(c.z, c.z);
      ctx.translate(-c.x, -c.y);
      const scale = 1, px = 1 / c.z; // one screen pixel in world units

      // the dish: agar, speckles, a glass rim
      const R = T.arena;
      const g = ctx.createRadialGradient(-R * 0.2, -R * 0.35, R * 0.05, 0, 0, R);
      g.addColorStop(0, "#9a7832"); g.addColorStop(0.55, "#5a431a"); g.addColorStop(1, "#21180a");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      for (const p of specks) { ctx.fillStyle = p.l > 0.5 ? "rgba(255,226,160,.06)" : "rgba(20,12,2,.12)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = "rgba(242,182,75,.07)"; ctx.lineWidth = px * dpr;
      for (let q = -T.arena; q <= T.arena; q += 50) { ctx.beginPath(); ctx.moveTo(q, -R); ctx.lineTo(q, R); ctx.moveTo(-R, q); ctx.lineTo(R, q); ctx.stroke(); }
      ctx.strokeStyle = "rgba(232,240,235,.4)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(232,240,235,.08)"; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(0, 0, R + 10, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R - 6, -2.5, -1.6); ctx.stroke();

      // reach line between them when close
      if (dd < 80) { ctx.strokeStyle = `rgba(240,69,79,${0.3 * (1 - dd / 80)})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(F[0].x, F[0].y); ctx.lineTo(F[1].x, F[1].y); ctx.stroke(); ctx.setLineDash([]); }

      // impact rings
      for (const r of s.rings) {
        r.life++; const q = r.life / 22; r.r = 4 + (r.max - 4) * (1 - Math.pow(1 - Math.min(1, q), 3));
        ctx.strokeStyle = r.color + Math.max(0, 0.75 * (1 - q)) + ")"; ctx.lineWidth = 3 * (1 - q) + 0.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      }
      s.rings = s.rings.filter((r) => r.life < 22);

      // dust kicked up by fast movement, afterimages on a lunge
      for (const i of [0, 1]) {
        const prev = result.frames[Math.max(0, i0 - 1)][i], cur = A[i];
        const v = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        if (v > 2.2 && Math.random() < 0.5 && s.hitstop === 0) s.particles.push({ x: F[i].x - (cur.x - prev.x) * 3, y: F[i].y - (cur.y - prev.y) * 3, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, life: 0, max: 22, color: "rgba(214,184,120,.5)", size: 2 + Math.random() * 2 });
        if (F[i].phase === "windup" && F[i].p > 0.55 && !reduce) {
          for (const back of [6, 3]) {
            const gh = result.frames[Math.max(0, i0 - back)][i];
            ctx.globalAlpha = back === 6 ? 0.12 : 0.22;
            drawFly({ ...F[i], x: gh.x, y: gh.y, guard: false, poisoned: false, phase: "free" }, F[1 - i], i, scale, now);
          }
          ctx.globalAlpha = 1;
        }
      }

      drawFly(F[0], F[1], 0, scale, now);
      drawFly(F[1], F[0], 1, scale, now);
      s.flash = s.flash.map((v) => Math.max(0, v - 1));

      // particles and floating text
      for (const p of s.particles) {
        if (s.hitstop === 0) { p.life++; p.x += p.vx; p.y += p.vy; p.vx *= 0.9; p.vy *= 0.9; }
        const a = 1 - p.life / p.max;
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, a);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      s.particles = s.particles.filter((p) => p.life < p.max);
      ctx.textAlign = "center";
      for (const f of s.floaters) {
        f.life++;
        const a = 1 - f.life / f.max, rise = (f.life / f.max) * 34 * px * dpr;
        const pop = f.life < 6 ? 0.6 + f.life / 10 + (f.life < 3 ? 0.4 : 0) : 1;
        ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.6));
        ctx.font = `800 ${f.size * pop * px * dpr}px "Bricolage Grotesque Variable", "PingFang SC", sans-serif`;
        ctx.lineWidth = 5 * px * dpr; ctx.strokeStyle = "rgba(6,25,30,.92)"; ctx.lineJoin = "round";
        ctx.strokeText(f.text, f.x, f.y - rise);
        ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - rise);
      }
      ctx.globalAlpha = 1;
      s.floaters = s.floaters.filter((f) => f.life < f.max);

      // vignette
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(6,25,30,0)"); vg.addColorStop(1, "rgba(6,25,30,.75)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      // HUD, in screen space
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const pad = 14 * dpr, bw = Math.min(W * 0.38, 360 * dpr), bh = 14 * dpr;
      const cur = result.frames[i0];
      for (const k of [0, 1]) {
        const hp = cur[k].hp / maxHp[k];
        s.trail[k] = Math.max(cur[k].hp, s.trail[k] - maxHp[k] * 0.006);
        const right = k === 1, x = right ? W - pad - bw : pad;
        bar(x, pad + 18 * dpr, bw, bh, hp, s.trail[k] / maxHp[k], hp < 0.25 ? C.eye : hues[k], right);
        bar(x, pad + 18 * dpr + bh + 4 * dpr, bw, 5 * dpr, cur[k].energy / 100, cur[k].energy / 100, C.yeast, right);
        ctx.font = `700 ${14 * dpr}px "Bricolage Grotesque Variable", "PingFang SC", sans-serif`;
        ctx.textAlign = right ? "right" : "left"; ctx.fillStyle = hues[k];
        ctx.fillText(`${names[k]}  ${Math.ceil(cur[k].hp)}`, right ? W - pad : pad, pad + 12 * dpr);
      }
      // clock
      const secs = Math.max(0, (T.ticks - s.t) / T.hz);
      ctx.textAlign = "center"; ctx.fillStyle = C.chalk; ctx.font = `800 ${22 * dpr}px "JetBrains Mono Variable", monospace`;
      ctx.fillText(secs.toFixed(0), W / 2, pad + 26 * dpr);
      // the call to fight
      if (s.intro > 0 && s.t === 0) {
        const q = 1 - s.intro / 1.15, size = Math.min(W, H) * (q < 0.2 ? 0.08 + q * 0.5 : 0.18);
        ctx.globalAlpha = Math.min(1, s.intro * 3);
        ctx.textAlign = "center"; ctx.font = `900 ${size}px "Bricolage Grotesque Variable", "PingFang SC", sans-serif`;
        ctx.lineWidth = 8 * dpr; ctx.strokeStyle = "rgba(6,25,30,.9)"; ctx.strokeText(zh ? "开打！" : "FIGHT!", W / 2, H * 0.58);
        ctx.fillStyle = C.agar; ctx.fillText(zh ? "开打！" : "FIGHT!", W / 2, H * 0.58);
        ctx.globalAlpha = 1;
      }
      // KO banner
      if (s.t >= result.ticks - 1) { if (!s.endAt) s.endAt = now; } else s.endAt = 0;
      if (ko && s.endAt) {
        const k = Math.min(1, (now - s.endAt) / 260);
        ctx.globalAlpha = k;
        ctx.font = `900 ${Math.min(W, H) * 0.16 * (1.3 - 0.3 * k)}px "Bricolage Grotesque Variable", sans-serif`;
        ctx.lineWidth = 8 * dpr; ctx.strokeStyle = "rgba(6,25,30,.9)"; ctx.strokeText("K.O.", W / 2, H * 0.56);
        ctx.fillStyle = C.eye; ctx.fillText("K.O.", W / 2, H * 0.56);
        ctx.globalAlpha = 1;
      } else if (!ko && s.endAt) {
        ctx.font = `900 ${Math.min(W, H) * 0.1}px "Bricolage Grotesque Variable", "PingFang SC", sans-serif`;
        ctx.lineWidth = 8 * dpr; ctx.strokeStyle = "rgba(6,25,30,.9)"; ctx.strokeText(zh ? "时间到" : "TIME", W / 2, H * 0.56);
        ctx.fillStyle = C.agar; ctx.fillText(zh ? "时间到" : "TIME", W / 2, H * 0.56);
      }
      const v = props.current.verdict;
      if (v && s.endAt && now - s.endAt > 350) {
        ctx.globalAlpha = Math.min(1, (now - s.endAt - 350) / 250);
        ctx.font = `800 ${Math.min(W, H) * 0.05}px "Bricolage Grotesque Variable", "PingFang SC", sans-serif`;
        ctx.lineWidth = 6 * dpr; ctx.strokeStyle = "rgba(6,25,30,.9)"; ctx.strokeText(v.text, W / 2, H * 0.66);
        ctx.fillStyle = v.color; ctx.fillText(v.text, W / 2, H * 0.66);
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [result, names, maxHp, hues, zh]);

  return <canvas ref={ref} className="duel-canvas" aria-label={zh ? `${names[0]} 对战 ${names[1]}` : `${names[0]} versus ${names[1]}`} />;
}
