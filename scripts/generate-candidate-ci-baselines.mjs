import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeDocumentation, analyzeLegacy, analyzeMigrations, analyzeRoutes, runNpmAudit } from "./lib/candidate-ci-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baselineDirectory = join(root, "governance", "baselines");
mkdirSync(baselineDirectory, { recursive: true });
const write = (name, value) => writeFileSync(join(baselineDirectory, name), `${JSON.stringify(value, null, 2)}\n`);
const routes = analyzeRoutes(root);
const migrations = analyzeMigrations(root);

write("auth-coverage.json", { version: 1, identityKey: "sourceFile#exportedHandler", uncoveredHandlers: routes.authDebt });
write("no-write-in-get.json", { version: 1, identityKey: "sourceFile#GET", handlersWithReachableWrites: routes.getWriteDebt });
write("actor-separation.json", { version: 1, identityKey: "sourceFile#handler:command", prohibitedFamilies: ["CERTIFY_*", "APPROVE_*", "ACTIVATE_*", "COMMIT_*", "RELEASE_*", "PUBLISH_*"], unseparatedCommands: routes.actorDebt });
write("migration-safety.json", { version: 1, identityKey: "path+sha256", maxNumericId: migrations.maxNumericId, appliedMigrations: migrations.migrations.map(({ path, numericId, logicalId, sha256 }) => ({ path, numericId, logicalId, sha256 })), duplicateDebt: migrations.duplicateDebt, safetyDebt: migrations.safetyDebt });
write("docs-growth.json", { version: 1, identityKey: "path", policy: "Current lines and bytes are ceilings; exact identities may shrink only through review.", documents: analyzeDocumentation(root) });
write("legacy-shrink.json", { version: 1, identityKey: "exact route/module/table/token/import edge", policy: "Each set may stay equal or shrink; additions fail.", ...analyzeLegacy(root) });
write("dependency-audit.json", { version: 1, identityKey: "package:advisory-source", policy: "Current advisories may disappear; new advisory identities fail.", ...runNpmAudit(root) });
console.log(`Candidate CI baselines generated · handlers=${routes.handlers.length} auth=${routes.authDebt.length} getWrites=${routes.getWriteDebt.length} actor=${routes.actorDebt.length} migrations=${migrations.migrations.length}`);
