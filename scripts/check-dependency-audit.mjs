import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url"; import { checkDependencyAudit } from "./lib/candidate-ci-policy.mjs";
console.log(checkDependencyAudit(resolve(dirname(fileURLToPath(import.meta.url)), "..")));
