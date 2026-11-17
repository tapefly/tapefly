"use client";

import { useState } from "react";
import { useLang } from "../i18n/client";

type Stage = {
  id: string;
  status: "passed" | "blocked" | "available" | "requires-wallet";
  detail: string;
};

type ProofResult = {
  version: string;
  level: string;
  evaluation: {
    cleared: boolean;
    isSubmissionReady: boolean;
    gates: number;
    bits: number;
    seconds: number;
    problems: string[];
  };
  proof: {
    profile: string;
    nIn: number;
    nOut: number;
    gates: number;
    state: [string, string][];
    checkedInputs: number;
    bytesLength: number;
    bytesSha256: string;
    eligible: boolean;
    mismatch: unknown;
  };
  bytes: string;
  stages: Stage[];
  onchain: { ready: boolean; transactionSent: boolean; reason: string };
  nextAction: string;
};

export default function WorkshopAgentProof({ level, code }: { level: string; code: string }) {
  const { t } = useLang();
  const [result, setResult] = useState<ProofResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/workshop/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, code })
      });
      const body = await response.json().catch(() => null) as ProofResult | { error?: string } | null;
      if (!response.ok || !body || !("stages" in body)) throw new Error(body && "error" in body ? body.error : "proof failed");
      setResult(body);
    } catch {
      setError(t("Agent 证明没有完成，请稍后再试。", "The agent proof did not complete. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(JSON.stringify(result, null, 2)); }
    catch { setError(t("没能自动复制。", "Could not copy automatically.")); }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tapefly-agent-proof-${result.level}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const label = (stage: Stage) => {
    if (stage.status === "passed") return t("通过", "passed");
    if (stage.status === "available") return t("可执行", "available");
    if (stage.status === "blocked") return t("被阻止", "blocked");
    return t("等待 Processor", "awaiting processor");
  };

  return (
    <div className="agent-proof">
      <div className="agent-proof-head">
        <div>
          <span>{t("参考 Agent · 第 17 关", "Reference agent · level 17")}</span>
          <b>{t("一次请求跑完评分与全量电路核对", "One request runs the level and exhaustive circuit proof")}</b>
        </div>
        <button type="button" className="btn primary" onClick={run} disabled={busy}>
          {busy ? t("核对每一种输入…", "Checking every input…") : t("运行参考 Agent", "Run reference agent")}
        </button>
      </div>

      {error && <p className="agent-error">{error}</p>}

      {result && (
        <>
          <div className="agent-stages">
            {result.stages.map((stage, index) => (
              <div key={stage.id} className={`agent-stage ${stage.status}`}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <b>{stage.id}</b>
                <em>{label(stage)}</em>
                <p>{stage.detail}</p>
              </div>
            ))}
          </div>

          <div className="agent-facts">
            <span>{t("接口", "Profile")} <b>{result.proof.profile}</b></span>
            <span>{t("输入 / 输出", "Inputs / outputs")} <b>{result.proof.nIn} / {result.proof.nOut}</b></span>
            <span>{t("状态位", "State bits")} <b>{result.proof.state.length}</b></span>
            <span>{t("NAND 门", "NAND gates")} <b>{result.proof.gates}</b></span>
            <span>{t("全量核对", "Exhaustive checks")} <b>{result.proof.checkedInputs.toLocaleString()}</b></span>
            <span>{t("字节", "Bytes")} <b>{result.proof.bytesLength}</b></span>
            <span className="wide">{t("SHA-256", "SHA-256")} <b>{result.proof.bytesSha256}</b></span>
          </div>

          <div className="agent-proof-foot">
            <p>
              <b>{result.onchain.ready ? t("链上已就绪", "Onchain ready") : t("没有发送 X Layer 交易", "No X Layer transaction sent")}</b>
              <span>{result.onchain.reason}. {result.nextAction}</span>
            </p>
            <div>
              <button type="button" className="btn" onClick={copy}>{t("复制完整证明", "Copy full proof")}</button>
              <button type="button" className="btn" onClick={download}>{t("下载 JSON", "Download JSON")}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
