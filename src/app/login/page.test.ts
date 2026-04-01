import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockGetFeishuAuthCheck,
  mockRedirect,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetFeishuAuthCheck: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession: mockGetSession,
}));

vi.mock("@/lib/runtime", () => ({
  getFeishuAuthCheck: mockGetFeishuAuthCheck,
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation",
  );

  return {
    ...actual,
    redirect: mockRedirect,
  };
});

async function renderLoginPage(searchParams?: Promise<Record<string, string>>) {
  const { default: LoginPage } = await import("./page");
  const page = await LoginPage({ searchParams });
  return renderToStaticMarkup(page);
}

describe("login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    mockGetFeishuAuthCheck.mockReturnValue({ status: "configured" });
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("renders the cleaned employee sign-in shell with error-state copy", async () => {
    const html = await renderLoginPage(
      Promise.resolve({
        error: "invalid_state",
        next: "/pipeline",
      }),
    );

    expect(html).toContain("Employee Access");
    expect(html).toContain("Sign in with Feishu");
    expect(html).toContain("/api/auth/feishu?next=%2Fpipeline");
    expect(html).toContain("Sign-in session expired");
    expect(html).not.toContain("FEISHU_APP_ID");
    expect(html).not.toContain("Board pages stay hidden");
  });

  it("renders a disabled CTA when Feishu auth is unavailable", async () => {
    mockGetFeishuAuthCheck.mockReturnValue({ status: "missing" });

    const html = await renderLoginPage();

    expect(html).toContain("Feishu access is unavailable");
    expect(html).toContain("disabled");
    expect(html).not.toContain('href="/api/auth/feishu"');
  });

  it("redirects authenticated users back to the root route", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1" });

    await expect(renderLoginPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});
