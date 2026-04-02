import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };
const repoRoot = path.resolve(__dirname, "../..");
const manifestPath = path.join(
  repoRoot,
  "agents/matching-agent/.openclaw/extensions/matching-agent-tools/openclaw.plugin.json",
);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function importPluginModule() {
  vi.resetModules();
  return import("../../agents/matching-agent/.openclaw/extensions/matching-agent-tools/index");
}

async function registerTools() {
  const module = await importPluginModule();
  const tools = new Map<string, { execute: (id: string, params: Record<string, unknown>) => Promise<unknown> }>();

  module.default.register({
    registerTool(tool) {
      tools.set(tool.name, tool);
    },
  });

  return { module, tools };
}

describe("matching-agent workspace plugin", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MIMIR_URL: "https://mimir.example.com",
      MIMIR_API_KEY: "mimir-key",
      MIMIR_USER_ID: "system",
      MIMIR_GROUP_ID: "group-1",
      FEISHU_APP_ID: "app-id",
      FEISHU_APP_SECRET: "app-secret",
      MATCHING_AGENT_INGEST_POLL_INTERVAL_MS: "1",
      MATCHING_AGENT_INGEST_POLL_TIMEOUT_MS: "1000",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("ships an auto-discoverable plugin manifest and registers the three runtime tools", async () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { id?: string };
    const { tools } = await registerTools();

    expect(manifest.id).toBe("matching-agent-tools");
    expect(Array.from(tools.keys())).toEqual([
      "graph_traverse",
      "store_match",
      "send_feishu_card",
    ]);
  });

  it("routes graph_traverse through the Mimir graph traverse endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        result: {
          SeedEntities: [{ input_name: "DesignAI", entity_id: "entity-1", match_type: "exact" }],
          Entities: [{ id: "entity-2", name: "MegaCorp", entity_type: "company" }],
          Relations: [{ id: "rel-1", relation_type: "NEEDS_CUSTOMER" }],
          TotalEntities: 1,
          TotalRelations: 1,
        },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const { tools } = await registerTools();
    const tool = tools.get("graph_traverse");
    const result = (await tool?.execute("tool-1", {
      start_entity: "DesignAI",
      relation_types: ["NEEDS_CUSTOMER"],
      entity_types: ["company"],
      max_depth: 4,
      max_results: 12,
    })) as { details?: Record<string, unknown> };

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://mimir.example.com/api/v1/graph/traverse");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(body).toEqual({
      entity_names: ["DesignAI"],
      group_id: "group-1",
      hops: 3,
      max_results: 12,
      relation_types: ["NEEDS_CUSTOMER"],
      entity_types: ["company"],
    });
    expect(result.details?.query).toEqual({
      start_entity: "DesignAI",
      relation_types: ["NEEDS_CUSTOMER"],
      entity_types: ["company"],
      max_depth: 3,
      max_results: 12,
    });
    expect(result.details?.TotalEntities).toBe(1);
  });

  it("stores matches through note ingest and waits for async relation extraction to complete", async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: "ok",
            result: {
              job_id: "job-1",
              message: "Accepted note for async processing",
            },
          },
          202,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "ok",
          result: {
            id: "job-1",
            status: "running",
            attempts: 1,
            max_attempts: 3,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "ok",
          result: {
            id: "job-1",
            status: "done",
            result: {
              EpisodeCount: 1,
              EntityCount: 2,
              RelationCount: 1,
              EventLogCount: 1,
              ForesightCount: 0,
            },
          },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { tools } = await registerTools();
    const tool = tools.get("store_match");
    const execution = tool?.execute("tool-2", {
      match_id: "designai:megacorp:supply-demand",
      match_type: "supply-demand",
      entity_a: {
        id: "entity-a",
        name: "DesignAI",
        source_employee: "Alice",
      },
      entity_b: {
        id: "entity-b",
        name: "MegaCorp",
        source_employee: "Bob",
      },
      confidence: 92,
      confidence_level: "HIGH",
      scoring: {
        specificity: 22,
        complementarity: 24,
        recency: 23,
        actionability: 21,
      },
      summary: "DesignAI needs enterprise customers.",
      suggested_action: "Introduce founders.",
      create_task: false,
    }) as Promise<{ details?: Record<string, unknown> }>;

    await vi.runAllTimersAsync();
    const result = await execution;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://mimir.example.com/api/v1/ingest/note");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://mimir.example.com/api/v1/ingest/jobs/job-1");

    const ingestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const ingestBody = JSON.parse(String(ingestInit.body)) as Record<string, string>;

    expect(ingestBody.user_id).toBe("system");
    expect(ingestBody.group_id).toBe("group-1");
    expect(ingestBody.confidence).toBe("HIGH");
    expect(ingestBody.source).toBe("agent_curated");
    expect(ingestBody.note_id).toBe("match:designai:megacorp:supply-demand");
    expect(ingestBody.content).toContain("DesignAI MATCH_FOUND MegaCorp.");
    expect(ingestBody.content).toContain("Suggested action: Introduce founders.");

    expect(result.details?.stored).toBe(true);
    expect(result.details?.relation_count).toBe(1);
    expect(result.details?.follow_up_task).toBeNull();
  });

  it("sends Feishu interactive cards with the rendered match payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          tenant_access_token: "tenant-token",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: {
            message_id: "msg-1",
          },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { tools } = await registerTools();
    const tool = tools.get("send_feishu_card");
    const result = (await tool?.execute("tool-3", {
      card_type: "immediate",
      chat_id: "oc_test_chat",
      header: {
        title: "Match Found - supply-demand",
        template: "green",
      },
      matches: [
        {
          match_type: "supply-demand",
          entity_a: {
            name: "DesignAI",
            description: "AI design tool seeking enterprise customers",
            source_employee: "Alice",
          },
          entity_b: {
            name: "MegaCorp",
            description: "Design team evaluating AI tooling",
            source_employee: "Bob",
          },
          confidence: 92,
          scoring_breakdown: {
            specificity: 22,
            complementarity: 24,
            recency: 23,
            actionability: 21,
          },
          suggested_action: "Introduce the DesignAI founder to the MegaCorp design lead.",
        },
      ],
      buttons: [
        {
          text: "View Match",
          action: "view_details",
          payload: {
            url: "https://dashboard.example.com/matches/designai-megacorp",
          },
        },
        {
          text: "Dismiss",
          action: "dismiss",
        },
      ],
    })) as { details?: Record<string, unknown> };

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
    );

    const sendInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const sendBody = JSON.parse(String(sendInit.body)) as Record<string, string>;
    const card = JSON.parse(sendBody.content) as {
      header?: { title?: { content?: string } };
      body?: { elements?: Array<Record<string, unknown>> };
    };

    expect(sendBody.receive_id).toBe("oc_test_chat");
    expect(sendBody.msg_type).toBe("interactive");
    expect(card.header?.title?.content).toBe("Match Found - supply-demand");
    expect(JSON.stringify(card)).toContain("DesignAI");
    expect(JSON.stringify(card)).toContain("MegaCorp");

    const actionElement = card.body?.elements?.find((element) => element.tag === "action") as
      | { actions?: Array<{ multi_url?: { url?: string } }> }
      | undefined;

    expect(actionElement?.actions).toHaveLength(1);
    expect(actionElement?.actions?.[0]?.multi_url?.url).toBe(
      "https://dashboard.example.com/matches/designai-megacorp",
    );
    expect(result.details?.message_id).toBe("msg-1");
  });
});
