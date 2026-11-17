/* A Workshop design is sealable only when its entire behavior can be checked.
   State registers are part of the input/output interface, while the game loop
   carries the next state back on the following tick. */
import { evalWord } from "../netlist";
import { sha256BytesHex } from "../hash";
import { netlistBytes } from "../tapeout";
import { brainTick, gateOrder } from "./brain";
import { compileWiring, type WorkshopChip } from "./compile";
import { gradeDesign } from "./game";
import type { WLevel } from "./levels";
import type { Design } from "./parts";

export const SEAL_MAX_INPUTS = 12;

export interface SealReport {
  version: "TAPEFLY-WORKSHOP-SEAL/1";
  profile: string;
  nIn: number;
  nOut: number;
  gates: number;
  inputs: string[];
  outputs: string[];
  state: WorkshopChip["state"];
  regs: WorkshopChip["regs"];
  bytes: string;
  bytesLength: number;
  bytesSha256: string;
  checkedInputs: number;
  mismatch: { word: number; output: number; expected: number } | null;
  eligible: boolean;
  problems: string[];
}

function hexBytes(hex: string) {
  const body = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(body.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function sealWorkshopBrain(level: WLevel, design: Design): SealReport {
  const chip = compileWiring(design);
  const bytes = netlistBytes(chip);
  const grade = gradeDesign(level, design);
  const problems = [...grade.problems];

  if (!grade.cleared) problems.push("not-cleared");
  if (chip.nIn > SEAL_MAX_INPUTS) problems.push(`too-many-inputs:${chip.nIn}>${SEAL_MAX_INPUTS}`);

  const exhaustive = chip.nIn <= SEAL_MAX_INPUTS;
  const total = exhaustive ? 1 << chip.nIn : 4096;
  const present = new Set(design.parts.map((part) => part.id));
  const order = gateOrder(design);
  let mismatch: SealReport["mismatch"] = null;
  let checkedInputs = 0;

  for (let sample = 0; sample < total; sample++) {
    const word = exhaustive ? sample : (sample * 2654435761) >>> (32 - chip.nIn);
    const bit = (i: number) => ((word >>> i) & 1) === 1;
    const sensed = new Map(chip.inputs.map((id, i) => [id, bit(i)]));
    const state = {
      q: {} as Record<string, boolean>,
      wasOff: {} as Record<string, boolean>,
    };
    chip.state.forEach(([id, kind], i) => {
      (kind === "q" ? state.q : state.wasOff)[id] = bit(chip.inputs.length + i);
    });

    const expected = brainTick(design, sensed, present, state, order);
    const actual = evalWord(chip, word);
    let want = 0;
    chip.outputs.forEach((id, i) => { if (expected.wings.get(id)) want |= 1 << i; });
    chip.state.forEach(([id, kind], i) => {
      const value = kind === "q" ? expected.next.q[id] : expected.next.wasOff[id];
      if (value) want |= 1 << (chip.outputs.length + i);
    });

    checkedInputs++;
    if (actual !== want) {
      mismatch = { word, output: actual, expected: want };
      break;
    }
  }

  if (mismatch) problems.push(`mismatch:${mismatch.word}`);
  if (!checkedInputs || mismatch) problems.push("verification-incomplete");

  return {
    version: "TAPEFLY-WORKSHOP-SEAL/1",
    profile: `WORKSHOP-${chip.nIn}x${chip.nOut}/1`,
    nIn: chip.nIn,
    nOut: chip.nOut,
    gates: chip.gates.length,
    inputs: chip.inputs,
    outputs: chip.outputs,
    state: chip.state,
    regs: chip.regs,
    bytes,
    bytesLength: (bytes.length - 2) / 2,
    bytesSha256: sha256BytesHex(hexBytes(bytes)),
    checkedInputs,
    mismatch,
    eligible: problems.length === 0,
    problems,
  };
}

export function sealManifest(report: SealReport) {
  const { bytes: _bytes, ...manifest } = report;
  return manifest;
}
