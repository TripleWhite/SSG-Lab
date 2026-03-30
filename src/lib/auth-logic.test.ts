import { describe, expect, it } from "vitest";
import {
  buildLoginRedirectUrl,
  getAuthRedirectPath,
  isFeishuAuthConfiguredFromEnv,
  normalizeBoardIdentifier,
  normalizeNextPath,
  parseBoardIdentifiers,
  resolveUserRole,
} from "./auth-logic";

describe("normalizeNextPath", () => {
  it("returns / for null input", () => {
    expect(normalizeNextPath(null)).toBe("/");
  });

  it("returns / for empty string", () => {
    expect(normalizeNextPath("")).toBe("/");
  });

  it("returns / for paths starting with //", () => {
    expect(normalizeNextPath("//evil.com")).toBe("/");
  });

  it("preserves valid absolute paths", () => {
    expect(normalizeNextPath("/dashboard")).toBe("/dashboard");
  });

  it("returns / for relative paths", () => {
    expect(normalizeNextPath("dashboard")).toBe("/");
  });
});

describe("normalizeBoardIdentifier", () => {
  it("lowercases email addresses", () => {
    expect(normalizeBoardIdentifier("Arthur@SSG.com")).toBe("arthur@ssg.com");
  });

  it("preserves openId casing (no @ sign)", () => {
    expect(normalizeBoardIdentifier("ou_AbC123")).toBe("ou_AbC123");
  });
});

describe("parseBoardIdentifiers", () => {
  it("returns empty set for undefined input", () => {
    expect(parseBoardIdentifiers(undefined).size).toBe(0);
  });

  it("returns empty set for empty string", () => {
    expect(parseBoardIdentifiers("").size).toBe(0);
  });

  it("parses comma-separated identifiers", () => {
    const result = parseBoardIdentifiers("ou_abc,Test@Email.com, ou_def ");
    expect(result.size).toBe(3);
    expect(result.has("ou_abc")).toBe(true);
    expect(result.has("test@email.com")).toBe(true);
    expect(result.has("ou_def")).toBe(true);
  });
});

describe("resolveUserRole", () => {
  it("returns employee when no board identifiers configured", () => {
    expect(resolveUserRole("ou_123", "user@ssg.com", new Set())).toBe("employee");
  });

  it("returns board when openId matches", () => {
    expect(resolveUserRole("ou_123", undefined, new Set(["ou_123"]))).toBe("board");
  });

  it("returns board when email matches (case-insensitive)", () => {
    expect(resolveUserRole("ou_999", "Admin@SSG.com", new Set(["admin@ssg.com"]))).toBe("board");
  });

  it("returns employee when neither openId nor email matches", () => {
    expect(resolveUserRole("ou_999", "user@other.com", new Set(["ou_123"]))).toBe("employee");
  });

  it("returns employee when email is undefined and openId does not match", () => {
    expect(resolveUserRole("ou_999", undefined, new Set(["ou_123"]))).toBe("employee");
  });
});

describe("isFeishuAuthConfiguredFromEnv", () => {
  it("returns true when all required vars are present", () => {
    const env = {
      FEISHU_APP_ID: "app_123",
      FEISHU_APP_SECRET: "secret",
      NEXTAUTH_SECRET: "s3cret",
      NEXTAUTH_URL: "https://dash.example.com",
    } as unknown as NodeJS.ProcessEnv;
    expect(isFeishuAuthConfiguredFromEnv(env)).toBe(true);
  });

  it("returns false when any required var is missing", () => {
    const env = {
      FEISHU_APP_ID: "app_123",
      FEISHU_APP_SECRET: "",
      NEXTAUTH_SECRET: "s3cret",
      NEXTAUTH_URL: "https://dash.example.com",
    } as unknown as NodeJS.ProcessEnv;
    expect(isFeishuAuthConfiguredFromEnv(env)).toBe(false);
  });

  it("returns false for empty env", () => {
    expect(isFeishuAuthConfiguredFromEnv({} as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe("getAuthRedirectPath", () => {
  it("redirects to /login when session is null", () => {
    expect(getAuthRedirectPath(null)).toBe("/login");
  });

  it("returns null for valid employee session with default role", () => {
    expect(getAuthRedirectPath({ role: "employee" })).toBeNull();
  });

  it("returns null for board session with board requirement", () => {
    expect(getAuthRedirectPath({ role: "board" }, "board")).toBeNull();
  });

  it("redirects employee away from board-only routes", () => {
    expect(getAuthRedirectPath({ role: "employee" }, "board")).toBe(
      "/?notice=board_access_required"
    );
  });
});

describe("buildLoginRedirectUrl", () => {
  it("builds login URL with error param", () => {
    const url = buildLoginRedirectUrl("https://dash.example.com/api/auth", "invalid_state");
    expect(url).toBe("https://dash.example.com/login?error=invalid_state");
  });

  it("includes next param when provided", () => {
    const url = buildLoginRedirectUrl("https://dash.example.com/", "expired", "/pipeline");
    expect(url).toBe("https://dash.example.com/login?error=expired&next=%2Fpipeline");
  });

  it("omits next param when null", () => {
    const url = buildLoginRedirectUrl("https://dash.example.com/", "error", null);
    expect(url).toBe("https://dash.example.com/login?error=error");
  });
});
