/* One design per level that clears it. Tests run these; the game never shows them. */
import type { Design, PlacedPart, Wire } from "./parts";

const P = (id: string, kind: PlacedPart["kind"], x: number, y: number, dir = 0): PlacedPart => ({ id, kind, x, y, dir });
const hb = (to: string): Wire => ({ from: "core", to, inv: false });
const W = (from: string, to: string, inv = false, port?: "set" | "reset"): Wire => ({ from, to, inv, ...(port ? { port } : {}) });

export const WSOLUTIONS: Record<string, Design> = {
  liftoff: { parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0)], wires: [hb("wl"), hb("wr")], modes: {} },
  curve: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("b1", "body", 1, 0), P("wr", "wingL", 2, 0), P("wt", "weight", 1, 1)],
    wires: [hb("wl"), hb("wr")],
    modes: {}
  },
  eyes: {
    parts: [P("core", "core", 0, 0), P("el", "eye", -1, -1, 7), P("b1", "body", 0, -1), P("er", "eye", 1, -1, 1), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0)],
    wires: [{ from: "el", to: "wr", inv: false }, { from: "er", to: "wl", inv: false }],
    modes: {}
  },
  tower: {
    parts: [P("core", "core", 0, 0), P("ram", "weight", 0, -1), P("wl", "wingL", -1, 0), P("wr", "wingL", 1, 0)],
    wires: [hb("wl"), hb("wr")],
    modes: {}
  },
  wall: {
    parts: [P("core", "core", 0, 0), P("b1", "body", 0, -1), P("ant", "antenna", 0, -2, 0), P("er", "eye", 1, -1, 2), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0)],
    wires: [{ from: "ant", to: "wl", inv: true }, { from: "er", to: "wr", inv: true }],
    modes: {}
  },
  spider: {
    parts: [P("core", "core", 0, 0), P("b1", "body", 0, -1), P("hair", "hair", 0, -2, 0), P("el", "eye", -1, -1, 7), P("er", "eye", 1, -1, 1), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0)],
    wires: [{ from: "el", to: "wr", inv: false }, { from: "er", to: "wl", inv: false }, { from: "hair", to: "wl", inv: true }],
    modes: { wl: "all" }
  },
  full: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("m", "mouth", 0, -1), P("M", "memory", 0, 1)],
    wires: [hb("wl"), hb("wr"), W("M", "wl", true), W("M", "wr", true), W("m", "M")],
    modes: { wl: "all", wr: "all" }
  },
  home: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("m", "mouth", 0, 1), P("b", "body", 0, -1), P("n", "nose", 0, -2, 0), P("M", "memory", 0, 2)],
    wires: [hb("wr"), W("M", "wl", true), W("n", "wl"), W("m", "M")],
    modes: {}
  },
  fetch: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("b", "body", 0, -1), P("el", "eye", -1, -1, 7), P("er", "eye", 1, -1, 1), P("n", "nose", 0, -2, 0), P("m", "mouth", 0, 1), P("M", "memory", 0, 2)],
    wires: [W("er", "wl"), W("n", "wl"), W("el", "wr"), W("M", "wr"), W("m", "M")],
    modes: {}
  },
  door2: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("ant", "antenna", -1, -1, 6), P("b", "body", 0, -1), P("ant2", "antenna", 1, -1, 2), P("T", "toggle", 0, 1)],
    wires: [hb("wr"), W("ant", "wl"), W("T", "wl"), W("ant", "T", true)],
    modes: {}
  },
  door3: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("ant", "antenna", -1, -1, 6), P("b", "body", 0, -1), P("ant2", "antenna", 1, -1, 2), P("T1", "toggle", 0, 1), P("T2", "toggle", 0, 2)],
    wires: [hb("wr"), W("ant", "wl"), W("T1", "wl", true), W("T2", "wl"), W("ant", "T1", true), W("T1", "T2")],
    modes: {}
  },
  sprint: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("wl2", "wingS", -2, 0), P("wr2", "wingS", 2, 0)],
    wires: [hb("wl"), hb("wr"), hb("wl2"), hb("wr2")],
    modes: {}
  },
  hunt: {
    parts: [P("core", "core", 0, 0), P("wl", "wingL", -1, 0), P("wr", "wingL", 1, 0), P("b", "body", 0, -1), P("e", "eye", -1, -1, 7)],
    wires: [hb("wl"), W("e", "wr")],
    modes: {}
  },
  tower2: {
    parts: [P("core", "core", 0, 0), P("ram", "weight", 0, -1), P("wl", "wingL", -1, 0), P("wr", "wingL", 1, 0), P("wl2", "wingL", -2, 0), P("wr2", "wingL", 2, 0)],
    wires: [hb("wl"), hb("wr"), hb("wl2"), hb("wr2")],
    modes: {}
  },
  spiders: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("b", "body", 0, -1), P("h0", "hair", -1, -1, 1), P("h1", "hair", 1, -1, 0), P("e", "eye", 2, -1, 6)],
    wires: [W("e", "wl", true), W("h0", "wr", true)],
    modes: { wr: "all" }
  },
  fullsee: {
    parts: [P("core", "core", 0, 0), P("b", "body", 0, -1), P("el", "eye", -1, -1, 7), P("er", "eye", 1, -1, 1), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("m", "mouth", 0, -2), P("M", "memory", 0, 1)],
    wires: [W("er", "wl"), W("el", "wr"), W("M", "wl", true), W("M", "wr", true), W("m", "M")],
    modes: { wl: "all", wr: "all" }
  },
  homehunt: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("b", "body", 0, -1), P("el", "eye", -1, -1, 7), P("er", "eye", 1, -1, 1), P("n", "nose", 0, -2, 0), P("m", "mouth", 0, 1), P("M", "memory", 0, 2)],
    wires: [W("er", "wl"), W("n", "wl"), W("el", "wr"), W("M", "wr"), W("m", "M"), hb("wr")],
    modes: {}
  },
  door4: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("ant", "antenna", -1, -1, 6), P("b", "body", 0, -1), P("ant2", "antenna", 1, -1, 2), P("T1", "toggle", 0, 1), P("T2", "toggle", 0, 2)],
    wires: [hb("wr"), W("ant", "wl"), W("T1", "wl"), W("T2", "wl"), W("ant", "T1", true), W("T1", "T2")],
    modes: {}
  },
  two: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("m", "mouth", 0, -1), P("T", "toggle", 0, 1), P("T2", "toggle", 0, 2)],
    wires: [hb("wl"), hb("wr"), W("T2", "wl", true), W("T2", "wr", true), W("m", "T"), W("T", "T2", true)],
    modes: { wl: "all", wr: "all" }
  },
  glass2: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("c", "clock", 0, 1), P("T", "toggle", 0, 2), P("b", "body", 0, -1)],
    wires: [W("c", "T"), W("T", "wl"), W("T", "wr"), W("c", "wl"), W("c", "wr")],
    modes: { wl: "all", wr: "all" }
  },
  glass: {
    parts: [P("core", "core", 0, 0), P("wl", "wingS", -1, 0), P("wr", "wingS", 1, 0), P("c", "clock", 0, 1), P("b", "body", 0, -1)],
    wires: [W("c", "wl"), W("c", "wr")],
    modes: {}
  }
};
