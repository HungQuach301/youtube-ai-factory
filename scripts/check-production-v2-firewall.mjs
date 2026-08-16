import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const roots = ["app/video-engine", "app/api/factory/production-v2", "lib/production-v2-projection.ts", "lib/production-v2-command.ts", "app/production-v2-contract.ts"];
async function files(path) {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => files(join(path, entry.name))))).flat();
}
const sourceFiles = (await Promise.all(roots.map(files))).flat();
const forbidden = [
  /from\s+["'][^"']*(?:material-production|wave9-|v7-)/,
  /(?:SELECT|JOIN|FROM|UPDATE|INSERT\s+INTO)\s+v7_/i,
  /(?:legacy|v5|v6|v7|v23)[/_-](?:asset|material|render|template|binding)/i,
  /app\/api\/projects\/\[id\]\/(?:render|perceptual-qa)/,
];
const failures = [];
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  for (const rule of forbidden) if (rule.test(source)) failures.push(`${file} matches ${rule}`);
}
if (failures.length) {
  console.error("Production Engine V2 legacy dependency firewall failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Production Engine V2 legacy dependency firewall passed ${sourceFiles.length}/${sourceFiles.length} source files.`);
