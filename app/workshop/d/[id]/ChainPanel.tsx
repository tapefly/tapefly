"use client";
/* Taking a published design out of the game: its Verilog and TapeOut bytes,
   and an optional record on X Layer sent from the player's own wallet. The site
   never holds a key; the server only reads the transaction back and checks it. */
import { useState } from "react";
import { useLang } from "../../../i18n/client";

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
const eth = (): Eth | null => (typeof window !== "undefined" && (window as unknown as { ethereum?: Eth }).ethereum) || null;
interface Rec { tx: string; from: string; block: number }

export default function ChainPanel({ id, text, data, chainId, explorer, records, verilog, bytes, fileName }: {
  id: string; text: string; data: string; chainId: number; explorer: string; records: Rec[]; verilog: string; bytes: string; fileName: string;
}) {
  const { t } = useLang();
  const [recs, setRecs] = useState<Rec[]>(records);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const download = () => {
    const url = URL.createObjectURL(new Blob([verilog], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copyBytes = async () => {
    try { await navigator.clipboard.writeText(bytes); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setErr(t("没能复制，请从下面的框里手动复制。", "Could not copy; select it from the box below.")); }
  };

  const verify = async (tx: string) => {
    for (let i = 0; i < 8; i++) {
      const r = await fetch(`/api/v1/workshop/designs/${id}/chain`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tx }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setRecs((x) => (x.some((y) => y.tx === j.tx) ? x : [...x, { tx: j.tx, from: j.from, block: j.block }])); return true; }
      if (r.status !== 404) { setErr(j.error ?? t("服务器没有接受这条记录。", "The server did not accept this record.")); return false; }
      await new Promise((res) => setTimeout(res, 3000));
    }
    setErr(t("交易发出去了，但还没在 X Layer 上查到。过一会儿刷新页面再看。", "The transaction was sent but is not on X Layer yet. Refresh in a little while."));
    return false;
  };

  const record = async () => {
    setErr("");
    const e = eth();
    if (!e) { setErr(t("没有找到浏览器钱包。装一个支持 X Layer 的钱包（比如 OKX Wallet）再试。", "No browser wallet found. Install one that supports X Layer (such as OKX Wallet) and try again.")); return; }
    try {
      setBusy(t("连接钱包…", "Connecting the wallet…"));
      const [from] = (await e.request({ method: "eth_requestAccounts" })) as string[];
      const hex = `0x${chainId.toString(16)}`;
      setBusy(t("切换到 X Layer…", "Switching to X Layer…"));
      try { await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] }); }
      catch (x) {
        if ((x as { code?: number }).code !== 4902) throw x;
        await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: hex, chainName: "X Layer Mainnet", nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 }, rpcUrls: ["https://rpc.xlayer.tech"], blockExplorerUrls: [explorer] }] });
      }
      setBusy(t("在钱包里确认：发给你自己，金额 0，只带这一行文字。", "Confirm in your wallet: to yourself, amount 0, carrying only this line of text."));
      const tx = (await e.request({ method: "eth_sendTransaction", params: [{ from, to: from, value: "0x0", data }] })) as string;
      setSent(tx);
      setBusy(t("等 X Layer 出块，然后由服务器核对…", "Waiting for X Layer, then the server checks it…"));
      await verify(tx);
    } catch (x) {
      const code = (x as { code?: number }).code;
      setErr(code === 4001 ? t("你在钱包里取消了。", "You cancelled in the wallet.") : t("没有发出去。", "It was not sent.") + ` ${(x as Error).message ?? ""}`.slice(0, 160));
    }
    setBusy("");
  };

  return (
    <>
      <section className="wg-tree">
        <h2>{t("拿去流片", "Take it to tape-out")}</h2>
        <p className="wg-fine">{t("这块电路导出的 Verilog 和 TapeOut 字节。它们和游戏里跑的是同一块电路：自动测试逐刻核对过。", "This circuit as Verilog and as TapeOut bytes. They are the circuit the game runs; the automated tests check it tick by tick.")}</p>
        <div className="wg-acts">
          <button type="button" className="ws-go small" onClick={download}>{t(`下载 ${fileName}`, `Download ${fileName}`)}</button>
          <button type="button" className="ws-ghost" onClick={copyBytes}>{copied ? t("已复制", "Copied") : t("复制 TapeOut 字节", "Copy TapeOut bytes")}</button>
        </div>
        <textarea className="wg-code" readOnly value={bytes} rows={2} onFocus={(e) => e.currentTarget.select()} aria-label="TapeOut bytes" />
      </section>
      <section className="wg-tree">
        <h2>{t("记录到 X Layer（可选）", "Record it on X Layer (optional)")}</h2>
        <p className="wg-fine">{t("用你自己的钱包，在 X Layer 上发一笔给自己、金额为 0 的交易，交易里只有下面这一行。任何人都能读出它、按编号载入这个设计、重新编译、比对指纹。本站不收任何费用，也不碰你的私钥。", "From your own wallet, send yourself a zero-value X Layer transaction carrying only the line below. Anyone can read it, load the design by its id, recompile it and compare the fingerprint. No fee to us, and this site never touches your key.")}</p>
        <pre className="wg-code">{text}</pre>
        <div className="wg-acts">
          <button type="button" className="ws-ghost" onClick={record} disabled={!!busy}>{t("用钱包记录到 X Layer", "Record with my wallet")}</button>
        </div>
        {busy && <p className="wg-fine">{busy}</p>}
        {sent && <p className="wg-fine">{t("交易：", "Transaction: ")}<a href={`${explorer}/tx/${sent}`} target="_blank" rel="noreferrer">{sent.slice(0, 10)}…{sent.slice(-8)}</a></p>}
        {err && <p className="ws-warn">{err}</p>}
        {recs.length > 0 && (
          <ul className="wg-kids">
            {recs.map((r) => (
              <li key={r.tx}>✓ {t("已核对", "Verified")} · <a href={`${explorer}/tx/${r.tx}`} target="_blank" rel="noreferrer">{r.tx.slice(0, 10)}…{r.tx.slice(-8)}</a> <span className="wg-mute">· {t("区块", "block")} {r.block} · {r.from.slice(0, 6)}…{r.from.slice(-4)}</span></li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
