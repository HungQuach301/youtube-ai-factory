import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

export const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
export const PROHIBITED_COMMAND = /^(CERTIFY|APPROVE|ACTIVATE|COMMIT|RELEASE|PUBLISH)_[A-Z0-9_]+$/;
const AUTH_HELPER = /^(authorized(?:Runtime)?|authorize|authenticate|require[A-Za-z0-9]*(?:Auth|Owner|Token|Actor)|assert[A-Za-z0-9]*(?:Auth|Owner|Token|Actor))$/;
const AUTH_PRIMITIVE = /^(secretMatches|timingSafeEqual|verify[A-Za-z0-9]*(?:Token|Signature|Auth)|getRequestContext|getCloudflareContext|getCurrentUser|currentUser)$/;
const ACTOR_GUARD = /^(assertActorSeparation|enforceActorSeparation|requireOwnerAuthority|denyAgentAuthority)$/;
const MUTATING_METHODS = new Set(["insert", "update", "delete", "upsert", "batch", "put"]);
const MUTATING_CALL = /^(seed|bootstrap|materialize|createArtifact|record[A-Za-z0-9]*Receipt|dispatch|reserve|settle|mutate|write|persist|authorizeRecovery|repair|reconcile)/;
const WRITE_SQL = /\b(INSERT\s+INTO|UPDATE\s+[A-Za-z_]|DELETE\s+FROM|REPLACE\s+INTO|CREATE\s+(?:TABLE|INDEX|VIEW|TRIGGER)|ALTER\s+TABLE|DROP\s+(?:TABLE|INDEX|VIEW|TRIGGER)|TRUNCATE\s+TABLE)\b/i;

export function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function filesBelow(root, predicate = () => true) {
  const output = [];
  if (!existsSync(root)) return output;
  for (const name of readdirSync(root).sort()) {
    const candidate = join(root, name);
    if (statSync(candidate).isDirectory()) output.push(...filesBelow(candidate, predicate));
    else if (predicate(candidate)) output.push(candidate);
  }
  return output;
}

function sourceFile(source, path = "fixture.ts") {
  return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function exported(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function callName(node) {
  if (!ts.isCallExpression(node)) return "";
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  return "";
}

function textOf(node, file) {
  return node.getText(file);
}

function visit(node, callback, skipNestedFunctions = false, root = node) {
  if (skipNestedFunctions && node !== root && ts.isFunctionLike(node)) return;
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback, skipNestedFunctions, root));
}

function localFunctions(file) {
  const functions = new Map();
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) functions.set(statement.name.text, statement.body);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) {
          functions.set(declaration.name.text, declaration.initializer.body);
        }
      }
    }
  }
  return functions;
}

export function collectRouteHandlers(source, path = "app/api/example/route.ts") {
  const file = sourceFile(source, path);
  const handlers = [];
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && exported(statement) && statement.name && HTTP_METHODS.has(statement.name.text) && statement.body) {
      handlers.push({ method: statement.name.text, exportName: statement.name.text, body: statement.body, node: statement, file });
    }
    if (ts.isVariableStatement(statement) && exported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !HTTP_METHODS.has(declaration.name.text) || !declaration.initializer) continue;
        if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
          handlers.push({ method: declaration.name.text, exportName: declaration.name.text, body: declaration.initializer.body, node: declaration, file });
        }
      }
    }
  }
  return handlers;
}

export function handlerId(path, method) {
  return `${path.replaceAll(sep, "/")}#${method}`;
}

function routePath(path) {
  return `/${path.replaceAll(sep, "/").replace(/^app\//, "").replace(/\/route\.ts$/, "")}`;
}

function calls(node) {
  const output = [];
  visit(node, (candidate) => { if (ts.isCallExpression(candidate)) output.push(candidate); }, true);
  return output.sort((a, b) => a.getStart() - b.getStart());
}

function denyEvidence(node, file) {
  const text = textOf(node, file);
  return /\b(401|403|UNAUTHORIZED|AUTHORIZATION_REQUIRED|FORBIDDEN)\b/.test(text) && /\b(return|throw)\b/.test(text);
}

function helperAuthEvidence(name, helpers, file, visited = new Set()) {
  if (visited.has(name)) return null;
  visited.add(name);
  const body = helpers.get(name);
  if (!body) return null;
  const helperText = textOf(body, file);
  let primitive = "";
  for (const call of calls(body)) {
    const candidate = callName(call);
    if (AUTH_PRIMITIVE.test(candidate)) { primitive = candidate; break; }
    if (AUTH_HELPER.test(candidate)) {
      const nested = helperAuthEvidence(candidate, helpers, file, visited);
      if (nested) primitive = nested.primitive;
    }
  }
  if (!primitive || !denyEvidence(body, file)) return null;
  const authority = /\b(actor|actorType|owner|expert|automation|FACTORY_EXPERT_EMAILS|[A-Z][A-Z0-9_]*_TOKEN)\b/i.test(helperText);
  return { primitive, authority };
}

function directAuthEvidence(call, handler, helpers) {
  const name = callName(call);
  if (AUTH_HELPER.test(name)) {
    const evidence = helperAuthEvidence(name, helpers, handler.file);
    if (evidence) return { call: name, position: call.getStart(), ...evidence };
  }
  if (AUTH_PRIMITIVE.test(name) && denyEvidence(handler.body, handler.file)) {
    const bodyText = textOf(handler.body, handler.file);
    return { call: name, position: call.getStart(), primitive: name, authority: /\b(actor|owner|expert|automation|[A-Z][A-Z0-9_]*_TOKEN)\b/i.test(bodyText) };
  }
  return null;
}

function directMutationPositions(handler) {
  const positions = [];
  for (const call of calls(handler.body)) {
    const name = callName(call);
    if (MUTATING_METHODS.has(name) || MUTATING_CALL.test(name)) positions.push(call.getStart());
    for (const argument of call.arguments) {
      if ((ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) && WRITE_SQL.test(argument.text)) positions.push(call.getStart());
    }
  }
  return positions.sort((a, b) => a - b);
}

export function analyzeAuthSource(source, path = "app/api/example/route.ts", publicAllowlist = []) {
  const file = sourceFile(source, path);
  const helpers = localFunctions(file);
  const publicIds = new Set(publicAllowlist);
  return collectRouteHandlers(source, path).map((handler) => {
    const id = handlerId(path, handler.method);
    const handlerCalls = calls(handler.body);
    const evidence = handlerCalls.map((call) => directAuthEvidence(call, handler, helpers)).filter(Boolean).sort((a, b) => a.position - b.position);
    const mutations = directMutationPositions(handler);
    const firstGuard = evidence[0];
    const guardBeforeMutation = Boolean(firstGuard) && (!mutations.length || firstGuard.position < mutations[0]);
    const isPublic = publicIds.has(id);
    const classification = isPublic ? (handler.method === "GET" || handler.method === "HEAD" ? "PUBLIC_READ" : "PUBLIC_WRITE_INVALID")
      : path.includes("/callback/") ? "PROVIDER_CALLBACK"
      : evidence.some((item) => item.primitive === "secretMatches") ? "AUTOMATION"
      : handler.method === "GET" || handler.method === "HEAD" ? "OWNER_READ" : "OWNER_WRITE";
    const authenticated = isPublic || guardBeforeMutation;
    const authorized = isPublic || (guardBeforeMutation && (handler.method === "GET" || handler.method === "HEAD" || evidence.some((item) => item.authority)));
    const reasons = [];
    if (!authenticated) reasons.push(firstGuard ? "AUTH_GUARD_AFTER_MUTATION" : "AUTH_GUARD_MISSING");
    if (!["GET", "HEAD"].includes(handler.method) && !authorized) reasons.push("WRITE_AUTHORIZATION_MISSING");
    if (classification === "PUBLIC_WRITE_INVALID") reasons.push("PUBLIC_WRITE_NOT_ALLOWED");
    return {
      identity: id,
      route: routePath(path),
      method: handler.method,
      sourceFile: path.replaceAll(sep, "/"),
      handlerExport: handler.exportName,
      classification,
      authenticationGuard: firstGuard?.call || null,
      authorizationGuard: evidence.find((item) => item.authority)?.call || null,
      covered: reasons.length === 0,
      reasons,
    };
  });
}

function literalWriteEvidence(node, file, owner) {
  const evidence = [];
  visit(node, (candidate) => {
    if (ts.isCallExpression(candidate)) {
      const name = callName(candidate);
      if (MUTATING_METHODS.has(name)) evidence.push(`${owner}:CALL:${name}`);
      else if (MUTATING_CALL.test(name)) evidence.push(`${owner}:CALL:${name}`);
      for (const argument of candidate.arguments) {
        if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument) || ts.isTemplateExpression(argument)) {
          const value = textOf(argument, file);
          const match = value.match(WRITE_SQL);
          if (match) evidence.push(`${owner}:SQL:${match[1].replace(/\s+/g, "_").toUpperCase()}`);
        }
      }
    }
  }, true);
  return [...new Set(evidence)].sort();
}

function reachableWriteEvidence(handler, helpers) {
  const output = new Set(literalWriteEvidence(handler.body, handler.file, handler.method));
  const visited = new Set();
  function follow(node) {
    for (const call of calls(node)) {
      const name = callName(call);
      if (!helpers.has(name) || visited.has(name)) continue;
      visited.add(name);
      const body = helpers.get(name);
      for (const item of literalWriteEvidence(body, handler.file, name)) output.add(item);
      follow(body);
    }
  }
  follow(handler.body);
  return [...output].sort();
}

export function analyzeGetWritesSource(source, path = "app/api/example/route.ts") {
  const file = sourceFile(source, path);
  const helpers = localFunctions(file);
  return collectRouteHandlers(source, path)
    .filter((handler) => handler.method === "GET")
    .map((handler) => ({ identity: handlerId(path, "GET"), evidence: reachableWriteEvidence(handler, helpers) }))
    .filter((entry) => entry.evidence.length);
}

function prohibitedCommands(handler) {
  const output = new Set();
  visit(handler.body, (node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && PROHIBITED_COMMAND.test(node.text)) output.add(node.text);
  }, true);
  return [...output].sort();
}

export function analyzeActorSource(source, path = "app/api/example/route.ts") {
  return collectRouteHandlers(source, path).flatMap((handler) => {
    const commands = prohibitedCommands(handler);
    if (!commands.length) return [];
    const guardCalls = calls(handler.body).filter((call) => ACTOR_GUARD.test(callName(call)));
    const bodyText = textOf(handler.body, handler.file);
    const explicitAgentDeny = /\b(?:actorType|actor\.type|actor)\b[^\n;{}]{0,100}(?:===|==)\s*["']AGENT["'][\s\S]{0,220}\b(?:throw|return)\b/.test(bodyText);
    const separated = guardCalls.length > 0 || explicitAgentDeny;
    return commands.filter(() => !separated).map((command) => ({
      identity: `${handlerId(path, handler.method)}:${command}`,
      handler: handlerId(path, handler.method),
      command,
      reason: "AGENT_DENY_BEFORE_MUTATION_NOT_PROVEN",
    }));
  });
}

export function analyzeRoutes(root) {
  const appApi = join(root, "app", "api");
  const routeFiles = filesBelow(appApi, (path) => path.endsWith(`${sep}route.ts`));
  const publicRegistryPath = join(root, "governance", "registries", "public-routes.json");
  const publicAllowlist = existsSync(publicRegistryPath) ? json(publicRegistryPath).routes.map((route) => route.identity) : [];
  const auth = [], getWrites = [], actor = [], handlers = [];
  for (const absolute of routeFiles) {
    const path = relative(root, absolute).replaceAll(sep, "/");
    const source = readFileSync(absolute, "utf8");
    const authRows = analyzeAuthSource(source, path, publicAllowlist);
    handlers.push(...authRows);
    auth.push(...authRows.filter((row) => !row.covered));
    getWrites.push(...analyzeGetWritesSource(source, path));
    actor.push(...analyzeActorSource(source, path));
  }
  return {
    handlers: handlers.sort((a, b) => a.identity.localeCompare(b.identity)),
    authDebt: auth.sort((a, b) => a.identity.localeCompare(b.identity)),
    getWriteDebt: getWrites.sort((a, b) => a.identity.localeCompare(b.identity)),
    actorDebt: actor.sort((a, b) => a.identity.localeCompare(b.identity)),
  };
}

export function analyzeMigrations(root) {
  const dir = join(root, "drizzle");
  const migrations = filesBelow(dir, (path) => /^\d+_.+\.sql$/.test(path.split(sep).at(-1) || "")).map((absolute) => {
    const path = relative(root, absolute).replaceAll(sep, "/");
    const name = path.split("/").at(-1);
    const match = name.match(/^(\d+)_([^/]+)\.sql$/);
    const content = readFileSync(absolute, "utf8");
    const destructive = [...content.matchAll(/\b(DROP\s+(?:TABLE|INDEX|VIEW|TRIGGER)|TRUNCATE\s+TABLE|ALTER\s+TABLE[\s\S]{0,120}?\bDROP\b|DELETE\s+FROM\s+[A-Za-z0-9_]+\s*;)/gi)].map((item) => item[0].replace(/\s+/g, " ").trim());
    const schemaChange = /\b(CREATE|ALTER|DROP)\s+(TABLE|INDEX|VIEW|TRIGGER)\b/i.test(content);
    const issues = [];
    if (destructive.length && !/MIGRATION_SAFETY:\s*DESTRUCTIVE_REVIEWED/i.test(content)) issues.push("DESTRUCTIVE_REVIEW_MARKER_MISSING");
    if (destructive.length && !/BACKUP_PLAN:\s*\S+/i.test(content)) issues.push("BACKUP_PLAN_MISSING");
    if (schemaChange && !/READ_BACK:\s*\S+/i.test(content)) issues.push("READ_BACK_MISSING");
    return { path, numericId: Number(match[1]), logicalId: match[2], sha256: sha256(content), issues, destructiveStatements: destructive };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const byNumber = new Map();
  for (const migration of migrations) byNumber.set(migration.numericId, [...(byNumber.get(migration.numericId) || []), migration.path]);
  const duplicateDebt = [...byNumber.entries()].filter(([, paths]) => paths.length > 1).map(([numericId, paths]) => ({ identity: `DUPLICATE_NUMERIC_ID:${String(numericId).padStart(4, "0")}:${paths.join("|")}`, numericId, paths })).sort((a, b) => a.identity.localeCompare(b.identity));
  const safetyDebt = migrations.flatMap((migration) => migration.issues.map((issue) => ({ identity: `${migration.path}:${issue}`, path: migration.path, issue }))).sort((a, b) => a.identity.localeCompare(b.identity));
  return { migrations, duplicateDebt, safetyDebt, maxNumericId: Math.max(...migrations.map((item) => item.numericId), -1) };
}

function lineCount(content) {
  if (!content) return 0;
  const rows = content.split(/\r?\n/);
  return rows.at(-1) === "" ? rows.length - 1 : rows.length;
}

export function analyzeDocumentation(root) {
  const candidates = [join(root, "README.md"), join(root, "AGENTS.md"), ...filesBelow(join(root, "docs"), (path) => extname(path) === ".md")];
  return candidates.map((absolute) => {
    const path = relative(root, absolute).replaceAll(sep, "/");
    const content = readFileSync(absolute, "utf8");
    return { path, classification: path.startsWith("docs/archive/") ? "ARCHIVE" : "ACTIVE", maxLines: lineCount(content), maxBytes: Buffer.byteLength(content) };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function sourceCandidates(root) {
  const roots = ["app", "lib", "db", "worker", "scripts"].map((name) => join(root, name));
  return roots.flatMap((directory) => filesBelow(directory, (path) => [".ts", ".tsx", ".js", ".mjs", ".sh"].includes(extname(path))))
    .filter((path) => !relative(root, path).replaceAll(sep, "/").startsWith("scripts/check-") && !relative(root, path).replaceAll(sep, "/").startsWith("scripts/lib/candidate-ci-policy"));
}

function isLegacyPath(path) {
  return path.startsWith("app/api/projects/") || /(^|\/)(production-v2|repair-v51|master-v5)(\/|\.|-)/i.test(path) || /(^|[-_/])legacy([-_/]|\.|$)/i.test(path);
}

export function analyzeLegacy(root) {
  const sources = sourceCandidates(root);
  const routes = [], modules = [], tables = new Set(), tokens = new Set(), dependencies = [];
  for (const absolute of sources) {
    const path = relative(root, absolute).replaceAll(sep, "/");
    const content = readFileSync(absolute, "utf8");
    if (path.endsWith("/route.ts") && isLegacyPath(path)) routes.push(path);
    else if (isLegacyPath(path)) modules.push(path);
    for (const match of content.matchAll(/\b(?:v[0-6]_[a-z][a-z0-9_]*|legacy_[a-z][a-z0-9_]*)\b/gi)) tables.add(match[0]);
    for (const match of content.matchAll(/\b[A-Z][A-Z0-9_]*(?:TOKEN|SHARED_SECRET)\b/g)) tokens.add(match[0]);
    for (const match of content.matchAll(/(?:import[\s\S]*?from\s*|import\s*)["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (isLegacyPath(path) || !/(production-v2|repair-v51|master-v5|legacy)/i.test(specifier)) continue;
      dependencies.push(`${path}->${specifier}`);
    }
  }
  return {
    routes: [...new Set(routes)].sort(),
    modules: [...new Set(modules)].sort(),
    tables: [...tables].sort(),
    tokens: [...tokens].sort(),
    dependencies: [...new Set(dependencies)].sort(),
  };
}

export function runNpmAudit(root) {
  const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (!result.stdout?.trim()) throw new Error(`npm audit did not return JSON: ${result.stderr || `exit ${result.status}`}`);
  const report = JSON.parse(result.stdout);
  const advisories = [];
  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities || {})) {
    for (const via of vulnerability.via || []) {
      if (typeof via === "string") continue;
      advisories.push({
        identity: `${packageName}:${via.source || via.url}`,
        package: packageName,
        source: via.source || null,
        url: via.url || null,
        severity: via.severity,
        title: via.title,
      });
    }
  }
  return { advisories: advisories.sort((a, b) => a.identity.localeCompare(b.identity)), metadata: report.metadata?.vulnerabilities || {} };
}

export function assertSubset(current, baseline, label) {
  const allowed = new Set(baseline.map((item) => typeof item === "string" ? item : item.identity));
  const additions = current.filter((item) => !allowed.has(typeof item === "string" ? item : item.identity));
  if (additions.length) throw new Error(`${label} regression:\n${additions.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("\n")}`);
}

export function checkAuth(root) {
  const baseline = json(join(root, "governance", "baselines", "auth-coverage.json"));
  const analysis = analyzeRoutes(root);
  const publicRegistry = json(join(root, "governance", "registries", "public-routes.json"));
  if (new Set(publicRegistry.routes.map((route) => route.identity)).size !== publicRegistry.routes.length) throw new Error("Public route allowlist contains duplicate identities");
  for (const route of publicRegistry.routes) {
    if (!route.identity.endsWith("#GET") && !route.identity.endsWith("#HEAD")) throw new Error(`Public allowlist contains a write handler: ${route.identity}`);
    if (!analysis.handlers.some((handler) => handler.identity === route.identity)) throw new Error(`Public allowlist contains an unknown handler: ${route.identity}`);
    if (!route.issueRef || !route.rationale) throw new Error(`Public allowlist entry lacks review evidence: ${route.identity}`);
  }
  assertSubset(analysis.authDebt, baseline.uncoveredHandlers, "Auth coverage");
  return `Auth coverage PASS · ${analysis.handlers.length} exported handlers · ${analysis.authDebt.length} exact baseline gaps`;
}

export function checkGetWrites(root) {
  const baseline = json(join(root, "governance", "baselines", "no-write-in-get.json"));
  const current = analyzeRoutes(root).getWriteDebt;
  assertSubset(current, baseline.handlersWithReachableWrites, "GET write");
  return `No-write-in-GET ratchet PASS · ${current.length} exact baseline gaps`;
}

export function checkActor(root) {
  const baseline = json(join(root, "governance", "baselines", "actor-separation.json"));
  const current = analyzeRoutes(root).actorDebt;
  assertSubset(current, baseline.unseparatedCommands, "Actor separation");
  return `Actor separation ratchet PASS · ${current.length} exact baseline command gaps`;
}

export function checkMigrations(root) {
  const baseline = json(join(root, "governance", "baselines", "migration-safety.json"));
  const current = analyzeMigrations(root);
  const currentByPath = new Map(current.migrations.map((item) => [item.path, item]));
  for (const applied of baseline.appliedMigrations) {
    const found = currentByPath.get(applied.path);
    if (!found) throw new Error(`Applied migration deleted: ${applied.path}`);
    if (found.sha256 !== applied.sha256) throw new Error(`Applied migration modified: ${applied.path}`);
  }
  const baselinePaths = new Set(baseline.appliedMigrations.map((item) => item.path));
  const newMigrations = current.migrations.filter((item) => !baselinePaths.has(item.path));
  for (const migration of newMigrations) {
    if (migration.numericId <= baseline.maxNumericId) throw new Error(`New migration is not monotonic: ${migration.path}`);
    if (migration.issues.length) throw new Error(`New migration safety gap: ${migration.path}:${migration.issues.join(",")}`);
  }
  assertSubset(current.duplicateDebt, baseline.duplicateDebt, "Migration duplicate");
  assertSubset(current.safetyDebt, baseline.safetyDebt, "Migration safety");
  const config = readFileSync(join(root, "drizzle.config.ts"), "utf8");
  if (!/out:\s*["']\.\/drizzle["']/.test(config)) throw new Error("Migration build output registry is not ./drizzle");
  return `Migration safety PASS · ${current.migrations.length} immutable applied files · ${current.duplicateDebt.length} duplicate baseline gap · ${current.safetyDebt.length} historical marker gaps`;
}

export function checkGates(root) {
  const registry = json(join(root, "governance", "registries", "production-gates.json"));
  const baseline = json(join(root, "governance", "baselines", "gate-status.json"));
  const validStatuses = new Set(["IMPLEMENTED", "PARTIAL", "NOT_IMPLEMENTED", "DEPRECATED"]);
  const issueText = readFileSync(join(root, "docs", "governance", "AI_FACTORY_ISSUE_REGISTER.md"), "utf8");
  const modelText = readFileSync(join(root, "docs", "architecture", "E2E_PRODUCTION_GATE_MODEL.md"), "utf8");
  const modelGates = [...modelText.matchAll(/^\| ([A-Z][A-Z0-9_]+_GATE) \|/gm)].map((match) => match[1]);
  const ids = registry.gates.map((gate) => gate.id);
  if (new Set(ids).size !== ids.length) throw new Error("Gate registry contains duplicate IDs");
  if (JSON.stringify(ids) !== JSON.stringify(modelGates)) throw new Error("Gate registry does not exactly match canonical gate model order");
  const rank = { NOT_IMPLEMENTED: 0, PARTIAL: 1, IMPLEMENTED: 2, DEPRECATED: 2 };
  const minimum = new Map(baseline.gates.map((gate) => [gate.id, gate.minimumStatus]));
  for (const gate of registry.gates) {
    if (!validStatuses.has(gate.status)) throw new Error(`Invalid gate status: ${gate.id}:${gate.status}`);
    if (!minimum.has(gate.id)) throw new Error(`Unbaselined gate: ${gate.id}`);
    if (rank[gate.status] < rank[minimum.get(gate.id)]) throw new Error(`Gate status regression: ${gate.id}:${minimum.get(gate.id)}->${gate.status}`);
    if (["PARTIAL", "NOT_IMPLEMENTED"].includes(gate.status)) {
      if (!gate.issueRefs?.length) throw new Error(`Gate issue reference missing: ${gate.id}`);
      for (const issue of gate.issueRefs) if (!issueText.includes(`| ${issue} |`)) throw new Error(`Unknown gate issue reference: ${gate.id}:${issue}`);
    }
    if (gate.status === "IMPLEMENTED") {
      for (const field of ["sourceRefs", "positiveTests", "negativeTests", "evidenceRefs"]) if (!gate[field]?.length) throw new Error(`Implemented gate ${gate.id} missing ${field}`);
    }
    if (gate.status === "DEPRECATED" && !gate.replacementGate) throw new Error(`Deprecated gate ${gate.id} has no replacement`);
  }
  return `Gate status PASS · ${registry.gates.length} structured gates · ${registry.gates.filter((gate) => gate.status !== "IMPLEMENTED").length} exact visible gaps`;
}

export function checkDocs(root) {
  const baseline = json(join(root, "governance", "baselines", "docs-growth.json"));
  const current = analyzeDocumentation(root);
  const currentByPath = new Map(current.map((item) => [item.path, item]));
  const baselineByPath = new Map(baseline.documents.map((item) => [item.path, item]));
  const additions = current.filter((item) => !baselineByPath.has(item.path));
  if (additions.length) throw new Error(`Unregistered documentation:\n${additions.map((item) => item.path).join("\n")}`);
  for (const expected of baseline.documents) {
    const found = currentByPath.get(expected.path);
    if (!found) throw new Error(`Canonical/archive documentation removed without registry update: ${expected.path}`);
    if (found.classification !== expected.classification) throw new Error(`Documentation classification changed: ${expected.path}`);
    if (found.maxLines > expected.maxLines || found.maxBytes > expected.maxBytes) throw new Error(`Documentation growth regression: ${expected.path} (${found.maxLines}/${found.maxBytes} > ${expected.maxLines}/${expected.maxBytes})`);
  }
  return `Documentation growth PASS · ${current.filter((item) => item.classification === "ACTIVE").length} active · ${current.filter((item) => item.classification === "ARCHIVE").length} archive exact identities`;
}

export function checkLegacy(root) {
  const baseline = json(join(root, "governance", "baselines", "legacy-shrink.json"));
  const current = analyzeLegacy(root);
  for (const key of ["routes", "modules", "tables", "tokens", "dependencies"]) assertSubset(current[key], baseline[key], `Legacy ${key}`);
  return `Legacy shrink PASS · routes=${current.routes.length} modules=${current.modules.length} tables=${current.tables.length} tokens=${current.tokens.length} dependencies=${current.dependencies.length}`;
}

export function checkDependencyAudit(root) {
  const baseline = json(join(root, "governance", "baselines", "dependency-audit.json"));
  const current = runNpmAudit(root);
  assertSubset(current.advisories, baseline.advisories, "Dependency audit");
  return `Dependency audit ratchet PASS · ${current.advisories.length} exact current advisories`;
}
