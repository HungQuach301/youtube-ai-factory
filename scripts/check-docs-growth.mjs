import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url"; import { checkDocs } from "./lib/candidate-ci-policy.mjs";
console.log(checkDocs(resolve(dirname(fileURLToPath(import.meta.url)), "..")));
