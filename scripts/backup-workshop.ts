import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const source = process.env.WORKSHOP_DATA_DIR ?? path.join(process.cwd(), ".data", "workshop");
const root = process.env.WORKSHOP_BACKUP_DIR ?? path.join(process.cwd(), "backups", "workshop");
const keep = Math.max(1, Number(process.env.WORKSHOP_BACKUP_KEEP) || 30);
if (!existsSync(source)) {
  console.log(`nothing to back up: ${source} does not exist`);
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const target = path.join(root, stamp);
mkdirSync(target, { recursive: true });

const manifest: { file: string; bytes: number; sha256: string }[] = [];
for (const name of readdirSync(source)) {
  if (!name.endsWith(".jsonl")) continue;
  const from = path.join(source, name);
  const to = path.join(target, name);
  copyFileSync(from, to);
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    createReadStream(to).on("data", (chunk) => hash.update(chunk)).on("error", reject).on("end", resolve);
  });
  manifest.push({ file: name, bytes: statSync(to).size, sha256: hash.digest("hex") });
}
writeFileSync(path.join(target, "manifest.json"), JSON.stringify({ source, at: new Date().toISOString(), files: manifest }, null, 2) + "\n");

const snapshots = readdirSync(root).filter((name) => /^\d{8}T\d{6}Z$/.test(name)).sort();
for (const old of snapshots.slice(0, Math.max(0, snapshots.length - keep))) {
  rmSync(path.join(root, old), { recursive: true, force: true });
}
console.log(`backup ${target} · ${manifest.length} files · kept ${Math.min(keep, snapshots.length)} snapshots`);
