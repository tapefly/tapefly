"use client";

/* ── the tape-out panel ──────────────────────────────────────────────────────
   Put a brain on chain from your own wallet, in three signed steps at most:
   buy the NAND transistors it needs, tape it out, and (free) ask the new
   circuit every question to prove it is the same brain. Every value is read
   from the chain and shown before anything is signed; a tape-out is simulated
   first, so a call that would fail never costs a fee. No keys ever touch the
   site: the wallet signs. */

import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther, isAddress, type PublicClient } from "viem";
import { bsc } from "viem/chains";
import { BRAIN } from "@/sim/netlist";
import { netlistBytes } from "@/sim/tapeout";
import { brainFromProgram } from "@/sim/challenge";
import { decodeProgram } from "@/sim/program";
import { useLang } from "../i18n/client";
import { BSC_RPC, PROCESSOR_ABI, TRANSISTORS_ABI, NAND_ID, OFFICIAL_PROCESSORS, nandNeeded, readProcessor, verifyCircuit, type ProcessorInfo } from "@/sim/onchain";

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
const eth = (): Eth | null => (typeof window !== "undefined" && (window as unknown as { ethereum?: Eth }).ethereum) || null;
const bnb = (v: bigint) => `${Number(formatEther(v)).toLocaleString(undefined, { maximumFractionDigits: 6 })} BNB`;

interface Done { processor: string; id: string; tx: string; check: string; ok: boolean | null }

export default function TapeoutPanel({ tapeflyProcessor }: { tapeflyProcessor: string | null }) {
  const pub = useMemo(() => createPublicClient({ chain: bsc, transport: http(BSC_RPC), batch: { multicall: true } }) as PublicClient, []);
  const [which, setWhich] = useState<"mine" | "official">("mine");
  const [mineCode, setMineCode] = useState<string | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [proc, setProc] = useState(tapeflyProcessor ?? "");
  const [info, setInfo] = useState<ProcessorInfo | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [agree, setAgree] = useState(false);
  const { t } = useLang();

  useEffect(() => { try { setMineCode(localStorage.getItem("tapefly.build")); } catch {} }, []);

  const netlist = useMemo(() => {
    if (which === "mine" && mineCode) { try { return brainFromProgram(decodeProgram(mineCode)).netlist; } catch {} }
    return BRAIN;
  }, [which, mineCode]);
  const need = BigInt(nandNeeded(netlist));
  const bytes = netlistBytes(netlist);

  const load = async (addr = account) => {
    setErr(""); setInfo(null);
    if (!isAddress(proc)) return;
    setBusy(t("正在读取处理器…", "Reading the processor…"));
    try { setInfo(await readProcessor(pub, proc as `0x${string}`, addr ?? undefined)); }
    catch (e) { setErr(t(`读不到这个处理器：${(e as Error).message.split("\n")[0]}`, `Could not read that processor: ${(e as Error).message.split("\n")[0]}`)); }
    setBusy("");
  };
  useEffect(() => { void load(); }, [proc]); // eslint-disable-line react-hooks/exhaustive-deps

  const wallet = () => {
    const e = eth();
    if (!e) throw new Error(t("没找到钱包。请在装了钱包的浏览器里打开这个页面，比如 MetaMask、OKX 钱包或币安钱包。", "No wallet found. Open this page in a browser with a wallet such as MetaMask, OKX Wallet or Binance Wallet."));
    return createWalletClient({ chain: bsc, transport: custom(e) });
  };

  const connect = async () => {
    setErr("");
    try {
      const w = wallet();
      const [a] = await w.requestAddresses();
      try { await w.switchChain({ id: bsc.id }); } catch { await w.addChain({ chain: bsc }); }
      setAccount(a);
      await load(a);
    } catch (e) { setErr((e as Error).message.split("\n")[0]); }
  };

  const short = info && info.balance !== null && info.balance < need ? need - info.balance : 0n;
  const remaining = info ? info.supplyCap - info.minted : 0n;
  const canMint = info !== null && short > 0n && remaining >= short && info.mintPrice > 0n;
  const buyCost = info ? short * info.mintPrice + info.protocolFee : 0n;
  const ready = info !== null && account !== null && short === 0n;

  const buy = async () => {
    if (!info || !account) return;
    setErr(""); setBusy(t(`正在购买 ${short} 个 NAND…请在钱包里确认`, `Buying ${short} NAND… confirm in your wallet`));
    try {
      const w = wallet();
      const hash = await w.writeContract({ account, address: info.transistors, abi: TRANSISTORS_ABI, functionName: "mint", args: [NAND_ID, short], value: buyCost });
      setBusy(t("等待购买确认…", "Waiting for the purchase to confirm…"));
      await pub.waitForTransactionReceipt({ hash });
      await load();
    } catch (e) { setErr((e as Error).message.split("\n")[0]); }
    setBusy("");
  };

  const tapeout = async () => {
    if (!info || !account) return;
    setErr(""); setBusy(t("先免费模拟一次，确认流片会成功…", "Checking the tape-out would succeed (free)…"));
    try {
      const args = [bytes as `0x${string}`, netlist.nIn, netlist.nOut] as const;
      const sim = await pub.simulateContract({ account, address: info.address, abi: PROCESSOR_ABI, functionName: "tapeout", args, value: info.tapeoutFee });
      setBusy(t("正在流片…请在钱包里确认", "Taping out… confirm in your wallet"));
      const hash = await wallet().writeContract(sim.request);
      setBusy(t("等待链上确认…", "Waiting for the chain…"));
      const r = await pub.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error(t("流片交易在链上失败了。", "The tape-out transaction failed on chain."));
      const id = sim.result as bigint;
      const d: Done = { processor: info.address, id: id.toString(), tx: hash, check: t("正在向新电路问全部 4,096 个问题…", "Asking the new circuit all 4,096 questions…"), ok: null };
      setDone(d);
      try { const all = JSON.parse(localStorage.getItem("tapefly.tapeouts") ?? "[]"); all.push({ ...d, at: new Date().toISOString() }); localStorage.setItem("tapefly.tapeouts", JSON.stringify(all)); } catch {}
      setBusy("");
      const v = await verifyCircuit(pub, netlist, info.address, id, (n, total) => setDone({ ...d, check: t(`已核对 ${n} / ${total} 个答案…`, `Checked ${n} of ${total} answers…`) }));
      setDone({ ...d, ok: v.ok, check: v.ok ? t(`核对通过：全部答案一致${v.storedMatches ? "，链上存的字节也一致" : ""}。`, `Verified: ${v.reason}${v.storedMatches ? ", and the stored bytes match" : ""}.`) : t(`不一致：${v.reason}`, `Mismatch: ${v.reason}`) });
      await load();
    } catch (e) { setErr((e as Error).message.split("\n")[0]); setBusy(""); }
  };

  return (
    <section className="panel tp" id="tape-out" aria-labelledby="tp-h">
      <p className="kicker">{t("用你自己的钱包 · BNB Chain", "From your own wallet · BNB Chain")}</p>
      <h2 id="tp-h">{t("流片一颗大脑", "Tape out a brain")}</h2>

      <div className="tp-grid">
        <div>
          <h3>{t("1 · 选大脑", "1 · Which brain")}</h3>
          <div className="seg" role="tablist">
            <button role="tab" aria-selected={which === "mine"} className={which === "mine" ? "on" : ""} onClick={() => setWhich("mine")} disabled={!mineCode}>{t("我的果蝇", "My fly")}</button>
            <button role="tab" aria-selected={which === "official"} className={which === "official" ? "on" : ""} onClick={() => setWhich("official")}>{t("官方大脑", "The official brain")}</button>
          </div>
          {!mineCode && <p className="dim">{t("想流片你自己的，先去首页拨好果蝇的本能。", "Set your fly’s instincts on the home page first to tape out your own.")}</p>}
          <dl className="tp-facts">
            <div><dt>{t("NAND 门", "NAND gates")}</dt><dd>{netlist.gates.length}</dd></div>
            <div><dt>{t("需持有 NAND", "NAND to hold")}</dt><dd>{need.toString()}</dd></div>
            <div><dt>{t("字节", "Bytes")}</dt><dd>{(bytes.length - 2) / 2}</dd></div>
          </dl>
          <p className="dim">{t(`流片时每个门烧掉 1 个 NAND，所以要准备 ${need} 个 NAND，另付 0.0002 BNB 流片费和 gas。`, `A tape-out burns one NAND per gate, so you hold ${need} NAND, plus the 0.0002 BNB tape-out fee and gas.`)}</p>
        </div>

        <div>
          <h3>{t("2 · 选处理器", "2 · Which processor")}</h3>
          <p className="dim">{t("处理器就是造电路的地方。你需要持有它的 NAND 晶体管。", "A processor is where a circuit is built. You need its NAND transistors.")}</p>
          <div className="row tp-presets">
            {tapeflyProcessor && <button className={`btn small ${proc === tapeflyProcessor ? "primary" : ""}`} onClick={() => setProc(tapeflyProcessor)}>TapeFly</button>}
            {OFFICIAL_PROCESSORS.map((p) => <button key={p.address} className={`btn small ${proc === p.address ? "primary" : ""}`} onClick={() => setProc(p.address)}>{p.name}</button>)}
          </div>
          <input className="name-field tp-addr" aria-label={t("处理器地址", "Processor address")} placeholder={t("处理器地址 0x…", "Processor address 0x…")} value={proc} onChange={(e) => setProc(e.target.value.trim())} />
          {info && (
            <dl className="tp-facts">
              <div><dt>{t("处理器", "Processor")}</dt><dd>{info.name}</dd></div>
              <div><dt>{t("NAND 单价", "NAND price")}</dt><dd>{info.mintPrice > 0n ? bnb(info.mintPrice) : "—"}</dd></div>
              <div><dt>{t("NAND 剩余可买", "NAND left to buy")}</dt><dd>{remaining > 0n ? remaining.toString() : t("已售罄", "sold out")}</dd></div>
              <div><dt>{t("流片费", "Tape-out fee")}</dt><dd>{bnb(info.tapeoutFee)}</dd></div>
              {info.balance !== null && <div><dt>{t("你持有的 NAND", "Your NAND here")}</dt><dd>{info.balance.toString()}</dd></div>}
            </dl>
          )}
        </div>
      </div>

      <h3>{t("3 · 签名", "3 · Sign")}</h3>
      <label className="tp-agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>{t("我明白这会花真实的 BNB，流片无法撤销；TapeFly 是独立项目，这个格式已在电路 #1 上验证过。", "I understand this spends real BNB, a tape-out cannot be undone, and TapeFly is an independent project: this format has already been verified on circuit #1.")}</span>
      </label>
      <div className="row tp-actions">
        {!account ? (
          <button className="btn primary" onClick={connect}>{t("连接钱包", "Connect wallet")}</button>
        ) : (
          <span className="tp-acct">{account.slice(0, 6)}…{account.slice(-4)}</span>
        )}
        {account && info && short > 0n && (canMint
          ? <button className="btn primary" disabled={!agree || !!busy} onClick={buy}>{t(`买 ${short} 个 NAND · ${bnb(buyCost)}`, `Buy ${short} NAND · ${bnb(buyCost)}`)}</button>
          : <a className="btn" href="https://tapeout.net" target="_blank" rel="noreferrer">{t("这里的 NAND 卖完了：去 TapeOut 市场买", "NAND sold out here: buy on TapeOut’s market")}</a>)}
        {account && info && <button className="btn primary" disabled={!agree || !ready || !!busy} onClick={tapeout}>{t(`流片 · ${bnb(info.tapeoutFee)} + gas`, `Tape out · ${bnb(info.tapeoutFee)} + gas`)}</button>}
      </div>
      {busy && <p className="tp-busy" role="status">{busy}</p>}
      {err && <p className="tp-err" role="alert">{err}</p>}
      {done && (
        <div className={`tp-done ${done.ok === false ? "bad" : ""}`}>
          <b>{t(`电路 #${done.id} 已上链。`, `Circuit #${done.id} is on chain.`)}</b>
          <span>{done.check}</span>
          <a className="link" href={`https://bscscan.com/tx/${done.tx}`} target="_blank" rel="noreferrer">{t("查看交易", "See the transaction")}</a>
          <code>{JSON.stringify({ tapeout: { processor: done.processor, circuitId: done.id } })}</code>
        </div>
      )}
    </section>
  );
}
