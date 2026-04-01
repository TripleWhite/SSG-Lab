import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const matchingHeartbeatPath = path.join(
  repoRoot,
  "agents/matching-agent/HEARTBEAT.md"
);
const sourcingHeartbeatPath = path.join(
  repoRoot,
  "agents/sourcing-agent/HEARTBEAT.md"
);
const bootstrapScriptPath = path.join(
  repoRoot,
  "scripts/release/bootstrap-openclaw-host.sh"
);
const seedScriptPath = path.join(
  repoRoot,
  "scripts/release/seed-ssg-company.sh"
);

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

describe("matching-agent HEARTBEAT.md", () => {
  it("documents the required memory_search query payload for the first tool call", () => {
    const heartbeat = readFile(matchingHeartbeatPath);

    expect(heartbeat).toMatch(/Never call\s+`memory_search\(\{\}\)`/);
    expect(heartbeat).toContain("\"query\": \"recent accelerator event logs");
    expect(heartbeat).toContain("\"types\": [\"event_log\"]");
    expect(heartbeat).toContain("\"time_range\": \"YYYY-MM-DD..YYYY-MM-DD\"");
  });

  it("documents top-level Paperclip match result writes", () => {
    const heartbeat = readFile(matchingHeartbeatPath);

    expect(heartbeat).toContain("PAPERCLIP_MATCHING_PARENT_ISSUE_ID");
    expect(heartbeat).toContain("\"id\": \"entity-a:entity-b:supply-demand\"");
    expect(heartbeat).toContain("\"type\": \"supply-demand\"");
    expect(heartbeat).toContain("\"entity\": \"DesignAI\"");
    expect(heartbeat).toContain("\"entity\": \"MegaCorp\"");
    expect(heartbeat).toContain("Do not wrap the payload inside `{\"Match\": ...}`");
  });
});

describe("sourcing-agent HEARTBEAT.md", () => {
  it("documents the Paperclip sourcing mirror contract", () => {
    const heartbeat = readFile(sourcingHeartbeatPath);

    expect(heartbeat).toContain("PAPERCLIP_SOURCING_PARENT_ISSUE_ID");
    expect(heartbeat).toContain("Sourcing: {companyName} / {founderName}");
    expect(heartbeat).toContain("\"id\": \"company:founder\"");
    expect(heartbeat).toContain("\"founderName\": \"Alice Chen\"");
    expect(heartbeat).toContain("\"companyName\": \"Acme AI\"");
    expect(heartbeat).toContain("\"sources\": [");
    expect(heartbeat).toContain(
      "Do not wrap the payload inside `{\"SourcingResult\": ...}`"
    );
  });
});

describe("release scripts", () => {
  it("preserves and writes parent issue ids during bootstrap", () => {
    const script = readFile(bootstrapScriptPath);

    expect(script).toContain("PAPERCLIP_SOURCING_PARENT_ISSUE_ID");
    expect(script).toContain("PAPERCLIP_MATCHING_PARENT_ISSUE_ID");
    expect(script).toContain("load_existing_env_value");
  });

  it("creates parent anchor issues and syncs their ids into runtime env", () => {
    const script = readFile(seedScriptPath);

    expect(script).toContain("ensure_project_issue()");
    expect(script).toContain("Sourcing Results");
    expect(script).toContain("Matching Results");
    expect(script).toContain("OPENCLAW_ENV_FILE");
    expect(script).toContain(
      'upsert_env_var "$OPENCLAW_ENV_FILE" "PAPERCLIP_SOURCING_PARENT_ISSUE_ID"'
    );
    expect(script).toContain(
      'upsert_env_var "$OPENCLAW_ENV_FILE" "PAPERCLIP_MATCHING_PARENT_ISSUE_ID"'
    );
  });
});
