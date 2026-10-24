"use client";

/* ── Arena.tsx ───────────────────────────────────────────────────────────────
   Your brain in a real dish. The challenger gets the founding body of the day
   and is dropped among the eight official flies; the dish replays with you in
   agar, and the table says where you would have finished. With several dates,
   each is a tab and the strip above shows the whole run at a glance.
   --------------------------------------------------------------------------- */

import { useEffect, useMemo, useState } from "react";
import Petri, { type PetriFly } from "./Petri";
import Timeline from "./Timeline";
import { useClock } from "./clock";
import { flyHue, BEHAVIOUR_VERB, BEHAVIOUR_VERB_ZH } from "./tokens";
import { useLang } from "@/app/i18n/client";
import { duel, type Duel } from "@/sim/challenge";
import type { Brain, Tick } from "@/sim/engine";

const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

function DayView({ d, onTick, autoplay, solo }: { d: Duel; onTick?: (t: Tick | null) => void; autoplay: boolean; solo?: boolean }) {
  const { t } = useLang();
  // solo: only your fly. The official flies never touch your food, so leaving them out changes nothing but the clutter.
  const flies: PetriFly[] = useMemo(
    () => [
      ...(solo ? [] : d.colony.members.map((m, i) => ({ name: m.name, hue: flyHue(i), ticks: m.day.ticks }))),
      { name: t("你", "you"), hue: "#F2B64B", ticks: d.day.ticks, you: true }
    ],
    [d, solo, t]
  );
  const longest = Math.max(...flies.map((f) => f.ticks.length));
  const clock = useClock(longest + 3, { autoplay, speed: 12 });
  const [focus, setFocus] = useState(flies.length - 1);
  const you = d.day.ticks;
  const yt = you[Math.min(clock.tick, you.length - 1)];
  const youDead = clock.tick >= you.length - 1 && !d.day.alive;

  useEffect(() => { onTick?.(youDead ? null : yt); }, [yt, youDead, onTick]);

  return (
    <div className="arena-day">
      <Petri world={d.colony.world} flies={flies} clock={clock} focus={focus} onPick={setFocus} />
      <Timeline clock={clock} flies={flies} focus={focus} dusk={longest} />
      <p className="arena-now">
        {youDead ? (
          t(<>你的果蝇死在第 {you.length - 1} 步，{d.colony.world.danger.some((c) => c.x === yt.x && c.y === yt.y) ? "掉进了陷阱" : "饿死了"}。</>,
            <>Your fly died at tick {you.length - 1}{d.colony.world.danger.some((c) => c.x === yt.x && c.y === yt.y) ? ", in a trap" : ", starved"}.</>)
        ) : clock.tick >= longest - 1 ? (
          t(<>天黑了，你的果蝇活下来了。</>, <>Dusk. Your fly made it.</>)
        ) : (
          t(<>第 {Math.min(clock.tick, you.length - 1)} 步：你的果蝇{BEHAVIOUR_VERB_ZH[yt.behavior]}{yt.gf ? "，并且跳了起来" : ""}。</>,
            <>Tick {Math.min(clock.tick, you.length - 1)}: your fly {BEHAVIOUR_VERB[yt.behavior]}{yt.gf ? " and jumps" : ""}.</>)
        )}
      </p>
    </div>
  );
}

export default function Arena({ brain, dates, onTick, onResult, compact, solo }: { brain: Brain; dates: string[]; onTick?: (t: Tick | null) => void; onResult?: (d: Duel[]) => void; compact?: boolean; solo?: boolean }) {
  const [busy, setBusy] = useState(true);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [tab, setTab] = useState(0);
  const [played, setPlayed] = useState(false);
  const { t } = useLang();

  // let the input paint first; a week of duels takes a few dozen milliseconds
  useEffect(() => {
    setBusy(true);
    const id = setTimeout(() => {
      const ds = dates.map((date) => duel(brain, date));
      setDuels(ds);
      onResult?.(ds);
      setBusy(false);
    }, 40);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brain, dates]);

  useEffect(() => { if (tab >= dates.length) setTab(0); }, [dates, tab]);

  const d = duels[Math.min(tab, duels.length - 1)];

  return (
    <div id="arena" className={`arena ${busy ? "busy" : ""} ${compact ? "compact" : ""}`}>
      {dates.length > 1 && (
        <div className="arena-days" role="tablist">
          {dates.map((date, i) => {
            const r = duels[i];
            return (
              <button key={date} role="tab" aria-selected={i === tab} className={`${i === tab ? "on" : ""} ${r ? (r.day.alive ? "dusk" : "died") : ""}`} onClick={() => { setTab(i); setPlayed(true); }}>
                <span>{date.slice(5)}</span>
                <b>{r ? (r.day.alive ? t("天黑", "dusk") : `† ${r.lived}`) : "…"}</b>
              </button>
            );
          })}
        </div>
      )}
      {d ? (
        <>
          <DayView key={`${d.date}-${brain.netlist.gates.length}-${duels.length}`} d={d} onTick={onTick} autoplay={!played || true} solo={solo} />
          <div className="arena-result">
            <div className="place">
              <b>{ORD[d.place]}</b>
              <span>{t(`${d.date} 培养皿里 9 只中`, `of 9 in the ${d.date} dish`)}</span>
            </div>
            <ol className="arena-table">
              {d.table.map((r, i) => (
                <li key={r.name} className={r.challenger ? "you" : ""}>
                  <span className="pos">{i + 1}</span>
                  <span className="nm">{r.challenger ? t("你的果蝇", "your fly") : r.name}</span>
                  <span className="lv">{r.alive ? t("天黑", "dusk") : t(`死于 ${r.lived - 1}`, `died ${r.lived - 1}`)}</span>
                  <span className="ml">{t(`${r.meals} 口`, `${r.meals} meal${r.meals === 1 ? "" : "s"}`)}</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : (
        <div className="arena-wait">{t("正在把你的果蝇放进培养皿…", "Putting your fly in the dish…")}</div>
      )}
    </div>
  );
}
