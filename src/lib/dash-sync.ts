import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase";

export const runtime = "nodejs";

type DashSyncAction = "upsert_project" | "upsert_sourcing" | "upsert_match";
type JsonRecord = Record<string, Json | undefined>;

interface DashSyncRequest {
  action: DashSyncAction;
  mimir_entity_id: string;
  data: Record<string, unknown>;
}

interface ProjectPayload {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
  status: string;
  founder_name: string | null;
  founder_contact: string | null;
  description: string | null;
  source: string | null;
  metadata: JsonRecord;
}

interface SourcingPayload {
  id: string;
  project_id: string | null;
  platform: string;
  url: string | null;
  title: string | null;
  summary: string | null;
  raw_data: JsonRecord;
  sourced_at?: string;
}

interface MatchPayload {
  id: string;
  project_id: string | null;
  match_type: string | null;
  confidence_score: number | null;
  rationale: string | null;
  matched_with: string | null;
  status: string;
  metadata: JsonRecord;
}

export const DEFAULT_DASH_SYNC_UUID_NAMESPACE =
  "7f568a80-7a1b-4b88-8f2d-2c46d8b0c6c0";

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function successResponse(result: Record<string, unknown>, status = 200) {
  return jsonResponse(
    {
      status: "ok",
      result,
    },
    status,
  );
}

function errorResponse(status: number, code: string, message: string) {
  return jsonResponse(
    {
      status: "error",
      error: {
        code,
        message,
      },
    },
    status,
  );
}

function asRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function asJsonRecord(value: unknown, fieldName: string): JsonRecord {
  if (value === undefined) {
    return {};
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object.`);
  }

  return value as JsonRecord;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireString(fieldName: string, value: unknown): string {
  const normalized = asString(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function asIsoTimestamp(value: unknown): string | undefined {
  const normalized = asString(value);
  if (!normalized) {
    return undefined;
  }

  const timestamp = new Date(normalized);
  if (Number.isNaN(timestamp.getTime())) {
    return undefined;
  }

  return timestamp.toISOString();
}

function normalizeConfidenceScore(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const ratio = parsed > 1 ? parsed / 100 : parsed;
  const clamped = Math.max(0, Math.min(1, ratio));

  return Math.round(clamped * 100) / 100;
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

function matchesSecret(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function assertAuthorized(request: Request) {
  const expectedToken = getRequiredEnv("DASH_SYNC_API_KEY");
  const actualToken = getBearerToken(request);

  if (!actualToken || !matchesSecret(expectedToken, actualToken)) {
    throw new Error("Unauthorized");
  }
}

function uuidToBytes(value: string): Buffer {
  const normalized = value.trim().toLowerCase();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      normalized,
    )
  ) {
    throw new Error("DASH_SYNC_UUID_NAMESPACE must be a valid UUID.");
  }

  return Buffer.from(normalized.replace(/-/g, ""), "hex");
}

function bytesToUuid(value: Uint8Array): string {
  const hex = Buffer.from(value).toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function getUuidNamespace(): string {
  return process.env.DASH_SYNC_UUID_NAMESPACE?.trim() || DEFAULT_DASH_SYNC_UUID_NAMESPACE;
}

export function createDeterministicUuid(namespace: string, name: string): string {
  const namespaceBytes = uuidToBytes(namespace);
  const hash = createHash("sha1")
    .update(namespaceBytes)
    .update(name, "utf8")
    .digest();

  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  return bytesToUuid(hash.subarray(0, 16));
}

function createDashSyncId(mimirEntityId: string): string {
  return createDeterministicUuid(getUuidNamespace(), mimirEntityId);
}

function createAutoProjectId(projectName: string): string {
  return createDeterministicUuid(
    getUuidNamespace(),
    `project:${projectName.trim().toLowerCase()}`,
  );
}

function createServiceRoleClient(): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be configured.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function upsertRow(
  supabase: SupabaseClient,
  table: "projects" | "sourcing_results" | "matches",
  payload: ProjectPayload | SourcingPayload | MatchPayload,
) {
  const { error } = await supabase.from(table).upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(`Supabase ${table} upsert failed: ${error.message}`);
  }
}

async function findProjectIdByName(
  supabase: SupabaseClient,
  projectName: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("name", projectName)
    .limit(1);

  if (error) {
    throw new Error(`Supabase projects lookup failed: ${error.message}`);
  }

  const firstRow =
    Array.isArray(data) && data.length > 0
      ? (data[0] as { id?: unknown })
      : null;

  return typeof firstRow?.id === "string" ? firstRow.id : null;
}

async function resolveProjectId(
  supabase: SupabaseClient,
  action: DashSyncAction,
  data: Record<string, unknown>,
): Promise<{ projectId: string | null; autoCreated: boolean }> {
  const projectId = asString(data.project_id);
  if (projectId) {
    return { projectId, autoCreated: false };
  }

  const projectName = asString(data.project_name);
  if (!projectName) {
    return { projectId: null, autoCreated: false };
  }

  const existingProjectId = await findProjectIdByName(supabase, projectName);
  if (existingProjectId) {
    return { projectId: existingProjectId, autoCreated: false };
  }

  const rawData = asRecord(data.raw_data ?? {}, "data.raw_data");
  const autoCreatedProjectId = createAutoProjectId(projectName);
  const projectRow: ProjectPayload = {
    id: autoCreatedProjectId,
    name: projectName,
    industry: asString(data.industry) ?? asString(rawData.domain),
    stage: asString(data.stage) ?? asString(rawData.stage),
    status: asString(data.project_status) ?? "active",
    founder_name: asString(data.founder_name),
    founder_contact: asString(data.founder_contact),
    description: asString(data.description) ?? asString(data.summary),
    source: "dash_sync:auto_create",
    metadata: {
      auto_created: true,
      created_from_action: action,
    },
  };

  await upsertRow(supabase, "projects", projectRow);

  return { projectId: autoCreatedProjectId, autoCreated: true };
}

function parseRequestBody(body: unknown): DashSyncRequest {
  const payload = asRecord(body, "body");
  const action = requireString("action", payload.action);

  if (
    action !== "upsert_project" &&
    action !== "upsert_sourcing" &&
    action !== "upsert_match"
  ) {
    throw new Error("action must be one of upsert_project, upsert_sourcing, upsert_match.");
  }

  return {
    action,
    mimir_entity_id: requireString("mimir_entity_id", payload.mimir_entity_id),
    data: asRecord(payload.data, "data"),
  };
}

function buildProjectPayload(
  id: string,
  data: Record<string, unknown>,
): ProjectPayload {
  return {
    id,
    name: requireString("data.name", data.name),
    industry: asString(data.industry),
    stage: asString(data.stage),
    status: asString(data.status) ?? "active",
    founder_name: asString(data.founder_name),
    founder_contact: asString(data.founder_contact),
    description: asString(data.description),
    source: asString(data.source) ?? "dash_sync",
    metadata: asJsonRecord(data.metadata, "data.metadata"),
  };
}

function buildSourcingPayload(
  id: string,
  projectId: string | null,
  data: Record<string, unknown>,
): SourcingPayload {
  return {
    id,
    project_id: projectId,
    platform: requireString("data.platform", data.platform),
    url: asString(data.url),
    title: asString(data.title),
    summary: asString(data.summary),
    raw_data: asJsonRecord(data.raw_data, "data.raw_data"),
    sourced_at: asIsoTimestamp(data.sourced_at),
  };
}

function buildMatchPayload(
  id: string,
  projectId: string | null,
  data: Record<string, unknown>,
): MatchPayload {
  return {
    id,
    project_id: projectId,
    match_type: asString(data.match_type),
    confidence_score: normalizeConfidenceScore(
      data.confidence_score ?? data.confidence,
    ),
    rationale: asString(data.rationale),
    matched_with: asString(data.matched_with),
    status: asString(data.status) ?? "pending",
    metadata: asJsonRecord(data.metadata, "data.metadata"),
  };
}

async function handleDashSync(
  supabase: SupabaseClient,
  payload: DashSyncRequest,
) {
  const id = createDashSyncId(payload.mimir_entity_id);

  switch (payload.action) {
    case "upsert_project": {
      const projectPayload = buildProjectPayload(id, payload.data);
      await upsertRow(supabase, "projects", projectPayload);

      return {
        action: payload.action,
        table: "projects",
        id,
        project_id: id,
        auto_created_project: false,
      };
    }

    case "upsert_sourcing": {
      if (!asString(payload.data.project_id) && !asString(payload.data.project_name)) {
        throw new Error("data.project_id or data.project_name is required for upsert_sourcing.");
      }

      const { projectId, autoCreated } = await resolveProjectId(
        supabase,
        payload.action,
        payload.data,
      );
      const sourcingPayload = buildSourcingPayload(id, projectId, payload.data);
      await upsertRow(supabase, "sourcing_results", sourcingPayload);

      return {
        action: payload.action,
        table: "sourcing_results",
        id,
        project_id: projectId,
        auto_created_project: autoCreated,
      };
    }

    case "upsert_match": {
      const { projectId, autoCreated } = await resolveProjectId(
        supabase,
        payload.action,
        payload.data,
      );
      const matchPayload = buildMatchPayload(id, projectId, payload.data);
      await upsertRow(supabase, "matches", matchPayload);

      return {
        action: payload.action,
        table: "matches",
        id,
        project_id: projectId,
        auto_created_project: autoCreated,
      };
    }
  }
}

export async function POST(request: Request) {
  try {
    assertAuthorized(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    if (message === "Unauthorized") {
      return errorResponse(401, "unauthorized", "Bearer token is invalid or missing.");
    }

    return errorResponse(500, "server_not_configured", message);
  }

  let payload: DashSyncRequest;

  try {
    payload = parseRequestBody(await request.json());
  } catch (error) {
    return errorResponse(
      400,
      "invalid_request",
      error instanceof Error ? error.message : "Request body is invalid.",
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const result = await handleDashSync(supabase, payload);

    return successResponse(result);
  } catch (error) {
    return errorResponse(
      500,
      "dash_sync_failed",
      error instanceof Error ? error.message : "Dash sync failed.",
    );
  }
}
