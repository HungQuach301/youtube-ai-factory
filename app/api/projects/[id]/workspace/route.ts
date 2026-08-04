import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import {
  contentBriefs,
  criticEvaluations,
  researchClaims,
  researchSources,
  scriptVersions,
  videoProjects,
  workflowEvents,
} from "../../../../../db/schema";

const pilotScript = [
  { time: "00:00", label: "Cold open", text: "You tap a card. The terminal says approved. But your money has not moved—not yet. In the next few seconds, at least six companies decide who gets paid, who carries the risk, and who collects a fee." },
  { time: "00:32", label: "The cast", text: "The merchant, payment gateway, acquirer, card network, issuing bank and processor each see a different fragment of the transaction. No single participant owns the whole journey." },
  { time: "02:10", label: "Authorization", text: "The terminal sends an authorization request through the acquiring side and the card network to the bank that issued your card. The bank checks risk and available credit, then returns an approval or decline." },
  { time: "04:18", label: "Clearing & settlement", text: "Approval is only a promise. Later, transactions are batched, reconciled and settled. Fees are distributed and the merchant receives the net amount—not the number printed on your receipt." },
];

const defaultCritics = [
  { type: "Fact critic", score: 91, decision: "PASS", findings: ["Core payment flow is correctly sequenced", "Qualify settlement timing by merchant and processor"] },
  { type: "Story critic", score: 84, decision: "REVISE", findings: ["Strong cold open", "Add a concrete $100 receipt example before 02:00"] },
  { type: "Risk critic", score: 94, decision: "PASS", findings: ["No individualized financial advice", "Avoid implying fees are fixed across every network"] },
  { type: "Originality critic", score: 87, decision: "PASS", findings: ["Transaction-level map is differentiated", "Keep visual metaphor distinct from competitor explainers"] },
];

async function seedWorkspace(projectId: string) {
  const db = await getDb();
  const [brief] = await db.select().from(contentBriefs).where(eq(contentBriefs.projectId, projectId)).limit(1);
  if (brief) return;

  await db.insert(contentBriefs).values({
    projectId,
    targetViewer: "US adults who use cards daily but do not understand the payment rails behind a purchase.",
    centralQuestion: "Where does a card payment actually go after the terminal says approved?",
    viewerPromise: "In eight minutes, see every handoff, decision and fee between the tap and the merchant's bank account.",
    uniqueAngle: "Follow one $100 transaction as a system map, separating authorization from actual money movement.",
    format: "8–10 minute faceless documentary explainer",
    riskNote: "Rates and settlement timing vary. Prefer network and regulator sources; label simplified examples.",
    status: "APPROVED",
  });
  await db.insert(researchSources).values([
    { id: `${projectId}-SRC-01`, projectId, title: "The anatomy of a card transaction", publisher: "Federal Reserve Bank", url: "https://www.federalreserve.gov/", authority: "Primary", freshness: "Evergreen", status: "VERIFIED" },
    { id: `${projectId}-SRC-02`, projectId, title: "How card payment processing works", publisher: "Visa", url: "https://usa.visa.com/", authority: "Network", freshness: "Current", status: "VERIFIED" },
    { id: `${projectId}-SRC-03`, projectId, title: "Merchant processing and interchange overview", publisher: "Consumer Financial Protection Bureau", url: "https://www.consumerfinance.gov/", authority: "Primary", freshness: "Current", status: "VERIFIED" },
    { id: `${projectId}-SRC-04`, projectId, title: "Payment systems reference guide", publisher: "Federal Reserve Financial Services", url: "https://www.frbservices.org/", authority: "Primary", freshness: "Evergreen", status: "VERIFIED" },
  ]).onConflictDoNothing();
  await db.insert(researchClaims).values([
    { id: `${projectId}-CLM-01`, projectId, claimText: "Authorization confirms the issuer's decision; it is not final settlement.", riskLevel: "HIGH", status: "SUPPORTED", sourceCount: 3 },
    { id: `${projectId}-CLM-02`, projectId, claimText: "A typical card transaction passes through the merchant, acquirer, network and issuer.", riskLevel: "MEDIUM", status: "SUPPORTED", sourceCount: 4 },
    { id: `${projectId}-CLM-03`, projectId, claimText: "The merchant generally receives the purchase amount net of processing costs.", riskLevel: "MEDIUM", status: "SUPPORTED", sourceCount: 2 },
    { id: `${projectId}-CLM-04`, projectId, claimText: "Settlement timing and fee allocation vary by agreement, network and transaction type.", riskLevel: "HIGH", status: "NEEDS_QUALIFIER", sourceCount: 2 },
  ]).onConflictDoNothing();
  await db.insert(scriptVersions).values({
    id: `${projectId}-V1`, projectId, version: 1, content: JSON.stringify(pilotScript), status: "IN_REVIEW", criticScore: null,
  }).onConflictDoNothing();
  await db.insert(workflowEvents).values({ projectId, toStatus: "RESEARCHING", eventType: "WORKSPACE_SEEDED", summary: "Opportunity brief, evidence pack and script v1 assembled" });
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = await getDb();
    const [project] = await db.select().from(videoProjects).where(eq(videoProjects.id, id)).limit(1);
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    await seedWorkspace(id);
    const [brief, sources, claims, scripts, critics, events] = await Promise.all([
      db.select().from(contentBriefs).where(eq(contentBriefs.projectId, id)).limit(1),
      db.select().from(researchSources).where(eq(researchSources.projectId, id)),
      db.select().from(researchClaims).where(eq(researchClaims.projectId, id)),
      db.select().from(scriptVersions).where(eq(scriptVersions.projectId, id)).orderBy(desc(scriptVersions.version)),
      db.select().from(criticEvaluations).where(eq(criticEvaluations.projectId, id)).orderBy(desc(criticEvaluations.id)),
      db.select().from(workflowEvents).where(eq(workflowEvents.projectId, id)).orderBy(desc(workflowEvents.id)).limit(12),
    ]);
    return Response.json({ project, brief: brief[0], sources, claims, scripts, critics, events });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load workspace" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { action } = await request.json() as { action?: "RUN_CRITICS" | "CREATE_REVISION" };
    const db = await getDb();
    await seedWorkspace(id);
    const [latest] = await db.select().from(scriptVersions).where(eq(scriptVersions.projectId, id)).orderBy(desc(scriptVersions.version)).limit(1);
    if (!latest) return Response.json({ error: "No script version" }, { status: 409 });

    if (action === "RUN_CRITICS") {
      const existing = await db.select().from(criticEvaluations).where(and(eq(criticEvaluations.projectId, id), eq(criticEvaluations.scriptVersionId, latest.id)));
      if (!existing.length) {
        await db.insert(criticEvaluations).values(defaultCritics.map((critic) => ({
          projectId: id, scriptVersionId: latest.id, criticType: critic.type, score: critic.score, decision: critic.decision, findings: JSON.stringify(critic.findings),
        })));
        const average = Math.round(defaultCritics.reduce((sum, critic) => sum + critic.score, 0) / defaultCritics.length);
        await db.update(scriptVersions).set({ criticScore: average, status: "CHANGES_REQUESTED" }).where(eq(scriptVersions.id, latest.id));
        await db.insert(workflowEvents).values({ projectId: id, toStatus: "SCRIPTING", eventType: "CRITICS_COMPLETED", summary: `Four independent critics scored script v${latest.version}; revision requested` });
      }
      return Response.json({ ok: true });
    }

    if (action === "CREATE_REVISION") {
      const nextVersion = latest.version + 1;
      const content = JSON.parse(latest.content) as Array<{ time: string; label: string; text: string }>;
      const revised = content.map((section, index) => index === 1 ? { ...section, text: `${section.text} On a $100 purchase, the receipt is the customer-facing total; the merchant's eventual net deposit reflects the processing agreement behind it.` } : section);
      await db.insert(scriptVersions).values({ id: `${id}-V${nextVersion}`, projectId: id, version: nextVersion, content: JSON.stringify(revised), status: "DRAFT", criticScore: null });
      await db.insert(workflowEvents).values({ projectId: id, toStatus: "SCRIPTING", eventType: "REVISION_CREATED", summary: `Script v${nextVersion} created from critic findings` });
      return Response.json({ ok: true, version: nextVersion });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update workspace" }, { status: 500 });
  }
}
