import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { decodeDesign } from "@/sim/workshop/codec";
import { WLEVELS } from "@/sim/workshop/levels";
import { gradeDesign } from "@/sim/workshop/game";
import { sealWorkshopBrain } from "@/sim/workshop/seal";
import { compileWiring } from "@/sim/workshop/compile";
import { gateDepth } from "@/sim/netlist";
import { netlistBytes } from "@/sim/tapeout";
import { sha256BytesHex, sha256Hex, stableStringify } from "@/sim/hash";
import {
  BODY_SLOTS,
  report,
  replayRunActions,
  type Run,
  type RunAction,
  programOf,
} from "@/sim/arena";
import { compileFighter } from "@/sim/duel";
import { CLAIM_MODE } from "@/sim/circuit-claims";
import { claimDomain, claimSignerAccount, signCircuitClaim } from "@/sim/circuit-claims-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ClaimRequest = {
  address?: unknown;
  mode?: unknown;
  payload?: unknown;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function integer(value: unknown, min: number, max: number): number | null {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max ? Number(value) : null;
}

function parseActions(value: unknown): RunAction[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) return null;
  const actions: RunAction[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const action = item as Record<string, unknown>;
    switch (action.kind) {
      case "buy": {
        const slot = integer(action.slot, 0, 4);
        if (slot === null) return null;
        actions.push({ kind: "buy", slot });
        break;
      }
      case "sellChip": {
        const index = integer(action.index, 0, 10);
        if (index === null) return null;
        actions.push({ kind: "sellChip", index });
        break;
      }
      case "sellPart": {
        const index = integer(action.index, 0, BODY_SLOTS - 1);
        if (index === null) return null;
        actions.push({ kind: "sellPart", index });
        break;
      }
      case "move": {
        const index = integer(action.index, 0, 10);
        const dir = action.dir === -1 || action.dir === 1 ? action.dir : null;
        if (index === null || dir === null) return null;
        actions.push({ kind: "move", index, dir });
        break;
      }
      case "reroll":
        actions.push({ kind: "reroll" });
        break;
      case "fight":
        actions.push({ kind: "fight" });
        break;
      default:
        return null;
    }
  }
  return actions;
}

function bytesFromHex(hex: string): Uint8Array {
  const body = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (body.length % 2 !== 0) throw new Error("odd hex");
  const bytes = new Uint8Array(body.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const value = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
    if (!Number.isFinite(value)) throw new Error("invalid hex");
    bytes[i] = value;
  }
  return bytes;
}

export async function POST(req: Request) {
  if (!claimSignerAccount() || !claimDomain()) {
    return bad("Circuit claim signing is not configured on this deployment", 503);
  }

  const text = await req.text();
  if (text.length > 32_000) return bad("body too large", 413);

  let body: ClaimRequest;
  try {
    body = JSON.parse(text) as ClaimRequest;
  } catch {
    return bad("body must be JSON");
  }

  const address = typeof body.address === "string" && isAddress(body.address) ? body.address : null;
  if (!address) return bad("a valid wallet address is required");
  if (!body.payload || typeof body.payload !== "object") return bad("payload is required");

  if (body.mode === "workshop" || body.mode === CLAIM_MODE.workshop) {
    const payload = body.payload as { levels?: unknown };
    if (!Array.isArray(payload.levels) || payload.levels.length < 3) {
      return bad("three unique cleared Workshop levels are required");
    }

    const input = payload.levels.slice(0, 3).map((item) => {
      const entry = item && typeof item === "object" ? item as { level?: unknown; code?: unknown } : {};
      const level = typeof entry.level === "string" ? WLEVELS.find((candidate) => candidate.id === entry.level) : undefined;
      const design = typeof entry.code === "string" ? decodeDesign(entry.code) : null;
      return { level, design };
    });
    if (input.some((item) => !item.level || !item.design)) {
      return bad("each Workshop entry must contain a known level and a decodable design");
    }
    if (new Set(input.map((item) => item.level!.id)).size !== 3) {
      return bad("the three Workshop levels must be unique");
    }

    let totalSeconds = 0;
    let totalGates = 0;
    let maxDepth = 0;
    let stateBits = 0;
    const proofHashes: string[] = [];
    const levels: { level: string; title: { zh: string; en: string }; gates: number; depth: number; checkedInputs: number }[] = [];

    for (const item of input) {
      const level = item.level!;
      const design = item.design!;
      const evaluation = gradeDesign(level, design);
      if (!evaluation.cleared || evaluation.problems.length > 0) {
        return bad(`${level.id} is not cleared`, 422);
      }
      const seal = sealWorkshopBrain(level, design);
      if (!seal.eligible || seal.mismatch || seal.checkedInputs !== (1 << seal.nIn)) {
        return bad(`${level.id} did not pass exhaustive verification`, 422);
      }
      const depth = gateDepth(compileWiring(design)).cols.length - 1;
      totalSeconds += evaluation.seconds;
      totalGates += seal.gates;
      maxDepth = Math.max(maxDepth, depth);
      stateBits += seal.state.length;
      proofHashes.push(seal.bytesSha256);
      levels.push({ level: level.id, title: level.title, gates: seal.gates, depth, checkedInputs: seal.checkedInputs });
    }

    const voucher = await signCircuitClaim({
      recipient: address,
      mode: CLAIM_MODE.workshop,
      activityCode: 3,
      activityId: `0x${sha256Hex("tapefly:workshop:v2:season:1:three-levels")}`,
      circuitHash: `0x${sha256Hex(stableStringify(proofHashes))}`,
      gateCount: totalGates,
      depth: maxDepth,
      stateBits,
      score: Math.min(65_535, Math.round(totalSeconds * 10)),
    });

    return NextResponse.json({
      ...voucher,
      chainId: 196,
      summary: {
        mode: "workshop",
        levels,
        clearedLevels: 3,
        gates: totalGates,
        depth: maxDepth,
        stateBits,
        seconds: totalSeconds,
      },
    });
  }

  if (body.mode === "brawl" || body.mode === CLAIM_MODE.brawl) {
    const payload = body.payload as { date?: unknown; actions?: unknown };
    const date = typeof payload.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.date) ? payload.date : null;
    const actions = parseActions(payload.actions);
    if (!date || !actions) return bad("a valid Brawl date and action log are required");

    let run: Run;
    try {
      run = replayRunActions(date, actions);
    } catch (error) {
      return bad(error instanceof Error ? error.message : "the Brawl action log does not replay", 422);
    }
    if (run.history.length === 0 || run.wins === 0) {
      return bad("win at least one verified Brawl fight before claiming", 422);
    }

    const compiled = compileFighter(programOf(run.chips));
    const stats = report(run.chips);
    const bytes = netlistBytes(compiled.net);
    const voucher = await signCircuitClaim({
      recipient: address,
      mode: CLAIM_MODE.brawl,
      activityCode: Number.parseInt(date.replaceAll("-", ""), 10),
      activityId: `0x${sha256Hex(`tapefly:brawl:v1:${date}`)}`,
      circuitHash: `0x${sha256BytesHex(bytesFromHex(bytes))}`,
      gateCount: compiled.gates,
      depth: compiled.depth,
      stateBits: 0,
      score: run.wins,
    });

    return NextResponse.json({
      ...voucher,
      chainId: 196,
      summary: {
        mode: "brawl",
        date,
        outcome: run.over,
        wins: run.wins,
        lives: run.lives,
        gates: stats.gates,
        depth: stats.depth,
        fights: run.history.length,
        actionHash: sha256Hex(stableStringify(actions)),
      },
    });
  }

  return bad("mode must be workshop or brawl");
}

