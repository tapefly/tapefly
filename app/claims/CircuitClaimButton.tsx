"use client";

import { useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  isAddress,
} from "viem";
import {
  CIRCUIT_CLAIMS_ABI,
  XLAYER_CLAIM_CHAIN,
  configuredClaimContract,
  type SerializableCircuitClaim,
} from "@/sim/circuit-claims";
import type { RunAction } from "@/sim/arena";
import { useLang } from "../i18n/client";

type ClaimPayload =
  | { mode: "workshop"; level: string; code: string }
  | { mode: "brawl"; date: string; actions: RunAction[] };

type VoucherResponse = {
  claim: SerializableCircuitClaim;
  signature: `0x${string}`;
  tokenId: string;
  contract: `0x${string}`;
  chainId: number;
  error?: string;
};

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

function provider(): EthereumProvider | null {
  const ethereum = (globalThis as typeof globalThis & { ethereum?: EthereumProvider }).ethereum;
  return ethereum ?? null;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function CircuitClaimButton({ payload }: { payload: ClaimPayload }) {
  const { t } = useLang();
  const contract = useMemo(() => configuredClaimContract(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ hash: `0x${string}`; tokenId: string } | null>(null);

  if (!contract) return null;

  const claim = async () => {
    const ethereum = provider();
    if (!ethereum) {
      setError(t(
        "没有找到浏览器钱包。请打开 OKX Wallet 等支持 X Layer 的钱包后重试。",
        "No browser wallet found. Open a wallet that supports X Layer, such as OKX Wallet, and try again.",
      ));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const account = Array.isArray(accounts) && typeof accounts[0] === "string" && isAddress(accounts[0])
        ? accounts[0]
        : null;
      if (!account) throw new Error("wallet did not return an address");

      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xc4" }],
        });
      } catch (switchError) {
        const code = switchError && typeof switchError === "object" && "code" in switchError
          ? (switchError as { code?: number }).code
          : undefined;
        if (code !== 4902) throw switchError;
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0xc4",
            chainName: "X Layer Mainnet",
            nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
            rpcUrls: ["https://rpc.xlayer.tech"],
            blockExplorerUrls: ["https://www.okx.com/web3/explorer/xlayer"],
          }],
        });
      }

      const response = await fetch("/api/v1/claims/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account,
          mode: payload.mode,
          payload: payload.mode === "workshop"
            ? { level: payload.level, code: payload.code }
            : { date: payload.date, actions: payload.actions },
        }),
      });
      const voucher = await response.json() as VoucherResponse;
      if (!response.ok) throw new Error(voucher.error || "could not prepare the claim");

      const wallet = createWalletClient({
        account,
        chain: XLAYER_CLAIM_CHAIN,
        transport: custom(ethereum),
      });
      const hash = await wallet.writeContract({
        address: contract,
        abi: CIRCUIT_CLAIMS_ABI,
        functionName: "claim",
        args: [{ ...voucher.claim, deadline: BigInt(voucher.claim.deadline) }, voucher.signature],
        account,
      });

      const client = createPublicClient({
        transport: http(XLAYER_CLAIM_CHAIN.rpcUrls.default.http[0]),
      });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("the claim transaction reverted");
      setResult({ hash, tokenId: voucher.tokenId });
    } catch (claimError) {
      const message = claimError instanceof Error ? claimError.message : String(claimError);
      const rejected = /user rejected|4001/i.test(message);
      setError(rejected
        ? t("你取消了钱包确认。", "You cancelled the wallet confirmation.")
        : t(`领取失败：${message}`, `Claim failed: ${message}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`claim-card ${result ? "claimed" : ""}`} aria-live="polite">
      <div>
        <p className="kicker">{t("纪念电路 · X Layer", "Commemorative circuit · X Layer")}</p>
        <h3>{result ? t("纪念电路已领取", "Circuit claim minted") : t("把这颗大脑留作纪念", "Keep this brain as a circuit receipt")}</h3>
        <p className="fine">
          {t(
            "记录本次验证过的 NAND 门数、深度和电路哈希。它是纪念凭证，不是可在 TapeOut 上直接调用 eval 的 Circuit NFT。",
            "It records the verified gate count, depth and circuit hash. This is a commemorative receipt, not a TapeOut Circuit NFT with on-chain eval.",
          )}
        </p>
      </div>
      {result ? (
        <div className="claim-actions">
          <a className="btn small" href={`https://www.okx.com/web3/explorer/xlayer/tx/${result.hash}`} target="_blank" rel="noreferrer">
            {t("查看交易", "View transaction")}
          </a>
          <a className="btn small" href={`/api/v1/claims/token/${result.tokenId}`} target="_blank" rel="noreferrer">
            {t("查看元数据", "View metadata")}
          </a>
        </div>
      ) : (
        <div className="claim-actions">
          <button type="button" className="btn primary" onClick={claim} disabled={busy}>
            {busy ? t("处理中…", "Working…") : t("领取纪念电路", "Claim circuit receipt")}
          </button>
          <span className="fine">{t("用户支付 X Layer gas；每个钱包每个关卡或每日一局限领一次。", "You pay X Layer gas; one claim per wallet per level or daily run.")}</span>
        </div>
      )}
      {error && <p className="bad">{error}</p>}
      {!result && !error && <span className="claim-contract" title={contract}>{shortAddress(contract)}</span>}
    </section>
  );
}

