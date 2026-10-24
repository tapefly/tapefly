/* ── scripts/tapeout.ts ──────────────────────────────────────────────────────
   Everything the brain needs to go on chain, and the check for after.

     npm run tapeout -- bytes
         Print the netlist as TapeOut bytes, its length, SHA-256, gate count,
         depth and ranking cost, and the arguments for tapeout(bytes, nIn, nOut).

     npm run tapeout -- verify --processor 0x… --id 123 [--rpc https://…]
         Call the free, read-only eval(id, inputs) on the processor for all 4,096
         input words and compare every answer with the committed netlist. Prints
         the first mismatch, or IDENTICAL. Costs nothing: eval is a view call.

   The byte format follows the public notes in github.com/xm1319/tapemkt
   (NETLIST-FORMAT.md). How eval packs its answer is read defensively below
   (one byte per output bit, or one packed byte); if neither fits, the script
   says so instead of guessing.
   --------------------------------------------------------------------------- */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { BRAIN } from "../sim/netlist";
import { netlistBytes } from "../sim/tapeout";
import { verifyOnChain } from "./chain";
import { netDepth, cost } from "../sim/compile";

const cmd = process.argv[2];
const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const config = JSON.parse(readFileSync(join(__dirname, "..", "config", "tapeout.json"), "utf8"));

const hex = netlistBytes(BRAIN);
const sha = createHash("sha256").update(Buffer.from(hex.slice(2), "hex")).digest("hex");

async function verify() {
  const processor = arg("processor") ?? config.processor;
  const id = arg("id") ?? config.circuitId;
  if (!processor || id === null || id === undefined) {
    console.error("need --processor 0x… and --id N (or fill config/tapeout.json)");
    process.exit(2);
  }
  const r = await verifyOnChain(BRAIN, processor, String(id), arg("rpc") ?? config.rpc);
  if (!r.ok) { console.error(`✗ ${r.reason}`); process.exit(1); }
  console.log("✓ IDENTICAL: the circuit on chain answers all 4,096 words exactly like the committed netlist");
}

if (cmd === "bytes") {
  console.log(JSON.stringify({
    version: BRAIN.version,
    gates: BRAIN.gates.length,
    depth: netDepth(BRAIN),
    rankingCost: cost(BRAIN),
    bytes: (hex.length - 2) / 2,
    sha256: sha,
    committedSha256: config.bytesSha256,
    matchesConfig: sha === config.bytesSha256,
    call: { function: "tapeout(bytes nl, uint32 nIn, uint32 nOut)", nIn: BRAIN.nIn, nOut: BRAIN.nOut, nl: hex }
  }, null, 2));
  if (sha !== config.bytesSha256) process.exit(1);
} else if (cmd === "verify") {
  verify().catch((e) => { console.error(e); process.exit(1); });
} else {
  console.log("usage: npm run tapeout -- bytes | verify --processor 0x… --id N [--rpc URL]");
}
