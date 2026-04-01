import { Activity, ArrowUpRight, Bot, Briefcase, Target } from "lucide-react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionBadge } from "@/components/ui/section-badge";
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
    action: "Syncing live delivery data into the Overview page",
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

const STATUS_PRIORITY = {
  blocked: 0,
  in_review: 1,
  in_progress: 2,
  todo: 3,
  backlog: 4,
  done: 5,
  cancelled: 6,
} as const;

const CTA_LINK_CLASS =
  "inline-flex items-center gap-2 border border-[var(--ssg-green)]/24 bg-black/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] transition-colors hover:border-[var(--ssg-green)]/50 hover:text-[var(--ssg-green)]";

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
  const focusWork = [...recentWork]
    .sort((left, right) => {
      const leftPriority =
        STATUS_PRIORITY[left.status as keyof typeof STATUS_PRIORITY] ?? 99;
      const rightPriority =
        STATUS_PRIORITY[right.status as keyof typeof STATUS_PRIORITY] ?? 99;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return (
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    })
    .slice(0, 4);

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
  const highlightedActivity = agentActivity.slice(0, 4);

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
      <Header
        title="Overview"
        description="Live workstreams, automation health, and team visibility for the SSG delivery stack."
        eyebrow="Portfolio Command"
      />

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
            <p className="text-sm font-semibold">Live delivery status</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Overview now reads current workstreams, automation runs, and team
              activity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/pipeline" className={CTA_LINK_CLASS}>
              打开项目进度
              <ArrowUpRight size={14} />
            </Link>
            <Link href="/analytics" className={CTA_LINK_CLASS}>
              查看自动化
              <ArrowUpRight size={14} />
            </Link>
            {isFallback && <Badge variant="warning">Snapshot View</Badge>}
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="animate-fade-in grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Workstreams"
          value={stats.totalProjects}
          trend={`${stats.inProgressTasks} work items active`}
          icon={<Briefcase size={20} />}
          animated
        />
        <StatCard
          label="Open Work Items"
          value={stats.openTasks}
          trend={`${stats.completedTasks} completed overall`}
          icon={<Activity size={20} />}
          animated
        />
        <StatCard
          label="Team Online"
          value={`${stats.agentsOnline}/${stats.agentsTotal}`}
          icon={<Bot size={20} />}
          animated
        />
        <StatCard
          label="Automation Success"
          value={`${stats.runSuccessRate}%`}
          trend="Last 25 automation runs"
          icon={<Target size={20} />}
          animated
        />
      </div>

      <div
        className="animate-fade-in grid gap-6 xl:grid-cols-[1.15fr_1fr_1fr]"
        style={{ animationDelay: "0.1s" }}
      >
        <Card className="border-[var(--ssg-green)]/20 bg-[linear-gradient(180deg,rgba(19,24,24,0.98),rgba(10,10,15,0.98))]">
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionBadge>Action Queue</SectionBadge>
              <CardTitle className="mt-4 text-2xl">待处理事项</CardTitle>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">
                从聊天流转到界面后的优先动作集中在这里，先推进阻塞项、进行中事项和待确认工作。
              </p>
            </div>
            <Link href="/pipeline" className={CTA_LINK_CLASS}>
              打开项目进度
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <ul className="mt-5 space-y-4">
            {focusWork.map((item) => (
              <li
                key={item.identifier}
                className="border-l border-[var(--ssg-green)]/30 pl-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {item.identifier}
                  </p>
                  <Badge
                    variant={
                      STATUS_VARIANTS[item.status as keyof typeof STATUS_VARIANTS] ??
                      "info"
                    }
                  >
                    {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ??
                      item.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--foreground)]">
                  {truncateText(item.title, 88)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {item.assignee} · {formatRelativeTime(item.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionBadge>Delivery Map</SectionBadge>
              <CardTitle className="mt-4 text-2xl">项目进度</CardTitle>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                快速查看当前阶段分布，判断工作流是积压、推进中还是等待 Review。
              </p>
            </div>
            <Link href="/pipeline" className={CTA_LINK_CLASS}>
              查看全部阶段
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <ul className="mt-5 space-y-4">
            {phaseProgress.map((stage) => (
              <li key={stage.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">
                    {stage.label}
                  </span>
                  <span className="font-medium text-[var(--foreground)]">
                    {stage.count}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-[var(--border)]">
                  <div
                    className="h-full transition-all duration-500"
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

        <Card>
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionBadge>Automation Feed</SectionBadge>
              <CardTitle className="mt-4 text-2xl">最近自动化活动</CardTitle>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                保留最近的自动化执行轨迹，方便快速确认聊天里提到的动作是否已经落地。
              </p>
            </div>
            <Link href="/analytics" className={CTA_LINK_CLASS}>
              打开 Activity
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <ul className="mt-5 space-y-4">
            {highlightedActivity.map((entry, idx) => (
              <li key={idx} className="border-l border-[var(--border)] pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    {entry.time}
                  </span>
                  <Badge variant="info">{entry.agent}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                  {entry.action}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div
        className="animate-fade-in grid gap-6 xl:grid-cols-[1fr_0.85fr]"
        style={{ animationDelay: "0.2s" }}
      >
        <Card>
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionBadge>Team Pulse</SectionBadge>
              <CardTitle className="mt-4 text-2xl">团队负载</CardTitle>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                查看谁在持续处理自动化输入，谁在承担更多工作流推进责任。
              </p>
            </div>
            <Link href="/agents" className={CTA_LINK_CLASS}>
              打开 Team
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <ul className="mt-5 space-y-4">
            {teamActivity.map((member) => (
              <li key={member.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[var(--foreground)]">
                    {member.name}
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    {member.inputs} runs
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  <span>{member.projectsOwned} owned workstreams</span>
                  <span>Live capacity</span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-[var(--border)]">
                  <div
                    className="h-full transition-all duration-500"
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

        <Card className="border-[var(--ssg-green)]/20 bg-[linear-gradient(160deg,rgba(100,254,186,0.08),rgba(10,10,15,0.98)_70%)]">
          <SectionBadge>Chat Handoff</SectionBadge>
          <CardTitle className="mt-4 text-2xl">下一步入口</CardTitle>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            常见的聊天到 GUI 跳转路径已经收敛到这三类：推进项目、核对自动化、查看团队状态。
          </p>

          <div className="mt-6 grid gap-3">
            <Link
              href="/pipeline"
              className="flex items-center justify-between border border-[var(--border)] bg-black/20 px-4 py-3 transition-colors hover:border-[var(--ssg-green)]/40 hover:bg-[var(--card-hover)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  打开项目进度
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  查看推进事项与阶段阻塞
                </p>
              </div>
              <ArrowUpRight size={16} className="text-[var(--ssg-green)]" />
            </Link>
            <Link
              href="/analytics"
              className="flex items-center justify-between border border-[var(--border)] bg-black/20 px-4 py-3 transition-colors hover:border-[var(--ssg-green)]/40 hover:bg-[var(--card-hover)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  查看自动化
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  核对自动化成功率与系统成本
                </p>
              </div>
              <ArrowUpRight size={16} className="text-[var(--ssg-green)]" />
            </Link>
            <Link
              href="/agents"
              className="flex items-center justify-between border border-[var(--border)] bg-black/20 px-4 py-3 transition-colors hover:border-[var(--ssg-green)]/40 hover:bg-[var(--card-hover)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  打开 Team
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  查看谁在执行、谁在排队、谁需要介入
                </p>
              </div>
              <ArrowUpRight size={16} className="text-[var(--ssg-green)]" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
