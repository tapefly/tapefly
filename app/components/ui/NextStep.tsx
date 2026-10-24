"use client";

/* The one thing to do next, read from what this browser has already done:
   a new visitor is sent to steer a fly; someone part-way through Brain School
   is sent to their next level; someone with a fly of their own is sent to it. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { LEVELS } from "@/sim/levels";
import { defaultFlyName } from "@/sim/identity";
import { cleanName } from "@/sim/versus";

type State =
  | { kind: "new" }
  | { kind: "drove" }
  | { kind: "school"; next: number; stars: number }
  | { kind: "fly"; name: string };

function read(): State {
  try {
    const build = localStorage.getItem("tapefly.build");
    if (build) return { kind: "fly", name: cleanName(localStorage.getItem("tapefly.name"), defaultFlyName(build)) };
    const stars = JSON.parse(localStorage.getItem("tapefly.stars") ?? "{}") as Record<string, number>;
    const total = Object.values(stars).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const next = LEVELS.findIndex((l) => !(stars[l.id] > 0));
      return { kind: "school", next: next < 0 ? LEVELS.length : next, stars: total };
    }
    if (localStorage.getItem("tapefly.drove") === "1") return { kind: "drove" };
  } catch {}
  return { kind: "new" };
}

export default function NextStep() {
  const [s, setS] = useState<State>({ kind: "new" });
  useEffect(() => { setS(read()); }, []);

  if (s.kind === "fly") {
    return (
      <div className="next-step">
        <p>Your fly <b>{s.name}</b> is waiting.</p>
        <div className="cta-row">
          <Link className="btn primary" href="/me">See how {s.name} is doing</Link>
          <Link className="btn" href="/vs">Race a friend</Link>
        </div>
      </div>
    );
  }
  if (s.kind === "school") {
    const lvl = LEVELS[s.next];
    return (
      <div className="next-step">
        <p>{s.stars} star{s.stars === 1 ? "" : "s"} so far in Brain School.</p>
        <div className="cta-row">
          {lvl ? <Link className="btn primary" href={`/play?l=${lvl.id}`}>Continue: level {s.next + 1}, {lvl.title}</Link> : <Link className="btn primary" href="/build">Teach your own fly</Link>}
          <Link className="btn" href="/vs">Race a friend</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="next-step">
      <ol className="steps-3">
        <li className={s.kind === "drove" ? "done" : ""}><b>Steer a fly</b> yourself for a minute</li>
        <li><b>Teach it</b> a few instincts in Brain School</li>
        <li><b>Race</b> your friends&rsquo; flies</li>
      </ol>
      <div className="cta-row">
        {s.kind === "drove"
          ? <Link className="btn primary" href={`/play?l=${LEVELS[0].id}`}>Next: teach it (level 1)</Link>
          : <Link className="btn primary" href="/play">Start: steer a fly</Link>}
        <Link className="btn" href={`/play?l=${LEVELS[0].id}`}>{s.kind === "drove" ? "Steer again" : "Skip to teaching"}</Link>
      </div>
    </div>
  );
}
