import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url"; import { checkGetWrites } from "./lib/candidate-ci-policy.mjs";
console.log(checkGetWrites(resolve(dirname(fileURLToPath(import.meta.url)), "..")));
