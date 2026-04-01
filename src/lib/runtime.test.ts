import { afterEach, describe, expect, it } from "vitest";

import { getFeishuAuthCheck, getRuntimeSections } from "./runtime";

const originalEnv = { ...process.env };

describe("runtime checks", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("marks complete control-plane and auth configuration as configured", () => {
    process.env.PAPERCLIP_API_URL = "https://paperclip.example.com";
    process.env.PAPERCLIP_API_KEY = "paperclip-key";
    process.env.PAPERCLIP_COMPANY_ID = "company-id";
    process.env.MIMIR_API_URL = "https://mimir.example.com";
    process.env.MIMIR_API_KEY = "mimir-key";
    process.env.MIMIR_USER_ID = "user-1";
    process.env.FEISHU_APP_ID = "app-id";
    process.env.FEISHU_APP_SECRET = "app-secret";
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.NEXTAUTH_URL = "https://ssg.example.com";
    process.env.BOARD_FEISHU_OPEN_IDS = "board-user";

    const sections = getRuntimeSections();
    const feishuAuth = getFeishuAuthCheck();

    expect(sections[0]?.checks[0]?.status).toBe("configured");
    expect(sections[1]?.checks[0]?.status).toBe("configured");
    expect(sections[2]?.checks[2]?.status).toBe("configured");
    expect(feishuAuth.status).toBe("configured");
  });

  it("marks incomplete environment groups as partial or missing", () => {
    process.env.PAPERCLIP_API_URL = "https://paperclip.example.com";
    delete process.env.PAPERCLIP_API_KEY;
    delete process.env.PAPERCLIP_COMPANY_ID;
    process.env.FEISHU_APP_ID = "app-id";
    delete process.env.FEISHU_APP_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;

    const sections = getRuntimeSections();
    const controlPlane = sections[0]?.checks[0];
    const feishuCheck = sections[2]?.checks[0];
    const sessionCheck = sections[2]?.checks[1];
    const boardCheck = sections[2]?.checks[2];
    const feishuAuth = getFeishuAuthCheck();

    expect(controlPlane?.status).toBe("partial");
    expect(controlPlane?.missingVars).toEqual([
      "PAPERCLIP_API_KEY",
      "PAPERCLIP_COMPANY_ID",
    ]);
    expect(feishuCheck?.status).toBe("partial");
    expect(sessionCheck?.status).toBe("missing");
    expect(boardCheck?.status).toBe("missing");
    expect(feishuAuth.status).toBe("partial");
  });
});
