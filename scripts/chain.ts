/* ── scripts/chain.ts ────────────────────────────────────────────────────────
   Ask a circuit on chain all 4,096 questions and compare with a netlist.
   A thin wrapper over sim/onchain.ts (the browser's tape-out panel uses the
   same check). Read-only: it needs an RPC endpoint but no wallet and no gas.
   --------------------------------------------------------------------------- */
import type { Netlist } from "../sim/netlist";
import { BSC_RPC, verifyCircuit } from "../sim/onchain";

export const DEFAULT_RPC = BSC_RPC;

export async function verifyOnChain(
  n: Netlist,
  processor: string,
  id: string,
  rpc = DEFAULT_RPC,
  log: (s: string) => void = console.log
): Promise<{ ok: boolean; reason: string }> {
  const { createPublicClient, http } = await import("viem");
  const { bsc } = await import("viem/chains");
  const client = createPublicClient({ chain: bsc, transport: http(rpc) });
  const r = await verifyCircuit(client as never, n, processor as `0x${string}`, BigInt(id), (d, t) => { if (d % 1024 === 0) log(`  ${d} / ${t} match`); });
  if (r.storedMatches !== null) log(`stored netlist ${r.storedMatches ? "= the expected bytes ✓" : "≠ the expected bytes ✗"}`);
  return { ok: r.ok, reason: r.reason };
}
