import { ok } from "../json";
import { PARTS } from "@/sim/workshop/parts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return ok({
    version: "TAPEFLY-WORKSHOP-API/1",
    game: "TapeFly Workshop",
    profiles: ["TAPEFLY-WORKSHOP/2"],
    design: {
      description: "A grid design is a core plus connected parts and directed wires.",
      code: "base64url JSON accepted by /evaluate and /submit",
      limits: { parts: 40, wires: 120, grid: "x/y in [-4,4]" },
      partKinds: Object.keys(PARTS),
    },
    endpoints: {
      levels: "GET /api/v1/workshop/levels",
      agent: "GET|POST /api/v1/workshop/agent",
      evaluate: "POST /api/v1/workshop/evaluate {level, code}",
      seal: "POST /api/v1/workshop/seal {level, code}",
      submit: "POST /api/v1/workshop/submit {level, code, name?, parent?}",
      designs: "GET /api/v1/workshop/designs?level=ID&limit=60",
      design: "GET /api/v1/workshop/designs/:id",
      board: "GET /api/v1/workshop/board?level=ID",
    },
    guarantees: [
      "The server decodes and re-runs submitted designs.",
      "Stored scores are measured by the server, never trusted from the client.",
      "The same level, design and version produce the same physics result.",
      "A design is tape-out eligible only after every input and state transition is checked.",
    ],
  });
}
