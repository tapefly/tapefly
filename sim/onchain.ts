/* ── sim/onchain.ts ──────────────────────────────────────────────────────────
   Talking to TapeOut on BNB Chain, shared by the browser (the tape-out panel)
   and the scripts. Everything here is a public, read-only call except the
   three a wallet signs: buying NAND transistors, taping out, and creating a
   processor.

   The function names and argument order come from public notes on TapeOut's
   contracts (github.com/xm1319/tapemkt) and the public data mirror
   (github.com/ddgsdde/tap). They were exercised there on mainnet; this file
   reads every value it can before asking a wallet to sign anything.
   --------------------------------------------------------------------------- */
import type { PublicClient } from "viem";
import { evalWord, type Netlist } from "./netlist";
import { netlistBytes, evalInputBytes } from "./tapeout";

export const BSC_RPC = "https://bsc-dataseed.bnbchain.org";
export const FACTORY = "0x68224F668083c29e9800Be2a646d42d18cedF7e2" as const;
export const NAND_ID = 0n;
export const OFFICIAL_PROCESSORS = [
  { name: "Behemoth", address: "0x1F5Cb4aeaE1807Bf60c3b9C0D8aDBCC14e91f12C" },
  { name: "TapeOut", address: "0xb1024b89886B9a34Aa4ff5F31C411D708b20a14C" }
] as const;

export const PROCESSOR_ABI = [
  { type: "function", name: "tapeout", stateMutability: "payable", inputs: [{ name: "nl", type: "bytes" }, { name: "nIn", type: "uint32" }, { name: "nOut", type: "uint32" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "TAPEOUT_FEE", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "eval", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }, { name: "inputs", type: "bytes" }], outputs: [{ type: "bytes" }] },
  { type: "function", name: "netlist", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "bytes" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "transistors", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }
] as const;

export const TRANSISTORS_ABI = [
  { type: "function", name: "mint", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "mintPrice", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "minted", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "supplyCap", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "protocolFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }, { name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] }
] as const;

export const FACTORY_ABI = [
  { type: "function", name: "createCPU", stateMutability: "payable", inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "story", type: "string" }, { name: "transistorSupply", type: "uint256" }, { name: "mintPrice", type: "uint256" }], outputs: [{ name: "transistors", type: "address" }, { name: "circuits", type: "address" }] },
  { type: "function", name: "deployFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "cpuCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }
] as const;

/** tapeout burns the caller's top-level NAND and LATCH count (TAP-02 §6): one NAND token per gate.
    (An earlier note from X Layer said outputs get two buffer gates each; the BNB Chain contract
    source in TAP-02 burns exactly the records, and a 1-gate tape-out burns 1 NAND.) */
export const nandNeeded = (n: Netlist) => n.gates.length;

export interface ProcessorInfo {
  address: `0x${string}`;
  name: string;
  transistors: `0x${string}`;
  tapeoutFee: bigint;
  mintPrice: bigint;
  protocolFee: bigint;
  minted: bigint;
  supplyCap: bigint;
  balance: bigint | null; // the connected wallet's NAND, if a wallet is connected
}

async function tryRead<T>(f: () => Promise<T>, fallback: T): Promise<T> {
  try { return await f(); } catch { return fallback; }
}

export async function readProcessor(client: PublicClient, address: `0x${string}`, owner?: `0x${string}`): Promise<ProcessorInfo> {
  const transistors = (await client.readContract({ address, abi: PROCESSOR_ABI, functionName: "transistors" })) as `0x${string}`;
  const t = { address: transistors, abi: TRANSISTORS_ABI } as const;
  const [name, tapeoutFee, mintPrice, protocolFee, minted, supplyCap, balance] = await Promise.all([
    tryRead(() => client.readContract({ address, abi: PROCESSOR_ABI, functionName: "name" }) as Promise<string>, "processor"),
    tryRead(() => client.readContract({ address, abi: PROCESSOR_ABI, functionName: "TAPEOUT_FEE" }) as Promise<bigint>, 0n),
    tryRead(() => client.readContract({ ...t, functionName: "mintPrice" }) as Promise<bigint>, 0n),
    tryRead(() => client.readContract({ ...t, functionName: "protocolFee" }) as Promise<bigint>, 0n),
    tryRead(() => client.readContract({ ...t, functionName: "minted" }) as Promise<bigint>, 0n),
    tryRead(() => client.readContract({ ...t, functionName: "supplyCap" }) as Promise<bigint>, 0n),
    owner ? tryRead(() => client.readContract({ ...t, functionName: "balanceOf", args: [owner, NAND_ID] }) as Promise<bigint>, null) : Promise.resolve(null)
  ]);
  return { address, name, transistors, tapeoutFee, mintPrice, protocolFee, minted, supplyCap, balance };
}

/** What eval answered, as a 3-bit word. Packed (one byte) is what the format notes describe; one byte per output is accepted too. */
export function decodeAnswer(out: string, nOut: number): number {
  const hex = out.slice(2);
  const b: number[] = [];
  for (let i = 0; i < hex.length; i += 2) b.push(parseInt(hex.slice(i, i + 2), 16));
  if (b.length === 1) return b[0] & ((1 << nOut) - 1);
  if (b.length === nOut) return b.reduce((v, x, i) => v | ((x & 1) << i), 0);
  throw new Error(`eval returned ${b.length} bytes; expected 1 (packed) or ${nOut} (one per output)`);
}

/**
 * Ask a taped-out circuit every possible question and compare with the netlist.
 * Uses multicall, so 4,096 questions are a handful of requests. Free: eval is read-only.
 */
export async function verifyCircuit(
  client: PublicClient,
  n: Netlist,
  processor: `0x${string}`,
  id: bigint,
  progress: (done: number, total: number) => void = () => {}
): Promise<{ ok: boolean; reason: string; storedMatches: boolean | null }> {
  const stored = await tryRead(() => client.readContract({ address: processor, abi: PROCESSOR_ABI, functionName: "netlist", args: [id] }) as Promise<string>, null);
  const storedMatches = stored === null ? null : stored.toLowerCase() === netlistBytes(n).toLowerCase();
  const total = 1 << n.nIn;
  const BATCH = 256;
  for (let start = 0; start < total; start += BATCH) {
    const words = Array.from({ length: Math.min(BATCH, total - start) }, (_, i) => start + i);
    const res = await client.multicall({
      allowFailure: true,
      contracts: words.map((w) => ({ address: processor, abi: PROCESSOR_ABI, functionName: "eval" as const, args: [id, evalInputBytes(w, n.nIn) as `0x${string}`] }))
    });
    for (let i = 0; i < words.length; i++) {
      const r = res[i];
      if (r.status !== "success") return { ok: false, reason: `eval failed on word ${words[i]}: ${String(r.error).split("\n")[0]}`, storedMatches };
      const chain = decodeAnswer(r.result as string, n.nOut);
      const mine = evalWord(n, words[i]);
      if (chain !== mine) return { ok: false, reason: `word ${words[i]}: the chain says ${chain}, the brain says ${mine}`, storedMatches };
    }
    progress(start + words.length, total);
  }
  return { ok: true, reason: `all ${total} answers identical`, storedMatches };
}
