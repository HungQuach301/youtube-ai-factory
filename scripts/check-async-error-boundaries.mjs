import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function routeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(target);
    return entry.isFile() && entry.name === "route.ts" ? [target] : [];
  });
}

function promiseReturnViolations(sourceFile, checker) {
  const violations = new Map();
  const isPromiseLike = (type) => type.isUnion()
    ? type.types.some(isPromiseLike)
    : Boolean(checker.getPropertyOfType(type, "then"));

  function inspectCaughtBlock(node) {
    if (ts.isFunctionLike(node)) return;
    if (ts.isTryStatement(node)) {
      inspectCaughtBlock(node.tryBlock);
      if (node.finallyBlock) inspectCaughtBlock(node.finallyBlock);
      return;
    }
    if (ts.isReturnStatement(node) && node.expression) {
      let expression = node.expression;
      while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
      const type = checker.getTypeAtLocation(expression);
      if (isPromiseLike(type)) {
        const location = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        violations.set(node.getStart(), {
          line: location.line + 1,
          column: location.character + 1,
          excerpt: node.getText(sourceFile).replace(/\s+/g, " ").slice(0, 180),
        });
      }
    }
    ts.forEachChild(node, inspectCaughtBlock);
  }

  function visit(node) {
    if (ts.isTryStatement(node) && node.catchClause) inspectCaughtBlock(node.tryBlock);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...violations.values()];
}

function fixtureProgram(source) {
  const fileName = path.join(root, "__async_error_boundary_fixture__.ts");
  const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, strict: true };
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (name) => name === fileName || ts.sys.fileExists(name);
  host.readFile = (name) => name === fileName ? source : ts.sys.readFile(name);
  host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) =>
    name === fileName
      ? ts.createSourceFile(name, source, languageVersion, true, ts.ScriptKind.TS)
      : originalGetSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram({ rootNames: [fileName], options, host });
  return { program, sourceFile: program.getSourceFile(fileName) };
}

function verifyDetector() {
  const unsafe = fixtureProgram("async function deferred(){ throw new Error('x') } async function route(){ try { return deferred() } catch { return null } }");
  const safe = fixtureProgram("async function deferred(){ throw new Error('x') } async function route(){ try { return await deferred() } catch { return null } }");
  if (!unsafe.sourceFile || promiseReturnViolations(unsafe.sourceFile, unsafe.program.getTypeChecker()).length !== 1) {
    throw new Error("Async-boundary detector failed to reject the unsafe fixture");
  }
  if (!safe.sourceFile || promiseReturnViolations(safe.sourceFile, safe.program.getTypeChecker()).length !== 0) {
    throw new Error("Async-boundary detector rejected the safe fixture");
  }
}

verifyDetector();

const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const routes = routeFiles(path.join(root, "app", "api"));
const program = ts.createProgram({ rootNames: [...new Set([...parsed.fileNames, ...routes])], options: parsed.options });
const checker = program.getTypeChecker();
const failures = [];

for (const file of routes) {
  const sourceFile = program.getSourceFile(file);
  if (!sourceFile) continue;
  for (const violation of promiseReturnViolations(sourceFile, checker)) failures.push({ file: path.relative(root, file), ...violation });
}

if (failures.length) {
  console.error("Async error-boundary violations found. Await returned Promises inside try/catch so rejections reach the intended catch block:");
  for (const failure of failures) console.error(`- ${failure.file}:${failure.line}:${failure.column} ${failure.excerpt}`);
  process.exit(1);
}

console.log(`Async error-boundary audit passed across ${routes.length} API routes.`);
