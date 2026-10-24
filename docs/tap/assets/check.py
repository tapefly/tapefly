#!/usr/bin/env python3
"""Check the fly-reflex task assets with no dependencies (MIT).

Decodes the reference netlist (TAP-02 §2: NAND records only), evaluates it on all
4,096 input words with TAP-02 §4 semantics (input i = signal 2 + i, outputs = the
last 3 signals, packed least significant bit first as in TAP-02 §5), and compares
every answer with the truth table. Prints both SHA-256 values and the design cost.
"""
import hashlib, pathlib, sys

here = pathlib.Path(__file__).parent
hexbytes = (here / "ffw-nand-1.hex").read_text().strip()
table = (here / "fly-reflex-truth-table.txt").read_text().rstrip("\n")
raw = bytes.fromhex(hexbytes)
N_IN, N_OUT = 12, 3

assert len(raw) % 7 == 0, "NAND records are 7 bytes"
gates = []
for k in range(0, len(raw), 7):
    assert raw[k] == 0x00, "only NAND records are expected"
    a = int.from_bytes(raw[k + 1:k + 4], "big"); b = int.from_bytes(raw[k + 4:k + 7], "big")
    assert a < 2 + N_IN + len(gates) and b < 2 + N_IN + len(gates), "backward references only"
    gates.append((a, b))

def depth():
    d = [0] * (2 + N_IN)
    for a, b in gates:
        d.append(1 + max(d[a], d[b]))
    return max(d)

def evaluate(w):
    s = [0, 1] + [(w >> i) & 1 for i in range(N_IN)]
    for a, b in gates:
        s.append(1 - (s[a] & s[b]))
    out = s[-N_OUT:]
    return sum(bit << j for j, bit in enumerate(out))

assert len(table) == 4096
bad = [w for w in range(4096) if int(table[w], 8) != evaluate(w)]
g, d = len(gates), depth()
print("gates", g, "depth", d, "cost", g * max(d, 1) ** 3)
print("bytes sha256", hashlib.sha256(raw).hexdigest())
print("table sha256", hashlib.sha256(table.encode()).hexdigest())
print("mismatches", len(bad), bad[:5])
sys.exit(1 if bad else 0)
