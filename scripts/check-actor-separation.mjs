import { dirname, resolve } from "node:path"; import { fileURLToPath } from "node:url"; import { checkActor } from "./lib/candidate-ci-policy.mjs";
console.log(checkActor(resolve(dirname(fileURLToPath(import.meta.url)), "..")));
