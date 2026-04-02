import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const feishuHeartbeatPath = path.join(repoRoot, "agents/feishu-bot/HEARTBEAT.md");
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
});
