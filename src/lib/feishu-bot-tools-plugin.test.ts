import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };
const repoRoot = path.resolve(__dirname, "../..");
const manifestPath = path.join(
  repoRoot,
  "agents/feishu-bot/.openclaw/extensions/feishu-bot-tools/openclaw.plugin.json",
);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function importPluginModule() {
  vi.resetModules();
  return import("../../agents/feishu-bot/.openclaw/extensions/feishu-bot-tools/index");
}

async function registerTools() {
  const module = await importPluginModule();
  const tools = new Map<
    string,
    { execute: (id: string, params: Record<string, unknown>) => Promise<unknown> }
  >();
  const hooks = new Map<
    string,
    (
      event: { timestamp?: number },
      ctx: { channelId: string; conversationId?: string },
    ) => Promise<void> | void
  >();

  module.default.register({
    registerTool(tool) {
      tools.set(tool.name, tool);
    },
    on(hookName, handler) {
      hooks.set(hookName, handler);
    },
  });

  return { tools, hooks };
}

describe("feishu-bot workspace plugin", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SSGLAB_API_URL: "https://dash.example.com/",
      DASH_SYNC_API_KEY: "dash-secret",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("ships an auto-discoverable manifest, dash_sync, and the reactive telemetry hook", async () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { id?: string };
    const { tools, hooks } = await registerTools();

    expect(manifest.id).toBe("feishu-bot-tools");
    expect(Array.from(tools.keys())).toEqual(["dash_sync"]);
    expect(Array.from(hooks.keys())).toEqual(["message_received"]);
  });

  it("posts dash sync requests to the dashboard API", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        result: {
          id: "record-1",
          project_id: "record-1",
          table: "projects",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const { tools } = await registerTools();
    const tool = tools.get("dash_sync");
    const result = (await tool?.execute("tool-1", {
      action: "upsert_project",
      mimir_entity_id: "entity-1",
      data: {
        name: "Signal Forge",
      },
    })) as { details?: Record<string, unknown> };

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://dash.example.com/api/dash-sync");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(init.headers).toMatchObject({
      Authorization: "Bearer dash-secret",
      "Content-Type": "application/json",
    });
    expect(body).toEqual({
      action: "upsert_project",
      mimir_entity_id: "entity-1",
      data: {
        name: "Signal Forge",
      },
    });
    expect(result.details).toEqual({
      success: true,
      action: "upsert_project",
      record_id: "record-1",
      project_id: "record-1",
      table: "projects",
    });
  });

  it("times out after five seconds and returns a non-blocking failure payload", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;

      return new Promise((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => reject(new Error("request aborted")),
          { once: true },
        );
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { tools } = await registerTools();
    const tool = tools.get("dash_sync");
    const execution = tool?.execute("tool-2", {
      action: "upsert_sourcing",
      mimir_entity_id: "entity-2",
      data: {
        project_name: "Signal Forge",
        platform: "LinkedIn",
        raw_data: {},
      },
    }) as Promise<{ details?: Record<string, unknown> }>;

    await vi.advanceTimersByTimeAsync(5_000);
    const result = await execution;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.details).toEqual({
      success: false,
      action: "upsert_sourcing",
      error: "dash_sync request timed out after 5000ms",
    });
  });

  it("downgrades dashboard API 500 responses into a non-blocking failure payload", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(
        {
          status: "error",
          error: {
            code: "dash_sync_failed",
            message: "Supabase projects upsert failed: write failed",
          },
        },
        500,
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const { tools } = await registerTools();
    const tool = tools.get("dash_sync");
    const result = (await tool?.execute("tool-3", {
      action: "upsert_project",
      mimir_entity_id: "entity-3",
      data: {
        name: "Signal Forge",
      },
    })) as { details?: Record<string, unknown> };

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.details).toEqual({
      success: false,
      action: "upsert_project",
      status_code: 500,
      error: "Supabase projects upsert failed: write failed",
    });
  });

  it("debounces reactive telemetry pings to at most once per minute", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "ok", result: { id: "telemetry-1" } }));

    vi.stubGlobal("fetch", fetchMock);

    const { hooks } = await registerTools();
    const hook = hooks.get("message_received");

    await hook?.(
      { timestamp: Date.parse("2026-04-03T10:00:00.000Z") },
      { channelId: "feishu", conversationId: "chat-1" },
    );
    await hook?.(
      { timestamp: Date.parse("2026-04-03T10:00:30.000Z") },
      { channelId: "feishu", conversationId: "chat-1" },
    );
    await hook?.(
      { timestamp: Date.parse("2026-04-03T10:01:01.000Z") },
      { channelId: "feishu", conversationId: "chat-1" },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://dash.example.com/api/dash-sync");

    const firstBody = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    ) as Record<string, unknown>;
    const secondBody = JSON.parse(
      String((fetchMock.mock.calls[1]?.[1] as RequestInit).body),
    ) as Record<string, unknown>;

    expect(firstBody).toEqual({
      action: "record_reactive_telemetry",
      mimir_entity_id: "reactive-agent:feishu-bot",
      data: {
        agent_url_key: "feishu-bot",
        channel: "feishu",
        conversation_id: "chat-1",
        event_type: "message_received",
        occurred_at: "2026-04-03T10:00:00.000Z",
        source: "openclaw_message_received_hook",
      },
    });
    expect(secondBody).toEqual({
      action: "record_reactive_telemetry",
      mimir_entity_id: "reactive-agent:feishu-bot",
      data: {
        agent_url_key: "feishu-bot",
        channel: "feishu",
        conversation_id: "chat-1",
        event_type: "message_received",
        occurred_at: "2026-04-03T10:01:01.000Z",
        source: "openclaw_message_received_hook",
      },
    });
  });
});
