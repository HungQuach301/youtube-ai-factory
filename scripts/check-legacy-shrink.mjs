import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url"; import { checkLegacy } from "./lib/candidate-ci-policy.mjs";
console.log(checkLegacy(resolve(dirname(fileURLToPath(import.meta.url)), "..")));
