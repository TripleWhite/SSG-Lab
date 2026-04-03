type AgentToolResult = {
  content: Array<{ type: "text"; text: string }>;
  details?: unknown;
};

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<AgentToolResult>;
};

type OpenClawPluginApi = {
  registerTool: (tool: ToolDefinition) => void;
  on?: (
    hookName: "message_received",
    handler: (
      event: { timestamp?: number },
      ctx: { channelId: string; conversationId?: string },
    ) => Promise<void> | void,
  ) => void;
};

type DashSyncAction =
  | "upsert_project"
  | "upsert_sourcing"
  | "upsert_match"
  | "record_reactive_telemetry";

type DashSyncParams = {
  action?: DashSyncAction;
  mimir_entity_id?: string;
  data?: Record<string, unknown>;
};

const FEISHU_BOT_PLUGIN_ID = "feishu-bot-tools";
const FEISHU_BOT_AGENT_URL_KEY = "feishu-bot";
const DASH_SYNC_TIMEOUT_MS = 5_000;
const REACTIVE_TELEMETRY_DEBOUNCE_MS = 60_000;
const REACTIVE_TELEMETRY_ENTITY_ID = `reactive-agent:${FEISHU_BOT_AGENT_URL_KEY}`;

const DASH_SYNC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ["upsert_project", "upsert_sourcing", "upsert_match"],
      description: "Dash sync action to mirror structured data into Supabase.",
    },
    mimir_entity_id: {
      type: "string",
      description: "Stable Mimir entity id used to derive the idempotent UUIDv5 row id.",
    },
    data: {
      type: "object",
      additionalProperties: true,
      description: "Structured Dash payload for the selected action.",
    },
  },
  required: ["action", "mimir_entity_id", "data"],
};

let lastReactiveTelemetryAtMs = 0;

function json(payload: Record<string, unknown>): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requireNonEmptyString(fieldName: string, value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function readErrorMessage(body: Record<string, unknown> | null, fallback: string): string {
  const errorRecord = asRecord(body?.error);
  if (typeof errorRecord?.message === "string" && errorRecord.message.trim()) {
    return errorRecord.message;
  }

  return fallback;
}

async function safeReadJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return asRecord(await response.json());
  } catch {
    return null;
  }
}

function buildRequestSignal(timeoutMs: number, upstream?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromUpstream = () => controller.abort();
  if (upstream) {
    if (upstream.aborted) {
      controller.abort();
    } else {
      upstream.addEventListener("abort", abortFromUpstream, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup() {
      clearTimeout(timeoutId);
      upstream?.removeEventListener("abort", abortFromUpstream);
    },
  };
}

async function executeDashSync(
  _toolCallId: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<AgentToolResult> {
  const input = params as DashSyncParams;

  try {
    const action = requireNonEmptyString("action", input.action) as DashSyncAction;
    const mimirEntityId = requireNonEmptyString(
      "mimir_entity_id",
      input.mimir_entity_id,
    );
    const data = asRecord(input.data);
    if (!data) {
      throw new Error("data must be an object.");
    }

    const apiUrl = normalizeBaseUrl(
      requireNonEmptyString("SSGLAB_API_URL", process.env.SSGLAB_API_URL),
    );
    const apiKey = requireNonEmptyString(
      "DASH_SYNC_API_KEY",
      process.env.DASH_SYNC_API_KEY,
    );

    const requestSignal = buildRequestSignal(DASH_SYNC_TIMEOUT_MS, signal);

    try {
      const response = await fetch(`${apiUrl}/api/dash-sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          mimir_entity_id: mimirEntityId,
          data,
        }),
        signal: requestSignal.signal,
      });

      const body = await safeReadJson(response);
      if (!response.ok) {
        return json({
          success: false,
          action,
          status_code: response.status,
          error: readErrorMessage(
            body,
            `dash_sync request failed with status ${response.status}`,
          ),
        });
      }

      const result = asRecord(body?.result);

      return json({
        success: true,
        action,
        record_id: typeof result?.id === "string" ? result.id : null,
        project_id: typeof result?.project_id === "string" ? result.project_id : null,
        table: typeof result?.table === "string" ? result.table : null,
      });
    } catch (error) {
      return json({
        success: false,
        action,
        error: requestSignal.didTimeout()
          ? `dash_sync request timed out after ${DASH_SYNC_TIMEOUT_MS}ms`
          : error instanceof Error
            ? error.message
            : "dash_sync request failed.",
      });
    } finally {
      requestSignal.cleanup();
    }
  } catch (error) {
    return json({
      success: false,
      action: typeof input.action === "string" ? input.action : null,
      error: error instanceof Error ? error.message : "dash_sync input is invalid.",
    });
  }
}

async function postReactiveTelemetry(
  event: { timestamp?: number },
  ctx: { channelId: string; conversationId?: string },
) {
  const nowMs =
    typeof event.timestamp === "number" && Number.isFinite(event.timestamp)
      ? event.timestamp
      : Date.now();
  if (nowMs - lastReactiveTelemetryAtMs < REACTIVE_TELEMETRY_DEBOUNCE_MS) {
    return;
  }
  lastReactiveTelemetryAtMs = nowMs;

  const apiUrl = normalizeBaseUrl(
    requireNonEmptyString("SSGLAB_API_URL", process.env.SSGLAB_API_URL),
  );
  const apiKey = requireNonEmptyString(
    "DASH_SYNC_API_KEY",
    process.env.DASH_SYNC_API_KEY,
  );
  const requestSignal = buildRequestSignal(DASH_SYNC_TIMEOUT_MS);

  try {
    await fetch(`${apiUrl}/api/dash-sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "record_reactive_telemetry",
        mimir_entity_id: REACTIVE_TELEMETRY_ENTITY_ID,
        data: {
          agent_url_key: FEISHU_BOT_AGENT_URL_KEY,
          channel: ctx.channelId,
          conversation_id: ctx.conversationId ?? null,
          event_type: "message_received",
          occurred_at: new Date(nowMs).toISOString(),
          source: "openclaw_message_received_hook",
        },
      }),
      signal: requestSignal.signal,
    });
  } catch {
    // Telemetry must never block the reactive Feishu reply path.
  } finally {
    requestSignal.cleanup();
  }
}

const feishuBotToolsPlugin = {
  id: FEISHU_BOT_PLUGIN_ID,
  name: "Feishu Bot Tools",
  description:
    "Workspace-local Feishu bot tools for mirroring curated Mimir records into the dashboard.",
  register(api: OpenClawPluginApi) {
    api.registerTool({
      name: "dash_sync",
      description:
        "Mirror structured Company, sourcing, or match data into the dashboard via POST /api/dash-sync. Failures return success=false and must not block the Feishu reply.",
      inputSchema: DASH_SYNC_SCHEMA,
      execute: executeDashSync,
    });

    api.on?.("message_received", async (event, ctx) => {
      await postReactiveTelemetry(event, ctx);
    });
  },
};

export default feishuBotToolsPlugin;
