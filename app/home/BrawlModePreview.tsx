"use client";

import { useState } from "react";
import FightCanvas from "../brawl/FightCanvas";
import { C } from "../components/ui/tokens";
import { bodyOf, T, type GearId } from "@/sim/duel";
import { fightRival, seedFor, type Rival } from "@/sim/arena";
import { useLang } from "../i18n/client";

const rival: Rival = {
  name: "B12",
  ai: true,
  chips: ["block", "flank", "punish"],
  gear: ["legs"],
};
const mine: GearId[] = ["shell"];
const fight = fightRival(["bite", "berserk", "block"], mine, rival, seedFor("2026-11-17", 2), 2);

export default function BrawlModePreview({ onDone }: { onDone: () => void }) {
  const { t, lang } = useLang();
  const [speed] = useState(T.hz * 1.5);
  const verdict = fight.winner === -1
    ? { text: t("平局", "Draw"), color: C.chalk }
    : { text: `${fight.winner === 0 ? "R09" : "B12"} ${t("胜", "wins")}`, color: fight.winner === 0 ? C.agar : C.frost };

  return (
    <div className="home-real-preview home-real-fight">
      <FightCanvas
        result={fight.result}
        names={["R09", "B12"]}
        maxHp={[bodyOf(mine).maxHp, bodyOf(rival.gear).maxHp]}
        hues={[C.agar, C.frost]}
        speed={speed}
        muted
        onDone={onDone}
        zh={lang === "zh"}
        verdict={verdict}
      />
      <div className="home-real-preview-meta">
        <span><b>{fight.gates}</b>{t("红方门数", "red gates")}</span>
        <span><b>{fight.rivalGates}</b>{t("蓝方门数", "blue gates")}</span>
        <span><b>60 Hz</b>{t("真实战斗", "real fight")}</span>
      </div>
    </div>
  );
}

