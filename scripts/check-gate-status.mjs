import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url"; import { checkGates } from "./lib/candidate-ci-policy.mjs";
console.log(checkGates(resolve(dirname(fileURLToPath(import.meta.url)), "..")));
