/* GET  /api/v1/workshop/designs/:id/chain — the text to put on X Layer, its data, and records already verified.
   POST /api/v1/workshop/designs/:id/chain {tx} — read that transaction back from X Layer and keep it
   only if it was sent to its own sender, carries no value, and its data is exactly this design's record. */

import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { gallery } from "@/sim/workshop/gallery";
import { decodeDesign } from "@/sim/workshop/codec";
import { chipFingerprint, recordText, recordData } from "@/sim/workshop/record";
import { ok, bad } from "../../../../json";
import { CHAIN, CHAIN_RPC, EXPLORER } from "@/sim/onchain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const client = createPublicClient({ chain: CHAIN, transport: http(process.env.XLAYER_RPC || CHAIN_RPC, { timeout: 10_000 }) });

function expected(id: string) {
  const d = gallery().get(id);
  const design = d ? decodeDesign(d.code) : null;
  if (!d || !design) return null;
  const text = recordText(d, chipFingerprint(design));
  return { d, text, data: recordData(text) };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{12}$/.test(id)) return bad("bad id");
  const e = expected(id);
  if (!e) return bad("not found", 404);
  return ok({ chainId: CHAIN.id, text: e.text, data: e.data, explorer: EXPLORER, records: gallery().chainRecords(id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{12}$/.test(id)) return bad("bad id");
  const e = expected(id);
  if (!e) return bad("not found", 404);
  let tx = "";
  try { tx = String((JSON.parse((await req.text()).slice(0, 1000)) as { tx?: unknown }).tx ?? ""); } catch { return bad("body must be JSON"); }
  if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) return bad("tx must be a transaction hash");
  try {
    const receipt = await client.getTransactionReceipt({ hash: tx as `0x${string}` });
    if (receipt.status !== "success") return bad("that transaction failed on chain", 422);
    const t = await client.getTransaction({ hash: tx as `0x${string}` });
    if (!t.to || t.to.toLowerCase() !== t.from.toLowerCase()) return bad("the record must be sent to the sender's own address", 422);
    if (t.value !== 0n) return bad("the record must carry no value", 422);
    if (t.input.toLowerCase() !== e.data.toLowerCase()) return bad("the transaction data is not this design's record", 422);
    const fresh = gallery().addChain({ id, tx: t.hash, from: t.from, block: Number(receipt.blockNumber), at: new Date().toISOString() });
    return NextResponse.json({ ok: true, fresh, tx: t.hash, from: t.from, block: Number(receipt.blockNumber) }, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch {
    return bad("could not read that transaction from X Layer yet; try again in a few seconds", 404);
  }
}
