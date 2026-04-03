import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireBoard,
  mockGetDashboardStats,
  mockGetHeartbeatRuns,
  mockGetTeamActivityRuns,
  mockGetAgentCosts,
  mockGetAgents,
  mockGetProjects,
  mockGetProjectWorkItems,
} = vi.hoisted(() => ({
  mockRequireBoard: vi.fn(),
  mockGetDashboardStats: vi.fn(),
  mockGetHeartbeatRuns: vi.fn(),
  mockGetTeamActivityRuns: vi.fn(),
  mockGetAgentCosts: vi.fn(),
  mockGetAgents: vi.fn(),
  mockGetProjects: vi.fn(),
  mockGetProjectWorkItems: vi.fn(),
}));

vi.mock("@/components/dashboard/auto-refresh", () => ({
  AutoRefresh: () => null,
}));

vi.mock("@/lib/auth", () => ({
  requireBoard: mockRequireBoard,
}));

vi.mock("@/lib/paperclip", () => ({
  getDashboardStats: mockGetDashboardStats,
  getHeartbeatRuns: mockGetHeartbeatRuns,
  getTeamActivityRuns: mockGetTeamActivityRuns,
  getAgentCosts: mockGetAgentCosts,
  getAgents: mockGetAgents,
  getProjects: mockGetProjects,
  getProjectWorkItems: mockGetProjectWorkItems,
}));

async function renderPage(
  loader: () => Promise<{ default: (props?: unknown) => Promise<unknown> | unknown }>,
  props?: unknown,
) {
  const { default: Page } = await loader();
  const page = await Page(props);
  return renderToStaticMarkup(page as ReactNode);
}

describe("dashboard routes do not leak internal fallback content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireBoard.mockResolvedValue(undefined);
    mockGetDashboardStats.mockRejectedValue(new Error("stats unavailable"));
    mockGetHeartbeatRuns.mockRejectedValue(new Error("runs unavailable"));
    mockGetTeamActivityRuns.mockRejectedValue(new Error("runs unavailable"));
    mockGetAgentCosts.mockRejectedValue(new Error("costs unavailable"));
    mockGetAgents.mockRejectedValue(new Error("agents unavailable"));
    mockGetProjects.mockRejectedValue(new Error("projects unavailable"));
    mockGetProjectWorkItems.mockRejectedValue(
      new Error("work items unavailable"),
    );
  });

  it("renders safe analytics empty states when live metrics are unavailable", async () => {
    const html = await renderPage(() => import("./(dashboard)/analytics/page"));

    expect(html).toContain("Waiting for live activity data");
    expect(html).not.toContain("Frontend Engineer");
    expect(html).not.toContain("QA Engineer");
    expect(html).not.toContain("CTO");
    expect(html).not.toContain("$286.84/mo");
    expect(html).not.toContain("Mar 25");
  });

  it("renders safe pipeline empty states when live workstreams are unavailable", async () => {
    const html = await renderPage(() => import("./(dashboard)/pipeline/page"));

    expect(html).toContain("No live workstreams yet");
    expect(html).not.toContain("SSG-307");
    expect(html).not.toContain("SSG-308");
    expect(html).not.toContain("SSG-318");
    expect(html).not.toContain("Frontend Engineer");
    expect(html).not.toContain("QA Engineer");
    expect(html).not.toContain("CTO");
  });

  it("renders safe team empty states when live agent data is unavailable", async () => {
    const html = await renderPage(() => import("./(dashboard)/agents/page"));

    expect(html).toContain("No agent activity yet");
    expect(html).toContain("No automation runs recorded today");
    expect(html).not.toContain("Frontend Engineer");
    expect(html).not.toContain("QA Engineer");
    expect(html).not.toContain("CTO");
    expect(html).not.toContain("18.4k tokens");
  });
});
