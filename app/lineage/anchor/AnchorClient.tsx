"use client";

/* Anchor a day from the operator's own wallet: a zero-value transaction to
   themselves whose data is the day's lineage head. The page prints the entry
   to add to anchors/anchors.json. No key ever touches the site. */

import { useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, type PublicClient } from "viem";
import { bsc } from "viem/chains";
import { BSC_RPC } from "@/sim/onchain";
import { anchorData, anchorText } from "@/sim/anchor";
import { useLang } from "../../i18n/client";

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

export default function AnchorClient({ date, head, done }: { date: string; head: string; done: boolean }) {
  const { t } = useLang();
  const pub = useMemo(() => createPublicClient({ chain: bsc, transport: http(BSC_RPC) }) as PublicClient, []);
  const [msg, setMsg] = useState("");
  const [entry, setEntry] = useState("");

  const send = async () => {
    setMsg("");
    const e = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!e) { setMsg(t("这个浏览器里没找到钱包。", "No wallet found in this browser.")); return; }
    try {
      const w = createWalletClient({ chain: bsc, transport: custom(e) });
      const [account] = await w.requestAddresses();
      try { await w.switchChain({ id: bsc.id }); } catch { await w.addChain({ chain: bsc }); }
      setMsg(t("请在钱包里确认（0 BNB 发给自己，只花 gas）…", "Confirm in your wallet (0 BNB to yourself, gas only)…"));
      const hash = await w.sendTransaction({ account, to: account, value: 0n, data: anchorData(date, head) });
      setMsg(t("等待链上确认…", "Waiting for the chain…"));
      const r = await pub.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error(t("交易失败了。", "The transaction failed."));
      setEntry(JSON.stringify({ date, head, tx: hash, from: account }));
      setMsg(t(`已上链，区块 ${r.blockNumber}。`, `On chain in block ${r.blockNumber}.`));
    } catch (err) { setMsg((err as Error).message.split("\n")[0]); }
  };

  return (
    <div className="panel tp">
      <p className="kicker">{t("运营者专用", "For the operator")}</p>
      <h2>{t(`把 ${date} 的血统写上 BNB Chain`, `Write ${date}’s lineage onto BNB Chain`)}</h2>
      <p>{t("这笔交易从你的钱包发给你自己，金额 0，只花一点 gas。交易数据是下面这行字，它把从第一天到这一天的所有果蝇、它们的身体和每一步记忆，折成了一个哈希。",
            "This transaction goes from your wallet to itself with zero value, costing only gas. Its data is the line below, which folds every fly from the first day to this one, their bodies and every step they took, into one hash.")}</p>
      <pre className="cmd" style={{ marginTop: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{anchorText(date, head)}</pre>
      {done
        ? <p className="ok-text" style={{ marginTop: 12 }}>{t("这一天已经锚定过了。", "This day is already anchored.")}</p>
        : <div className="row" style={{ marginTop: 12 }}><button className="btn primary" onClick={send}>{t("用我的钱包写上链", "Write it with my wallet")}</button></div>}
      {msg && <p className="tp-busy" role="status">{msg}</p>}
      {entry && (
        <div className="tp-done">
          <b>{t("把这一行加进 anchors/anchors.json 的 entries，然后重新部署：", "Add this to the entries in anchors/anchors.json, then redeploy:")}</b>
          <code>{entry}</code>
        </div>
      )}
      <p className="dim" style={{ marginTop: 14 }}>{t("想每天自动做：在 GitHub 仓库的 Secrets 里加一个 ANCHOR_PRIVATE_KEY（一个只放少量 BNB 做 gas 的钱包），每日任务就会自己锚定并提交。", "To do this daily without clicking: add an ANCHOR_PRIVATE_KEY repository secret (a wallet holding a little BNB for gas) and the daily job anchors and commits on its own.")}</p>
    </div>
  );
}
