import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deriveCanonicalPilotManifest } from "../lib/canonical-pilot-manifest.mjs";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/canonical-pilot-manifest.json", import.meta.url), "utf8"));
const units = fixture.units.map((logicalId, index) => ({
  logicalId,
  briefId: `brief-${index + 1}`,
  startSeconds: index * 10,
  contentHash: `hash-${index + 1}`,
}));

test("active release scope is derived from the canonical pilot manifest, not an MP number range", () => {
  const manifest = deriveCanonicalPilotManifest(units, fixture.sealedSet);
  assert.deepEqual(manifest.activeReleaseSet, fixture.activeReleaseSet);
  assert.equal(manifest.activeReleaseSet.includes("MP-005"), false);
  assert.equal(manifest.activeReleaseSet.includes("MP-153"), true);
});

test("canonical manifest rejects duplicate or incomplete release scope", () => {
  assert.throws(() => deriveCanonicalPilotManifest(units.slice(0, 9), fixture.sealedSet), /SIZE_INVALID/);
  assert.throws(() => deriveCanonicalPilotManifest([...units.slice(0, 9), units[0]], fixture.sealedSet), /IDS_INVALID/);
});
