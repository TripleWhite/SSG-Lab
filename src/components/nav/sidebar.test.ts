import { createElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
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
    usePathname: mockUsePathname,
  };
});

async function renderSidebar(props: {
  userName: string;
  role: "board" | "employee";
}) {
  const { Sidebar } = await import("./sidebar");
  return renderToStaticMarkup(createElement(Sidebar, props));
}

describe("sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/");
  });

  it("wraps mobile navigation destinations instead of requiring horizontal scroll", async () => {
    const html = await renderSidebar({
      userName: "韩磊",
      role: "employee",
    });

    expect(html).toContain("grid-cols-2");
    expect(html).toContain("sm:grid-cols-3");
    expect(html).not.toContain("overflow-x-auto");
    expect(html).toContain("min-h-11");
  });

  it("keeps board-only routes out of employee navigation", async () => {
    const employeeHtml = await renderSidebar({
      userName: "韩磊",
      role: "employee",
    });
    const boardHtml = await renderSidebar({
      userName: "Arthur",
      role: "board",
    });

    expect(employeeHtml).not.toContain("Activity");
    expect(employeeHtml).not.toContain("Settings");
    expect(boardHtml).toContain("Activity");
    expect(boardHtml).toContain("Settings");
  });
});
