"use client";

/* The lab: set what the fly senses by hand and watch the 50 gates decide.
   The input word is written to the URL, so any situation is a link. */

import { useEffect, useState } from "react";
import { SiteNav, SiteFooter } from "@/app/components/ui/Shell";
import Circuit from "@/app/components/ui/Circuit";
import { Word, Decision, WHY } from "@/app/components/ui/Mind";
import { LEVEL_NAMES, LEVEL_NAMES_ZH, SENSE_ZH } from "@/app/components/ui/RuleEditor";
import { BEH_ZH } from "@/app/components/ui/Mind";
import { useLang } from "@/app/i18n/client";
import { encodeInputs, decodeOutputs, levelInt, BEHAVIORS } from "@/sim/encode";
import { BRAIN, evalWord } from "@/sim/netlist";
import { decideWord } from "@/sim/rules";
import { decideRef } from "@/sim/reference";

const LEVEL_MID = [50, 225, 500, 825];
const SENSES = ["food", "threat", "light", "novelty", "hunger"] as const;
type Sense = (typeof SENSES)[number];

export default function LabPage() {
  const [v, setV] = useState<Record<Sense, number>>({ food: 50, threat: 50, light: 825, novelty: 50, hunger: 50 });
  const [prev, setPrev] = useState(2);
  const { t, lang } = useLang();
  const LV = lang === "zh" ? LEVEL_NAMES_ZH : LEVEL_NAMES;

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has("w")) {
      const w = Number(p.get("w")) & 0xfff;
      setV({ food: LEVEL_MID[w & 3], threat: LEVEL_MID[(w >> 2) & 3], light: LEVEL_MID[(w >> 4) & 3], novelty: LEVEL_MID[(w >> 6) & 3], hunger: LEVEL_MID[(w >> 8) & 3] });
      setPrev((w >> 10) & 3);
    }
  }, []);

  const word = encodeInputs(v, prev);
  const out = evalWord(BRAIN, word);
  const { behavior, gf } = decodeOutputs(out);
  const { rule } = decideWord(word);
  const ref = decodeOutputs(decideRef(word).out);
  const agrees = decideRef(word).out === out;

  useEffect(() => { window.history.replaceState(null, "", `?w=${word}`); }, [word]);

  return (
    <main>
      <SiteNav here="/lab" />
      <div className="page">
        <header className="page-head">
          <h1>{t("实验室", "Lab")}</h1>
          <p>{t("手动设定果蝇感觉到什么。每个数值落进四个等级之一，组成一个 12 位的字，由同样的 50 个门来做决定。", "Set what the fly senses, by hand. The values fall into four levels each, become a 12-bit word, and the same 50 gates decide.")}</p>
        </header>
        <div className="lab">
          <div className="panel lab-controls">
            {SENSES.map((s) => {
              const l = levelInt(v[s]);
              return (
                <label className="slider" key={s}>
                  <span className="s-name">{t(SENSE_ZH[s], s)}</span>
                  <input type="range" min={0} max={1000} value={v[s]} onChange={(e) => setV((p) => ({ ...p, [s]: +e.target.value }))} />
                  <span className="s-val"><b>{LV[s][l]}</b><em>{v[s]}</em></span>
                </label>
              );
            })}
            <div className="slider">
              <span className="s-name">{t("上一步", "last move")}</span>
              <div className="seg">
                {BEHAVIORS.map((b, i) => (
                  <button key={b} className={prev === i ? "on" : ""} onClick={() => setPrev(i)}>{t(BEH_ZH[b] ?? b, b)}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 8 }}><Word word={word} /></div>
          </div>
          <div className="panel lab-out">
            <Decision behavior={behavior} gf={gf} why={WHY[rule]} rule={rule} />
            <p className={agrees ? "ok-text" : "bad-text"} style={{ marginTop: 14, fontWeight: 600 }}>
              {agrees ? t("参考果蝇也会这么做。", "The reference fly would do the same.") : t(`参考果蝇会选择${BEH_ZH[ref.behavior] ?? ref.behavior}${ref.gf ? "并弹跳" : ""}。`, `The reference fly would ${ref.behavior}${ref.gf ? " and jump" : ""} instead.`)}
            </p>
          </div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <Circuit netlist={BRAIN} word={word} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
