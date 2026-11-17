"use client";

/* The brain, written as rules. Each row reads like a sentence:
   “if  [ahead: wall] [smell: left]  →  turn left  · memory → 1”.
   The row that is deciding right now glows. */

import { useEffect, useRef, useState } from "react";
import { FIELDS, MAX_RULES, field, type Act, type EvoProgram, type EvoRule, type FieldId } from "@/sim/evo/brain";
import type { EvoLevel } from "@/sim/evo/levels";
import { ACT, SENSE, type T } from "./text";
import { sfx } from "./sound";

type Action = { act: Act; mem?: 0 | 1 };

function ActPicker({ value, acts, onChange, t }: { value: Act; acts: Act[]; onChange: (a: Act) => void; t: T }) {
  return (
    <span className="evo-acts" role="radiogroup" aria-label={t("动作", "Action")}>
      {acts.map((a) => (
        <button key={a} type="button" role="radio" aria-checked={value === a} className={value === a ? "on" : ""} title={t(ACT[a].zh, ACT[a].en)} onClick={() => { sfx.click(); onChange(a); }}>
          <b aria-hidden>{ACT[a].glyph}</b>
          <span>{t(ACT[a].zh, ACT[a].en)}</span>
        </button>
      ))}
    </span>
  );
}

function MemChip({ value, onChange, t }: { value: 0 | 1 | undefined; onChange: (v: 0 | 1 | undefined) => void; t: T }) {
  const next = value === undefined ? 1 : value === 1 ? 0 : undefined;
  return (
    <button type="button" className={`evo-mem ${value === undefined ? "" : "set"}`} onClick={() => { sfx.click(); onChange(next); }} title={t("点一下切换：不变 → 设为 1 → 设为 0", "Click to cycle: keep → set 1 → set 0")}>
      <i aria-hidden>◉</i>
      {value === undefined ? t("记忆不变", "memory kept") : t(`记忆→${value}`, `memory → ${value}`)}
    </button>
  );
}

function CondChip({ id, mask, onChange, onRemove, t }: { id: FieldId; mask: number; onChange: (m: number) => void; onRemove: () => void; t: T }) {
  const f = field(id);
  const S = SENSE[id];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const vals = S.values.map((v, i) => ({ ...v, i, on: ((mask >> i) & 1) === 1 })).slice(0, f.n);
  const shown = vals.filter((v) => v.on).map((v) => t(v.zh, v.en)).join(t("、", " or "));
  const binary = f.n === 2;
  return (
    <span className={`evo-cond f-${id}`} ref={ref}>
      <button
        type="button"
        className="evo-cond-main"
        onClick={() => {
          sfx.click();
          if (binary) onChange(mask === 2 ? 1 : 2);
          else setOpen((o) => !o);
        }}
        aria-expanded={binary ? undefined : open}
        title={binary ? t("点一下换成另一个值", "Click to flip") : t("选几个值都行", "Pick any of the values")}
      >
        <i aria-hidden>{S.icon}</i>
        <span className="k">{t(S.zh, S.en)}</span>
        <span className="v">{shown}</span>
      </button>
      <button type="button" className="evo-cond-x" onClick={onRemove} aria-label={t("去掉这个条件", "Remove this condition")}>×</button>
      {open && (
        <span className="evo-pop" role="group" aria-label={t(S.zh, S.en)}>
          {vals.map((v) => (
            <button
              key={v.i}
              type="button"
              className={v.on ? "on" : ""}
              aria-pressed={v.on}
              onClick={() => {
                const m = mask ^ (1 << v.i);
                if (m === 0) return;
                sfx.click();
                onChange(m);
              }}
            >
              {t(v.zh, v.en)}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function AddCond({ level, rule, onAdd, t }: { level: EvoLevel; rule: EvoRule; onAdd: (id: FieldId) => void; t: T }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const free = FIELDS.filter((f) => level.senses.includes(f.id) && rule.when[f.id] === undefined);
  if (free.length === 0) return null;
  return (
    <span className="evo-add" ref={ref}>
      <button type="button" className="evo-add-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        + {t("条件", "condition")}
      </button>
      {open && (
        <span className="evo-pop list">
          {free.map((f) => (
            <button key={f.id} type="button" onClick={() => { sfx.click(); onAdd(f.id); setOpen(false); }}>
              <i aria-hidden>{SENSE[f.id].icon}</i> {t(SENSE[f.id].zh, SENSE[f.id].en)}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

export default function BrainEditor({
  level,
  program,
  onChange,
  firing,
  t,
  pulseOtherwise = false
}: {
  level: EvoLevel;
  program: EvoProgram;
  onChange: (p: EvoProgram) => void;
  firing: number | null;
  t: T;
  pulseOtherwise?: boolean;
}) {
  const set = (i: number, r: EvoRule) => onChange({ ...program, rules: program.rules.map((x, j) => (j === i ? r : x)) });
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= program.rules.length) return;
    const rules = program.rules.slice();
    [rules[i], rules[j]] = [rules[j], rules[i]];
    sfx.click();
    onChange({ ...program, rules });
  };
  const remove = (i: number) => { sfx.click(); onChange({ ...program, rules: program.rules.filter((_, j) => j !== i) }); };
  const add = () => {
    if (program.rules.length >= MAX_RULES) return;
    const first = level.senses[0];
    const when: EvoRule["when"] = first ? { [first]: 2 } : {};
    sfx.click();
    onChange({ ...program, rules: [...program.rules, { when, act: level.acts.includes(3) ? 3 : 1 }] });
  };
  const withAct = (r: EvoRule | Action, a: Action): Action => {
    const out: Action = { act: a.act };
    if (a.mem !== undefined) out.mem = a.mem;
    void r;
    return out;
  };
  const canRules = level.senses.length > 0;

  return (
    <div className="evo-brain">
      <ol className="evo-rules">
        {program.rules.map((r, i) => (
          <li key={i} className={`evo-rule ${firing === i ? "firing" : ""}`}>
            <span className="n">{i + 1}</span>
            <span className="if">{t("如果", "if")}</span>
            <span className="conds">
              {FIELDS.filter((f) => r.when[f.id] !== undefined).map((f) => (
                <CondChip
                  key={f.id}
                  id={f.id}
                  mask={r.when[f.id]!}
                  t={t}
                  onChange={(m) => set(i, { ...r, when: { ...r.when, [f.id]: m } })}
                  onRemove={() => {
                    const when = { ...r.when };
                    delete when[f.id];
                    sfx.click();
                    set(i, { ...r, when });
                  }}
                />
              ))}
              {Object.keys(r.when).length === 0 && <span className="always">{t("总是", "always")}</span>}
              <AddCond level={level} rule={r} t={t} onAdd={(id) => set(i, { ...r, when: { ...r.when, [id]: 2 } })} />
            </span>
            <span className="then">
              <span className="arrow" aria-hidden>→</span>
              <ActPicker value={r.act} acts={level.acts} t={t} onChange={(a) => set(i, { ...r, ...withAct(r, { act: a, mem: r.mem }) })} />
              {level.memory && (
                <MemChip
                  value={r.mem}
                  t={t}
                  onChange={(v) => {
                    const nr: EvoRule = { ...r };
                    if (v === undefined) delete nr.mem;
                    else nr.mem = v;
                    set(i, nr);
                  }}
                />
              )}
            </span>
            <span className="tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("上移", "Move up")}>↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === program.rules.length - 1} aria-label={t("下移", "Move down")}>↓</button>
              <button type="button" onClick={() => remove(i)} aria-label={t("删除这条规则", "Delete this rule")}>×</button>
            </span>
          </li>
        ))}
        <li className={`evo-rule otherwise ${firing === -1 ? "firing" : ""} ${pulseOtherwise ? "pulse" : ""}`}>
          <span className="n">∗</span>
          <span className="if">{t("否则", "otherwise")}</span>
          <span className="conds" />
          <span className="then">
            <span className="arrow" aria-hidden>→</span>
            <ActPicker value={program.otherwise.act} acts={level.acts} t={t} onChange={(a) => onChange({ ...program, otherwise: { ...program.otherwise, act: a } })} />
            {level.memory && (
              <MemChip
                value={program.otherwise.mem}
                t={t}
                onChange={(v) => {
                  const o: Action = { act: program.otherwise.act };
                  if (v !== undefined) o.mem = v;
                  onChange({ ...program, otherwise: o });
                }}
              />
            )}
          </span>
          <span className="tools" />
        </li>
      </ol>
      {canRules ? (
        <button type="button" className="evo-newrule" onClick={add} disabled={program.rules.length >= MAX_RULES}>
          + {t("新规则", "New rule")} <small>{program.rules.length}/{MAX_RULES}</small>
        </button>
      ) : (
        <p className="evo-note">{t("这只果蝇还没有任何感官，只能决定“否则”做什么。", "This fly has no senses yet. All it can decide is what to do ‘otherwise’.")}</p>
      )}
    </div>
  );
}
