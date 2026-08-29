import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url"; import { checkMigrations } from "./lib/candidate-ci-policy.mjs";
console.log(checkMigrations(resolve(dirname(fileURLToPath(import.meta.url)), "..")));
