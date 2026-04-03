import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockRequireBoard,
  mockRedirect,
  mockUsePathname,
  mockUseRouter,
  mockGetDashboardStats,
  mockGetProjects,
  mockGetBusinessProjects,
  mockGetHeartbeatRuns,
  mockGetTeamActivityRuns,
  mockGetEmployees,
  mockGetProjectWorkItems,
  mockGetAgents,
  mockGetAgentCosts,
  mockGetMatches,
  mockGetSourcingResults,
  mockGetResourceGraph,
  mockHasSupabaseCredentials,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRequireBoard: vi.fn(),
  mockRedirect: vi.fn(),
  mockUsePathname: vi.fn(),
  mockUseRouter: vi.fn(),
  mockGetDashboardStats: vi.fn(),
  mockGetProjects: vi.fn(),
  mockGetBusinessProjects: vi.fn(),
  mockGetHeartbeatRuns: vi.fn(),
  mockGetTeamActivityRuns: vi.fn(),
  mockGetEmployees: vi.fn(),
  mockGetProjectWorkItems: vi.fn(),
  mockGetAgents: vi.fn(),
  mockGetAgentCosts: vi.fn(),
  mockGetMatches: vi.fn(),
  mockGetSourcingResults: vi.fn(),
  mockGetResourceGraph: vi.fn(),
  mockHasSupabaseCredentials: vi.fn(),
}));

vi.mock("next/link", async () => {
  const React = await import("react");

  return {
    default: ({
      href,
      children,
      ...props
    }: {
      href: string | { pathname?: string };
      children: unknown;
    }) =>
      React.createElement(
        "a",
        {
          href: typeof href === "string" ? href : href.pathname ?? "#",
          ...props,
        },
        children as ReactNode,
      ),
  };
});

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation",
  );

  return {
    ...actual,
    redirect: mockRedirect,
    usePathname: mockUsePathname,
    useRouter: mockUseRouter,
  };
});

vi.mock("@/components/dashboard/auto-refresh", () => ({
  AutoRefresh: () => null,
}));

vi.mock("@/lib/auth", () => ({
  getSession: mockGetSession,
  requireBoard: mockRequireBoard,
}));

vi.mock("@/lib/paperclip", () => ({
  getDashboardStats: mockGetDashboardStats,
  getProjects: mockGetProjects,
  getBusinessProjects: mockGetBusinessProjects,
  getHeartbeatRuns: mockGetHeartbeatRuns,
  getTeamActivityRuns: mockGetTeamActivityRuns,
  getEmployees: mockGetEmployees,
  getProjectWorkItems: mockGetProjectWorkItems,
  getAgents: mockGetAgents,
  getAgentCosts: mockGetAgentCosts,
  getMatches: mockGetMatches,
  getSourcingResults: mockGetSourcingResults,
}));

vi.mock("@/lib/mimir", () => ({
  getResourceGraph: mockGetResourceGraph,
}));

vi.mock("@/lib/supabase", () => ({
  hasSupabaseCredentials: mockHasSupabaseCredentials,
}));

async function renderAsyncPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: () => Promise<{ default: (props?: any) => unknown }>,
  props?: unknown,
) {
  const { default: Page } = await loader();
  const page = await Page(props);
  return renderToStaticMarkup(page as ReactNode);
}

describe("dashboard phase A coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue(null);
    mockRequireBoard.mockResolvedValue(undefined);
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mockUsePathname.mockReturnValue("/agents");
    mockUseRouter.mockReturnValue({
      refresh: vi.fn(),
    });

    process.env.FEISHU_APP_ID = "app-id";
    process.env.FEISHU_APP_SECRET = "app-secret";
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.NEXTAUTH_URL = "https://ssg.example.com";
    process.env.BOARD_FEISHU_OPEN_IDS = "open-id-1";
    process.env.PAPERCLIP_API_URL = "https://paperclip.example.com";
    process.env.PAPERCLIP_API_KEY = "paperclip-key";
    process.env.PAPERCLIP_COMPANY_ID = "company-id";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "supabase-anon-key";
    process.env.MIMIR_API_URL = "https://mimir.example.com";
    process.env.MIMIR_API_KEY = "mimir-key";
    process.env.MIMIR_USER_ID = "user-1";

    mockGetDashboardStats.mockResolvedValue({
      totalProjects: 2,
      openTasks: 12,
      inProgressTasks: 4,
      agentsOnline: 3,
      agentsTotal: 5,
      runSuccessRate: 91,
      completedTasks: 28,
    });
    mockGetProjects.mockResolvedValue([
      {
        id: "project-1",
        title: "SSG Lab",
      },
    ]);
    mockGetBusinessProjects.mockResolvedValue([
      {
        id: "business-project-1",
        title: "Signal Forge",
        description: "Seed-stage workflow automation for revenue teams.",
        status: "diligence",
        priority: "high",
        assigneeEmployee: "Operator",
        founderName: "Avery Chen",
        companyName: "Signal Forge",
        stage: "Seed",
        daysInStage: 6,
        healthStatus: "on-track",
        lastActivity: "2026-04-01T08:30:00.000Z",
        nextFollowUp: "2026-04-03T08:30:00.000Z",
        tags: ["Workflow", "Revenue"],
      },
    ]);
    mockGetHeartbeatRuns.mockResolvedValue([
      {
        activityAt: "2026-04-01T08:00:00.000Z",
        agentName: "Frontend Engineer",
        summary: "Synced section badge rollout",
        status: "succeeded",
        tokenUsage: 3210,
      },
    ]);
    mockGetTeamActivityRuns.mockResolvedValue([
      {
        activityAt: "2026-04-01T08:00:00.000Z",
        agentName: "Frontend Engineer",
        summary: "Synced section badge rollout",
        status: "succeeded",
        tokenUsage: 3210,
      },
    ]);
    mockGetEmployees.mockResolvedValue([
      {
        id: "frontend",
        name: "Frontend Engineer",
        inputsThisWeek: 6,
        projectsOwned: 1,
      },
    ]);
    mockGetProjectWorkItems.mockResolvedValue([
      {
        identifier: "MIM-480",
        title: "Ship section badge rollout",
        assigneeName: "Frontend Engineer",
        status: "in_progress",
        updatedAt: "2026-04-01T08:00:00.000Z",
      },
      {
        identifier: "MIM-486",
        title: "Review Phase A frontend",
        assigneeName: "Staff Engineer",
        status: "in_review",
        updatedAt: "2026-04-01T07:30:00.000Z",
      },
    ]);
    mockGetAgents.mockResolvedValue([
      {
        name: "Frontend Engineer",
        status: "running",
        lastHeartbeat: "2026-04-01T08:00:00.000Z",
        nextHeartbeat: "2026-04-01T08:10:00.000Z",
        todayRuns: 6,
        tokenUsageToday: 18400,
      },
    ]);
    mockGetAgentCosts.mockResolvedValue([
      {
        agentName: "Frontend Engineer",
        costCents: 821,
        totalTokens: 514000,
      },
    ]);
    mockGetMatches.mockResolvedValue([
      {
        id: "match-1",
        type: "resource",
        confidence: 88,
        status: "accepted",
        createdAt: "2026-04-01T08:00:00.000Z",
        sideA: {
          entity: "Project Atlas",
          description: "Seed-stage workflow automation",
          sourceEmployee: "CTO",
        },
        sideB: {
          entity: "Operator Guild",
          description: "Portfolio talent network",
          sourceEmployee: "Frontend Engineer",
        },
        suggestion: "Introduce Operator Guild for design systems support.",
      },
    ]);
    mockGetSourcingResults.mockResolvedValue([
      {
        id: "candidate-1",
        founderName: "Avery Chen",
        companyName: "Signal Forge",
        domain: "Dev Tools",
        stage: "Seed",
        relevanceScore: 92,
        status: "new",
        matchReason: "Strong operational fit",
        sources: ["Manual review"],
        contactEmail: "avery@example.com",
        contactTwitter: null,
        contactLinkedin: null,
        requestedBy: "CTO",
      },
    ]);
    mockGetResourceGraph.mockResolvedValue({
      source: "live",
      connections: [{ name: "Operator Circle", tags: ["Founder Ops"] }],
      investors: [{ name: "North Star Capital", tags: ["LP"] }],
      programs: [{ name: "Launchpad", tags: ["Acceleration"] }],
      mentors: [{ name: "Iris Tan", tags: ["Growth"] }],
    });
    mockHasSupabaseCredentials.mockReturnValue(true);
  });

  it("renders the overview page with business pipeline data", async () => {
    const html = await renderAsyncPage(() => import("./(dashboard)/page"), {
      searchParams: Promise.resolve({}),
    });

    expect(html).toContain("Portfolio Command");
    expect(html).toContain(
      "Live sourcing, matching, and portfolio signals for the SSG business pipeline.",
    );
    expect(html).toContain("Signal Forge");
    expect(html).toContain("Avery Chen");
    expect(html).toContain("Project Atlas");
    expect(html).not.toContain("Ship section badge rollout");
  });

  it("renders the team page with the renamed automation timeline", async () => {
    const html = await renderAsyncPage(() => import("./(dashboard)/agents/page"));

    expect(html).toContain("Team");
    expect(html).toContain("Automation Timeline (Today)");
    expect(html).toContain("Frontend Engineer");
    expect(html).toContain("Live");
  });

  it("renders the activity page with board-only operating metrics", async () => {
    const html = await renderAsyncPage(
      () => import("./(dashboard)/analytics/page"),
    );

    expect(html).toContain("Activity");
    expect(html).toContain("Automation Success Rate");
    expect(html).toContain("Work Items In Progress");
    expect(html).toContain("Operational numbers shown as reported");
  });

  it("renders live matching suggestions without Paperclip terminology", async () => {
    const html = await renderAsyncPage(
      () => import("./(dashboard)/matching/page"),
    );

    expect(html).toContain("Suggestions Live");
    expect(html).toContain("Project Atlas");
    expect(html).toContain("Operator Guild");
    expect(html).not.toContain("Paperclip");
  });

  it("renders the pipeline page with the fallback workstream deck", async () => {
    mockGetProjects.mockResolvedValue([]);

    const html = await renderAsyncPage(
      () => import("./(dashboard)/pipeline/page"),
    );

    expect(html).toContain("Pipeline");
    expect(html).toContain("Dashboard Integration");
    expect(html).toContain("Latest Signal");
    expect(html).not.toContain("Mimir");
  });

  it("renders the pipeline page from live work-item hierarchy data", async () => {
    mockGetProjectWorkItems.mockResolvedValue([
      {
        id: "root-1",
        identifier: "MIM-478",
        title: "SSG Lab Delivery Root",
        description: "Parent container",
        status: "in_progress",
        priority: "high",
        assigneeName: "CTO",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T09:00:00.000Z",
        startedAt: "2026-04-01T00:00:00.000Z",
        parentId: null,
      },
      {
        id: "phase-a",
        identifier: "MIM-480",
        title: "Phase 1: Frontend polish — branding, coverage",
        description: "Phase A",
        status: "in_progress",
        priority: "high",
        assigneeName: "Frontend Engineer",
        createdAt: "2026-04-01T01:00:00.000Z",
        updatedAt: "2026-04-01T09:30:00.000Z",
        startedAt: "2026-04-01T01:00:00.000Z",
        parentId: "root-1",
      },
      {
        id: "phase-a-task-1",
        identifier: "MIM-486",
        title: "Review Phase A frontend",
        description: "Review task",
        status: "in_review",
        priority: "high",
        assigneeName: "Staff Engineer",
        createdAt: "2026-04-01T02:00:00.000Z",
        updatedAt: "2026-04-01T10:00:00.000Z",
        startedAt: "2026-04-01T02:00:00.000Z",
        parentId: "phase-a",
      },
      {
        id: "phase-a-task-2",
        identifier: "MIM-482",
        title: "Visual QA for Phase A",
        description: "QA task",
        status: "blocked",
        priority: "medium",
        assigneeName: "Design Engineer",
        createdAt: "2026-04-01T02:30:00.000Z",
        updatedAt: "2026-04-01T11:00:00.000Z",
        startedAt: "2026-04-01T02:30:00.000Z",
        parentId: "phase-a",
      },
      {
        id: "phase-b",
        identifier: "MIM-481",
        title: "Phase 2: Component reskin — funnel, density",
        description: "Phase B",
        status: "blocked",
        priority: "medium",
        assigneeName: "Frontend Engineer",
        createdAt: "2026-04-01T03:00:00.000Z",
        updatedAt: "2026-04-01T08:00:00.000Z",
        startedAt: "2026-04-01T03:00:00.000Z",
        parentId: "root-1",
      },
      {
        id: "phase-b-task-1",
        identifier: "MIM-479",
        title: "Design audit for Phase B",
        description: "Design dependency",
        status: "todo",
        priority: "medium",
        assigneeName: "Senior Designer",
        createdAt: "2026-04-01T03:30:00.000Z",
        updatedAt: "2026-04-01T08:15:00.000Z",
        startedAt: "2026-04-01T03:30:00.000Z",
        parentId: "phase-b",
      },
    ]);

    const html = await renderAsyncPage(
      () => import("./(dashboard)/pipeline/page"),
    );

    expect(html).toContain("Frontend polish");
    expect(html).toContain("Resolve SSG-482 before downstream work can move.");
    expect(html).toContain("branding");
    expect(html).toContain("Start SSG-479 when dependencies are clear.");
  });

  it("renders the resource graph sections from the Mimir-backed data source", async () => {
    const html = await renderAsyncPage(
      () => import("./(dashboard)/resources/page"),
    );

    expect(html).toContain("Network Graph");
    expect(html).toContain("Employee Connections");
    expect(html).toContain("LP / Investor Network");
  });

  it("hides developer-facing sourcing setup copy behind a customer-safe empty state", async () => {
    mockHasSupabaseCredentials.mockReturnValue(false);
    mockGetSourcingResults.mockResolvedValue([]);

    const html = await renderAsyncPage(
      () => import("./(dashboard)/sourcing/page"),
    );

    expect(html).toContain("Awaiting first sync");
    expect(html).not.toContain("Supabase");
    expect(html).not.toContain("invented");
  });

  it("hides developer-facing matching setup copy behind a customer-safe empty state", async () => {
    mockHasSupabaseCredentials.mockReturnValue(false);
    mockGetMatches.mockResolvedValue([]);

    const html = await renderAsyncPage(
      () => import("./(dashboard)/matching/page"),
    );

    expect(html).toContain("Awaiting first sync");
    expect(html).not.toContain("Supabase");
    expect(html).not.toContain("synthetic");
  });

  it("keeps internal dev placeholders out of the overview empty state", async () => {
    mockHasSupabaseCredentials.mockReturnValue(false);
    mockGetBusinessProjects.mockResolvedValue([]);
    mockGetSourcingResults.mockResolvedValue([]);
    mockGetMatches.mockResolvedValue([]);

    const html = await renderAsyncPage(() => import("./(dashboard)/page"), {
      searchParams: Promise.resolve({}),
    });

    expect(html).toContain("Awaiting First Sync");
    expect(html).toContain("No sourcing results yet");
    expect(html).not.toContain("Frontend Engineer");
    expect(html).not.toContain("SSG-101");
    expect(html).not.toContain("Dashboard API client");
  });

  it("keeps placeholder resource names out of the rendered resources page", async () => {
    const hiddenTeamName = ["Place", "holder", " — Replace with actual SSG team"].join("");
    const hiddenInvestorName = ["Place", "holder", " LP 1"].join("");
    const hiddenMentorName = ["Place", "holder", " Mentor 1"].join("");

    mockGetResourceGraph.mockResolvedValue({
      source: "seed",
      connections: [
        {
          name: hiddenTeamName,
          tags: ["Founders"],
        },
      ],
      investors: [{ name: hiddenInvestorName, tags: ["AI"] }],
      programs: [{ name: "AWS Activate", tags: ["Cloud Credits"] }],
      mentors: [{ name: hiddenMentorName, tags: ["Go-To-Market"] }],
    });

    const html = await renderAsyncPage(
      () => import("./(dashboard)/resources/page"),
    );

    expect(html).toContain("Connections Pending");
    expect(html).toContain("AWS Activate");
    expect(html).not.toContain(hiddenTeamName);
    expect(html).not.toContain(hiddenInvestorName);
    expect(html).not.toContain(hiddenMentorName);
  });

  it("renders runtime settings from the actual runtime checks", async () => {
    const html = await renderAsyncPage(
      () => import("./(dashboard)/settings/page"),
    );

    expect(html).toContain("Runtime Checks");
    expect(html).toContain("Environment readiness");
    expect(html).toContain("Board Role Mapping");
  });

  it("renders live sourcing results with real candidate records", async () => {
    const html = await renderAsyncPage(
      () => import("./(dashboard)/sourcing/page"),
    );

    expect(html).toContain("Sourcing Results");
    expect(html).toContain("Results Live");
    expect(html).toContain("Avery Chen");
  });
});
