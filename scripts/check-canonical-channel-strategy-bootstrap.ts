import assert from "node:assert/strict";
import { compileCanonicalNicheOpportunities } from "../lib/canonical-channel-strategy-bootstrap";

const audience = (segment: string) => ({ segment, tension: `${segment} repeatedly encounters an opaque financial decision with material consequences.`, trigger: `A recurring ${segment} decision exposes hidden institutional dependencies.`, desiredPayoff: `A durable system map for ${segment} without individualized advice.` });
const cluster = (name: string) => ({ name, demandSignal: `${name} has recurring demand supported by canonical primary evidence.`, competitionGap: `${name} is underserved by evidence-led institutional documentaries.`, monetizationFit: `${name} supports sponsor-safe education categories.`, visualPotential: `${name} can be mapped as an institutional chain.` });
const stage01 = {
  channelThesis: "Reveal the invisible institutions behind ordinary financial life.",
  targetMarket: "United States viewers ages 18–64",
  targetLanguage: "US English",
  audienceSegments: [audience("Cost-Squeezed System Seekers"), audience("Young Credit Navigators"), audience("Home Equity Defenders"), audience("Retirement Autopilot Skeptics")],
  topicClusters: [cluster("Invisible Price Architecture"), cluster("Payment Rails and Retail Tollbooths"), cluster("Credit, Debt, and Reputation Machines"), cluster("Housing’s Hidden Financial Stack"), cluster("Retirement Defaults and Fee Machinery"), cluster("Friction, Fraud, and Forgotten Value")],
  candidates: Array.from({ length: 17 }, (_, index) => ({ id: `video-topic-${index + 1}`, title: `Legacy topic ${index + 1}` })),
};

const opportunities = compileCanonicalNicheOpportunities(stage01);
assert.equal(opportunities.length, 3);
assert.deepEqual(opportunities.map((item) => item.candidate.entityType), ["NICHE_OPPORTUNITY", "NICHE_OPPORTUNITY", "NICHE_OPPORTUNITY"]);
assert.ok(opportunities.every((item) => item.candidate.origin === "SYSTEM_DISCOVERED"));
assert.ok(opportunities.every((item) => !stage01.candidates.some((topic) => topic.id === item.id)));
assert.equal(opportunities.filter((item) => item.evidence.length >= 5).length, 2);
assert.ok(opportunities.slice(0, 2).every((item) => new Set(item.evidence.map((evidence) => evidence.direction)).size === 3));
assert.ok(opportunities.slice(0, 2).every((item) => item.evidence.some((evidence) => evidence.sourceAuthority === "PRIMARY")));
assert.equal(opportunities[0].candidate.title, "Everyday Payment and Pricing Infrastructure");
assert.deepEqual(opportunities[0].score, { marketAttractiveness: 92, abilityToWin: 90, evidenceConfidence: 94 });

console.log("Canonical Channel Strategy bootstrap contract passed: 3 typed niches, 2 balanced evidence-ready candidates, zero legacy-topic promotion and separate three-axis scores.");
