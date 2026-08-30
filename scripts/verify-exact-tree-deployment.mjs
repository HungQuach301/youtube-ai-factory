import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { evaluateExactTreePreparation } from "../lib/deployment-receipt.ts";

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : "";
  if (!value || value.startsWith("--")) throw new Error(`Missing required argument: ${name}`);
  return value;
}

function git(checkout, ...args) {
  const result = spawnSync("git", ["-C", resolve(checkout), ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Git evidence lookup failed: ${args.join(" ")}`);
  return result.stdout.trim().toLowerCase();
}

try {
  const githubCheckout = argument("--github-checkout");
  const sitesCheckout = argument("--sites-checkout");
  const expectedGithubCommit = argument("--github-commit").toLowerCase();
  const githubCommit = git(githubCheckout, "rev-parse", "HEAD^{commit}");
  if (githubCommit !== expectedGithubCommit) throw new Error("GitHub checkout is not at the expected merged commit");
  const result = evaluateExactTreePreparation({
    github_repository: "HungQuach301/youtube-ai-factory",
    github_commit_sha: githubCommit,
    git_tree_sha: git(githubCheckout, "rev-parse", `${githubCommit}^{tree}`),
    sites_source_commit: git(sitesCheckout, "rev-parse", "HEAD^{commit}"),
    sites_source_tree_sha: git(sitesCheckout, "rev-parse", "HEAD^{tree}"),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Exact-tree deployment preparation BLOCKED · ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(1);
}
