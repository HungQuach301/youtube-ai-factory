import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { videoProjects, workflowEvents } from "../../../db/schema";

const allowedStatuses = [
  "OPPORTUNITY_REVIEW",
  "RESEARCHING",
  "SCRIPTING",
  "STORYBOARDING",
] as const;

export async function GET() {
  try {
    const db = getDb();
    const projects = await db
      .select()
      .from(videoProjects)
      .orderBy(desc(videoProjects.opportunityScore));
    return Response.json({ projects });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load projects" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as { id?: string; status?: string };
    if (!payload.id || !payload.status || !allowedStatuses.includes(payload.status as never)) {
      return Response.json({ error: "Valid id and status are required" }, { status: 400 });
    }

    const db = getDb();
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
