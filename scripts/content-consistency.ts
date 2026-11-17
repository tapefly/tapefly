import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const roots = ["README.md", "CONTRIBUTING.md", "CHANGELOG.md", "docs", "app", "public", "deweb-proof"];
const forbidden: { name: string; re: RegExp }[] = [
  { name: "forbidden chain name", re: /\b(?:bnb|binance)\b/i },
  { name: "superseded circuit", re: /(?:circuit|电路)\s*#?\s*1\b/i },
  { name: "stale pending claim", re: /(?:not(?:\s+yet)?\s+taped\s+out|tape-?out(?:\s+on\s+X\s+Layer)?\s+pending|还没在\s*X\s*Layer\s*上流片|尚未在\s*X\s*Layer\s*上流片)/i },
  { name: "stale X Layer launch copy", re: /(?:next\s*:\s*X\s*Layer|下一步是\s*X\s*Layer|deploy\s+on\s+X\s+Layer)/i }
];

function files(path: string): string[] {
  const full = join(root, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

const textExtensions = /\.(?:md|mdx|ts|tsx|js|mjs|html|css|json)$/i;
const failures: string[] = [];

for (const file of roots.flatMap(files).filter((f) => textExtensions.test(f))) {
  const body = readFileSync(file, "utf8");
  body.split("\n").forEach((line, index) => {
    for (const rule of forbidden) {
      if (rule.re.test(line)) failures.push(`${relative(root, file)}:${index + 1}: ${rule.name}: ${line.trim()}`);
    }
  });
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`content consistency: ${roots.length} roots checked`);
