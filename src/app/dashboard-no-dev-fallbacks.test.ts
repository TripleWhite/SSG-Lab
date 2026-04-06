import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetPageData } = vi.hoisted(() => ({
  mockGetPageData: vi.fn(),
}));

vi.mock("@/components/dashboard/auto-refresh", () => ({
  AutoRefresh: () => null,
}));

vi.mock("@/lib/auth", () => ({
  requireBoard: vi.fn(),
  requireSession: vi.fn().mockResolvedValue({ name: "Test", role: "board" }),
}));

vi.mock("@/lib/pages", () => ({
  getPageData: mockGetPageData,
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
    mockGetPageData.mockResolvedValue(null);
  });

  it("renders safe analytics empty states when page data is unavailable", async () => {
    const html = await renderPage(() => import("./(dashboard)/analytics/page"));
    expect(html).toContain("Analytics page not generated yet");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
  });

  it("renders safe pipeline empty states when page data is unavailable", async () => {
    const html = await renderPage(() => import("./(dashboard)/pipeline/page"));
    expect(html).toContain("Pipeline page not generated yet");
    expect(html).not.toContain("undefined");
  });

  it("renders safe team empty states when page data is unavailable", async () => {
    const html = await renderPage(() => import("./(dashboard)/agents/page"));
    expect(html).toContain("Team page not generated yet");
    expect(html).not.toContain("undefined");
  });
});
