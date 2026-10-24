"use client";

/* What one fly sensed and decided on one tick: five meters, the 12-bit word
   they become, and the answer. Levels are the engine's own cut points
   (100 / 350 / 650), drawn on each meter so a reader can see why a value of
   340 is "level 1" and 360 is "level 2". */

import { BEHAVIOUR_COLOR } from "./tokens";
import { useLang } from "@/app/i18n/client";

const NAME_ZH: Record<string, string> = { food: "食物", threat: "危险", light: "光线", novelty: "新奇", hunger: "饥饿", previous: "上一步" };
export const BEH_ZH: Record<string, string> = { approach: "靠近", avoid: "躲开", explore: "探索", freeze: "不动" };

export const SENSE_NAMES = ["food", "threat", "light", "novelty", "hunger"] as const;
const CUTS = [100, 350, 650];
const lvl = (v: number) => (v >= 650 ? 3 : v >= 350 ? 2 : v >= 100 ? 1 : 0);

export interface MindTick {
  food: number;
  threat: number;
  light: number;
  novelty: number;
  hunger: number;
  inWord: number;
  behavior: string;
  gf: boolean;
}

const SENSE_COLOR: Record<string, string> = {
  food: "var(--yeast)",
  threat: "var(--eye)",
  light: "#F6E7C1",
  novelty: "#9FD6E0",
  hunger: "var(--agar)"
};

export function Meters({ t }: { t: MindTick }) {
  const { t: tr } = useLang();
  return (
    <div className="meters">
      {SENSE_NAMES.map((s) => {
        const v = t[s];
        return (
          <div className="meter" key={s}>
            <span className="m-name">{tr(NAME_ZH[s], s)}</span>
            <span className="m-bar">
              <i style={{ width: `${v / 10}%`, background: SENSE_COLOR[s] }} />
              {CUTS.map((c) => <b key={c} style={{ left: `${c / 10}%` }} />)}
            </span>
            <span className="m-lvl" data-l={lvl(v)}>{lvl(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

const WORD_GROUPS = ["food", "threat", "light", "novelty", "hunger", "previous"];

export function Word({ word }: { word: number }) {
  const { t: tr } = useLang();
  return (
    <div className="word" aria-label={tr(`输入字 ${word}`, `Input word ${word}`)}>
      {WORD_GROUPS.map((g, gi) => (
        <span className="w-grp" key={g}>
          <span className="w-bits">
            {[1, 0].map((b) => {
              const on = (word >> (gi * 2 + b)) & 1;
              return <i key={b} className={on ? "on" : ""}>{on}</i>;
            })}
          </span>
          <span className="w-name">{tr(NAME_ZH[g], g)}</span>
        </span>
      ))}
    </div>
  );
}

export function Decision({ behavior, gf, why, rule }: { behavior: string; gf: boolean; why?: string; rule?: string }) {
  const { t: tr, lang } = useLang();
  const reason = lang === "zh" && rule && WHY_ZH[rule] ? WHY_ZH[rule] : why;
  return (
    <div className="decision">
      <span className="d-beh" style={{ color: BEHAVIOUR_COLOR[behavior] }}>{tr(BEH_ZH[behavior] ?? behavior, behavior)}</span>
      {gf && <span className="d-gf">{tr("+ 逃逸弹跳", "+ escape jump")}</span>}
      {reason && <p className="d-why">{reason}</p>}
    </div>
  );
}

/** Plain-language reasons for the official rules, by rule id. */
export const WHY: Record<string, string> = {
  escape: "Something is close. The Giant Fibre fires and the fly jumps away.",
  danger: "It senses a threat, and it is either already backing off or not hungry enough to risk it.",
  feed: "It is starving and can smell food, so it goes for it.",
  lure: "Food is right there. It heads straight for it.",
  pursue: "It was already heading for food and still smells it, so it keeps going.",
  curious: "This patch is new to it, so it explores.",
  rest: "It was resting and is not hungry yet, so it stays put.",
  default: "Nothing pressing. In the light it wanders; in the dark it holds still."
};

export const WHY_ZH: Record<string, string> = {
  escape: "有东西贴得很近。巨纤维神经元放电，果蝇一跳逃开。",
  danger: "它感觉到了危险，而且要么已经在后退，要么还没饿到愿意冒险。",
  feed: "它快饿死了，又闻到了食物，所以冲过去。",
  lure: "食物就在眼前，它径直走过去。",
  pursue: "它本来就在朝食物走，而且还闻得到，所以继续走。",
  curious: "这块地方对它来说是新的，所以它去探索。",
  rest: "它刚在休息，还不饿，所以待着不动。",
  default: "没什么要紧的事。亮的时候它四处闲逛，暗的时候原地不动。"
};
