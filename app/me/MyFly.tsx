"use client";

/* ── My fly ──────────────────────────────────────────────────────────────────
   The fly you are raising: its name, whether it is still in practice or
   already official, how it did on the last seven dishes, its trophies, and
   what it takes to make it official. Everything is computed here from the
   brain in this browser; the board rows and seasons come from the server. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { decodeProgram, encodeProgram, type Program } from "@/sim/program";
import { brainFromProgram, week, card } from "@/sim/challenge";
import { defaultFlyName } from "@/sim/identity";
import { cleanName } from "@/sim/versus";

export interface BoardRow { id: string; name: string; handle: string; house: boolean; program: string | null; score: number; cost: number; status: string; circuitId: string | null; trophies: number[] }

export default function MyFly({ through, rows, season }: { through: string; rows: BoardRow[]; season: { n: number; from: string; through: string } }) {
  const [program, setProgram] = useState<Program | null>(null);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    try {
      const p = localStorage.getItem("tapefly.build");
      if (p) setProgram(decodeProgram(p));
      setName(localStorage.getItem("tapefly.name") ?? "");
    } catch {}
    setReady(true);
  }, []);

  const code = useMemo(() => (program ? encodeProgram(program) : ""), [program]);
  const brain = useMemo(() => (program ? brainFromProgram(program) : null), [program]);
  const wk = useMemo(() => (brain ? week(brain, through) : null), [brain, through]);
  const c = useMemo(() => (brain ? card(brain.netlist) : null), [brain]);

  if (!ready) return <div className="page me" />;
  if (!program || !brain || !wk || !c) {
    return (
      <div className="page me">
        <header className="me-head">
          <p className="kicker">My fly</p>
          <h1>You have not hatched a fly yet</h1>
          <p className="lede">A fly is a handful of rules. Steer one by hand first to feel what it needs, or go straight to the builder.</p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link className="btn primary" href="/play">Be the fly first</Link>
            <Link className="btn" href="/build">Build a fly</Link>
          </div>
        </header>
      </div>
    );
  }

  const shown = cleanName(name, defaultFlyName(code));
  const entry = rows.find((r) => r.program === code && !r.house) ?? null;
  const better = rows.filter((r) => r.score > wk.score || (r.score === wk.score && r.cost < c.cost)).length;
  const place = better + 1;
  const official = entry?.status === "official";

  const rename = (v: string) => { setName(v); try { localStorage.setItem("tapefly.name", v); } catch {} };
  const share = async () => {
    const link = `${window.location.origin}/build?p=${code}&n=${encodeURIComponent(shown)}`;
    try { await navigator.clipboard.writeText(link); setCopied("Link copied: it unfolds into your fly's card"); } catch { setCopied(link); }
  };

  return (
    <div className="page me">
      <header className="me-head">
        <p className="kicker">My fly</p>
        <input className="me-name" aria-label="Your fly's name" value={name} placeholder={shown} maxLength={24} onChange={(e) => rename(e.target.value)} />
        <div className="row">
          {official ? <span className="tag official">official · #{entry?.circuitId}</span> : <span className="tag practice">practice</span>}
          {(entry?.trophies ?? []).map((n) => <span key={n} className="tag trophy">🏆 Season {n}</span>)}
          <span className="dim">{c.gates} NAND gates · depth {c.depth} · TapeOut cost {c.cost.toLocaleString()}</span>
        </div>
      </header>

      <section className="me-grid">
        <div className="panel">
          <h3>The last seven dishes</h3>
          <div className="me-week">
            {wk.days.map((d) => (
              <div key={d.date} className={d.alive ? "dusk" : "died"} title={`${d.date}: ${d.alive ? "reached dusk" : `died at tick ${d.lived - 1}`}, ${d.meals} meals`}>
                <span>{d.date.slice(5)}</span>
                <b>{d.alive ? "dusk" : `† ${d.lived - 1}`}</b>
              </div>
            ))}
          </div>
          <p>
            <b>{wk.survived} of 7</b> days to dusk, {wk.meals} meals. On today&rsquo;s board that would place <b>{place}</b> of {rows.length + (entry ? 0 : 1)}
            {entry ? "" : " (if it were entered)"}.
          </p>
        </div>

        <div className="panel">
          <h3>Season {season.n}</h3>
          <p>
            {season.from} to {season.through}. The best player&rsquo;s fly over those seven dishes takes the trophy.
            {entry ? <> Your fly is entered as <b>{entry.name}</b>.</> : <> Your fly is not entered yet, so it cannot win this one.</>}
          </p>
          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btn small primary" href="/vs">Challenge a friend</Link>
            <Link className="btn small" href={`/build?p=${code}`}>Change its rules</Link>
            <button className="btn small" onClick={share}>Share my fly</button>
          </div>
          {copied && <p className="dim" role="status" style={{ marginTop: 8, overflowWrap: "anywhere" }}>{copied}</p>}
        </div>
      </section>

      <section className="panel me-official">
        <h2>{official ? "Your fly is official" : "Make it official"}</h2>
        <p>
          A practice fly lives in this browser and in links. An official fly is taped out on TapeOut: its brain
          becomes a circuit on chain, it can never be changed again, and it races in the official world. Think
          before you do it.
        </p>
        <ol className="me-steps">
          <li className={entry ? "done" : ""}>
            <b>Enter it on the board</b>
            <span>{entry ? "Done." : "Free. From the builder, press “Enter it on the board”."}</span>
            {!entry && <Link className="btn small" href={`/build?p=${code}`}>Open the builder</Link>}
          </li>
          <li className={official ? "done" : ""}>
            <b>Tape it out</b>
            <span>
              Your brain needs {c.gates} NAND transistors on a TapeOut processor, plus the tape-out fee and gas, paid
              from your own wallet. The button opens once the first tape-out has been checked on chain, so nobody
              pays for a format we have not proven.
            </span>
            <button className="btn small" disabled>Tape out (soon)</button>
          </li>
          <li className={official ? "done" : ""}>
            <b>Checked on chain</b>
            <span>Every day, a check asks your circuit all 4,096 questions through TapeOut&rsquo;s free read-only call. Only then does the board call it official.</span>
          </li>
        </ol>
        <p className="dim">Being official earns no money and no token. It is a fly that can never be edited, and a place in the official world.</p>
      </section>
    </div>
  );
}
