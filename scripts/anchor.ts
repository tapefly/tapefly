/* npm run anchor -- --check        recompute every head in anchors/anchors.json (offline)
   npm run anchor -- --chain        …and read each transaction on BNB Chain
   npm run anchor -- --dry-run      print the anchor for yesterday (UTC) without sending
   npm run anchor                   send it: needs ANCHOR_PRIVATE_KEY in the environment
                                    (a CI secret or a local shell variable; never a file in
                                    this repository), then appends the entry to anchors.json

   An anchor is a zero-value transaction from the operator to their own address,
   whose data is "TAPEFLY-ANCHOR/1 <date> <head>" (see sim/anchor.ts). */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { ANCHORS, anchorData, anchorText, checkAnchors, headOn, txCarries, yesterdayUTC, type AnchorFile } from "../sim/anchor";
import { BSC_RPC } from "../sim/onchain";

const file = join(__dirname, "..", "anchors", "anchors.json");
const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const has = (k: string) => process.argv.includes(`--${k}`);
const rpc = arg("rpc") ?? process.env.BSC_RPC ?? BSC_RPC;

async function client() {
  const { createPublicClient, http } = await import("viem");
  const { bsc } = await import("viem/chains");
  return createPublicClient({ chain: bsc, transport: http(rpc) });
}

async function main() {
  if (has("check") || has("chain")) {
    const bad = checkAnchors();
    if (bad) { console.error(`✗ anchors/anchors.json: ${bad}`); process.exit(1); }
    console.log(`✓ ${ANCHORS.entries.length} anchor${ANCHORS.entries.length === 1 ? "" : "s"}: every head recomputes from the lineage`);
    if (!has("chain")) return;
    const c = await client();
    for (const a of ANCHORS.entries) {
      const tx = await c.getTransaction({ hash: a.tx as `0x${string}` });
      const why = txCarries({ from: tx.from, to: tx.to, input: tx.input, blockNumber: tx.blockNumber }, a);
      if (why) { console.error(`✗ ${a.date} ${a.tx}: ${why}`); process.exit(1); }
      console.log(`✓ ${a.date} on chain in block ${tx.blockNumber}`);
    }
    return;
  }

  const date = arg("date") ?? yesterdayUTC();
  const head = headOn(date);
  const data = anchorData(date, head);
  console.log(anchorText(date, head));
  if (ANCHORS.entries.some((a) => a.date === date)) { console.log(`${date} is already anchored`); return; }
  if (has("dry-run")) { console.log(`data ${data}`); return; }

  const key = process.env.ANCHOR_PRIVATE_KEY;
  if (!key) { console.error("ANCHOR_PRIVATE_KEY is not set. Anchor from the browser at /lineage/anchor instead, or set it as a CI secret."); process.exit(2); }
  const { createWalletClient, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { bsc } = await import("viem/chains");
  const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
  const w = createWalletClient({ account, chain: bsc, transport: http(rpc) });
  const c = await client();
  const hash = await w.sendTransaction({ to: account.address, value: 0n, data });
  console.log(`sent ${hash}`);
  const r = await c.waitForTransactionReceipt({ hash });
  if (r.status !== "success") { console.error("✗ the anchor transaction failed"); process.exit(1); }
  const json = JSON.parse(readFileSync(file, "utf8")) as AnchorFile;
  json.entries.push({ date, head, tx: hash, from: account.address });
  json.entries.sort((a, b) => (a.date < b.date ? -1 : 1));
  writeFileSync(file, JSON.stringify(json, null, 1) + "\n");
  console.log(`✓ anchored ${date} in block ${r.blockNumber}; anchors/anchors.json updated`);
}

main().catch((e) => { console.error(e); process.exit(1); });
