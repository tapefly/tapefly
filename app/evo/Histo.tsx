"use client";

/* One score against everyone else's: a histogram with your bar lit. */

import type { T } from "./text";

export default function Histo({ label, unit, values, yours, best, t }: { label: string; unit: string; values: number[]; yours: number; best?: number; t: T }) {
  const all = values.length ? values : [yours];
  let lo = Math.min(yours, ...all), hi = Math.max(yours, ...all);
  if (hi === lo) { lo -= 2; hi += 2; }
  const span = hi - lo + 1;
  const nb = Math.min(24, span);
  const bw = span / nb;
  const bins = new Array<number>(nb).fill(0);
  const binOf = (v: number) => Math.min(nb - 1, Math.floor((v - lo) / bw));
  for (const v of all) bins[binOf(v)]++;
  const max = Math.max(...bins);
  const yb = binOf(yours);
  const beat = values.length ? Math.round((values.filter((v) => v > yours).length / values.length) * 100) : 0;
  const W = 240, H = 92;
  return (
    <figure className="evo-histo">
      <figcaption>
        <span className="k">{label}</span>
        <b>{yours}</b>
        <span className="u">{unit}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t(`${label}：你 ${yours}，比 ${beat}% 的大脑更少`, `${label}: yours ${yours}, fewer than ${beat}% of brains`)}>
        {bins.map((n, i) => {
          const h = n === 0 ? 0 : 4 + (n / max) * (H - 26);
          const x = (i * W) / nb;
          return <rect key={i} x={x + 1} y={H - 16 - h} width={W / nb - 2} height={h} rx={1.5} className={i === yb ? "you" : ""} />;
        })}
        <polygon points={`${((yb + 0.5) * W) / nb - 5},${H - 2} ${((yb + 0.5) * W) / nb + 5},${H - 2} ${((yb + 0.5) * W) / nb},${H - 10}`} className="mark" />
        <text x={0} y={H - 1} className="ax">{lo}</text>
        <text x={W} y={H - 1} textAnchor="end" className="ax">{hi}</text>
      </svg>
      <p className="evo-histo-note">
        {values.length > 1 ? t(`比 ${beat}% 的大脑少`, `fewer than ${beat}%`) : t("只有一种解法", "only one way to do it")}
        {best !== undefined && best < yours ? t(` · 你的最好 ${best}`, ` · your best ${best}`) : ""}
      </p>
    </figure>
  );
}
