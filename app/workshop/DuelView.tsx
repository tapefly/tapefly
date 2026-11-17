"use client";

/* Two designs, one level, side by side. One timeline drives both replays, so
   you watch the exact tick where one fly pulled ahead of the other. Nothing is
   re-simulated loosely: both runs are recordings, and anyone who loads the same
   two designs gets the same match. */

import { useMemo, useState } from "react";
import { duel as runDuel, sideLine, type Side } from "@/sim/workshop/duel";
import { runTrace } from "@/sim/workshop/trace";
import type { WLevel } from "@/sim/workshop/levels";
import type { Design } from "@/sim/workshop/parts";
import ReplayStage from "./ReplayStage";
import Timeline from "./Timeline";
import type { T } from "../evo/text";

const OUT: Record<string, [string, string]> = {
  cleared: ["过了", "cleared"],
  timeout: ["超时", "out of time"],
  caught: ["被逮住", "caught"],
  smashed: ["撞碎了", "smashed"]
};

export default function DuelView({ level, mine, theirs, myName, theirName, t, nameOf, onBack }: {
  level: WLevel;
  mine: Design;
  theirs: Design;
  myName: string;
  theirName: string;
  t: T;
  nameOf: (d: Design) => (id: string) => string;
  onBack: () => void;
}) {
  const [setup, setSetup] = useState(0);
  const [tick, setTick] = useState(0);

  const verdict = useMemo(() => runDuel(level, mine, theirs), [level, mine, theirs]);
  const ta = useMemo(() => (verdict.a.problems.length ? null : runTrace(level, mine, setup)), [level, mine, setup, verdict]);
  const tb = useMemo(() => (verdict.b.problems.length ? null : runTrace(level, theirs, setup)), [level, theirs, setup, verdict]);
  const span = Math.max(ta?.ticks ?? 1, tb?.ticks ?? 1);

  const Score = ({ s, name, win }: { s: Side; name: string; win: boolean }) => (
    <div className={`sc ${win ? "win" : ""}`}>
      <b>{name}</b>
      <span>{s.problems.length ? t("飞不了", "cannot fly") : sideLine(s, t("zh", "en") === "zh")}</span>
      {win && <i>{t("胜", "wins")}</i>}
    </div>
  );

  return (
    <div className="ws-duel">
      <div className="hd">
        <button type="button" className="ws-ghost" onClick={onBack}>{t("← 回工坊", "← Back to the bench")}</button>
        <h2>{t("对决", "Duel")} · {t(level.title.zh, level.title.en)}</h2>
        {level.setups.length > 1 && (
          <div className="arenas">
            {level.setups.map((_, i) => (
              <button key={i} type="button" className={i === setup ? "on" : ""} onClick={() => { setSetup(i); setTick(0); }}>
                {t(`场地 ${i + 1}`, `Arena ${i + 1}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="board">
        <Score s={verdict.a} name={myName} win={verdict.winner === "a"} />
        <p className="why">{verdict.winner === "tie" ? t(verdict.zh, verdict.en) : `${verdict.winner === "a" ? myName : theirName} ${t(verdict.zh, verdict.en)}`}</p>
        <Score s={verdict.b} name={theirName} win={verdict.winner === "b"} />
      </div>

      <div className="pair">
        {[{ tr: ta, d: mine, n: myName, s: verdict.a }, { tr: tb, d: theirs, n: theirName, s: verdict.b }].map((side, k) => (
          <div className="one" key={k}>
            <div className="cap">
              <b>{side.n}</b>
              {side.tr && <span>{OUT[side.tr.outcome] ? t(OUT[side.tr.outcome][0], OUT[side.tr.outcome][1]) : side.tr.outcome} · {(Math.min(tick, side.tr.ticks - 1) / 60).toFixed(2)}s</span>}
            </div>
            {side.tr
              ? <ReplayStage level={level} setup={setup} trace={side.tr} tick={Math.min(tick, side.tr.ticks - 1)} t={t} share={0.34} />
              : <p className="dead">{t("这个设计飞不了：", "This design cannot fly: ")}{side.s.problems.join(", ")}</p>}
          </div>
        ))}
      </div>

      {(ta ?? tb) && (
        <Timeline
          trace={(ta ?? tb)!}
          tick={Math.min(tick, (ta ?? tb)!.ticks - 1)}
          onScrub={(k) => setTick(Math.min(k, span - 1))}
          t={t}
          nameOf={nameOf(ta ? mine : theirs)}
        />
      )}
      <p className="fine">
        {t("两只果蝇跑的是同一个场地、同一个起点。模拟完全确定，所以任何人载入这两个设计，都会得到一模一样的结果 —— 成绩没法造假。",
           "Both flies ran the same arena from the same start. The simulation is deterministic, so anyone who loads these two designs gets exactly this result — a score here cannot be faked.")}
      </p>
    </div>
  );
}
