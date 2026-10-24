"use client";

/* ── RuleEditor.tsx ──────────────────────────────────────────────────────────
   The brain as a list of plain rules. Each rule is a card: the conditions it
   needs (each sense as a strip of four levels, with names a person can read),
   and what the fly does when they hold. The first rule that matches wins, so
   cards can be moved up and down. Every edit returns a new Program; the
   parent compiles it.
   --------------------------------------------------------------------------- */

import { useState } from "react";
import { SENSES, MAX_RULES, type Program, type ProgramRule, type SenseName } from "@/sim/program";
import { BEHAVIOUR_COLOR } from "./tokens";
import { useLang } from "@/app/i18n/client";

export const LEVEL_NAMES_ZH: Record<SenseName, [string, string, string, string]> = {
  food: ["没有", "远", "近", "很近"],
  threat: ["没有", "远", "近", "很近"],
  light: ["黑", "暗", "亮", "很亮"],
  novelty: ["熟悉", "见过", "少见", "全新"],
  hunger: ["饱", "有点饿", "饿", "快饿死"]
};
export const SENSE_ZH: Record<SenseName, string> = { food: "食物", threat: "危险", light: "光线", novelty: "新奇", hunger: "饥饿" };
const BEH_ZH = ["靠近", "躲开", "探索", "不动"];

export const LEVEL_NAMES: Record<SenseName, [string, string, string, string]> = {
  food: ["none", "far", "near", "close"],
  threat: ["none", "far", "near", "close"],
  light: ["dark", "dim", "lit", "bright"],
  novelty: ["stale", "worn", "seen", "new"],
  hunger: ["fed", "peckish", "hungry", "starving"]
};

const BEH = ["approach", "avoid", "explore", "freeze"] as const;
const GERUND = ["approaching", "avoiding", "exploring", "freezing"];

function rangeText(s: SenseName, r: [number, number]) {
  const n = LEVEL_NAMES[s];
  return r[0] === r[1] ? n[r[0]] : `${n[r[0]]} to ${n[r[1]]}`;
}

/** One line of English for a rule, used in summaries and aria labels. */
export function ruleSentence(r: ProgramRule): string {
  const parts = SENSES.filter((s) => r.when[s]).map((s) => `${s} is ${rangeText(s, r.when[s]!)}`);
  if (r.prev && r.prev.length) parts.push(`it was last ${r.prev.map((b) => GERUND[b]).join(" or ")}`);
  const cond = parts.length ? `If ${parts.join(" and ")}` : "Always";
  return `${cond}, ${BEH[r.then]}${r.gf ? " and jump" : ""}.`;
}

function Levels({ sense, range, onChange }: { sense: SenseName; range: [number, number] | undefined; onChange: (r: [number, number] | undefined) => void }) {
  const { lang } = useLang();
  const names = lang === "zh" ? LEVEL_NAMES_ZH : LEVEL_NAMES;
  const [lo, hi] = range ?? [0, 3];
  const click = (v: number) => {
    // a click on a level inside the range trims to it from the nearer end; outside, extends to it
    let a = lo, b = hi;
    if (!range) { a = v; b = v; }
    else if (v < lo) a = v;
    else if (v > hi) b = v;
    else if (lo === hi) return onChange(undefined);
    else if (v === lo) a = v + 1;
    else if (v === hi) b = v - 1;
    else { a = v; b = v; }
    onChange(a === 0 && b === 3 ? undefined : [a, b]);
  };
  return (
    <div className="levels" role="group" aria-label={`${sense} levels`}>
      {names[sense].map((name, v) => {
        const on = range ? v >= lo && v <= hi : false;
        return (
          <button key={v} type="button" className={on ? "on" : ""} aria-pressed={on} onClick={() => click(v)}>
            {name}
          </button>
        );
      })}
    </div>
  );
}

function Output({ then, gf, onChange }: { then: number; gf?: boolean; onChange: (then: number, gf: boolean) => void }) {
  const { t } = useLang();
  return (
    <div className="output">
      <div className="beh-pick" role="radiogroup" aria-label={t("果蝇接下来会", "Then the fly will")}>
        {BEH.map((b, i) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={then === i}
            className={then === i ? "on" : ""}
            style={{ ["--c" as string]: BEHAVIOUR_COLOR[b] }}
            onClick={() => onChange(i, !!gf)}
          >
            {t(BEH_ZH[i], b)}
          </button>
        ))}
      </div>
      <label className={`jump ${gf ? "on" : ""}`}>
        <input type="checkbox" checked={!!gf} onChange={(e) => onChange(then, e.target.checked)} />
        {t("弹跳", "jump")}
      </label>
    </div>
  );
}

export default function RuleEditor({
  program,
  onChange,
  firing,
  lockOrder
}: {
  program: Program;
  onChange: (p: Program) => void;
  /** Which rule decided on the tick being shown (-1 = otherwise), to highlight it. */
  firing?: number | null;
  lockOrder?: boolean;
}) {
  const [adding, setAdding] = useState<number | null>(null);
  const { t } = useLang();
  const sn = (s: SenseName) => t(SENSE_ZH[s], s);
  const set = (i: number, r: ProgramRule) => onChange({ ...program, rules: program.rules.map((x, j) => (j === i ? r : x)) });
  const move = (i: number, d: number) => {
    const rules = program.rules.slice();
    const j = i + d;
    if (j < 0 || j >= rules.length) return;
    [rules[i], rules[j]] = [rules[j], rules[i]];
    onChange({ ...program, rules });
  };
  const remove = (i: number) => onChange({ ...program, rules: program.rules.filter((_, j) => j !== i) });
  const add = () => {
    if (program.rules.length >= MAX_RULES) return;
    onChange({ ...program, rules: [...program.rules, { when: { threat: [2, 3] }, then: 1 }] });
  };

  return (
    <div className="rules">
      <ol className="rule-list">
        {program.rules.map((r, i) => {
          const present = SENSES.filter((s) => r.when[s]);
          const missing = SENSES.filter((s) => !r.when[s]);
          const hasPrev = !!(r.prev && r.prev.length);
          return (
            <li key={i} className={`rule ${firing === i ? "firing" : ""}`} aria-label={ruleSentence(r)}>
              <div className="rule-top">
                <span className="rule-n">{i + 1}</span>
                <span className="rule-if">{present.length || hasPrev ? t("如果", "If") : t("总是", "Always")}</span>
                {r.label && <span className="rule-label">{r.label}</span>}
                <span className="rule-tools">
                  {!lockOrder && (
                    <>
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("上移", "Move up")}>↑</button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === program.rules.length - 1} aria-label={t("下移", "Move down")}>↓</button>
                    </>
                  )}
                  <button type="button" onClick={() => remove(i)} aria-label={t("删除规则", "Delete rule")}>✕</button>
                </span>
              </div>
              {present.map((s) => (
                <div className="cond" key={s}>
                  <span className="cond-name">{sn(s)}</span>
                  <Levels
                    sense={s}
                    range={r.when[s]}
                    onChange={(rg) => {
                      const when = { ...r.when };
                      if (rg) when[s] = rg; else delete when[s];
                      set(i, { ...r, when });
                    }}
                  />
                </div>
              ))}
              {hasPrev && (
                <div className="cond">
                  <span className="cond-name">{t("上一步", "last move")}</span>
                  <div className="levels prev" role="group" aria-label={t("上一步的行为", "previous behaviour")}>
                    {BEH.map((b, k) => {
                      const on = r.prev!.includes(k);
                      return (
                        <button key={b} type="button" className={on ? "on" : ""} aria-pressed={on}
                          onClick={() => {
                            const prev = on ? r.prev!.filter((x) => x !== k) : [...r.prev!, k].sort();
                            set(i, { ...r, prev: prev.length && prev.length < 4 ? prev : undefined });
                          }}>
                          {t(BEH_ZH[k], b)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="cond-add">
                {adding === i ? (
                  <div className="cond-menu">
                    {missing.map((s) => (
                      <button key={s} type="button" onClick={() => { set(i, { ...r, when: { ...r.when, [s]: [2, 3] } }); setAdding(null); }}>{sn(s)}</button>
                    ))}
                    {!hasPrev && <button type="button" onClick={() => { set(i, { ...r, prev: [1] }); setAdding(null); }}>{t("上一步", "last move")}</button>}
                    <button type="button" className="x" onClick={() => setAdding(null)}>{t("取消", "cancel")}</button>
                  </div>
                ) : (
                  (missing.length > 0 || !hasPrev) && <button type="button" className="add-cond" onClick={() => setAdding(i)}>{t("+ 条件", "+ condition")}</button>
                )}
              </div>
              <div className="then">
                <span className="then-k">{t("就", "then")}</span>
                <Output then={r.then} gf={r.gf} onChange={(then, gf) => set(i, { ...r, then, gf: gf || undefined })} />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="rule-actions">
        <button type="button" className="btn small" onClick={add} disabled={program.rules.length >= MAX_RULES}>{t("+ 加一条规则", "+ Add a rule")}</button>
        <span className="dim">{t(`${program.rules.length} / ${MAX_RULES} 条规则。第一条符合的规则说了算。`, `${program.rules.length} of ${MAX_RULES} rules. The first rule that matches decides.`)}</span>
      </div>
      <div className={`rule otherwise ${firing === -1 ? "firing" : ""}`}>
        <div className="rule-top"><span className="rule-if">{t("否则", "Otherwise")}</span></div>
        <div className="then">
          <span className="then-k">{t("就", "then")}</span>
          <Output then={program.otherwise.then} gf={program.otherwise.gf} onChange={(then, gf) => onChange({ ...program, otherwise: { then, gf: gf || undefined } })} />
        </div>
      </div>
    </div>
  );
}
