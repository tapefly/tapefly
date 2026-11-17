import { encodeDesign } from "../sim/workshop/codec";
import { WSOLUTIONS } from "../sim/workshop/solutions";

const base = (process.env.TAPEFLY_BASE ?? "https://tapefly.xyz").replace(/\/$/, "");
const level = process.env.TAPEFLY_LEVEL ?? "door3";
const design = WSOLUTIONS[level];
if (!design) throw new Error(`no built-in proof design for ${level}`);

async function main() {
  const discovery = await fetch(`${base}/api/v1/workshop/agent`).then((response) => response.json());
  console.log(`${discovery.version}: ${discovery.task}`);

  const response = await fetch(`${base}/api/v1/workshop/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, code: encodeDesign(design) })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));

  for (const stage of result.stages) console.log(`${stage.status.padEnd(18)} ${stage.id.padEnd(12)} ${stage.detail}`);
  console.log(JSON.stringify({
    level,
    submissionReady: result.evaluation.isSubmissionReady,
    eligible: result.proof.eligible,
    profile: result.proof.profile,
    gates: result.proof.gates,
    stateBits: result.proof.state.length,
    checkedInputs: result.proof.checkedInputs,
    bytesLength: result.proof.bytesLength,
    bytesSha256: result.proof.bytesSha256,
    onchain: result.onchain
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
