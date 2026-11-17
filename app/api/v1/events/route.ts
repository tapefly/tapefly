import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { bad } from "../json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EVENTS = new Set([
  "workshop_view",
  "level_open",
  "part_placed",
  "wire_changed",
  "flight_started",
  "flight_ended",
  "replay_opened",
  "chip_viewed",
  "publish_succeeded",
  "share_created",
  "client_error",
]);
const MAX_BODY = 4_000;
const hits = new Map<string, number[]>();

function dataDir(): string {
  return process.env.WORKSHOP_DATA_DIR ?? path.join(process.cwd(), ".data", "workshop");
}

function rateLimited(who: string, now: number): boolean {
  const recent = (hits.get(who) ?? []).filter((at) => now - at < 60_000);
  if (recent.length >= 120) {
    hits.set(who, recent);
    return true;
  }
  recent.push(now);
  hits.set(who, recent);
  return false;
}

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return bad("body too large", 413);
  let input: { event?: unknown; session?: unknown; route?: unknown; data?: unknown };
  try {
    input = JSON.parse(text);
  } catch {
    return bad("body must be JSON");
  }
  if (typeof input.event !== "string" || !EVENTS.has(input.event)) return bad("unknown event");
  const who = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (rateLimited(who, Date.now())) return bad("rate limited", 429);
  const row = {
    at: new Date().toISOString(),
    event: input.event,
    session: typeof input.session === "string" ? input.session.slice(0, 80) : "anonymous",
    route: typeof input.route === "string" ? input.route.slice(0, 200) : "",
    data: input.data && typeof input.data === "object" ? input.data : {},
  };
  const dir = dataDir();
  mkdirSync(dir, { recursive: true });
  appendFileSync(path.join(dir, "events.jsonl"), JSON.stringify(row) + "\n");
  return new NextResponse(null, { status: 204 });
}
