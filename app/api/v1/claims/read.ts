import { createPublicClient, http, type Address, type Hex } from "viem";
import { CIRCUIT_CLAIMS_ABI } from "@/sim/circuit-claims";
import { claimContractAddress } from "@/sim/circuit-claims-server";
import { XLAYER_CLAIM_CHAIN } from "@/sim/circuit-claims";

export interface StoredCircuitClaim {
  recipient: Address;
  mode: number;
  seasonId: number;
  activityCode: number;
  activityId: Hex;
  circuitHash: Hex;
  gateCount: number;
  depth: number;
  stateBits: number;
  score: number;
  deadline: number;
  nonce: Hex;
}

const client = createPublicClient({
  transport: http(XLAYER_CLAIM_CHAIN.rpcUrls.default.http[0]),
});

export async function readCircuitClaim(tokenId: string): Promise<StoredCircuitClaim | null> {
  const contract = claimContractAddress();
  if (!contract || !/^\d+$/.test(tokenId)) return null;

  const result = await client.readContract({
    address: contract,
    abi: CIRCUIT_CLAIMS_ABI,
    functionName: "claims",
    args: [BigInt(tokenId)],
  });
  if (!result || result[0] === "0x0000000000000000000000000000000000000000") return null;

  return {
    recipient: result[0],
    mode: Number(result[1]),
    seasonId: Number(result[2]),
    activityCode: Number(result[3]),
    activityId: result[4],
    circuitHash: result[5],
    gateCount: Number(result[6]),
    depth: Number(result[7]),
    stateBits: Number(result[8]),
    score: Number(result[9]),
    deadline: Number(result[10]),
    nonce: result[11],
  };
}

