"use client";

/* Create the TapeFly processor on X Layer from the operator's wallet.
   The current factory charges its deploy fee in BEM, not OKB, so this page
   reads the BEM balance and allowance before it asks for the createCPU call. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, formatUnits, parseUnits, type PublicClient } from "viem";
import { BEM, BEM_ABI, CHAIN, CHAIN_RPC, FACTORY, FACTORY_ABI, txUrl } from "@/sim/onchain";
import { useLang } from "../../i18n/client";

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
type CreatedProcessor = { transistors: string; circuits: string; tx: string; created?: string | null };

export default function ProcessorClient({ deployed = null, replacementMode = false }: { deployed?: CreatedProcessor | null; replacementMode?: boolean }) {
  const pub = useMemo(() => createPublicClient({ chain: CHAIN, transport: http(CHAIN_RPC) }) as PublicClient, []);
  const [fee, setFee] = useState<bigint | null>(null);
  const [count, setCount] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState(8);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [bemBalance, setBemBalance] = useState<bigint | null>(null);
  const [bemAllowance, setBemAllowance] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "TapeFly",
    symbol: "FLY",
    story: "TapeFly: a fruit fly whose brain is a circuit of NAND gates. Independent project on X Layer. Players build deterministic brains, compare them, and tape the best ones out here.",
    supply: "1000000",
    price: "0.001"
  });
  const [msg, setMsg] = useState("");
  const { t } = useLang();
  const [out, setOut] = useState<CreatedProcessor | null>(null);

  const refresh = useCallback(async (who: `0x${string}` | null = account) => {
    const [nextFee, nextCount, nextDecimals] = await Promise.all([
      pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "deployFee" }) as Promise<bigint>,
      pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "cpuCount" }) as Promise<bigint>,
      pub.readContract({ address: BEM, abi: BEM_ABI, functionName: "decimals" }) as Promise<number>
    ]);
    setFee(nextFee);
    setCount(nextCount);
    setDecimals(nextDecimals);
    if (who) {
      const [balance, allowance] = await Promise.all([
        pub.readContract({ address: BEM, abi: BEM_ABI, functionName: "balanceOf", args: [who] }) as Promise<bigint>,
        pub.readContract({ address: BEM, abi: BEM_ABI, functionName: "allowance", args: [who, FACTORY] }) as Promise<bigint>
      ]);
      setBemBalance(balance);
      setBemAllowance(allowance);
    } else {
      setBemBalance(null);
      setBemAllowance(null);
    }
  }, [account, pub]);

  useEffect(() => {
    void refresh().catch(() => setFee(null));
  }, [refresh]);

  const wallet = () => {
    const ethereum = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!ethereum) throw new Error(t("这个浏览器里没找到钱包。", "No wallet found in this browser."));
    return createWalletClient({ chain: CHAIN, transport: custom(ethereum) });
  };

  const connect = async () => {
    setMsg("");
    setBusy(true);
    try {
      const w = wallet();
      const [who] = await w.requestAddresses();
      try { await w.switchChain({ id: CHAIN.id }); } catch { await w.addChain({ chain: CHAIN }); }
      setAccount(who);
      await refresh(who);
    } catch (err) {
      setMsg((err as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!account || fee === null) return;
    setMsg(t(`授权 ${formatUnits(fee, decimals)} BEM 作为处理器创建费…`, `Approving ${formatUnits(fee, decimals)} BEM for processor creation…`));
    setBusy(true);
    try {
      const tx = await wallet().writeContract({ account, address: BEM, abi: BEM_ABI, functionName: "approve", args: [FACTORY, fee] });
      await pub.waitForTransactionReceipt({ hash: tx });
      await refresh(account);
      setMsg(t("BEM 授权完成。", "BEM approval complete."));
    } catch (err) {
      setMsg((err as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setMsg("");
    if (!account) { setMsg(t("先连接钱包。", "Connect a wallet first.")); return; }
    if (fee === null || bemBalance === null || bemAllowance === null) { setMsg(t("链上费用还没读出来。", "The on-chain fee is not loaded yet.")); return; }
    if (bemBalance < fee) { setMsg(t(`BEM 不足：需要 ${formatUnits(fee, decimals)} BEM。`, `Not enough BEM: ${formatUnits(fee, decimals)} BEM required.`)); return; }
    if (bemAllowance < fee) { setMsg(t("先授权 BEM。", "Approve BEM first.")); return; }
    setBusy(true);
    try {
      const w = wallet();
      const args = [f.name, f.symbol, f.story, BigInt(f.supply), parseUnits(f.price, decimals)] as const;
      setMsg(t("免费模拟中…", "Simulating (free)…"));
      const sim = await pub.simulateContract({ account, address: FACTORY, abi: FACTORY_ABI, functionName: "createCPU", args, value: 0n });
      const [transistors, circuits] = sim.result as readonly [string, string];
      setMsg(t(`将创建处理器 ${circuits}，晶体管合约 ${transistors}。请在钱包里确认…`, `Will create processor ${circuits} with transistors ${transistors}. Confirm in your wallet…`));
      const tx = await w.writeContract(sim.request);
      setMsg(t("等待链上确认…", "Waiting for the chain…"));
      const receipt = await pub.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== "success") throw new Error(t("交易在链上失败了。", "The transaction failed on chain."));
      setOut({ transistors, circuits, tx });
      await refresh(account);
      setMsg("");
    } catch (err) {
      setMsg((err as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof f, label: string, long = false) => (
    <label className="pc-field">
      <span>{label}</span>
      {long
        ? <textarea rows={3} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        : <input className="name-field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
    </label>
  );

  const enoughBem = fee !== null && bemBalance !== null && bemBalance >= fee;
  const enoughAllowance = fee !== null && bemAllowance !== null && bemAllowance >= fee;
  const created = out ?? deployed;

  return (
    <div className="panel tp">
      <p className="kicker">{t("运营者专用 · 只需一次", "For the operator · one time")}</p>
      <h2>{t("创建 TapeFly 处理器", "Create the TapeFly processor")}</h2>
      {replacementMode && <p className="dim">{t("替代模式：创建一个新的处理器来替换不能改价的旧处理器。旧处理器和已创建的交易不会消失。", "Replacement mode: create a new processor to replace the old one whose price cannot be changed. The old processor and its creation transaction remain on chain.")}</p>}
      <p>
        {t("处理器是造电路和出售 NAND 的地方。X Layer 工厂当前收取 0.1 BEM，不收 OKB；创建前必须先授权 BEM。",
           "A processor is where circuits are built and NAND is sold. The current X Layer factory charges 0.1 BEM, not OKB, and requires a BEM approval first.")}{" "}
        {t("工厂费：", "Factory fee: ")}<b>{fee === null ? "…" : `${formatUnits(fee, decimals)} BEM`}</b>
        {count !== null && <> · {t("目前处理器总数：", "processors so far: ")}{count.toString()}</>}.
      </p>

      {!created && <>
        <div className="pc-grid">
          {field("name", t("名称", "Name"))}
          {field("symbol", t("代号", "Symbol"))}
          {field("supply", t("NAND 供应上限（原始单位）", "NAND supply cap (raw units)"))}
          {field("price", t("每个 NAND 价格（BEM）", "Price per NAND, BEM"))}
        </div>
        {field("story", t("介绍（存到链上）", "Story (stored on chain)"), true)}
        <p className="dim">
          {t("NAND 价格用 BEM 计价，不是 OKB。例如 0.001 表示每颗 NAND 收 0.001 BEM；默认创建 1,000,000 个原始单位。流片另付处理器公布的 OKB 流片费和 gas。",
             "The NAND price is denominated in BEM, not OKB. For example, 0.001 charges 0.001 BEM per NAND; the default supply is 1,000,000 raw units. Tape-outs separately pay the processor's OKB tape-out fee and gas.")}
        </p>

        {account ? (
          <dl className="tp-facts">
            <div><dt>{t("钱包", "Wallet")}</dt><dd>{account.slice(0, 6)}…{account.slice(-4)}</dd></div>
            <div><dt>{t("BEM 余额", "BEM balance")}</dt><dd>{bemBalance === null ? "…" : formatUnits(bemBalance, decimals)}</dd></div>
            <div><dt>{t("已授权", "Approved")}</dt><dd>{bemAllowance === null ? "…" : formatUnits(bemAllowance, decimals)}</dd></div>
            <div><dt>{t("BEM 合约", "BEM contract")}</dt><dd>{BEM}</dd></div>
          </dl>
        ) : null}

        <div className="row" style={{ marginTop: 12 }}>
          {!account ? (
            <button className="btn primary" onClick={connect} disabled={busy}>{t("连接钱包", "Connect wallet")}</button>
          ) : !enoughBem ? (
            <button className="btn" disabled>{t("BEM 不足，先获取 0.1 BEM", "Not enough BEM; acquire 0.1 BEM first")}</button>
          ) : !enoughAllowance ? (
            <button className="btn primary" onClick={approve} disabled={busy}>{t("授权 BEM", "Approve BEM")}</button>
          ) : (
            <button className="btn primary" onClick={create} disabled={busy}>{t("用我的钱包创建", "Create with my wallet")}</button>
          )}
        </div>
        {msg && <p className="tp-busy" role="status">{msg}</p>}
      </>}
      {created && (
        <div className="tp-done">
          <b>{t("处理器已创建并接入站点。", "Processor created and wired into the site.")}</b>
          <span>{t("流片面板会读取它真实的 BEM 价格；价格超过钱包余额时会阻止购买，不再让钱包报错。", "The tape-out panel reads its real BEM price and blocks unaffordable purchases instead of letting the wallet revert.")}</span>
          <code>{created.circuits}</code>
          <span>{t("晶体管合约：", "Transistors: ")}<code>{created.transistors}</code></span>
          {created.created && <span>{t("创建日期：", "Created: ")}{created.created}</span>}
          <a className="link" href={txUrl(created.tx)} target="_blank" rel="noreferrer">{t("查看创建交易", "See the creation transaction")}</a>
          {!out && <a className="link" href="?replace=1">{t("创建替代处理器", "Create a replacement processor")}</a>}
        </div>
      )}
    </div>
  );
}
