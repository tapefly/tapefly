/* ── sim/tapeout.ts ──────────────────────────────────────────────────────────
   The bytes a netlist becomes on TapeOut.

   Each NAND is one 7-byte record: 0x00, then the two operand signals as
   big-endian 24-bit integers. Signal numbering is the same as sim/netlist.ts
   (0 = constant 0, 1 = constant 1, 2.. = inputs, then one signal per gate), and
   the last nOut signals are the outputs. These are the bytes passed to
   `tapeout(bytes nl, uint32 nIn, uint32 nOut)`.

   The format follows the public reverse-engineering notes (NETLIST-FORMAT.md in
   github.com/xm1319/tapemkt). It has not yet been exercised against the live
   contract from this repository — config/tapeout.json says so until it has.
   --------------------------------------------------------------------------- */
import type { Netlist } from "./netlist";
import { evalWord } from "./netlist";

const hex2 = (v: number) => v.toString(16).padStart(2, "0");
const hex6 = (v: number) => v.toString(16).padStart(6, "0");

export function netlistBytes(n: Netlist): string {
  let s = "0x";
  for (const [a, b] of n.gates) s += "00" + hex6(a) + hex6(b);
  return s;
}

export function bytesLength(n: Netlist): number {
  return n.gates.length * 7;
}

/** Input bytes for `eval(id, inputs)`, packed bit-wise: bit 0 of byte 0 is the first input pin,
    bit 7 the eighth, then byte 1 (the format TapeOut's eval reads, per the public format notes). */
export function evalInputBytes(word: number, nIn = 12): string {
  let s = "0x";
  for (let i = 0; i < Math.ceil(nIn / 8); i++) s += hex2((word >>> (8 * i)) & 0xff);
  return s;
}

/** The older guess, one byte per input bit. Kept so a check can tell the two apart. */
export function evalInputBytesPerBit(word: number, nIn = 12): string {
  let s = "0x";
  for (let i = 0; i < nIn; i++) s += hex2((word >>> i) & 1);
  return s;
}

/** Every one of the 4096 answers, as a compact fingerprint string of 4096 digits 0..7. */
export function answerString(n: Netlist): string {
  let s = "";
  for (let w = 0; w < 4096; w++) s += evalWord(n, w).toString(8);
  return s;
}
