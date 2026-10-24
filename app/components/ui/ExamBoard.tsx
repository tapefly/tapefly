"use client";

/* All 4,096 situations as a 64×64 board. Columns are food, threat and light;
   rows are novelty, hunger and the last move. Each cell is tinted by what the
   circuit does there; cells where the reference fly would do something else are
   marked white. Click any cell to read both answers. */

import { useEffect, useRef, useState } from "react";
import { evalWord, type Netlist } from "@/sim/netlist";
import { decideRef, REF_DRIVES } from "@/sim/reference";
import { decideWord, RULES } from "@/sim/rules";
import { BEHAVIORS } from "@/sim/encode";
import { BEHAVIOUR_COLOR } from "./tokens";
import { LEVEL_NAMES, LEVEL_NAMES_ZH, SENSE_ZH } from "./RuleEditor";
import { useLang } from "@/app/i18n/client";

const BEH_ZH: Record<string, string> = { approach: "靠近", avoid: "躲开", explore: "探索", freeze: "不动" };

const pos = (w: number) => ({ x: w & 63, y: w >> 6 });

export default function ExamBoard({ netlist, official }: { netlist: Netlist; official?: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [onlyBad, setOnlyBad] = useState(false);
  const { t, lang } = useLang();
  const bn = (x: string) => t(BEH_ZH[x] ?? x, x);
  const LV = lang === "zh" ? LEVEL_NAMES_ZH : LEVEL_NAMES;

  useEffect(() => {
    const c = cv.current!;
    const size = c.clientWidth;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = Math.round(size * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cell = size / 64;
    ctx.clearRect(0, 0, size, size);
    let first: number | null = null;
    for (let w = 0; w < 4096; w++) {
      const b = evalWord(netlist, w), r = decideRef(w).out;
      const { x, y } = pos(w);
      const bad = b !== r;
      if (bad && first === null) first = w;
      ctx.globalAlpha = onlyBad && !bad ? 0.07 : bad ? 1 : 0.3;
      ctx.fillStyle = bad ? "#F4F7F5" : BEHAVIOUR_COLOR[BEHAVIORS[b & 3]];
      ctx.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
    }
    ctx.globalAlpha = 1;
    if (sel !== null) {
      const { x, y } = pos(sel);
      ctx.strokeStyle = "#F2B64B";
      ctx.lineWidth = 2;
      ctx.strokeRect(x * cell - 1, y * cell - 1, cell + 2, cell + 2);
    }
    if (sel === null && first !== null) setSel(first);
  }, [netlist, sel, onlyBad]);

  const w = sel ?? 0;
  const b = evalWord(netlist, w), r = decideRef(w);
  const rule = official ? decideWord(w) : null;
  const f = [w & 3, (w >> 2) & 3, (w >> 4) & 3, (w >> 6) & 3, (w >> 8) & 3];
  const names = ["food", "threat", "light", "novelty", "hunger"] as const;

  return (
    <div className="exam">
      <div className="exam-board">
        <canvas
          ref={cv}
          role="img"
          aria-label={t("4096 种情况；白色格子是电路和参考果蝇不一致的地方", "4096 situations; white cells are where the circuit and the reference disagree")}
          onClick={(e) => {
            const rc = cv.current!.getBoundingClientRect();
            const x = Math.floor(((e.clientX - rc.left) / rc.width) * 64), y = Math.floor(((e.clientY - rc.top) / rc.height) * 64);
            setSel(Math.max(0, Math.min(4095, y * 64 + x)));
          }}
        />
        <div className="exam-key">
          {BEHAVIORS.map((x) => <span key={x}><i style={{ background: BEHAVIOUR_COLOR[x], opacity: 0.45 }} />{t(`两者都${bn(x)}`, `both ${x}`)}</span>)}
          <span><i style={{ background: "#F4F7F5" }} />{t("两者不一致", "the two disagree")}</span>
          <label className="jump" style={{ height: 28 }}><input type="checkbox" checked={onlyBad} onChange={(e) => setOnlyBad(e.target.checked)} />{t("只看不一致", "only disagreements")}</label>
        </div>
      </div>
      <div className="exam-detail">
        <h3>{t(`情况 ${w}`, `Situation ${w}`)}</h3>
        <ul className="exam-senses">
          {names.map((n, i) => <li key={n}><span>{t(SENSE_ZH[n], n)}</span><b>{LV[n][f[i]]}</b></li>)}
          <li><span>{t("上一步", "last move")}</span><b>{bn(BEHAVIORS[(w >> 10) & 3])}</b></li>
        </ul>
        <div className={`exam-ans ${b === r.out ? "same" : "diff"}`}>
          <div>
            <span>{t("电路", "The circuit")}</span>
            <b style={{ color: BEHAVIOUR_COLOR[BEHAVIORS[b & 3]] }}>{bn(BEHAVIORS[b & 3])}{b & 4 ? t(" + 弹跳", " + jump") : ""}</b>
            {rule && <em>{RULES.find((x) => x.id === rule.rule)?.text}</em>}
          </div>
          <div>
            <span>{t("参考果蝇", "The reference fly")}</span>
            <b style={{ color: BEHAVIOUR_COLOR[BEHAVIORS[r.out & 3]] }}>{bn(BEHAVIORS[r.out & 3])}{r.out & 4 ? t(" + 弹跳", " + jump") : ""}</b>
            <em>{REF_DRIVES.find((x) => x.id === r.drive)?.text}</em>
          </div>
        </div>
        <p className={b === r.out ? "ok-text" : "bad-text"} style={{ fontWeight: 650 }}>{b === r.out ? t("两者一致。", "They agree.") : t("两者不一致。", "They disagree.")}</p>
      </div>
    </div>
  );
}
