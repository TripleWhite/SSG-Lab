import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUsePathname, mockUseRouter } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
  mockUseRouter: vi.fn(),
}));

vi.mock("next/link", async () => {
  const ReactModule = await import("react");

  return {
    default: ({
      href,
      children,
      ...props
    }: {
      href: string | { pathname?: string };
      children: unknown;
    }) =>
      ReactModule.createElement(
        "a",
        {
          href: typeof href === "string" ? href : href.pathname ?? "#",
          ...props,
        },
        children,
      ),
  };
});

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation",
  );

  return {
    ...actual,
    usePathname: mockUsePathname,
    useRouter: mockUseRouter,
  };
});

import { BrandLockup } from "@/components/nav/brand-lockup";
import { Sidebar } from "@/components/nav/sidebar";
import { MatchCard } from "@/components/matching/match-card";
import { ProjectDetail, type ProjectDetailData } from "@/components/pipeline/project-detail";

function render(component: React.ReactElement) {
  return renderToStaticMarkup(component);
}

const sampleProject: ProjectDetailData = {
  id: "workstream-1",
  title: "Dashboard Integration",
  subtitle: "SSG-311 · Phase 5",
  stage: "In Progress",
  stageVariant: "success",
  health: "on-track",
  status: "in_progress",
  assignee: "Frontend Engineer",
  daysActive: 2,
  lastActivityDate: "Just now",
  latestSignal: "Section badges and terminology updates shipped to the dashboard shell.",
  nextAction: "Hand the branch to review once coverage is restored.",
  tags: ["live data", "section badges"],
  totalTasks: 2,
  activeTasks: 1,
  blockedTasks: 0,
  doneTasks: 0,
  timeline: [
    {
      date: "Apr 1",
      event: "Coverage follow-up opened",
      actor: "CTO",
    },
  ],
  actions: ["Add rendering tests for the Phase A UI"],
  tasks: [
    {
      id: "task-1",
      identifier: "SSG-480",
      title: "Restore frontend coverage gate",
      status: "in_review",
      assignee: "Frontend Engineer",
      updatedAtLabel: "5m ago",
    },
  ],
};

describe("phase A UI components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/agents");
    mockUseRouter.mockReturnValue({ refresh: vi.fn() });
  });

  it("renders the brand lockup with custom copy", () => {
    const html = render(
      React.createElement(BrandLockup, {
        compact: true,
        label: "SSG Accelerator",
        title: "Employee Access",
      }),
    );

    expect(html).toContain("SSG Accelerator");
    expect(html).toContain("Employee Access");
    expect(html).toContain("SSG");
  });

  it("shows board-only navigation items only for board users", () => {
    const employeeHtml = render(
      React.createElement(Sidebar, {
        userName: "Avery",
        role: "employee",
      }),
    );
    const boardHtml = render(
      React.createElement(Sidebar, {
        userName: "Avery",
        role: "board",
      }),
    );

    expect(employeeHtml).toContain("Team");
    expect(employeeHtml).not.toContain("Activity");
    expect(employeeHtml).toContain("Team Access");

    expect(boardHtml).toContain("Activity");
    expect(boardHtml).toContain("Settings");
    expect(boardHtml).toContain("Board Access");
  });

  it("renders the renamed work-item CTA on pending matches", () => {
    const html = render(
      React.createElement(MatchCard, {
        type: "resource",
        confidence: 91,
        status: "pending",
        timestamp: "2m ago",
        sideA: {
          entityName: "Project Atlas",
          description: "Workflow tooling startup",
          viaEmployee: "CTO",
        },
        sideB: {
          entityName: "Operator Guild",
          description: "Expert network",
          viaEmployee: "Frontend Engineer",
        },
        suggestion: "Create a founder-intro work item.",
        onCreateTask: vi.fn(),
        onDismiss: vi.fn(),
      }),
    );

    expect(html).toContain("Create Work Item");
    expect(html).toContain("Dismiss");
    expect(html).toContain("91% match");
  });

  it("renders the project detail drawer with linked work items", () => {
    const html = render(
      React.createElement(ProjectDetail, {
        project: sampleProject,
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Linked Work Items");
    expect(html).toContain("SSG-480");
    expect(html).toContain("Coverage follow-up opened");
  });
});
