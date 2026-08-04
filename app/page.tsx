"use client";

import { useMemo, useState } from "react";

type ProjectStatus =
  | "OPPORTUNITY_REVIEW"
  | "RESEARCHING"
  | "SCRIPTING"
  | "STORYBOARDING";

type Project = {
  id: string;
  title: string;
  pillar: string;
  status: ProjectStatus;
  score: number;
  progress: number;
  budget: number;
  spent: number;
  nextAction: string;
};

const workflow: ProjectStatus[] = [
  "OPPORTUNITY_REVIEW",
  "RESEARCHING",
  "SCRIPTING",
  "STORYBOARDING",
];

const statusLabel: Record<ProjectStatus, string> = {
  OPPORTUNITY_REVIEW: "Opportunity review",
  RESEARCHING: "Researching",
  SCRIPTING: "Scripting",
  STORYBOARDING: "Storyboarding",
};

const initialProjects: Project[] = [
  {
    id: "VID-001",
    title: "What Really Happens When You Swipe a Credit Card",
    pillar: "Payments & Money Movement",
    status: "RESEARCHING",
    score: 93,
    progress: 28,
    budget: 45,
    spent: 6.2,
    nextAction: "Review source coverage",
  },
  {
    id: "VID-002",
    title: "What Banks Actually See When You Apply for a Loan",
    pillar: "Credit & Lending",
    status: "OPPORTUNITY_REVIEW",
    score: 92,
    progress: 10,
    budget: 50,
    spent: 1.1,
    nextAction: "Approve opportunity brief",
  },
  {
    id: "VID-003",
    title: "What Happens to Your Money When a Bank Fails",
    pillar: "Banking Infrastructure",
    status: "OPPORTUNITY_REVIEW",
    score: 90,
    progress: 6,
    budget: 55,
    spent: 0.8,
    nextAction: "Confirm documentary scope",
  },
];

function LogoMark() {
  return (
    <span className="logoMark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function Home() {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedId, setSelectedId] = useState(initialProjects[0].id);
  const [notice, setNotice] = useState("Workflow baseline ready");
  const selected = projects.find((project) => project.id === selectedId)!;

  const totalSpent = useMemo(
    () => projects.reduce((sum, project) => sum + project.spent, 0),
    [projects],
  );

  function advanceProject() {
    setProjects((current) =>
      current.map((project) => {
        if (project.id !== selectedId) return project;
        const currentIndex = workflow.indexOf(project.status);
        const next = workflow[Math.min(currentIndex + 1, workflow.length - 1)];
        return {
          ...project,
          status: next,
          progress: Math.min(project.progress + 18, 76),
          spent: Number((project.spent + 2.4).toFixed(2)),
          nextAction:
            next === "SCRIPTING"
              ? "Inspect first script draft"
              : next === "STORYBOARDING"
                ? "Review scene plan"
                : "Review research pack",
        };
      }),
    );
    setNotice(`${selected.id} advanced with a new workflow event`);
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <LogoMark />
          <div>
            <strong>Frameflow</strong>
            <span>YouTube operations</span>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          <button className="navItem active"><span>⌁</span>Command center</button>
          <button className="navItem"><span>◫</span>Market radar</button>
          <button className="navItem"><span>◇</span>Topic backlog</button>
          <button className="navItem"><span>▦</span>Content calendar</button>
          <button className="navItem"><span>▶</span>Video projects</button>
          <button className="navItem"><span>⌁</span>Analytics</button>
        </nav>

        <div className="sidebarBottom">
          <div className="channelBadge">
            <span className="channelAvatar">HS</span>
            <div><strong>Hidden Systems</strong><span>Behind Money · US</span></div>
          </div>
          <button className="navItem"><span>⚙</span>Workspace settings</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Tuesday, August 4</p>
            <h1>Good evening, Hưng.</h1>
          </div>
          <div className="topActions">
            <span className="systemPulse"><i />All systems ready</span>
            <button className="secondaryButton">View roadmap</button>
            <button className="primaryButton">＋ New video</button>
          </div>
        </header>

        <div className="notice" role="status"><span>✓</span>{notice}</div>

        <section className="metricGrid" aria-label="Workspace metrics">
          <article className="metricCard">
            <span className="metricLabel">Active projects</span>
            <strong>03</strong>
            <small>Three pilot formats</small>
          </article>
          <article className="metricCard">
            <span className="metricLabel">Waiting for you</span>
            <strong className="amber">02</strong>
            <small>Opportunity gates</small>
          </article>
          <article className="metricCard">
            <span className="metricLabel">Pilot budget used</span>
            <strong>${totalSpent.toFixed(2)}</strong>
            <small>of $150 approved</small>
          </article>
          <article className="metricCard accentMetric">
            <span className="metricLabel">Automation coverage</span>
            <strong>68%</strong>
            <small>Walking skeleton target</small>
          </article>
        </section>

        <section className="contentGrid">
          <div className="mainColumn">
            <div className="sectionHeading">
              <div><p className="eyebrow">Pilot slate</p><h2>Video production pipeline</h2></div>
              <button className="textButton">View all projects →</button>
            </div>

            <div className="projectList">
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={`projectCard ${selectedId === project.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(project.id)}
                >
                  <div className="projectTopline">
                    <span className="projectId">{project.id}</span>
                    <span className={`status ${project.status.toLowerCase()}`}>
                      {statusLabel[project.status]}
                    </span>
                    <span className="score">{project.score} opportunity</span>
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.pillar}</p>
                  <div className="progressTrack"><span style={{ width: `${project.progress}%` }} /></div>
                  <div className="projectMeta">
                    <span>{project.progress}% complete</span>
                    <span>${project.spent.toFixed(2)} / ${project.budget}</span>
                  </div>
                </button>
              ))}
            </div>

            <article className="workflowPanel">
              <div className="panelTitle">
                <div><span className="projectId">{selected.id}</span><h2>{selected.title}</h2></div>
                <button className="primaryButton compact" onClick={advanceProject}>Advance workflow</button>
              </div>
              <div className="workflowSteps">
                {workflow.map((step, index) => {
                  const currentIndex = workflow.indexOf(selected.status);
                  const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "future";
                  return (
                    <div className={`workflowStep ${state}`} key={step}>
                      <span>{index < currentIndex ? "✓" : index + 1}</span>
                      <div><strong>{statusLabel[step]}</strong><small>{state === "current" ? selected.nextAction : state === "done" ? "Gate passed" : "Queued"}</small></div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          <aside className="rightRail">
            <article className="railCard gateCard">
              <div className="sectionHeading small"><div><p className="eyebrow">Human gates</p><h2>Needs your decision</h2></div><span className="countBadge">2</span></div>
              <div className="decisionItem">
                <span className="decisionIcon">01</span>
                <div><strong>Approve opportunity brief</strong><p>VID-002 · Loan decisioning</p></div>
                <button aria-label="Open decision">→</button>
              </div>
              <div className="decisionItem">
                <span className="decisionIcon">02</span>
                <div><strong>Confirm documentary scope</strong><p>VID-003 · Bank failure</p></div>
                <button aria-label="Open decision">→</button>
              </div>
            </article>

            <article className="railCard">
              <div className="sectionHeading small"><div><p className="eyebrow">Project health</p><h2>Guardrails</h2></div></div>
              <div className="guardrail"><span>Source coverage</span><strong>82%</strong><i><b style={{ width: "82%" }} /></i></div>
              <div className="guardrail"><span>Budget health</span><strong>94%</strong><i><b style={{ width: "94%" }} /></i></div>
              <div className="guardrail"><span>Originality</span><strong>Pending</strong><i><b className="pendingBar" style={{ width: "34%" }} /></i></div>
            </article>

            <article className="railCard activityCard">
              <div className="sectionHeading small"><div><p className="eyebrow">Workflow events</p><h2>Recent activity</h2></div></div>
              <ul>
                <li><span className="eventDot green"/><div><strong>Research pack started</strong><p>VID-001 · 8 minutes ago</p></div></li>
                <li><span className="eventDot amberDot"/><div><strong>Opportunity gate waiting</strong><p>VID-002 · 24 minutes ago</p></div></li>
                <li><span className="eventDot"/><div><strong>Pilot budget created</strong><p>Workspace · Today</p></div></li>
              </ul>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
