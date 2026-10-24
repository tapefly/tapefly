"use client";

/* The home page's live half: today's dish playing on its own, the eight flies'
   standings updating as they live and die, and — under it — the focused fly's
   mind on the current tick, with the circuit lighting up as it decides. */

import Link from "next/link";
import { useMemo, useState } from "react";
import Petri, { type PetriFly } from "./Petri";
import Timeline from "./Timeline";
import Circuit from "./Circuit";
import { Meters, Word, Decision, WHY } from "./Mind";
import { useClock } from "./clock";
import NextStep from "./NextStep";
import { flyHue, BEHAVIOUR_VERB } from "./tokens";
import { BRAIN } from "@/sim/netlist";
import type { SlimColony } from "@/sim/colony";

export default function Theater({ colony }: { colony: SlimColony }) {
  const flies: PetriFly[] = useMemo(
    () => colony.members.map((m, i) => ({ name: m.name, hue: flyHue(i), ticks: m.day.ticks })),
    [colony]
  );
  const longest = Math.max(...flies.map((f) => f.ticks.length));
  const dusk = colony.members[0].day.tune.ticks;
  const clock = useClock(longest + 3, { autoplay: true });
  const [focus, setFocus] = useState(colony.champion);

  const tick = clock.tick;
  const alive = flies.filter((f) => tick < f.ticks.length - 1 || f.ticks[f.ticks.length - 1].alive).length;
  const over = tick >= longest - 1;
  const survivors = colony.members.filter((m) => m.alive).length;
  const champ = colony.members[colony.champion];

  const fm = colony.members[focus];
  const ft = fm.day.ticks[Math.min(tick, fm.day.ticks.length - 1)];
  const focusDead = tick >= fm.day.ticks.length - 1 && !fm.alive;

  return (
    <>
      <section className="hero">
        <div className="hero-dish">
          <Petri world={colony.world} flies={flies} clock={clock} focus={focus} onPick={setFocus} ariaLabel={`Today's dish: ${flies.length} flies`} />
          <Timeline clock={clock} flies={flies} focus={focus} dusk={longest} />
        </div>

        <div className="hero-copy">
          <p className="kicker">Today&rsquo;s dish · {colony.date}</p>
          <h1>Teach a fly to survive the day.</h1>
          <p className="live" aria-live="polite">
            {over ? (
              <>Dusk. <b>{survivors === 0 ? "None" : survivors}</b> of eight made it. <b style={{ color: flyHue(colony.champion) }}>{champ.name}</b> lived longest{champ.alive ? "" : `, ${champ.lived} ticks`}.</>
            ) : (
              <>Tick <b>{tick}</b> of {dusk}. <b>{alive}</b> still alive.</>
            )}
          </p>
          <p className="lede">
            Every day, eight flies wake up in this dish with the same small brain, and most
            die before dusk. You get a fly of your own: teach it when to eat and when to run,
            and see if it lasts longer than they do.
          </p>

          <ol className="standings" aria-label="The eight flies">
            {colony.members.map((m, i) => {
              const last = m.day.ticks.length - 1;
              const now = Math.min(tick, last);
              const meals = m.day.ticks.slice(0, now + 1).filter((t) => t.ate).length;
              const gone = tick >= last && !m.alive;
              const done = tick >= last && m.alive;
              const trapped = gone && colony.world.danger.some((c) => c.x === m.day.ticks[last].x && c.y === m.day.ticks[last].y);
              return (
                <li key={m.name} className={`${i === focus ? "on" : ""} ${gone ? "gone" : ""}`}>
                  <button onClick={() => setFocus(i)}>
                    <i className="dot" style={{ background: flyHue(i) }} />
                    <span className="nm">{m.name}</span>
                    <span className="st">
                      {gone ? (trapped ? `trapped at ${last}` : `starved at ${last}`) : done ? "saw dusk" : BEHAVIOUR_VERB[m.day.ticks[now].behavior]}
                    </span>
                    <span className="ml" title="meals">{meals > 0 ? "●".repeat(Math.min(meals, 8)) : ""}{meals > 8 ? "+" : ""}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <NextStep />
        </div>
      </section>

      <details className="mind">
        <summary>Advanced: watch <span style={{ color: flyHue(focus) }}>{fm.name}</span>&rsquo;s brain decide, gate by gate</summary>
        <div className="mind-head">
          <h2>Inside <span style={{ color: flyHue(focus) }}>{fm.name}</span>&rsquo;s head, tick {Math.min(tick, fm.day.ticks.length - 1)}</h2>
          <Link href={`/fly/${fm.name}?d=${colony.date}`} className="link">Open its whole day</Link>
        </div>
        <div className="mind-grid">
          <div className="mind-in">
            <h3>It senses</h3>
            <Meters t={ft} />
            <h3>That becomes 12 bits</h3>
            <Word word={ft.inWord} />
          </div>
          <div className="mind-brain">
            <Circuit netlist={BRAIN} word={ft.inWord} compact />
          </div>
          <div className="mind-out">
            <h3>It decides</h3>
            {focusDead ? (
              <div className="decision"><span className="d-beh dead">dead</span><p className="d-why">Its day ended at tick {fm.lived - 1}.</p></div>
            ) : (
              <Decision behavior={ft.behavior} gf={ft.gf} why={WHY[ft.rule]} rule={ft.rule} />
            )}
          </div>
        </div>
      </details>
    </>
  );
}
