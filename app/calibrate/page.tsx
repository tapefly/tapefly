import Link from "next/link";
import { SiteNav, SiteFooter } from "@/app/components/ui/Shell";
import ExamBoard from "@/app/components/ui/ExamBoard";
import { BRAIN } from "@/sim/netlist";
import { fidelityCert, runCalibration } from "@/sim/calibration";
import { stableStringify } from "@/sim/hash";
import { RULES } from "@/sim/rules";
import { REF_DRIVES } from "@/sim/reference";
import committed from "../../calibration/ffw-nand-1.json";
import { serverT } from "../i18n/server";

/* The calibration lab — the FIDELITY protocol's first room, and the site's
   first page in the paper direction: a certificate is a document, not a
   dashboard, so this one is printed on white.

   The page renders from the same sim functions the engine and `npm run
   calibrate` use, and it refuses to render if the committed certificate
   disagrees with a fresh recomputation. A stale file cannot be published
   by accident. */

export function generateMetadata() { return { title: serverT()("考试 — TapeFly", "Calibrate — TapeFly") }; }

const dim = (v: number, total: number) => (v / total).toFixed(4);

export default function CalibratePage() {
  const { sealed } = fidelityCert();
  if (stableStringify(sealed) !== stableStringify(committed)) {
    throw new Error("calibration/ffw-nand-1.json is stale — run `npm run calibrate` and commit the result");
  }

  const t = serverT();
  const { rows, totals } = runCalibration();
  void rows;
  const r = sealed as {
    circuit: { version: string; gates: number; netlist: string };
    reference: { version: string; status: string; params: Record<string, unknown> };
    suite: { name: string; rows: number };
    result: { agreement: string; gf: { recall: string; precision: string } };
    seal: string;
  };

  return (
    <main>
      <SiteNav here="/calibrate" />
      <div className="page">
        <header className="page-head">
          <h1>{t("考试", "The exam")}</h1>
          <p>
            {t(`50 个门的大脑，对照一只根据文献单独写出的参考果蝇，在果蝇可能遇到的全部 ${r.suite.rows} 种情况上逐一比对。这个数字在本页存在之前就算好了；如果重新跑出的结果和提交的证书不一致，这个页面会拒绝生成。`,
               `The 50-gate brain against a reference fly written separately from the literature, on all ${r.suite.rows} situations a fly can be in. The number was computed before this page existed; the page refuses to build if a fresh run disagrees with the committed certificate.`)}
          </p>
        </header>

        <div className="stats">
          <div className="stat"><b>{(Number(r.result.agreement) * 100).toFixed(2)}%</b><span>{t(`一致率，4,096 中 ${totals.agree} 个`, `agreement, ${totals.agree} of 4,096`)}</span></div>
          <div className="stat"><b>{(Number(r.result.gf.recall) * 100).toFixed(0)}%</b><span>{t("参考果蝇的逃逸，电路也触发了", "of reference escapes also fired")}</span></div>
          <div className="stat"><b>{(Number(r.result.gf.precision) * 100).toFixed(0)}%</b><span>{t("电路的逃逸是合理的", "of circuit escapes were warranted")}</span></div>
          <div className="stat"><b>{totals.disagree}</b><span>{t("处不一致，全部列在下面", "disagreements, all shown below")}</span></div>
        </div>

        <div className="panel">
          <ExamBoard netlist={BRAIN} official />
        </div>

        <div className="two" style={{ marginTop: 16 }}>
          <div className="panel">
            <h2>{t("电路是哪条规则在说话", "Where the circuit was speaking")}</h2>
            <table className="tbl">
              <thead><tr><th>{t("规则", "rule")}</th><th className="num">{t("情况数", "situations")}</th><th className="num">{t("不一致", "disagree")}</th></tr></thead>
              <tbody>
                {RULES.map((rule) => {
                  const b = totals.byBrainRule[rule.id];
                  return <tr key={rule.id}><td>{rule.id}</td><td className="num">{b.rows}</td><td className="num bad-text">{b.disagree}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="panel">
            <h2>{t("参考果蝇是哪种驱动在回答", "Where the reference was answering")}</h2>
            <table className="tbl">
              <thead><tr><th>{t("驱动", "drive")}</th><th className="num">{t("情况数", "situations")}</th><th className="num">{t("不一致", "disagree")}</th></tr></thead>
              <tbody>
                {REF_DRIVES.map((d) => {
                  const b = totals.byRefDrive[d.id];
                  return <tr key={d.id}><td>{d.id}</td><td className="num">{b.rows}</td><td className="num bad-text">{b.disagree}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="two" style={{ marginTop: 16 }}>
          <div className="panel">
            <h2>{t("证书", "The certificate")}</h2>
            <table className="tbl">
              <tbody>
                <tr><td className="dim">{t("电路", "circuit")}</td><td>{r.circuit.version}, {r.circuit.gates} NAND, netlist <code>{r.circuit.netlist.slice(0, 16)}…</code></td></tr>
                <tr><td className="dim">{t("参考", "reference")}</td><td>{r.reference.version} ({r.reference.status})</td></tr>
                <tr><td className="dim">{t("题库", "suite")}</td><td>{r.suite.name}, {t(`${r.suite.rows} 行`, `${r.suite.rows} rows`)}</td></tr>
                <tr><td className="dim">{t("封印", "seal")}</td><td><code style={{ wordBreak: "break-all" }}>{r.seal}</code></td></tr>
              </tbody>
            </table>
            <pre className="cmd" style={{ marginTop: 12 }}>npm run calibrate</pre>
          </div>
          <div className="panel">
            <h2>{t("这证明不了什么", "What this does not prove")}</h2>
            <p>
              {t("和一份草稿参考的一致率是一个距离，不是一个分数。参考果蝇和电路出自同一人之手，所以在别人的电路来参加这场考试之前，这里的每个数字都只是一个作者在测量自己的两件发明。",
                 "Agreement with a draft reference is a distance, not a grade. The reference and the circuit were written by the same hand, so until someone else’s netlist sits this exam, every number here is one author measuring two of their own inventions.")}
            </p>
            <p>
              {t(<>所以这场考试是开放的：在<Link className="link" href="/build">大脑编辑器</Link>里做的任何大脑，都会在同样的 4,096 种情况上打分；<Link className="link" href="/play?l=reference">第 6 关</Link>要求满分。</>,
                 <>That is why the exam is open: any brain built in the <Link className="link" href="/build">brain editor</Link> is scored against the same 4,096 situations, and <Link className="link" href="/play?l=reference">level 6</Link> asks for a perfect score.</>)}
            </p>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
