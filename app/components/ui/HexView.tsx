"use client";

import { useState } from "react";
import { useLang } from "@/app/i18n/client";

/* The netlist as TapeOut sees it: one 7-byte record per NAND, opcode then the
   two operand signals. Hover a record to see which gate it is. */
export default function HexView({ hex }: { hex: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLang();
  const body = hex.slice(2);
  const recs = body.match(/.{14}/g) ?? [];
  return (
    <div className="hexview">
      <div className="hex-grid">
        {recs.map((r, i) => (
          <span key={i} className="rec" title={`gate ${i + 1}: NAND(signal ${parseInt(r.slice(2, 8), 16)}, signal ${parseInt(r.slice(8), 16)})`}>
            <i className="op">{r.slice(0, 2)}</i>
            <i className="a">{r.slice(2, 8)}</i>
            <i className="b">{r.slice(8)}</i>
          </span>
        ))}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn small" onClick={async () => { try { await navigator.clipboard.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} }}>
          {copied ? t("已复制", "Copied") : t(`复制全部 ${body.length / 2} 字节`, `Copy all ${body.length / 2} bytes`)}
        </button>
        <span className="dim" style={{ fontSize: 14 }}><i className="key op" />{t("操作码 00 = NAND", "opcode 00 = NAND")} <i className="key a" />{t("第一个输入", "first input")} <i className="key b" />{t("第二个输入", "second input")}</span>
      </div>
    </div>
  );
}
