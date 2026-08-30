import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "../../../db";
import { channels, videoProjects, workflowEvents } from "../../../db/schema";

type RuntimeEnv = { FACTORY_EXPERT_EMAILS?: string };

const allowedStatuses = [
  "OPPORTUNITY_REVIEW",
  "RESEARCHING",
  "SCRIPTING",
  "STORYBOARDING",
] as const;

async function runtimeEnv() {
  const { env } = await import("cloudflare:workers");
  return env as unknown as RuntimeEnv;
}

async function authorizeWriteAccess() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "SIWC_AUTHENTICATION_REQUIRED" }, { status: 401 });
  const env = await runtimeEnv();
  const owners = new Set(String(env.FACTORY_EXPERT_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
  if (!owners.size) return Response.json({ error: "OWNER_WRITE_ALLOWLIST_UNCONFIGURED" }, { status: 503 });
  if (!owners.has(user.email.trim().toLowerCase())) return Response.json({ error: "OWNER_WRITE_AUTHORIZATION_REQUIRED" }, { status: 403 });
  return { user, env };
}

export async function GET() {
  try {
    const authorization = await authorizeWriteAccess();
    if (authorization instanceof Response) return authorization;
    const db = await getDb();
    let projects = await db
      .select()
      .from(videoProjects)
      .orderBy(desc(videoProjects.opportunityScore));
    if (projects.length === 0) {
      await db.insert(channels).values({
        id: "channel-hidden-systems",
        name: "Hidden Systems Behind Money",
        niche: "Hidden Systems Behind Money",
      }).onConflictDoNothing();
      await db.insert(videoProjects).values([
        { id: "VID-001", channelId: "channel-hidden-systems", title: "What Really Happens When You Swipe a Credit Card", pillar: "Payments & Money Movement", status: "RESEARCHING", opportunityScore: 93, progress: 28, budgetUsd: 45, spentUsd: 6.2, nextAction: "Review source coverage" },
        { id: "VID-002", channelId: "channel-hidden-systems", title: "What Banks Actually See When You Apply for a Loan", pillar: "Credit & Lending", status: "OPPORTUNITY_REVIEW", opportunityScore: 92, progress: 10, budgetUsd: 50, spentUsd: 1.1, nextAction: "Approve opportunity brief" },
        { id: "VID-003", channelId: "channel-hidden-systems", title: "What Happens to Your Money When a Bank Fails", pillar: "Banking Infrastructure", status: "OPPORTUNITY_REVIEW", opportunityScore: 90, progress: 6, budgetUsd: 55, spentUsd: 0.8, nextAction: "Confirm documentary scope" },
      ]).onConflictDoNothing();
      projects = await db.select().from(videoProjects).orderBy(desc(videoProjects.opportunityScore));
    }
    return Response.json({ projects });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeWriteAccess();
    if (authorization instanceof Response) return authorization;
    const payload = (await request.json()) as { title?: string };
    const title = payload.title?.trim();
    if (!title) return Response.json({ error: "title is required" }, { status: 400 });
    const db = await getDb();
    const existing = await db.select({ id: videoProjects.id }).from(videoProjects);
    const id = `VID-${String(existing.length + 1).padStart(3, "0")}`;
    const [project] = await db.insert(videoProjects).values({
      id,
      channelId: "channel-hidden-systems",
      title,
      pillar: "Unassigned",
      status: "OPPORTUNITY_REVIEW",
      progress: 4,
      budgetUsd: 45,
      nextAction: "Run opportunity assessment",
    }).returning();
    await db.insert(workflowEvents).values({
      projectId: id,
      toStatus: "OPPORTUNITY_REVIEW",
      eventType: "PROJECT_CREATED",
      summary: `${id} created from a working topic`,
    });
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create project" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authorization = await authorizeWriteAccess();
    if (authorization instanceof Response) return authorization;
    const payload = (await request.json()) as { id?: string; status?: string };
    if (!payload.id || !payload.status || !allowedStatuses.includes(payload.status as never)) {
      return Response.json({ error: "Valid id and status are required" }, { status: 400 });
    }

    const db = await getDb();
    const [current] = await db
      .select()
      .from(videoProjects)
      .where(eq(videoProjects.id, payload.id))
      .limit(1);
    if (!current) return Response.json({ error: "Project not found" }, { status: 404 });

    const progressByStatus: Record<string, number> = {
      OPPORTUNITY_REVIEW: 10,
      RESEARCHING: 28,
      SCRIPTING: 46,
      STORYBOARDING: 64,
    };

    const [project] = await db
      .update(videoProjects)
      .set({
        status: payload.status,
        progress: progressByStatus[payload.status],
        updatedAt: new Date().toISOString(),
      })
      .where(eq(videoProjects.id, payload.id))
      .returning();

    await db.insert(workflowEvents).values({
      projectId: payload.id,
      fromStatus: current.status,
      toStatus: payload.status,
      eventType: "STATUS_ADVANCED",
      summary: `${payload.id} advanced to ${payload.status}`,
    });

    return Response.json({ project });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update project" },
      { status: 500 },
    );
  }
}
