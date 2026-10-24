"use client";

/* The lineage's anchors on BNB Chain, each checkable from this browser:
   read the transaction, decode its data, and compare with the head the
   page computed from the dates alone. */

import { useMemo, useState } from "react";
import { createPublicClient, http, type PublicClient } from "viem";
import { bsc } from "viem/chains";
import { BSC_RPC } from "@/sim/onchain";
import { txCarries, type Anchor } from "@/sim/anchor";
import { useLang } from "../i18n/client";

export default function AnchorList({ anchors, heads }: { anchors: Anchor[]; heads: Record<string, string> }) {
  const { t } = useLang();
  const pub = useMemo(() => createPublicClient({ chain: bsc, transport: http(BSC_RPC) }) as PublicClient, []);
  const [state, setState] = useState<Record<string, string>>({});

  const check = async (a: Anchor) => {
    setState((s) => ({ ...s, [a.date]: t("读取中…", "Reading…") }));
    try {
      if (heads[a.date] !== a.head) throw new Error(t("记录的哈希和本页算出的不一致", "the recorded head differs from the one this page computed"));
      const tx = await pub.getTransaction({ hash: a.tx as `0x${string}` });
      const why = txCarries({ from: tx.from, to: tx.to, input: tx.input, blockNumber: tx.blockNumber }, a);
      if (why) throw new Error(why);
      const block = await pub.getBlock({ blockNumber: tx.blockNumber! });
      const when = new Date(Number(block.timestamp) * 1000).toISOString().replace("T", " ").slice(0, 16);
      setState((s) => ({ ...s, [a.date]: t(`✓ 在链上，区块 ${tx.blockNumber}（${when} UTC），哈希一致`, `✓ On chain in block ${tx.blockNumber} (${when} UTC); the head matches`) }));
    } catch (e) {
      setState((s) => ({ ...s, [a.date]: `✗ ${(e as Error).message.split("\n")[0]}` }));
    }
  };

  if (!anchors.length) return <p className="dim">{t("还没有锚定记录。第一次锚定后，这里会列出每一天写上链的哈希。", "No anchors yet. After the first one, every day written on chain is listed here.")}</p>;

  return (
    <div className="scroll-x">
      <table className="tbl">
        <thead><tr><th>{t("日期", "Day")}</th><th>{t("血统哈希", "Lineage head")}</th><th>{t("交易", "Transaction")}</th><th /></tr></thead>
        <tbody>
          {[...anchors].reverse().map((a) => (
            <tr key={a.date}>
              <td className="dim">{a.date}</td>
              <td><code>{a.head.slice(0, 16)}…</code></td>
              <td><a className="link" href={`https://bscscan.com/tx/${a.tx}`} target="_blank" rel="noreferrer">{a.tx.slice(0, 10)}…</a></td>
              <td>
                {state[a.date]
                  ? <span className={state[a.date].startsWith("✓") ? "ok-text" : state[a.date].startsWith("✗") ? "bad-text" : "dim"}>{state[a.date]}</span>
                  : <button className="btn small" onClick={() => check(a)}>{t("在链上核对", "Check on chain")}</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
