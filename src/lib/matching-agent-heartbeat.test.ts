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
const matchingSettingsPath = path.join(
  repoRoot,
  "agents/matching-agent/settings.json"
);
const portfolioHeartbeatPath = path.join(
  repoRoot,
  "agents/portfolio-agent/HEARTBEAT.md"
);
const portfolioSettingsPath = path.join(
  repoRoot,
  "agents/portfolio-agent/settings.json"
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
  it("documents the live memory_search payload contract for the first tool call", () => {
    const heartbeat = readFile(matchingHeartbeatPath);

    expect(heartbeat).toMatch(/Never call\s+`memory_search\(\{\}\)`/);
    expect(heartbeat).toContain("only accepts `query`, `maxResults`, and");
    expect(heartbeat).toContain("`minScore`");
    expect(heartbeat).toContain(
      "\"query\": \"Accelerator event logs from START_ISO to END_ISO",
    );
    expect(heartbeat).toContain("\"maxResults\": 20");
    expect(heartbeat).toContain("\"minScore\": 0.35");
    expect(heartbeat).toContain(
      "Do NOT\n  exit early on `memory_search` failure",
    );
    expect(heartbeat).not.toContain("\"types\": [\"event_log\"]");
    expect(heartbeat).not.toContain("\"time_range\": \"YYYY-MM-DD..YYYY-MM-DD\"");
    expect(heartbeat).not.toContain("\"limit\": 20");
    expect(heartbeat).toContain("\"query\": \"MATCH_FOUND relation between");
    expect(heartbeat).toContain("\"maxResults\": 10");
    expect(heartbeat).toContain("\"minScore\": 0.2");
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

  it("documents the Paperclip-local runtime instead of the old OpenClaw tool contract", () => {
    const heartbeat = readFile(matchingHeartbeatPath);
    const settings = JSON.parse(readFile(matchingSettingsPath)) as {
      browser?: boolean;
      tools?: Array<{ name?: string }>;
      plugins?: string[];
    };

    expect(heartbeat).not.toContain("DO NOT USE THE `read` TOOL");
    expect(heartbeat).toContain("Load `SOUL.md` from your workspace");
    expect(heartbeat).toContain("The live Mimir search contract only accepts");
    expect(heartbeat).toContain("Feishu HTTP API");
    expect(heartbeat).not.toContain("send_feishu_card");
    expect(settings.plugins).toBeUndefined();
    expect(settings.tools?.map((tool) => tool.name)).toEqual([
      "graph_traverse",
      "store_match",
    ]);
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
    expect(heartbeat).toMatch(
      /Do not wrap the result payload inside `\{"SourcingResult": \.\.\.\}`\.\s+The/
    );
  });
});

describe("portfolio-agent HEARTBEAT.md", () => {
  it("documents the daily Paperclip heartbeat runtime instead of cron-era OpenClaw helpers", () => {
    const heartbeat = readFile(portfolioHeartbeatPath);
    const settings = JSON.parse(readFile(portfolioSettingsPath)) as {
      tools?: Array<{ name?: string }>;
      plugins?: string[];
    };

    expect(heartbeat).toContain("daily Paperclip heartbeat");
    expect(heartbeat).toContain("Paperclip projects/issues APIs");
    expect(heartbeat).toContain("via the Paperclip API");
    expect(heartbeat).toContain("Feishu HTTP API");
    expect(heartbeat).not.toContain("EC2-B daily cron dispatch");
    expect(heartbeat).not.toContain("shared `task_list`");
    expect(heartbeat).not.toContain("via `task_get`");
    expect(heartbeat).not.toContain("shared `notify`");
    expect(settings.plugins).toBeUndefined();
    expect(settings.tools?.map((tool) => tool.name)).toEqual([
      "generate_plan",
      "schedule_followup",
      "list_resources",
    ]);
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
