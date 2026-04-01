import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const runbookPath = path.join(
  repoRoot,
  "agents/portfolio-agent/runbooks/OPENCLAW_VERIFICATION.md"
);

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

describe("portfolio-agent verification runbook", () => {
  it("uses the deployed ubuntu openclaw paths instead of the stale ec2-user paths", () => {
    const runbook = readFile(runbookPath);

    expect(runbook).toContain("/home/ubuntu/.openclaw/agents/portfolio-agent/");
    expect(runbook).toContain("/home/ubuntu/.openclaw/.env");
    expect(runbook).not.toContain("source /home/ec2-user/.paperclip/runtime.env");
    expect(runbook).not.toContain("/home/ec2-user/openclaw-agents/portfolio-agent/");
  });

  it("verifies registration and heartbeat runs through supported company endpoints", () => {
    const runbook = readFile(runbookPath);

    expect(runbook).toContain("/api/companies/$PAPERCLIP_COMPANY_ID/agents");
    expect(runbook).toContain("/api/companies/$PAPERCLIP_COMPANY_ID/heartbeat-runs?limit=50");
    expect(runbook).toContain("return `404`");
    expect(runbook).not.toContain("curl -fsS -X POST");
  });
});
