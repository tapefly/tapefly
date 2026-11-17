/* ── sim/workshop/codec.ts ──────────────────────────────────────────────────
   A design as a short text: JSON, base64url. The same code goes in share links,
   in the published gallery and in the global board, so it must decode the same
   way in the browser and on the server, and must refuse anything oversized.
   --------------------------------------------------------------------------- */
import { GRID, PARTS, type Design, type PartKind, type Wire } from "./parts";

/** Hard limits for anything decoded from outside. A real design is far smaller. */
export const LIMITS = { code: 4000, parts: 40, wires: 120, id: 24 };

function toB64url(s: string): string {
  const b = typeof Buffer !== "undefined" ? Buffer.from(s, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(s)));
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(code: string): string {
  const b = code.replace(/-/g, "+").replace(/_/g, "/");
  return typeof Buffer !== "undefined" ? Buffer.from(b, "base64").toString("utf8") : decodeURIComponent(escape(atob(b)));
}

export function encodeDesign(d: Design): string {
  const json = JSON.stringify({
    p: d.parts.map((p) => [p.id, p.kind, p.x, p.y, p.dir]),
    w: d.wires.map((w) => [w.from, w.to, w.inv ? 1 : 0, w.port === "reset" ? 1 : 0]),
    m: d.modes
  });
  return toB64url(json);
}

export function decodeDesign(code: string): Design | null {
  if (typeof code !== "string" || code.length === 0 || code.length > LIMITS.code || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const o = JSON.parse(fromB64url(code));
    if (!Array.isArray(o.p) || !Array.isArray(o.w) || o.p.length > LIMITS.parts || o.w.length > LIMITS.wires) return null;
    const parts = (o.p as unknown[][])
      .filter((p) => Array.isArray(p) && typeof p[1] === "string" && Object.prototype.hasOwnProperty.call(PARTS, p[1]))
      .map(([id, kind, x, y, dir]) => ({ id: String(id).slice(0, LIMITS.id), kind: kind as PartKind, x: Math.trunc(Number(x)), y: Math.trunc(Number(y)), dir: ((Math.trunc(Number(dir)) % 8) + 8) % 8 }));
    if (parts.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.dir) || Math.abs(p.x) > GRID || Math.abs(p.y) > GRID)) return null;
    if (parts.filter((p) => p.kind === "core").length !== 1) return null;
    const ids = new Set(parts.map((p) => p.id));
    if (ids.size !== parts.length) return null;
    const cells = new Set(parts.map((p) => `${p.x},${p.y}`));
    if (cells.size !== parts.length) return null;
    const wires: Wire[] = (o.w as unknown[][])
      .filter((w) => Array.isArray(w) && ids.has(String(w[0])) && ids.has(String(w[1])))
      .map(([from, to, inv, port]) => ({ from: String(from), to: String(to), inv: !!inv, ...(port ? { port: "reset" as const } : {}) }));
    const modes: Design["modes"] = {};
    for (const [k, v] of Object.entries((o.m ?? {}) as Record<string, unknown>)) if (ids.has(k) && (v === "any" || v === "all")) modes[k] = v;
    return { parts, wires, modes };
  } catch {
    return null;
  }
}
