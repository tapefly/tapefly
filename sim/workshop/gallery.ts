/* ── sim/workshop/gallery.ts ────────────────────────────────────────────────
   The workshop layer: published designs, who they were derived from, and each
   level's board. Nothing a player sends is trusted: the server decodes the
   design, re-runs it through the level and keeps only what it measured itself.
   A derived design records its parent but inherits no score.

   Storage is one append-only JSON-lines file. The production server is a single
   Node process (see DEPLOY.md), so appends never interleave.
   --------------------------------------------------------------------------- */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { WLEVELS, type WLevel } from "./levels";
import { decodeDesign, encodeDesign } from "./codec";
import { gradeDesign } from "./game";

export interface Published {
  id: string;
  level: string;
  name: string;
  code: string;
  /** the published design this one was derived from, if any */
  parent: string | null;
  at: string;
  cleared: boolean;
  /** summed over the level's setups, as the game reports it */
  seconds: number;
  gates: number;
  bits: number;
  cost: number;
  parts: number;
}

/** A published design's record on X Layer, accepted only after the server read it back from the chain. */
export interface ChainRecord { id: string; tx: string; from: string; block: number; at: string }

export type PublishResult =
  | { ok: true; record: Published; existed: boolean }
  | { ok: false; error: "level" | "design" | "rules" | "not-cleared" | "rate" | "full" };

export const NAME_MAX = 24;
export const MAX_RECORDS = 50_000;
const RATE = { n: 12, ms: 10 * 60_000 };

export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const s = raw.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  return Array.from(s).slice(0, NAME_MAX).join("");
}

export const levelOf = (id: string): WLevel | undefined => WLEVELS.find((l) => l.id === id);

/** One design on one level always gets the same id, whoever publishes it. */
export function designId(level: string, code: string): string {
  return createHash("sha256").update(`${level}:${code}`).digest("hex").slice(0, 12);
}

/** Board order = the duel ladder: cleared first, then faster, fewer gates, cheaper; ties go to whoever published first. */
export function compareRank(a: Published, b: Published): number {
  return (Number(b.cleared) - Number(a.cleared)) || (a.seconds - b.seconds) || (a.gates - b.gates) || (a.cost - b.cost) || a.at.localeCompare(b.at);
}

export class Gallery {
  private rows: Published[] | null = null;
  private byId = new Map<string, Published>();
  private hiddenIds: Set<string> | null = null;
  private hits = new Map<string, number[]>();
  constructor(private dir: string) {}

  private file() { return join(this.dir, "designs.jsonl"); }

  private load(): Published[] {
    if (this.rows) return this.rows;
    const rows: Published[] = [];
    if (existsSync(this.file())) {
      for (const line of readFileSync(this.file(), "utf8").split("\n")) {
        if (!line.trim()) continue;
        try { const r = JSON.parse(line) as Published; if (!this.byId.has(r.id)) { rows.push(r); this.byId.set(r.id, r); } } catch { /* a torn last line is skipped */ }
      }
    }
    this.rows = rows;
    return rows;
  }

  private moderationFile() { return join(this.dir, "moderation.jsonl"); }
  private moderation(): Set<string> {
    if (this.hiddenIds) return this.hiddenIds;
    const hidden = new Set<string>();
    if (existsSync(this.moderationFile())) {
      for (const line of readFileSync(this.moderationFile(), "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line) as { id?: string; action?: string };
          if (!row.id) continue;
          if (row.action === "hide") hidden.add(row.id);
          if (row.action === "restore") hidden.delete(row.id);
        } catch {}
      }
    }
    this.hiddenIds = hidden;
    return hidden;
  }

  get(id: string): Published | undefined { this.load(); return this.moderation().has(id) ? undefined : this.byId.get(id); }
  getForAdmin(id: string): Published | undefined { this.load(); return this.byId.get(id); }

  /** Newest first. */
  list(level?: string, limit = 60): Published[] {
    const hidden = this.moderation();
    const rows = this.load().filter((r) => !hidden.has(r.id) && (!level || r.level === level));
    return rows.slice().reverse().slice(0, limit);
  }

  search(level: string | undefined, query: string, limit = 60): Published[] {
    const hidden = this.moderation();
    const q = query.trim().toLocaleLowerCase();
    const rows = this.load()
      .filter((r) => !hidden.has(r.id) && (!level || r.level === level))
      .filter((r) => !q || r.name.toLocaleLowerCase().includes(q) || r.id.startsWith(q));
    return rows.slice().reverse().slice(0, limit);
  }

  /** A level's board: cleared designs only, best first. */
  board(level: string, limit = 50): Published[] {
    const hidden = this.moderation();
    return this.load().filter((r) => !hidden.has(r.id) && r.level === level && r.cleared).sort(compareRank).slice(0, limit);
  }

  children(id: string): Published[] { const hidden = this.moderation(); return this.load().filter((r) => !hidden.has(r.id) && r.parent === id); }

  moderate(id: string, action: "hide" | "restore"): boolean {
    this.load();
    if (!this.byId.has(id)) return false;
    mkdirSync(this.dir, { recursive: true });
    appendFileSync(this.moderationFile(), JSON.stringify({ id, action, at: new Date().toISOString() }) + "\n");
    if (action === "hide") this.moderation().add(id); else this.moderation().delete(id);
    return true;
  }

  report(id: string, reason: string, who: string): boolean {
    this.load();
    if (!this.byId.has(id)) return false;
    mkdirSync(this.dir, { recursive: true });
    appendFileSync(join(this.dir, "reports.jsonl"), JSON.stringify({
      id,
      reason: reason.slice(0, 500),
      who,
      at: new Date().toISOString(),
    }) + "\n");
    return true;
  }

  private chain: ChainRecord[] | null = null;
  private chainFile() { return join(this.dir, "chain.jsonl"); }
  chainRecords(id?: string): ChainRecord[] {
    if (!this.chain) {
      this.chain = [];
      if (existsSync(this.chainFile())) for (const line of readFileSync(this.chainFile(), "utf8").split("\n")) { if (!line.trim()) continue; try { this.chain.push(JSON.parse(line)); } catch { /* skip a torn line */ } }
    }
    return id ? this.chain.filter((c) => c.id === id) : this.chain;
  }
  /** Keep a verified record; the same transaction is kept once. */
  addChain(r: ChainRecord): boolean {
    const all = this.chainRecords();
    if (all.some((c) => c.tx.toLowerCase() === r.tx.toLowerCase())) return false;
    mkdirSync(this.dir, { recursive: true });
    appendFileSync(this.chainFile(), JSON.stringify(r) + "\n");
    all.push(r);
    return true;
  }

  private limited(who: string, now: number): boolean {
    const recent = (this.hits.get(who) ?? []).filter((t) => now - t < RATE.ms);
    if (recent.length >= RATE.n) { this.hits.set(who, recent); return true; }
    recent.push(now);
    this.hits.set(who, recent);
    return false;
  }

  publish(input: { level: unknown; code: unknown; name?: unknown; parent?: unknown }, who = "anon", now = Date.now()): PublishResult {
    const level = typeof input.level === "string" ? levelOf(input.level) : undefined;
    if (!level) return { ok: false, error: "level" };
    const design = typeof input.code === "string" ? decodeDesign(input.code) : null;
    if (!design) return { ok: false, error: "design" };
    const code = encodeDesign(design);
    const id = designId(level.id, code);
    const rows = this.load();
    const have = this.byId.get(id);
    if (have) return { ok: true, record: have, existed: true };
    if (rows.length >= MAX_RECORDS) return { ok: false, error: "full" };
    if (this.limited(who, now)) return { ok: false, error: "rate" };
    const g = gradeDesign(level, design);
    if (g.problems.length) return { ok: false, error: "rules" };
    const sandbox = level.goal.kind === "free";
    if (!sandbox && !g.cleared) return { ok: false, error: "not-cleared" };
    const parent = typeof input.parent === "string" && this.byId.has(input.parent) ? input.parent : null;
    const record: Published = {
      id, level: level.id, name: cleanName(input.name), code, parent, at: new Date(now).toISOString(),
      cleared: !sandbox && g.cleared, seconds: Math.round(g.seconds * 100) / 100, gates: g.gates, bits: g.bits, cost: g.cost, parts: design.parts.length
    };
    mkdirSync(this.dir, { recursive: true });
    appendFileSync(this.file(), JSON.stringify(record) + "\n");
    rows.push(record);
    this.byId.set(id, record);
    return { ok: true, record, existed: false };
  }
}

let shared: Gallery | null = null;
/** The server's one gallery. `WORKSHOP_DATA_DIR` moves it; the default sits next to the app. */
export function gallery(): Gallery {
  if (!shared) shared = new Gallery(process.env.WORKSHOP_DATA_DIR ?? join(process.cwd(), ".data", "workshop"));
  return shared;
}
