import test from "node:test";
import assert from "node:assert/strict";
import { CONTROLLED_RELEASE_POLICY, evaluateControlledRelease } from "../lib/controlled-release-policy.mjs";

const other = { factualSafety: 90, composition: 90, mobileLegibility: 90, authenticity: 90 };

test("controlled policy keeps the approved exact thresholds", () => {
  assert.equal(CONTROLLED_RELEASE_POLICY.controlledOverall, 88);
  assert.equal(CONTROLLED_RELEASE_POLICY.controlledSemanticFit, 82);
  assert.equal(CONTROLLED_RELEASE_POLICY.controlledOtherDimension, 88);
  assert.equal(CONTROLLED_RELEASE_POLICY.controlledQaSampleRate, 0.25);
});

test("88 with semantic 82 and one presentation P1 enters controlled release", () => {
  const result = evaluateControlledRelease({ overall: 88, dimensions: { semanticFit: 82, ...other }, defects: [{ severity: "P1", category: "PRESENTATION" }] });
  assert.equal(result.tier, "CONTROLLED");
  assert.equal(result.pass, true);
});

test("semantic P1 blocks even when scores pass", () => {
  const result = evaluateControlledRelease({ overall: 91, dimensions: { semanticFit: 90, ...other }, defects: [{ severity: "P1", category: "SEMANTIC" }] });
  assert.equal(result.tier, "BLOCKED");
  assert.equal(result.pass, false);
});

test("MP-002 request 85 remains blocked at 84 overall and 68 semantic fit", () => {
  const result = evaluateControlledRelease({ overall: 84, dimensions: { semanticFit: 68, factualSafety: 96, composition: 91, mobileLegibility: 93, authenticity: 92 }, defects: [] });
  assert.equal(result.tier, "BLOCKED");
  assert.equal(result.pass, false);
});

test("two presentation P1 defects block controlled release", () => {
  const result = evaluateControlledRelease({ overall: 90, dimensions: { semanticFit: 88, ...other }, defects: [{ severity: "P1", category: "PRESENTATION" }, { severity: "P1", category: "PRESENTATION" }] });
  assert.equal(result.tier, "BLOCKED");
  assert.equal(result.pass, false);
});
