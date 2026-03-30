import { Activity, Bot, Briefcase, Target } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Header } from "@/components/nav/header";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import {
  getDashboardStats,
  getEmployees,
  getHeartbeatRuns,
  getProjectWorkItems,
  getProjects,
} from "@/lib/paperclip";
import {
  formatClockTime,
  formatRelativeTime,
  truncateText,
} from "@/lib/format";

export const revalidate = 30;

type SearchParamValue = string | string[] | undefined;

interface OverviewPageProps {
  searchParams?: Promise<{
    notice?: SearchParamValue;
  }>;
}

const FALLBACK_STATS = {
  totalProjects: 2,
  openTasks: 12,
  inProgressTasks: 4,
  agentsOnline: 3,
  agentsTotal: 5,
  runSuccessRate: 91,
  completedTasks: 28,
} as const;

const FALLBACK_RECENT_WORK = [
  {
    identifier: "SSG-101",
    title: "Finalize Dashboard API client mappings",
    assignee: "Frontend Engineer",
    status: "in_progress",
    updatedAt: new Date().toISOString(),
  },
  {
    identifier: "SSG-102",
    title: "Review Phase 5 live data QA checklist",
    assignee: "QA Engineer",
    status: "backlog",
    updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    identifier: "SSG-103",
    title: "Prepare Vercel environment variable handoff",
    assignee: "CTO",
    status: "blocked",
    updatedAt: new Date(Date.now() - 7_200_000).toISOString(),
  },
] as const;

const FALLBACK_PHASE_PROGRESS = [
  { label: "Backlog", count: 3, color: "var(--ssg-green)" },
  { label: "Active", count: 4, color: "var(--ssg-yellow)" },
  { label: "Review", count: 1, color: "#38bdf8" },
  { label: "Blocked", count: 2, color: "#fb7185" },
  { label: "Done", count: 7, color: "#a78bfa" },
] as const;

const FALLBACK_AGENT_ACTIVITY = [
  {
    time: "2m ago",
    agent: "Frontend Engineer",
    action: "Syncing Paperclip dashboard data into the Overview page",
  },
  {
    time: "8m ago",
    agent: "QA Engineer",
    action: "Preparing live-data verification coverage",
  },
  {
    time: "14m ago",
    agent: "CTO",
    action: "Coordinating the Phase 5 review chain",
  },
] as const;

const FALLBACK_TEAM_ACTIVITY = [
  {
    id: "fallback-frontend",
    name: "Frontend Engineer",
    role: "engineer",
    inputsThisWeek: 6,
    projectsOwned: 1,
  },
  {
    id: "fallback-qa",
    name: "QA Engineer",
    role: "engineer",
    inputsThisWeek: 4,
    projectsOwned: 1,
  },
  {
    id: "fallback-cto",
    name: "CTO",
    role: "cto",
    inputsThisWeek: 3,
    projectsOwned: 1,
  },
] as const;

const STATUS_VARIANTS = {
  backlog: "info",
  todo: "info",
  in_progress: "success",
  in_review: "warning",
  blocked: "danger",
  done: "default",
  cancelled: "danger",
} as const;

const STATUS_LABELS = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "Active",
  in_review: "Review",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
} as const;

const PHASE_PROGRESS_COLORS = [
  { label: "Backlog", color: "var(--ssg-green)" },
  { label: "Active", color: "var(--ssg-yellow)" },
  { label: "Review", color: "#38bdf8" },
  { label: "Blocked", color: "#fb7185" },
  { label: "Done", color: "#a78bfa" },
] as const;

function buildPhaseProgress(
  workItems: ReadonlyArray<{ status: string }>,
): Array<{ label: string; count: number; color: string }> {
  if (workItems.length === 0) {
    return [...FALLBACK_PHASE_PROGRESS];
  }

  return PHASE_PROGRESS_COLORS.map((entry) => ({
    label: entry.label,
    color: entry.color,
    count: workItems.filter((item) => {
      if (entry.label === "Backlog") {
        return item.status === "backlog" || item.status === "todo";
      }
      if (entry.label === "Active") {
        return item.status === "in_progress";
      }
      if (entry.label === "Review") {
        return item.status === "in_review";
      }
      if (entry.label === "Blocked") {
        return item.status === "blocked";
      }
      return item.status === "done";
    }).length,
  }));
}

function readSearchParam(value: SearchParamValue): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function OverviewPage({
  searchParams,
}: OverviewPageProps) {
  const params = (await searchParams) ?? {};
  const notice = readSearchParam(params.notice);
  const [statsResult, projectsResult, runsResult, employeesResult] =
    await Promise.allSettled([
      getDashboardStats(),
      getProjects(),
      getHeartbeatRuns(24),
      getEmployees(),
    ]);

  const stats =
    statsResult.status === "fulfilled" ? statsResult.value : FALLBACK_STATS;
  const projects =
    projectsResult.status === "fulfilled" ? projectsResult.value : [];
  const runs = runsResult.status === "fulfilled" ? runsResult.value : [];
  const employees =
    employeesResult.status === "fulfilled"
      ? employeesResult.value
      : FALLBACK_TEAM_ACTIVITY;

  const ssgProject =
    projects.find((project) => project.title === "SSG Lab") ?? null;
  const workItemsResult =
    ssgProject !== null
      ? await Promise.allSettled([getProjectWorkItems(ssgProject.id)])
      : null;
  const workItems =
    workItemsResult && workItemsResult[0].status === "fulfilled"
      ? workItemsResult[0].value
      : [];

  const isFallback =
    statsResult.status === "rejected" ||
    projectsResult.status === "rejected" ||
    runsResult.status === "rejected" ||
    employeesResult.status === "rejected";

  const recentWork =
    workItems.length > 0
      ? workItems.slice(0, 5).map((item) => ({
          identifier: item.identifier,
          title: item.title,
          assignee: item.assigneeName,
          status: item.status,
          updatedAt: item.updatedAt,
        }))
      : FALLBACK_RECENT_WORK;

  const phaseProgress = buildPhaseProgress(workItems);
  const phaseProgressMax = Math.max(
    ...phaseProgress.map((stage) => stage.count),
    1,
  );

  const agentActivity =
    runs.length > 0
      ? runs.slice(0, 5).map((run) => ({
          time: formatRelativeTime(run.activityAt),
          agent: run.agentName,
          action: truncateText(run.summary ?? run.status, 96),
        }))
      : [...FALLBACK_AGENT_ACTIVITY];

  const teamActivity =
    employees.length > 0
      ? employees.slice(0, 5).map((employee) => ({
          name: employee.name,
          inputs: employee.inputsThisWeek,
          projectsOwned: employee.projectsOwned,
        }))
      : FALLBACK_TEAM_ACTIVITY.map((employee) => ({
          name: employee.name,
          inputs: employee.inputsThisWeek,
          projectsOwned: employee.projectsOwned,
        }));
  const teamMax = Math.max(...teamActivity.map((member) => member.inputs), 1);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <Header title="Overview" description="SSG Accelerator Agent Dashboard" />

      {notice === "board_access_required" && (
        <Card className="border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Board access required
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Analytics and Settings are limited to mapped board users. Add{" "}
                <span className="font-mono text-xs">BOARD_FEISHU_OPEN_IDS</span>{" "}
                if this account should retain board-level access.
              </p>
            </div>
            <Badge variant="warning">Restricted Route</Badge>
          </div>
        </Card>
      )}

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Live Paperclip status</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Overview now reads current Paperclip projects, heartbeat runs, and
              team activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">30s Refresh</Badge>
            {isFallback && <Badge variant="warning">Fallback Active</Badge>}
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="animate-fade-in grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Projects"
          value={stats.totalProjects}
          trend={`${stats.inProgressTasks} tasks in progress`}
          icon={<Briefcase size={20} />}
          animated
        />
        <StatCard
          label="Open Tasks"
          value={stats.openTasks}
          trend={`${stats.completedTasks} completed overall`}
          icon={<Activity size={20} />}
          animated
        />
        <StatCard
          label="Agents Online"
          value={`${stats.agentsOnline}/${stats.agentsTotal}`}
          icon={<Bot size={20} />}
          animated
        />
        <StatCard
          label="Run Success"
          value={`${stats.runSuccessRate}%`}
          trend="Last 25 heartbeat runs"
          icon={<Target size={20} />}
          animated
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left column */}
        <div
          className="animate-fade-in space-y-6"
          style={{ animationDelay: "0.1s" }}
        >
          {/* Recent Work */}
          <Card>
            <CardTitle className="mb-4">Recent Work</CardTitle>
            <ul className="space-y-3">
              {recentWork.map((item) => (
                <li
                  key={item.identifier}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.identifier}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {truncateText(item.title, 86)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {item.assignee}
                    </span>
                    <Badge
                      variant={
                        STATUS_VARIANTS[
                          item.status as keyof typeof STATUS_VARIANTS
                        ] ?? "info"
                      }
                    >
                      {STATUS_LABELS[
                        item.status as keyof typeof STATUS_LABELS
                      ] ?? item.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Phase Progress */}
          <Card>
            <CardTitle className="mb-4">Phase Progress</CardTitle>
            <ul className="space-y-3">
              {phaseProgress.map((stage) => (
                <li key={stage.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">
                      {stage.label}
                    </span>
                    <span className="font-medium">{stage.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(stage.count / phaseProgressMax) * 100}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right column */}
        <div
          className="animate-fade-in space-y-6"
          style={{ animationDelay: "0.2s" }}
        >
          {/* Agent Activity */}
          <Card>
            <CardTitle className="mb-4">Agent Activity</CardTitle>
            <ul className="space-y-4">
              {agentActivity.map((entry, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-xs text-[var(--muted-foreground)] w-12">
                    {entry.time}
                  </span>
                  <div className="flex items-start gap-2">
                    <Badge variant="info">{entry.agent}</Badge>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {entry.action}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Team Activity */}
          <Card>
            <CardTitle className="mb-4">Team Activity</CardTitle>
            <ul className="space-y-4">
              {teamActivity.map((member) => (
                <li key={member.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {member.inputs} runs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                    <span>{member.projectsOwned} owned workstreams</span>
                    <span>{formatClockTime(new Date().toISOString())}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(member.inputs / teamMax) * 100}%`,
                        background:
                          "linear-gradient(to right, var(--ssg-green), var(--ssg-yellow))",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
