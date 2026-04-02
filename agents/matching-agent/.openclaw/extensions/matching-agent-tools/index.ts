type AgentToolResult = {
  content: Array<{ type: "text"; text: string }>;
  details?: unknown;
};

type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<AgentToolResult>;
};

type OpenClawPluginApi = {
  registerTool: (tool: ToolDefinition) => void;
};

type GraphTraverseParams = {
  start_entity?: string;
  relation_types?: string[];
  entity_types?: string[];
  max_depth?: number;
  max_results?: number;
};

type MatchSide = {
  id: string;
  name: string;
  type?: string;
  source_employee?: string;
  source_event_log_id?: string;
};

type StoreMatchParams = {
  match_id?: string;
  match_type?:
    | "supply-demand"
    | "resource"
    | "talent"
    | "investor"
    | "cross-project"
    | "mentor";
  entity_a?: MatchSide;
  entity_b?: MatchSide;
  confidence?: number;
  confidence_level?: "HIGH" | "MEDIUM";
  scoring?: {
    specificity?: number;
    complementarity?: number;
    recency?: number;
    actionability?: number;
  };
  summary?: string;
  suggested_action?: string;
  create_task?: boolean;
};

type FeishuMatchSide = {
  name: string;
  description: string;
  source_employee: string;
  entity_id?: string;
};

type FeishuMatch = {
  match_type:
    | "supply-demand"
    | "resource"
    | "talent"
    | "investor"
    | "cross-project"
    | "mentor";
  entity_a: FeishuMatchSide;
  entity_b: FeishuMatchSide;
  confidence: number;
  scoring_breakdown?: {
    specificity?: number;
    complementarity?: number;
    recency?: number;
    actionability?: number;
  };
  suggested_action: string;
  source_evidence?: string[];
};

type FeishuButton = {
  text?: string;
  action?: "view_details" | "dismiss" | "review_on_dashboard";
  payload?: Record<string, unknown>;
};

type SendFeishuCardParams = {
  card_type?: "immediate" | "digest";
  chat_id?: string;
  header?: {
    title?: string;
    template?: "blue" | "green" | "orange" | "purple";
  };
  matches?: FeishuMatch[];
  buttons?: FeishuButton[];
};

const MATCHING_AGENT_PLUGIN_ID = "matching-agent-tools";
const DEFAULT_MIMIR_URL = "https://api.allinmimir.com";
const DEFAULT_MIMIR_USER_ID = "system";
const DEFAULT_INGEST_POLL_INTERVAL_MS = 250;
const DEFAULT_INGEST_POLL_TIMEOUT_MS = 30_000;

const GRAPH_TRAVERSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    start_entity: {
      type: "string",
      description: "Entity name to start traversal from",
    },
    relation_types: {
      type: "array",
      items: { type: "string" },
      description:
        "Relation types to follow (e.g. NEEDS_CUSTOMER, HAS_CONNECTION, EXPERT_IN, INVESTED_IN, WORKS_AT)",
    },
    entity_types: {
      type: "array",
      items: { type: "string" },
      description:
        "Filter target entities by type (e.g. company, person, program, project)",
    },
    max_depth: {
      type: "integer",
      default: 2,
      minimum: 1,
      maximum: 4,
      description: "Maximum traversal depth (default 2)",
    },
    max_results: {
      type: "integer",
      default: 50,
      description: "Maximum entities to return",
    },
  },
  required: ["start_entity"],
};

const STORE_MATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    match_id: {
      type: "string",
      description:
        "Unique ID for dedup tracking (format: {entity_a_id}:{entity_b_id}:{match_type})",
    },
    match_type: {
      type: "string",
      enum: [
        "supply-demand",
        "resource",
        "talent",
        "investor",
        "cross-project",
        "mentor",
      ],
    },
    entity_a: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        type: { type: "string" },
        source_employee: { type: "string" },
        source_event_log_id: { type: "string" },
      },
      required: ["id", "name"],
    },
    entity_b: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        type: { type: "string" },
        source_employee: { type: "string" },
        source_event_log_id: { type: "string" },
      },
      required: ["id", "name"],
    },
    confidence: {
      type: "integer",
      minimum: 60,
      maximum: 100,
    },
    confidence_level: {
      type: "string",
      enum: ["HIGH", "MEDIUM"],
    },
    scoring: {
      type: "object",
      additionalProperties: false,
      properties: {
        specificity: { type: "integer", minimum: 0, maximum: 25 },
        complementarity: { type: "integer", minimum: 0, maximum: 25 },
        recency: { type: "integer", minimum: 0, maximum: 25 },
        actionability: { type: "integer", minimum: 0, maximum: 25 },
      },
    },
    summary: { type: "string" },
    suggested_action: { type: "string" },
    create_task: {
      type: "boolean",
      default: false,
      description:
        "Optional Board follow-up issue (status: in_review). Do not use this for the dashboard feed; every match result is mirrored separately as a child of PAPERCLIP_MATCHING_PARENT_ISSUE_ID.",
    },
  },
  required: [
    "match_id",
    "match_type",
    "entity_a",
    "entity_b",
    "confidence",
    "confidence_level",
    "summary",
    "suggested_action",
  ],
};

const SEND_FEISHU_CARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    card_type: {
      type: "string",
      enum: ["immediate", "digest"],
      description:
        "immediate = single HIGH match card; digest = batched MEDIUM matches",
    },
    chat_id: {
      type: "string",
      description: "Feishu chat ID for the SSG group chat",
    },
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: {
          type: "string",
          description: "Card header (e.g. 'Match Found - supply-demand')",
        },
        template: {
          type: "string",
          enum: ["blue", "green", "orange", "purple"],
          description: "Header color: green for immediate, blue for digest",
        },
      },
      required: ["title"],
    },
    matches: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          match_type: {
            type: "string",
            enum: [
              "supply-demand",
              "resource",
              "talent",
              "investor",
              "cross-project",
              "mentor",
            ],
          },
          entity_a: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              source_employee: { type: "string" },
              entity_id: { type: "string" },
            },
            required: ["name", "description", "source_employee"],
          },
          entity_b: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              source_employee: { type: "string" },
              entity_id: { type: "string" },
            },
            required: ["name", "description", "source_employee"],
          },
          confidence: { type: "integer", minimum: 60, maximum: 100 },
          scoring_breakdown: {
            type: "object",
            additionalProperties: false,
            properties: {
              specificity: { type: "integer", minimum: 0, maximum: 25 },
              complementarity: { type: "integer", minimum: 0, maximum: 25 },
              recency: { type: "integer", minimum: 0, maximum: 25 },
              actionability: { type: "integer", minimum: 0, maximum: 25 },
            },
          },
          suggested_action: { type: "string" },
          source_evidence: {
            type: "array",
            items: { type: "string" },
            description:
              "References to event_logs or entities that led to this match",
          },
        },
        required: [
          "match_type",
          "entity_a",
          "entity_b",
          "confidence",
          "suggested_action",
        ],
      },
    },
    buttons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          action: {
            type: "string",
            enum: ["view_details", "dismiss", "review_on_dashboard"],
          },
          payload: {
            type: "object",
            description: "Action-specific data (match_id, entity_ids, etc.)",
          },
        },
        required: ["text", "action"],
      },
    },
  },
  required: ["card_type", "chat_id", "header", "matches"],
};

export function json(payload: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

function requireNonEmptyString(name: string, value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} is required`);
  }
  return value as Record<string, unknown>;
}

function requireMatchSide(value: unknown, name: string): MatchSide {
  const side = requireRecord(value, name) as unknown as MatchSide;
  requireNonEmptyString(`${name}.id`, side.id);
  requireNonEmptyString(`${name}.name`, side.name);
  return side;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function clampInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), min), max);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveMimirBaseUrl(): string {
  return trimTrailingSlash(
    process.env.MIMIR_URL?.trim() ||
      process.env.MIMIR_API_URL?.trim() ||
      DEFAULT_MIMIR_URL,
  );
}

function resolveMimirUserId(): string {
  return process.env.MIMIR_USER_ID?.trim() || DEFAULT_MIMIR_USER_ID;
}

function resolveMimirGroupId(): string {
  return process.env.MIMIR_GROUP_ID?.trim() || resolveMimirUserId();
}

function resolveMimirApiKey(): string {
  return requireNonEmptyString("MIMIR_API_KEY", process.env.MIMIR_API_KEY);
}

function resolveIngestPollIntervalMs(): number {
  return clampInteger(
    Number(process.env.MATCHING_AGENT_INGEST_POLL_INTERVAL_MS),
    0,
    5_000,
    DEFAULT_INGEST_POLL_INTERVAL_MS,
  );
}

function resolveIngestPollTimeoutMs(): number {
  return clampInteger(
    Number(process.env.MATCHING_AGENT_INGEST_POLL_TIMEOUT_MS),
    100,
    60_000,
    DEFAULT_INGEST_POLL_TIMEOUT_MS,
  );
}

function buildJsonHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function getErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const message =
    typeof record.error === "string"
      ? record.error
      : typeof record.msg === "string"
        ? record.msg
        : typeof record.message === "string"
          ? record.message
          : null;

  return message && message.trim() ? message.trim() : null;
}

function unwrapEnvelope(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  if (record.status === "error") {
    throw new Error(getErrorMessage(payload) ?? "request failed");
  }

  return "result" in record ? record.result : payload;
}

async function fetchJson(
  url: string,
  init: RequestInit,
  errorPrefix: string,
): Promise<unknown> {
  const response = await fetch(url, init);
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    const message = getErrorMessage(payload);
    throw new Error(
      `${errorPrefix}: HTTP ${response.status}${message ? ` - ${message}` : ""}`,
    );
  }

  try {
    return unwrapEnvelope(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${errorPrefix}: ${message}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForIngestJob(
  jobId: string,
): Promise<Record<string, unknown>> {
  const startedAt = Date.now();
  const timeoutMs = resolveIngestPollTimeoutMs();
  const intervalMs = resolveIngestPollIntervalMs();
  const baseUrl = resolveMimirBaseUrl();
  const apiKey = resolveMimirApiKey();

  while (Date.now() - startedAt <= timeoutMs) {
    const job = requireRecord(
      await fetchJson(
        `${baseUrl}/api/v1/ingest/jobs/${encodeURIComponent(jobId)}`,
        {
          headers: buildJsonHeaders(apiKey),
        },
        "store_match ingest status failed",
      ),
      "ingest job result",
    );

    const status = typeof job.status === "string" ? job.status : "";
    if (status === "done") {
      return job;
    }
    if (status === "dead_lettered") {
      throw new Error(
        `store_match ingest job ${jobId} dead-lettered${typeof job.error === "string" ? `: ${job.error}` : ""}`,
      );
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `store_match ingest job ${jobId} timed out after ${timeoutMs}ms`,
  );
}

function readRelationCount(result: Record<string, unknown>): number {
  const nestedResult =
    result.result &&
    typeof result.result === "object" &&
    !Array.isArray(result.result)
      ? (result.result as Record<string, unknown>)
      : null;

  const directCount =
    typeof result.RelationCount === "number"
      ? result.RelationCount
      : typeof result.relation_count === "number"
        ? result.relation_count
        : undefined;

  if (typeof directCount === "number") {
    return directCount;
  }

  if (!nestedResult) {
    return 0;
  }

  return typeof nestedResult.RelationCount === "number"
    ? nestedResult.RelationCount
    : typeof nestedResult.relation_count === "number"
      ? nestedResult.relation_count
      : 0;
}

export function buildMatchNoteContent(params: StoreMatchParams): string {
  const entityA = requireMatchSide(params.entity_a, "entity_a");
  const entityB = requireMatchSide(params.entity_b, "entity_b");
  const scoring = params.scoring ?? {};
  const lines = [
    "Matching agent result:",
    `${entityA.name} MATCH_FOUND ${entityB.name}.`,
    `Match type: ${params.match_type}.`,
    `Match id: ${params.match_id}.`,
    `Confidence: ${params.confidence}% (${params.confidence_level}).`,
    `Summary: ${params.summary}.`,
    `Suggested action: ${params.suggested_action}.`,
  ];

  if (entityA.source_employee) {
    lines.push(
      `Source employee for ${entityA.name}: ${entityA.source_employee}.`,
    );
  }
  if (entityB.source_employee) {
    lines.push(
      `Source employee for ${entityB.name}: ${entityB.source_employee}.`,
    );
  }
  if (entityA.source_event_log_id) {
    lines.push(
      `Source event log for ${entityA.name}: ${entityA.source_event_log_id}.`,
    );
  }
  if (entityB.source_event_log_id) {
    lines.push(
      `Source event log for ${entityB.name}: ${entityB.source_event_log_id}.`,
    );
  }

  const scoreSummary = [
    ["specificity", scoring.specificity],
    ["complementarity", scoring.complementarity],
    ["recency", scoring.recency],
    ["actionability", scoring.actionability],
  ]
    .filter(([, value]) => typeof value === "number")
    .map(([label, value]) => `${label}=${value}`)
    .join(", ");

  if (scoreSummary) {
    lines.push(`Scoring: ${scoreSummary}.`);
  }

  return lines.join("\n");
}

function maybeReadPaperclipIssueUrl(
  issue: Record<string, unknown>,
): string | undefined {
  const identifier =
    typeof issue.identifier === "string" && issue.identifier.includes("-")
      ? issue.identifier
      : null;
  if (!identifier) {
    return undefined;
  }
  const prefix = identifier.split("-")[0];
  return `/${prefix}/issues/${identifier}`;
}

function buildFollowUpIssueDescription(params: StoreMatchParams): string {
  const entityA = params.entity_a as MatchSide;
  const entityB = params.entity_b as MatchSide;
  return [
    "## Match Follow-up",
    "",
    `- Match ID: ${params.match_id}`,
    `- Type: ${params.match_type}`,
    `- Confidence: ${params.confidence}% (${params.confidence_level})`,
    `- Side A: ${entityA.name}`,
    `- Side B: ${entityB.name}`,
    `- Summary: ${params.summary}`,
    `- Suggested action: ${params.suggested_action}`,
  ].join("\n");
}

async function maybeCreateFollowUpTask(
  params: StoreMatchParams,
): Promise<Record<string, unknown> | null> {
  if (!params.create_task) {
    return null;
  }

  const apiUrl = process.env.PAPERCLIP_API_URL?.trim();
  const apiKey = process.env.PAPERCLIP_API_KEY?.trim();
  const companyId = process.env.PAPERCLIP_COMPANY_ID?.trim();
  const parentId = process.env.PAPERCLIP_MATCHING_PARENT_ISSUE_ID?.trim();

  if (!apiUrl || !apiKey || !companyId || !parentId) {
    return {
      created: false,
      reason: "Paperclip follow-up env is incomplete",
    };
  }

  const headers = buildJsonHeaders(apiKey);
  if (process.env.PAPERCLIP_RUN_ID?.trim()) {
    headers["X-Paperclip-Run-Id"] = process.env.PAPERCLIP_RUN_ID.trim();
  }

  try {
    const parentIssue = requireRecord(
      await fetchJson(
        `${trimTrailingSlash(apiUrl)}/api/issues/${encodeURIComponent(parentId)}`,
        { headers },
        "store_match follow-up parent lookup failed",
      ),
      "store_match follow-up parent lookup",
    );

    const entityA = params.entity_a as MatchSide;
    const entityB = params.entity_b as MatchSide;

    const createdIssue = requireRecord(
      await fetchJson(
        `${trimTrailingSlash(apiUrl)}/api/companies/${encodeURIComponent(companyId)}/issues`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: `Follow-up: ${entityA.name} ↔ ${entityB.name}`,
            description: buildFollowUpIssueDescription(params),
            parentId,
            goalId: parentIssue.goalId,
            projectId: parentIssue.projectId,
            status: "in_review",
            priority: params.confidence_level === "HIGH" ? "high" : "medium",
          }),
        },
        "store_match follow-up issue create failed",
      ),
      "store_match follow-up issue",
    );

    return {
      created: true,
      id: createdIssue.id,
      identifier: createdIssue.identifier,
      title: createdIssue.title,
      url: maybeReadPaperclipIssueUrl(createdIssue),
    };
  } catch (error) {
    return {
      created: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildFeishuCard(
  params: SendFeishuCardParams,
): Record<string, unknown> {
  const header = requireRecord(params.header, "header");
  const rawMatches = Array.isArray(params.matches) ? params.matches : [];
  if (rawMatches.length === 0) {
    throw new Error("matches is required");
  }

  const elements: Record<string, unknown>[] = [];
  const matches = rawMatches as FeishuMatch[];

  if (params.card_type === "digest") {
    const summary = matches
      .map(
        (match, index) =>
          `${index + 1}. ${match.entity_a.name} ↔ ${match.entity_b.name} - ${match.match_type} - ${match.confidence}%`,
      )
      .join("\n");
    elements.push({
      tag: "markdown",
      content: summary,
    });
  } else {
    for (const [index, match] of matches.entries()) {
      const scoring = match.scoring_breakdown
        ? Object.entries(match.scoring_breakdown)
            .filter(([, value]) => typeof value === "number")
            .map(([label, value]) => `${label}: ${value}`)
            .join(", ")
        : "";

      const evidence =
        Array.isArray(match.source_evidence) && match.source_evidence.length > 0
          ? `\n**Evidence:** ${match.source_evidence.join("; ")}`
          : "";

      elements.push({
        tag: "markdown",
        content: [
          `**${match.entity_a.name}** (via ${match.entity_a.source_employee})`,
          match.entity_a.description,
          "",
          "↔",
          "",
          `**${match.entity_b.name}** (via ${match.entity_b.source_employee})`,
          match.entity_b.description,
          "",
          `**Type:** ${match.match_type}`,
          `**Confidence:** ${match.confidence}%`,
          scoring ? `**Scoring:** ${scoring}` : "",
          `**Suggestion:** ${match.suggested_action}${evidence}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      if (index < matches.length - 1) {
        elements.push({ tag: "hr" });
      }
    }
  }

  const buttonElements = (Array.isArray(params.buttons) ? params.buttons : [])
    .map((button) => {
      if (!button || typeof button !== "object") {
        return null;
      }
      const payload =
        button.payload &&
        typeof button.payload === "object" &&
        !Array.isArray(button.payload)
          ? (button.payload as Record<string, unknown>)
          : {};
      const url =
        typeof payload.url === "string"
          ? payload.url
          : typeof payload.href === "string"
            ? payload.href
            : undefined;

      if (!button.text || !button.action || !url) {
        return null;
      }

      return {
        tag: "button",
        type: button.action === "dismiss" ? "danger" : "primary",
        text: {
          tag: "plain_text",
          content: button.text,
        },
        multi_url: {
          url,
        },
      };
    })
    .filter((button): button is NonNullable<typeof button> => Boolean(button));

  if (buttonElements.length > 0) {
    elements.push({
      tag: "action",
      actions: buttonElements,
    });
  }

  return {
    schema: "2.0",
    config: {
      wide_screen_mode: true,
    },
    header: {
      title: {
        tag: "plain_text",
        content: requireNonEmptyString("header.title", header.title),
      },
      template:
        typeof header.template === "string" && header.template.length > 0
          ? header.template
          : params.card_type === "digest"
            ? "blue"
            : "green",
    },
    body: {
      elements,
    },
  };
}

async function executeGraphTraverse(
  _toolCallId: string,
  params: Record<string, unknown>,
): Promise<AgentToolResult> {
  const input = params as GraphTraverseParams;
  const startEntity = requireNonEmptyString("start_entity", input.start_entity);
  const relationTypes = normalizeStringArray(input.relation_types);
  const entityTypes = normalizeStringArray(input.entity_types);
  const hops = clampInteger(input.max_depth, 1, 3, 2);
  const maxResults = clampInteger(input.max_results, 1, 100, 50);

  const result = requireRecord(
    await fetchJson(
      `${resolveMimirBaseUrl()}/api/v1/graph/traverse`,
      {
        method: "POST",
        headers: buildJsonHeaders(resolveMimirApiKey()),
        body: JSON.stringify({
          entity_names: [startEntity],
          group_id: resolveMimirGroupId(),
          hops,
          max_results: maxResults,
          ...(relationTypes ? { relation_types: relationTypes } : {}),
          ...(entityTypes ? { entity_types: entityTypes } : {}),
        }),
      },
      "graph_traverse failed",
    ),
    "graph_traverse result",
  );

  return json({
    ok: true,
    query: {
      start_entity: startEntity,
      relation_types: relationTypes ?? [],
      entity_types: entityTypes ?? [],
      max_depth: hops,
      max_results: maxResults,
    },
    ...result,
  });
}

async function executeStoreMatch(
  _toolCallId: string,
  params: Record<string, unknown>,
): Promise<AgentToolResult> {
  const input = params as StoreMatchParams;
  const matchId = requireNonEmptyString("match_id", input.match_id);
  const matchType = requireNonEmptyString("match_type", input.match_type);
  const confidenceLevel = requireNonEmptyString(
    "confidence_level",
    input.confidence_level,
  ) as "HIGH" | "MEDIUM";
  const entityA = requireMatchSide(input.entity_a, "entity_a");
  const entityB = requireMatchSide(input.entity_b, "entity_b");

  if (
    typeof input.confidence !== "number" ||
    !Number.isFinite(input.confidence)
  ) {
    throw new Error("confidence is required");
  }
  requireNonEmptyString("summary", input.summary);
  requireNonEmptyString("suggested_action", input.suggested_action);

  const ingestResult = requireRecord(
    await fetchJson(
      `${resolveMimirBaseUrl()}/api/v1/ingest/note`,
      {
        method: "POST",
        headers: buildJsonHeaders(resolveMimirApiKey()),
        body: JSON.stringify({
          note_id: `match:${matchId}`,
          user_id: resolveMimirUserId(),
          group_id: resolveMimirGroupId(),
          content: buildMatchNoteContent(input),
          confidence: confidenceLevel,
          source: "agent_curated",
          timestamp: new Date().toISOString(),
        }),
      },
      "store_match failed",
    ),
    "store_match ingest result",
  );

  const finalIngestResult =
    typeof ingestResult.job_id === "string" && ingestResult.job_id
      ? await waitForIngestJob(ingestResult.job_id)
      : ingestResult;

  const relationCount = readRelationCount(finalIngestResult);
  if (relationCount < 1) {
    throw new Error(
      `store_match failed: no MATCH_FOUND relation was confirmed for ${entityA.name} and ${entityB.name}`,
    );
  }

  const followUpTask = await maybeCreateFollowUpTask({
    ...input,
    match_id: matchId,
    match_type: matchType as StoreMatchParams["match_type"],
    confidence_level: confidenceLevel,
    entity_a: entityA,
    entity_b: entityB,
  });

  return json({
    ok: true,
    match_id: matchId,
    match_type: matchType,
    stored: true,
    relation_count: relationCount,
    ingest: finalIngestResult,
    follow_up_task: followUpTask,
  });
}

async function getFeishuTenantAccessToken(): Promise<string> {
  const appId = requireNonEmptyString(
    "FEISHU_APP_ID",
    process.env.FEISHU_APP_ID,
  );
  const appSecret = requireNonEmptyString(
    "FEISHU_APP_SECRET",
    process.env.FEISHU_APP_SECRET,
  );

  const payload = requireRecord(
    await fetchJson(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: appId,
          app_secret: appSecret,
        }),
      },
      "send_feishu_card token request failed",
    ),
    "send_feishu_card token result",
  );

  const token =
    typeof payload.tenant_access_token === "string"
      ? payload.tenant_access_token
      : "";
  if ((typeof payload.code === "number" && payload.code !== 0) || !token) {
    throw new Error(
      `send_feishu_card token request returned no tenant_access_token${typeof payload.msg === "string" ? `: ${payload.msg}` : ""}`,
    );
  }
  return token;
}

async function executeSendFeishuCard(
  _toolCallId: string,
  params: Record<string, unknown>,
): Promise<AgentToolResult> {
  const input = params as SendFeishuCardParams;
  const chatId = requireNonEmptyString("chat_id", input.chat_id);
  const cardType = requireNonEmptyString("card_type", input.card_type) as
    | "immediate"
    | "digest";
  const card = buildFeishuCard({
    ...input,
    card_type: cardType,
    chat_id: chatId,
  });

  const token = await getFeishuTenantAccessToken();
  const sendResult = requireRecord(
    await fetchJson(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: "interactive",
          content: JSON.stringify(card),
        }),
      },
      "send_feishu_card send failed",
    ),
    "send_feishu_card send result",
  );

  const data =
    sendResult.data &&
    typeof sendResult.data === "object" &&
    !Array.isArray(sendResult.data)
      ? (sendResult.data as Record<string, unknown>)
      : null;
  if (
    (typeof sendResult.code === "number" && sendResult.code !== 0) ||
    !data?.message_id
  ) {
    throw new Error(
      `send_feishu_card send failed${typeof sendResult.msg === "string" ? `: ${sendResult.msg}` : ""}`,
    );
  }

  return json({
    ok: true,
    card_type: cardType,
    chat_id: chatId,
    message_id:
      typeof data?.message_id === "string" ? data.message_id : undefined,
    rendered_matches: Array.isArray(input.matches) ? input.matches.length : 0,
    card,
  });
}

const matchingAgentToolsPlugin = {
  id: MATCHING_AGENT_PLUGIN_ID,
  name: "Matching Agent Tools",
  description:
    "Workspace-local matching-agent tools for Mimir graph traversal, match storage, and Feishu cards",
  register(api: OpenClawPluginApi) {
    api.registerTool({
      name: "graph_traverse",
      description:
        "Filtered graph traversal via Mimir /api/v1/graph/traverse. Starts from an entity and follows relations of specified types, filtering by entity type. Used for all 6 match type analyses.",
      parameters: GRAPH_TRAVERSE_SCHEMA,
      execute: executeGraphTraverse,
    });

    api.registerTool({
      name: "store_match",
      description:
        "Persist a MATCH_FOUND relation in Mimir. Dashboard-facing Paperclip result issues are written separately under PAPERCLIP_MATCHING_PARENT_ISSUE_ID after this tool succeeds.",
      parameters: STORE_MATCH_SCHEMA,
      execute: executeStoreMatch,
    });

    api.registerTool({
      name: "send_feishu_card",
      description:
        "Send an interactive card to the SSG Feishu group chat. Payload must conform to contracts/feishu-notify.schema.json. Used for HIGH-confidence immediate notifications only.",
      parameters: SEND_FEISHU_CARD_SCHEMA,
      execute: executeSendFeishuCard,
    });
  },
};

export default matchingAgentToolsPlugin;
