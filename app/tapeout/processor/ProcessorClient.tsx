"use client";

/* Create the TapeFly processor on BNB Chain, from the operator's own wallet.
   One transaction through TapeOut's public factory (createCPU). The call is
   simulated first, so the page shows the addresses it will create before the
   wallet is asked to sign. Nothing here touches a private key. */

import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther, parseEther, type PublicClient } from "viem";
import { bsc } from "viem/chains";
import { BSC_RPC, FACTORY, FACTORY_ABI } from "@/sim/onchain";
import { useLang } from "../../i18n/client";

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

export default function ProcessorClient() {
  const pub = useMemo(() => createPublicClient({ chain: bsc, transport: http(BSC_RPC) }) as PublicClient, []);
  const [fee, setFee] = useState<bigint | null>(null);
  const [count, setCount] = useState<bigint | null>(null);
  const [f, setF] = useState({
    name: "TapeFly",
    symbol: "FLY",
    story: "TapeFly: a fruit fly whose brain is a circuit of NAND gates. Players build brains by flipping instincts, race them, and tape the best ones out here.",
    supply: "1000000",
    price: "0.00005"
  });
  const [msg, setMsg] = useState("");
  const { t } = useLang();
  const [out, setOut] = useState<{ transistors: string; circuits: string; tx: string } | null>(null);

  useEffect(() => {
    pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "deployFee" }).then((v) => setFee(v as bigint)).catch(() => setFee(null));
    pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "cpuCount" }).then((v) => setCount(v as bigint)).catch(() => setCount(null));
  }, [pub]);

  const create = async () => {
    setMsg("");
    const e = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!e) { setMsg(t("这个浏览器里没找到钱包。", "No wallet found in this browser.")); return; }
    try {
      const w = createWalletClient({ chain: bsc, transport: custom(e) });
      const [account] = await w.requestAddresses();
      try { await w.switchChain({ id: bsc.id }); } catch { await w.addChain({ chain: bsc }); }
      const args = [f.name, f.symbol, f.story, BigInt(f.supply), parseEther(f.price)] as const;
      setMsg(t("免费模拟中…", "Simulating (free)…"));
      const sim = await pub.simulateContract({ account, address: FACTORY, abi: FACTORY_ABI, functionName: "createCPU", args, value: fee ?? 0n });
      const [transistors, circuits] = sim.result as readonly [string, string];
      setMsg(t(`将创建处理器 ${circuits}，晶体管合约 ${transistors}。请在钱包里确认…`, `Will create processor ${circuits} with transistors ${transistors}. Confirm in your wallet…`));
      const tx = await w.writeContract(sim.request);
      setMsg(t("等待链上确认…", "Waiting for the chain…"));
      const r = await pub.waitForTransactionReceipt({ hash: tx });
      if (r.status !== "success") throw new Error(t("交易在链上失败了。", "The transaction failed on chain."));
      setOut({ transistors, circuits, tx });
      setMsg("");
    } catch (err) { setMsg((err as Error).message.split("\n")[0]); }
  };

  const field = (k: keyof typeof f, label: string, long = false) => (
    <label className="pc-field">
      <span>{label}</span>
      {long
        ? <textarea rows={3} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        : <input className="name-field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
    </label>
  );

  return (
    <div className="panel tp">
      <p className="kicker">{t("运营者专用 · 只需一次", "For the operator · one time")}</p>
      <h2>{t("创建 TapeFly 处理器", "Create the TapeFly processor")}</h2>
      <p>
        {t("处理器是造电路的地方，它自己出售 NAND 晶体管。TapeOut 官方处理器的 NAND 已经卖光，玩家需要一个地方买果蝇大脑要用的那几个 NAND。这里通过 TapeOut 公开的工厂合约创建一个。",
           "A processor is where circuits are built, and it sells its own NAND transistors. TapeOut’s official processors have sold out, so players need somewhere to buy the few NAND a fly brain takes. This creates one through TapeOut’s public factory.")}{" "}
        {t("工厂费：", "Factory fee: ")}<b>{fee === null ? "…" : `${formatEther(fee)} BNB`}</b>
        {count !== null && <> · {t("目前处理器总数：", "processors so far: ")}{count.toString()}</>}.
      </p>
      <div className="pc-grid">
        {field("name", t("名称", "Name"))}
        {field("symbol", t("代号", "Symbol"))}
        {field("supply", t("NAND + LATCH 供应上限", "NAND + LATCH supply cap"))}
        {field("price", t("每个晶体管价格（BNB）", "Price per transistor, BNB"))}
      </div>
      {field("story", t("介绍（存到链上）", "Story (stored on chain)"), true)}
      <p className="dim">
        {t(`按每个晶体管 ${f.price} BNB 算，一颗普通玩家大脑（大约 10 到 15 个 NAND）流片要 ${(Number(f.price) * 13).toFixed(5)} BNB，另加 0.0002 BNB 流片费和 gas。卖晶体管的钱去哪里由 TapeOut 合约决定；对外宣传前，先在新晶体管合约上读出 creator 和 protocol 钱包确认。`,
           `At ${f.price} BNB a transistor, a typical player brain (about 10 to 15 NAND) costs ${(Number(f.price) * 13).toFixed(5)} BNB to tape out, plus the 0.0002 BNB tape-out fee and gas. Where the sale money goes is set by TapeOut’s contracts; read the creator and protocol wallet on the new transistor contract before announcing anything.`)}
      </p>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={create}>{t("用我的钱包创建", "Create with my wallet")}</button>
      </div>
      {msg && <p className="tp-busy" role="status">{msg}</p>}
      {out && (
        <div className="tp-done">
          <b>{t("已创建。", "Created.")}</b>
          <span>{t("把下面的地址填进 config/tapeout.json 的 \"tapeflyProcessor\"，然后重新部署：", "Put this in config/tapeout.json as \"tapeflyProcessor\", then redeploy:")}</span>
          <code>{out.circuits}</code>
          <span>{t("晶体管合约：", "Transistors: ")}<code>{out.transistors}</code></span>
          <a className="link" href={`https://bscscan.com/tx/${out.tx}`} target="_blank" rel="noreferrer">{t("查看交易", "See the transaction")}</a>
        </div>
      )}
    </div>
  );
}
