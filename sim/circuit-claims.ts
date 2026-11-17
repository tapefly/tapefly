import { parseAbi } from "viem";

export const CLAIM_MODE = {
  workshop: 1,
  brawl: 2,
} as const;

export type ClaimMode = (typeof CLAIM_MODE)[keyof typeof CLAIM_MODE];

export interface CircuitClaimData {
  recipient: `0x${string}`;
  mode: number;
  seasonId: number;
  activityCode: number;
  activityId: `0x${string}`;
  circuitHash: `0x${string}`;
  gateCount: number;
  depth: number;
  stateBits: number;
  score: number;
  deadline: bigint;
  nonce: `0x${string}`;
}

export type SerializableCircuitClaim = Omit<CircuitClaimData, "deadline"> & {
  deadline: number;
};

export const CIRCUIT_CLAIM_TYPES = {
  CircuitClaim: [
    { name: "recipient", type: "address" },
    { name: "mode", type: "uint8" },
    { name: "seasonId", type: "uint16" },
    { name: "activityCode", type: "uint32" },
    { name: "activityId", type: "bytes32" },
    { name: "circuitHash", type: "bytes32" },
    { name: "gateCount", type: "uint16" },
    { name: "depth", type: "uint16" },
    { name: "stateBits", type: "uint16" },
    { name: "score", type: "uint16" },
    { name: "deadline", type: "uint64" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export const XLAYER_CLAIM_CHAIN = {
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKX Explorer", url: "https://www.okx.com/web3/explorer/xlayer" },
  },
} as const;

export const CIRCUIT_CLAIMS_ABI = parseAbi([
  "function claim((address recipient,uint8 mode,uint16 seasonId,uint32 activityCode,bytes32 activityId,bytes32 circuitHash,uint16 gateCount,uint16 depth,uint16 stateBits,uint16 score,uint64 deadline,bytes32 nonce) claimData, bytes signature)",
  "function tokenIdFor((address recipient,uint8 mode,uint16 seasonId,uint32 activityCode,bytes32 activityId,bytes32 circuitHash,uint16 gateCount,uint16 depth,uint16 stateBits,uint16 score,uint64 deadline,bytes32 nonce) claimData) view returns (uint256)",
  "function claims(uint256 tokenId) view returns (address recipient,uint8 mode,uint16 seasonId,uint32 activityCode,bytes32 activityId,bytes32 circuitHash,uint16 gateCount,uint16 depth,uint16 stateBits,uint16 score,uint64 deadline,bytes32 nonce)",
  "function totalClaims() view returns (uint256)",
  "function totalSupply(uint256 id) view returns (uint256)",
  "event CircuitClaimed(address indexed recipient,uint256 indexed tokenId,uint8 indexed mode,uint32 activityCode,bytes32 activityId,bytes32 circuitHash,uint16 gateCount)",
]);

export function configuredClaimContract(): `0x${string}` | null {
  const value = process.env.NEXT_PUBLIC_TAPEFLY_CLAIMS_CONTRACT?.trim();
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? value as `0x${string}` : null;
}

export function claimModeLabel(mode: number) {
  return mode === CLAIM_MODE.workshop ? "Workshop" : mode === CLAIM_MODE.brawl ? "Brain Brawl" : "Unknown";
}

