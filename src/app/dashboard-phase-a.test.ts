import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageData } from "@/components/dynamic-page/types";

const {
  mockGetSession,
  mockGetPageData,
  mockGetProject,
  mockGetAllProjectIds,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetPageData: vi.fn(),
  mockGetProject: vi.fn(),
  mockGetAllProjectIds: vi.fn(),
}));

vi.mock("next/link", async () => {
  const React = await import("react");

  return {
    default: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children: ReactNode;
      [key: string]: unknown;
    }) => React.createElement("a", { href, ...props }, children),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/"),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/dashboard/auto-refresh", () => ({
  AutoRefresh: () => null,
}));

vi.mock("@/lib/auth", () => ({
  requireSession: mockGetSession,
  requireBoard: vi.fn(),
}));

vi.mock("@/lib/pages", () => ({
  getPageData: mockGetPageData,
}));

vi.mock("@/lib/projects", () => ({
  getProject: mockGetProject,
  getAllProjectIds: mockGetAllProjectIds,
  ProjectData: {},
}));

async function renderPage(
  loader: () => Promise<{ default: (props?: unknown) => Promise<unknown> | unknown }>,
  props?: unknown,
) {
  const { default: Page } = await loader();
  const page = await Page(props);
  return renderToStaticMarkup(page as ReactNode);
}

const OVERVIEW_DATA: PageData = {
  page: "overview",
  title: "Overview",
  subtitle: "Live sourcing, matching, and portfolio signals.",
  eyebrow: "Portfolio Command",
  generated_at: "2026-04-06T02:30:00Z",
  blocks: [
    {
      type: "stat-grid",
      items: [
        { label: "Portfolio Companies", value: 1, trend: "1 active", icon: "briefcase" },
      ],
    },
    {
      type: "alert",
      severity: "green",
      title: "Pipeline active — Regressor",
    },
    {
      type: "link-grid",
      items: [
        { label: "Pipeline", description: "View kanban", href: "/pipeline" },
      ],
    },
  ],
};

const PIPELINE_DATA: PageData = {
  page: "pipeline",
  title: "Pipeline",
  subtitle: "Investment pipeline board.",
  eyebrow: "Deal Flow",
  generated_at: "2026-04-06T02:30:00Z",
  blocks: [
    {
      type: "kanban",
      columns: [
        { title: "Invested", color: "#64feba", items: [{ id: "regressor", title: "Regressor", subtitle: "AI infra" }] },
      ],
    },
  ],
};

const SOURCING_DATA: PageData = {
  page: "sourcing",
  title: "Sourcing",
  subtitle: "Intelligence feed.",
  eyebrow: "Deal Sourcing",
  generated_at: "2026-04-06T02:30:00Z",
  blocks: [
    {
      type: "card-list",
      items: [
        { title: "Regressor", subtitle: "Sourced by 韩磊", description: "AI infra" },
      ],
    },
  ],
};

const MATCHING_DATA: PageData = {
  page: "matching",
  title: "Matching",
  subtitle: "Resource matching suggestions.",
  eyebrow: "Match Engine",
  generated_at: "2026-04-06T02:30:00Z",
  blocks: [
    {
      type: "alert",
      severity: "blue",
      title: "Matching engine warming up",
    },
  ],
};

const AGENTS_DATA: PageData = {
  page: "agents",
  title: "Team",
  subtitle: "AI agent team status.",
  eyebrow: "Agent Fleet",
  generated_at: "2026-04-06T02:30:00Z",
  blocks: [
    {
      type: "card-list",
      items: [
        { title: "CEO Agent", subtitle: "Role: CEO" },
        { title: "Dashboard Agent", subtitle: "Role: Engineer" },
      ],
    },
  ],
};

const ANALYTICS_DATA: PageData = {
  page: "analytics",
  title: "Analytics",
  subtitle: "Pipeline metrics.",
  eyebrow: "Insights",
  generated_at: "2026-04-06T02:30:00Z",
  blocks: [
    {
      type: "stat-grid",
      items: [
        { label: "Pipeline Companies", value: 1, icon: "briefcase" },
      ],
    },
  ],
};

const RESOURCES_DATA: PageData = {
  page: "resources",
  title: "Resources",
  subtitle: "Network and infrastructure.",
  eyebrow: "Infrastructure",
  generated_at: "2026-04-06T02:30:00Z",
  blocks: [
    {
      type: "table",
      columns: [
        { key: "component", label: "Component" },
        { key: "tech", label: "Technology" },
      ],
      rows: [
        { component: "Dashboard", tech: "Next.js 16" },
      ],
    },
  ],
};

describe("dashboard phase A coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ name: "Test User", role: "board" });
    mockGetAllProjectIds.mockReturnValue(["regressor"]);
  });

  it("renders the overview page with stat grid and alerts", async () => {
    mockGetPageData.mockResolvedValue(OVERVIEW_DATA);
    const html = await renderPage(() => import("./(dashboard)/page"));
    expect(html).toContain("Overview");
    expect(html).toContain("Portfolio Companies");
    expect(html).toContain("Pipeline active");
    expect(html).toContain("Pipeline");
  });

  it("renders the pipeline page with kanban board", async () => {
    mockGetPageData.mockResolvedValue(PIPELINE_DATA);
    const html = await renderPage(() => import("./(dashboard)/pipeline/page"));
    expect(html).toContain("Pipeline");
    expect(html).toContain("Invested");
    expect(html).toContain("Regressor");
  });

  it("renders the project detail page from project data", async () => {
    mockGetProject.mockReturnValue({
      id: "regressor",
      name: "Regressor",
      one_liner: "AI Agentic infrastructure",
      sector: "AI Infrastructure",
      funding_round: "Seed Round",
      investment_status: "Invested",
      team: { ceo_founder: "Stephen Wang" },
      product_highlights: ["Data Skills"],
      demo_date: "2026-04-09",
      demo_event: "SSG Spring Demo",
      updated_at: "2026-04-06T00:00:00Z",
    });
    const html = await renderPage(
      () => import("./(dashboard)/pipeline/[projectId]/page"),
      { params: Promise.resolve({ projectId: "regressor" }) },
    );
    expect(html).toContain("Regressor");
    expect(html).toContain("Stephen Wang");
    expect(html).toContain("SSG Spring Demo");
    expect(html).toContain("Data Skills");
  });

  it("renders the sourcing page with card list", async () => {
    mockGetPageData.mockResolvedValue(SOURCING_DATA);
    const html = await renderPage(() => import("./(dashboard)/sourcing/page"));
    expect(html).toContain("Sourcing");
    expect(html).toContain("Regressor");
    expect(html).toContain("韩磊");
  });

  it("renders the matching page with alert", async () => {
    mockGetPageData.mockResolvedValue(MATCHING_DATA);
    const html = await renderPage(() => import("./(dashboard)/matching/page"));
    expect(html).toContain("Matching");
    expect(html).toContain("Matching engine warming up");
  });

  it("renders the team page with agent roster", async () => {
    mockGetPageData.mockResolvedValue(AGENTS_DATA);
    const html = await renderPage(() => import("./(dashboard)/agents/page"));
    expect(html).toContain("Team");
    expect(html).toContain("CEO Agent");
    expect(html).toContain("Dashboard Agent");
  });

  it("renders the analytics page with stats", async () => {
    mockGetPageData.mockResolvedValue(ANALYTICS_DATA);
    const html = await renderPage(() => import("./(dashboard)/analytics/page"));
    expect(html).toContain("Analytics");
    expect(html).toContain("Pipeline Companies");
  });

  it("renders the resources page with table", async () => {
    mockGetPageData.mockResolvedValue(RESOURCES_DATA);
    const html = await renderPage(() => import("./(dashboard)/resources/page"));
    expect(html).toContain("Resources");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Next.js 16");
  });

  it("handles missing page data gracefully", async () => {
    mockGetPageData.mockResolvedValue(null);
    const html = await renderPage(() => import("./(dashboard)/sourcing/page"));
    expect(html).toContain("not generated yet");
  });

  it("handles missing project gracefully", async () => {
    mockGetProject.mockReturnValue(null);
    const html = await renderPage(
      () => import("./(dashboard)/pipeline/[projectId]/page"),
      { params: Promise.resolve({ projectId: "nonexistent" }) },
    );
    expect(html).toContain("Project Not Found");
  });

  it("renders empty state for all DynamicPage routes", async () => {
    mockGetPageData.mockResolvedValue(null);

    for (const route of [
      "./(dashboard)/pipeline/page",
      "./(dashboard)/sourcing/page",
      "./(dashboard)/matching/page",
      "./(dashboard)/agents/page",
      "./(dashboard)/analytics/page",
      "./(dashboard)/resources/page",
    ]) {
      const html = await renderPage(() => import(route));
      expect(html).toContain("not generated yet");
      expect(html).not.toContain("undefined");
    }
  });

  it("overview includes auto-refresh", async () => {
    mockGetPageData.mockResolvedValue(OVERVIEW_DATA);
    // AutoRefresh is mocked to null, just verify overview renders without errors
    const html = await renderPage(() => import("./(dashboard)/page"));
    expect(html).toContain("Overview");
  });

  it("renders the DynamicPage generated timestamp", async () => {
    mockGetPageData.mockResolvedValue(OVERVIEW_DATA);
    const html = await renderPage(() => import("./(dashboard)/page"));
    expect(html).toContain("Generated");
  });
});
