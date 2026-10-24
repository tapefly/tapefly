/* ── sim/anchor.ts ───────────────────────────────────────────────────────────
   Writing the fly's memory onto BNB Chain.

   The lineage (sim/lineage.ts) is a chain of days: every day's champion, its
   body, how long it lived, and the sealed hash of every step it took. The
   *head* folds all of it, from the founder to a given date, into one hash.
   Change any step of any fly on any day and every head after it changes.

   An anchor is an ordinary BNB Chain transaction, sent by the operator to
   their own address with no value, whose data is the text

       TAPEFLY-ANCHOR/1 <date> <head>

   Once it is in a block, that day's head is on chain for good, with the
   block's timestamp. Anyone can read the transaction, recompute the head from
   the date alone, and compare. No contract, no token, no key on this site:
   the operator's wallet (or a key held only in a CI secret) signs.
   --------------------------------------------------------------------------- */
import { recordHash, chainHash } from "./hash";
import { LEDGER_VERSION, EPOCH, ledgerDay, addDays, type LedgerDay } from "./lineage";
import { FOUNDER } from "./genome";
import anchorsFile from "../anchors/anchors.json";

export const ANCHOR_VERSION = "TAPEFLY-ANCHOR/1";

export interface Anchor { date: string; head: string; tx: string; from: string }
export interface AnchorFile { version: string; chainId: number; note?: string; entries: Anchor[] }
export const ANCHORS: AnchorFile = anchorsFile as AnchorFile;

/** The genesis of the head chain: the ledger's version, epoch and founder. */
export const HEAD_GENESIS = recordHash({ version: LEDGER_VERSION, epoch: EPOCH, founder: FOUNDER });

/** Fold ledger rows (oldest first) into a head. */
export function foldHead(days: LedgerDay[], start = HEAD_GENESIS): string {
  let h = start;
  for (const d of days) h = chainHash(h, recordHash(d));
  return h;
}

/** The head through `date`, computed from the date alone (the lineage extends itself up to tomorrow, UTC). */
export function headOn(date: string): string {
  const rows: LedgerDay[] = [];
  for (let d = EPOCH; d <= date; d = addDays(d, 1)) {
    const row = ledgerDay(d);
    if (!row) throw new Error(`the lineage does not reach ${d}`);
    rows.push(row);
  }
  return foldHead(rows);
}

const enc = (s: string) => Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, "0")).join("");

export function anchorText(date: string, head: string): string {
  return `${ANCHOR_VERSION} ${date} ${head}`;
}

/** Transaction data for an anchor, as 0x-hex. */
export function anchorData(date: string, head: string): `0x${string}` {
  return `0x${enc(anchorText(date, head))}`;
}

/** Read an anchor back out of transaction data, or null if it is not one. */
export function parseAnchor(data: string): { date: string; head: string } | null {
  const hex = data.startsWith("0x") ? data.slice(2) : data;
  if (hex.length % 2 || !/^[0-9a-fA-F]*$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const m = new TextDecoder().decode(bytes).match(/^TAPEFLY-ANCHOR\/1 (\d{4}-\d{2}-\d{2}) ([0-9a-f]{64})$/);
  return m ? { date: m[1], head: m[2] } : null;
}

/** Recompute every recorded head; the first entry that disagrees, or null. */
export function checkAnchors(file: AnchorFile = ANCHORS): string | null {
  if (file.version !== ANCHOR_VERSION) return `version must be ${ANCHOR_VERSION}`;
  let prev = "";
  for (const a of file.entries) {
    if (a.date <= prev) return `${a.date}: entries must be in date order, one per date`;
    prev = a.date;
    const h = headOn(a.date);
    if (h !== a.head) return `${a.date}: recorded head ${a.head.slice(0, 12)}… but the lineage gives ${h.slice(0, 12)}…`;
  }
  return null;
}

/** The last finished UTC day — what a daily anchor commits to. */
export const yesterdayUTC = () => addDays(new Date().toISOString().slice(0, 10), -1);

/** A transaction as an anchor check needs it. */
export interface AnchorTx { from: string; to: string | null; input: string; blockNumber: bigint | null }

/** Does this transaction carry this anchor? Self-sent, data parses, date and head match. */
export function txCarries(tx: AnchorTx, a: Anchor): string | null {
  if (!tx.blockNumber) return "not in a block yet";
  if (tx.from.toLowerCase() !== a.from.toLowerCase()) return `sent by ${tx.from}, not ${a.from}`;
  if (!tx.to || tx.to.toLowerCase() !== tx.from.toLowerCase()) return "not a self-sent anchor";
  const p = parseAnchor(tx.input);
  if (!p) return "the data is not a TapeFly anchor";
  if (p.date !== a.date || p.head !== a.head) return `the data says ${p.date} ${p.head.slice(0, 12)}…`;
  return null;
}
