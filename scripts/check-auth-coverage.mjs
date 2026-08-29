import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url"; import { checkAuth } from "./lib/candidate-ci-policy.mjs";
console.log(checkAuth(resolve(dirname(fileURLToPath(import.meta.url)), "..")));
