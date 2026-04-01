import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function importPaperclipModule() {
  vi.resetModules();
  return import("./paperclip");
}

describe("paperclip live result feeds", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      PAPERCLIP_API_URL: "https://paperclip.test",
      PAPERCLIP_API_KEY: "test-key",
      PAPERCLIP_COMPANY_ID: "company-1",
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("maps sourcing result documents into dashboard candidates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "project-1",
            name: "SSG Lab",
            description: "Dashboard project",
            status: "planned",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "parent-sourcing",
            identifier: "MIM-500",
            title: "Sourcing Results",
            description: "",
            status: "todo",
            priority: "medium",
            createdAt: "2026-03-31T00:00:00Z",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "candidate-1",
            identifier: "MIM-501",
            title: "Sourcing: Acme AI / Alice Chen",
            description: "High-signal founder",
            status: "in_progress",
            priority: "high",
            createdAt: "2026-03-31T10:00:00Z",
            updatedAt: "2026-03-31T10:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse({
          key: "result",
          format: "json",
          body: JSON.stringify({
            founderName: "Alice Chen",
            companyName: "Acme AI",
            domain: "AI Infra",
            stage: "Seed",
            relevanceScore: 92,
            sources: ["GitHub", "X"],
            contactEmail: "alice@acme.ai",
            matchReason: "Strong distribution fit",
            requestedBy: "CTO",
          }),
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getSourcingResults } = await importPaperclipModule();
    const results = await getSourcingResults();

    expect(results).toEqual([
      {
        id: "candidate-1",
        founderName: "Alice Chen",
        companyName: "Acme AI",
        domain: "AI Infra",
        stage: "Seed",
        relevanceScore: 92,
        sources: ["GitHub", "X"],
        contactEmail: "alice@acme.ai",
        contactTwitter: undefined,
        contactLinkedin: undefined,
        matchReason: "Strong distribution fit",
        createdAt: "2026-03-31T10:00:00Z",
        status: "reviewed",
        requestedBy: "CTO",
      },
    ]);
  });

  it("returns an empty sourcing list when no results parent issue exists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "project-1",
            name: "SSG Lab",
            description: "Dashboard project",
            status: "planned",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(jsonResponse([]));

    vi.stubGlobal("fetch", fetchMock);

    const { getSourcingResults } = await importPaperclipModule();
    await expect(getSourcingResults()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns an empty sourcing list when the SSG Lab project is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse([
        {
          id: "project-1",
          name: "Mimir",
          description: "Different project",
          status: "planned",
          updatedAt: "2026-03-31T00:00:00Z",
        },
      ])
    );

    vi.stubGlobal("fetch", fetchMock);

    const { getSourcingResults } = await importPaperclipModule();
    await expect(getSourcingResults()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps and sorts matching results while tolerating mixed document payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "project-1",
            name: "SSG Lab",
            description: "Dashboard project",
            status: "planned",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "parent-matching",
            identifier: "MIM-600",
            title: "Matching Results",
            description: "",
            status: "todo",
            priority: "medium",
            createdAt: "2026-03-31T00:00:00Z",
            updatedAt: "2026-03-31T00:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "match-older",
            identifier: "MIM-601",
            title: "Match: Founder A ↔ Mentor B",
            description: "Older suggestion",
            status: "done",
            priority: "medium",
            createdAt: "2026-03-30T08:00:00Z",
            updatedAt: "2026-03-30T08:00:00Z",
          },
          {
            id: "match-newer",
            identifier: "MIM-602",
            title: "Match: Portfolio Co ↔ LP Partner",
            description: "Newer suggestion",
            status: "todo",
            priority: "medium",
            createdAt: "2026-03-31T12:00:00Z",
            updatedAt: "2026-03-31T12:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse({
          key: "result",
          format: "json",
          body: {
            type: "mentor",
            confidence: 88,
            sideA: {
              entity: "Founder A",
              description: "Seeking guidance",
              sourceEmployee: "Frontend Engineer",
            },
            sideB: {
              entity: "Mentor B",
              description: "GTM advisor",
              sourceEmployee: "CTO",
            },
            suggestion: "Intro recommended this week",
            createdAt: "2026-03-30T08:00:00Z",
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          key: "result",
          format: "json",
          body: JSON.stringify({
            type: "investor",
            confidence: 95,
            sideA: {
              entity: "Portfolio Co",
              description: "Raising bridge round",
              sourceEmployee: "Portfolio Agent",
            },
            sideB: {
              entity: "LP Partner",
              description: "Warm capital source",
              sourceEmployee: "CEO",
            },
            suggestion: "High-priority intro",
            status: "dismissed",
            createdAt: "2026-03-31T12:00:00Z",
          }),
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getMatches } = await importPaperclipModule();
    const results = await getMatches();

    expect(results).toEqual([
      {
        id: "match-newer",
        type: "investor",
        confidence: 95,
        sideA: {
          entity: "Portfolio Co",
          description: "Raising bridge round",
          sourceEmployee: "Portfolio Agent",
        },
        sideB: {
          entity: "LP Partner",
          description: "Warm capital source",
          sourceEmployee: "CEO",
        },
        suggestion: "High-priority intro",
        status: "dismissed",
        createdAt: "2026-03-31T12:00:00Z",
      },
      {
        id: "match-older",
        type: "mentor",
        confidence: 88,
        sideA: {
          entity: "Founder A",
          description: "Seeking guidance",
          sourceEmployee: "Frontend Engineer",
        },
        sideB: {
          entity: "Mentor B",
          description: "GTM advisor",
          sourceEmployee: "CTO",
        },
        suggestion: "Intro recommended this week",
        status: "accepted",
        createdAt: "2026-03-30T08:00:00Z",
      },
    ]);
  });

  it("maps project work items with agent names and parent ids", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "issue-2",
            identifier: "MIM-482",
            title: "Visual QA",
            description: "QA follow-up",
            status: "blocked",
            priority: "medium",
            assigneeAgentId: "agent-2",
            createdAt: "2026-04-01T01:00:00Z",
            updatedAt: "2026-04-01T11:00:00Z",
            startedAt: "2026-04-01T02:00:00Z",
            parentId: "issue-1",
          },
          {
            id: "issue-1",
            identifier: "MIM-480",
            title: "Phase A",
            description: "Frontend work",
            status: "in_progress",
            priority: "high",
            assigneeAgentId: "agent-1",
            createdAt: "2026-04-01T00:00:00Z",
            updatedAt: "2026-04-01T10:00:00Z",
            startedAt: "2026-04-01T00:30:00Z",
            parentId: null,
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "agent-1",
            name: "Frontend Engineer",
            role: "engineer",
            status: "running",
          },
          {
            id: "agent-2",
            name: "Design Engineer",
            role: "engineer",
            status: "idle",
          },
        ])
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getProjectWorkItems } = await importPaperclipModule();
    const items = await getProjectWorkItems("project-1");

    expect(items).toEqual([
      {
        id: "issue-2",
        identifier: "MIM-482",
        title: "Visual QA",
        description: "QA follow-up",
        status: "blocked",
        priority: "medium",
        assigneeName: "Design Engineer",
        createdAt: "2026-04-01T01:00:00Z",
        updatedAt: "2026-04-01T11:00:00Z",
        startedAt: "2026-04-01T02:00:00Z",
        parentId: "issue-1",
      },
      {
        id: "issue-1",
        identifier: "MIM-480",
        title: "Phase A",
        description: "Frontend work",
        status: "in_progress",
        priority: "high",
        assigneeName: "Frontend Engineer",
        createdAt: "2026-04-01T00:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
        startedAt: "2026-04-01T00:30:00Z",
        parentId: null,
      },
    ]);
  });

  it("maps heartbeat runs with summaries, token usage, and activity fallback", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "run-1",
            agentId: "agent-1",
            status: "running",
            createdAt: "2026-04-01T10:00:00Z",
            updatedAt: "2026-04-01T10:01:00Z",
            usageJson: { inputTokens: 100, outputTokens: 25 },
          },
          {
            id: "run-2",
            agentId: "agent-2",
            status: "failed",
            startedAt: "2026-04-01T09:00:00Z",
            finishedAt: "2026-04-01T09:05:00Z",
            error: "Network timeout\nstack",
            usageJson: { inputTokens: 50, outputTokens: 10 },
          },
          {
            id: "run-3",
            agentId: "agent-1",
            status: "succeeded",
            startedAt: "2026-04-01T11:00:00Z",
            finishedAt: "2026-04-01T11:02:00Z",
            resultJson: { result: "Synced dashboard copy\nextra" },
            usageJson: { inputTokens: 200, outputTokens: 40 },
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "agent-1",
            name: "Frontend Engineer",
            role: "engineer",
            status: "running",
          },
          {
            id: "agent-2",
            name: "QA Engineer",
            role: "engineer",
            status: "idle",
          },
        ])
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getHeartbeatRuns } = await importPaperclipModule();
    const runs = await getHeartbeatRuns(10);

    expect(runs).toEqual([
      {
        id: "run-3",
        agentId: "agent-1",
        agentName: "Frontend Engineer",
        status: "succeeded",
        startedAt: "2026-04-01T11:00:00Z",
        activityAt: "2026-04-01T11:00:00Z",
        completedAt: "2026-04-01T11:02:00Z",
        summary: "Synced dashboard copy",
        tokenUsage: 240,
      },
      {
        id: "run-1",
        agentId: "agent-1",
        agentName: "Frontend Engineer",
        status: "running",
        startedAt: undefined,
        activityAt: "2026-04-01T10:00:00Z",
        completedAt: undefined,
        summary: "Heartbeat in progress",
        tokenUsage: 125,
      },
      {
        id: "run-2",
        agentId: "agent-2",
        agentName: "QA Engineer",
        status: "failed",
        startedAt: "2026-04-01T09:00:00Z",
        activityAt: "2026-04-01T09:00:00Z",
        completedAt: "2026-04-01T09:05:00Z",
        summary: "Network timeout",
        tokenUsage: 60,
      },
    ]);
  });

  it("maps projects into dashboard project cards with priority and health", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse([
        {
          id: "project-1",
          name: "SSG Lab",
          description: "Dashboard project",
          status: "planned",
          targetDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
          updatedAt: "2026-04-01T12:00:00Z",
          goals: [{ title: "Commercial Delivery" }],
        },
        {
          id: "project-2",
          name: "Archived Ops",
          description: "Historical",
          status: "done",
          targetDate: null,
          updatedAt: "2026-03-25T12:00:00Z",
          goals: [],
        },
      ])
    );

    vi.stubGlobal("fetch", fetchMock);

    const { getProjects } = await importPaperclipModule();
    const projects = await getProjects();

    expect(projects[0]).toMatchObject({
      id: "project-1",
      title: "SSG Lab",
      status: "contact",
      priority: "critical",
      healthStatus: "needs-attention",
      tags: ["Commercial Delivery"],
    });
    expect(projects[1]).toMatchObject({
      id: "project-2",
      title: "Archived Ops",
      status: "exit",
      priority: "medium",
      healthStatus: "on-track",
    });
  });

  it("builds dashboard stats from company totals and completed runs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          agents: { active: 2, running: 1, paused: 0, error: 0 },
          tasks: { open: 5, inProgress: 2, blocked: 1, done: 9 },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "project-1",
            name: "SSG Lab",
            description: "Dashboard project",
            status: "planned",
            updatedAt: "2026-04-01T12:00:00Z",
          },
          {
            id: "project-2",
            name: "Second Project",
            description: "Another project",
            status: "in_progress",
            updatedAt: "2026-04-01T13:00:00Z",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "run-1",
            agentId: "agent-1",
            status: "succeeded",
            startedAt: "2026-04-01T10:00:00Z",
            finishedAt: "2026-04-01T10:01:00Z",
            usageJson: { inputTokens: 10, outputTokens: 5 },
          },
          {
            id: "run-2",
            agentId: "agent-2",
            status: "failed",
            startedAt: "2026-04-01T09:00:00Z",
            finishedAt: "2026-04-01T09:01:00Z",
            usageJson: { inputTokens: 10, outputTokens: 5 },
          },
          {
            id: "run-3",
            agentId: "agent-1",
            status: "running",
            createdAt: "2026-04-01T11:00:00Z",
            usageJson: { inputTokens: 10, outputTokens: 5 },
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "agent-1",
            name: "Frontend Engineer",
            role: "engineer",
            status: "running",
          },
          {
            id: "agent-2",
            name: "QA Engineer",
            role: "engineer",
            status: "idle",
          },
        ])
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getDashboardStats } = await importPaperclipModule();
    const stats = await getDashboardStats();

    expect(stats).toEqual({
      totalProjects: 2,
      openTasks: 5,
      inProgressTasks: 2,
      agentsOnline: 1,
      agentsTotal: 2,
      runSuccessRate: 50,
      completedTasks: 9,
    });
  });

  it("maps agents with next-heartbeat and monthly usage totals", async () => {
    const now = new Date();
    const currentRunStartedAt = new Date(now.getTime() - 5 * 60_000).toISOString();
    const oldRunStartedAt = new Date(now.getTime() - 2 * 86_400_000).toISOString();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "agent-1",
            name: "Frontend Engineer",
            role: "engineer",
            title: "Frontend Engineer",
            status: "running",
            lastHeartbeatAt: currentRunStartedAt,
            runtimeConfig: { heartbeat: { intervalSec: 600 } },
          },
          {
            id: "agent-2",
            name: "QA Engineer",
            role: "engineer",
            title: "QA Engineer",
            status: "idle",
            lastHeartbeatAt: oldRunStartedAt,
            runtimeConfig: { heartbeat: { intervalSec: 1200 } },
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "run-1",
            agentId: "agent-1",
            status: "succeeded",
            startedAt: currentRunStartedAt,
            finishedAt: new Date(now.getTime() - 4 * 60_000).toISOString(),
            usageJson: { inputTokens: 120, outputTokens: 30 },
          },
          {
            id: "run-2",
            agentId: "agent-2",
            status: "succeeded",
            startedAt: oldRunStartedAt,
            finishedAt: new Date(now.getTime() - 2 * 86_400_000 + 60_000).toISOString(),
            usageJson: { inputTokens: 80, outputTokens: 20 },
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "agent-1",
            name: "Frontend Engineer",
            role: "engineer",
            status: "running",
          },
          {
            id: "agent-2",
            name: "QA Engineer",
            role: "engineer",
            status: "idle",
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            agentId: "agent-1",
            agentName: "Frontend Engineer",
            agentStatus: "running",
            costCents: 821,
            inputTokens: 1000,
            outputTokens: 500,
            subscriptionRunCount: 7,
          },
          {
            agentId: "agent-2",
            agentName: "QA Engineer",
            agentStatus: "idle",
            costCents: 210,
            inputTokens: 600,
            outputTokens: 200,
            subscriptionRunCount: 4,
          },
        ])
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getAgents } = await importPaperclipModule();
    const agents = await getAgents();

    expect(agents[0]).toMatchObject({
      id: "agent-1",
      name: "Frontend Engineer",
      status: "running",
      todayRuns: 1,
      tokenUsageToday: 150,
      monthlyRunCount: 7,
    });
    expect(agents[0]?.nextHeartbeat).toBe(
      new Date(new Date(currentRunStartedAt).getTime() + 600_000).toISOString()
    );
    expect(agents[1]).toMatchObject({
      id: "agent-2",
      name: "QA Engineer",
      status: "idle",
      monthlyRunCount: 4,
    });
  });
});
