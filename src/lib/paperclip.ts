import type {
  Agent,
  AgentCostBreakdown,
  DashboardStats,
  Employee,
  HeartbeatRun,
  Project,
  WorkItem,
} from "./types";
import {
  getBusinessProjects,
  getMatches as getSupabaseMatches,
  getSourcingResults as getSupabaseSourcingResults,
} from "./business-data";
import { createReactiveTelemetryId } from "./dash-sync";
import {
  compareHeartbeatRunsDesc,
  getHeartbeatRunActivityAt,
  hasStartedHeartbeatRun,
  isCompletedHeartbeatRunStatus,
  mapHeartbeatRunStatus,
  type RawHeartbeatRunStatus,
} from "./heartbeat-runs";
import {
  getSupabaseClient,
  hasSupabaseCredentials,
  type PortfolioItemRow,
} from "./supabase";

const API_URL = process.env.PAPERCLIP_API_URL || "http://localhost:3000";
const API_KEY = process.env.PAPERCLIP_API_KEY || "";
const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID || "";
const DEFAULT_REVALIDATE_SECONDS = 30;
const DEFAULT_HEARTBEAT_RUN_LIMIT = 100;

interface FetchPaperclipOptions {
  revalidateSeconds?: number;
}

interface CursorPage<T> {
  data: T[];
  nextCursor?: string | null;
}

interface PaperclipCompanyDashboard {
  agents: {
    active: number;
    running: number;
    paused: number;
    error: number;
  };
  tasks: {
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
}

interface PaperclipAgent {
  id: string;
  name: string;
  urlKey?: string;
  role: string;
  status: Agent["status"];
  title?: string | null;
  lastHeartbeatAt?: string | null;
  runtimeConfig?: {
    heartbeat?: {
      intervalSec?: number;
    };
  };
}

interface PaperclipProject {
  id: string;
  name: string;
  description: string;
  status: string;
  targetDate?: string | null;
  updatedAt: string;
  leadAgentId?: string | null;
  goals?: Array<{ title: string }>;
}

interface PaperclipIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  status: WorkItem["status"];
  priority: WorkItem["priority"];
  assigneeAgentId?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  parentId?: string | null;
}

interface PaperclipHeartbeatRun {
  id: string;
  agentId: string;
  status: RawHeartbeatRunStatus;
  startedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  usageJson?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
  } | null;
  resultJson?: {
    result?: string;
  } | null;
}

interface PaperclipCostByAgent {
  agentId: string;
  agentName: string;
  agentStatus: Agent["status"];
  costCents: number;
  inputTokens: number;
  outputTokens: number;
  subscriptionRunCount: number;
}

interface ReactiveAgentTelemetry {
  agentUrlKey: string;
  lastActivityAt: string;
  channel?: string;
}

async function fetchPaperclip<T>(
  path: string,
  options: FetchPaperclipOptions = {}
): Promise<T> {
  if (!API_KEY || !COMPANY_ID) {
    throw new Error("Paperclip environment variables are not configured.");
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    next: {
      revalidate: options.revalidateSeconds ?? DEFAULT_REVALIDATE_SECONDS,
    },
  });
  if (!res.ok) {
    throw new Error(`Paperclip API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function isCursorPage<T>(value: unknown): value is CursorPage<T> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "data" in value &&
      Array.isArray((value as CursorPage<T>).data)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getAgentUrlKey(agent: Pick<PaperclipAgent, "name" | "id" | "urlKey">): string {
  const explicit = asNonEmptyString(agent.urlKey);
  if (explicit) {
    return explicit;
  }

  const normalized = agent.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || agent.id;
}

function pickLatestIsoTimestamp(...values: Array<string | null | undefined>): string | undefined {
  let latest: string | undefined;
  let latestMs = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    if (!value) {
      continue;
    }

    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= latestMs) {
      continue;
    }

    latest = value;
    latestMs = timestamp;
  }

  return latest;
}

function mapReactiveTelemetrySummary(telemetry: ReactiveAgentTelemetry): string {
  const channelLabel = telemetry.channel ? telemetry.channel.toUpperCase() : "reactive";
  return `${channelLabel} message received`;
}

async function getReactiveAgentTelemetry(
  agents: Array<Pick<PaperclipAgent, "id" | "name" | "urlKey">>
): Promise<Map<string, ReactiveAgentTelemetry>> {
  if (!hasSupabaseCredentials() || agents.length === 0) {
    return new Map();
  }

  const telemetryIds = agents.map((agent) => createReactiveTelemetryId(getAgentUrlKey(agent)));
  const { data, error } = await getSupabaseClient()
    .from("portfolio_items")
    .select("*")
    .in("id", telemetryIds);

  if (error) {
    throw new Error(`Supabase reactive telemetry query failed: ${error.message}`);
  }

  const telemetry = new Map<string, ReactiveAgentTelemetry>();
  for (const row of (data ?? []) as PortfolioItemRow[]) {
    const metadata = asRecord(row.metadata);
    if (metadata?.kind !== "agent_reactive_telemetry") {
      continue;
    }

    const agentUrlKey = asNonEmptyString(metadata.agent_url_key);
    const lastActivityAt = asNonEmptyString(row.last_activity);
    if (!agentUrlKey || !lastActivityAt) {
      continue;
    }

    telemetry.set(agentUrlKey, {
      agentUrlKey,
      lastActivityAt,
      channel: asNonEmptyString(metadata.channel),
    });
  }

  return telemetry;
}

export async function fetchPaperclipPaginated<T>(
  path: string,
  options: FetchPaperclipOptions = {}
): Promise<T[]> {
  let cursor: string | null = null;
  const results: T[] = [];

  while (true) {
    const params = new URLSearchParams();
    params.set("limit", "100");
    if (cursor) {
      params.set("cursor", cursor);
    }

    const separator = path.includes("?") ? "&" : "?";
    const page = await fetchPaperclip<CursorPage<T> | T[]>(
      `${path}${separator}${params.toString()}`,
      options
    );

    if (Array.isArray(page)) {
      results.push(...page);
      break;
    }

    if (!isCursorPage<T>(page)) {
      break;
    }

    results.push(...page.data);
    if (!page.nextCursor) {
      break;
    }

    cursor = page.nextCursor;
  }

  return results;
}

function formatRunSummary(run: PaperclipHeartbeatRun): string {
  const result = run.resultJson?.result?.trim();
  if (result) {
    return result.split("\n")[0];
  }

  const error = run.error?.trim();
  if (error) {
    return error.split("\n")[0];
  }

  if (run.status === "running") {
    return "Heartbeat in progress";
  }

  return run.status;
}

function getRunTokenUsage(run: PaperclipHeartbeatRun): number {
  return (run.usageJson?.inputTokens ?? 0) + (run.usageJson?.outputTokens ?? 0);
}

function mapProjectStatus(status: string): Project["status"] {
  switch (status) {
    case "in_progress":
      return "diligence";
    case "done":
    case "archived":
      return "exit";
    case "paused":
      return "decision";
    default:
      return "contact";
  }
}

function mapProjectPriority(targetDate?: string | null): Project["priority"] {
  if (!targetDate) {
    return "medium";
  }

  const diffMs = new Date(targetDate).getTime() - Date.now();
  const diffDays = diffMs / 86_400_000;

  if (diffDays <= 7) {
    return "critical";
  }
  if (diffDays <= 21) {
    return "high";
  }

  return "medium";
}

function mapProjectHealth(status: string, targetDate?: string | null): Project["healthStatus"] {
  if (status === "paused") {
    return "at-risk";
  }
  if (targetDate && new Date(targetDate).getTime() < Date.now() && status !== "done") {
    return "overdue";
  }
  if (status === "planned") {
    return "needs-attention";
  }

  return "on-track";
}

async function getRawAgents(revalidateSeconds = DEFAULT_REVALIDATE_SECONDS): Promise<PaperclipAgent[]> {
  return fetchPaperclip<PaperclipAgent[]>(`/api/companies/${COMPANY_ID}/agents`, {
    revalidateSeconds,
  });
}

async function getRawProjects(
  revalidateSeconds = DEFAULT_REVALIDATE_SECONDS
): Promise<PaperclipProject[]> {
  return fetchPaperclip<PaperclipProject[]>(`/api/companies/${COMPANY_ID}/projects`, {
    revalidateSeconds,
  });
}

export async function getProjectWorkItems(
  projectId: string,
  revalidateSeconds = DEFAULT_REVALIDATE_SECONDS
): Promise<WorkItem[]> {
  const [issues, agents] = await Promise.all([
    fetchPaperclip<PaperclipIssue[]>(`/api/companies/${COMPANY_ID}/issues?projectId=${projectId}`, {
      revalidateSeconds,
    }),
    getRawAgents(revalidateSeconds),
  ]);
  const agentNames = new Map(agents.map((agent) => [agent.id, agent.name]));

  return issues
    .map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      assigneeName: agentNames.get(issue.assigneeAgentId ?? "") ?? "Unassigned",
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      startedAt: issue.startedAt,
      parentId: issue.parentId ?? null,
    }))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export async function getHeartbeatRuns(
  limit = DEFAULT_HEARTBEAT_RUN_LIMIT,
  revalidateSeconds = DEFAULT_REVALIDATE_SECONDS
): Promise<HeartbeatRun[]> {
  const [runs, agents] = await Promise.all([
    fetchPaperclip<PaperclipHeartbeatRun[]>(
      `/api/companies/${COMPANY_ID}/heartbeat-runs?limit=${limit}`,
      { revalidateSeconds }
    ),
    getRawAgents(revalidateSeconds),
  ]);
  const reactiveTelemetry = await getReactiveAgentTelemetry(agents);
  const agentNames = new Map(agents.map((agent) => [agent.id, agent.name]));
  const reactiveRuns = agents.flatMap((agent) => {
    const telemetry = reactiveTelemetry.get(getAgentUrlKey(agent));
    if (!telemetry) {
      return [];
    }

    return [
      {
        id: createReactiveTelemetryId(getAgentUrlKey(agent)),
        agentId: agent.id,
        agentName: agent.name,
        status: "succeeded" as const,
        startedAt: undefined,
        activityAt: telemetry.lastActivityAt,
        completedAt: undefined,
        summary: mapReactiveTelemetrySummary(telemetry),
        tokenUsage: 0,
      },
    ];
  });

  return [...runs
    .map((run) => ({
      id: run.id,
      agentId: run.agentId,
      agentName: agentNames.get(run.agentId) ?? "Unknown Agent",
      status: mapHeartbeatRunStatus(run.status),
      startedAt: run.startedAt ?? undefined,
      activityAt: getHeartbeatRunActivityAt(run),
      completedAt: run.finishedAt ?? undefined,
      summary: formatRunSummary(run),
      tokenUsage: getRunTokenUsage(run),
    }))
    , ...reactiveRuns]
    .sort(compareHeartbeatRunsDesc);
}

export async function getAgentCosts(
  revalidateSeconds = DEFAULT_REVALIDATE_SECONDS
): Promise<AgentCostBreakdown[]> {
  const costs = await fetchPaperclip<PaperclipCostByAgent[]>(
    `/api/companies/${COMPANY_ID}/costs/by-agent`,
    { revalidateSeconds }
  );

  return costs.map((entry) => ({
    agentId: entry.agentId,
    agentName: entry.agentName,
    agentStatus: entry.agentStatus,
    costCents: entry.costCents,
    totalTokens: entry.inputTokens + entry.outputTokens,
    runCount: entry.subscriptionRunCount,
  }));
}

export async function getAgents(
  revalidateSeconds = DEFAULT_REVALIDATE_SECONDS
): Promise<Agent[]> {
  const agents = await getRawAgents(revalidateSeconds);
  const [runs, costs, reactiveTelemetry] = await Promise.all([
    getHeartbeatRuns(DEFAULT_HEARTBEAT_RUN_LIMIT, revalidateSeconds),
    getAgentCosts(revalidateSeconds),
    getReactiveAgentTelemetry(agents),
  ]);
  const costByAgent = new Map(costs.map((entry) => [entry.agentId, entry]));
  const now = new Date();

  return agents
    .map((agent) => {
      const agentRuns = runs.filter((run) => run.agentId === agent.id);
      const latestStartedRun = agentRuns.find(hasStartedHeartbeatRun);
      const todayRuns = agentRuns.filter((run) => {
        if (!hasStartedHeartbeatRun(run)) {
          return false;
        }

        const startedAt = new Date(run.startedAt);
        return (
          startedAt.getFullYear() === now.getFullYear() &&
          startedAt.getMonth() === now.getMonth() &&
          startedAt.getDate() === now.getDate()
        );
      });
      const intervalSec = agent.runtimeConfig?.heartbeat?.intervalSec ?? null;
      const nextHeartbeat =
        latestStartedRun?.startedAt && intervalSec
          ? new Date(new Date(latestStartedRun.startedAt).getTime() + intervalSec * 1000).toISOString()
          : undefined;
      const lastReactiveActivityAt =
        reactiveTelemetry.get(getAgentUrlKey(agent))?.lastActivityAt;

      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        adapterType: agent.title ?? agent.role,
        lastHeartbeat: pickLatestIsoTimestamp(
          latestStartedRun?.startedAt,
          agent.lastHeartbeatAt ?? undefined,
          lastReactiveActivityAt,
        ),
        nextHeartbeat,
        todayRuns: todayRuns.length,
        tokenUsageToday: todayRuns.reduce((sum, run) => sum + run.tokenUsage, 0),
        monthlyRunCount: costByAgent.get(agent.id)?.runCount ?? 0,
      };
    })
    .sort((left, right) => {
      if (left.status === "running" && right.status !== "running") {
        return -1;
      }
      if (left.status !== "running" && right.status === "running") {
        return 1;
      }
      return right.todayRuns - left.todayRuns;
    }) as Agent[];
}

export async function getProjects(): Promise<Project[]> {
  const projects = await getRawProjects(DEFAULT_REVALIDATE_SECONDS);

  return projects
    .map((project) => ({
      id: project.id,
      title: project.name,
      description: project.description,
      status: mapProjectStatus(project.status),
      priority: mapProjectPriority(project.targetDate),
      assigneeEmployee: "Unassigned",
      founderName: "",
      companyName: project.name,
      stage: project.status,
      daysInStage: Math.max(
        0,
        Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / 86_400_000)
      ),
      healthStatus: mapProjectHealth(project.status, project.targetDate),
      lastActivity: project.updatedAt,
      nextFollowUp: project.targetDate ?? undefined,
      tags: project.goals?.map((goal) => goal.title) ?? [],
    }))
    .sort((left, right) => new Date(right.lastActivity).getTime() - new Date(left.lastActivity).getTime());
}

export { getBusinessProjects };

export async function getSourcingResults() {
  return getSupabaseSourcingResults();
}

export async function getMatches() {
  return getSupabaseMatches();
}

export async function getEmployees(): Promise<Employee[]> {
  const [agents, runs, projects, ssgProject] = await Promise.all([
    getRawAgents(DEFAULT_REVALIDATE_SECONDS),
    getHeartbeatRuns(DEFAULT_HEARTBEAT_RUN_LIMIT, DEFAULT_REVALIDATE_SECONDS),
    getRawProjects(DEFAULT_REVALIDATE_SECONDS),
    getRawProjects(DEFAULT_REVALIDATE_SECONDS).then(
      (items) => items.find((project) => project.name === "SSG Lab") ?? null
    ),
  ]);

  const workItems = ssgProject
    ? await getProjectWorkItems(ssgProject.id, DEFAULT_REVALIDATE_SECONDS)
    : [];
  const weekAgo = Date.now() - 7 * 86_400_000;

  return agents
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.title ?? agent.role,
      inputsThisWeek: runs.filter(
        (run) =>
          run.agentId === agent.id &&
          hasStartedHeartbeatRun(run) &&
          new Date(run.startedAt).getTime() >= weekAgo
      ).length,
      projectsOwned:
        projects.filter((project) => project.leadAgentId === agent.id).length +
        workItems.filter((item) => item.assigneeName === agent.name && !item.parentId).length,
    }))
    .sort((left, right) => right.inputsThisWeek - left.inputsThisWeek);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [dashboard, projects, runs, agents] = await Promise.all([
    fetchPaperclip<PaperclipCompanyDashboard>(`/api/companies/${COMPANY_ID}/dashboard`, {
      revalidateSeconds: DEFAULT_REVALIDATE_SECONDS,
    }),
    getRawProjects(DEFAULT_REVALIDATE_SECONDS),
    fetchPaperclip<PaperclipHeartbeatRun[]>(
      `/api/companies/${COMPANY_ID}/heartbeat-runs?limit=25`,
      { revalidateSeconds: DEFAULT_REVALIDATE_SECONDS }
    ),
    getRawAgents(DEFAULT_REVALIDATE_SECONDS),
  ]);

  const completedRuns = runs.filter((run) => isCompletedHeartbeatRunStatus(run.status));
  const successfulRuns = completedRuns.filter((run) => run.status === "succeeded");
  const runSuccessRate =
    completedRuns.length === 0 ? 100 : Math.round((successfulRuns.length / completedRuns.length) * 100);

  return {
    totalProjects: projects.length,
    openTasks: dashboard.tasks.open,
    inProgressTasks: dashboard.tasks.inProgress,
    agentsOnline: dashboard.agents.running,
    agentsTotal: agents.length,
    runSuccessRate,
    completedTasks: dashboard.tasks.done,
  };
}
