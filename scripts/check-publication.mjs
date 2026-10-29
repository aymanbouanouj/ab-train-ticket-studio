import { readdir, readFile, lstat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.argv[2] || "dist";
const rules = [
  /[A-Z]:[\\/]+Users[\\/]+/i,
  /[\w.+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /\b(?:gh[pousr]_[a-z0-9]{30,}|github_pat_[a-z0-9_]{50,})\b/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\b(?:sk-(?:proj-)?[a-z0-9_-]{24,}|xox[baprs]-[a-z0-9-]{20,})\b/i,
];
let count = 0;
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const name = relative(root, path).replaceAll("\\", "/");
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`Unexpected link: ${name}`);
    if (/(^|\/)(?:\.git|node_modules|review-artifacts|recovery)(\/|$)|beacons\.png$|\.(?:map|zip|env|pem|key)$/i.test(name))
      throw new Error(`Excluded output: ${name}`);
    if (entry.isDirectory()) await scan(path);
    else {
      const bytes = await readFile(path);
      for (const text of [bytes.toString("utf8"), bytes.toString("utf16le")]) {
        if (rules.some((rule) => rule.test(text)))
          throw new Error(`Privacy pattern in ${name}; value withheld`);
      }
      count++;
    }
  }
}
await scan(root);
console.log(`Publication output check passed: ${count} files; no sensitive patterns or excluded artifacts.`);
