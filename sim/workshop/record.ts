/* ── sim/workshop/record.ts ─────────────────────────────────────────────────
   A published design written onto X Layer.

   A record is an ordinary X Layer transaction a player sends from their own
   wallet to their own address, with no value, whose data is the text

       TAPEFLY-WORKSHOP/1 <level> <design id> <gates> <bits> <seconds> <chip>

   <chip> is the SHA-256 of the design's TapeOut netlist bytes: the exact
   circuit the game compiled. Anyone can read the transaction, load the design
   by its id, compile it again and compare. No contract and no key on this
   site: the player's wallet signs.
   --------------------------------------------------------------------------- */
import { createHash } from "node:crypto";
import { compileWiring } from "./compile";
import { netlistBytes } from "../tapeout";
import type { Design } from "./parts";
import type { Published } from "./gallery";

export const RECORD_VERSION = "TAPEFLY-WORKSHOP/1";

/** SHA-256 (hex) of the compiled circuit's TapeOut bytes. */
export function chipFingerprint(d: Design): string {
  const hex = netlistBytes(compileWiring(d));
  return createHash("sha256").update(Buffer.from(hex.slice(2), "hex")).digest("hex");
}

export function recordText(p: Published, chip: string): string {
  return `${RECORD_VERSION} ${p.level} ${p.id} ${p.gates} ${p.bits} ${p.seconds.toFixed(2)} ${chip}`;
}

export function recordData(text: string): `0x${string}` {
  return `0x${Buffer.from(text, "utf8").toString("hex")}`;
}

export interface ParsedRecord { level: string; id: string; gates: number; bits: number; seconds: number; chip: string }

export function parseRecord(data: string): ParsedRecord | null {
  if (!/^0x[0-9a-fA-F]*$/.test(data) || data.length > 2 + 2 * 400) return null;
  const text = Buffer.from(data.slice(2), "hex").toString("utf8");
  const m = text.match(/^TAPEFLY-WORKSHOP\/1 ([a-z0-9]+) ([0-9a-f]{12}) (\d+) (\d+) (\d+\.\d{2}) ([0-9a-f]{64})$/);
  if (!m) return null;
  return { level: m[1], id: m[2], gates: Number(m[3]), bits: Number(m[4]), seconds: Number(m[5]), chip: m[6] };
}
