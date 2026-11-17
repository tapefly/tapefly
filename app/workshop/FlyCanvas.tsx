"use client";

/* Letting the fly go. Fixed 60 Hz steps; the view adds what makes it feel
   physical: flapping wings with puffs of air, a trail, camera shake on impact,
   sparks, parts snapping off in slow motion, and a running commentary. */

import { useEffect, useRef, useState } from "react";
import { makeWorld, step, partWorld, DT, type World } from "@/sim/workshop/physics";
import { isWing, PARTS, type Design } from "@/sim/workshop/parts";
import { outcomeOf, type WOutcome } from "@/sim/workshop/game";
import type { WLevel } from "@/sim/workshop/levels";
import { drawArena, drawCube, drawDebris, drawFly, drawFx, drawGlassSugar, drawNest, drawSpider, drawSugar, newFx, spawnBurst, stepFx, type Fx } from "./wdraw";
import { sfx } from "../evo/sound";
import type { T } from "../evo/text";

export interface FlyLog { t: number; text: string; tone: "hot" | "brain" | "bad" | "plain" }

let actx: AudioContext | null = null;
export function crash(power: number, on: boolean) {
  if (!on) return;
  try {
    if (!actx) actx = new AudioContext();
    const a = actx;
    const len = Math.floor(a.sampleRate * 0.25);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1 * Math.pow(1 - i / len, 3);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 500 + Math.min(2500, power * 90);
    const gn = a.createGain();
    gn.gain.value = Math.min(0.35, 0.05 + power * 0.01);
    src.connect(f).connect(gn).connect(a.destination);
    src.start();
  } catch {}
}

export default function FlyCanvas({
  level,
  design,
  setup,
  runKey,
  speed,
  sound,
  t,
  onEnd,
  onLog,
  onStart,
  onTick
}: {
  level: WLevel;
  design: Design;
  setup: number;
  runKey: number;
  speed: number;
  sound: boolean;
  t: T;
  onEnd: (o: WOutcome, w: World) => void;
  onLog: (l: FlyLog) => void;
  onStart?: () => void;
  onTick: (w: World) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 800, h: 520 });
  const S = level.setups[setup];

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setBox({ w: el.clientWidth, h: Math.max(320, Math.min(el.clientHeight || 600, window.innerHeight * 0.72)) });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    onStart?.();
    const w = makeWorld(S, design);
    const fx: Fx = newFx();
    let seen = 0;
    let acc = 0;
    let slow = 0; // seconds of slow motion left
    let impactHold = 0; // a brief visual freeze so a collision has weight
    let last = performance.now();
    let raf = 0;
    let ended = false;
    let lastTick = 0;
    const said = new Set<string>();
    const hasClock = design.parts.some((p) => p.kind === "clock");
    const togs = design.parts.filter((p) => p.kind === "toggle");
    const togNames = new Map(togs.map((p, i) => [p.id, togs.length > 1 ? ` ${i + 1}` : ""]));
    const mems = design.parts.filter((p) => p.kind === "memory");
    const memNames = new Map(mems.map((p, i) => [p.id, mems.length > 1 ? ` ${i + 1}` : ""]));
    const say = (key: string, l: FlyLog) => { if (said.has(key)) return; said.add(key); onLog(l); };
    const c = Math.min(box.w / S.w, box.h / S.h);
    const W = S.w * c, H = S.h * c;
    const startLeft = !design.parts.some((p) => isWing(p.kind)) || !design.wires.length;
    if (startLeft) say("nowings", { t: 0, text: t("它没有通电的翅膀，一动不动。", "No powered wings: it does not move."), tone: "bad" });

    const frame = (now: number) => {
      const real = Math.min(0.05, (now - last) / 1000);
      last = now;
      const scale = (slow > 0 ? 0.25 : 1) * speedRef.current;
      if (slow > 0) slow -= real;
      if (!ended && impactHold > 0) {
        impactHold -= real;
      } else if (!ended) {
        acc += real * scale;
        while (acc >= DT && !ended) {
          acc -= DT;
          step(w);
          // trail
          if (w.t % 3 === 0) { fx.trail.push([w.x, w.y]); if (fx.trail.length > 220) fx.trail.shift(); }
          // air puffs behind powered wings
          if (w.t % 4 === 0) for (const p of w.parts) if (isWing(p.kind) && p.on) {
            const [px, py] = partWorld(w, p);
            const bx = -Math.sin(w.a), by = Math.cos(w.a);
            fx.particles.push({ x: px + bx * 0.5, y: py + by * 0.5, vx: bx * 2.2 + w.vx * 0.3, vy: by * 2.2 + w.vy * 0.3, life: 0, max: 0.5, color: "rgba(255,255,255,0.55)", size: c * 0.09 });
          }
          // events
          for (; seen < w.events.length; seen++) {
            const e = w.events[seen];
            const sec = e.t / 60;
            if (e.kind === "hit") {
              fx.shake = Math.max(fx.shake, Math.min(18, e.power * 0.6));
              spawnBurst(fx, e.x, e.y, Math.min(14, 4 + Math.floor(e.power / 3)), "#fff3c4", 3 + e.power * 0.15, c * 0.06);
              crash(e.power, sound);
              if (e.power > 12) {
                impactHold = Math.max(impactHold, 0.025);
                say("bighit" + Math.floor(sec), { t: sec, text: t("砰！撞得很重。", "Bang! A hard hit."), tone: "hot" });
              }
            } else if (e.kind === "break") {
              slow = 0.9;
              impactHold = Math.max(impactHold, 0.055);
              fx.flash = 1;
              fx.shake = 20;
              spawnBurst(fx, e.x, e.y, 22, "#ffd27a", 6, c * 0.08);
              crash(30, sound);
              const nm = e.part ? t(PARTS[e.part].name.zh, PARTS[e.part].name.en) : "";
              fx.popups.push({ x: e.x, y: e.y, text: t(`${nm}断了！`, `${nm} snapped!`), life: 0 });
              onLog({ t: sec, text: t(`${nm}被撞断，飞了出去。`, `The ${nm.toLowerCase()} snapped off and flew away.`), tone: "hot" });
            } else if (e.kind === "eat") {
              impactHold = Math.max(impactHold, 0.02);
              spawnBurst(fx, e.x, e.y, 26, "#fffbe8", 5, c * 0.09);
              fx.popups.push({ x: e.x, y: e.y, text: t("吃到了！", "Got it!"), life: 0 });
              if (sound) sfx.eat();
              onLog({ t: sec, text: t("吃到一块糖。", "Ate a sugar cube."), tone: "hot" });
            } else if (e.kind === "caught") {
              slow = 1.2;
              impactHold = Math.max(impactHold, 0.06);
              fx.shake = 14;
              if (sound) sfx.caught();
              onLog({ t: sec, text: t("被蜘蛛逮住了。", "The spider got it."), tone: "bad" });
            } else if (e.kind === "smash") {
              slow = 1.2;
              impactHold = Math.max(impactHold, 0.06);
              fx.flash = 1;
              fx.shake = 16;
              spawnBurst(fx, e.x, e.y, 34, "#dff3ff", 7, c * 0.08);
              crash(26, sound);
              fx.popups.push({ x: e.x, y: e.y, text: t("碎了！", "Shattered!"), life: 0 });
              onLog({ t: sec, text: t(`撞得太快（${e.power.toFixed(1)}），玻璃糖碎了。`, `Too fast (${e.power.toFixed(1)}): the glass sugar shattered.`), tone: "bad" });
            } else if (e.kind === "knock") {
              if (w.knocked % 5 === 0) fx.popups.push({ x: e.x, y: e.y, text: `${w.knocked}`, life: 0 });
            }
          }
          // commentary from the senses
          for (const p of w.parts) {
            if (p.kind === "eye" && p.on) say("eye", { t: w.t / 60, text: t("眼睛看到糖了，神经开始带它转向。", "An eye spots sugar; the nerves start to steer."), tone: "brain" });
            if (p.kind === "antenna" && p.on) say("ant", { t: w.t / 60, text: t("触角碰到墙，一边的翅膀停了下来。", "An antenna touches a wall; a wing stops."), tone: "brain" });
            if (p.kind === "mouth" && p.on) say("mouth" + Math.floor(w.t / 60), { t: w.t / 60, text: t("嘴尝到了糖，只有一瞬间。", "The mouth tastes sugar, for a moment."), tone: "brain" });
            if (p.kind === "memory" && p.on) say("mem-" + p.id, { t: w.t / 60, text: t(`记忆格${memNames.get(p.id) ?? ""}记住了：从现在起它一直是开。`, `Memory cell${memNames.get(p.id) ?? ""} is set: on from now on.`), tone: "brain" });
            if (p.kind === "toggle" && !hasClock) {
              const k = `tog-${p.id}-${p.on ? 1 : 0}`;
              if (!said.has(k)) {
                said.delete(`tog-${p.id}-${p.on ? 0 : 1}`);
                const nm = togNames.get(p.id) ?? "";
                if (w.t > 1) say(k, { t: w.t / 60, text: p.on ? t(`翻转格${nm}翻到了“开”。`, `Toggle${nm} flips on.`) : t(`翻转格${nm}翻回了“关”。`, `Toggle${nm} flips off.`), tone: "brain" });
                else said.add(k);
              }
            }
            if (p.kind === "nose" && p.on) say("nose", { t: w.t / 60, text: t("鼻子闻到窝了，往家飞。", "The nose smells the nest; heading home."), tone: "brain" });
            if (p.kind === "hair" && p.on) say("hair", { t: w.t / 60, text: t("蛛感毛发抖：附近有蜘蛛！", "Spider hair bristles: a spider is near!"), tone: "brain" });
          }
          if (Math.abs(w.w) > 4) say("spin", { t: w.t / 60, text: t("它在原地打转，转晕了。", "It is spinning on the spot."), tone: "bad" });
          const o = outcomeOf(level, w);
          if (o) { ended = true; onEnd(o, w); if (o === "cleared" && sound) sfx.clear(); }
        }
      }
      stepFx(fx, real);
      if (now - lastTick > 90) { lastTick = now; onTick(w); }

      const el = cv.current;
      if (el) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const viewW = W;
        const viewH = H;
        if (el.width !== Math.round(viewW * dpr) || el.height !== Math.round(viewH * dpr)) {
          el.width = Math.round(viewW * dpr);
          el.height = Math.round(viewH * dpr);
          el.style.width = viewW + "px";
          el.style.height = viewH + "px";
        }
        const g = el.getContext("2d")!;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sh = fx.shake;
        g.save();
        g.translate(Math.sin(now * 0.09) * sh * 0.5, Math.cos(now * 0.11) * sh * 0.5);
        drawWorld(g, w, fx, c, now, W, H);
        g.restore();
        if (fx.flash > 0.02) { g.fillStyle = `rgba(255,250,230,${fx.flash * 0.35})`; g.fillRect(0, 0, viewW, viewH); }
        if (slow > 0) {
          g.fillStyle = "rgba(185,156,255,0.9)";
          g.font = `800 ${Math.round(c * 0.55)}px sans-serif`;
          g.textAlign = "right";
          g.fillText(t("慢动作", "SLOW-MO"), viewW - c * 0.8, c * 1.2);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, setup, box.w, box.h]);

  return (
    <div className="ws-arena" ref={wrap}>
      <canvas ref={cv} aria-label={t("场地", "Arena")} />
    </div>
  );
}

export function drawWorld(g: CanvasRenderingContext2D, w: World, fx: Fx, c: number, now: number, W: number, H: number) {
  const S = w.setup;
  drawArena(g, S, c, W, H);
  S.spiders.forEach((s, i) => drawSpider(g, s.x * c, s.y * c, c, now, w.caught === i ? 1 : 0));
  if (S.nest) drawNest(g, S.nest.x * c, S.nest.y * c, c, now);
  S.sugar.forEach((s, i) => { if (!w.eaten[i] && !(w.smashed && S.fragile !== undefined)) (S.fragile !== undefined ? drawGlassSugar : drawSugar)(g, s.x * c, s.y * c, c, now); });
  for (const cube of w.cubes) drawCube(g, cube.x * c, cube.y * c, cube.a, c);
  if (fx.trail.length > 1) {
    g.save();
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "rgba(200,135,58,0.45)";
    g.setLineDash([c * 0.05, c * 0.22]);
    g.lineWidth = c * 0.12;
    g.beginPath();
    fx.trail.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c)));
    g.lineTo(w.x * c, w.y * c);
    g.stroke();
    g.restore();
  }
  drawDebris(g, w, c, now);
  drawFly(g, w, c, now);
  drawFx(g, fx, c);
}
