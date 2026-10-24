/* GET /api/v1/tapeout — the brain as TapeOut bytes, and the honest state of the
   tape-out itself (config/tapeout.json). */

import { BRAIN } from "@/sim/netlist";
import { netlistBytes, bytesLength } from "@/sim/tapeout";
import { netDepth, cost } from "@/sim/compile";
import config from "@/config/tapeout.json";
import { ok } from "../json";

export const dynamic = "force-dynamic";

export function GET() {
  return ok({
    status: config.status,
    chain: config.chain,
    chainId: config.chainId,
    processor: config.processor,
    circuitId: config.circuitId,
    txHash: config.txHash,
    circuit: {
      version: BRAIN.version,
      nIn: BRAIN.nIn,
      nOut: BRAIN.nOut,
      gates: BRAIN.gates.length,
      depth: netDepth(BRAIN),
      rankingCost: cost(BRAIN),
      bytes: bytesLength(BRAIN),
      bytesSha256: config.bytesSha256,
      hex: netlistBytes(BRAIN)
    },
    call: "tapeout(bytes nl, uint32 nIn, uint32 nOut)",
    check: "npm run tapeout -- verify --processor <address> --id <circuit id>"
  });
}
