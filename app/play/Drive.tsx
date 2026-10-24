"use client";

/* ── Be the fly ──────────────────────────────────────────────────────────────
   Before writing a brain, steer one. Same dish, same body, same rules as the
   real flies: one key press is one tick, and the eight official flies move in
   step with you. Then the page asks the real question — can you write rules
   that do this for you? */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Petri, { type PetriFly, type PetriTick } from "../components/ui/Petri";
import { useClock } from "../components/ui/clock";
import { flyHue } from "../components/ui/tokens";
import { LEVEL_NAMES, LEVEL_NAMES_ZH } from "../components/ui/RuleEditor";
import { useLang } from "../i18n/client";
import { startManual, step, sensesOf, done, type Move, type ManualDay } from "@/sim/manual";
import { clutchOf } from "@/sim/challenge";
import { WORLD } from "@/sim/engine";
import { levelInt } from "@/sim/encode";

const DATE = "2026-10-13";
const KEYS: Record<string, Move> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right", " ": "stay"
};

const clamp = (v: number, hi: number) => Math.max(0, Math.min(hi - 1, v));

export default function Drive({ next }: { next: string }) {
  const { t: tr, lang } = useLang();
  const LV = lang === "zh" ? LEVEL_NAMES_ZH : LEVEL_NAMES;
  const START_LOG = tr("在饥饿涨满之前找到食物。红圈是陷阱。", "Find food before hunger reaches the top. Red rings are traps.");
  const [m, setM] = useState<ManualDay>(() => startManual(DATE));
  const [log, setLog] = useState<string[]>([START_LOG]);
  const trRef = useRef(tr);
  trRef.current = tr;
  const box = useRef<HTMLDivElement>(null);
  const clutch = useMemo(() => clutchOf(DATE), []);

  // every fly is drawn from its waking cell, so tick n on screen = n moves made
  const flies: PetriFly[] = useMemo(() => {
    const wake = (sx: number, sy: number, alive = true): PetriTick => ({ x: clamp((WORLD.w >> 1) + sx, WORLD.w), y: clamp((WORLD.h >> 1) + sy, WORLD.h), behavior: "freeze", gf: false, ate: false, alive });
    const theirs = clutch.members.map((mm, i) => ({ name: mm.name, hue: flyHue(i), ticks: [wake(mm.genome.startX, mm.genome.startY), ...mm.day.ticks] }));
    const start: PetriTick = { x: startManual(DATE).pos.x, y: startManual(DATE).pos.y, behavior: "freeze", gf: false, ate: false, alive: true };
    return [...theirs, { name: tr("你", "you"), hue: "#F2B64B", you: true, ticks: [start, ...m.ticks] }];
  }, [clutch, m, tr]);

  const over = done(m);
  // the playhead's last stop is your latest move (a few more ticks at the end, so a death can play out)
  const clock = useClock(m.ticks.length + (over ? 3 : 1), { speed: 9 });
  const mRef = useRef(m);
  mRef.current = m;
  const clockRef = useRef(clock);
  clockRef.current = clock;

  const go = useCallback((mv: Move) => {
    const cur = mRef.current;
    if (done(cur)) return;
    const nx = step(cur, mv);
    const t = nx.ticks[nx.ticks.length - 1];
    const notes: string[] = [];
    const T = trRef.current;
    if (t.ate) notes.push(T(`第 ${t.t} 步：你吃到了，饥饿减少 ${cur.tune.hFood}。`, `Tick ${t.t}: you ate. Hunger drops by ${cur.tune.hFood}.`));
    if (!t.alive && nx.world.danger.some((c) => c.x === t.x && c.y === t.y)) notes.push(T(`第 ${t.t} 步：你踩进了陷阱。`, `Tick ${t.t}: you stepped into a trap.`));
    else if (!t.alive) notes.push(T(`第 ${t.t} 步：饥饿到了极限，你饿死了。`, `Tick ${t.t}: hunger reached the limit. You starved.`));
    else if (nx.ticks.length >= nx.tune.ticks) notes.push(T("天黑了，你撑过了一整天。", "Dusk. You made it through the whole day."));
    if (notes.length) setLog((l) => [...notes.reverse(), ...l].slice(0, 6));
    mRef.current = nx;
    setM(nx);
    clockRef.current.seek(cur.ticks.length);
    requestAnimationFrame(() => clockRef.current.play());
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const mv = KEYS[e.key];
      if (!mv) return;
      e.preventDefault();
      go(mv);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => { if (over) { try { localStorage.setItem("tapefly.drove", "1"); } catch {} } }, [over]);

  const s = sensesOf(m);
  const hungerPct = Math.min(100, (m.hunger / m.tune.hMax) * 100);
  const best = clutch.members[clutch.champion];
  const reset = () => { setM(startManual(DATE)); setLog([START_LOG]); clock.seek(0); box.current?.focus(); };

  return (
    <div className="drive" ref={box} tabIndex={0} aria-label={tr("当一回果蝇。用方向键或按钮，每步移动一格。", "Be the fly. Use the arrow keys or the buttons to move one cell per tick.")}>
      <div className="drive-dish">
        <Petri world={m.world} flies={flies} clock={clock} focus={flies.length - 1} ariaLabel={tr("培养皿，金色的是你", "The dish, with you in gold")} />
      </div>
      <div className="drive-head">
        <p className="level-n">{tr("第 1 关之前", "Before level 1")}</p>
        <h1>{tr("当一回果蝇", "Be the fly")}</h1>
        <p className="drive-lede">
          {tr(`你拿到的是 ${DATE} 那天真实果蝇的身体和培养皿。每走一步就是一个时刻；8 只官方果蝇和你一起走。那一天它们没有一只活到天黑。在饥饿涨满前吃东西，并且别踩红圈。`,
              `You get the body and the dish the real flies got on ${DATE}. Each move is one tick; the eight official flies move with you. On this day none of them reached dusk. Eat before hunger reaches the top, and stay out of the red rings.`)}
        </p>
      </div>
      <div className="drive-side">

        <div className="hunger" aria-label={tr(`饥饿 ${m.hunger} / ${m.tune.hMax}`, `Hunger ${m.hunger} of ${m.tune.hMax}`)}>
          <div className="hunger-head"><span>{tr("饥饿", "Hunger")}</span><b>{Math.min(m.hunger, m.tune.hMax)}</b><em>{tr(`到 ${m.tune.hMax} 饿死`, `starves at ${m.tune.hMax}`)}</em></div>
          <div className="hunger-bar"><i style={{ width: `${hungerPct}%` }} className={hungerPct > 70 ? "hot" : ""} /></div>
        </div>

        <div className="drive-stats">
          <div><span>{tr("步数", "Tick")}</span><b>{m.ticks.length}</b><em>{tr(`/ ${m.tune.ticks}`, `of ${m.tune.ticks}`)}</em></div>
          <div><span>{tr("进食", "Meals")}</span><b>{m.meals}</b><em>{tr(`每口减 ${m.tune.hFood} 饥饿`, `${m.tune.hFood} hunger each`)}</em></div>
          <div><span>{tr("食物气味", "Food smell")}</span><b>{LV.food[levelInt(s.food)]}</b><em>&nbsp;</em></div>
          <div><span>{tr("危险", "Threat")}</span><b className={levelInt(s.threat) >= 2 ? "bad-text" : ""}>{LV.threat[levelInt(s.threat)]}</b><em>&nbsp;</em></div>
        </div>

        {!over ? (
          <div className="pad" role="group" aria-label={tr("移动", "Move")}>
            <button className="pad-up" onClick={() => go("up")} aria-label={tr("上", "Up")}>↑</button>
            <button className="pad-left" onClick={() => go("left")} aria-label={tr("左", "Left")}>←</button>
            <button className="pad-stay" onClick={() => go("stay")} aria-label={tr("不动", "Stay")}>{tr("停", "stay")}</button>
            <button className="pad-right" onClick={() => go("right")} aria-label={tr("右", "Right")}>→</button>
            <button className="pad-down" onClick={() => go("down")} aria-label={tr("下", "Down")}>↓</button>
            <p className="pad-hint">{tr("方向键或 WASD 移动，空格原地不动。按键没反应的话，先点一下培养皿。", "Arrow keys or WASD, space to stay. Click the dish first if keys do nothing.")}</p>
          </div>
        ) : (
          <div className="drive-end">
            <h2>{m.alive ? tr("你活到了天黑。", "You reached dusk.") : tr(`你的一天结束在第 ${m.ticks.length - 1} 步。`, `Your day ended at tick ${m.ticks.length - 1}.`)}</h2>
            <p>
              {tr(`吃了 ${m.meals} 口。最好的官方果蝇 ${best.name}${best.alive ? "活到了天黑" : `活了 ${best.lived} 步`}，吃了 ${best.meals} 口。你按了 ${m.ticks.length} 次键；一颗大脑每一步都会根据 12 位输入自己做出这些选择。`,
                  `${m.meals} ${m.meals === 1 ? "meal" : "meals"}. The best official fly, ${best.name}, ${best.alive ? "reached dusk" : `lived ${best.lived} ticks`} with ${best.meals}. That took you ${m.ticks.length} key presses. A brain makes the same choices on its own, every tick, from 12 bits.`)}
            </p>
            <div className="row">
              <Link className="btn primary" href={next}>{tr("现在教一颗大脑来做", "Now teach a brain to do it")}</Link>
              <button className="btn" onClick={reset}>{tr("再试一次", "Try again")}</button>
            </div>
          </div>
        )}

        <ul className="drive-log" aria-live="polite">
          {log.map((l, i) => <li key={`${i}-${l}`}>{l}</li>)}
        </ul>
      </div>
    </div>
  );
}
