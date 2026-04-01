import {
  getSupabaseClient,
  hasSupabaseCredentials,
  type MatchRow,
  type PortfolioItemRow,
  type ProjectRow,
  type SourcingResultRow,
} from "./supabase";
import type { Match, Project, SourcingResult } from "./types";

const DEFAULT_QUERY_LIMIT = 100;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => asString(entry))
      .filter((entry): entry is string => Boolean(entry));
  }

  const single = asString(value);
  return single ? [single] : [];
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

function getDaysSince(value: string): number {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function normalizePercent(value: unknown): number {
  const number = asNumber(value);
  if (number === undefined) {
    return 0;
  }

  if (number >= 0 && number <= 1) {
    return Math.round(number * 100);
  }

  return Math.max(0, Math.round(number));
}

function mapBusinessProjectStatus(
  stage: string | null,
  status: string,
): Project["status"] {
  const normalized = `${status} ${stage ?? ""}`.toLowerCase();

  if (
    normalized.includes("exit") ||
    normalized.includes("archiv") ||
    normalized.includes("closed")
  ) {
    return "exit";
  }

  if (
    normalized.includes("accelerat") ||
    normalized.includes("portfolio") ||
    normalized.includes("post-invest")
  ) {
    return "acceleration";
  }

  if (
    normalized.includes("decision") ||
    normalized.includes("committee") ||
    normalized.includes("term")
  ) {
    return "decision";
  }

  if (
    normalized.includes("diligence") ||
    normalized.includes("review") ||
    normalized.includes("active")
  ) {
    return "diligence";
  }

  return "contact";
}

function mapBusinessProjectPriority(
  status: string,
  nextFollowUpAt: string | null,
): Project["priority"] {
  if (nextFollowUpAt) {
    const diffDays =
      (new Date(nextFollowUpAt).getTime() - Date.now()) / 86_400_000;

    if (diffDays <= 1) {
      return "critical";
    }

    if (diffDays <= 7) {
      return "high";
    }

    if (diffDays <= 21) {
      return "medium";
    }
  }

  return status.toLowerCase() === "active" ? "high" : "medium";
}

function mapBusinessProjectHealth(
  status: string,
  nextFollowUpAt: string | null,
): Project["healthStatus"] {
  const normalized = status.toLowerCase();

  if (nextFollowUpAt && new Date(nextFollowUpAt).getTime() < Date.now()) {
    return "overdue";
  }

  if (normalized === "paused" || normalized === "blocked") {
    return "at-risk";
  }

  if (normalized === "active") {
    return "on-track";
  }

  return "needs-attention";
}

function mapSourcingStatus(value: unknown): SourcingResult["status"] {
  switch (value) {
    case "reviewed":
    case "converted":
    case "dismissed":
      return value;
    default:
      return "new";
  }
}

function mapMatchType(value: unknown): Match["type"] {
  switch (value) {
    case "supply-demand":
    case "resource":
    case "talent":
    case "investor":
    case "cross-project":
    case "mentor":
      return value;
    default:
      return "resource";
  }
}

function mapMatchStatus(value: unknown): Match["status"] {
  switch (value) {
    case "accepted":
    case "dismissed":
      return value;
    default:
      return "pending";
  }
}

async function getProjectMap(
  projectIds: string[],
): Promise<Map<string, ProjectRow>> {
  if (projectIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .in("id", projectIds);

  if (error) {
    throw new Error(`Supabase projects query failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as ProjectRow[];
  return new Map(rows.map((project) => [project.id, project]));
}

async function getPortfolioItemMap(
  projectIds: string[],
): Promise<Map<string, PortfolioItemRow>> {
  if (projectIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .in("project_id", projectIds)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Supabase portfolio query failed: ${error.message}`);
  }

  const items = (data ?? []) as unknown as PortfolioItemRow[];
  const portfolioItemMap = new Map<string, PortfolioItemRow>();

  for (const item of items) {
    if (item.project_id && !portfolioItemMap.has(item.project_id)) {
      portfolioItemMap.set(item.project_id, item);
    }
  }

  return portfolioItemMap;
}

function mapBusinessProject(
  project: ProjectRow,
  portfolioItem: PortfolioItemRow | null,
): Project {
  const metadata = asRecord(project.metadata);
  const portfolioMetadata = asRecord(portfolioItem?.metadata);
  const nextFollowUpAt =
    portfolioItem?.next_followup_at ??
    asString(metadata?.nextFollowUpAt) ??
    asString(portfolioMetadata?.nextFollowUpAt) ??
    null;
  const tags = uniqueStrings([
    project.industry,
    project.stage,
    project.source,
    ...asStringArray(metadata?.tags),
    ...asStringArray(portfolioMetadata?.tags),
  ]);

  return {
    id: project.id,
    title: project.name,
    description:
      project.description ??
      asString(metadata?.summary) ??
      "No company description yet.",
    status: mapBusinessProjectStatus(project.stage, project.status),
    priority: mapBusinessProjectPriority(project.status, nextFollowUpAt),
    assigneeEmployee:
      asString(metadata?.owner) ??
      asString(portfolioMetadata?.owner) ??
      "Unassigned",
    founderName:
      project.founder_name ??
      asString(metadata?.founderName) ??
      "Unknown founder",
    companyName: project.name,
    stage: project.stage ?? asString(metadata?.stage) ?? project.status,
    daysInStage: getDaysSince(project.updated_at),
    healthStatus: mapBusinessProjectHealth(project.status, nextFollowUpAt),
    lastActivity: portfolioItem?.updated_at ?? project.updated_at,
    nextFollowUp: nextFollowUpAt ?? undefined,
    tags,
  };
}

function mapSourcingResult(
  row: SourcingResultRow,
  project: ProjectRow | null,
): SourcingResult {
  const raw = asRecord(row.raw_data);
  const contact = asRecord(raw?.contact);
  const projectMetadata = asRecord(project?.metadata);
  const sources = uniqueStrings([
    ...asStringArray(raw?.sources),
    row.platform,
    asString(raw?.source),
  ]);

  return {
    id: row.id,
    founderName:
      project?.founder_name ??
      asString(raw?.founderName) ??
      asString(contact?.name) ??
      "Unknown founder",
    companyName:
      project?.name ??
      asString(raw?.companyName) ??
      row.title ??
      "Unknown company",
    domain: asString(raw?.domain) ?? project?.industry ?? row.platform,
    stage:
      asString(raw?.stage) ??
      project?.stage ??
      asString(projectMetadata?.stage) ??
      "Unknown",
    relevanceScore: normalizePercent(raw?.relevanceScore ?? raw?.score),
    sources: sources.length > 0 ? sources : ["Supabase"],
    contactEmail:
      asString(raw?.contactEmail) ??
      asString(contact?.email) ??
      project?.founder_contact ??
      undefined,
    contactTwitter:
      asString(raw?.contactTwitter) ?? asString(contact?.twitter) ?? undefined,
    contactLinkedin:
      asString(raw?.contactLinkedin) ??
      asString(contact?.linkedin) ??
      undefined,
    matchReason:
      row.summary ??
      asString(raw?.matchReason) ??
      asString(raw?.summary) ??
      "No sourcing summary provided.",
    createdAt: row.sourced_at ?? row.created_at,
    status: mapSourcingStatus(raw?.status),
    requestedBy:
      asString(raw?.requestedBy) ??
      asString(projectMetadata?.requestedBy) ??
      row.platform,
  };
}

function mapMatchResult(row: MatchRow, project: ProjectRow | null): Match {
  const metadata = asRecord(row.metadata);
  const sideA = asRecord(metadata?.sideA);
  const sideB = asRecord(metadata?.sideB);

  return {
    id: row.id,
    type: mapMatchType(row.match_type ?? metadata?.type),
    confidence: normalizePercent(
      row.confidence_score ?? metadata?.confidenceScore ?? metadata?.confidence,
    ),
    sideA: {
      entity: asString(sideA?.entity) ?? project?.name ?? "Unknown entity",
      description: asString(sideA?.description) ?? project?.description ?? "",
      sourceEmployee:
        asString(sideA?.sourceEmployee) ??
        asString(metadata?.requestedBy) ??
        "SSG Lab",
    },
    sideB: {
      entity:
        asString(sideB?.entity) ??
        row.matched_with ??
        asString(metadata?.matchedWith) ??
        "Unknown match",
      description:
        asString(sideB?.description) ??
        asString(metadata?.matchedDescription) ??
        "",
      sourceEmployee:
        asString(sideB?.sourceEmployee) ??
        asString(metadata?.matchedBy) ??
        "SSG Lab",
    },
    suggestion:
      row.rationale ??
      asString(metadata?.suggestion) ??
      "No match rationale provided.",
    status: mapMatchStatus(row.status ?? metadata?.status),
    createdAt: row.created_at,
  };
}

export async function getBusinessProjects(): Promise<Project[]> {
  if (!hasSupabaseCredentials()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(DEFAULT_QUERY_LIMIT);

  if (error) {
    throw new Error(`Supabase projects query failed: ${error.message}`);
  }

  const projects = (data ?? []) as unknown as ProjectRow[];
  const portfolioItemMap = await getPortfolioItemMap(
    projects.map((project) => project.id),
  );

  return projects.map((project) =>
    mapBusinessProject(project, portfolioItemMap.get(project.id) ?? null),
  );
}

export async function getSourcingResults(): Promise<SourcingResult[]> {
  if (!hasSupabaseCredentials()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sourcing_results")
    .select("*")
    .order("sourced_at", { ascending: false })
    .limit(DEFAULT_QUERY_LIMIT);

  if (error) {
    throw new Error(`Supabase sourcing query failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as SourcingResultRow[];
  const projectMap = await getProjectMap(
    uniqueStrings(rows.map((row) => row.project_id)),
  );

  return rows.map((row) =>
    mapSourcingResult(row, projectMap.get(row.project_id ?? "") ?? null),
  );
}

export async function getMatches(): Promise<Match[]> {
  if (!hasSupabaseCredentials()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(DEFAULT_QUERY_LIMIT);

  if (error) {
    throw new Error(`Supabase matches query failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as MatchRow[];
  const projectMap = await getProjectMap(
    uniqueStrings(rows.map((row) => row.project_id)),
  );

  return rows.map((row) =>
    mapMatchResult(row, projectMap.get(row.project_id ?? "") ?? null),
  );
}
