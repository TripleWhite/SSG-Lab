import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetAgents, mockGetHeartbeatRuns } = vi.hoisted(() => ({
  mockGetAgents: vi.fn(),
  mockGetHeartbeatRuns: vi.fn(),
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

vi.mock("@/components/dashboard/auto-refresh", () => ({
  AutoRefresh: () => null,
}));

vi.mock("@/lib/paperclip", () => ({
  getAgents: mockGetAgents,
  getHeartbeatRuns: mockGetHeartbeatRuns,
}));

async function renderPage() {
  const { default: AgentsPage } = await import("./page");
  const page = await AgentsPage();
  return renderToStaticMarkup(page);
}

describe("team page empty states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a structured empty state when live team data has not arrived yet", async () => {
    mockGetAgents.mockResolvedValue([]);
    mockGetHeartbeatRuns.mockResolvedValue([]);

    const html = await renderPage();

    expect(html).toContain("Awaiting first heartbeat");
    expect(html).toContain("No team activity yet");
    expect(html).toContain("Open pipeline");
    expect(html).toContain("Awaiting first run");
    expect(html).not.toContain("The team view stays empty");
  });

  it("shows a customer-safe recovery state when the team feed fails", async () => {
    mockGetAgents.mockRejectedValue(new Error("agents unavailable"));
    mockGetHeartbeatRuns.mockRejectedValue(new Error("runs unavailable"));

    const html = await renderPage();

    expect(html).toContain("Snapshot View");
    expect(html).toContain("Team feed unavailable");
    expect(html).toContain("Refresh pending");
    expect(html).toContain("Timeline refresh pending");
  });
});
