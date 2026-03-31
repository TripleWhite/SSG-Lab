import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const heartbeatPath = path.resolve(
  __dirname,
  "../../agents/matching-agent/HEARTBEAT.md"
);

function readHeartbeat(): string {
  return fs.readFileSync(heartbeatPath, "utf8");
}

describe("matching-agent HEARTBEAT.md", () => {
  it("documents the required memory_search query payload for the first tool call", () => {
    const heartbeat = readHeartbeat();

    expect(heartbeat).toMatch(/Never call\s+`memory_search\(\{\}\)`/);
    expect(heartbeat).toContain("\"query\": \"recent accelerator event logs");
    expect(heartbeat).toContain("\"types\": [\"event_log\"]");
    expect(heartbeat).toContain("\"time_range\": \"YYYY-MM-DD..YYYY-MM-DD\"");
  });
});
