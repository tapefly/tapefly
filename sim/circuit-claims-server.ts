import { randomBytes } from "node:crypto";
import {
  encodeAbiParameters,
  getAddress,
  keccak256,
  parseAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  CIRCUIT_CLAIM_TYPES,
  XLAYER_CLAIM_CHAIN,
  type CircuitClaimData,
  type SerializableCircuitClaim,
} from "./circuit-claims";

const CLAIM_TTL_SECONDS = 15 * 60;

export function claimContractAddress(): `0x${string}` | null {
  const value = (process.env.NEXT_PUBLIC_TAPEFLY_CLAIMS_CONTRACT ?? process.env.TAPEFLY_CLAIMS_CONTRACT ?? "").trim();
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? value as `0x${string}` : null;
}

export function claimSignerAccount() {
  const key = process.env.TAPEFLY_CLAIM_SIGNER_KEY?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  return privateKeyToAccount(key as `0x${string}`);
}

export function claimDomain(): {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
} | null {
  const verifyingContract = claimContractAddress();
  if (!verifyingContract) return null;
  return {
    name: "TapeFly Circuit Claims",
    version: "1",
    chainId: XLAYER_CLAIM_CHAIN.id,
    verifyingContract,
  };
}

export function circuitClaimTokenId(input: {
  recipient: `0x${string}`;
  mode: number;
  seasonId: number;
  activityId: `0x${string}`;
}): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        parseAbiParameters("address,uint8,uint16,bytes32"),
        [
          input.recipient,
          input.mode,
          input.seasonId,
          input.activityId,
        ],
      ),
    ),
  );
}

export async function signCircuitClaim(input: {
  recipient: string;
  mode: number;
  activityCode: number;
  activityId: `0x${string}`;
  circuitHash: `0x${string}`;
  gateCount: number;
  depth: number;
  stateBits: number;
  score: number;
}): Promise<{
  claim: SerializableCircuitClaim;
  signature: `0x${string}`;
  tokenId: string;
  signer: `0x${string}`;
  contract: `0x${string}`;
}> {
  const account = claimSignerAccount();
  const domain = claimDomain();
  const contract = claimContractAddress();
  if (!account) throw new Error("TAPEFLY_CLAIM_SIGNER_KEY is not configured");
  if (!domain || !contract) throw new Error("NEXT_PUBLIC_TAPEFLY_CLAIMS_CONTRACT is not configured");

  const claim: CircuitClaimData = {
    recipient: getAddress(input.recipient),
    mode: input.mode,
    seasonId: 1,
    activityCode: input.activityCode,
    activityId: input.activityId,
    circuitHash: input.circuitHash,
    gateCount: input.gateCount,
    depth: input.depth,
    stateBits: input.stateBits,
    score: input.score,
    deadline: BigInt(Math.floor(Date.now() / 1000) + CLAIM_TTL_SECONDS),
    nonce: `0x${randomBytes(32).toString("hex")}`,
  };

  const signature = await account.signTypedData({
    domain,
    types: CIRCUIT_CLAIM_TYPES,
    primaryType: "CircuitClaim",
    message: claim,
  });
  const tokenId = circuitClaimTokenId({
    recipient: claim.recipient,
    mode: claim.mode,
    seasonId: claim.seasonId,
    activityId: claim.activityId,
  });

  return {
    claim: { ...claim, deadline: Number(claim.deadline) },
    signature,
    tokenId: tokenId.toString(),
    signer: account.address,
    contract,
  };
}

