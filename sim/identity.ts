/* ── sim/identity.ts ─────────────────────────────────────────────────────────
   Who a player's fly is.

   Every brain gets a default name from its own code, so a fly is never
   anonymous: the same rules always hatch the same `copper-wren`. A player can
   rename it; the default is only what it is called until they do.

   Status is the line between practice and the official world:
     practice  — a brain that lives in this browser, a link or a board entry
     official  — a brain taped out on TapeOut: a circuit ID on a processor,
                 whose answers on all 4,096 inputs were checked on chain
   --------------------------------------------------------------------------- */
import { nameFor } from "./names";

/** FNV-1a over the code: small, stable, no dependencies. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The name a brain hatches with, from its builder code (`p1.…`) or any stable string. */
export function defaultFlyName(code: string): string {
  return nameFor(hash32(code), 0);
}

export interface TapeoutRecord {
  chain: "bsc";
  /** the processor contract the circuit was taped out on */
  processor: string;
  /** the circuit's ID on that processor */
  circuitId: string;
  txHash?: string;
}

export type Status = "practice" | "official";

const ADDR = /^0x[0-9a-fA-F]{40}$/;
const TX = /^0x[0-9a-fA-F]{64}$/;

/** Throws with a reason when a tape-out record is malformed. */
export function validateTapeout(t: unknown): TapeoutRecord {
  const r = t as TapeoutRecord;
  if (!r || typeof r !== "object") throw new Error("tapeout must be an object");
  if (r.chain !== "bsc") throw new Error('tapeout.chain must be "bsc"');
  if (!ADDR.test(r.processor ?? "")) throw new Error("tapeout.processor must be a 0x address");
  if (!/^\d{1,12}$/.test(String(r.circuitId ?? ""))) throw new Error("tapeout.circuitId must be a whole number");
  if (r.txHash !== undefined && !TX.test(r.txHash)) throw new Error("tapeout.txHash must be a 0x transaction hash");
  return { chain: "bsc", processor: r.processor, circuitId: String(r.circuitId), ...(r.txHash ? { txHash: r.txHash } : {}) };
}

export const statusOf = (e: { tapeout?: unknown }): Status => (e.tapeout ? "official" : "practice");
