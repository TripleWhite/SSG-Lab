import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

const ORIGINAL_ENV = { ...process.env };

type UpsertCall = {
  table: string;
  values: unknown;
  options: unknown;
};

function createSupabaseClient(options?: {
  projectLookup?: (projectName: string) => Promise<{ data: unknown; error: { message: string } | null }>;
  upsert?: (call: UpsertCall) => Promise<{ error: { message: string } | null }>;
}) {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq(_column: string, projectName: string) {
              return {
                limit() {
                  if (table !== "projects") {
                    throw new Error(`Unexpected select table: ${table}`);
                  }

                  return options?.projectLookup?.(projectName) ?? Promise.resolve({
                    data: [],
                    error: null,
                  });
                },
              };
            },
          };
        },
        upsert(values: unknown, optionsArg: unknown) {
          return options?.upsert?.({
            table,
            values,
            options: optionsArg,
          }) ?? Promise.resolve({ error: null });
        },
      };
    },
  };
}

async function importRouteModule() {
  vi.resetModules();
  return import("../../../lib/dash-sync");
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe("POST /api/dash-sync", () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      DASH_SYNC_API_KEY: "dash-secret",
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.com",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("rejects requests without a valid bearer token", async () => {
    const { POST } = await importRouteModule();
    const response = await POST(
      new Request("https://dash.example.com/api/dash-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_project",
          mimir_entity_id: "entity-1",
          data: { name: "Signal Forge" },
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({
      status: "error",
      error: {
        code: "unauthorized",
        message: "Bearer token is invalid or missing.",
      },
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("rejects invalid request payloads before touching Supabase", async () => {
    const { POST } = await importRouteModule();
    const response = await POST(
      new Request("https://dash.example.com/api/dash-sync", {
        method: "POST",
        headers: {
          Authorization: "Bearer dash-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "ship_it",
          mimir_entity_id: "entity-1",
          data: {},
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      status: "error",
      error: {
        code: "invalid_request",
        message:
          "action must be one of upsert_project, upsert_sourcing, upsert_match, record_reactive_telemetry.",
      },
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("records reactive agent telemetry in portfolio_items with a stable row id", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockReturnValue(
      createSupabaseClient({
        upsert: upsertSpy,
      }),
    );

    const { POST, createReactiveTelemetryId } = await importRouteModule();

    const response = await POST(
      new Request("https://dash.example.com/api/dash-sync", {
        method: "POST",
        headers: {
          Authorization: "Bearer dash-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        }),
      }),
    );

    const telemetryId = createReactiveTelemetryId("feishu-bot");

    expect(upsertSpy).toHaveBeenCalledWith({
      table: "portfolio_items",
      values: {
        id: telemetryId,
        project_id: null,
        status: "active",
        next_followup_at: null,
        last_activity: "2026-04-03T10:00:00.000Z",
        notes: null,
        metadata: {
          kind: "agent_reactive_telemetry",
          agent_url_key: "feishu-bot",
          channel: "feishu",
          conversation_id: "chat-1",
          event_type: "message_received",
          source: "openclaw_message_received_hook",
        },
      },
      options: { onConflict: "id" },
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      status: "ok",
      result: {
        action: "record_reactive_telemetry",
        table: "portfolio_items",
        id: telemetryId,
        project_id: null,
        agent_url_key: "feishu-bot",
        recorded_at: "2026-04-03T10:00:00.000Z",
      },
    });
  });

  it("upserts projects with deterministic ids and service-role credentials", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockReturnValue(
      createSupabaseClient({
        upsert: upsertSpy,
      }),
    );

    const {
      POST,
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      createDeterministicUuid,
    } = await importRouteModule();

    const response = await POST(
      new Request("https://dash.example.com/api/dash-sync", {
        method: "POST",
        headers: {
          Authorization: "Bearer dash-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upsert_project",
          mimir_entity_id: "entity-project-1",
          data: {
            name: "Signal Forge",
            industry: "Dev Tools",
            stage: "Seed",
            founder_name: "Avery Chen",
            founder_contact: "avery@example.com",
            description: "Workflow telemetry for operators.",
            metadata: { source_employee: "Alice" },
          },
        }),
      }),
    );

    const deterministicId = createDeterministicUuid(
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      "entity-project-1",
    );

    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://supabase.example.com",
      "service-role-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
    expect(upsertSpy).toHaveBeenCalledWith({
      table: "projects",
      values: {
        id: deterministicId,
        name: "Signal Forge",
        industry: "Dev Tools",
        stage: "Seed",
        status: "active",
        founder_name: "Avery Chen",
        founder_contact: "avery@example.com",
        description: "Workflow telemetry for operators.",
        source: "dash_sync",
        metadata: { source_employee: "Alice" },
      },
      options: { onConflict: "id" },
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      status: "ok",
      result: {
        action: "upsert_project",
        table: "projects",
        id: deterministicId,
        project_id: deterministicId,
        auto_created_project: false,
      },
    });
  });

  it("reuses the same deterministic id when the same mimir_entity_id is sent twice", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockReturnValue(
      createSupabaseClient({
        upsert: upsertSpy,
      }),
    );

    const {
      POST,
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      createDeterministicUuid,
    } = await importRouteModule();

    const request = () =>
      POST(
        new Request("https://dash.example.com/api/dash-sync", {
          method: "POST",
          headers: {
            Authorization: "Bearer dash-secret",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "upsert_project",
            mimir_entity_id: "entity-project-repeat-1",
            data: {
              name: "Signal Forge",
              industry: "Dev Tools",
            },
          }),
        }),
      );

    const firstResponse = await request();
    const secondResponse = await request();
    const deterministicId = createDeterministicUuid(
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      "entity-project-repeat-1",
    );

    expect(upsertSpy).toHaveBeenNthCalledWith(1, {
      table: "projects",
      values: {
        id: deterministicId,
        name: "Signal Forge",
        industry: "Dev Tools",
        stage: null,
        status: "active",
        founder_name: null,
        founder_contact: null,
        description: null,
        source: "dash_sync",
        metadata: {},
      },
      options: { onConflict: "id" },
    });
    expect(upsertSpy).toHaveBeenNthCalledWith(2, {
      table: "projects",
      values: {
        id: deterministicId,
        name: "Signal Forge",
        industry: "Dev Tools",
        stage: null,
        status: "active",
        founder_name: null,
        founder_contact: null,
        description: null,
        source: "dash_sync",
        metadata: {},
      },
      options: { onConflict: "id" },
    });
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(await readJson(firstResponse)).toEqual({
      status: "ok",
      result: {
        action: "upsert_project",
        table: "projects",
        id: deterministicId,
        project_id: deterministicId,
        auto_created_project: false,
      },
    });
    expect(await readJson(secondResponse)).toEqual({
      status: "ok",
      result: {
        action: "upsert_project",
        table: "projects",
        id: deterministicId,
        project_id: deterministicId,
        auto_created_project: false,
      },
    });
  });

  it("returns dash_sync_failed when Supabase upsert fails", async () => {
    mockCreateClient.mockReturnValue(
      createSupabaseClient({
        upsert: async () => ({
          error: {
            message: "write failed",
          },
        }),
      }),
    );

    const { POST } = await importRouteModule();
    const response = await POST(
      new Request("https://dash.example.com/api/dash-sync", {
        method: "POST",
        headers: {
          Authorization: "Bearer dash-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upsert_project",
          mimir_entity_id: "entity-project-error-1",
          data: {
            name: "Signal Forge",
          },
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await readJson(response)).toEqual({
      status: "error",
      error: {
        code: "dash_sync_failed",
        message: "Supabase projects upsert failed: write failed",
      },
    });
  });

  it("auto-creates a project when sourcing sync references a new project name", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockReturnValue(
      createSupabaseClient({
        projectLookup: async () => ({ data: [], error: null }),
        upsert: upsertSpy,
      }),
    );

    const {
      POST,
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      createDeterministicUuid,
    } = await importRouteModule();

    const response = await POST(
      new Request("https://dash.example.com/api/dash-sync", {
        method: "POST",
        headers: {
          Authorization: "Bearer dash-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upsert_sourcing",
          mimir_entity_id: "entity-source-1",
          data: {
            project_name: "Signal Forge",
            platform: "LinkedIn",
            title: "Founder intro",
            summary: "Warm founder lead",
            raw_data: {
              domain: "Dev Tools",
              stage: "Seed",
            },
          },
        }),
      }),
    );

    const autoProjectId = createDeterministicUuid(
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      "project:signal forge",
    );
    const sourcingId = createDeterministicUuid(
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      "entity-source-1",
    );

    expect(upsertSpy).toHaveBeenNthCalledWith(1, {
      table: "projects",
      values: {
        id: autoProjectId,
        name: "Signal Forge",
        industry: "Dev Tools",
        stage: "Seed",
        status: "active",
        founder_name: null,
        founder_contact: null,
        description: "Warm founder lead",
        source: "dash_sync:auto_create",
        metadata: {
          auto_created: true,
          created_from_action: "upsert_sourcing",
        },
      },
      options: { onConflict: "id" },
    });
    expect(upsertSpy).toHaveBeenNthCalledWith(2, {
      table: "sourcing_results",
      values: {
        id: sourcingId,
        project_id: autoProjectId,
        platform: "LinkedIn",
        url: null,
        title: "Founder intro",
        summary: "Warm founder lead",
        raw_data: {
          domain: "Dev Tools",
          stage: "Seed",
        },
        sourced_at: undefined,
      },
      options: { onConflict: "id" },
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      status: "ok",
      result: {
        action: "upsert_sourcing",
        table: "sourcing_results",
        id: sourcingId,
        project_id: autoProjectId,
        auto_created_project: true,
      },
    });
  });

  it("normalizes match confidence and reuses existing project ids", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    mockCreateClient.mockReturnValue(
      createSupabaseClient({
        projectLookup: async () => ({
          data: [{ id: "project-1" }],
          error: null,
        }),
        upsert: upsertSpy,
      }),
    );

    const {
      POST,
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      createDeterministicUuid,
    } = await importRouteModule();

    const response = await POST(
      new Request("https://dash.example.com/api/dash-sync", {
        method: "POST",
        headers: {
          Authorization: "Bearer dash-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upsert_match",
          mimir_entity_id: "entity-match-1",
          data: {
            project_name: "Signal Forge",
            match_type: "investor",
            confidence: 92,
            rationale: "Strong investor fit",
            matched_with: "Operator Capital",
            metadata: {
              sideA: { entity: "Signal Forge" },
              sideB: { entity: "Operator Capital" },
            },
          },
        }),
      }),
    );

    const matchId = createDeterministicUuid(
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      "entity-match-1",
    );

    expect(upsertSpy).toHaveBeenCalledWith({
      table: "matches",
      values: {
        id: matchId,
        project_id: "project-1",
        match_type: "investor",
        confidence_score: 0.92,
        rationale: "Strong investor fit",
        matched_with: "Operator Capital",
        status: "pending",
        metadata: {
          sideA: { entity: "Signal Forge" },
          sideB: { entity: "Operator Capital" },
        },
      },
      options: { onConflict: "id" },
    });

    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      status: "ok",
      result: {
        action: "upsert_match",
        table: "matches",
        id: matchId,
        project_id: "project-1",
        auto_created_project: false,
      },
    });
  });

  it("reuses an auto-created project when the company upsert arrives later", async () => {
    const projectIdsByName = new Map<string, string>();
    const upsertSpy = vi.fn().mockImplementation(async ({ table, values }) => {
      if (table === "projects") {
        const row = values as { id: string; name: string };
        projectIdsByName.set(row.name, row.id);
      }

      return { error: null };
    });

    mockCreateClient.mockReturnValue(
      createSupabaseClient({
        projectLookup: async (projectName) => {
          const existingId = projectIdsByName.get(projectName);
          return {
            data: existingId ? [{ id: existingId }] : [],
            error: null,
          };
        },
        upsert: upsertSpy,
      }),
    );

    const {
      POST,
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      createDeterministicUuid,
    } = await importRouteModule();

    const sourcingResponse = await POST(
      new Request("https://dash.example.com/api/dash-sync", {
        method: "POST",
        headers: {
          Authorization: "Bearer dash-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upsert_sourcing",
          mimir_entity_id: "entity-source-canonical-1",
          data: {
            project_name: "Signal Forge",
            platform: "LinkedIn",
            title: "Founder intro",
            summary: "Warm founder lead",
          },
        }),
      }),
    );

    const projectResponse = await POST(
      new Request("https://dash.example.com/api/dash-sync", {
        method: "POST",
        headers: {
          Authorization: "Bearer dash-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "upsert_project",
          mimir_entity_id: "entity-project-canonical-1",
          data: {
            name: "Signal Forge",
            industry: "Dev Tools",
            stage: "Seed",
          },
        }),
      }),
    );

    const autoProjectId = createDeterministicUuid(
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      "project:signal forge",
    );
    const projectEntityId = createDeterministicUuid(
      DEFAULT_DASH_SYNC_UUID_NAMESPACE,
      "entity-project-canonical-1",
    );

    expect(autoProjectId).not.toBe(projectEntityId);
    expect(upsertSpy).toHaveBeenNthCalledWith(1, {
      table: "projects",
      values: {
        id: autoProjectId,
        name: "Signal Forge",
        industry: null,
        stage: null,
        status: "active",
        founder_name: null,
        founder_contact: null,
        description: "Warm founder lead",
        source: "dash_sync:auto_create",
        metadata: {
          auto_created: true,
          created_from_action: "upsert_sourcing",
        },
      },
      options: { onConflict: "id" },
    });
    expect(upsertSpy).toHaveBeenNthCalledWith(3, {
      table: "projects",
      values: {
        id: autoProjectId,
        name: "Signal Forge",
        industry: "Dev Tools",
        stage: "Seed",
        status: "active",
        founder_name: null,
        founder_contact: null,
        description: null,
        source: "dash_sync",
        metadata: {},
      },
      options: { onConflict: "id" },
    });

    expect(sourcingResponse.status).toBe(200);
    expect(await readJson(sourcingResponse)).toEqual({
      status: "ok",
      result: {
        action: "upsert_sourcing",
        table: "sourcing_results",
        id: createDeterministicUuid(
          DEFAULT_DASH_SYNC_UUID_NAMESPACE,
          "entity-source-canonical-1",
        ),
        project_id: autoProjectId,
        auto_created_project: true,
      },
    });
    expect(projectResponse.status).toBe(200);
    expect(await readJson(projectResponse)).toEqual({
      status: "ok",
      result: {
        action: "upsert_project",
        table: "projects",
        id: autoProjectId,
        project_id: autoProjectId,
        auto_created_project: false,
      },
    });
  });
});
