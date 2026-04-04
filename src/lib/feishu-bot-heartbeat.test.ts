import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const feishuAgentsPath = path.join(repoRoot, "agents/feishu-bot/AGENTS.md");
const feishuHeartbeatPath = path.join(repoRoot, "agents/feishu-bot/HEARTBEAT.md");
const feishuSettingsPath = path.join(repoRoot, "agents/feishu-bot/settings.json");
const feishuSoulPath = path.join(repoRoot, "agents/feishu-bot/SOUL.md");

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

describe("feishu-bot instruction hardening", () => {
  it("documents context recovery before ambiguous follow-ups are discarded", () => {
    const heartbeat = readFile(feishuHeartbeatPath);

    expect(heartbeat).toContain("3b. **Context recovery**");
    expect(heartbeat).toContain('appears to reference prior context ("it", "that", "this", pronouns, implicit');
    expect(heartbeat).toContain("search Mimir `event_log` for recent entries");
    expect(heartbeat).toContain("from the same channel/peer from the last 30 minutes");
    expect(heartbeat).toContain("Use the recovered");
    expect(heartbeat).toContain("context to re-classify intent before giving up.");
    expect(heartbeat).toContain("If context recovery found recent activity, ask a clarifying");
    expect(heartbeat).toContain("question that references that context.");
    expect(heartbeat).not.toContain("- Unknown intent: Reply with guidance on available actions.");
  });

  it("treats ambiguous fragments as recoverable until context lookup fails", () => {
    const soul = readFile(feishuSoulPath);

    expect(soul).toContain(
      "- Ambiguous fragments that remain unresolvable after context recovery",
    );
    expect(soul).toContain(
      "(search recent event_log from the same peer first before discarding)",
    );
    expect(soul).not.toContain(
      '- Ambiguous fragments without context ("that was interesting")',
    );
  });

  it("documents mandatory dash_sync dual-write rules for company and sourcing captures", () => {
    const soul = readFile(feishuSoulPath);

    expect(soul).toContain("### 5. Dash 双写规则");
    expect(soul).toContain(
      "After `memory_store` succeeds for a Company entity or sourcing signal, you MUST also call `dash_sync`",
    );
    expect(soul).toContain('call `dash_sync` with `action: "upsert_project"`');
    expect(soul).toContain('call `dash_sync` with `action: "upsert_sourcing"`');
    expect(soul).toContain(
      "If `dash_sync` returns `success: false`, tell the employee: `已保存到记忆系统，Dash 同步暂时失败，稍后自动重试`.",
    );
    expect(soul).toContain(
      "dash_sync project/sourcing mirror when applicable, acknowledge",
    );
  });

  it("tracks the feishu-bot workspace contract for Paperclip routing and dash sync", () => {
    const agents = readFile(feishuAgentsPath);
    const settings = JSON.parse(readFile(feishuSettingsPath)) as {
      plugins?: string[];
      browser?: boolean;
    };

    expect(agents).toContain("route functional tasks to specialized agents via Paperclip");
    expect(agents).toContain("Dash Sync API");
    expect(agents).toContain("Reactive -- triggered by incoming Paperclip tasks");
    expect(settings.plugins).toEqual(["memory-mimir", "feishu-bot-tools"]);
    expect(settings.browser).toBe(false);
  });
});
