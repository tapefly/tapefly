import { encodeDesign } from "../sim/workshop/codec";
import { WSOLUTIONS } from "../sim/workshop/solutions";

const base = (process.env.TAPEFLY_BASE ?? "https://tapefly.xyz").replace(/\/$/, "");
const level = process.env.TAPEFLY_LEVEL ?? "liftoff";
const solution = WSOLUTIONS[level];
if (!solution) throw new Error(`no demo solution for ${level}; pass a level with a reference design`);

const discover = await fetch(`${base}/api/v1/workshop`).then((r) => r.json());
console.log(`API: ${discover.version}`);
const levels = await fetch(`${base}/api/v1/workshop/levels`).then((r) => r.json());
console.log(`levels: ${levels.levels.length}`);

const code = encodeDesign(solution);
const evaluated = await fetch(`${base}/api/v1/workshop/evaluate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ level, code }),
}).then((r) => r.json());
console.log(JSON.stringify({
  level,
  cleared: evaluated.cleared,
  submissionReady: evaluated.isSubmissionReady,
  parts: solution.parts.length,
  gates: evaluated.gates,
  seconds: evaluated.seconds,
  problems: evaluated.problems,
}, null, 2));

if (process.argv.includes("--submit")) {
  const submitted = await fetch(`${base}/api/v1/workshop/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, code, name: "API Agent Fly" }),
  }).then((r) => r.json());
  console.log(JSON.stringify({ submitted }, null, 2));
}
